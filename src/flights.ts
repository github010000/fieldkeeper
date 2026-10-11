// 실제 운항편 — 한국공항공사 「실시간 항공기 운항정보 조회_GW」(data.go.kr 15158625, 가이드 V1 2026-08-11).
// 기능 = /arrival(도착) · /depart(출발): 오늘 날짜(searchday) + 시간대(from_time~to_time, 계획 시각 기준) + 기준 공항(airport_code).
// 앱의 공항은 가상이지만 운항 데이터는 실제 지방공항 한 곳(FLIGHT_AIRPORT, 기본 CJJ)의 것이다 — 화면에는 공항 이름을 쓰지 않는다.
// 키: DATA_GO_KR_SERVICE_KEY(.dev.vars). 디코딩 키(+/=)는 반드시 인코딩해서 넣는다 — 그대로 넣으면 + 가 공백이 되어 30(등록되지 않은 키)
// 개발 계정은 하루 5,000건 — 같은 조회는 10분 동안 기억해 다시 부르지 않는다
import type { FlightQuery } from "./scenario";

const BASE = "https://apis.data.go.kr/B551178/flight-status";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; items: Flight[] }>();

export interface Flight { time: string; actual: string; eff: string; id: string; other: string; status: string; io: "I" | "O" }
export interface FlightInfo { ok: boolean; text: string; flights: Flight[] }

const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
const hhmm = (dt: string) => (dt && dt.length >= 12 ? dt.slice(8, 10) + ":" + dt.slice(10, 12) : "");
const encKey = (k: string) => (k.includes("%") ? k : encodeURIComponent(k));

