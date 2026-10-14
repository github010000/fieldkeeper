// 화면 — 역할은 주소가 정한다: /ops(= /) 관제 — 관리자(지도 · 판단 · 승인/보류 · 종결 · 기록) / /cam 로봇 카메라(방문객이 드는 폰, 단추 없음).
// 시계는 화면이 직접 계산한다(timeline.ts 의 simClock 을 그대로 싣는다). 서버에는 1초마다 회차 · 사건 기록 · 자유 경보를 묻는다.
// 지도는 폰(좁은 화면)에서만 장면 현장으로 다가간다(viewBox 를 옮긴다) — 폰 세로 화면에서 2.8km 활주로 전체는 너무 작다. 아이패드(700px↑)는 늘 전체.
import { mapSvg, UNITS, VIEW } from "./airfield";
import { KIND, SCENES } from "./scenario";
import { simClock } from "./timeline";
import { CAM_JS } from "./camview";

const CSS = `
:root{--bg:#0b1219;--panel:#121c26;--line:#223140;--ink:#e6edf3;--dim:#8a9aab;--accent:#3ea6ff;--ok:#3ecf8e;
  --grass:#11241a;--grass-dot:#1b3626;--strip:#16301f;--rwy:#2c333c;--twy:#4a4a32;--apron:#1f2832;--bldg:#3b4958;--fence:#7f9a6a;--unit:#3ea6ff}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;-webkit-text-size-adjust:100%}
body{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
header{position:sticky;top:0;z-index:5;background:rgba(11,18,25,.95);backdrop-filter:blur(6px);
  border-bottom:1px solid var(--line);padding:8px 10px 8px 14px;display:flex;align-items:center;gap:10px}
.brand{font-weight:700;font-size:15px;min-width:0}
.brand small{display:block;font-weight:500;font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clock{margin-left:auto;text-align:right}
.clock b{font:700 28px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.menu-btn{background:none;border:1px solid var(--line);border-radius:10px;color:var(--ink);font-size:20px;line-height:1;padding:8px 10px}
.sim{display:inline-block;font-size:11px;color:#ffd27a;border:1px solid #6b5520;background:#2a2210;border-radius:999px;padding:1px 8px}
main{padding:10px 12px 28px;max-width:1180px;margin:0 auto}
.mapbox{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;height:40vh;min-height:260px}
.mapbox .sim{position:absolute;left:8px;top:8px;z-index:1}
.compass{position:absolute;right:8px;top:8px;z-index:1;width:44px;height:44px;pointer-events:none}
.compass circle{fill:rgba(11,18,25,.72);stroke:#3a4b5c;stroke-width:1}
.compass .n{fill:#ff5c5c} .compass .s{fill:#8fa3b5}
.compass text{font:800 9px sans-serif;text-anchor:middle;dominant-baseline:central;fill:#c9d3dd} .compass text.tn{fill:#ff8a8a}
svg.map{display:block;width:100%;height:100%}
.strip{fill:var(--strip)}
.fence{fill:none;stroke:var(--fence);stroke-width:.9;stroke-dasharray:3 2}
.rwy{fill:var(--rwy)} .rwy-mark rect{fill:#dfe6ee;opacity:.8}
.rwy-no{fill:#dfe6ee;font:700 6px sans-serif;text-anchor:middle}
.twy rect{fill:var(--twy)} .tw{fill:#e8d27a;font:700 4.5px sans-serif;text-anchor:end} .tw.big{font-size:7px}
.apron{fill:var(--apron)} .bldg{fill:var(--bldg)}
.base{fill:none;stroke:#3a5a7a;stroke-width:.6;stroke-dasharray:2 1.5} .dock{fill:none;stroke:#3a5a7a;stroke-width:.6;stroke-dasharray:2 1.5}
.als circle,.als rect{fill:#e8c35a;opacity:.85}
.lbl{fill:var(--dim);font:500 5px sans-serif;text-anchor:middle} .lbl.dim{opacity:.8} .lbl.start{text-anchor:start} .lbl.end{text-anchor:end}
.scale text{fill:var(--dim);font:700 5px sans-serif;text-anchor:middle} .scale rect{fill:var(--dim)}
.radar circle{fill:#9fd3ff}
.radar .sweep{fill:none;stroke:#9fd3ff;stroke-width:.6;transform-box:fill-box;transform-origin:center;animation:ring 2.4s ease-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.9}to{transform:scale(5);opacity:0}}
.mk .pulse{fill:none;stroke-width:1.4;transform-box:fill-box;transform-origin:center;animation:ring2 1.4s ease-out infinite}
@keyframes ring2{from{transform:scale(1);opacity:.9}to{transform:scale(2.6);opacity:0}}
.mk text{fill:#111;font:800 6.5px sans-serif;text-anchor:middle;dominant-baseline:central}
.mk.old{opacity:.5} .mk.old .pulse{display:none}
.route{fill:none;stroke:var(--unit);stroke-width:1;stroke-dasharray:2.5 2;opacity:.85}
.unit rect,.unit path{fill:var(--unit);stroke:#0b1219;stroke-width:.6}
.unit text{fill:#fff;font:700 4.6px sans-serif;text-anchor:middle;dominant-baseline:central}
.step{display:flex;gap:6px;margin:10px 0 8px;overflow-x:auto;scrollbar-width:none} .step::-webkit-scrollbar{display:none}
.step span{flex:none;font-size:12px;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}
.step span.on{color:#04121f;background:var(--accent);border-color:var(--accent);font-weight:700}
.step span.past{color:var(--ink)}
.card{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--c,var(--line));border-radius:12px;padding:12px 13px;margin-bottom:10px}
.card h3{margin:0 0 4px;font-size:17px;display:flex;align-items:center;gap:8px}
.card h3 time{margin-left:auto;font:600 15px ui-monospace,Menlo,monospace;color:var(--dim)}
.card .zone{font-weight:600}
.card .meta{font-size:13px;color:var(--dim)}
.box{border-radius:10px;padding:9px 11px;margin-top:9px;font-size:14px}
.box b{display:block;font-size:12px;letter-spacing:.3px;margin-bottom:2px}
.box.today{background:#1a1f26;color:#c9d3dd} .box.today b{color:var(--dim)}
.box.fk{background:#0f2536;color:#d8ecff} .box.fk b{color:var(--accent)}
.box.fk b .risk{float:right;font-size:11px;font-weight:800;border-radius:999px;padding:1px 8px;color:#0b1219}
.risk.r3{background:#ff5c5c} .risk.r2{background:#ffb02e} .risk.r1{background:#8fa3b5}
.box.fk .parts{font-size:12px;color:#9fb6c9;margin:1px 0 6px} .box.fk .parts em{font-style:normal;color:#d8ecff;font-weight:700}
.box.fk .chk{margin-top:4px;font-size:13px;color:#7fe0a6} .box.fk .chk .late{color:#ff8a8a}
.box.fk .auto{margin-top:5px;font-size:13px;color:#ffd27a} .lnote{color:#ffd27a}
.status .span{display:block;font-size:13px;color:#c9d3dd;margin-bottom:2px}
.box.fk .why{margin-top:6px;padding-top:6px;border-top:1px solid #1f3b52} .box.fk .why i{font-style:normal;font-size:10.5px;color:#8fa3b5;border:1px solid #2b4a63;border-radius:999px;padding:0 6px;margin-left:6px;white-space:nowrap}
.box.done{background:#0f2a20;color:#d6f5e6} .box.done b{color:var(--ok)}
.flight{display:block;margin-top:5px;font-size:13px;color:#ffd27a}
.flight.fail{color:var(--dim)}
.flight i{font-style:normal;font-size:11px;border:1px solid #6b5520;border-radius:999px;padding:0 6px;margin-right:5px}
.status{margin-top:9px;font-size:14px;font-weight:600;color:#ffd27a}
.status.ok{color:var(--ok)}
.dot{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#111;font:800 11px sans-serif;flex:none}
button{font:inherit;border:0;border-radius:12px;padding:14px;font-weight:700;color:var(--ink);background:#1c2a38;cursor:pointer}
button:disabled{opacity:.45;cursor:default}
button.primary:disabled{position:static;box-shadow:none}
/* 다음 장면 — 발표자가 스크롤하지 않게 화면 아래에 붙인다 */
button.primary{background:var(--accent);color:#04121f;width:100%;position:sticky;bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:4;box-shadow:0 6px 24px rgba(0,0,0,.55)}
button.approve{background:var(--ok);color:#03140c}
button:active:not(:disabled){transform:translateY(1px)}
.decide{display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:12px}
.decide button{padding:18px 10px;font-size:17px}
.ask{border-left-width:6px} .ask h3{font-size:19px}
.msg{font-size:13px;color:#ffb4b4;margin:6px 2px}
.ro{color:var(--dim);font-size:13px;margin:8px 2px}
.ro.nokey{color:#ffd27a;background:#3a2a10;border:1px solid #ffd27a;border-radius:10px;padding:10px 12px;font-size:15px;font-weight:700;margin:0 0 10px}
.rec{border-top:1px solid var(--line);padding:9px 0;font-size:14px}
.rec .t{display:flex;align-items:center;gap:7px;font-weight:600}
.rec .t time{font:600 14px ui-monospace,Menlo,monospace;color:var(--dim)}
.rec .t em{margin-left:auto;font-style:normal;font-size:12px;border:1px solid var(--line);border-radius:999px;padding:0 8px}
.rec .d{font-variant-numeric:tabular-nums;margin-top:2px}
.rec .o{font-size:13px;color:var(--dim)}
.fine{font-size:12px;color:var(--dim)}
.toast{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9;background:#2a1414;
  border:1px solid var(--c);border-radius:14px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.5);
  display:flex;gap:10px;align-items:center;transition:transform .25s,opacity .25s}
.toast.off{transform:translateY(12px);opacity:0;pointer-events:none}
.toast b{display:block} .toast .sub{font-size:13px;color:#e8c9c9}
.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:20}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:21;background:#111a23;border-top:1px solid var(--line);border-radius:18px 18px 0 0;
  padding:16px 16px calc(env(safe-area-inset-bottom) + 16px);max-height:85vh;overflow:auto}
.sheet h4{margin:14px 0 8px;font-size:13px;color:var(--dim);font-weight:600}
.sheet h4:first-child{margin-top:0}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.row2 button{display:flex;align-items:center;gap:8px;font-weight:600;padding:12px}
.row2 button.on{outline:2px solid var(--accent)}
.danger{background:#3a1717;width:100%} .danger.arm{background:#b3261e;color:#fff}
.voice-btn{flex:none;border:1px solid var(--line);background:#1a2430;color:#ffd27a;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;margin-left:8px;white-space:nowrap} .voice-btn.on{color:#7fe0a6;border-color:#2b6b47}
@media (max-width:699px){.voice-btn .vl{display:none}}
.revoice{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:25;background:#ffd27a;color:#1a1200;border:0;border-radius:14px;padding:14px 22px;font-size:18px;font-weight:800;box-shadow:0 6px 24px rgba(0,0,0,.5);text-align:center}
.revoice small{display:block;font-size:12px;font-weight:600;margin-top:2px}
.newver{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:25;background:#b3261e;color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;margin:0}

/* 역할 띠 — 어느 폰이 무엇인지 늘 보이게 */
header.band.ops{border-top:4px solid var(--accent)}
header.band.cam{border-top:4px solid #ff3b30}
.recdot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff3b30;margin-right:7px;animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.2}}
.lab{display:inline-block;font-size:11px;font-weight:700;color:var(--accent);border:1px solid #23506f;border-radius:6px;padding:0 5px;margin-right:6px}
.bar{position:sticky;bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:4}
/* 잠긴 단추(기다리는 중)는 붙이지 않는다 — 카드 글자를 덮지 않게 */
.bar:has(> button:disabled){position:static}
.bar button.wide{width:100%}
.bar .decide{margin-top:0}
.bar button:not(:disabled){box-shadow:0 6px 24px rgba(0,0,0,.55)}
.bar button.approve.wide{padding:16px;font-size:17px}
.camprev{margin:10px auto 0;height:240px;aspect-ratio:3/4;max-width:100%;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#000}
.camprev svg,.camview svg{display:block;width:100%;height:100%}
body.cam main.camwrap{padding:0;max-width:none;display:block}
.camview{aspect-ratio:3/4;width:100%;max-height:calc(100dvh - 150px);margin:0 auto;background:#000}
.camline{display:flex;align-items:center;gap:8px;margin:10px 14px 0;font-weight:600}
.center{text-align:center}
.clock .date{display:block;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums;margin-bottom:2px}
.unlock{position:fixed;inset:0;z-index:30;background:rgba(5,10,15,.92);color:#fff;font-size:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-radius:0}
.unlock small{font-size:14px;color:var(--dim);font-weight:500;max-width:80%}
/* 넓은 화면(아이패드 세로 744px~) — 지도와 장면 카드를 두 칸으로 */
@media (min-width:700px){
  .camprev{height:340px}
  main{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
  .mapbox{height:calc(100vh - 100px);position:sticky;top:76px}
  .compass{width:68px;height:68px}
  body.cam .camview{max-width:520px;margin:0 auto}
  .toast{left:auto;width:380px}
  .sheet{left:auto;width:420px;right:16px;bottom:16px;border-radius:18px;border:1px solid var(--line)}
}
`;

