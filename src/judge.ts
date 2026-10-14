// 필드키퍼 판단 — 경보가 뜰 때 서버가 계산한다. 같은 입력이면 늘 같은 답(무작위 · AI 없음).
//   ① 위험도(0~100) = 종류 + 위치(활주로 · 접근로와의 거리) + 운항 여유(다음 실제 운항편까지)
//   ② 조치 장비 = 할 수 있는 장비(탑재 장비) 가운데 가장 빨리 닿는 것 — 두 대가 같은 기종이라 결국 가까운 쪽
// 가중치는 세션이 세운 가정이다(고시 · 연구 값이 아니다) — 규칙은 공개되고 결정적이며, 가중치는 실증에서 맞춘다.
// 「왜 이 조치인가」 한 줄만 AI(msu LiteLLM)가 쓰고, 실패하면 아래 규칙 문장(ruleWhy)을 쓴다 — explain().
import { UNITS, M_PER_UNIT } from "./airfield";
import { SCENES, KIND, travelMinutes, type Scene, type Kind } from "./scenario";
import type { FlightInfo } from "./flights";

export interface Part { k: string; v: string; p: number }
export interface Judgement {
  score: number; grade: "긴급" | "높음" | "보통"; parts: Part[];
  unit: string; unitLabel: string; pick: string;   // 고른 장비와 고른 이유(탑재 장비 · 출발 자리 · 도착 시간)
  check: string | null;                            // (10-11 옛 기록용) 운항편과 맞춰 본 고정 문장 — 이제는 race 로 화면이 매초 계산한다
  // 운항 경주 — 로봇 조치가 이 편보다 먼저 끝나야 한다(조류 = 다음 착륙). 화면이 승인 전엔 「지금 승인하면」, 뒤엔 실제 도착 시각으로 견준다
  race?: { at: number; label: string; need: number } | null;
  late?: boolean;                                  // 경보 즉시 출발해도 그 편이 먼저 온다 → 조치 = actionLate, 관제탑 자동 공유(autoShare)
  lateByDelay?: boolean; shareAt?: number; holdMin?: number;  // holdMin = 도착 뒤 착륙 통과까지 장비 정지 대기(분)         // 승인 순간 기록(index.ts decide) — 승인이 늦어 착륙 전 퇴치를 못 마침 · 그 마감 시각(관제탑 다시 공유)
  why: string; whySrc: "ai" | "rule";
}

// 종류 — 사람 침입은 보안 사건이라 가장 높게 둔다
const KIND_P: Record<Kind, number> = { intrusion: 50, bird: 35 };
// 장비가 실은 것(시뮬레이션 가정) — 순찰형 한 기종이라 두 대가 같다(10-14). 고르는 기준은 누가 더 빨리 닿는가뿐
const KIT = ["경고 방송", "카메라", "음파퇴치기", "폭음경보기", "녹색 레이저"];
const EQUIP: Record<string, string[]> = { R1: KIT, R2: KIT };
const NEED: Record<Kind, string> = { intrusion: "경고 방송", bird: "음파퇴치기" };
const OBJ: Record<string, string> = { "경고 방송": "경고 방송을", "음파퇴치기": "음파퇴치기를" };
const SUBJ: Record<string, string> = { R1: "로봇 1이", R2: "로봇 2가" };

// 지도 좌표(airfield.ts) — 활주로 중심선 x=120, y 100~380, 착륙대 폭 ±15
const RWY = { x: 120, y0: 100, y1: 380, half: 15 };
function place(x: number, y: number, distM?: number): Part {
  if (distM != null) return { k: "위치", v: `활주로에서 ${(distM / 1000).toFixed(1)}km`, p: distM <= 500 ? 20 : 10 };
  const onAxis = Math.abs(x - RWY.x) <= RWY.half;
  if (onAxis && y >= RWY.y0 && y <= RWY.y1) return { k: "위치", v: "활주로 위", p: 30 };
  if (onAxis) return { k: "위치", v: "접근로 축", p: 30 };
  const dx = Math.max(0, Math.abs(x - RWY.x) - RWY.half), dy = Math.max(0, RWY.y0 - y, y - RWY.y1);
  const m = Math.round((Math.hypot(dx, dy) * M_PER_UNIT) / 10) * 10;
  return m <= 500 ? { k: "위치", v: `활주로에서 ${m}m`, p: 20 } : { k: "위치", v: `활주로에서 ${m}m`, p: 10 };
}

const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const dur = (min: number) => { const s = Math.round(min * 60); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };

