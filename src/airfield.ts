// 가상 지방공항 평면도(SVG) — 실제 지방공항 규모로 그린 가상 배치(특정 공항 도면이 아니다).
// 축척 1칸 = 10m. 활주로 18/36 은 2,800m × 45m(폭은 눈에 보이도록 조금 넓혔다), 평행 유도로 A 는 활주로 중심에서 180m.
// 폰 세로 화면에 맞춰 활주로를 남북으로 세운다. 울타리 밖 위·아래 = 접근로.

export const VIEW = { w: 220, h: 470 };
export const M_PER_UNIT = 10;

// 장비 거점 — 실증 = 순찰형 로봇 2대(한 기종), 북쪽 · 남쪽 접근로 끝에 바짝(제품은 동서남북 4거점, 10-14 대장).
// 로봇은 초속 1m로 느려서 거점을 접근로 앞 울타리 가까이 둔다. 평소 순찰 · 경보 때 그 자리에서 대응 · 자율 충전(scenario.ts)
// 조류 퇴치에 드론은 쓰지 않는다(대장 10-11): 로봇에 음파퇴치기 · 폭음경보기 · 녹색 레이저를 싣는다(공포탄은 사람)
export const UNITS = [
  { id: "R1", type: "robot", label: "로봇 1", base: "남쪽 거점", x: 106, y: 410 },
  { id: "R2", type: "robot", label: "로봇 2", base: "북쪽 거점", x: 134, y: 50 },
] as const;

const RWY = { x: 120, y0: 100, y1: 380, w: 6 };        // 활주로(중심선 x)
const TWY_X = 102;                                     // 평행 유도로 A
const LINKS = [112, 176, 240, 304, 368];               // 연결 유도로 A1~A5(y)

export function mapSvg(): string {
  const { x, y0, y1, w } = RWY;
  const centre = Array.from({ length: Math.floor((y1 - y0 - 40) / 10) }, (_, i) =>
    `<rect x="${x - 0.35}" y="${y0 + 22 + i * 10}" width=".7" height="5"/>`).join("");
  const piano = (y: number) => Array.from({ length: 4 }, (_, i) =>
    `<rect x="${x - 2.6 + i * 1.5}" y="${y}" width=".8" height="5"/>`).join("") +
    Array.from({ length: 4 }, (_, i) => `<rect x="${x + 0.4 + i * 1.5}" y="${y}" width=".8" height="5"/>`).join("");
  const alsN = Array.from({ length: 6 }, (_, i) => `<circle cx="${x}" cy="${y0 - 8 - i * 10}" r=".9"/>`).join("") +
    `<rect x="${x - 6}" y="${y0 - 39}" width="12" height=".9"/>`;
  const alsS = Array.from({ length: 6 }, (_, i) => `<circle cx="${x}" cy="${y1 + 8 + i * 10}" r=".9"/>`).join("") +
    `<rect x="${x - 6}" y="${y1 + 38}" width="12" height=".9"/>`;
  const links = LINKS.map((ly, i) =>
    `<rect x="${TWY_X}" y="${ly - 1.2}" width="${x - TWY_X}" height="2.4"/>` +
    `<text class="tw" x="${TWY_X - 4}" y="${ly + 1.8}">A${i + 1}</text>`).join("");
  return `<svg class="map" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="가상 지방공항 평면도">
  <defs>
    <pattern id="grass" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--grass)"/><circle cx="1.5" cy="1.5" r=".45" fill="var(--grass-dot)"/></pattern>
  </defs>
  <rect class="field" x="22" y="30" width="176" height="420" rx="10" fill="url(#grass)"/>
  <rect class="strip" x="${x - 15}" y="${y0 - 6}" width="30" height="${y1 - y0 + 12}"/>
  <rect class="fence" x="22" y="30" width="176" height="420" rx="10"/>
  <g class="als">${alsN}${alsS}</g>
  <g class="twy">
    <rect x="${TWY_X - 1.2}" y="${LINKS[0] - 1.2}" width="2.4" height="${LINKS[4] - LINKS[0] + 2.4}"/>
    ${links}
    <rect x="88" y="214" width="${TWY_X - 88}" height="2.4"/><rect x="88" y="262" width="${TWY_X - 88}" height="2.4"/>
  </g>
  <text class="tw big" x="${TWY_X - 4}" y="146">A</text>
  <rect class="rwy" x="${x - w / 2}" y="${y0}" width="${w}" height="${y1 - y0}"/>
  <g class="rwy-mark">${centre}${piano(y0 + 2)}${piano(y1 - 7)}</g>
  <text class="rwy-no" x="${x}" y="${y0 + 15}">18</text>
  <text class="rwy-no" x="${x}" y="${y1 - 10}">36</text>
  <rect class="apron" x="48" y="198" width="40" height="82" rx="2"/>
  <text class="lbl" x="68" y="242">계류장</text>
  <rect class="bldg" x="32" y="204" width="13" height="70" rx="1.5"/>
  <text class="lbl" x="38.5" y="290">터미널</text>
  <rect class="bldg" x="56" y="176" width="7" height="7" rx="1"/>
  <text class="lbl" x="59.5" y="172">관제탑</text>
  <rect class="bldg" x="46" y="306" width="16" height="10" rx="1"/>
  <text class="lbl" x="54" y="302">소방대</text>
  <rect class="base" x="126" y="44" width="16" height="12" rx="2"/>
  <text class="lbl start" x="145" y="52">북쪽 거점</text>
  <rect class="base" x="98" y="404" width="16" height="12" rx="2"/>
  <text class="lbl end" x="95" y="412">남쪽 거점</text>
  <g class="radar">
    <circle class="sweep" cx="170" cy="222" r="3.5"/>
    <circle cx="170" cy="222" r="3.5"/>
    <text class="lbl" x="170" y="234">조류 레이더</text>
  </g>
  <text class="lbl dim end" x="${x - 9}" y="14">북쪽 접근로</text>
  <text class="lbl dim start" x="${x + 9}" y="466">남쪽 접근로</text>
  <text class="lbl dim" x="206" y="190" transform="rotate(90 206 190)">동쪽 울타리 E-1</text>
  <text class="lbl dim" x="206" y="330" transform="rotate(90 206 330)">E-2</text>
  <text class="lbl dim" x="14" y="190" transform="rotate(-90 14 190)">서쪽 울타리 W-1</text>
  <g class="scale"><rect x="28" y="458" width="50" height="1.6"/><rect x="28" y="455" width="1" height="7"/><rect x="53" y="456" width="1" height="5"/><rect x="77" y="455" width="1" height="7"/><text x="53" y="453">500m</text></g>
  <g id="paths"></g>
  <g id="alerts"></g>
  <g id="units"></g>
</svg>`;
}
