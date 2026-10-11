-- 장면 진행(10-11) — 회차에 장면 단계를 더하고, 장면마다 사건 기록을 남긴다. 더하기만 한다(기존 줄 불변)
ALTER TABLE runs ADD COLUMN scene INTEGER NOT NULL DEFAULT 0;          -- 0 = 시작 전, 1~4 = 장면, 5 = 분기 말
ALTER TABLE runs ADD COLUMN phase TEXT NOT NULL DEFAULT 'idle';        -- idle · alert · dispatch · hold · summary
ALTER TABLE runs ADD COLUMN phase_at INTEGER NOT NULL DEFAULT 0;       -- 이 단계가 시작된 실제 시각(ms)
ALTER TABLE runs ADD COLUMN sim_base REAL NOT NULL DEFAULT 240;        -- 이 단계가 시작될 때의 시연 시각(분)
ALTER TABLE runs ADD COLUMN summary_json TEXT;                         -- 분기 말에 계산한 값(오늘 실제 운항 횟수 등)

-- 사건 기록 — 경보 · 사람의 결정(승인/보류) · 도착. 시각은 시연 분. 지우지 않는다
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  scene INTEGER NOT NULL,
  alert_sim REAL NOT NULL,
  flight_json TEXT,                     -- 장면에 들어갈 때 붙인 실제 운항편(flights.ts)
  decision TEXT,                        -- approve · hold
  decided_sim REAL,
  arrive_sim REAL,                      -- 승인했을 때만 = decided_sim + 이동 시간
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS incidents_run ON incidents(run_id);
