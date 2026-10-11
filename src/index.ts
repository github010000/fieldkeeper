// 필드키퍼 MVP — 라우터와 API(장면 진행).
// 회차는 장면 단계(scene · phase · phase_at · sim_base)만 저장하고 시연 시각은 그 값에서 계산한다(timeline.ts) — 폰 두 대가 같은 장면을 본다.
// 한 장면 = 다음 장면 → 경보 → 관리자 결정(승인/보류) → 로봇 출동 · 조치(로봇 카메라 /cam) → 관리자 종결.
// 사람은 관제의 관리자 한 명 — 처음(승인)과 끝(종결)을 쥔다. 승인 없이 장비가 움직이는 경로는 없다.
import { dashboardPage, ICON_SVG } from "./pages";
import { MANUAL_SPOTS, SCENES, isKind } from "./scenario";
import { simClock, ALERT_READY_S, moveSeconds, type RunClock } from "./timeline";
import { flightInfo, dayMovements } from "./flights";
import { WARNING_MP3 } from "./audio";
import { judgeScene, explain } from "./judge";

const bin = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export interface Env {
  DB: D1Database;
  // 단추 잠금 — 장면 진행·결정·자유 경보는 이 열쇠(헤더 x-demo-key)가 맞을 때만. 비우면 잠그지 않는다(로컬). 값은 .dev.vars 에만 둔다
  DEMO_KEY?: string;
  // 실제 운항편(flights.ts) — data.go.kr 키(.dev.vars)와 기준 공항(기본 CJJ, 화면에는 이름을 쓰지 않는다)
  DATA_GO_KR_SERVICE_KEY?: string;
  FLIGHT_AIRPORT?: string;
  // 「왜 이 조치인가」 한 줄 — msu LiteLLM(:4000). 비우면 규칙 문장만 쓴다(judge.ts). 열쇠는 .dev.vars 에만
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
}

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const html = (s: string) =>
  new Response(s, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

const MANIFEST = JSON.stringify({
  name: "필드키퍼", short_name: "필드키퍼", description: "비행장 경보를 즉시 행동으로",
  start_url: "/", display: "standalone", lang: "ko", theme_color: "#0b1219", background_color: "#0b1219",
  icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
});

const authorized = (req: Request, env: Env) => !env.DEMO_KEY || req.headers.get("x-demo-key") === env.DEMO_KEY;
const NOKEY = () => json({ error: "열쇠가 맞지 않습니다" }, 403);
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const SC: number[][] = SCENES.map((s) => [s.min, s.travelMin, s.resolveS, s.resolveMin]);
const hhmm = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(Math.floor(m % 60)).padStart(2, "0");

interface RunRow extends RunClock { id: string; started_at: number; summary_json: string | null }

async function currentRun(env: Env): Promise<RunRow | null> {
  return await env.DB.prepare("SELECT id, started_at, scene, phase, phase_at, sim_base, summary_json FROM runs ORDER BY started_at DESC LIMIT 1").first<RunRow>();
}
async function newRun(env: Env): Promise<RunRow> {
  const now = Date.now();
  const r: RunRow = { id: newId(), started_at: now, scene: 0, phase: "idle", phase_at: now, sim_base: 240, summary_json: null };
  await env.DB.prepare("INSERT INTO runs (id, started_at, scene, phase, phase_at, sim_base) VALUES (?, ?, 0, 'idle', ?, 240)").bind(r.id, now, now).run();
  return r;
}
// 단계 바꾸기 — 읽은 단계 그대로일 때만(두 폰이 동시에 눌러도 한 번만 넘어간다)
async function setPhase(env: Env, r: RunRow, scene: number, phase: string, simBase: number, extra = ""): Promise<number | null> {
  const at = Date.now();
  const res = await env.DB.prepare(`UPDATE runs SET scene = ?, phase = ?, phase_at = ?, sim_base = ?${extra ? ", summary_json = ?" : ""} WHERE id = ? AND phase = ? AND phase_at = ?`)
    .bind(...[scene, phase, at, simBase, ...(extra ? [extra] : []), r.id, r.phase, r.phase_at]).run();
  return res.meta.changes === 1 ? at : null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const p = new URL(req.url).pathname;

    if (req.method === "GET" && (p === "/" || p === "/ops")) return html(dashboardPage("ops"));
    if (req.method === "GET" && p === "/cam") return html(dashboardPage("cam"));
    if (p === "/manifest.webmanifest") return new Response(MANIFEST, { headers: { "content-type": "application/manifest+json" } });
    if (p === "/audio/warning.mp3") return new Response(bin(WARNING_MP3), { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" } });
    if (p === "/icon.svg") return new Response(ICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

    // 지금 회차 · 사건 기록 · 자유 경보 — 화면이 1초마다 부른다. server_now 로 폰 시계 차이를 맞춘다
    if (req.method === "GET" && p === "/api/state") {
      const run = await currentRun(env);
      const incidents = run
        ? (await env.DB.prepare("SELECT scene, alert_sim, flight_json, judge_json, decision, decided_sim, arrive_sim, closed_sim FROM incidents WHERE run_id = ? ORDER BY scene").bind(run.id).all()).results
            .map((x: any) => ({ ...x, flight: x.flight_json ? JSON.parse(x.flight_json) : null, flight_json: undefined, judge: x.judge_json ? JSON.parse(x.judge_json) : null, judge_json: undefined }))
        : [];
      const manual = run
        ? (await env.DB.prepare("SELECT id, kind, zone, sensor, x, y, sim_min FROM alerts WHERE run_id = ? ORDER BY sim_min").bind(run.id).all()).results
        : [];
      const now = Date.now();
      return json({
        server_now: now, locked: !!env.DEMO_KEY,
        run: run && { ...run, summary: run.summary_json ? JSON.parse(run.summary_json) : null, summary_json: undefined },
        sim_min: simClock(run, now, SC), incidents, manual,
      });
    }

    if (req.method !== "POST") return new Response("없는 주소입니다", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    if (!authorized(req, env)) return NOKEY();

    // 처음으로 — 새 회차(04:00, 장면 전). 지난 회차와 기록은 남긴다
    if (p === "/api/demo/start") return json({ run: await newRun(env) });

    // 다음 장면(관제) — 경보로 빨리 감기. 시작 전이거나 관리자가 앞 장면을 종결했을 때만
    if (p === "/api/scene/next") {
      let r = (await currentRun(env)) ?? (await newRun(env));
      const now = Date.now();
      if (r.phase === "summary") return json({ error: "모든 장면이 끝났습니다 — ☰ 메뉴의 「처음으로」" }, 409);
      if (r.phase !== "idle" && r.phase !== "closed") return json({ error: "관리자가 이 장면을 종결해야 넘어갑니다" }, 409);
      const sim = simClock(r, now, SC), next = r.scene + 1;
      if (next > SCENES.length) {
        const movements = await dayMovements(env);
        const at = await setPhase(env, r, next, "summary", sim, JSON.stringify({ movements }));
        return at ? json({ ok: true }) : json({ error: "다른 폰이 먼저 넘겼습니다" }, 409);
      }
      const sc = SCENES[next - 1];
      const flight = sc.flight ? await flightInfo(env, sc.flight, hhmm(sc.min)) : null;
      // 필드키퍼 판단 — 규칙으로 계산하고(judge.ts), 「왜」 한 줄만 AI 가 쓴다(실패하면 규칙 문장)
      const judged = await explain(env, next - 1, judgeScene(next - 1, flight));
      r = (await currentRun(env))!;                 // 운항 조회 동안 다른 폰이 넘겼을 수 있다
      if (r.scene !== next - 1) return json({ error: "다른 폰이 먼저 넘겼습니다" }, 409);
      const at = await setPhase(env, r, next, "alert", simClock(r, Date.now(), SC));
      if (!at) return json({ error: "다른 폰이 먼저 넘겼습니다" }, 409);
      await env.DB.prepare("INSERT INTO incidents (id, run_id, scene, alert_sim, flight_json, judge_json) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(newId(), r.id, next, sc.min, flight ? JSON.stringify(flight) : null, JSON.stringify(judged)).run();
      return json({ ok: true });
    }

    // 관리자 결정 — 승인이면 출동, 보류면 장비 대기. 경보에서 멈춘 뒤에만 받는다
    if (p === "/api/decide") {
      const body = await req.json<{ decision?: string }>().catch(() => ({} as { decision?: string }));
      if (body.decision !== "approve" && body.decision !== "hold") return json({ error: "결정이 올바르지 않습니다" }, 400);
      const r = await currentRun(env);
      if (!r || r.phase !== "alert" || (Date.now() - r.phase_at) / 1000 < ALERT_READY_S) return json({ error: "결정할 경보가 없습니다" }, 409);
      const sc = SCENES[r.scene - 1], sim = simClock(r, Date.now(), SC);
      const approve = body.decision === "approve";
      const at = await setPhase(env, r, r.scene, approve ? "dispatch" : "hold", sim);
      if (!at) return json({ error: "이미 결정되었습니다" }, 409);
      await env.DB.prepare("UPDATE incidents SET decision = ?, decided_sim = ?, arrive_sim = ? WHERE run_id = ? AND scene = ?")
        .bind(body.decision, sim, approve ? sim + sc.travelMin : null, r.id, r.scene).run();
      return json({ ok: true });
    }

    // 관리자 종결 — 로봇 카메라로 조치를 본 뒤(출동이 끝났거나 보류일 때) 장면을 닫는다
    if (p === "/api/close") {
      const r = await currentRun(env);
      if (!r || r.scene < 1 || r.scene > SCENES.length) return json({ error: "종결할 장면이 없습니다" }, 409);
      const sc = SCENES[r.scene - 1], e = (Date.now() - r.phase_at) / 1000;
      const ready = r.phase === "hold" || (r.phase === "dispatch" && e >= moveSeconds(sc.travelMin) + sc.resolveS);
      if (!ready) return json({ error: r.phase === "dispatch" ? sc.waitText : "아직 종결할 수 없습니다" }, 409);
      const sim = simClock(r, Date.now(), SC);
      const at = await setPhase(env, r, r.scene, "closed", sim);
      if (!at) return json({ error: "이미 종결되었습니다" }, 409);
      await env.DB.prepare("UPDATE incidents SET closed_sim = ? WHERE run_id = ? AND scene = ?").bind(sim, r.id, r.scene).run();
      return json({ ok: true });
    }

    // 자유 경보(☰ 메뉴, Q&A 대응용) — 지도와 목록에만 뜬다(장면 진행과 별개). 자리는 MANUAL_SPOTS 에서 돌아가며
    if (p === "/api/alerts") {
      const body = await req.json<{ kind?: unknown }>().catch(() => ({} as { kind?: unknown }));
      if (!isKind(body.kind)) return json({ error: "경보 종류가 올바르지 않습니다" }, 400);
      const run = (await currentRun(env)) ?? (await newRun(env));
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM alerts WHERE run_id = ? AND kind = ?").bind(run.id, body.kind).first<number>("n");
      const spots = MANUAL_SPOTS[body.kind];
      const a = { id: "m" + newId(), kind: body.kind, ...spots[(n ?? 0) % spots.length], sim_min: simClock(run, Date.now(), SC) };
      await env.DB.prepare("INSERT INTO alerts (id, run_id, kind, zone, sensor, x, y, sim_min) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(a.id, run.id, a.kind, a.zone, a.sensor, a.x, a.y, a.sim_min).run();
      return json({ alert: a });
    }

    return new Response("없는 주소입니다", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
