-- 관리자 종결(10-11) — 로봇 카메라로 조치를 보고 관리자가 닫은 시각. 사람은 관제의 관리자 한 명(승인 · 종결)
ALTER TABLE incidents ADD COLUMN closed_sim REAL;
