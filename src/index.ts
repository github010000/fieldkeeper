// 필드키퍼 MVP — 라우터와 API(Pass 1: 지도 · 시나리오 경보 · 손 경보).
// 시연 회차는 「시작한 실제 시각」만 저장하고, 시나리오 경보는 시각에서 계산한다 — 그래서 매번 똑같이 재생된다.
import { dashboardPage, ICON_SVG } from "./pages";
import { MANUAL_SPOTS, isKind } from "./scenario";
import { KEYFRAMES, simAt } from "./timeline";

export interface Env {
  DB: D1Database;
  // 단추 잠금 — 시연 시작·경보 발생은 이 열쇠(헤더 x-demo-key)가 맞을 때만. 비우면 잠그지 않는다(로컬). 값은 .dev.vars 에만 둔다
  DEMO_KEY?: string;
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

interface RunRow { id: string; started_at: number }

async function currentRun(env: Env): Promise<RunRow | null> {
  return await env.DB.prepare("SELECT id, started_at FROM runs ORDER BY started_at DESC LIMIT 1").first<RunRow>();
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    if (req.method === "GET" && p === "/") return html(dashboardPage());
    if (p === "/manifest.webmanifest") return new Response(MANIFEST, { headers: { "content-type": "application/manifest+json" } });
    if (p === "/icon.svg") return new Response(ICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

    // 지금 회차와 손 경보 — 화면이 1초마다 부른다. 시각 계산은 화면이 하고, server_now 로 폰 시계 차이를 맞춘다
    if (req.method === "GET" && p === "/api/state") {
      const run = await currentRun(env);
      const manual = run
        ? (await env.DB.prepare("SELECT id, kind, zone, sensor, x, y, sim_min FROM alerts WHERE run_id = ? ORDER BY sim_min")
            .bind(run.id).all()).results
        : [];
      const now = Date.now();
      return json({ server_now: now, locked: !!env.DEMO_KEY, run, sim_min: run ? simAt(KEYFRAMES, (now - run.started_at) / 1000) : null, manual });
    }

    // 시연 시작(= 처음부터 다시) — 새 회차 한 줄. 지난 회차와 그 손 경보는 지우지 않는다
    if (req.method === "POST" && p === "/api/demo/start") {
      if (!authorized(req, env)) return NOKEY();
      const run = { id: newId(), started_at: Date.now() };
      await env.DB.prepare("INSERT INTO runs (id, started_at) VALUES (?, ?)").bind(run.id, run.started_at).run();
      return json({ run });
    }

    // 손 경보 — 종류만 받는다. 자리는 MANUAL_SPOTS 에서 돌아가며, 시각은 지금 시연 시각
    if (req.method === "POST" && p === "/api/alerts") {
      if (!authorized(req, env)) return NOKEY();
      const body = await req.json<{ kind?: unknown }>().catch(() => ({} as { kind?: unknown }));
      if (!isKind(body.kind)) return json({ error: "경보 종류가 올바르지 않습니다" }, 400);
      const run = await currentRun(env);
      if (!run) return json({ error: "먼저 「시연 시작」을 눌러 주세요" }, 409);
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM alerts WHERE run_id = ? AND kind = ?")
        .bind(run.id, body.kind).first<number>("n");
      const spots = MANUAL_SPOTS[body.kind];
      const s = spots[(n ?? 0) % spots.length];
      const a = { id: "m" + newId(), kind: body.kind, ...s, sim_min: simAt(KEYFRAMES, (Date.now() - run.started_at) / 1000) };
      await env.DB.prepare("INSERT INTO alerts (id, run_id, kind, zone, sensor, x, y, sim_min) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(a.id, run.id, a.kind, a.zone, a.sensor, a.x, a.y, a.sim_min).run();
      return json({ alert: a });
    }

    return new Response("없는 주소입니다", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
