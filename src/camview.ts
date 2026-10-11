// 로봇 카메라 화면 — 시뮬레이션 그림(SVG). 실제 영상이 아니다: 감시 카메라 화면처럼 단순한 모양 + 녹화 표시 + 움직임.
// 화면 쪽 스크립트에 그대로 실린다(문자열). camSvg(st, sc, t, frac, simMin) → SVG 문자열
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
function camSvg(st,sc,t,frac,simMin){
  const W=300,H=400, ir=sc&&sc.cam.ir;
  const ink=ir?"#9dffb0":"#e8f1f8", dim=ir?"#3f7a4c":"#7d8c99", bg=ir?"#031208":"#0d1620";
  const unit=sc?sc.cam.unit:"R1";
  let body="", status="", label=unit==="PTZ"?"공항 드론 탐지 카메라":"로봇 카메라 "+unit;
  const rnd=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
  const ground=(c)=>'<rect x="0" y="190" width="300" height="210" fill="'+c+'"/>';
  const sky=(a,b)=>'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient></defs><rect width="300" height="400" fill="url(#sk)"/>';
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
    // 낮(적외선이 아닐 때)은 하늘을 그리고 땅을 밝게 — 조류 장면은 아침 08:57
    let s='<g transform="translate(0,'+shake.toFixed(2)+')">'+(ir?"":sky("#9fb8c9","#d9e4ea"))+ground(ir?"#052a10":"#4f6646")+horizon(h,Y);
    const L=[[-10,400],[150-160*0.25,265],[hx-4,Y]],R=[[310,400],[150+160*0.25,265],[hx+4,Y]],C=[[150,400],[150,265],[hx,Y]];
    if(grass){
      for(let i=0;i<34;i++){const p=(rnd(i,5)+d*0.045)%1,q=p*p,x=150+(rnd(i,6)-0.5)*(40+q*620)+(hx-150)*(1-q),y=Y+q*210,w=1+q*5;
        s+='<path d="M'+(x-w)+','+y+' l'+w+','+(-3-q*12)+' l'+w+','+(3+q*12)+'" fill="'+(ir?"#1f7a3a":"#3a5233")+'"/>'}
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
    if(sc.kind==="intrusion"){
      let s=ground("#052a10");
      for(let i=0;i<11;i++)s+='<rect x="'+(i*30)+'" y="175" width="2.5" height="80" fill="'+dim+'"/>';
      for(let j=0;j<4;j++)s+='<rect x="0" y="'+(180+j*20)+'" width="300" height="1" fill="'+dim+'"/>';
      [[95,0],[150,14]].forEach(([x0,dy],i)=>{const x=Math.min(250,x0+tt*4),y=250+dy;
        s+='<circle cx="'+x+'" cy="'+(y-64)+'" r="7.5" fill="'+ink+'"/><rect x="'+(x-9)+'" y="'+(y-55)+'" width="18" height="30" rx="4" fill="'+ink+'"/>'+
          '<rect x="'+(x-8)+'" y="'+(y-27)+'" width="7" height="27" rx="2" fill="'+ink+'"/><rect x="'+(x+1)+'" y="'+(y-27)+'" width="7" height="27" rx="2" fill="'+ink+'"/>'+
          '<rect x="'+(x-14)+'" y="'+(y-53)+'" width="5" height="24" rx="2" fill="'+ink+'"/><rect x="'+(x+9)+'" y="'+(y-53)+'" width="5" height="24" rx="2" fill="'+ink+'"/>';
        if(track)s+=box(x-18,y-74,36,86,"사람 "+(i+1)+(tt>=sc.resolveS?" · 인계":" · 추적"),ink)});
      const rs=sc.resolveS,car=Math.min(1,Math.max(0,(tt-rs*0.55)/(rs*0.3)));
      if(track&&car>0){const cx=-70+car*150,on=Math.floor(tt*4)%2===0;
        s+='<rect x="'+cx+'" y="292" width="76" height="26" rx="5" fill="'+dim+'"/><rect x="'+(cx+14)+'" y="280" width="44" height="16" rx="4" fill="'+dim+'"/>'+
          '<rect x="'+(cx+20)+'" y="274" width="14" height="6" fill="'+(on?"#ff3b30":"#3b82f6")+'"/><rect x="'+(cx+38)+'" y="274" width="14" height="6" fill="'+(on?"#3b82f6":"#ff3b30")+'"/>'+
          '<circle cx="'+(cx+16)+'" cy="320" r="7" fill="#000"/><circle cx="'+(cx+60)+'" cy="320" r="7" fill="#000"/>'+box(cx-4,268,84,58,"관계기관 도착",ink)}
      if(track&&tt>=rs)s+='<rect x="60" y="120" width="180" height="40" rx="6" fill="none" stroke="'+ink+'" stroke-width="2"/><text x="150" y="146" fill="'+ink+'" font-size="17" text-anchor="middle" font-weight="800">인계 완료</text>';
      else if(track&&Math.floor(tt*2)%2===0)s+='<text x="150" y="350" fill="'+ink+'" font-size="15" text-anchor="middle" font-weight="700">◀)) 경고 방송 중</text>';
      return s;
    }
    if(sc.kind==="fod"){
      let s=ground("#0a2412")+'<path d="M95,190 L205,190 L300,400 L0,400 Z" fill="#123a1d"/>';
      for(let i=0;i<5;i++){const y=200+i*40;s+='<rect x="'+(148-i*0.6)+'" y="'+y+'" width="'+(4+i*1.2)+'" height="'+(14+i*4)+'" fill="'+dim+'"/>'}
      const got=track&&tt>5;
      if(!got)s+='<path d="M140,300 l14,-6 l9,5 l-6,7 l-15,2 z" fill="'+ink+'"/>'+box(126,282,48,32,"금속 조각",ink);
      if(track&&tt>2.5&&!got){const d=Math.min(1,(tt-2.5)/2.5);s+='<path d="M150,400 L150,'+(400-d*92)+' M140,'+(400-d*92)+' h20" stroke="'+ink+'" stroke-width="5" fill="none"/>'}
      if(got)s+='<rect x="70" y="270" width="160" height="44" rx="6" fill="none" stroke="'+ink+'" stroke-width="2"/><text x="150" y="298" fill="'+ink+'" font-size="17" text-anchor="middle" font-weight="800">수거 완료 · 사진 기록</text>';
      return s;
    }
    if(sc.kind==="bird"){
      let s='<rect x="0" y="300" width="300" height="100" fill="#1d2b22"/>';
      for(let i=0;i<9;i++)s+='<circle cx="'+(30+i*30)+'" cy="306" r="2" fill="#e8c35a"/>';
      let xs=[],ys=[];
      for(let i=0;i<30;i++){const bx=110+rnd(i,1)*90,by=130+rnd(i,2)*80,sp=track?tt:0;
        const x=bx+sp*sp*(2+rnd(i,3)*3),y=by-sp*(3+rnd(i,4)*4);
        if(x<310){xs.push(x);ys.push(y);s+='<path d="M'+(x-5)+','+(y-3)+' L'+x+','+y+' L'+(x+5)+','+(y-3)+'" stroke="#1a2530" stroke-width="2" fill="none"/>'}}
      if(track&&xs.length>3){const b=tt%2.6;if(b<0.35)s+='<circle cx="60" cy="300" r="'+(18+b*120)+'" fill="none" stroke="#ffd27a" stroke-width="'+(5-b*10)+'" opacity="'+(1-b*2.6)+'"/><text x="60" y="290" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="800">폭음</text>';
        s+='<text x="150" y="355" fill="#ffd27a" font-size="14" text-anchor="middle" font-weight="700">◀)) 음파퇴치기 · 폭음경보기</text>'}
      if(xs.length>3)s+=box(Math.min(...xs)-8,Math.min(...ys)-8,Math.max(...xs)-Math.min(...xs)+16,Math.max(...ys)-Math.min(...ys)+16,"새 떼 "+xs.length,"#c0392b");
      else s+='<text x="150" y="200" fill="#0f5132" font-size="17" text-anchor="middle" font-weight="800">접근로 정상</text>';
      return s;
    }
    let s='<rect x="0" y="330" width="300" height="70" fill="#22303a"/>';
    const out=Math.max(0,tt-sc.resolveS*0.5),x=150+Math.sin(tt/2)*40-out*out*9,y=170+Math.cos(tt/3)*14-out*4;
    if(track&&tt>=sc.resolveS)return s+'<text x="150" y="190" fill="#0f5132" font-size="17" text-anchor="middle" font-weight="800">드론 이탈 · 통보 완료</text>';
    s+='<path d="M'+(x-9)+','+(y-9)+' L'+(x+9)+','+(y+9)+' M'+(x+9)+','+(y-9)+' L'+(x-9)+','+(y+9)+'" stroke="#1a2530" stroke-width="3"/>';
    [[-9,-9],[9,-9],[-9,9],[9,9]].forEach(([a,b])=>s+='<circle cx="'+(x+a)+'" cy="'+(y+b)+'" r="4" fill="none" stroke="#1a2530" stroke-width="2"/>');
    s+=box(x-24,y-24,48,48,"드론 · 2.7km","#c0392b");
    return s;
  }
  const bgSky=sc&&!ir?(sc.kind==="drone"||sc.kind==="bird"?sky("#9fb8c9","#d9e4ea"):""):"";
  if(st==="moving"){
    const P=camPose(sc,frac);
    body=groundView(P);
    if(P)body+=tape(P.h)+navBar(P);
    // 조류 — 출발과 함께 음파퇴치기(도달 3km)를 켠다
    if(sc.kind==="bird"&&Math.floor(Date.now()/500)%2===0)body+='<text x="150" y="350" fill="#ffd27a" font-size="15" text-anchor="middle" font-weight="700">◀)) 음파퇴치기 가동 · 이동 중</text>';
    status="이동 중 · "+(P?P.name+" · ":"")+"도착까지 "+Math.max(0,Math.ceil((1-frac)*sc.travelMin))+"분";
  }else if(st==="acting"||st==="resolved"){body=bgSky+scene(t,true);
    const done=st==="resolved",k=sc.kind;
    status=done?(k==="intrusion"?"인계 완료 · 관리자 확인 대기":k==="fod"?"수거 완료 · 관리자 확인 대기":k==="bird"?"접근로 정상 · 관리자 확인 대기":"드론 이탈 · 관리자 확인 대기")
      :(k==="intrusion"?(t>sc.resolveS*0.55?"관계기관 도착 · 인계 중":"추적 · 경고 방송 · 위치 공유"):k==="fod"?"현장 도착 · 수거 중":k==="bird"?"폭음경보기 · 음파퇴치기 가동":"탐지 카메라 추적 · 관제탑·관계기관 공유")}
  else if(st==="hold"){label="고정 센서 — "+sc.sensor;body=bgSky+scene(0,false);status="보류 · 장비 대기"}
  else if(st==="decide"){body='<text x="150" y="200" fill="'+ink+'" font-size="16" text-anchor="middle" font-weight="700">출동 대기</text><text x="150" y="224" fill="'+dim+'" font-size="13" text-anchor="middle">관리자 승인을 기다린다</text>';status="대기소"}
  else if(st==="closed"){body='<text x="150" y="200" fill="'+ink+'" font-size="16" text-anchor="middle" font-weight="700">종결</text><text x="150" y="224" fill="'+dim+'" font-size="13" text-anchor="middle">대기소로 복귀</text>';status="복귀 중"}
  else{body='<text x="150" y="205" fill="'+dim+'" font-size="15" text-anchor="middle">대기 중</text>';status="대기소"}
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
