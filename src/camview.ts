// 로봇 카메라 화면 — 시뮬레이션 그림(SVG). 실제 영상이 아니다: 감시 카메라 화면처럼 단순한 모양 + 녹화 표시 + 움직임.
// 화면 쪽 스크립트에 그대로 실린다(문자열). camSvg(st, sc, t, frac, simMin) → SVG 문자열
//   st   = idle · travel · decide · moving · acting(조치 중) · resolved(해결) · hold · closed · summary
//   t    = 도착(또는 보류) 뒤 지난 실제 초 — 조치 장면의 움직임에 쓴다. sc.resolveS 초에 해결 장면이 된다
//   날짜 = 화면 쪽 kstDate()(그날의 실제 날짜 — 데모데이에는 2026.10.17)
//   frac = 이동 진행률(0~1)
export const CAM_JS = `
function camSvg(st,sc,t,frac,simMin){
  const W=300,H=400, ir=sc&&sc.cam.ir;
  const ink=ir?"#9dffb0":"#e8f1f8", dim=ir?"#3f7a4c":"#7d8c99", bg=ir?"#031208":"#0d1620";
  const unit=sc?sc.cam.unit:"R1";
  let body="", status="", label=unit==="PTZ"?"PTZ 카메라":"로봇 카메라 "+unit;
  const rnd=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
  const ground=(c)=>'<rect x="0" y="190" width="300" height="210" fill="'+c+'"/>';
  const sky=(a,b)=>'<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient></defs><rect width="300" height="400" fill="url(#sk)"/>';
  const box=(x,y,w,h,txt,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+c+'" stroke-width="1.5"/><text x="'+x+'" y="'+(y-4)+'" fill="'+c+'" font-size="11" font-weight="700">'+txt+'</text>';
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
    if(unit==="D1"){body=sky("#9fb8c9","#d9e4ea")+'<g transform="rotate(-6 150 230)"><rect x="-60" y="230" width="420" height="260" fill="#40553f"/>';
      for(let i=0;i<8;i++){const y=230+((i*34+frac*900)%260);body+='<rect x="-60" y="'+y+'" width="420" height="1.5" fill="#5b7258"/>'}body+='</g>'}
    else{body=ground(ir?"#052a10":"#2a3530")+'<path d="M140,190 L160,190 L300,400 L0,400 Z" fill="'+(ir?"#0d3b1a":"#3a4048")+'"/>';
      for(let i=0;i<6;i++){const p=((i/6)+frac*8)%1,y=190+p*p*210,w=1+p*7;body+='<rect x="'+(150-w/2)+'" y="'+y+'" width="'+w+'" height="'+(4+p*26)+'" fill="'+(ir?ink:"#e8e8e8")+'"/>'}}
    status="이동 중 · 도착까지 "+Math.max(0,Math.ceil((1-frac)*sc.travelMin))+"분";
  }else if(st==="acting"||st==="resolved"){body=bgSky+scene(t,true);
    const done=st==="resolved",k=sc.kind;
    status=done?(k==="intrusion"?"인계 완료 · 관리자 확인 대기":k==="fod"?"수거 완료 · 관리자 확인 대기":k==="bird"?"접근로 정상 · 관리자 확인 대기":"드론 이탈 · 관리자 확인 대기")
      :(k==="intrusion"?(t>sc.resolveS*0.55?"관계기관 도착 · 인계 중":"추적 · 경고 방송 · 위치 공유"):k==="fod"?"현장 도착 · 수거 중":k==="bird"?"음향·조명 퇴치 중":"PTZ 추적 · 관제탑·관계기관 공유")}
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
