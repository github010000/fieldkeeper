// 화면 — 한 페이지, 역할 둘(이 폰에 기억): 관제(장면 진행 · 지도 · 기록) / 현장(승인 · 보류).
// 시계는 화면이 직접 계산한다(timeline.ts 의 simClock 을 그대로 싣는다). 서버에는 1초마다 회차 · 사건 기록 · 자유 경보를 묻는다.
// 지도는 장면이 진행되면 그 현장으로 다가간다(viewBox 를 옮긴다) — 폰 세로 화면에서 2.8km 활주로 전체는 너무 작다.
import { mapSvg, UNITS, VIEW } from "./airfield";
import { KIND, SCENES } from "./scenario";
import { simClock } from "./timeline";

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
.mapbox{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;height:50vh;min-height:300px}
body.field .mapbox{height:30vh;min-height:200px}
.mapbox .sim{position:absolute;left:8px;top:8px;z-index:1}
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
.north path{fill:var(--dim)} .north text,.scale text{fill:var(--dim);font:700 5px sans-serif;text-anchor:middle} .scale rect{fill:var(--dim)}
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
@media (min-width:860px){
  main{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
  .mapbox,body.field .mapbox{height:calc(100vh - 100px);position:sticky;top:76px}
  .toast{left:auto;width:380px}
  .sheet{left:auto;width:420px;right:16px;bottom:16px;border-radius:18px;border:1px solid var(--line)}
}
`;

// 화면 쪽 스크립트 — 서버 값은 회차 · 사건 기록 · 자유 경보뿐, 나머지는 실린 상수로 계산한다
const JS = `
const $=(s)=>document.querySelector(s);
const NS="http://www.w3.org/2000/svg";
let run=null, offset=0, inc=[], manual=[], locked=false, busy=false, wl=null, seen=null, shown="", cam=null;
// 열쇠 링크(?k=…)와 역할(?role=ops|field)은 한 번 열면 이 폰에 기억하고 주소창에서는 지운다
let key="", role="ops";
try{const q=new URLSearchParams(location.search);
  if(q.get("k"))key=q.get("k");const r=q.get("role");if(r==="ops"||r==="field")role=r;
  if(q.toString())history.replaceState(null,"",location.pathname)}catch(e){}
try{if(key)localStorage.setItem("fk_key",key);else key=localStorage.getItem("fk_key")||"";
  if(new URLSearchParams(location.search).get("role"))localStorage.setItem("fk_role",role);
  else role=localStorage.getItem("fk_role")||role}catch(e){}
const H=(x)=>Object.assign({"x-demo-key":key},x||{});
const NOKEY="열쇠가 맞지 않습니다 — 열쇠 링크로 다시 열어 주세요";
const hhmm=(m)=>{m=Math.floor(m);return String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0")};
const dur=(m)=>{const s=Math.round(m*60);return s<60?s+"초":Math.floor(s/60)+"분"+(s%60?" "+(s%60)+"초":"")};
const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const now=()=>Date.now()+offset;
const sim=()=>simClock(run,now(),SCI);
const el=()=>run?(now()-run.phase_at)/1000:0;
const mv=(t)=>t>0?6:1;
const canAct=()=>!locked||!!key;
function stage(){
  if(!run||run.phase==="idle")return "idle";
  const sc=SCN[run.scene-1];
  if(run.phase==="alert")return el()<3?"travel":"decide";
  if(run.phase==="dispatch")return el()<mv(sc.travelMin)?"moving":"done";
  return run.phase;
}
const scene=()=>run&&run.scene>=1&&run.scene<=SCN.length?SCN[run.scene-1]:null;
const incOf=(n)=>inc.find((x)=>x.scene===n);

// ── 지도 ──
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
  if(sc&&(st==="moving"||st==="done"))for(const id in sc.paths){
    pos[id]=along(sc.paths[id],st==="done"?1:el()/mv(sc.travelMin));
  }
  return pos;
}
function drawUnits(){
  const g=$("#units");g.innerHTML="";const pos=unitPos();
  for(const u of UNITS){
    const [x,y]=pos[u.id],t=svgEl("g",{class:"unit",transform:"translate("+x.toFixed(1)+" "+y.toFixed(1)+")"},g);
    if(u.type==="drone")svgEl("path",{d:"M0,-5.5 L5.5,4 L-5.5,4 Z"},t);else svgEl("rect",{x:-5,y:-5,width:10,height:10,rx:2},t);
    svgEl("text",{y:u.type==="drone"?1:0},t).textContent=u.id;
  }
}
function markers(){
  const out=[],st=stage();
  if(run)for(let n=1;n<=Math.min(run.scene,SCN.length);n++){
    if(n===run.scene&&st==="travel")continue;
    const s=SCN[n-1];out.push({id:s.id,kind:s.kind,x:s.x,y:s.y,t:s.min,zone:s.zone,sensor:s.sensor,live:n===run.scene&&(st==="decide"||st==="hold"||st==="moving")});
  }
  for(const a of manual)out.push({id:a.id,kind:a.kind,x:a.x,y:a.y,t:a.sim_min,zone:a.zone,sensor:a.sensor,live:false,free:true});
  return out;
}
function drawMap(){
  const g=$("#alerts");g.innerHTML="";
  for(const a of markers()){
    const k=KIND[a.kind],t=svgEl("g",{class:"mk"+(a.live?"":" old"),transform:"translate("+a.x+" "+a.y+")"},g);
    svgEl("circle",{class:"pulse",r:7,stroke:k.color},t);svgEl("circle",{r:7,fill:k.color},t);
    svgEl("text",{},t).textContent=k.mark;
  }
  const p=$("#paths");p.innerHTML="";const sc=scene(),st=stage();
  if(sc&&(st==="moving"||st==="done"))for(const id in sc.paths)svgEl("polyline",{class:"route",points:sc.paths[id].map((q)=>q.join(",")).join(" ")},p);
}
// 카메라 — 장면 중엔 경보 지점과 장비 경로가 다 보이도록 다가가고, 그 밖엔 전체
function camTarget(box){
  const sc=scene(),st=stage();let pts=null;
  if(sc&&st!=="travel"&&st!=="idle"){pts=[[sc.x,sc.y]];for(const u of UNITS)if(sc.paths[u.id])pts.push(...sc.paths[u.id]);
    if(!Object.keys(sc.paths).length)pts.push([sc.x+60,sc.y-60],[sc.x+10,sc.y-120])}
  let x0=0,y0=0,x1=VW,y1=VH;
  if(pts){x0=Math.min(...pts.map(q=>q[0]))-22;x1=Math.max(...pts.map(q=>q[0]))+22;y0=Math.min(...pts.map(q=>q[1]))-22;y1=Math.max(...pts.map(q=>q[1]))+22}
  let w=x1-x0,h=y1-y0;const ar=box.clientWidth/Math.max(1,box.clientHeight);
  if(w/h<ar){const nw=h*ar;x0-=(nw-w)/2;w=nw}else{const nh=w/ar;y0-=(nh-h)/2;h=nh}
  return [x0,y0,w,h];
}
function moveCam(){
  const box=$(".mapbox"),t=camTarget(box);
  if(!cam)cam=t.slice();else for(let i=0;i<4;i++)cam[i]+=(t[i]-cam[i])*0.12;
  $("svg.map").setAttribute("viewBox",cam.map((v)=>v.toFixed(1)).join(" "));
}

// ── 카드 ──
function flightLine(f){
  if(!f)return "";
  return '<span class="flight'+(f.ok?"":" fail")+'"><i>실제 운항</i>'+esc(f.text)+'</span>';
}
function sceneCard(){
  const st=stage(),sc=scene();
  if(st==="idle")return '<div class="card"><h3>시연 준비</h3><div class="meta">24시간 비행장 — 밤 04:20 침입부터 낮 12:53 드론까지 네 장면. 관제 폰에서 장면을 넘기고, 현장 폰이 승인한다.</div></div>';
  if(st==="summary")return summaryCard();
  const k=KIND[sc.kind],i=incOf(run.scene)||{};
  if(st==="travel")return '<div class="card" style="--c:'+k.color+'"><h3>'+hhmm(sc.min)+' 으로 이동 중…</h3></div>';
  let h='<div class="card" style="--c:'+k.color+'"><h3><span class="dot" style="background:'+k.color+'">'+k.mark+'</span>'+esc(k.ko)+'<time>'+hhmm(sc.min)+'</time></h3>'+
    '<div class="zone">'+esc(sc.zone)+'</div><div class="meta">'+esc(sc.note)+' · '+esc(sc.sensor)+'</div>'+
    '<div class="box today"><b>오늘</b>'+esc(sc.today)+'</div>';
  if(st==="decide")h+='<div class="box fk"><b>필드키퍼 추천</b>'+esc(sc.plan)+flightLine(i.flight)+'</div><div class="status">현장 승인 대기 중 — 사람이 결정한다</div>';
  else if(st==="hold")h+='<div class="box fk"><b>사람의 결정 · 보류</b>'+esc(sc.held)+flightLine(i.flight)+'</div>';
  else if(st==="moving")h+='<div class="box fk"><b>승인 · 출동 중</b>'+esc(sc.plan)+flightLine(i.flight)+'</div><div class="status">도착 예정 '+hhmm(i.arrive_sim||sim())+'</div>';
  else if(st==="done")h+='<div class="box done"><b>결과</b>'+esc(sc.result)+flightLine(i.flight)+'</div>'+
    '<div class="status ok">경보 → 승인 '+dur(i.decided_sim-i.alert_sim)+(sc.travelMin>0?' · 승인 → 도착 '+dur(i.arrive_sim-i.decided_sim):' · 즉시 공유')+'</div>';
  return h+'</div>';
}
function askCard(){
  const sc=scene(),k=KIND[sc.kind],i=incOf(run.scene)||{};
  return '<div class="card ask" style="--c:'+k.color+'"><h3><span class="dot" style="background:'+k.color+'">'+k.mark+'</span>'+esc(k.ko)+'<time>'+hhmm(sc.min)+'</time></h3>'+
    '<div class="zone">'+esc(sc.zone)+'</div><div class="meta">'+esc(sc.note)+'</div>'+
    '<div class="box fk"><b>필드키퍼 추천</b>'+esc(sc.plan)+flightLine(i.flight)+'</div>'+
    (canAct()?'<div class="decide"><button class="approve" data-d="approve">'+esc(sc.approveLabel)+'</button><button data-d="hold">보류</button></div>':'<p class="ro">보기 전용 — 결정은 열쇠 링크로 연 폰에서만</p>')+'</div>';
}
function summaryCard(){
  const sm=(run&&run.summary)||{};
  const rows=inc.map((i)=>{const s=SCN[i.scene-1],k=KIND[s.kind];
    const d=i.decision==="approve"?"승인":i.decision==="hold"?"보류":"결정 없음";
    const t1=i.decided_sim!=null?"경보→결정 "+dur(i.decided_sim-i.alert_sim):"";
    const t2=i.decision==="approve"?(s.travelMin>0?" · 결정→도착 "+dur(i.arrive_sim-i.decided_sim):" · 즉시 공유"):"";
    return '<div class="rec"><div class="t"><time>'+hhmm(s.min)+'</time><span class="dot" style="background:'+k.color+';width:18px;height:18px;font-size:10px">'+k.mark+'</span>'+esc(k.ko)+'<em>'+d+'</em></div>'+
      '<div class="d">'+t1+t2+'</div><div class="o">오늘: '+esc(s.todayShort)+'</div></div>'}).join("");
  const birds=inc.filter((i)=>SCN[i.scene-1].kind==="bird");
  const mv=sm.movements;
  return '<div class="card" style="--c:var(--ok)"><h3>분기 말 — 기록이 남았다</h3>'+
    '<div class="meta">모든 경보 · 사람의 결정 · 도착이 자동으로 쌓였다. 고시가 쓰는 지표로 바로 답한다.</div>'+
    rows+
    '<div class="box done"><b>조류충돌발생률 (운항 1만 회당 충돌 · 고시 정의)</b>'+
    (mv!=null?'오늘 실제 운항 '+mv+'회 · 조류 경보 '+birds.length+'건 · 충돌 0건 → <b style="display:inline;font-size:15px;color:var(--ok)">0.0</b>':'오늘 운항 횟수 조회 실패 — 발생률은 계산하지 않는다')+
    '<span class="flight fail">충돌 0건은 이 시연(시뮬레이션)의 결과다</span></div>'+
    '<div class="status ok">사람을 늘리지 않아도 안전을 숫자로 보인다</div></div>';
}
function stepBar(){
  const n=run?run.scene:0;
  return SCN.map((s,i)=>'<span class="'+(n===i+1?"on":n>i+1?"past":"")+'">'+(i+1)+' '+hhmm(s.min)+' '+KIND[s.kind].ko.replace(/\\(.*\\)/,"")+'</span>').join("")+
    '<span class="'+(n>SCN.length?"on":"")+'">분기 말</span>';
}
function nextLabel(){
  const st=stage(),n=run?run.scene:0;
  if(st==="idle")return ["▶ 첫 장면 (04:20 울타리 침입)",true];
  if(st==="travel")return ["이동 중…",false];
  if(st==="decide")return ["현장 결정 대기 중",false];
  if(st==="moving")return ["출동 중…",false];
  if(st==="summary")return ["",false];
  if(n>=SCN.length)return ["분기 말 기록 보기 ▶",true];
  const s=SCN[n];return ["다음 장면 ▶ "+hhmm(s.min)+" "+KIND[s.kind].ko,true];
}
function render(){
  const st=stage(),field=role==="field";
  document.body.classList.toggle("field",field);
  $("#role").textContent=(field?"현장":"관제")+" · 가상 지방공항";
  $("#steps").innerHTML=stepBar();
  let h="";
  if(field){
    if(st==="decide")h=askCard();
    else if(st==="idle"||st==="travel")h='<div class="card"><h3>현장 대기</h3><div class="meta">관제가 장면을 넘기면 여기에 승인 요청이 뜬다.</div></div>';
    else h=sceneCard();
  }else h=sceneCard();
  $("#cards").innerHTML=h;
  const [lbl,on]=nextLabel(),nb=$("#next");
  nb.hidden=field||st==="summary"||!canAct();nb.textContent=lbl;nb.disabled=!on||busy;
  $("#viewonly").hidden=canAct();
  document.querySelectorAll(".decide button").forEach((b)=>b.onclick=()=>decide(b.dataset.d));
  drawMap();
}
// ── 알림 ──
let toastTimer=0;
function toast(a){
  const k=KIND[a.kind],t=$("#toast");
  t.style.setProperty("--c",k.color);t.querySelector(".dot").style.background=k.color;t.querySelector(".dot").textContent=k.mark;
  t.querySelector("b").textContent=hhmm(a.t)+" "+k.ko+(a.free?" (자유 경보)":"");t.querySelector(".sub").textContent=a.zone+" · "+a.sensor;
  t.classList.remove("off");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add("off"),3500);
}
function tick(){
  $("#clock").textContent=hhmm(sim());
  const st=stage(),key2=[run&&run.id,run&&run.scene,st,role,locked,!!key,busy,inc.map((i)=>i.decision+(i.flight?1:0)).join(),manual.length,run&&run.summary?1:0].join("|");
  if(key2!==shown){shown=key2;render();
    const ms=markers().filter((m)=>m.live||m.free),ids=new Set(markers().map((m)=>m.id));
    if(seen){const fresh=ms.filter((m)=>!seen.has(m.id));if(fresh.length){toast(fresh[0]);if(navigator.vibrate)navigator.vibrate(role==="field"?[250,100,250,100,250]:[150])}}
    seen=ids}
  drawUnits();moveCam();
}
async function poll(){
  try{const t0=Date.now(),r=await fetch("/api/state",{cache:"no-store"}),d=await r.json(),t1=Date.now();
    offset=d.server_now-(t0+t1)/2;
    if(seen&&(run&&run.id)!==(d.run&&d.run.id))seen=new Set();
    run=d.run;inc=d.incidents;manual=d.manual;locked=d.locked}catch(e){}
}
function say(s){$("#msg").textContent=s||""}
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
$("#next").onclick=()=>{wake();post("/api/scene/next")};
function decide(d){wake();if(navigator.vibrate)navigator.vibrate(40);post("/api/decide",{decision:d})}
// ── 메뉴 ──
function openSheet(on){$("#sheet").hidden=!on;$("#sheet-bg").hidden=!on;disarm();
  document.querySelectorAll("[data-role]").forEach((b)=>b.classList.toggle("on",b.dataset.role===role));
  $("#act").hidden=!canAct()}
