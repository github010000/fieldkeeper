// 로봇 카메라 화면 — 시뮬레이션 그림(SVG). 실제 영상이 아니다: 감시 카메라 화면처럼 단순한 모양 + 녹화 표시 + 움직임.
// 화면 쪽 스크립트에 그대로 실린다(문자열). camSvg(st, sc, t, frac, simMin) → SVG 문자열
//   장면 = 조류 둘 — 아침 날아드는 새 떼(음파 · 폭음) · 해 질 녘 초지에 앉은 새 떼(녹색 레이저, 10-15). 침입 · 이물질 · 드론은 뺐다
//   st   = idle · travel · decide · moving · acting(조치 중) · resolved(해결) · hold · closed · summary
//   t    = 도착(또는 보류) 뒤 지난 실제 초 — 조치 장면의 움직임에 쓴다. sc.resolveS 초에 해결 장면이 된다
//   날짜 = 화면 쪽 kstDate()(그날의 실제 날짜 — 데모데이에는 2026.10.17)
//   frac = 이동 진행률(0~1)
export const CAM_JS = `
// 경로 자세 — 진행률(frac)에서 지금 구간 · 향하는 방위(북 0°, 시계 방향) · 앞쪽 길의 휨(rel) · 다음 꺾임을 계산한다.
// 꺾임 앞뒤 W칸(1칸 = 10m) 동안 방위를 부드럽게 돌린다
function camPose(sc,frac){
  if(!sc||!sc.paths)return null;const u=sc.cam.unit,path=sc.paths[u];if(!path||path.length<2)return null;
  const legs=(sc.legs&&sc.legs[u])||[],nh=(a)=>((a%360)+540)%360-180,sm=(t)=>t*t*(3-2*t);
  const L=[],H=[],cum=[0];
  for(let i=1;i<path.length;i++){const dx=path[i][0]-path[i-1][0],dy=path[i][1]-path[i-1][1];L.push(Math.hypot(dx,dy));H.push((Math.atan2(dx,-dy)*180/Math.PI+360)%360);cum.push(cum[i-1]+L[i-1])}
  const tot=cum[cum.length-1],n=L.length,Wc=(c)=>Math.min(8,L[c-1]/2,L[c]/2);
  function hAt(d){d=Math.max(0,Math.min(tot,d));let i=0;while(i<n-1&&d>cum[i+1])i++;
    if(i>0&&d-cum[i]<Wc(i)){const W=Wc(i);return H[i-1]+nh(H[i]-H[i-1])*sm((d-cum[i]+W)/(2*W))}
    if(i<n-1&&cum[i+1]-d<Wc(i+1)){const W=Wc(i+1);return H[i]+nh(H[i+1]-H[i])*sm((d-cum[i+1]+W)/(2*W))}
    return H[i]}
  const d=Math.max(0,Math.min(1,frac))*tot;let i=0;while(i<n-1&&d>cum[i+1])i++;
  const h=hAt(d),rel=nh(hAt(d+14)-h),lg=legs[i]||{name:"",surface:"twy"};
  const next=i<n-1?{idx:i+1,turn:nh(H[i+1]-H[i]),name:(legs[i+1]||{}).name||"",dist:cum[i+1]-d}:null;
  return {d,h:(h+360)%360,rel,i,name:lg.name,surface:lg.surface,next,remain:tot-d};
}
// q = 운항 편이 먼저인 조류 경보 {label, at, word(착륙 · 출발)} — 이동 중 장비를 끄고(레이저는 잠그고), 도착 뒤 그 편이 지나갈 때(t<0)까지 대기한다
function camSvg(st,sc,t,frac,simMin,q){
  const W=300,H=400, ir=sc&&sc.cam.ir, laser=!!(sc&&sc.tool==="laser"), qw=q&&q.word||"착륙";
  // 시각 — 낮(06:00~18:59) 가운데 17:30부터는 해 질 녘(노을빛, 대장 10-15). 레이저 장면 18:15 가 여기 든다
  const mm=((Math.floor(simMin)%1440)+1440)%1440, day=!ir&&mm>=360&&mm<1140, dusk=day&&mm>=1050;
  const ink=ir?"#9dffb0":"#e8f1f8", dim=ir?"#3f7a4c":"#7d8c99", bg=ir?"#031208":"#0d1620";
  const unit=sc?sc.cam.unit:"R1";
  let body="", status="", label="로봇 카메라 "+unit;
  const rnd=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
  const ground=(c)=>'<rect x="0" y="190" width="300" height="210" fill="'+c+'"/>';
  const sky=(a,b)=>'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient></defs><rect width="300" height="400" fill="url(#sk)"/>';
  // 노을 — 위는 보랏빛 남색, 지평선 쪽은 주황. 해는 지평선에 반쯤 걸친다(땅이 아래 반을 덮는다)
  const duskSky=()=>'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262a55"/><stop offset=".3" stop-color="#7b4f7a"/><stop offset=".47" stop-color="#f29a5c"/><stop offset=".5" stop-color="#ffc47a"/></linearGradient></defs><rect width="300" height="400" fill="url(#sk)"/>'+
    '<circle cx="232" cy="192" r="17" fill="#ffd98a" opacity=".95"/><circle cx="232" cy="192" r="28" fill="#ffb86b" opacity=".25"/>';
  const daySky=()=>dusk?duskSky():sky("#9fb8c9","#d9e4ea"), dayGround=dusk?"#3a4530":"#4f6646";
  const box=(x,y,w,h,txt,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+c+'" stroke-width="1.5"/><text x="'+x+'" y="'+(y-4)+'" fill="'+c+'" font-size="11" font-weight="700">'+txt+'</text>';
  // ── 이동 화면 — 경로(지도)에서 계산한 방향대로 그린다. 꺾임이 다가오면 길이 그쪽으로 휘고, 꺾는 동안 풍경이 옆으로 흐른다 ──
  const nh=(a)=>((a%360)+540)%360-180;
  const qb=(a,b,c,u)=>[(1-u)*(1-u)*a[0]+2*u*(1-u)*b[0]+u*u*c[0],(1-u)*(1-u)*a[1]+2*u*(1-u)*b[1]+u*u*c[1]];
  // 먼 불빛 · 건물 — 고정 방위에 있다. 방향이 바뀌면 화면에서 옆으로 지나간다
  function horizon(h,y0){let s="";
    for(let i=0;i<16;i++){const b=i*22.5+rnd(i,7)*14,x=150+nh(b-h)*3.2;if(x<-20||x>320)continue;
      const w=8+rnd(i,8)*26,hh=6+rnd(i,9)*22;
      s+='<rect x="'+(x-w/2)+'" y="'+(y0-hh)+'" width="'+w+'" height="'+hh+'" fill="'+(ir?"#0a2a14":"#26333f")+'"/>'+
        '<circle cx="'+x+'" cy="'+(y0-hh-3)+'" r="1.6" fill="'+(ir?ink:"#ff5a4f")+'"/>'}
    return s}
  function groundView(P){
    const h=P?P.h:0,rel=P?Math.max(-80,Math.min(80,P.rel)):0,d=P?P.d:frac*100,grass=P&&P.surface==="grass";
    const Y=190,hx=150+rel*1.9,shake=grass?Math.sin(d*2.7)*2.2+Math.sin(d*7.1)*0.8:0;
    // 낮(적외선이 아닐 때)은 하늘을 그리고 땅을 밝게 — 아침 08:57 은 낮 하늘, 18:15 는 노을
    let s='<g transform="translate(0,'+shake.toFixed(2)+')">'+(ir?"":daySky())+ground(ir?"#052a10":dayGround)+horizon(h,Y);
    const L=[[-10,400],[150-160*0.25,265],[hx-4,Y]],R=[[310,400],[150+160*0.25,265],[hx+4,Y]],C=[[150,400],[150,265],[hx,Y]];
    if(grass){
      for(let i=0;i<34;i++){const p=(rnd(i,5)+d*0.045)%1,q=p*p,x=150+(rnd(i,6)-0.5)*(40+q*620)+(hx-150)*(1-q),y=Y+q*210,w=1+q*5;
        s+='<path d="M'+(x-w)+','+y+' l'+w+','+(-3-q*12)+' l'+w+','+(3+q*12)+'" fill="'+(ir?"#1f7a3a":dusk?"#2a331f":"#3a5233")+'"/>'}
    }else{
      let poly="";for(let k=0;k<=12;k++){const a=qb(L[0],L[1],L[2],k/12);poly+=(k?" L":"M")+a[0].toFixed(1)+","+a[1].toFixed(1)}
      for(let k=12;k>=0;k--){const a=qb(R[0],R[1],R[2],k/12);poly+=" L"+a[0].toFixed(1)+","+a[1].toFixed(1)}
      s+='<path d="'+poly+'Z" fill="'+(ir?"#0d3b1a":"#3a4048")+'"/>';
      const yl=ir?ink:"#f2c230",bl=ir?ink:"#4da3ff";
      for(let i=0;i<9;i++){const p=((i/9)+d*0.06)%1,u=1-p,v=Math.max(0,u-0.035*(0.4+p)),a=qb(C[0],C[1],C[2],u),b=qb(C[0],C[1],C[2],v);
        s+='<path d="M'+a[0].toFixed(1)+','+a[1].toFixed(1)+' L'+b[0].toFixed(1)+','+b[1].toFixed(1)+'" stroke="'+yl+'" stroke-width="'+(1+p*6).toFixed(1)+'"/>'}
      for(let i=0;i<6;i++){const p=((i/6)+d*0.035)%1,u=1-p,r=0.8+p*p*4;
        [L,R].forEach((E)=>{const a=qb(E[0],E[1],E[2],u);s+='<circle cx="'+a[0].toFixed(1)+'" cy="'+(a[1]-r).toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+bl+'"/>'})}
    }
    return s+'</g>'}
  // 방위 띠 — 가운데 눈금이 지금 향하는 방향. 꺾으면 띠가 미끄러진다
  function tape(h){const c=ir?ink:"#fff";let s='<g font-family="ui-monospace,Menlo,monospace" font-weight="700"><rect x="0" y="30" width="300" height="22" fill="rgba(0,0,0,.4)"/>';
    for(let g=Math.ceil((h-70)/10)*10;g<=h+70;g+=10){const x=150+(g-h)*2.2,gg=((g%360)+360)%360,lab=gg%90===0?"NESW"[gg/90]:gg%30===0?String(gg/10):"";
      s+='<rect x="'+(x-0.6)+'" y="'+(lab?33:36)+'" width="1.2" height="'+(lab?6:4)+'" fill="'+c+'" opacity=".8"/>';
      if(lab)s+='<text x="'+x+'" y="49" fill="'+c+'" font-size="'+(lab.length===1&&isNaN(lab)?11:9)+'" text-anchor="middle">'+lab+'</text>'}
    const hv=String(Math.round(((h%360)+360)%360)).padStart(3,"0");
    return s+'<path d="M150,30 l-5,-0 l5,6 l5,-6z" fill="#ffd27a"/><rect x="128" y="53" width="44" height="15" rx="3" fill="rgba(0,0,0,.55)"/><text x="150" y="64" fill="#ffd27a" font-size="11" text-anchor="middle">'+hv+'°</text></g>'}
  // 내비 안내 — 다음 꺾임(방향 · 들어갈 길 · 남은 거리) 또는 현장까지 남은 거리
  function navBar(P){let a,txt;
    if(P.next){const t=P.next.turn,R=t>0,soft=Math.abs(t)<35;a=soft?(R?"↗":"↖"):(R?"↱":"↰");
      txt=(soft?"살짝 ":"")+(R?"우회전":"좌회전")+" · "+P.next.name+" · "+Math.max(0,Math.round(P.next.dist))*10+"m"}
    else{a="▲";txt="현장까지 "+Math.max(0,Math.round(P.remain))*10+"m"}
    const wide=[...txt].reduce((w,c)=>w+(c>"\u1100"?14:7.6),0);          // 길면 칸 안으로 눌러 담는다
    const near=P.next&&P.next.dist<14,blink=near&&Math.floor(Date.now()/350)%2===0;
    return '<g font-weight="800"><rect x="16" y="74" width="268" height="34" rx="8" fill="'+(near?"rgba(255,210,122,.92)":"rgba(0,0,0,.6)")+'"/>'+
      '<text x="36" y="99" fill="'+(near?"#2a1d00":"#ffd27a")+'" font-size="22" text-anchor="middle" opacity="'+(blink?0.35:1)+'">'+a+'</text>'+
      '<text x="56" y="96" fill="'+(near?"#2a1d00":"#fff")+'" font-size="14"'+(wide>218?' textLength="218" lengthAdjust="spacingAndGlyphs"':'')+'>'+esc(txt)+'</text></g>'}
  function scene(tt,track){
    if(!sc)return "";
    // 해 질 녘 초지 — 앉은 새 떼와 녹색 레이저(고시 제2026-256호 제32조의2)
    //   도착 → 안전시스템 점검(T0초, 위로 0도를 넘으면 자동 정지) → 수평 아래로 비춘다 → 새 떼는 오른쪽(동쪽 울타리, 활주로 반대쪽)으로 뜬다
    //   그 편이 먼저면(q, tt<0) 레이저를 잠근 채 기다린다
    if(sc.kind==="bird"&&laser){
      const T0=1.6,wait=track&&q&&tt<0,on=track&&!wait&&tt>=T0,go=on?tt-T0:0,span=Math.max(1,sc.resolveS-T0-3.2);
      let s=ground("#34402b");
      for(let i=0;i<14;i++)s+='<rect x="'+(150+i*11)+'" y="'+(196-i*0.4)+'" width="1.4" height="9" fill="#1d2418"/>';   // 동쪽 울타리(멀리)
      s+='<rect x="150" y="199" width="150" height=".8" fill="#1d2418"/>';
      for(let i=0;i<26;i++){const x=rnd(i,11)*300,y=215+rnd(i,12)*170,w=2+rnd(i,13)*3;s+='<path d="M'+x+','+y+' l'+w+','+(-6-w)+' l'+w+','+(6+w)+'" fill="#2a331f"/>'}
      let px=[],py=[],aim=null;
      for(let i=0;i<40;i++){const bx=70+rnd(i,1)*170,by=234+rnd(i,2)*66,li=rnd(i,3)*span;
        if(on&&go>li){const k=go-li,x=bx+k*k*(8+rnd(i,4)*6),y=by-k*(16+rnd(i,5)*10);
          if(x<310&&y>-10)s+='<path d="M'+(x-5)+','+(y-3)+' L'+x+','+y+' L'+(x+5)+','+(y-3)+'" stroke="#141a24" stroke-width="2" fill="none"/>'}
        else{px.push(bx);py.push(by);if(!aim||bx<aim[0])aim=[bx,by];
          s+='<ellipse cx="'+bx+'" cy="'+by+'" rx="5" ry="3" fill="#161b22"/><circle cx="'+(bx-4)+'" cy="'+(by-3)+'" r="2" fill="#161b22"/>'}}
      if(on&&px.length){   // 레이저 — 로봇(화면 왼쪽 아래)에서 땅으로. 끝점은 남은 새 떼의 서쪽(활주로 쪽) 가장자리를 훑는다
        const tx=aim[0]-6+Math.sin(go*5)*8,ty=aim[1]+4+Math.sin(go*3.3)*3;
        s+='<line x1="24" y1="392" x2="'+tx.toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="#39ff6a" stroke-width="7" opacity=".18"/>'+
          '<line x1="24" y1="392" x2="'+tx.toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="#9dffb4" stroke-width="1.6"/>'+
          '<circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="9" fill="#39ff6a" opacity=".3"/><circle cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'" r="3.2" fill="#d6ffe0"/>'}
      if(px.length)s+=box(Math.min(...px)-10,Math.min(...py)-10,Math.max(...px)-Math.min(...px)+20,Math.max(...py)-Math.min(...py)+18,"앉은 새 떼 "+px.length,"#ff6b5b");
      // 새 떼가 다 나가면 레이저를 잠근다(5호 — 쓸 때 말고는 잠금)
      if(on&&!px.length)s+='<g font-weight="800"><rect x="14" y="'+(q?92:62)+'" width="120" height="26" rx="6" fill="rgba(10,16,24,.78)" stroke="#8fa3b5" stroke-width="1"/><text x="24" y="'+(q?110:80)+'" fill="#c9d3dd" font-size="12.5">🔒 레이저 잠금</text></g>';
      if(on&&px.length)s+='<g font-weight="800"><rect x="14" y="'+(q?92:62)+'" width="178" height="40" rx="6" fill="rgba(10,16,24,.78)" stroke="#39ff6a" stroke-width="1"/>'+
        '<text x="24" y="'+(q?108:78)+'" fill="#9dffb4" font-size="12.5">녹색 레이저 −4° · 수평 아래로</text>'+
        '<text x="24" y="'+(q?124:94)+'" fill="#c9d3dd" font-size="10.5" font-weight="600">위로 0°를 넘으면 자동 정지</text></g>';
      if(wait)s+='<rect x="40" y="150" width="220" height="44" rx="6" fill="rgba(13,22,32,.82)"/><text x="150" y="169" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="800">'+qw+' 통과 대기 · 레이저 잠금</text><text x="150" y="185" fill="#c9d3dd" font-size="11" text-anchor="middle">'+(q?q.label+" "+q.at:"")+' — 관제탑 지시</text>';
      else if(track&&tt<T0)s+='<rect x="34" y="140" width="232" height="58" rx="6" fill="rgba(13,22,32,.85)" stroke="#39ff6a" stroke-width="1"/><text x="150" y="162" fill="#9dffb4" font-size="14" text-anchor="middle" font-weight="800">레이저 안전시스템 점검</text>'+
        '<text x="150" y="183" fill="#e8f1f8" font-size="11.5" text-anchor="middle" font-weight="600">위로 0°를 넘기면 → 자동 정지 ✓ 정상</text>';
      if(track&&!px.length&&tt>=sc.resolveS-0.5)s+='<rect x="70" y="150" width="160" height="40" rx="6" fill="rgba(13,22,32,.7)"/><text x="150" y="176" fill="#9dffb4" font-size="17" text-anchor="middle" font-weight="800">초지 정상</text>';
      return s;
    }
    if(sc.kind==="bird"){
      let s='<rect x="0" y="300" width="300" height="100" fill="#1d2b22"/>';
      for(let i=0;i<9;i++)s+='<circle cx="'+(30+i*30)+'" cy="306" r="2" fill="#e8c35a"/>';
      let xs=[],ys=[];
      for(let i=0;i<30;i++){const bx=110+rnd(i,1)*90,by=130+rnd(i,2)*80,sp=track?Math.max(0,tt):0;
        const x=bx+sp*sp*(2+rnd(i,3)*3),y=by-sp*(3+rnd(i,4)*4);
        if(x<310){xs.push(x);ys.push(y);s+='<path d="M'+(x-5)+','+(y-3)+' L'+x+','+y+' L'+(x+5)+','+(y-3)+'" stroke="#1a2530" stroke-width="2" fill="none"/>'}}
      if(track&&tt<0){s+='<rect x="50" y="244" width="200" height="40" rx="6" fill="rgba(13,22,32,.78)"/><text x="150" y="262" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="800">'+qw+' 통과 대기 · 장비 정지</text><text x="150" y="278" fill="#c9d3dd" font-size="11" text-anchor="middle">'+(q?q.label+" "+q.at:"")+' — 관제탑 지시</text>'}
      else if(track&&xs.length>3){const b=tt%2.6;if(b<0.35)s+='<circle cx="60" cy="300" r="'+(18+b*120)+'" fill="none" stroke="#ffd27a" stroke-width="'+(5-b*10)+'" opacity="'+(1-b*2.6)+'"/><text x="60" y="290" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="800">폭음</text>';
        s+='<text x="150" y="355" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="700">◀)) 음파퇴치기 · 폭음경보기</text>'}
      if(xs.length>3)s+=box(Math.min(...xs)-8,Math.min(...ys)-8,Math.max(...xs)-Math.min(...xs)+16,Math.max(...ys)-Math.min(...ys)+16,"새 떼 "+xs.length,"#c0392b");
      else s+='<text x="150" y="200" fill="#0f5132" font-size="17" text-anchor="middle" font-weight="800">접근로 정상</text>';
      return s;
    }
    return "";
  }
  const bgSky=sc&&!ir&&sc.kind==="bird"?daySky():"";
  // 낮(06:00~18:59, 적외선 아님)의 대기 · 종결 화면 — 남색 빈 화면 대신 거점에서 보는 낮 풍경 위에 글자(대장 10-14) · 17:30 부터는 노을
  const still=(a,b)=>day?daySky()+ground(dayGround)+horizon(0,190)+'<rect x="40" y="176" width="220" height="60" rx="8" fill="rgba(13,22,32,.6)"/>'+
    (a?'<text x="150" y="'+(b?200:211)+'" fill="#fff" font-size="16" text-anchor="middle" font-weight="700">'+a+'</text>':'')+(b?'<text x="150" y="'+(a?224:211)+'" fill="#d6dee6" font-size="13" text-anchor="middle">'+b+'</text>':'')
    :(a?'<text x="150" y="200" fill="'+ink+'" font-size="16" text-anchor="middle" font-weight="700">'+a+'</text><text x="150" y="224" fill="'+dim+'" font-size="13" text-anchor="middle">'+b+'</text>'
      :'<text x="150" y="205" fill="'+dim+'" font-size="15" text-anchor="middle">'+b+'</text>');
  if(st==="moving"){
    const P=camPose(sc,frac);
    body=groundView(P);
    if(P)body+=tape(P.h)+navBar(P);
    // 조류 — 출발과 함께 음파퇴치기를 켠다. 레이저는 쓸 때 말고는 잠근다(고시 제32조의2 5호)
    if(sc.kind==="bird"&&Math.floor(Date.now()/500)%2===0){const tx=laser?(q?"레이저 잠금 · 이동 중("+qw+" 먼저)":"레이저 잠금 · 이동 중"):q?"퇴치 장비 정지 · 이동 중("+qw+" 먼저)":"◀)) 음파퇴치기 가동 · 이동 중";
      body+='<text x="150" y="350" fill="'+(laser?"#9dffb4":"#ffd27a")+'" font-size="15" text-anchor="middle" font-weight="700">'+tx+'</text>'}
    status="이동 중 · "+(P?P.name+" · ":"")+"도착까지 "+Math.max(0,Math.ceil((1-frac)*sc.travelMin))+"분";
  }else if(st==="acting"||st==="resolved"){body=bgSky+scene(t,true);
    const done=st==="resolved";
    status=done?sc.closeShort+" · 관리자 확인 대기"
      :laser?(q&&t<0?qw+" 통과 대기 · 레이저 잠금":t<1.6?"레이저 안전시스템 점검":q?qw+" 통과 · 다음 편 대비 레이저 퇴치":"녹색 레이저 · 수평 아래로 퇴치 중")
      :(q&&t<0?qw+" 통과 대기 · 장비 정지":q?qw+" 통과 · 다음 편 대비 퇴치":"폭음경보기 · 음파퇴치기 가동")}
  else if(st==="hold"){label="고정 센서 — "+sc.sensor;body=bgSky+scene(0,false);status="보류 · 장비 대기"}
  else if(st==="decide"){body=still("출동 대기","관리자 승인을 기다린다");status="거점 · 순찰"}
  else if(st==="closed"){body=still("종결","순찰로 복귀");status="복귀 중"}
  else{body=still("","대기 중");status="거점 · 순찰"}
  // 운항 편이 먼저인 조류 경보 — 관제탑에 넘겼다는 사실을 현장 카메라에도 보인다(관제 화면에만 있었다, 대장 10-11)
  if(q&&sc&&sc.kind==="bird"&&(st==="moving"||st==="acting")){const by=st==="moving"?122:60;  // 이동 중엔 방위 띠 · 길 안내 아래로
    body+='<rect x="24" y="'+by+'" width="252" height="24" rx="5" fill="rgba(13,22,32,.82)" stroke="#ffd27a" stroke-width="1"/><text x="150" y="'+(by+16)+'" fill="#ffd27a" font-size="12" text-anchor="middle" font-weight="800">관제탑 공유 · '+qw+' 편은 관제탑 판단</text>'}
  const rec=Math.floor(Date.now()/600)%2===0;
  const hud='<g font-family="ui-monospace,Menlo,monospace" font-weight="700">'+
    '<rect x="0" y="0" width="300" height="30" fill="rgba(0,0,0,.45)"/>'+(rec&&(st==="moving"||st==="acting"||st==="resolved")?'<circle cx="14" cy="15" r="5" fill="#ff3b30"/>':'')+
    '<text x="26" y="20" fill="#fff" font-size="12">'+label+'</text><text x="290" y="20" fill="#fff" font-size="12" text-anchor="end">'+kstDate()+' '+hhmm(simMin)+'</text>'+
    '<rect x="0" y="372" width="300" height="28" fill="rgba(0,0,0,.5)"/><text x="10" y="391" fill="#fff" font-size="12">'+status+'</text></g>'+
    '<g stroke="'+(ir?ink:"#fff")+'" stroke-width="2" fill="none" opacity=".7"><path d="M12,42 v-0 M12,52 V42 H22 M288,42 H278 M288,42 V52 M12,360 V350 M12,360 H22 M288,360 H278 M288,360 V350"/>'+
    '<path d="M150,192 v16 M142,200 h16" stroke-width="1.2"/></g>';
  return '<svg class="camsvg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet"><rect width="300" height="400" fill="'+bg+'"/>'+body+hud+'</svg>';
}
`;
