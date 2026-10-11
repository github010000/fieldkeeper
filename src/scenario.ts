// 시연 시나리오 — 페르소나_시나리오_필드키퍼_20261011.html 의 24시간 네 장면 + 분기 말.
// 장면마다 「오늘(사실)」과 「필드키퍼(추천 → 사람 승인 → 출동 → 결과)」를 둔다. 무작위 값은 없다.
// 공항은 가상의 지방공항이다 — 앱에는 실제 공항 이름을 쓰지 않는다(사실 문장도 「국내 한 공항」으로).
// 좌표 = 지도 viewBox(0 0 220 470) 기준(src/airfield.ts). 운항편만 실제 데이터(src/flights.ts)다.

export type Kind = "intrusion" | "fod" | "bird" | "drone";

export const KIND: Record<Kind, { ko: string; mark: string; color: string }> = {
  intrusion: { ko: "울타리 침입", mark: "침", color: "#ff5c5c" },
  fod: { ko: "활주로 이물질", mark: "물", color: "#ffb02e" },
  bird: { ko: "조류(새 떼)", mark: "새", color: "#ff7a2e" },
  drone: { ko: "미확인 드론", mark: "드", color: "#c77dff" },
};

export interface Spot { zone: string; sensor: string; x: number; y: number }

import { M_PER_UNIT } from "./airfield";

// 시뮬레이션 가정 — 지도 1칸 = 10m(airfield.ts), 지상 로봇 15km/h, 드론 60km/h. 이동 시간(시연 분)은 경로 길이에서 계산한다
const SPEED_M_PER_MIN = { robot: 15000 / 60, drone: 60000 / 60 } as const;
const UNIT_TYPE: Record<string, "robot" | "drone"> = { R1: "robot", R2: "robot", D1: "drone" };

type Pt = [number, number];
const pathLen = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const minutes = (unit: string, p: Pt[]) => (pathLen(p) * M_PER_UNIT) / SPEED_M_PER_MIN[UNIT_TYPE[unit]];

// 운항편 조회 — 장면에 들어갈 때 서버가 실제 데이터를 붙인다(src/flights.ts)
export type FlightQuery =
  | { use: "firstDepart"; from: string; to: string }      // 첫 출발 편
  | { use: "nextArrival"; from: string; to: string }      // 곧 착륙할 편
  | { use: "window"; from: string; to: string };          // 이 시간대 이착륙 편 수

export interface Scene extends Spot {
  id: string; min: number; kind: Kind; note: string;
  today: string;                 // 오늘 — 시나리오 문서의 사실만(출처는 그 문서)
  todayShort: string;            // 분기 말 기록표의 「오늘」 칸
  plan: string;                  // 필드키퍼 추천(승인 요청 문장)
  approveLabel: string;
  paths: Record<string, Pt[]>;   // 승인 뒤 움직이는 장비와 경로(대기소 → 현장)
  travelMin: number;             // 가장 늦게 도착하는 장비 기준(시연 분)
  result: string;                // 도착 뒤 결과
  held: string;                  // 보류했을 때
  flight?: FlightQuery;          // 없으면 운항편을 붙이지 않는다
}

const hm = (h: number, m: number) => h * 60 + m;
const scene = (s: Omit<Scene, "travelMin">): Scene => ({
  ...s, travelMin: Math.max(0, ...Object.entries(s.paths).map(([u, p]) => minutes(u, p))),
});

