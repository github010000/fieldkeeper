// 가상 지방공항 평면도(SVG) — 폰 세로 화면에 맞춰 활주로를 남북(18/36)으로 눕히지 않고 세운다.
// viewBox 0 0 300 440. 울타리 안 = 비행장, 위·아래 울타리 밖 = 접근로. 실제 공항 도면이 아니다.

export const VIEW = { w: 300, h: 440 };

// 대기 중인 장비 — 지상 로봇 2대 · 드론 1대(Pass 3 에서 이 자리에서 출동한다)
export const UNITS = [
  { id: "R1", type: "robot", label: "로봇 1", x: 58, y: 300 },
  { id: "R2", type: "robot", label: "로봇 2", x: 78, y: 300 },
  { id: "D1", type: "drone", label: "드론 1", x: 68, y: 330 },
] as const;

export function mapSvg(): string {
  const dashes = Array.from({ length: 13 }, (_, i) => `<rect x="159" y="${106 + i * 20}" width="2" height="10"/>`).join("");
  const appr = (y0: number, dir: 1 | -1) =>
    Array.from({ length: 6 }, (_, i) => `<circle cx="160" cy="${y0 + dir * (6 + i * 9)}" r="1.6"/>`).join("");
  return `<svg class="map" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="가상 지방공항 평면도">
  <defs>
    <pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--grass)"/><circle cx="2" cy="2" r=".6" fill="var(--grass-dot)"/></pattern>
  </defs>
  <rect class="field" x="20" y="40" width="260" height="360" rx="14" fill="url(#grass)"/>
  <rect class="fence" x="20" y="40" width="260" height="360" rx="14"/>
  <g class="appr">${appr(70, -1)}${appr(370, 1)}</g>
  <text class="lbl dim start" x="184" y="16">북쪽 접근로</text>
  <text class="lbl dim start" x="184" y="432">남쪽 접근로</text>
  <g class="twy">
    <rect x="108" y="96" width="10" height="248" rx="3"/>
    <rect x="118" y="96" width="30" height="8"/><rect x="118" y="216" width="30" height="8"/><rect x="118" y="336" width="30" height="8"/>
    <rect x="100" y="216" width="8" height="8"/>
  </g>
  <rect class="rwy" x="148" y="70" width="24" height="300" rx="2"/>
  <g class="rwy-mark">${dashes}
    <rect x="151" y="74" width="18" height="2"/><rect x="151" y="364" width="18" height="2"/>
  </g>
  <text class="rwy-no" x="160" y="92">18</text>
  <text class="rwy-no" x="160" y="358">36</text>
  <rect class="apron" x="34" y="190" width="66" height="72" rx="4"/>
  <rect class="bldg" x="26" y="200" width="10" height="52" rx="2"/>
  <text class="lbl" x="67" y="230">계류장</text>
  <rect class="bldg" x="62" y="160" width="12" height="12" rx="2"/>
  <text class="lbl" x="68" y="154">관제탑</text>
  <rect class="base" x="44" y="286" width="48" height="58" rx="5"/>
  <text class="lbl" x="68" y="356">대기소</text>
  <g class="radar">
    <circle class="sweep" cx="244" cy="118" r="5"/>
    <circle cx="244" cy="118" r="5"/>
    <text class="lbl" x="244" y="138">레이더</text>
  </g>
  <text class="lbl dim" x="290" y="232" transform="rotate(90 290 232)">동쪽 울타리</text>
  <g id="alerts"></g>
  <g id="units"></g>
</svg>`;
}
