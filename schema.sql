-- 필드키퍼 D1 — 새로 만들 때는 이 파일 다음에 migrations/ 를 번호 순서로 적용한다(0002 = 장면 진행 · 0003 = 관리자 종결)
-- 장면 정의(04:20 · 05:00 · 08:57 · 12:53)는 src/scenario.ts 의 고정 목록이다 — 저장하는 것은 회차 · 사건 기록 · 자유 경보

-- 시연 회차 — 「시연 시작」 한 번 = 한 줄. 가장 최근 줄이 지금 회차다. 시각은 started_at 에서 계산한다(src/timeline.ts)
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,          -- 실제 시각(ms)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 자유 경보(☰ 메뉴, Q&A 대응용) — 회차에 묶인다. 지우지 않는다
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