// 화면 쪽 스크립트 — 서버 값은 회차 · 사건 기록 · 자유 경보뿐, 나머지는 실린 상수로 계산한다
const JS = `
const $=(s)=>document.querySelector(s);
const NS="http://www.w3.org/2000/svg";
let run=null, offset=0, inc=[], manual=[], locked=false, busy=false, wl=null, seen=null, shown="", cam=null;
// 열쇠 링크(?k=…)는 한 번 열면 이 폰에 기억하고 주소창에서는 지운다. 역할은 주소(/ops · /cam)가 정한다
let key="";
try{const q=new URLSearchParams(location.search);if(q.get("k"))key=q.get("k");if(q.toString())history.replaceState(null,"",location.pathname)}catch(e){}
// 열쇠는 저장 공간과 쿠키 두 곳에 둔다 — 10-12 배포 뒤 자동 새로고침에서 아이패드가 열쇠를 잃었다
// (저장 공간에 fk_key 가 없었다. 쓰기는 되는데 왜 비었는지는 못 밝혔다 — 한쪽이 비어도 다른 쪽으로 버틴다)
function keyGet(){let v="";try{v=localStorage.getItem("fk_key")||""}catch(e){}
  if(!v){const m=document.cookie.match(/(?:^|; )fk_key=([^;]*)/);if(m)try{v=decodeURIComponent(m[1])}catch(e){}}return v}
function keyPut(v){try{localStorage.setItem("fk_key",v)}catch(e){}
  try{document.cookie="fk_key="+encodeURIComponent(v)+"; Max-Age=31536000; Path=/; Secure; SameSite=Strict"}catch(e){}}
if(key)keyPut(key);else{key=keyGet();if(key)keyPut(key)}
const H=(x)=>Object.assign({"x-demo-key":key},x||{});
const NOKEY="열쇠가 맞지 않습니다 — 열쇠 링크로 다시 열어 주세요";
const hhmm=(m)=>{m=Math.floor(m);return String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0")};
const dur=(m)=>{const s=Math.round(m*60);return s<60?s+"초":Math.floor(s/60)+"분"+(s%60?" "+(s%60)+"초":"")};
const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const now=()=>Date.now()+offset;
const sim=()=>simClock(run,now(),SCI,holdNow());
// 착륙 통과 대기(분 · 실제 초) — 승인 순간 서버가 judge.holdMin 에 남긴 값(index.ts decide)
function holdNow(){if(!run||run.phase!=="dispatch")return 0;const i=inc.find((x)=>x.scene===run.scene);return (i&&i.judge&&i.judge.holdMin)||0}
function holdS(){const sc=scene();return sc&&sc.resolveMin>0?holdNow()*sc.resolveS/sc.resolveMin:0}
// 지금 착륙 통과를 기다리며 장비를 끄고 있는가 · 이 장면이 「착륙이 먼저」인가(이동 중 음파도 끈다)
function quiet(){const sc=scene(),i=run&&incOf(run.scene);return !!(sc&&i&&isLate(sc,i))}
function holding(){return stage()==="acting"&&el()-mv(scene().travelMin)<holdS()}
const el=()=>run?(now()-run.phase_at)/1000:0;
const mv=(t)=>t>0?10:1;
const canAct=()=>ROLE==="ops"&&(!locked||!!key);
// 단계 — idle · travel(빨리 감기) · decide(관리자 결정) · moving(출동) · acting(현장 조치 중) · resolved(해결 — 종결 가능) · hold · closed · summary
function stage(){
  if(!run||run.phase==="idle")return "idle";
  const sc=SCN[run.scene-1];
  // 장면 구성이 바뀐 뒤 옛 회차가 남아 그 장면이 없으면 시작 전처럼 보인다(없는 장면을 읽다 0.1초마다 멈추던 일, 10-14 배포)
  if(!sc&&(run.phase==="alert"||run.phase==="dispatch"||run.phase==="hold"||run.phase==="closed"))return "idle";
  if(run.phase==="alert")return el()<3?"travel":"decide";
  if(run.phase==="dispatch"){const a=el()-mv(sc.travelMin);return a<0?"moving":a<holdS()+sc.resolveS?"acting":"resolved"}
  return run.phase;
}
const scene=()=>run&&run.scene>=1&&run.scene<=SCN.length?SCN[run.scene-1]:null;
// 운영 날짜 — 그날의 실제 날짜(KST). 데모데이에는 2026.10.17(토). 실제 운항편도 그날 것이라 서로 맞는다
const DOW="일월화수목금토";
function kstDate(){const d=new Date(now()+9*3600e3);return d.getUTCFullYear()+"."+String(d.getUTCMonth()+1).padStart(2,"0")+"."+String(d.getUTCDate()).padStart(2,"0")+"("+DOW[d.getUTCDay()]+")"}
// ── 소리 — 폰은 사람이 한 번 누르기 전엔 소리를 못 낸다(카메라 폰은 「소리 켜기」 한 번, 관제 폰은 첫 단추) ──
let actx=null,warnEl=null,soundOn=false;const played=new Set();
function unlockAudio(){
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume();
    // 경고 방송은 로봇 카메라(/cam)만 낸다 — 관제는 방송 파일을 아예 불러오지 않는다(음소거 깨우기가 새는 기기가 있다)
    if(ROLE==="cam"){
      if(!warnEl){warnEl=new Audio("/audio/warning.mp3");warnEl.preload="auto"}
      warnEl.muted=true;const p=warnEl.play();if(p)p.then(()=>{warnEl.pause();warnEl.currentTime=0;warnEl.muted=false}).catch(()=>{warnEl.muted=false})}
    soundOn=true}catch(e){}
}
function tone(f,d,type,at,g,f2){if(!actx)return;const o=actx.createOscillator(),v=actx.createGain(),t=actx.currentTime+(at||0);
  o.type=type||"sine";o.frequency.setValueAtTime(f,t);if(f2)o.frequency.linearRampToValueAtTime(f2,t+d);
  v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime(g||0.25,t+0.02);v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(v).connect(actx.destination);o.start(t);o.stop(t+d+0.05)}
const sfx={
  alert(){tone(880,0.18,"square",0,0.18);tone(880,0.18,"square",0.28,0.18)},         // 관제 — 새 경보
  chime(){tone(660,0.35,"sine",0,0.3);tone(990,0.5,"sine",0.3,0.3)},                // 해결 — 확인음
  deter(){for(let i=0;i<8;i++)tone(2200,0.22,"square",i*0.32,0.12,4200)},            // 조류 — 음향 퇴치(시뮬레이션)
  warn(){if(warnEl){warnEl.currentTime=0;warnEl.play().catch(()=>{})}},              // 침입 — 로봇 스피커 경고 방송(한국어 · 영어)
  depart(){tone(523,0.12,"square",0,0.12);tone(784,0.18,"square",0.16,0.12)},        // 출발 신호
  caution(){tone(1400,0.08,"sine",0,0.07)},                                          // 이동 중 주의 비프
  tick(){tone(2300,0.025,"square",0,0.08)},tock(){tone(1700,0.025,"square",0,0.08)}, // 꺾기 전 깜빡이
  boom(){if(!actx)return;const t=actx.currentTime,n=actx.sampleRate*0.9,b=actx.createBuffer(1,n,actx.sampleRate),d=b.getChannelData(0);   // 폭음경보기
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);const s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();
    f.type="lowpass";f.frequency.value=900;g.gain.value=0.9;s.buffer=b;s.connect(f).connect(g).connect(actx.destination);s.start(t);tone(70,0.5,"sine",0,0.5,40)},
  servo(){tone(320,1.2,"sawtooth",0,0.035,720);tone(720,1.0,"sawtooth",1.3,0.035,380)}, // 수거 팔 펴기 · 접기
};
// 계속 나는 소리(구동음) — 로봇 모터 · 멀리 있는 침입 드론. 폰 스피커는 100Hz 아래를 거의 못 내서 배음을 섞는다
const ENG={robot:[[96,"sawtooth"],[192,"square"]],far:[[240,"sawtooth"],[247,"sawtooth"]]};
const ENG_G={robot:0.06,far:0.02},ENG_F={robot:1100,far:900};
let eng=null;
function engine(want){
  if(eng&&eng.key!==want){const e=eng,t=actx.currentTime;eng=null;
    try{e.o.forEach((o)=>{o.frequency.setValueAtTime(o.frequency.value,t);o.frequency.linearRampToValueAtTime(o.frequency.value*0.55,t+0.6)});e.g.gain.setTargetAtTime(0.0001,t,0.18);e.o.forEach((o)=>o.stop(t+0.9))}catch(x){}}
  if(!want||eng||!soundOn||!actx)return;
  const kind=want.split("|")[0],t=actx.currentTime,g=actx.createGain(),f=actx.createBiquadFilter(),lfo=actx.createOscillator(),lg=actx.createGain();
  f.type="lowpass";f.frequency.value=ENG_F[kind];g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(ENG_G[kind],t+0.4);
  lfo.frequency.value=kind==="robot"?5:23;lg.gain.value=kind==="robot"?3:6;lfo.connect(lg);
  const o=ENG[kind].map(([fr,ty])=>{const x=actx.createOscillator();x.type=ty;x.frequency.value=fr;lg.connect(x.frequency);x.connect(f);x.start(t);return x});
  lfo.start(t);o.push(lfo);f.connect(g).connect(actx.destination);eng={key:want,o,g};
}
function once(k,f){if(played.has(k))return;played.add(k);if(soundOn)f()}
// ── 음성 안내(관제) — 글자만으로는 관리자가 한눈을 팔면 놓친다(대장 10-11). 기기 안의 음성 합성(Web Speech, 한국어) · 바깥으로 나가는 것 없음.
// 아이패드는 한 번 눌러야 말한다 — 머리띠의 「🔊 음성 안내」 단추(켜기 · 끄기). 말한 문장은 window.__said 에 남긴다(시험용)
let voiceOn=false;const said=new Set();window.__said=[];
function koVoice(){try{return speechSynthesis.getVoices().find((v)=>/^ko/i.test(v.lang))||null}catch(e){return null}}
function speak(text){
  window.__said.push({sim:Math.round(sim()*60)/60,text});
  if(!voiceOn)return;
  try{const u=new SpeechSynthesisUtterance(text);u.lang="ko-KR";u.rate=1.05;const v=koVoice();if(v)u.voice=v;speechSynthesis.speak(u)}catch(e){}
}
function sayOnce(k,text){if(said.has(k))return;said.add(k);speak(text)}
// 읽던 안내를 끊는다 — 단추를 누르거나 단계가 바뀌면 앞 안내는 낡은 말이다(승인했는데 「승인을 기다립니다」를 끝까지 읽던 일, 대장 10-11)
let pressedAt=0,spokeStage="";
function hush(){window.__said.push({sim:Math.round(sim()*60)/60,text:"(끊음)"});try{speechSynthesis.cancel()}catch(e){}}
function setVoice(on){voiceOn=on;try{localStorage.setItem("fk_voice",on?"on":"off")}catch(e){}
  const b=$("#voice");if(b){b.innerHTML=on?'🔊<span class="vl"> 음성 켜짐</span>':'🔇<span class="vl"> 음성 안내 켜기</span>';b.classList.toggle("on",on)}
  if(on)speak("음성 안내를 켰습니다.");else try{speechSynthesis.cancel()}catch(e){}}
// 읽을 말 — 숫자는 직접 한글로 바꾼다(합성 음성이 「100」을 「일영영」처럼 한 자씩 읽는다, 대장 10-12). 화면 글자는 그대로
const KO_D=["","일","이","삼","사","오","육","칠","팔","구"],KO_H=["열두","한","두","세","네","다섯","여섯","일곱","여덟","아홉","열","열한"];
function koN(n){n=Math.floor(n);if(!n)return "영";let s="";for(const [v,w] of [[1000,"천"],[100,"백"],[10,"십"]]){const d=Math.floor(n/v)%10;if(d)s+=(d===1?"":KO_D[d])+w}return s+KO_D[n%10]}
// 받침이 있으면 a(을 · 이 · 은), 없으면 b
function josa(w,a,b){const c=String(w).trim().slice(-1).charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28?a:b}
const spk=(t)=>String(t).replace(/·/g,"와 ").replace(/\\s*[A-Z]-\\d+/g,"").replace(/(\\d+)\\.(\\d)\\s*km/g,(m,a,b)=>koN(+a)+" 점 "+koN(+b)+" 킬로미터")
  .replace(/로봇 (\\d)/g,(m,a)=>"로봇 "+koN(+a)+" 번").replace(/\\d+/g,(m)=>koN(+m));
const hmSpk=(m)=>{const h=Math.floor(m/60)%24,mi=Math.floor(m%60);return KO_H[h%12]+" 시 "+(mi?koN(mi)+" 분":"정각")};
const KIND_SPK={intrusion:"침입",bird:"새 떼"};
const DONE_SPK={intrusion:"침입자를 관계기관에 인계했습니다.",bird:"접근로가 정상입니다."};
const actSpk=(sc)=>spk(sc.approveLabel.replace(/\\s*승인$/,""));
function alertSpk(sc,i){
  const j=i.judge;
  let t=hmSpk(sc.min)+", "+spk(sc.zone)+"에서 "+KIND_SPK[sc.kind]+" 경보입니다.";
  if(j){t+=" 위험도 "+koN(j.score)+", "+j.grade+".";const f=/(착륙|출발)\\s*(\\d+)분 뒤/.exec(j.parts[2].v);if(f)t+=" 다음 "+f[1]+"은 "+koN(+f[2])+" 분 뒤입니다.";
    if(j.late)t+=" 착륙이 로봇보다 먼저입니다. 관제탑에 공유했습니다."}
  const a=actSpk(sc);return t+" "+a+josa(a,"을","를")+" 승인해 주세요.";
}
function announce(){
  if(ROLE!=="ops"||!run)return;
  const sc=scene(),st=stage();if(!sc)return;
  // 단계가 바뀌면 끊는다 — 다만 내가 방금 누른 단추의 확인 한 마디(2.5초)는 살린다
  const sk=run.id+"|"+run.scene+"|"+st;if(spokeStage&&sk!==spokeStage&&Date.now()-pressedAt>2500)hush();spokeStage=sk;
  const i=incOf(run.scene);if(!i)return;
  const b=run.id+"|"+run.scene,j=i.judge,r=j&&j.race;
  if(st==="decide"&&!i.decision){
    sayOnce(b+"|alert",alertSpk(sc,i));
    if(r&&!j.late){const D=r.at-sc.travelMin-r.need,s=sim();
      if(s>=D-1&&s<D)sayOnce(b+"|dl1","승인 마감 일 분 전입니다. "+hmSpk(D)+"까지 승인해야 착륙 전에 퇴치를 마칩니다.");
      if(delayLate(sc,i))sayOnce(b+"|late","승인이 늦었습니다. 착륙 전에는 퇴치할 수 없어 관제탑에 공유했습니다. 착륙 편은 관제탑이 판단합니다.")}
    const n=Math.floor((el()-3)/30);if(n>=1&&n<=3)sayOnce(b+"|rem"+n,"승인을 기다리고 있습니다.")}
  if(st==="acting"){
    {const u=spk(j?j.unitLabel:"로봇");sayOnce(b+"|arr",u+josa(u,"이","가")+" 현장에 도착했습니다."+(holding()?" 착륙이 지나갈 때까지 장비를 끄고 기다립니다.":""))}
    if(holdNow()>0&&!holding())sayOnce(b+"|pass","착륙이 지나갔습니다. 퇴치를 시작합니다.")}
  if(st==="resolved")sayOnce(b+"|res",DONE_SPK[sc.kind]+" 카메라로 확인하고 종결해 주세요.");
}
const incOf=(n)=>inc.find((x)=>x.scene===n);
${CAM_JS}
function camNow(){
  const st=stage(),sc=scene();
  const t=(st==="acting"||st==="resolved")&&sc?el()-mv(sc.travelMin)-holdS():st==="hold"?el():0;
  const frac=st==="moving"&&sc?el()/mv(sc.travelMin):0;
  const i=run&&incOf(run.scene),r=i&&i.judge&&i.judge.race;
  return camSvg(st,sc,t,frac,sim(),quiet()?{label:r?r.label:"착륙",at:r?hhmm(r.at):""}:null);
}

// ── 지도(관제) ──
function svgEl(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function along(path,f){
  if(f<=0)return path[0];if(f>=1)return path[path.length-1];
  const seg=[];let tot=0;for(let i=1;i<path.length;i++){const d=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);seg.push(d);tot+=d}
  let t=f*tot;for(let i=0;i<seg.length;i++){if(t<=seg[i]){const r=t/seg[i];return[path[i][0]+(path[i+1][0]-path[i][0])*r,path[i][1]+(path[i+1][1]-path[i][1])*r]}t-=seg[i]}
  return path[path.length-1];
}
function unitPos(){
  const st=stage(),sc=scene(),pos={};
  for(const u of UNITS)pos[u.id]=[u.x,u.y];
  // 장면 때 자리 — 지금 장면까지 정해진 homes(로봇 1 = 밤 동쪽 울타리 순찰 위치)
  if(run)for(let n=1;n<=Math.min(run.scene,SCN.length);n++){const h=SCN[n-1].homes;if(h)for(const id in h)pos[id]=h[id]}
  if(sc&&(st==="moving"||st==="acting"||st==="resolved"))for(const id in sc.paths)pos[id]=along(sc.paths[id],st==="moving"?el()/mv(sc.travelMin):1);
  return pos;
}
function drawUnits(){
  const g=$("#units");if(!g)return;g.innerHTML="";const pos=unitPos();
  for(const u of UNITS){
    const [x,y]=pos[u.id],t=svgEl("g",{class:"unit",transform:"translate("+x.toFixed(1)+" "+y.toFixed(1)+")"},g);
    svgEl("rect",{x:-5,y:-5,width:10,height:10,rx:2},t);
    svgEl("text",{y:0},t).textContent=u.id;
  }
}
function markers(){
  const out=[],st=stage();
  if(run)for(let n=1;n<=Math.min(run.scene,SCN.length);n++){
    if(n===run.scene&&st==="travel")continue;
    const s=SCN[n-1];out.push({id:s.id,kind:s.kind,x:s.x,y:s.y,t:s.min,zone:s.zone,sensor:s.sensor,live:n===run.scene&&["decide","hold","moving","acting"].includes(st)});
  }
  for(const a of manual)out.push({id:a.id,kind:a.kind,x:a.x,y:a.y,t:a.sim_min,zone:a.zone,sensor:a.sensor,live:false,free:true});
  return out;
}
function drawMap(){
  const g=$("#alerts");if(!g)return;g.innerHTML="";
  for(const a of markers()){
    const k=KIND[a.kind],t=svgEl("g",{class:"mk"+(a.live?"":" old"),transform:"translate("+a.x+" "+a.y+")"},g);
    svgEl("circle",{class:"pulse",r:7,stroke:k.color},t);svgEl("circle",{r:7,fill:k.color},t);
    svgEl("text",{},t).textContent=k.mark;
  }
  const p=$("#paths");p.innerHTML="";const sc=scene(),st=stage();
  if(sc&&["moving","acting","resolved"].includes(st))for(const id in sc.paths)svgEl("polyline",{class:"route",points:sc.paths[id].map((q)=>q.join(",")).join(" ")},p);
}
// 카메라 — 폰(좁은 화면)은 장면 중 경보 지점과 장비 경로가 다 보이도록 다가가고, 그 밖엔 전체.
// 넓은 화면(두 칸, 700px↑ = 아이패드 관제)은 늘 공항 전체 — 어디서 일이 났는지가 보여야 한다(대장 10-11)
function camTarget(box){
  const sc=scene(),st=stage();let pts=null;
  const wide=matchMedia("(min-width:700px)").matches;
  if(!wide&&sc&&!["travel","idle","closed","summary"].includes(st)){pts=[[sc.x,sc.y]];for(const u of UNITS)if(sc.paths[u.id])pts.push(...sc.paths[u.id]);
    if(!Object.keys(sc.paths).length)pts.push([sc.x+60,sc.y-60],[sc.x+10,sc.y-120])}
  let x0=0,y0=0,x1=VW,y1=VH;
  if(pts){x0=Math.min(...pts.map(q=>q[0]))-22;x1=Math.max(...pts.map(q=>q[0]))+22;y0=Math.min(...pts.map(q=>q[1]))-22;y1=Math.max(...pts.map(q=>q[1]))+22}
  let w=x1-x0,h=y1-y0;const ar=box.clientWidth/Math.max(1,box.clientHeight);
  if(w/h<ar){const nw=h*ar;x0-=(nw-w)/2;w=nw}else{const nh=w/ar;y0-=(nh-h)/2;h=nh}
  return [x0,y0,w,h];
}
function moveCam(){
  const box=$(".mapbox");if(!box)return;const t=camTarget(box);
  if(!cam)cam=t.slice();else for(let i=0;i<4;i++)cam[i]+=(t[i]-cam[i])*0.12;
  $("svg.map").setAttribute("viewBox",cam.map((v)=>v.toFixed(1)).join(" "));
}

// ── 카드(관제) ──
function flightLine(f){
  if(!f)return "";
  return '<span class="flight'+(f.ok?"":" fail")+'"><i>실제 운항</i>'+esc(f.text)+'</span>';
}
// 판단 카드 — 위험도 · 장비 · 「왜」는 서버가 경보 때 계산해 저장한 값(judge.ts). 「왜」가 AI 문장인지 규칙 문장인지 밝힌다
function judge(sc,i,title){
  const j=i.judge;
  const risk=j?'<span class="risk r'+(j.grade==="긴급"?3:j.grade==="높음"?2:1)+'">위험도 '+j.score+' · '+esc(j.grade)+'</span>':"";
  let h='<div class="box fk"><b>'+title+risk+'</b>';
  if(j)h+='<div class="parts">'+j.parts.map((p)=>esc(p.k)+' '+esc(p.v)+' <em>'+p.p+'</em>').join(" · ")+'</div>';
  h+='<div><span class="lab">상황</span>'+esc(sc.situation)+'</div>'+flightLine(i.flight);
  if(j&&j.late&&sc.autoShare)h+='<div class="auto"><span class="lab">자동</span>'+hhmm(sc.min)+' '+esc(sc.autoShare)+'</div>';
  if(delayLate(sc,i))h+='<div class="auto"><span class="lab">자동</span>'+hhmm(shareAt(sc,i))+' 승인 지연 — 착륙 전 퇴치 불가, 관제탑에 조류 정보 다시 공유('+esc(j.race.label)+' '+hhmm(j.race.at)+' · 착륙 편 판단은 관제탑)</div>';
  h+='<div style="margin-top:5px"><span class="lab">조치</span>'+esc(actText(sc,i))+'</div>';
  if(j){
    h+='<div style="margin-top:5px"><span class="lab">장비</span>'+esc(j.unitLabel)+' — '+esc(j.pick)+'</div>';
    if(j.race)h+='<div class="chk" id="race">'+raceText(sc,i)+'</div>';else if(j.check)h+='<div class="chk">'+esc(j.check)+'</div>';
    h+='<div class="why"><span class="lab">왜</span>'+esc(j.why)+'<i>'+(j.whySrc==="ai"?"AI 설명":"규칙 문장")+(delayLate(sc,i)?" · 경보 시점 판단":"")+'</i></div>';
  }
  return h+'</div>';
}
// 조치 문장 — 착륙이 로봇 퇴치보다 먼저 오는 경보면 관제탑 판단 · 다음 편 대비로(judge.ts late)
function actText(sc,i){return isLate(sc,i)&&sc.actionLate?sc.actionLate:sc.action}
// 승인이 늦어 착륙 전에 퇴치를 못 마치게 됐는가(경보 때는 여유가 있었다) — 승인 전엔 매초, 승인 뒤엔 서버가 승인 순간 기록한 값(lateByDelay)
function delayLate(sc,i){
  const j=i.judge;if(!j||!j.race||j.late||sc.kind!=="bird"||i.decision==="hold")return false;
  if(i.decision==="approve")return !!j.lateByDelay;
  return sim()+sc.travelMin+j.race.need>j.race.at;
}
function isLate(sc,i){return !!(i.judge&&(i.judge.late||delayLate(sc,i)))}
// 마감 — 이때까지 승인해야 착륙 전에 퇴치가 끝난다(넘기는 순간 관제탑에 다시 공유)
function shareAt(sc,i){const j=i.judge;return j.shareAt!=null?j.shareAt:j.race.at-sc.travelMin-j.race.need}
// 운항 경주 — 로봇 조치가 그 편보다 먼저 끝나는가. 승인 전엔 「지금 승인하면」(매초), 승인 뒤엔 실제 도착 시각으로
function raceText(sc,i){
  const r=i.judge.race,ok0=i.decision==="approve";
  const arr=ok0?i.arrive_sim:sim()+sc.travelMin,done=arr+r.need,d=r.at-done;
  const pre=ok0?"도착 "+hhmm(arr)+" · ":"지금 승인하면 "+hhmm(arr)+" 도착 · ";
  const what="퇴치";
  return d>=0?esc(pre+what+"를 마쳐도 "+r.label+" "+hhmm(r.at)+"까지 "+dur(d)+" 남는다")
    :'<span class="late">'+esc(pre+what+" 완료 "+hhmm(done)+" — "+r.label+" "+hhmm(r.at)+"보다 "+dur(-d)+" 늦다 · "+(sc.kind==="bird"?"착륙 편은 관제탑 판단":"관제탑에 알린다"))+'</span>';
}
// 경보 → 종결 한 줄 — 합계는 칸별 시간을 더하지 않고 종결 − 경보로(반올림 차이가 없게)
function span(i){return i.closed_sim==null?"":hhmm(i.alert_sim)+" 경보 → "+hhmm(i.closed_sim)+" 종결 · 모두 "+dur(i.closed_sim-i.alert_sim)}
// 현장 조치 중 한 줄 — 착륙 통과 대기면 그것부터(장비 정지), 지나면 다음 편 대비 퇴치
function actStatus(sc,i){
  if(sc.kind==="bird"&&quiet()){const r=i.judge.race;return holding()?"현장 대기 · 장비 정지 — "+r.label+" "+hhmm(r.at)+" 통과 뒤 퇴치(관제탑 지시)":"착륙 통과 · 다음 편 대비 퇴치 중"}
  return sc.waitText;
}
// 분기 말 — 조류 장면이 관제탑 판단으로 넘어간 경위
function lateNote(s,i){
  const j=i.judge;if(!j||s.kind!=="bird")return "";
  if(j.late)return '<br><span class="lnote">착륙이 먼저 → '+hhmm(s.min)+' 관제탑 즉시 공유</span>';
  if(j.lateByDelay)return '<br><span class="lnote">승인 지연 → '+hhmm(shareAt(s,i))+' 관제탑 공유, 착륙 편은 관제탑 판단</span>';
  return "";
}
function sceneCard(){
  const st=stage(),sc=scene();
  if(st==="idle")return '<div class="card"><h3>시연 준비</h3><div class="meta">24시간 비행장 — 아침 08:57 새 떼, 밤 22:00 울타리 침입. 두 장면. 센서·레이더가 잡으면 필드키퍼가 판단하고, 관리자 한 명이 승인과 종결을 쥔다. 현장 일은 북쪽 · 남쪽 거점의 순찰 로봇 두 대가 한다.</div></div>';
  if(st==="summary")return summaryCard();
  const k=KIND[sc.kind],i=incOf(run.scene)||{};
  if(st==="travel")return '<div class="card" style="--c:'+k.color+'"><h3>'+hhmm(sc.min)+' 으로 이동 중…</h3></div>';
  let h='<div class="card" style="--c:'+k.color+'"><h3><span class="dot" style="background:'+k.color+'">'+k.mark+'</span>'+esc(k.ko)+'<time>'+hhmm(sc.min)+'</time></h3>'+
    '<div class="zone">'+esc(sc.zone)+'</div><div class="meta">'+esc(sc.sensor)+'</div>';
  if(st==="decide")h+='<div class="box today"><b>실제 사례 — 과거에 이렇게 됐다</b>'+esc(sc.today)+'</div>'+judge(sc,i,"필드키퍼 판단");
  else if(st==="moving")h+=judge(sc,i,"승인 · 출동 중")+'<div class="camprev">'+camNow()+'</div><div class="status">도착 '+hhmm(i.arrive_sim||sim())+' 예정</div>';
  else if(st==="acting")h+='<div class="camprev">'+camNow()+'</div><div class="box fk"><b>현장 조치 중 — 로봇 카메라</b>'+esc(actText(sc,i))+'</div><div class="status" id="actst">'+esc(actStatus(sc,i))+'</div>';
  else if(st==="resolved")h+='<div class="camprev">'+camNow()+'</div><div class="box done"><b>해결 — 로봇 카메라로 확인</b>'+esc(sc.result)+'</div><div class="status ok">관리자가 확인하고 종결한다</div>';
  else if(st==="hold")h+='<div class="camprev">'+camNow()+'</div><div class="box fk"><b>관리자 보류</b>'+esc(sc.held)+'</div>';
  else if(st==="closed")h+='<div class="box done"><b>종결</b>'+esc(i.decision==="approve"?sc.result:sc.held)+'</div><div class="status ok"><span class="span">'+span(i)+'</span>'+times(i,sc)+'</div>';
  return h+'</div>';
}
function times(i,s){
  if(i.decided_sim==null)return "";
  if(i.decision==="hold")return "경보→보류 "+dur(i.decided_sim-i.alert_sim)+(i.closed_sim!=null?" · 보류→종결 "+dur(i.closed_sim-i.decided_sim):"");
  const arr=s.travelMin>0?" · 승인→도착 "+dur(i.arrive_sim-i.decided_sim):" · 즉시 공유";
  return "경보→승인 "+dur(i.decided_sim-i.alert_sim)+arr+(i.closed_sim!=null?" · "+(s.travelMin>0?"도착":"공유")+"→"+s.closeShort+" "+dur(i.closed_sim-i.arrive_sim):"");
}
function summaryCard(){
  const sm=(run&&run.summary)||{};
  const rows=inc.map((i)=>{const s=SCN[i.scene-1],k=KIND[s.kind];
    const d=i.decision==="approve"?"승인":i.decision==="hold"?"보류":"결정 없음";
    return '<div class="rec"><div class="t"><time>'+hhmm(s.min)+'</time><span class="dot" style="background:'+k.color+';width:18px;height:18px;font-size:10px">'+k.mark+'</span>'+esc(k.ko)+'<em>'+d+(i.closed_sim!=null?" · 종결":"")+'</em></div>'+
      '<div class="d">'+(i.closed_sim!=null?'<b>'+span(i)+'</b><br>':"")+times(i,s)+lateNote(s,i)+'</div><div class="o">실제 사례: '+esc(s.todayShort)+'</div></div>'}).join("");
  const birds=inc.filter((i)=>SCN[i.scene-1].kind==="bird");
  const mv=sm.movements;
  const sent=inc.filter((i)=>i.decision==="approve"&&SCN[i.scene-1].travelMin>0).length,shared=inc.filter((i)=>i.decision==="approve"&&SCN[i.scene-1].travelMin===0).length;
  return '<div class="card" style="--c:var(--ok)"><h3>분기 말 — 기록이 남았다</h3>'+
    '<div class="meta">경보 · 관리자의 승인 · 로봇 도착 · 종결이 자동으로 쌓였다. 고시가 쓰는 지표로 바로 답한다.</div>'+rows+
    '<div class="box done"><b>조류충돌발생률 (운항 1만 회당 충돌 · 고시 정의)</b>'+
    (mv!=null?'오늘 하루 항공기 이착륙 '+mv+'편(실제 운항 정보) · 조류 경보 '+birds.length+'건 · 충돌 0건 → <b style="display:inline;font-size:15px;color:var(--ok)">0.0</b>':'오늘 운항 횟수 조회 실패 — 발생률은 계산하지 않는다')+
    '<span class="flight fail">분기 말에는 석 달 치 이착륙이 분모가 된다 — 시연은 하루 치로 보인다. 충돌 0건은 이 시연(시뮬레이션)의 결과다</span></div>'+
    '<div class="box today"><b>로봇 출동 '+sent+'회'+(shared?' · 경보 공유 '+shared+'회':'')+'</b>출동은 모두 관리자 승인 뒤 · 종결도 관리자가 했다</div>'+
    '<div class="status ok">관리자 한 명이 처음과 끝을 쥐고, 현장은 로봇이 지킨다</div></div>';
}
function stepBar(){
  const n=run?run.scene:0;
  return SCN.map((s,i)=>'<span class="'+(n===i+1?"on":n>i+1?"past":"")+'">'+(i+1)+' '+hhmm(s.min)+' '+KIND[s.kind].ko.replace(/\\(.*\\)/,"")+'</span>').join("")+
    '<span class="'+(n>SCN.length?"on":"")+'">분기 말</span>';
}
// 아래 행동 띠 — 단계마다 관리자가 누를 단추
function actions(){
  const st=stage(),sc=scene(),n=run?run.scene:0,i=sc?incOf(run.scene)||{}:{};
  const B=(id,label,cls,dis)=>'<button data-a="'+id+'" class="'+(cls||"")+'"'+(dis||busy?" disabled":"")+'>'+label+'</button>';
  if(st==="idle")return B("next","▶ 첫 장면 (08:57 조류)","primary wide");
  if(st==="travel")return B("x","이동 중…","primary wide",true);
  if(st==="decide")return '<div class="decide">'+B("approve",esc(sc.approveLabel),"approve")+B("hold","보류","")+'</div>';
  if(st==="moving")return B("x","로봇 이동 중 — 도착 "+hhmm(i.arrive_sim||sim()),"primary wide",true);
  if(st==="acting")return B("x",esc(sc.waitText)+"…","primary wide",true);
  if(st==="resolved")return B("close",esc(sc.closeLabel),"approve wide");
  if(st==="hold")return B("close","보류 상태로 종결","approve wide");
  if(st==="closed")return n>=SCN.length?B("next","분기 말 기록 보기 ▶","primary wide"):B("next","다음 장면 ▶ "+hhmm(SCN[n].min)+" "+KIND[SCN[n].kind].ko,"primary wide");
  return "";
}
function render(){
  const st=stage();
  if(ROLE==="cam"){renderCam();return}
  $("#steps").innerHTML=stepBar();
  $("#cards").innerHTML=sceneCard();
  const bar=$("#bar");bar.innerHTML=canAct()?actions():"";bar.hidden=!canAct()||!bar.innerHTML;
  $("#viewonly").hidden=canAct();
  bar.querySelectorAll("button[data-a]").forEach((b)=>b.onclick=()=>act(b.dataset.a));
  drawMap();
}
function renderCam(){
  const sc=scene(),st=stage(),k=sc&&KIND[sc.kind];
  $("#camline").innerHTML=sc&&st!=="summary"?'<span class="dot" style="background:'+k.color+'">'+k.mark+'</span>'+esc(k.ko)+' · '+esc(sc.zone):st==="summary"?"분기 말 — 오늘의 기록":"대기 — 관제가 장면을 넘기면 출동한다";
}
// ── 알림(관제) ──
let toastTimer=0;
function toast(a){
  const k=KIND[a.kind],t=$("#toast");if(!t)return;
  t.style.setProperty("--c",k.color);t.querySelector(".dot").style.background=k.color;t.querySelector(".dot").textContent=k.mark;
  t.querySelector("b").textContent=hhmm(a.t)+" "+k.ko+(a.free?" (자유 경보)":"");t.querySelector(".sub").textContent=a.zone+" · "+a.sensor;
  t.classList.remove("off");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("off"),3500);
}
let lastStage="";
function sounds(st){
  const sc=scene();
  if(ROLE!=="cam"){engine(null);if(run&&sc&&st==="decide")once(run.id+"|"+run.scene+"|alert",sfx.alert);return}
  if(!run||!sc){engine(null);return}
  const k=run.id+"|"+run.scene,e=el(),t=e-mv(sc.travelMin)-holdS(),q=quiet();let want=null;
  if(st==="moving"&&sc.paths[sc.cam.unit]){                 // 경로가 있는 장비만
    want="robot|"+k;
    once(k+"|depart",sfx.depart);
    once(k+"|c"+Math.floor(e/1.2),sfx.caution);
    if(sc.kind==="bird"&&e>0.6&&!q)once(k+"|deter",sfx.deter);   // 조류 — 출발과 함께 음파퇴치기(착륙이 먼저면 끄고 간다)
    const P=camPose(sc,e/mv(sc.travelMin));                  // 꺾기 직전 깜빡이 — 내비 안내가 노랗게 바뀌는 때와 같다
    if(P&&P.next&&P.next.dist<14){const n=Math.floor(e*2.8);once(k+"|t"+n,n%2?sfx.tock:sfx.tick)}
  }
  if(st==="acting"&&t>0.3){if(sc.kind==="intrusion")once(k+"|warn",sfx.warn);if(sc.kind==="bird"){once(k+"|deter",sfx.deter);const n=Math.floor(t/2.6);if(t<sc.resolveS)once(k+"|boom"+n,sfx.boom)}}
  if(st==="resolved")once(k+"|chime",sfx.chime);
  engine(want);
}
function tick(){
  $("#clock").textContent=hhmm(sim());$("#date").textContent=kstDate();
  {const rc=$("#race"),sc=scene(),i=run&&incOf(run.scene);if(rc&&sc&&i&&i.judge&&i.judge.race&&i.decision!=="approve")rc.innerHTML=raceText(sc,i)}
  const st=stage(),key2=[run&&run.id,run&&run.scene,st,locked,!!key,busy,inc.map((i)=>i.decision+(i.flight?1:0)+(i.judge?1:0)+(i.closed_sim!=null?1:0)+(i.judge&&i.judge.lateByDelay?1:0)).join(),(scene()&&incOf(run.scene)?delayLate(scene(),incOf(run.scene)):0),(scene()&&stage()==="acting"?holding():0),manual.length,run&&run.summary?1:0].join("|");
  if(key2!==shown){shown=key2;render();
    // 알림 띠는 자유 경보에만 — 장면 경보는 장면 카드가 보여 준다(띠가 아래 행동 단추를 가리지 않게)
    if(ROLE==="ops"){const ms=markers().filter((m)=>m.live||m.free),ids=new Set(markers().map((m)=>m.id));
      if(seen){const fresh=ms.filter((m)=>!seen.has(m.id));if(fresh.length){if(fresh[0].free)toast(fresh[0]);if(navigator.vibrate)navigator.vibrate([150])}}
      seen=ids}
    else if(st==="moving"&&lastStage!=="moving"&&lastStage&&navigator.vibrate)navigator.vibrate([200,80,200]);
    lastStage=st}
  sounds(st);announce();
  if(ROLE==="cam"){$("#cam").innerHTML=camNow();$("#camunit").textContent=(scene()&&stage()==="hold")?"고정 센서":"로봇 카메라 "+(scene()?scene().cam.unit:"")}
  else{const pv=document.querySelector(".camprev");if(pv)pv.innerHTML=camNow();drawUnits();moveCam()}
}
// 새 버전 — 한 번만 스스로 새로고침한다(같은 지문으로 또 다르면 멈추고 알린다). 새로고침 뒤 소리 · 음성은 다시 눌러야 켜진다
function newBuild(b){
  let prev="";try{prev=sessionStorage.getItem("fk_reload")||""}catch(e){}
  if(prev===b){const m=$("#newver");if(m){m.hidden=false;m.textContent="새 버전 확인 필요 — 화면을 직접 새로고침해 주세요"}return}
  try{sessionStorage.setItem("fk_reload",b);sessionStorage.setItem("fk_new","1")}catch(e){}
  location.reload();
}
let justUpdated=false;try{justUpdated=sessionStorage.getItem("fk_new")==="1";sessionStorage.removeItem("fk_new")}catch(e){}
async function poll(){
  try{const t0=Date.now(),r=await fetch("/api/state",{cache:"no-store"}),d=await r.json(),t1=Date.now();
    offset=d.server_now-(t0+t1)/2;
    if(d.build&&BUILD&&d.build!==BUILD){newBuild(d.build);return}
    if(seen&&(run&&run.id)!==(d.run&&d.run.id))seen=new Set();
    run=d.run;inc=d.incidents;manual=d.manual;locked=d.locked}catch(e){}
}
function say(s){const m=$("#msg");if(m)m.textContent=s||""}
async function post(url,body){
  say("");busy=true;shown="";
  try{const r=await fetch(url,{method:"POST",headers:H({"content-type":"application/json"}),body:JSON.stringify(body||{})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)say(r.status===403?NOKEY:(d.error||"처리하지 못했습니다"));
    await poll();return r.ok}
  catch(e){say("연결을 확인해 주세요");return false}
  finally{busy=false;shown="";tick()}
}
async function wake(){try{if(navigator.wakeLock&&!wl){wl=await navigator.wakeLock.request("screen");wl.addEventListener("release",()=>wl=null)}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")wake()});
document.addEventListener("click",()=>{wake();if(ROLE==="ops")unlockAudio()},{once:true});
if(ROLE==="cam"&&justUpdated){const u=$("#unlock small");if(u)u.textContent="새 버전으로 바뀌었습니다 — 소리를 다시 켜 주세요"}
if(ROLE==="ops"){let was="";try{was=localStorage.getItem("fk_voice")||""}catch(e){}
  const rv=$("#revoice");if(was==="on"||justUpdated){rv.hidden=false;rv.innerHTML="🔊 음성 안내 다시 켜기"+(justUpdated?"<small>새 버전으로 바뀌었습니다</small>":"");
    rv.onclick=(e)=>{e.stopPropagation();unlockAudio();setVoice(true);rv.hidden=true}}}
if(ROLE==="ops"){const vb=$("#voice");vb.onclick=(e)=>{e.stopPropagation();unlockAudio();setVoice(!voiceOn);const rv=$("#revoice");if(rv)rv.hidden=true};
  try{speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>{}}catch(e){}}
function act(a){
  wake();if(navigator.vibrate)navigator.vibrate(30);
  if(ROLE==="ops"){hush();pressedAt=Date.now();const sc=scene();
    if(a==="approve"&&sc)speak("승인했습니다. "+actSpk(sc)+"합니다.");else if(a==="hold")speak("보류했습니다.");else if(a==="close")speak("종결했습니다.")}
  if(a==="next")post("/api/scene/next");
  else if(a==="approve"||a==="hold")post("/api/decide",{decision:a});
  else if(a==="close")post("/api/close");
}
// ── 메뉴(관제만) ──
if(ROLE==="ops"){
  const openSheet=(on)=>{$("#sheet").hidden=!on;$("#sheet-bg").hidden=!on;disarm();$("#act").hidden=!canAct()};
  $("#menu").onclick=()=>openSheet(true);$("#sheet-bg").onclick=()=>openSheet(false);$("#close").onclick=()=>openSheet(false);
  let armT=0;function disarm(){const b=$("#reset");b.classList.remove("arm");b.textContent="처음으로 (08:00)";clearTimeout(armT)}
  $("#reset").onclick=async()=>{const b=$("#reset");
    if(!b.classList.contains("arm")){b.classList.add("arm");b.textContent="한 번 더 누르면 처음으로 돌아갑니다";armT=setTimeout(disarm,4000);return}
    openSheet(false);seen=new Set();cam=null;await post("/api/demo/start")};
  document.querySelectorAll("[data-kind]").forEach((b)=>b.onclick=async()=>{openSheet(false);await post("/api/alerts",{kind:b.dataset.kind})});
}
if(ROLE==="cam"){const u=$("#unlock");u.onclick=()=>{unlockAudio();wake();u.hidden=true}}
poll().then(()=>{
  // 처음 열 때 이미 지난 소리는 다시 내지 않는다 — 아직 소리가 꺼진 채로 한 번 돌려 「냈음」으로만 표시한다(새로고침해도 경고 방송이 반복되지 않게)
  sounds(stage());
  tick();setInterval(tick,100);setInterval(poll,1000)});
`;

