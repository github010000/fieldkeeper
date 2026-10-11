// 화면 — 관제 대시보드(폰 세로 화면이 기준, 넓으면 지도 | 경보 목록 두 칸).
// 시계는 화면이 직접 계산한다(timeline.ts 의 simAt 을 그대로 싣는다). 서버에는 1초마다 회차와 손 경보만 묻는다.
import { mapSvg, UNITS } from "./airfield";
import { KIND, SCENARIO } from "./scenario";
import { KEYFRAMES, START_MIN, END_MIN, simAt } from "./timeline";

const CSS = `
:root{--bg:#0b1219;--panel:#121c26;--line:#223140;--ink:#e6edf3;--dim:#8a9aab;--accent:#3ea6ff;
  --grass:#11241a;--grass-dot:#1b3626;--rwy:#2c333c;--twy:#3a3f2e;--apron:#1f2832;--bldg:#3b4958;--fence:#7f9a6a;--unit:#3ea6ff}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.45 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;-webkit-text-size-adjust:100%}
body{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
header{position:sticky;top:0;z-index:5;background:rgba(11,18,25,.94);backdrop-filter:blur(6px);
  border-bottom:1px solid var(--line);padding:8px 14px 8px;display:flex;align-items:center;gap:10px}
.brand{font-weight:700;font-size:15px;letter-spacing:.2px}
.brand small{display:block;font-weight:500;font-size:11px;color:var(--dim)}
.clock{margin-left:auto;text-align:right}
.clock b{font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.clock span{display:block;font-size:11px;color:var(--dim);margin-top:2px}
.sim{display:inline-block;font-size:11px;color:#ffd27a;border:1px solid #6b5520;background:#2a2210;border-radius:999px;padding:1px 8px}
main{padding:10px 12px 24px;max-width:1180px;margin:0 auto}
.mapbox{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:6px}
.mapbox .sim{position:absolute;left:10px;top:10px}
svg.map{display:block;width:100%;height:auto;max-height:56vh}
.fence{fill:none;stroke:var(--fence);stroke-width:1.4;stroke-dasharray:4 3}
.rwy{fill:var(--rwy)} .rwy-mark rect{fill:#dfe6ee;opacity:.75}
.rwy-no{fill:#dfe6ee;font:700 9px sans-serif;text-anchor:middle}
.twy rect{fill:var(--twy)} .apron{fill:var(--apron)} .bldg{fill:var(--bldg)}
.base{fill:none;stroke:#3a5a7a;stroke-dasharray:3 2}
.appr circle{fill:#e8c35a;opacity:.8}
.lbl{fill:var(--dim);font:500 8px sans-serif;text-anchor:middle}
.lbl.dim{opacity:.75} .lbl.start{text-anchor:start}
.radar circle{fill:#9fd3ff;stroke:none}
.radar .sweep{fill:none;stroke:#9fd3ff;stroke-width:1;transform-origin:244px 118px;animation:ring 2.4s ease-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.9}to{transform:scale(5);opacity:0}}
.mk .pulse{fill:none;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:ring 1.4s ease-out infinite}
.mk text{fill:#111;font:800 9px sans-serif;text-anchor:middle;dominant-baseline:central}
.mk.old{opacity:.55} .mk.old .pulse{display:none}
.unit rect,.unit path{fill:var(--unit);stroke:#0b1219;stroke-width:1}
.unit text{fill:#fff;font:700 7px sans-serif;text-anchor:middle;dominant-baseline:central}
.bar{display:flex;gap:8px;margin:10px 0}
button{font:inherit;border:0;border-radius:12px;padding:13px 14px;font-weight:700;color:var(--ink);background:#1c2a38;cursor:pointer}
button.primary{background:var(--accent);color:#04121f;flex:1}
button:active{transform:translateY(1px)}
.kinds{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:-2px 0 10px}
.kinds button{display:flex;align-items:center;gap:8px;font-weight:600}
.dot{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;color:#111;font:800 11px sans-serif;flex:none}
h2{font-size:14px;margin:6px 2px 8px;color:var(--dim);font-weight:600}
.list{display:flex;flex-direction:column;gap:8px}
.card{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:12px;padding:10px 12px}
.card.new{animation:flash 1.2s ease-out 2}
@keyframes flash{50%{background:#213244}}
.card .top{display:flex;align-items:center;gap:8px}
.card .top b{font-size:15px}
.card .top time{margin-left:auto;font:600 14px ui-monospace,Menlo,monospace;color:var(--dim)}
.card .zone{margin-top:4px;font-weight:600}
.card .meta{font-size:13px;color:var(--dim)}
.empty{color:var(--dim);font-size:14px;padding:14px;text-align:center;border:1px dashed var(--line);border-radius:12px}
.toast{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9;background:#2a1414;
  border:1px solid var(--c);border-radius:14px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.5);
  display:flex;gap:10px;align-items:center;transition:transform .25s,opacity .25s}
.toast.off{transform:translateY(12px);opacity:0;pointer-events:none}
.toast b{display:block}
.toast .sub{font-size:13px;color:#e8c9c9}
.msg{font-size:13px;color:#ffb4b4;min-height:0;margin:0 2px 8px}
.msg.ro{color:var(--dim);margin:10px 2px}
@media (min-width:860px){
  main{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px;align-items:start}
  .side{position:sticky;top:70px}
  svg.map{max-height:calc(100vh - 110px)}
  .toast{left:auto;width:380px}
}
`;

