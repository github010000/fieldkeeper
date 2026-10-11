// 시연 시계 — 「시작한 실제 시각」 하나에서 지금 시연 시각을 계산한다.
// 서버와 화면이 같은 함수(simAt)를 쓴다: 새로고침해도, 폰 두 대가 따로 열어도 같은 시각을 본다.
// 경보 사이 빈 시간은 빨리 감고(FAST 초), 경보 앞뒤 W 분은 천천히(SLOW 초) 지나간다.
import { SCENARIO } from "./scenario";

export const START_MIN = 4 * 60;       // 04:00
export const END_MIN = 13 * 60 + 30;   // 13:30 — 이후로는 멈춰 있다(손 경보는 계속 띄울 수 있다)
const FAST = 6, SLOW = 8, W = 2;

export type Keyframe = [number, number]; // [실제 경과 초, 시연 분]

export const KEYFRAMES: Keyframe[] = (() => {
  const kf: Keyframe[] = [[0, START_MIN]];
  let t = 0;
  for (const e of SCENARIO) {
    t += FAST; kf.push([t, e.min - W]);
    t += SLOW; kf.push([t, e.min + W]);
  }
  t += FAST; kf.push([t, END_MIN]);
  return kf;
})();

// 화면에도 그대로 실린다(toString) — 바깥 이름을 쓰지 말 것
export function simAt(kf: Keyframe[], sec: number): number {
  if (sec <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    const [t1, m1] = kf[i];
    if (sec <= t1) {
      const [t0, m0] = kf[i - 1];
      return m0 + ((sec - t0) / (t1 - t0)) * (m1 - m0);
    }
  }
  return kf[kf.length - 1][1];
}