// 화면 코드 지문 — 배포하면 바뀐다. 열린 화면이 /api/state 의 build 와 자기 BUILD 가 다르면 스스로 새로고침한다(S23 을 새로고침 안 해 옛 코드가 돈 일, 대장 10-11)
let BUILD_ID = "";
export function pageBuild(): string {
  if (BUILD_ID) return BUILD_ID;
  const src = dashboardPage("ops", "") + dashboardPage("cam", "");
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (BUILD_ID = h.toString(36));
}
export function dashboardPage(role: "ops" | "cam", build = pageBuild()): string {
  const kindButtons = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => `<button data-kind="${k}"><span class="dot" style="background:${KIND[k].color}">${KIND[k].mark}</span>${KIND[k].ko}</button>`).join("");
  const data = `const ROLE="${role}",BUILD="${build}",SCN=${JSON.stringify(SCENES)},SCI=${JSON.stringify(SCENES.map((s) => [s.min, s.travelMin, s.resolveS, s.resolveMin]))},` +
    `KIND=${JSON.stringify(KIND)},UNITS=${JSON.stringify(UNITS)},VW=${VIEW.w},VH=${VIEW.h};\n${simClock.toString()}\n`;
  const head = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1219">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${role === "cam" ? "필드키퍼 카메라" : "필드키퍼 관제"}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<title>${role === "cam" ? "필드키퍼 · 로봇 카메라" : "필드키퍼 · 관제"}</title><style>${CSS}</style></head>`;
  if (role === "cam") {
    return `${head}<body class="cam">
<header class="band cam"><div class="brand"><span class="recdot"></span><span id="camunit">로봇 카메라</span><small>필드키퍼 · 가상 지방공항</small></div><div class="clock"><span id="date" class="date"></span><b id="clock">08:00</b></div></header>
<button id="unlock" class="unlock">🔊 소리 켜기<small>로봇 스피커 경고 방송 · 퇴치음 — 시연 전에 한 번 누르세요</small></button>
<main class="camwrap"><div id="cam" class="camview"></div><p id="camline" class="camline"></p><p class="fine center">센서·로봇·카메라 화면 = 시뮬레이션</p></main>
<script>${data}${JS}</script></body></html>`;
  }
  return `${head}<body>
<header class="band ops">
  <div class="brand">관제 — 관리자<small>필드키퍼 · 가상 지방공항</small></div>
  <div class="clock"><span id="date" class="date"></span><b id="clock">08:00</b></div>
  <button id="voice" class="voice-btn" aria-label="음성 안내">🔇<span class="vl"> 음성 안내 켜기</span></button>
  <button id="menu" class="menu-btn" aria-label="메뉴">☰</button>
</header>
<main>
  <section class="mapbox">${mapSvg()}<span class="sim">센서·로봇 = 시뮬레이션</span><svg class="compass" viewBox="0 0 56 56" aria-label="방위 — 위가 북"><circle cx="28" cy="28" r="27"/><path class="n" d="M28,9 L32,28 L24,28 Z"/><path class="s" d="M28,47 L32,28 L24,28 Z"/><text class="tn" x="28" y="5.5">북</text><text x="50.5" y="28">동</text><text x="28" y="50.5">남</text><text x="5.5" y="28">서</text></svg></section>
  <section class="side">
    <p id="viewonly" class="ro nokey" hidden>⚠️ 열쇠 없음 — 이 기기는 보기 전용입니다(장면 진행·승인·종결·처음으로 불가). 열쇠 링크로 다시 열어 주세요</p>
    <div id="steps" class="step"></div>
    <div id="cards"></div>
    <div id="bar" class="bar"></div>
    <p id="msg" class="msg"></p>
  </section>
</main>
<button id="revoice" class="revoice" hidden></button><p id="newver" class="newver" hidden></p>
<div id="toast" class="toast off" role="status" aria-live="assertive"><span class="dot"></span><div><b></b><span class="sub"></span></div></div>
<div id="sheet-bg" class="sheet-bg" hidden></div>
<div id="sheet" class="sheet" hidden>
  <div id="act">
    <h4>자유 경보 — 질문에 답할 때</h4>
    <div class="row2">${kindButtons}</div>
    <h4>처음부터</h4>
    <button id="reset" class="danger">처음으로 (08:00)</button>
  </div>
  <h4>무엇이 진짜인가</h4>
  <p class="fine">센서·로봇·카메라 화면 = 시뮬레이션 · 운항편 = 한국공항공사 실시간 운항 데이터(실제 지방공항) · 판단·승인·종결·기록 = 실제 동작 · 공항 배치는 가상</p>
  <p class="fine">로봇 카메라 화면 = 이 주소 끝을 <b>/cam</b> 으로 연 폰</p>
  <button id="close" style="width:100%;margin-top:6px">닫기</button>
</div>
<script>${data}${JS}</script>
</body></html>`;
}

// 홈 화면 아이콘 — 활주로 한 줄. (아이폰 홈 화면은 PNG 만 쓴다 — 나중에 PNG 를 더한다)
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b1219"/>` +
  `<rect x="26" y="8" width="12" height="48" rx="2" fill="#3a4350"/><rect x="31" y="14" width="2" height="6" fill="#fff"/>` +
  `<rect x="31" y="26" width="2" height="6" fill="#fff"/><rect x="31" y="38" width="2" height="6" fill="#fff"/>` +
  `<circle cx="48" cy="18" r="6" fill="#3ea6ff"/></svg>`;