// 새 경보 알림(toast)은 화면 아래 — 위에 두면 08:57 북쪽 접근로 새 떼를 가린다
// 화면 쪽 스크립트 — 서버 값은 회차(started_at)와 손 경보뿐, 나머지는 실린 상수로 계산한다
const JS = `
const $=(s)=>document.querySelector(s);
const NS="http://www.w3.org/2000/svg";
let run=null, offset=0, manual=[], seen=null, shownKey="", busy=false, lock=null, locked=false;
// 단추 잠금 — 열쇠 링크(?k=…)로 한 번 열면 이 폰에 기억하고 주소창에서는 지운다. 열쇠 없는 폰은 보기만 한다(진짜 문지기는 서버)
let key="";
try{const q=new URLSearchParams(location.search).get("k");if(q){key=q;history.replaceState(null,"",location.pathname)}}catch(e){}
try{if(key)localStorage.setItem("fk_key",key);else key=localStorage.getItem("fk_key")||""}catch(e){}
const H=(extra)=>Object.assign({"x-demo-key":key},extra||{});
const NOKEY="열쇠가 맞지 않습니다 — 열쇠 링크로 다시 열어 주세요";
const hhmm=(m)=>{m=Math.floor(m);return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")};
function now(){return Date.now()+offset}
function simNow(){return run?simAt(KF,(now()-run.started_at)/1000):START}
function visible(sim){
  if(!run) return [];
  const s=SC.filter(a=>a.min<=sim).map(a=>({...a,t:a.min,src:"시나리오"}));
  const m=manual.map(a=>({...a,t:a.sim_min,src:"손 경보"}));
  return s.concat(m).sort((a,b)=>b.t-a.t);
}
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function drawUnits(){
  const g=$("#units");g.innerHTML="";
  for(const u of UNITS){
    const t=el("g",{class:"unit",transform:"translate("+u.x+" "+u.y+")"},g);
    if(u.type==="drone") el("path",{d:"M0,-8 L8,6 L-8,6 Z"},t);
    else el("rect",{x:-7,y:-7,width:14,height:14,rx:3},t);
    el("text",{y:u.type==="drone"?1.5:0},t).textContent=u.id;
  }
}
function drawAlerts(list){
  const g=$("#alerts");g.innerHTML="";
  [...list].reverse().forEach((a,i,arr)=>{
    const k=KIND[a.kind], latest=i===arr.length-1;
    const t=el("g",{class:"mk"+(latest?"":" old"),transform:"translate("+a.x+" "+a.y+")"},g);
    el("circle",{class:"pulse",r:9,stroke:k.color},t);
    el("circle",{r:9,fill:k.color},t);
    el("text",{},t).textContent=k.mark;
  });
  const box=$("#list");
  if(!list.length){box.innerHTML='<div class="empty">'+(run?"아직 경보가 없습니다":"「시연 시작」을 누르면 04:00 부터 시계가 돕니다")+'</div>';return}
  box.innerHTML="";
  for(const a of list){
    const k=KIND[a.kind], c=document.createElement("div");
    c.className="card"+(seen&&!seen.has(a.id)?" new":"");c.style.setProperty("--c",k.color);
    c.innerHTML='<div class="top"><span class="dot" style="background:'+k.color+'">'+k.mark+'</span><b></b><time>'+hhmm(a.t)+'</time></div><div class="zone"></div><div class="meta"></div>';
    c.querySelector("b").textContent=k.ko;
    c.querySelector(".zone").textContent=a.zone;
    c.querySelector(".meta").textContent=(a.note?a.note+" · ":"")+a.sensor;
    box.appendChild(c);
  }
}
let toastTimer=0;
function toast(a){
  const k=KIND[a.kind], t=$("#toast");
  t.style.setProperty("--c",k.color);
  t.querySelector(".dot").style.background=k.color;t.querySelector(".dot").textContent=k.mark;
  t.querySelector("b").textContent=hhmm(a.t)+" "+k.ko;
  t.querySelector(".sub").textContent=a.zone+" · "+a.sensor;
  t.classList.remove("off");
  if(navigator.vibrate) navigator.vibrate([180,80,180]);
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("off"),3500);
}
function tick(){
  const sim=simNow();
  $("#clock").textContent=hhmm(sim);
  $("#phase").textContent=!run?"대기":(sim>=END?"시연 끝 · 손 경보 가능":"시연 중");
  $("#start").textContent=run?"처음부터 다시":"▶ 시연 시작";
  const list=visible(sim), key=(run?run.id:"")+"|"+list.map(a=>a.id).join(",");
  if(key===shownKey) return;
  shownKey=key;
  if(seen){const fresh=list.filter(a=>!seen.has(a.id));if(fresh.length) toast(fresh[0])}
  drawAlerts(list);
  seen=new Set(list.map(a=>a.id));
}
async function poll(){
  try{
    const t0=Date.now(), r=await fetch("/api/state",{cache:"no-store"}), d=await r.json(), t1=Date.now();
    offset=d.server_now-(t0+t1)/2;
    // 다른 폰이 회차를 새로 시작했으면 그 뒤 경보는 모두 「새 경보」로 알린다(처음 열 때는 seen=null 이라 알리지 않는다)
    if(seen&&(run&&run.id)!==(d.run&&d.run.id)){seen=new Set();shownKey=""}
    run=d.run;manual=d.manual;locked=d.locked;
    const ro=locked&&!key;$("#bar").hidden=ro;$("#viewonly").hidden=!ro;if(ro)$("#kinds").hidden=true;
  }catch(e){}
}
async function wake(){try{if(navigator.wakeLock&&!lock){lock=await navigator.wakeLock.request("screen");lock.addEventListener("release",()=>lock=null)}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&run)wake()});
function say(s){$("#msg").textContent=s||""}
$("#start").onclick=async()=>{
  if(busy) return;
  if(run&&simNow()<END&&!confirm("시연을 처음(04:00)부터 다시 시작할까요?")) return;
  busy=true;say("");wake();
  try{const r=await fetch("/api/demo/start",{method:"POST",headers:H()});if(r.status===403){say(NOKEY);busy=false;return}if(!r.ok)throw 0;seen=new Set();shownKey="";await poll();tick()}
  catch(e){say("시작하지 못했습니다 — 연결을 확인해 주세요")}
  busy=false;
};
$("#manual").onclick=()=>{$("#kinds").hidden=!$("#kinds").hidden};
document.querySelectorAll("#kinds button").forEach(b=>b.onclick=async()=>{
  say("");
  try{
    const r=await fetch("/api/alerts",{method:"POST",headers:H({"content-type":"application/json"}),body:JSON.stringify({kind:b.dataset.kind})});
    const d=await r.json();
    if(!r.ok){say(r.status===403?NOKEY:(d.error||"경보를 띄우지 못했습니다"));return}
    $("#kinds").hidden=true;await poll();tick();
  }catch(e){say("경보를 띄우지 못했습니다 — 연결을 확인해 주세요")}
});
drawUnits();
poll().then(()=>{tick();setInterval(tick,250);setInterval(poll,1000)});
`;

