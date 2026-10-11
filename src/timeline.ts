// 시연 시계 — 장면 단계(phase)와 그 단계가 시작된 실제 시각(phase_at)에서 지금 시연 시각을 계산한다.
// 서버와 화면이 같은 함수(simClock)를 쓴다: 새로고침해도, 폰 두 대가 따로 열어도 같은 시각을 본다.
//   idle     04:00 에 멈춰 있다
//   alert    「다음 장면」을 누른 뒤 3초 동안 장면 시각까지 빨리 감고, 경보에서 멈춘 뒤로는 실제 1초 = 시연 10초로 흐른다(승인 대기)
//   dispatch 승인 뒤 장비 이동 — 이동 시간(travelMin)을 실제 10초에(꺾임이 카메라에 보이도록) 보여 주고, 도착 뒤 해결까지 resolveMin 을 resolveS 초에, 그 뒤 1초 = 10초
//            착륙이 먼저인 조류 경보는 도착 뒤 착륙 통과까지 장비를 끄고 대기한다(hold 분, 해결과 같은 빠르기) — 착륙 중에 새 떼를 흩뜨리지 않는다(대장 10-11)
//   hold     보류 — 1초 = 10초
//   closed   관리자가 종결 — 종결 시각에 멈춘다(흐르면 「05:00 인지 → 05:20 완료」로 읽힌다, 대장 10-11)
//   summary  분기 말 — 멈춤

export const START_MIN = 4 * 60;

export interface RunClock { scene: number; phase: string; phase_at: number; sim_base: number }

// 화면에도 그대로 실린다(toString) — 바깥 이름을 쓰지 말 것. sc = 장면별 [시각(분), 이동 시간(분), 해결 실제 초, 해결 시연 분]
export function simClock(r: RunClock | null, now: number, sc: number[][], hold = 0): number {
  const TRAVEL = 3, W = 1 / 6;
  if (!r || r.phase === "idle") return 240;
  const e = Math.max(0, (now - r.phase_at) / 1000);
  if (r.phase === "alert") {
    const m = sc[r.scene - 1][0];
    return e < TRAVEL ? r.sim_base + ((m - r.sim_base) * e) / TRAVEL : m + (e - TRAVEL) * W;
  }
  if (r.phase === "dispatch") {
    const [, tm, rs, rm] = sc[r.scene - 1], move = tm > 0 ? 10 : 1;
    if (e < move) return r.sim_base + (tm * e) / move;
    const hs = rm > 0 ? (hold * rs) / rm : 0, a0 = e - move;
    if (a0 < hs) return r.sim_base + tm + (hold * a0) / hs;
    const a = a0 - hs, b = r.sim_base + tm + hold;
    return a < rs ? b + (rm * a) / rs : b + rm + (a - rs) * W;
  }
  if (r.phase === "hold") return r.sim_base + e * W;
  return r.sim_base;
}

// 경보 단계에서 빨리 감기가 끝났는가(승인 단추를 여는 기준) · 출동이 끝났는가(다음 장면을 여는 기준)
export const ALERT_READY_S = 3;
export const moveSeconds = (travelMin: number) => (travelMin > 0 ? 10 : 1);
// 착륙 통과 대기의 실제 초 — 해결과 같은 빠르기(resolveS 초 = resolveMin 분)
export const holdSeconds = (hold: number, resolveS: number, resolveMin: number) => (resolveMin > 0 ? (hold * resolveS) / resolveMin : 0);
