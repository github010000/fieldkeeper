// 시연 시나리오 — 아침 08:57 날아드는 새 떼(음파 · 폭음) · 해 질 녘 18:15 초지에 앉은 새 떼(녹색 레이저) 두 장면 + 분기 말.
// 범위는 조류 하나(대장 10-15: 침입 장면을 빼고 레이저를 넣는다 — 조류 퇴치에 완전히 집중). 이물질 · 드론 · 침입은 뺐다.
// 장면마다 「오늘(사실)」과 「필드키퍼(추천 → 사람 승인 → 출동 → 결과)」를 둔다. 무작위 값은 없다.
// 공항은 가상의 지방공항이다 — 앱에는 실제 공항 이름을 쓰지 않는다(사실 문장도 「국내 한 공항」으로).
// 좌표 = 지도 viewBox(0 0 220 470) 기준(src/airfield.ts). 운항편만 실제 데이터(src/flights.ts)다.

export type Kind = "bird";

export const KIND: Record<Kind, { ko: string; mark: string; color: string }> = {
  bird: { ko: "조류(새 떼)", mark: "새", color: "#ff7a2e" },
};

export interface Spot { zone: string; sensor: string; x: number; y: number }

import { M_PER_UNIT } from "./airfield";

// 시뮬레이션 가정 — 지도 1칸 = 10m(airfield.ts), 순찰형 무한궤도 로봇 초속 1.0m(기준 제품 申昊 L7-T1, 10-14). 이동 시간(시연 분)은 경로 길이에서 계산한다
// 느리므로 거점을 접근로 끝에 바짝 둔다 — 북쪽 거점 → 접근로 앞 울타리 약 130m = 2분 남짓(08:57 경보 → 08:59 도착 유지)
const SPEED_M_PER_MIN = { robot: 60 } as const;
const UNIT_TYPE: Record<string, "robot"> = { R1: "robot", R2: "robot" };

type Pt = [number, number];
// 구간 노면 — twy = 포장 유도로(노란 중심선) · grass = 잔디(포장 없음, 화면이 흔들린다)
export interface Leg { name: string; surface: "twy" | "grass" }
const pathLen = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
export const travelMinutes = (unit: string, p: Pt[]) => (pathLen(p) * M_PER_UNIT) / SPEED_M_PER_MIN[UNIT_TYPE[unit]];

// 운항편 조회 — 장면에 들어갈 때 서버가 실제 데이터를 붙인다(src/flights.ts)
export type FlightQuery =
  | { use: "firstDepart"; from: string; to: string }      // 첫 출발 편
  | { use: "nextArrival"; from: string; to: string }      // 곧 착륙할 편
  | { use: "nextDepart"; from: string; to: string }       // 곧 출발할 편(이륙 전에 활주로 주변을 비운다)
  | { use: "window"; from: string; to: string }           // 이 시간대 이착륙 편 수
  | { use: "next"; from: string; to: string };            // 다음 운항편(도착 · 출발 가운데 가장 이른 것)