export function dashboardPage(): string {
  const kindButtons = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => `<button data-kind="${k}"><span class="dot" style="background:${KIND[k].color}">${KIND[k].mark}</span>${KIND[k].ko}</button>`)
    .join("");
  const data = `const KF=${JSON.stringify(KEYFRAMES)},SC=${JSON.stringify(SCENARIO)},KIND=${JSON.stringify(KIND)},` +
    `UNITS=${JSON.stringify(UNITS)},START=${START_MIN},END=${END_MIN};\n${simAt.toString()}\n`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1219">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="필드키퍼">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<title>필드키퍼 · 관제</title><style>${CSS}</style></head><body>
<header>
  <div class="brand">필드키퍼<small>가상 지방공항 · 관제</small></div>
  <div class="clock"><b id="clock">04:00</b><span id="phase">대기</span></div>
</header>
<main>
  <section class="mapbox">${mapSvg()}<span class="sim">센서·로봇 = 시뮬레이션</span></section>
  <section class="side">
    <p id="viewonly" class="msg ro" hidden>보기 전용 — 단추는 열쇠 링크로 연 폰에서만 눌립니다</p>
    <div id="bar" class="bar"><button id="start" class="primary">▶ 시연 시작</button><button id="manual">+ 경보 발생</button></div>
    <div id="kinds" class="kinds" hidden>${kindButtons}</div>
    <p id="msg" class="msg"></p>
    <h2>경보 — 최근 것이 위</h2>
    <div id="list" class="list"></div>
  </section>
</main>
<div id="toast" class="toast off" role="status" aria-live="assertive"><span class="dot"></span><div><b></b><span class="sub"></span></div></div>
<script>${data}${JS}</script>
</body></html>`;
}

// 홈 화면 아이콘 — 활주로 한 줄. (아이폰 홈 화면은 PNG 만 쓴다 — Pass 4 에서 PNG 를 더한다)
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b1219"/>` +
  `<rect x="26" y="8" width="12" height="48" rx="2" fill="#3a4350"/><rect x="31" y="14" width="2" height="6" fill="#fff"/>` +
  `<rect x="31" y="26" width="2" height="6" fill="#fff"/><rect x="31" y="38" width="2" height="6" fill="#fff"/>` +
  `<circle cx="48" cy="18" r="6" fill="#3ea6ff"/></svg>`;