function margin(sc: Scene, f: FlightInfo | null): { part: Part; next: { time: string; id: string; io: "I" | "O"; gap: number } | null } {
  if (!f || !f.ok) return { part: { k: "운항", v: "조회 실패", p: 15 }, next: null };
  // 변경(예상) 시각이 있으면 그것으로 — flights.ts eff(10-11 이전 기록은 eff 가 없어 예정 시각)
  const n = f.flights.map((x) => { const t = x.eff || x.time; return { time: t, id: x.id, io: x.io, gap: toMin(t) - sc.min }; }).filter((x) => x.gap >= 0).sort((a, b) => a.gap - b.gap)[0];
  if (!n) return { part: { k: "운항", v: "가까운 운항 없음", p: 5 }, next: null };
  const what = `${n.io === "I" ? "착륙" : "출발"} ${n.gap}분 뒤`;
  const p = n.gap <= 10 ? 35 : n.gap <= 30 ? 25 : n.gap <= 60 ? 15 : 5;
  return { part: { k: "운항", v: what, p }, next: n };
}

// 장면 시작 때 장비 자리 — 앞 장면까지 정해진 homes(화면 pages.ts 와 같은 규칙)
function positions(idx: number): Record<string, [number, number]> {
  const pos: Record<string, [number, number]> = Object.fromEntries(UNITS.map((u) => [u.id, [u.x, u.y]]));
  for (let n = 0; n <= idx; n++) for (const [id, p] of Object.entries(SCENES[n].homes ?? {})) pos[id] = p;
  return pos;
}

// 장비 고르기 — 장면 경로가 있으면 그 경로 길이로, 없으면 직선 × 1.4(유도로를 돌아가는 몫)로 도착 시간을 잰다
export function pickUnit(idx: number) {
  const sc = SCENES[idx], need = NEED[sc.kind];
  const pos = positions(idx);
  const cand = Object.keys(EQUIP).filter((u) => EQUIP[u].includes(need)).map((u) => {
    const path = sc.paths[u];
    const min = path ? travelMinutes(u, path) : travelMinutes(u, [pos[u], [sc.x, sc.y]]) * 1.4;
    return { u, min };
  }).sort((a, b) => a.min - b.min);
  const best = cand[0];
  const home = UNITS.find((x) => x.id === best.u)!;
  const atBase = pos[best.u][0] === home.x && pos[best.u][1] === home.y;
  return { unit: best.u, need, min: best.min, from: atBase ? home.base : "순찰 위치" };
}

// 시나리오 경로와 판단이 어긋나면 서버가 뜨지 않는다 — 지도 위 로봇과 판단 카드가 다른 장비를 가리키지 않게
SCENES.forEach((sc, i) => {
  const p = pickUnit(i), drawn = Object.keys(sc.paths)[0] ?? null;
  if ((p?.unit ?? null) !== drawn) throw new Error(`판단 장비(${p?.unit}) ≠ 장면 경로 장비(${drawn}) — ${sc.id}`);
});

export function judgeScene(idx: number, f: FlightInfo | null): Judgement {
  const sc = SCENES[idx];
  const kind: Part = { k: "종류", v: KIND[sc.kind].ko.replace(/\(.*\)/, ""), p: KIND_P[sc.kind] };
  const loc = place(sc.x, sc.y, sc.distM), { part: fl, next } = margin(sc, f);
  const score = Math.min(100, kind.p + loc.p + fl.p);
  const grade = score >= 80 ? "긴급" : score >= 60 ? "높음" : "보통";
  const p = pickUnit(idx);
  const unit = p.unit, unitLabel = UNITS.find((u) => u.id === p.unit)!.label;
  const pick = `${p.need} 탑재 · ${p.from}에서 ${dur(p.min)}`;
  let race: Judgement["race"] = null, late = false;
  if (sc.kind === "bird" && next && next.io === "I") {
    race = { at: toMin(next.time), label: `${next.id} 착륙`, need: sc.resolveMin };
    // 승인에 1분은 걸린다고 보고, 그래도 착륙이 먼저면 — 로봇은 이 착륙을 지킬 수 없다(관제탑이 판단, 대장 10-11)
    late = next.gap < 1 + p.min + sc.resolveMin && !!sc.actionLate;
  }
  const j: Judgement = { score, grade, parts: [kind, loc, fl], unit, unitLabel, pick, check: null, race, late, why: "", whySrc: "rule" };
  j.why = ruleWhy(sc, j, p.min);
  return j;
}

function ruleWhy(sc: Scene, j: Judgement, min: number): string {
  const head = `위험도 ${j.score}(${j.grade}) — ${j.parts[1].v} · ${j.parts[2].v}.`;
  const need = NEED[sc.kind];
  if (j.late) return `${head} 착륙이 로봇 퇴치보다 먼저라 관제탑에 바로 알렸고, ${OBJ[need]} 실은 ${SUBJ[j.unit]} 다음 편 전에 접근로를 정리한다.`;
  return `${head} ${OBJ[need]} 실은 ${SUBJ[j.unit]} ${dur(min)} 만에 닿는다.`;
}