export const SCENES: Scene[] = [
  scene({
    id: "s1", min: hm(4, 20), kind: "intrusion", zone: "동쪽 울타리 E-2", sensor: "울타리 장력 센서", x: 198, y: 336,
    note: "사람 2명 추정 · 울타리 안쪽으로 이동",
    today: "2023년 3월 국내 한 공항 — 울타리 센서 경보 04:20, 운영센터 접수 04:33. 사람에게 닿기까지 13분.",
    todayShort: "접수까지 13분",
    plan: "가장 가까운 로봇 1 출동 — 카메라로 따라붙어 위치를 보안팀 화면에 공유",
    approveLabel: "로봇 1 출동 승인",
    paths: { R1: [[62, 330], [102, 330], [102, 304], [120, 304], [192, 334]] },
    result: "로봇 1 현장 도착 — 침입자 위치를 보안팀 화면에 실시간 공유 중. 보안팀은 어디로 갈지 알고 출발한다.",
    held: "보류 — 로봇 1 대기. 보안팀이 직접 확인한다.",
  }),
  scene({
    id: "s2", min: hm(5, 0), kind: "fod", zone: "활주로 중앙부", sensor: "활주로 순찰 로봇 카메라", x: 120, y: 240,
    note: "금속 조각 1건 · 밤사이 순찰에서 발견",
    today: "활주로 이물질 점검은 사람이 차량으로 돌며 눈으로 한다(해외 공항도 하루 2~4회 수준).",
    todayShort: "차량 점검 하루 2~4회",
    plan: "로봇 2 출동 — 이물질 수거 후 사진과 함께 기록",
    approveLabel: "로봇 2 수거 승인",
    paths: { R2: [[76, 330], [102, 330], [102, 240], [117, 240]] },
    result: "이물질 1건 수거 · 사진 기록. 첫 편 전 운영 화면에 「활주로 이상 없음」.",
    held: "보류 — 로봇 2 대기. 점검 차량이 나간다.",
    flight: { use: "firstDepart", from: "0500", to: "1000" },
  }),
  scene({
    id: "s3", min: hm(8, 57), kind: "bird", zone: "북쪽 접근로", sensor: "조류 레이더", x: 124, y: 16,
    note: "새 떼 약 30마리 · 활주로 18 접근 경로",
    today: "2024년 12월 국내 한 공항 — 조류 경보 08:57, 사고 09:03. 경보에서 사고까지 6분.",
    todayShort: "경보 → 사고 6분",
    plan: "북쪽 거점의 드론 1 출동 — 음향·조명으로 새 떼를 접근로 밖으로 몰아낸다. 관제와 같은 화면을 본다",
    approveLabel: "드론 1 출동 승인",
    paths: { D1: [[166, 128], [126, 24]] },
    result: "새 떼 접근로 밖으로 이동 · 퇴치 기록. 같은 무리가 돌아오면 다시 간다.",
    held: "보류 — 장비 대기. 관제에 조류 정보만 알린다.",
    flight: { use: "nextArrival", from: "0857", to: "0957" },
  }),
  scene({
    id: "s4", min: hm(12, 53), kind: "drone", zone: "남서쪽 경계 밖 2.7km", sensor: "레이더(조류·드론 구분)", x: 11, y: 430,
    note: "미승인 드론 1대 · 공항 쪽으로 접근",
    today: "2020년 11월 국내 한 공항 — 불법 드론으로 이착륙 세 차례 중단, 11편 지연·1편 회항.",
    todayShort: "11편 지연 · 1편 회항",
    plan: "위치·이동 경로를 운영·보안·관제에 동시 공유하고 관계기관에 통보(무력화는 법이 정한 기관의 몫)",
    approveLabel: "공유·통보 승인",
    paths: {},
    result: "운영·보안·관제에 경로 공유 · 관계기관 통보 · 기록. 필드키퍼의 범위는 찾고 · 알리고 · 기록까지.",
    held: "보류 — 관제에만 알린다.",
    flight: { use: "window", from: "1253", to: "1353" },
  }),
];

// 자유 경보(☰ 메뉴, Q&A 대응용) 자리 — 종류별로 돌아가며 쓴다
export const MANUAL_SPOTS: Record<Kind, Spot[]> = {
  intrusion: [
    { zone: "서쪽 울타리 W-1", sensor: "울타리 장력 센서", x: 22, y: 140 },
    { zone: "북쪽 울타리 N-1", sensor: "울타리 장력 센서", x: 172, y: 30 },
  ],
  fod: [
    { zone: "유도로 A", sensor: "활주로 순찰 로봇 카메라", x: 102, y: 200 },
    { zone: "활주로 북단", sensor: "활주로 순찰 로봇 카메라", x: 120, y: 124 },
  ],
  bird: [
    { zone: "남쪽 접근로", sensor: "조류 레이더", x: 110, y: 455 },
    { zone: "활주로 동측 초지", sensor: "조류 레이더", x: 152, y: 300 },
  ],
  drone: [
    { zone: "북동쪽 경계 밖", sensor: "레이더(조류·드론 구분)", x: 208, y: 14 },
    { zone: "동쪽 경계 밖", sensor: "레이더(조류·드론 구분)", x: 212, y: 262 },
  ],
};

export const isKind = (k: unknown): k is Kind => typeof k === "string" && k in KIND;