export interface Scene extends Spot {
  id: string; min: number; kind: Kind; note: string;
  today: string;                 // 실제 사례 — 시나리오 문서의 사실만(출처는 그 문서). 해를 바꾸지 않는다(지어낸 사건이 된다)
  todayLabel?: string;           // 「오늘」 칸 제목 — 없으면 「실제 사례 — 과거에 이렇게 됐다」. 사건이 아니라 지금의 방식(고시)을 적을 때 바꾼다
  tool?: "sound" | "laser";      // 퇴치 수단 — sound(음파퇴치기 · 폭음경보기, 기본) · laser(녹색 레이저, 앉은 새만 — 고시 제32조의2 수평 0도 이하)
  area: string;                  // 퇴치 뒤 비우는 곳 — 「다음 편 전에 ○○을 정리한다」
  todayShort: string;            // 분기 말 기록표의 「실제 사례」 칸
  situation: string;             // 필드키퍼 판단 · 상황 — 센서·레이더가 본 것(운항편 겹침은 서버가 붙인다)
  action: string;                // 필드키퍼 판단 · 조치 — 관리자가 승인하면 할 일(장면마다 하나)
  actionLate?: string;           // 착륙 · 출발이 로봇 조치보다 먼저 올 때의 조치(judge.ts 가 고른다)
  autoShare?: string;            // 그때 경보와 함께 자동으로 나가는 정보 공유(장비 이동 아님)
  approveLabel: string;
  cam: { unit: string; ir: boolean };  // 로봇 카메라 화면(/cam) — 어느 장비의 눈인가 · 야간 적외선 톤인가
  paths: Record<string, Pt[]>;   // 승인 뒤 움직이는 장비와 경로(거점 또는 순찰 위치 → 현장)
  legs?: Record<string, Leg[]>;  // 경로 구간마다 이름 · 노면 — 로봇 카메라 이동 화면(내비 안내 · 꺾임)에 쓴다
  homes?: Record<string, Pt>;    // 이 장면 때 장비가 있는 곳(거점이 아니면 순찰 위치 — 로봇 1은 해 질 녘 동쪽 초지를 순찰 중)
  travelMin: number;             // 가장 늦게 도착하는 장비 기준(시연 분)
  result: string;                // 도착 뒤 — 카메라로 보이는 조치(해결된 모습)
  // 종결 조건 — 로봇이 도착해도 바로 끝나지 않는다(새 떼가 실제로 빠져나가야 끝난다).
  // 도착 뒤 resolveS 초(실제) = resolveMin 분(시연)이 지나 해결 장면이 카메라에 보여야 관리자 종결 단추가 열린다(시뮬레이션 가정)
  waitText: string; closeLabel: string; closeShort: string; resolveS: number; resolveMin: number;
  held: string;                  // 보류했을 때 — 장비는 대기, 고정 센서로 본다
  flight?: FlightQuery;          // 없으면 운항편을 붙이지 않는다
  distM?: number;                // 지도 밖 경보의 실제 거리(m) — 지도 표시 자리는 화면 가장자리라 거리 계산에 쓰지 않는다(judge.ts)
}

const hm = (h: number, m: number) => h * 60 + m;
const scene = (s: Omit<Scene, "travelMin">): Scene => ({
  ...s, travelMin: Math.max(0, ...Object.entries(s.paths).map(([u, p]) => travelMinutes(u, p))),
});

