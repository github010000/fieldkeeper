-- 필드키퍼 D1 — Pass 1(10-12): 시연 회차와 손으로 띄운 경보
-- 시나리오 경보(04:20 · 05:00 · 08:57 · 12:53)는 src/scenario.ts 의 고정 목록이라 저장하지 않는다 — 시각에서 계산한다(결정적 재생)

-- 시연 회차 — 「시연 시작」 한 번 = 한 줄. 가장 최근 줄이 지금 회차다. 시각은 started_at 에서 계산한다(src/timeline.ts)
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,          -- 실제 시각(ms)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 손으로 띄운 경보(「경보 발생」 단추) — 회차에 묶인다. 지우지 않는다
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL,                   -- intrusion · fod · bird · drone
  zone TEXT NOT NULL,
  sensor TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  sim_min REAL NOT NULL,                -- 시연 시각(자정부터 분)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS alerts_run ON alerts(run_id);
