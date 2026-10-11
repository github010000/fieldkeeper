-- 필드키퍼 판단(10-11) — 경보 때 계산한 위험도 · 조치 장비 · 「왜」 한 줄(judge.ts). 새로고침 · 두 기기에서 같은 값을 보도록 저장한다
ALTER TABLE incidents ADD COLUMN judge_json TEXT;