$("#menu").onclick=()=>openSheet(true);$("#sheet-bg").onclick=()=>openSheet(false);$("#close").onclick=()=>openSheet(false);
document.querySelectorAll("[data-role]").forEach((b)=>b.onclick=()=>{role=b.dataset.role;try{localStorage.setItem("fk_role",role)}catch(e){}shown="";openSheet(false);tick()});
let armT=0;function disarm(){const b=$("#reset");b.classList.remove("arm");b.textContent="처음으로 (04:00)";clearTimeout(armT)}
$("#reset").onclick=async()=>{const b=$("#reset");
  if(!b.classList.contains("arm")){b.classList.add("arm");b.textContent="한 번 더 누르면 처음으로 돌아갑니다";armT=setTimeout(disarm,4000);return}
  openSheet(false);seen=new Set();cam=null;await post("/api/demo/start")};
document.querySelectorAll("[data-kind]").forEach((b)=>b.onclick=async()=>{openSheet(false);await post("/api/alerts",{kind:b.dataset.kind})});
poll().then(()=>{tick();setInterval(tick,100);setInterval(poll,1000)});
`;

export function dashboardPage(): string {
  const kindButtons = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => `<button data-kind="${k}"><span class="dot" style="background:${KIND[k].color}">${KIND[k].mark}</span>${KIND[k].ko}</button>`).join("");
  const data = `const SCN=${JSON.stringify(SCENES)},SCI=${JSON.stringify(SCENES.map((s) => [s.min, s.travelMin]))},` +
    `KIND=${JSON.stringify(KIND)},UNITS=${JSON.stringify(UNITS)},VW=${VIEW.w},VH=${VIEW.h};\n${simClock.toString()}\n`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1219">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="필드키퍼">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<title>필드키퍼</title><style>${CSS}</style></head><body>
<header>
  <div class="brand">필드키퍼<small id="role">관제 · 가상 지방공항</small></div>
  <div class="clock"><b id="clock">04:00</b></div>
  <button id="menu" class="menu-btn" aria-label="메뉴">☰</button>
</header>
<main>
  <section class="mapbox">${mapSvg()}<span class="sim">센서·로봇 = 시뮬레이션</span></section>
  <section class="side">
    <div id="steps" class="step"></div>
    <div id="cards"></div>
    <button id="next" class="primary">▶ 첫 장면</button>
    <p id="viewonly" class="ro" hidden>보기 전용 — 장면 진행·승인은 열쇠 링크로 연 폰에서만</p>
    <p id="msg" class="msg"></p>
  </section>
</main>
<div id="toast" class="toast off" role="status" aria-live="assertive"><span class="dot"></span><div><b></b><span class="sub"></span></div></div>
<div id="sheet-bg" class="sheet-bg" hidden></div>
<div id="sheet" class="sheet" hidden>
  <h4>이 폰의 역할</h4>
  <div class="row2"><button data-role="ops">관제 — 장면 진행</button><button data-role="field">현장 — 승인</button></div>
  <div id="act">
    <h4>자유 경보 — 질문에 답할 때</h4>
    <div class="row2">${kindButtons}</div>
    <h4>처음부터</h4>
    <button id="reset" class="danger">처음으로 (04:00)</button>
  </div>
  <h4>무엇이 진짜인가</h4>
  <p class="fine">센서·로봇 = 시뮬레이션 · 운항편 = 한국공항공사 실시간 운항 데이터(실제 지방공항) · 판단·승인·기록 = 실제 동작 · 공항 배치는 가상</p>
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