export const SCENES: Scene[] = [
  scene({
    id: "s1", min: hm(8, 57), kind: "bird", zone: "북쪽 접근로", sensor: "조류 레이더", x: 124, y: 16,
    note: "새 떼 약 30마리 · 활주로 18 접근 경로",
    today: "2024년 12월 국내 한 공항 — 조류 경보 08:57, 사고 09:03. 경보에서 사고까지 6분.",
    todayShort: "경보 → 사고 6분",
    area: "접근로",
    situation: "조류 레이더 — 새 떼 약 30마리 · 북쪽 접근로(활주로 18 접근 경로)로 이동",
    // 녹색 레이저는 고시(제2026-256호 제32조의2)상 수평 0도 이하만 — 나는 새 떼에는 쓰지 않는다(땅에 앉은 새 몫)
    action: "북쪽 거점 로봇 2 출동(이동 약 130m) — 음파퇴치기를 켜고 접근로 앞 울타리에서 폭음경보기로 새 떼를 몰아낸다. 나는 새라 녹색 레이저는 쓰지 않는다",
    // 착륙이 로봇 퇴치보다 먼저 오면(judge.ts race) — 착륙 편은 관제탑이 판단하고(경보와 함께 자동 공유), 로봇은 다음 편 전에 접근로를 정리한다(대장 10-11)
    actionLate: "관제탑에 조류 정보 즉시 공유(착륙 편 복행 · 지연은 관제탑 판단) · 로봇 2 출동(이동 약 130m)은 다음 편 전 접근로 정리 — 퇴치 시작은 관제탑과 맞춘다",
    autoShare: "관제탑에 조류 정보 공유 — 경보와 함께 자동(정보 전달 · 장비는 승인 뒤에만 움직인다)",
    approveLabel: "로봇 2 퇴치 출동 승인",
    cam: { unit: "R2", ir: false },
    paths: { R2: [[134, 50], [134, 42], [131, 38]] },
    legs: { R2: [{ name: "북쪽 순찰로", surface: "grass" }, { name: "접근로 앞 울타리", surface: "grass" }] },
    result: "새 떼 접근로 밖으로 이동 · 퇴치 기록. 같은 무리가 돌아오면 다시 간다.",
    waitText: "음파·폭음 퇴치 중", closeLabel: "접근로 정상 확인 — 종결", closeShort: "접근로 정상", resolveS: 8, resolveMin: 2,
    held: "보류 — 로봇 2 거점 대기. 관제탑에 조류 정보를 전한다.",
    flight: { use: "nextArrival", from: "0857", to: "0957" },
  }),
  // 해 질 녘 · 이륙 전 — 활주로 옆 초지에 앉은 새 떼. 녹색 레이저(고시 제2026-256호 제32조의2)는 땅에 앉은 새 몫이다
  //   2호 안전시스템 = 방사각이 수평 위로 0도를 넘으면 자동 정지 → 쏘기 전에 확인 · 3호 수평 0도 이하(아래로)만 · 1호 사람 · 항공기 · 건물 · 차량 쪽 금지
  //   4호 새 떼를 활주로 · 이착륙 방향으로 몰지 않는다 → 로봇이 새 떼와 활주로 사이에 서서 동쪽 울타리 쪽(땅)으로 비춘다 · 5호 쓰지 않을 땐 잠금
  //   ⚠️ 고시는 사람이 손에 들고 쏘는 경우를 전제로 쓰였다(6호 상시 소지 · 8호 보호구). 로봇에 실어 원격으로 쏘는 운용은 고시가 직접 다루지 않는다 → 실증특례 몫
  scene({
    id: "s2", min: hm(18, 15), kind: "bird", tool: "laser", zone: "활주로 동측 초지", sensor: "조류 레이더 · 동측 고정 카메라", x: 163, y: 282,
    note: "앉은 새 떼 약 40마리 · 활주로에서 약 280m · 해 질 녘",
    // 이 장면은 사건이 아니라 지금의 방식(고시 원문)을 적는다 — 지어낸 사례를 쓰지 않는다
    todayLabel: "지금 — 고시가 정한 방식",
    today: "지금은 조류 담당이 레이저 건을 손에 들고 나가 쏜다. 수령한 사람이 늘 지니고, 쓰지 않을 땐 잠가 보관함에 둔다(고시 제2026-256호 제32조의2).",
    todayShort: "사람이 레이저를 들고 나간다",
    area: "초지",
    situation: "조류 레이더 · 동측 고정 카메라 — 활주로 동측 초지에 앉은 새 떼 약 40마리 · 활주로에서 약 280m · 로봇 1이 동쪽 초지를 순찰 중",
    action: "로봇 1이 새 떼와 활주로 사이로(약 450m) — 레이저 안전시스템(위로 0도를 넘으면 자동 정지)을 확인한 뒤, 녹색 레이저를 수평 아래로만 비춰 새 떼를 활주로 반대쪽(동쪽 울타리)으로 몬다. 항공기 · 사람 · 건물 쪽으로는 비추지 않는다",
    // 출발이 로봇 퇴치보다 먼저 오면 — 출발 편은 관제탑이 판단하고, 로봇은 레이저를 잠근 채 기다렸다가 그 편이 지나간 뒤 퇴치한다(항공기 쪽 방사 금지 · 1호)
    actionLate: "관제탑에 조류 정보 즉시 공유(출발 편 지연 · 순서는 관제탑 판단) · 로봇 1 출동(약 450m), 현장에서 레이저를 잠근 채 대기 — 출발 편이 지나간 뒤 다음 편 전 초지 정리",
    autoShare: "관제탑에 조류 정보 공유 — 경보와 함께 자동(정보 전달 · 장비는 승인 뒤에만 움직인다)",
    approveLabel: "로봇 1 레이저 퇴치 출동 승인",
    cam: { unit: "R1", ir: false },
    homes: { R1: [152, 328] },
    paths: { R1: [[152, 328], [150, 300], [148, 284]] },
    legs: { R1: [{ name: "동쪽 순찰로", surface: "grass" }, { name: "동측 초지", surface: "grass" }] },
    result: "새 떼가 동쪽 울타리 밖으로 이동 · 레이저 잠금 · 퇴치 기록. 활주로 쪽으로 간 새는 없다.",
    waitText: "레이저 퇴치 중", closeLabel: "초지 정상 확인 — 종결", closeShort: "초지 정상", resolveS: 9, resolveMin: 3,
    held: "보류 — 로봇 1은 순찰 위치에서 대기(레이저 잠금). 고정 카메라로 새 떼를 지켜본다.",
    flight: { use: "nextDepart", from: "1815", to: "2014" },
  }),
];

// 자유 경보(☰ 메뉴, Q&A 대응용) 자리 — 종류별로 돌아가며 쓴다
export const MANUAL_SPOTS: Record<Kind, Spot[]> = {
  bird: [
    { zone: "남쪽 접근로", sensor: "조류 레이더", x: 110, y: 455 },
    { zone: "활주로 동측 초지", sensor: "조류 레이더", x: 152, y: 300 },
  ],
};

export const isKind = (k: unknown): k is Kind => typeof k === "string" && k in KIND;
