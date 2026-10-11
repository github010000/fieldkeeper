// 시연 시나리오 — 페르소나_시나리오_필드키퍼_20261011.html 의 24시간 네 장면.
// 무작위 값을 쓰지 않는다: 몇 번을 돌려도 같은 시각·같은 자리에 같은 경보가 뜬다.
// 공항은 가상의 지방공항이다 — 실제 공항 이름·도면을 쓰지 않는다. 좌표 = 지도 viewBox(0 0 300 440) 기준(src/airfield.ts)

export type Kind = "intrusion" | "fod" | "bird" | "drone";

export const KIND: Record<Kind, { ko: string; mark: string; color: string }> = {
  intrusion: { ko: "울타리 침입", mark: "침", color: "#ff5c5c" },
  fod: { ko: "활주로 이물질", mark: "물", color: "#ffb02e" },
  bird: { ko: "조류(새 떼)", mark: "새", color: "#ff7a2e" },
  drone: { ko: "미확인 드론", mark: "드", color: "#c77dff" },
};

export interface Spot { zone: string; sensor: string; x: number; y: number }
export interface ScenarioAlert extends Spot { id: string; min: number; kind: Kind; note: string }

const hm = (h: number, m: number) => h * 60 + m;

export const SCENARIO: ScenarioAlert[] = [
  { id: "s1", min: hm(4, 20), kind: "intrusion", zone: "동쪽 울타리 E-2", sensor: "울타리 장력 센서",
    x: 280, y: 300, note: "사람 2명 추정 · 울타리 안쪽으로 이동" },
  { id: "s2", min: hm(5, 0), kind: "fod", zone: "활주로 중앙부", sensor: "활주로 순찰 카메라",
    x: 160, y: 236, note: "금속 조각 1건 · 첫 편 06:40 전 수거 필요" },
  { id: "s3", min: hm(8, 57), kind: "bird", zone: "북쪽 접근로", sensor: "조류 레이더",
    x: 168, y: 22, note: "새 떼 약 30마리 · 활주로 18 접근 경로" },
  { id: "s4", min: hm(12, 53), kind: "drone", zone: "남서쪽 경계 밖 2.7km", sensor: "조류 레이더(드론 구분)",
    x: 34, y: 420, note: "미승인 드론 1대 · 공항 쪽으로 접근" },
];

// 「경보 발생」 단추용 자리 — 종류별로 돌아가며 쓴다(이번 회차의 같은 종류 손 경보 개수로 고른다)
export const MANUAL_SPOTS: Record<Kind, Spot[]> = {
  intrusion: [
    { zone: "서쪽 울타리 W-1", sensor: "울타리 장력 센서", x: 20, y: 140 },
    { zone: "북쪽 울타리 N-1", sensor: "울타리 장력 센서", x: 236, y: 40 },
  ],
  fod: [
    { zone: "유도로 B", sensor: "활주로 순찰 카메라", x: 113, y: 300 },
    { zone: "활주로 북단", sensor: "활주로 순찰 카메라", x: 160, y: 112 },
  ],
  bird: [
    { zone: "남쪽 접근로", sensor: "조류 레이더", x: 152, y: 420 },
    { zone: "활주로 동측 초지", sensor: "조류 레이더", x: 220, y: 256 },
  ],
  drone: [
    { zone: "북동쪽 경계 밖", sensor: "조류 레이더(드론 구분)", x: 286, y: 14 },
    { zone: "동쪽 경계 밖", sensor: "조류 레이더(드론 구분)", x: 292, y: 210 },
  ],
};

export const isKind = (k: unknown): k is Kind => typeof k === "string" && k in KIND;
