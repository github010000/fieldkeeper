# 필드키퍼 MVP — 비행장 경보를 즉시 행동으로

KAC 데모데이(2026-10-17) 시연용. 하드웨어 없이 「경보 → AI 판단 → 사람 승인 → 출동 → 기록」 한 바퀴를 웹 앱으로 돌린다.
**센서·로봇은 시뮬레이션, 판단·승인·기록은 실제 동작.** 공항은 가상의 지방공항이다(실제 공항 이름·도면을 쓰지 않는다).
계획서 = `~/workspaces/personal/entrepreneur/KAC/7_1017_demoday/MVP_필드키퍼_구현계획_20261011.html` · 구조는 추임새(`~/workspaces/personal/chuimsae`)를 따른다.

## 시연 방식(10-11 대장) — 폰 두 대
부스에 노트북을 둘 수 없어 **폰 화면이 기준**이다. 아이폰 13 미니 = 관제(대장이 들고 설명, 사파리) · 갤럭시 S23 = 현장(방문객이 승인, 크롬, 앱 고정).
두 폰이 같은 서버를 보므로 한쪽의 승인이 다른 쪽 지도에 1초 안에 보인다. 통신 = 두 폰 LTE 주, 행사장(헤이그라운드) 와이파이 예비.

## 구조
- `src/scenario.ts` 시나리오 경보 넷(04:20 울타리 침입 · 05:00 활주로 이물질 · 08:57 북쪽 접근로 새 떼 · 12:53 드론)과 「경보 발생」 단추의 자리 — 무작위 없음
- `src/timeline.ts` 시연 시계 — 회차의 「시작한 실제 시각」에서 시연 시각을 계산한다(경보 사이 빨리 감기, 경보 앞뒤 천천히, 한 바퀴 약 62초). 서버와 화면이 같은 `simAt` 을 쓴다
- `src/airfield.ts` 가상 공항 평면도(SVG, 세로 화면용 남북 활주로 18/36) · 대기 장비(로봇 2 · 드론 1)
- `src/pages.ts` 관제 화면 — 폰은 지도 위 · 단추 · 경보 목록, 860px 이상은 두 칸. 새 경보 = 아래쪽 알림 + 진동(안드로이드). 화면 꺼짐 방지(Wake Lock)
- `src/index.ts` API — `GET /api/state`(회차 · 손 경보 · server_now) · `POST /api/demo/start`(새 회차, 지난 회차는 남긴다) · `POST /api/alerts`(`{kind}`, 회차가 없으면 409)
- `schema.sql` — runs · alerts(손 경보만. 시나리오 경보는 저장하지 않고 시각에서 계산)

## 로컬
```
npm install
npx wrangler d1 execute fieldkeeper --local --file=schema.sql
npx wrangler dev --ip 0.0.0.0 --port 8791     # 같은 와이파이의 폰에서 http://<mbp15 IP>:8791
```
화면 확인 = `node scripts/shot.mjs <주소> <폭> <높이> <출력접두> <ms,ms…>` — 헤드리스 크롬을 원격 디버깅으로 띄워 폰 화면을 흉내 내고 지정 시점마다 찍는다(JS 오류도 보고).
폭은 375×812(미니) · 360×780(S23) · 312(좁은 폭 점검). `--screenshot` 직접 호출은 이 맥에서 캡처 뒤 크롬이 종료하지 않고, `--window-size` 가 좁은 폭을 못 낸다.

## 진행
- Pass 1(10-11) 뼈대 · 지도 · 시뮬레이터 ✅
- Pass 2 판단(위험도 · 출동 순서 · LiteLLM 설명 `fieldkeeper-explain`) · Pass 3 현장 승인 · 출동 · 기록·지표 · Pass 4 msu 배포(`fieldkeeper.nabee.ai.kr`) · 시연 모드 · 덱 v2