// AI 한 줄 — 계산값만 보낸다(원문 없음). msu LiteLLM(fieldkeeper-explain = gemma4, llm-serve 10-11) · 게이트웨이 시간 제한 4초(본문 timeout — 클라이언트만 끊으면 생성이 멈추지 않는다, llm-serve 10-11)
// 답에 입력에 없던 숫자가 있거나 80자를 넘거나 실패하면 규칙 문장을 쓴다
// 지시문 — 착륙이 먼저인 경보(late)에만 그 형식을 붙인다(늘 붙이면 다른 장면에도 「관제탑에 바로 알렸고」가 새어 나온다, 10-11 실측)
const SYS = "너는 비행장 관제 보조다. 관리자가 승인 단추를 누르기 전에 읽을 「왜 이 조치인가」 한 문장을 쓴다. 앞부분 = 왜 급한가(위험도 항목 가운데 점수가 큰 것과 운항 대조), 뒷부분 = 왜 이 장비인가(탑재 장비와 도착 시간). 문장은 '<탑재 장비>를 실은 로봇 N을 보낸다'로 끝낸다. 입력의 표현과 숫자만 쓰고, 입력에 없는 위치 · 상태 · 숫자 · 효과를 덧붙이지 않는다. 한국어 80자 이내, '-다'로 끝낸다. 문장만 출력한다.";
const LATE = " 이번 경보는 착륙이 로봇보다 먼저다. 이 형식만 쓴다: '<운항 항목>이라 로봇보다 착륙이 먼저여서 관제탑에 바로 알렸고, <탑재 장비>를 실은 로봇 N은 다음 편 전에 접근로를 정리한다.' 로봇을 '보낸다'고 쓰지 않는다.";
export async function explain(env: { LLM_BASE_URL?: string; LLM_API_KEY?: string; LLM_MODEL?: string }, idx: number, j: Judgement): Promise<Judgement> {
  if (!env.LLM_BASE_URL) return j;
  const sc = SCENES[idx];
  const facts = [
    `경보: ${KIND[sc.kind].ko} · ${sc.zone} · ${sc.note}`,
    `위험도: ${j.score}/100(${j.grade}) = ${j.parts.map((p) => `${p.k} ${p.v} ${p.p}점`).join(" + ")}`,
    `조치 장비: ${j.unitLabel} (${j.pick})`,
    ...(j.late ? [`운항 대조: ${j.parts[2].v} — 로봇 도착 · 퇴치보다 먼저 온다`, `자동 공유: 관제탑에 조류 정보를 경보와 함께 공유했다(착륙 편 판단은 관제탑)`] : []),
    `조치: ${j.late ? sc.actionLate : sc.action}`,
  ].join("\n");
  try {
    const r = await fetch(`${env.LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST", signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json", ...(env.LLM_API_KEY ? { authorization: `Bearer ${env.LLM_API_KEY}` } : {}) },
      body: JSON.stringify({
        model: env.LLM_MODEL || "fieldkeeper-explain", user: "fieldkeeper", timeout: 4, max_tokens: 120, temperature: 0,
        chat_template_kwargs: { enable_thinking: false },
        messages: [
          { role: "system", content: SYS + (j.late ? LATE : "") },
          { role: "user", content: "경보: 조류(새 떼) · 남쪽 접근로 · 새 떼 약 12마리\n위험도: 85/100(긴급) = 종류 조류 35점 + 위치 접근로 축 30점 + 운항 착륙 25분 뒤 25점\n조치 장비: 로봇 2 (음파퇴치기 탑재 · 북쪽 거점에서 4분 10초)\n운항 대조: 착륙 21분 전에 현장에 닿는다" },
          { role: "assistant", content: "접근로 축에 새 떼가 있고 착륙이 25분 뒤라, 음파퇴치기를 실은 로봇 2를 보내 착륙 21분 전에 닿게 한다." },
          { role: "user", content: facts },
        ],
      }),
    });
    if (!r.ok) return j;
    const d = (await r.json()) as any;
    const s = String(d?.choices?.[0]?.message?.content ?? "").replace(/\s+/g, " ").trim().replace(/^["「]|["」]$/g, "");
    const nums = (t: string) => t.match(/\d+/g) ?? [];
    const known = new Set(nums(facts));
    if (!s || s.length > 80 || nums(s).some((n) => !known.has(n))) return j;
    // 착륙이 먼저인 경보는 「관제탑」이 빠지면 버린다 — 로봇이 착륙을 지키는 것처럼 읽히면 안 된다(대장 10-11)
    if (j.late && (!s.includes("관제탑") || s.includes("보낸다"))) return j;
    return { ...j, why: s, whySrc: "ai" };
  } catch { return j; }
}