async function fetchOp(key: string, airport: string, op: "arrival" | "depart", from: string, to: string): Promise<Flight[]> {
  const day = kstToday();
  const ck = [op, airport, day, from, to].join("|");
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;
  const url = `${BASE}/${op}?serviceKey=${encKey(key)}&type=json&numOfRows=50&pageNo=1` +
    `&airport_code=${airport}&searchday=${day}&from_time=${from}&to_time=${to}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const d = (await r.json()) as any;
  const res = d?.response;
  if (!res || res.header?.resultCode !== "00") {
    const why = d?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? res?.header?.resultMsg ?? `HTTP ${r.status}`;
    throw new Error(String(why));
  }
  const raw = res.body?.items?.item ?? [];
  const items: Flight[] = (Array.isArray(raw) ? raw : [raw]).map((x: any) => ({
    time: hhmm(x.scheduledatetime), actual: hhmm(x.estimateddatetime), eff: hhmm(x.estimateddatetime) || hhmm(x.scheduledatetime), id: String(x.flightid ?? ""),
    other: String(op === "arrival" ? x.depAirport ?? "" : x.arrAirport ?? ""), status: String(x.rmkKor ?? ""),
    io: (op === "arrival" ? "I" : "O") as "I" | "O",
  })).sort((a: Flight, b: Flight) => a.time.localeCompare(b.time));
  cache.set(ck, { at: Date.now(), items });
  return items;
}

const minsBetween = (a: string, b: string) => (+b.slice(0, 2) * 60 + +b.slice(3, 5)) - (+a.slice(0, 2) * 60 + +a.slice(3, 5));

// 장면에 붙일 한 줄 — 실패하면 실패라고 쓴다(예시 편을 지어내지 않는다)
// 시각은 변경(예상) 시각이 있으면 그것을 쓴다(eff) — 예정 09:00 이 09:43 으로 늦어진 편을 09:00 착륙으로 읽지 않게(대장 10-11).
// API 의 시간대 조회는 예정 시각 기준이라 한 시간 앞당겨 받은 뒤, 변경 시각이 장면 시간대 안인 편만 남긴다(이미 뜨고 내린 편은 빠진다)
const at = (f: Flight) => (f.actual && f.actual !== f.time ? `${f.eff}(예정 ${f.time} → 변경)` : f.eff);
export async function flightInfo(env: { DATA_GO_KR_SERVICE_KEY?: string; FLIGHT_AIRPORT?: string }, q: FlightQuery, sceneTime: string): Promise<FlightInfo> {
  const key = env.DATA_GO_KR_SERVICE_KEY;
  if (!key) return { ok: false, text: "운항 데이터 없음(키 미설정)", flights: [] };
  const ap = env.FLIGHT_AIRPORT || "CJJ";
  const wide = String(Math.max(0, +q.from.slice(0, 2) - 1)).padStart(2, "0") + q.from.slice(2);
  const inWin = (f: Flight) => f.eff.replace(":", "") >= q.from && f.eff.replace(":", "") <= q.to;
  const byEff = (x: Flight, y: Flight) => x.eff.localeCompare(y.eff);
  const get = async (op: "arrival" | "depart") => (await fetchOp(key, ap, op, wide, q.to)).filter(inWin).sort(byEff);
  try {
    if (q.use === "firstDepart") {
      const f = (await get("depart"))[0];
      if (!f) return { ok: true, text: "오늘 이 시간대 출발 편 없음", flights: [] };
      return { ok: true, text: `오늘 첫 출발 ${at(f)} ${f.id}(${f.other}행) — 그 전에 활주로를 비워야 한다`, flights: [f] };
    }
    if (q.use === "nextArrival") {
      const fs = await get("arrival");
      const f = fs[0];
      if (!f) return { ok: true, text: "오늘 이 시간대 착륙 예정 편 없음", flights: [] };
      return { ok: true, text: `다음 착륙 ${at(f)} ${f.id}(${f.other}발) — 경보 ${minsBetween(sceneTime, f.eff)}분 뒤 · 1시간 안 ${fs.length}편`, flights: fs.slice(0, 5) };
    }
    const [a, d] = await Promise.all([get("arrival"), get("depart")]);
    const all = [...a, ...d].sort(byEff);
    if (q.use === "next") {
      const f = all[0];
      if (!f) return { ok: true, text: "오늘 이 시간대 운항 편 없음", flights: [] };
      return { ok: true, text: `다음 운항 ${at(f)} ${f.id}(${f.io === "I" ? f.other + "발 도착" : f.other + "행 출발"}) — 경보 ${minsBetween(sceneTime, f.eff)}분 뒤`, flights: [f] };
    }
    return { ok: true, text: `앞으로 1시간 이착륙 ${all.length}편(도착 ${a.length} · 출발 ${d.length}) 영향 가능`, flights: all.slice(0, 5) };
  } catch (e) {
    return { ok: false, text: `운항 데이터 조회 실패(${(e as Error).message})`, flights: [] };
  }
}

// 분기 말 — 오늘 이 공항의 실제 운항 횟수(도착 + 출발, 하루 전체). 목록 대신 totalCount 만 읽는다
async function countOp(key: string, airport: string, op: "arrival" | "depart"): Promise<number> {
  const day = kstToday(), ck = ["count", op, airport, day].join("|");
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items.length;
  const url = `${BASE}/${op}?serviceKey=${encKey(key)}&type=json&numOfRows=1&pageNo=1&airport_code=${airport}&searchday=${day}`;
  const d = (await (await fetch(url, { signal: AbortSignal.timeout(8000) })).json()) as any;
  if (d?.response?.header?.resultCode !== "00") throw new Error("count");
  const n = Number(d.response.body?.totalCount ?? 0);
  cache.set(ck, { at: Date.now(), items: new Array(n) });
  return n;
}

export async function dayMovements(env: { DATA_GO_KR_SERVICE_KEY?: string; FLIGHT_AIRPORT?: string }): Promise<number | null> {
  if (!env.DATA_GO_KR_SERVICE_KEY) return null;
  const ap = env.FLIGHT_AIRPORT || "CJJ";
  try {
    const [a, d] = await Promise.all([countOp(env.DATA_GO_KR_SERVICE_KEY, ap, "arrival"), countOp(env.DATA_GO_KR_SERVICE_KEY, ap, "depart")]);
    return a + d;
  } catch { return null; }
}
