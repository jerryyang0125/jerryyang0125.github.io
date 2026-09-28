import { defaultLibrary, scenarios } from './planner-data.mjs';
import { compatible, effectiveSensor, cropFactor, field, framing, distanceFor, focalFor, exposureISO, apertureRange, recommend, dolly, inferDistance, inferFocal, perspectiveRatio, validateLibrary, positive } from './planner-math.mjs';
import { View, drawMap } from './planner-view.mjs';
const $=id=>document.getElementById(id);
const number=id=>Number($(id).value);
const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('zh-TW',{maximumFractionDigits:d}):'—';
const clone=x=>structuredClone(x);
const key='jy-camera-library-v1';
let library=clone(defaultLibrary),storageMessage='器材只儲存在此瀏覽器，可匯出備份。';
try { const saved=localStorage.getItem(key);if(saved)library=validateLibrary(JSON.parse(saved)); }
catch { storageMessage='無法讀取本機器材庫，已使用預設清單；本次仍可使用及匯出。'; }
let activeTab='venue',mode='actual',lastValid=null,pins=[],recommendations=[],frameRequest=0,playing=false;
let currentPhoto=null,photoBox=null,photoStart=null,photoLoad=0;
const viewA=new View($('view-a')),viewB=new View($('view-b'));
$('render-status').textContent=viewA.ready?'立體幾何示意 · 背景橘色方塊高 1.7m；非實拍照片。':'WebGL 不可用，已切換 2D 投影示意；所有計算仍可使用。';
function option(select,value,text){select.add(new Option(text,value));}
function bodies(){return library.bodies.filter(b=>b.enabled);}
function getBody(){return library.bodies.find(b=>b.id===$('body').value);}
function getLens(){return library.lenses.find(l=>l.id===$('lens').value);}
function sensorOptions(){
  const vm=$('video-mode').value;
  return {videoCrop:vm==='s35'?1.5:vm==='custom'?number('video-crop'):1,extraCrop:number('extra-crop'),ratio:vm==='photo'?number('ratio'):16/9,portrait:$('orientation').value==='portrait'};
}
function populateBodies(preferred=$('body').value){
  $('body').replaceChildren();for(const b of bodies())option($('body'),b.id,b.name);
  if(bodies().some(b=>b.id===preferred))$('body').value=preferred;
  populateLenses();
}
function populateLenses(preferred=$('lens').value){
  const body=getBody();$('lens').replaceChildren();
  if(!body)return;
  for(const lens of library.lenses.filter(l=>l.enabled&&compatible(body,l,$('adapter').checked)))option($('lens'),lens.id,lens.name);
  if([...$('lens').options].some(o=>o.value===preferred))$('lens').value=preferred;
  const s35=$('video-mode').querySelector('[value=s35]');
  s35.disabled=body.id!=='a74';
  if(s35.disabled&&$('video-mode').value==='s35')$('video-mode').value='photo';
}
function setFocal(actual,sensor){
  $('focal').value=Number((mode==='equivalent'?actual*cropFactor(sensor):actual).toFixed(6));
}
function selectLens(){
  const b=getBody(),l=getLens();if(!b||!l)return render();
  const sensor=effectiveSensor(b,l,sensorOptions());
  setFocal(l.min,sensor);$('aperture').value=l.wide;
  $('dolly-start').value=l.min;$('dolly-end').value=l.max;
  $('dolly-distance').value=$('distance').value;
  $('progress').value=0;
  render();
}
function read(){
  const body=getBody(),lens=getLens();
  if(!body||!lens)throw new Error('此機身沒有已啟用的相容鏡頭，請調整器材庫或開啟轉接環。');
  const opts=sensorOptions(),sensor=effectiveSensor(body,lens,opts);
  for(const id of ['focal','aperture','distance','height','half-height','shoulder','count','rows','fill','background-gap','shutter','near','far','extra-crop']) {
    const input=$(id);positive(number(id));
    if(input.min&&number(id)<Number(input.min)||input.max&&number(id)>Number(input.max))throw new Error(input.closest('label')?.childNodes[0].textContent+' 超出可用範圍。');
  }
  if(number('video-crop')<1||number('video-crop')>10||!Number.isFinite(number('video-crop')))throw new Error('影片裁切倍率需介於 1–10。');
  if(!Number.isFinite(number('gap'))||number('gap')<0||number('gap')>200)throw new Error('左右間隔需介於 0–200cm。');
  if(!Number.isFinite(number('ev'))||number('ev')< -6||number('ev')>20)throw new Error('EV 需介於 -6–20。');
  if(number('near')>number('far'))throw new Error('最近站位不可大於最遠站位。');
  if(!Number.isInteger(number('count'))||!Number.isInteger(number('rows'))||number('rows')>number('count'))throw new Error('人數與排數需為整數，排數不可大於人數。');
  const focal=number('focal')/(mode==='equivalent'?cropFactor(sensor):1);
  const p={body,lens,opts,sensor,focal,distance:number('distance'),aperture:number('aperture'),
    height:number('height')/100,halfHeight:number('half-height')/100,shoulder:number('shoulder')/100,
    half:$('shot').value==='half',count:number('count'),rows:number('rows'),gap:number('gap')/100,fill:number('fill')/100,
    backgroundGap:number('background-gap'),ev:number('ev'),shutter:number('shutter'),near:number('near'),far:number('far'),
    head:activeTab==='perspective'&&$('model').value==='head',angle:number('face-angle'),position:number('face-position')};
  p.target=framing(p);
  return p;
}
function summary(p){
  const f=field(p.sensor,p.focal,p.distance),bg=field(p.sensor,p.focal,p.distance+p.backgroundGap);
  const personFill=(p.head ? .26 : p.target.height)/f.height,widthFill=(p.head ? .218 : p.target.width)/f.width;
  const backgroundPercent=100*(1-Math.min(1,personFill)*Math.min(1,widthFill));
  const items=[
    ['全片幅等效',fmt(p.focal*cropFactor(p.sensor),1)+'mm'],
    [p.head?'頭部基準平面高度佔比':'人物區域高度佔比',fmt(personFill*100,1)+'%'],
    ['完整左右入鏡',widthFill<=1?'可以 · '+fmt(widthFill*100,1)+'%':'超出畫面 · '+fmt(widthFill*100,1)+'%'],
    ['主體平面範圍',fmt(f.width)+' × '+fmt(f.height)+'m'],
    ['背景平面寬 × 高',fmt(bg.width)+' × '+fmt(bg.height)+'m'],
    ['人物框外面積（近似）',fmt(backgroundPercent,1)+'%'],
    ['估算 ISO',fmt(exposureISO(p.aperture,p.shutter,p.ev),0)],
    ['拍攝距離',fmt(p.distance)+'m']
  ];
  $('metrics').replaceChildren();
  for(const [name,value] of items){const box=document.createElement('div'),label=document.createElement('span'),strong=document.createElement('strong');label.textContent=name;strong.textContent=value;box.append(label,strong);$('metrics').append(box);}
}
function render(){
  try{
    let p=read();
    if(activeTab==='frame'){
      if($('solve').value==='distance'){p.distance=distanceFor(p.sensor,p.focal,p.target);$('distance').value=Number(p.distance.toFixed(6));}
      if($('solve').value==='focal'){p.focal=focalFor(p.sensor,p.distance,p.target);setFocal(p.focal,p.sensor);}
    }
    $('planner-error').textContent='';
    $('visuals').hidden=activeTab==='photo';
    $('recommendations-panel').hidden=activeTab!=='venue';
    $('focal-slider').min=p.lens.min;$('focal-slider').max=p.lens.max;$('focal-slider').value=p.focal;$('focal-slider').disabled=p.lens.min===p.lens.max;
    const apertureBounds=apertureRange(p.lens,p.focal);
    const warnings=[];
    if(p.focal<p.lens.min-1e-5||p.focal>p.lens.max+1e-5)warnings.push('此焦段超出所選鏡頭，畫面為假想設定。');
    if(p.aperture<apertureBounds[0])warnings.push('指定光圈大於此鏡头可提供的最大光圈。');
    else if(p.aperture<apertureBounds[1])warnings.push('此中間焦段的最大光圈待核實。');
    if(p.distance<p.near||p.distance>p.far)warnings.push('目前距離超出設定的活動範圍。');
    if(p.lens.mfd&&p.distance<p.lens.mfd)warnings.push('距離小於最近對焦限制。');
    $('lens-info').textContent=(p.lens.kind?p.lens.kind+' · ':'')+'實際 '+fmt(p.lens.min)+'–'+fmt(p.lens.max)+'mm；最大光圈 '+(apertureBounds[0]===apertureBounds[1]?'f/'+fmt(apertureBounds[0]):'f/'+fmt(apertureBounds[0])+'–'+fmt(apertureBounds[1])+'（中間焦段未知）')+'。'+(p.lens.mfd?'最近對焦 '+p.lens.mfd+'m'+(p.lens.mfdNote?' · '+p.lens.mfdNote:''):'最近對焦距離未核實。')+(p.lens.estimated?' 手機感光尺寸／焦距為估算。':'')+warnings.join(' ');
    $('sensor-info').textContent='有效畫幅 '+fmt(p.sensor.width)+' × '+fmt(p.sensor.height)+'mm；對角線裁切 '+fmt(cropFactor(p.sensor))+'×'+(p.sensor.mountCrop>1?' · EF-S 強制 1.6×':'')+'。';
    let show=p;
    if(activeTab==='dolly')show=renderDolly(p);
    if(show){
      viewA.draw(show);drawMap($('map'),show);summary(show);
      $('view-a-title').textContent='A · '+fmt(show.focal)+'mm / '+fmt(show.distance)+'m';
      $('compare-figure').hidden=activeTab!=='perspective'&&!(activeTab==='venue'&&pins.length===2);
      if(activeTab==='venue'&&pins.length===2){
        const shots=pins.map(r=>({...p,...r.pose,body:r.body,lens:r.lens,sensor:r.sensor,focal:r.focal,distance:r.distance,aperture:r.apertures[1]}));
        viewA.draw(shots[0]);viewB.draw(shots[1]);
        $('view-a-title').textContent='釘選 A · '+pins[0].lens.name+' / '+fmt(pins[0].distance)+'m';
        $('view-b-title').textContent='釘選 B · '+pins[1].lens.name+' / '+fmt(pins[1].distance)+'m';
      }
      if(activeTab==='perspective'){
        positive(number('compare-focal'));
        const focal=number('compare-focal'),distance=$('perspective-mode').value==='matched'?p.distance*focal/p.focal:p.distance;
        const other={...p,focal,distance};
        viewB.draw(other);
        $('view-b-title').textContent='B · '+fmt(focal)+'mm / '+fmt(distance)+'m · 背景相對比例 '+fmt(perspectiveRatio(distance,p.backgroundGap),3);
        $('view-a-title').textContent+=' · 背景相對比例 '+fmt(perspectiveRatio(p.distance,p.backgroundGap),3);
      }
    }
    if(activeTab==='venue')renderRecommendations(p);
    if(activeTab==='photo')renderPhotoResults(p);
    const params=new URLSearchParams({w:p.sensor.width,h:p.sensor.height,f:p.focal,n:p.aperture,s:p.distance,b:p.distance+p.backgroundGap});
    $('blur-link').href='index.html?'+params+'#calculator';
    lastValid=p;
  }catch(error){$('planner-error').textContent=error.message;$('visuals').hidden=true;$('recommendations-panel').hidden=true;$('photo-result').textContent='請先修正上方設定。';if(playing)stop();}
}
function applyRecommendation(r){
  stop();
  if($('video-mode').value==='s35'&&r.body.id!=='a74')$('video-mode').value='fullvideo';
  $('body').value=r.body.id;populateLenses(r.lens.id);$('lens').value=r.lens.id;
  mode=$('focal-mode').value='actual';$('focal').value=r.focal;
  $('distance').value=r.distance;$('aperture').value=r.apertures[1];
  $('dolly-start').value=r.lens.min;$('dolly-end').value=r.lens.max;$('dolly-distance').value=r.distance;
  render();
}
function renderRecommendations(p){
  const candidates=$('scope').value==='all'?bodies():[p.body];
  recommendations=[];
  for(const body of candidates)for(const lens of library.lenses.filter(l=>l.enabled&&compatible(body,l,$('adapter').checked))){
    // Only A7 IV uses the named S35 mode; other bodies use their native window.
    const opts={...p.opts,videoCrop:$('video-mode').value==='s35'&&body.id!=='a74'?1:p.opts.videoCrop};
    recommendations.push(recommend(body,lens,{...opts,target:p.target,distance:p.distance,near:p.near,far:p.far,ev:p.ev,shutter:p.shutter}));
  }
  recommendations.sort((a,b)=>a.score-b.score);
  $('recommendations').replaceChildren();
  for(const r of recommendations){
    const item=document.createElement('article');item.className='recommendation';
    const text=document.createElement('div'),name=document.createElement('h3'),tag=document.createElement('span'),details=document.createElement('p');
    name.textContent=r.body.name+' / '+r.lens.name;
    tag.className='tag'+(!r.reachable?' bad':'');
    tag.textContent=!r.reachable?'目前範圍無法達成':r.crop>1.01?'需後製裁切 '+fmt(r.crop)+'×':'可達成目標構圖';
    details.textContent='建議 '+fmt(r.focal)+'mm（等效 '+fmt(r.focal*cropFactor(r.sensor))+'mm）／距離 '+fmt(r.distance)+'m；'+(r.movement>=0?'後退 ':'靠近 ')+fmt(Math.abs(r.movement))+'m。ISO '+fmt(r.isos[0],0)+(r.isos[0]!==r.isos[1]?'–'+fmt(r.isos[1],0):'')+'；畫面餘裕 '+fmt(r.margin*100,1)+'%。'+(!r.reachable?' 理想距離 '+fmt(r.idealDistance)+'m。':'')+(r.body.mount==='RF'&&['EF','EF-S'].includes(r.lens.mount)?' 需 EF–EOS R 轉接。':'')+(r.lens.mfd==null?' 最近對焦未核實。':'');
    text.append(name,tag,details);
    const actions=document.createElement('div');actions.className='rec-actions';
    for(const [label,handler] of [['套用',()=>applyRecommendation(r)],['釘選比較',()=>{if(pins.length===2)pins.shift();pins.push(clone({...r,pose:{height:p.height,halfHeight:p.halfHeight,shoulder:p.shoulder,half:p.half,count:p.count,rows:p.rows,gap:p.gap,backgroundGap:p.backgroundGap,head:false,angle:0,position:0}}));renderPins();render();}]]){
      const button=document.createElement('button');button.textContent=label;button.addEventListener('click',handler);actions.append(button);
    }
    item.append(text,actions);$('recommendations').append(item);
  }
}
function renderPins(){
  $('pins').replaceChildren();
  pins.forEach((r,i)=>{const div=document.createElement('div');div.className='pin';const remove=document.createElement('button');remove.textContent='移除';remove.addEventListener('click',()=>{pins.splice(i,1);renderPins();render();});const text=document.createElement('p');text.textContent=(i?'B':'A')+' · '+r.body.name+' / '+r.lens.name+'\n'+fmt(r.focal)+'mm · '+fmt(r.distance)+'m · ISO '+fmt(r.isos[0],0)+'–'+fmt(r.isos[1],0)+' · 裁切 '+fmt(r.crop)+'×（釘選當下快照）';div.append(remove,text);$('pins').append(div);});
}
function renderDolly(p){
  const start=number('dolly-start'),end=number('dolly-end'),distance=number('dolly-distance'),seconds=number('duration');
  positive(start,end,distance,seconds);
  if(p.lens.min===p.lens.max){$('dolly-result').textContent='這是定焦鏡，無法完成純光學 Dolly Zoom。請選擇變焦鏡。';$('play').disabled=$('reverse').disabled=true;$('dolly-path').replaceChildren();return p;}
  $('play').disabled=$('reverse').disabled=false;
  if(start<p.lens.min||end>p.lens.max||end<p.lens.min||start>p.lens.max)throw new Error('Dolly Zoom 起終焦距必須在鏡頭範圍內。');
  const d=dolly(start,end,distance,number('progress'),seconds);
  const bounds=apertureRange(p.lens,d.focal);
  const ns=$('dolly-exposure').value==='fixed'?[p.aperture,p.aperture]:bounds;
  const valid=d.distance>=Math.max(p.near,p.lens.mfd||0)&&d.distance<=p.far;
  $('dolly-result').textContent=fmt(d.focal)+'mm / '+fmt(d.distance)+'m · 移動 '+fmt(d.travel)+'m · 平均 '+fmt(d.speed)+'m/s · ISO '+fmt(exposureISO(ns[0],p.shutter,p.ev),0)+'–'+fmt(exposureISO(ns[1],p.shutter,p.ev),0)+'。'+(valid?'此位置在活動範圍內。':'此位置超出活動／對焦範圍。')+(p.lens.mfd==null?' 最近對焦未核實。':'')+(ns[0]<bounds[1]?' 指定光圈在此焦段可能無法達成，需確認。':'')+'紅色路段不可行；綠色路段依已知條件可行。';
  const svg=$('dolly-path');svg.replaceChildren();
  for(let i=0;i<100;i++){const t=i/99,point=dolly(start,end,distance,t,seconds),ok=point.distance>=Math.max(p.near,p.lens.mfd||0)&&point.distance<=p.far;svg.append(svgElement('rect',{x:20+i*5.6,y:20,width:6,height:20,fill:ok?'#528459':'#c26347'}));}
  svg.append(svgElement('circle',{cx:20+number('progress')*560,cy:30,r:9,fill:'#17211b'}));
  svg.append(svgText(20,70,fmt(distance)+'m → '+fmt(d.endDistance)+'m'));
  return {...p,distance:d.distance,focal:d.focal,aperture:ns[1]};
}
function stop(){playing=false;cancelAnimationFrame(frameRequest);$('play').textContent='播放';}
function play(direction){
  stop();render();
  if($('planner-error').textContent||$('play').disabled)return;
  playing=true;$('play').textContent='播放中';
  let start=performance.now(),initial=number('progress');
  if(direction===1&&initial>=1)initial=0;if(direction===-1&&initial<=0)initial=1;
  const tick=now=>{
    if(!playing)return;
    const value=Math.min(1,Math.max(0,initial+direction*(now-start)/(number('duration')*1000)));
    $('progress').value=value;render();
    if(value===0&&direction===-1||value===1&&direction===1)stop();else if(playing)frameRequest=requestAnimationFrame(tick);
  };frameRequest=requestAnimationFrame(tick);
}
function svgElement(tag,attributes){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attributes))e.setAttribute(k,v);return e;}
function svgText(x,y,text){const e=svgElement('text',{x,y,fill:'#52674d','font-size':13});e.textContent=text;return e;}

// Local photo workflow: decoded oriented image, normalized selection coordinates.
function drawPhoto(){
  const canvas=$('photo-canvas'),c=canvas.getContext('2d');
  if(!currentPhoto){canvas.width=1000;canvas.height=380;c.fillStyle='#e4e6df';c.fillRect(0,0,1000,380);c.fillStyle='#677269';c.font='24px sans-serif';c.fillText('選擇照片後，拖曳框出已知高度的人物區域',50,190);return;}
  const scale=Math.min(1,1600/currentPhoto.width,1600/currentPhoto.height);
  canvas.width=Math.max(1,Math.round(currentPhoto.width*scale));canvas.height=Math.max(1,Math.round(currentPhoto.height*scale));
  c.drawImage(currentPhoto,0,0,canvas.width,canvas.height);
  if(photoBox){const {x,y,w,h}=photoBox;c.fillStyle='#c7ef6333';c.fillRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);c.strokeStyle='#c7ef63';c.lineWidth=4;c.strokeRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);}
}
function photoPoint(event){const r=$('photo-canvas').getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
$('photo-canvas').addEventListener('pointerdown',e=>{if(!currentPhoto)return;photoStart=photoPoint(e);$('photo-canvas').setPointerCapture(e.pointerId);});
$('photo-canvas').addEventListener('pointermove',e=>{
  if(!photoStart)return;const end=photoPoint(e);
  photoBox={x:Math.min(end.x,photoStart.x),y:Math.min(end.y,photoStart.y),w:Math.abs(end.x-photoStart.x),h:Math.abs(end.y-photoStart.y)};
  $('photo-fraction').value=Number((photoBox.h*100).toFixed(3));drawPhoto();render();
});
for(const event of ['pointerup','pointercancel'])$('photo-canvas').addEventListener(event,()=>{photoStart=null;});
$('photo-file').addEventListener('change',async()=>{
  const file=$('photo-file').files[0],id=++photoLoad;if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024){$('planner-error').textContent='請選擇 30MB 以下的 JPEG、PNG 或 WebP；HEIC 請先轉為 JPEG。';return;}
  try{
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    if(id!==photoLoad){bitmap.close();return;}
    currentPhoto?.close();currentPhoto=bitmap;photoBox=null;$('orientation').value=bitmap.width<bitmap.height?'portrait':'landscape';drawPhoto();render();
  }catch{$('planner-error').textContent='照片無法解碼，請轉為 JPEG 後再試。';}
});
$('clear-photo').addEventListener('click',()=>{photoLoad++;currentPhoto?.close();currentPhoto=null;photoBox=null;photoStart=null;$('photo-file').value='';drawPhoto();render();});
function renderPhotoResults(p){
  const hmin=number('photo-hmin')/100,hmax=number('photo-hmax')/100,dmin=number('photo-dmin'),dmax=number('photo-dmax'),fraction=number('photo-fraction')/100;
  positive(hmin,hmax,dmin,dmax,fraction,number('photo-crop'));
  if(hmin>hmax||dmin>dmax||fraction>1||number('photo-crop')<1)throw new Error('照片反推的上下限、佔比或裁切倍率不正確。');
  const unknown=$('photo-crop-known').value==='unknown',crop=unknown?1:number('photo-crop');
  // Fit image aspect to effective sensor, then apply explicitly supplied post crop.
  let w=p.sensor.width,h=p.sensor.height;
  if(currentPhoto){const aspect=currentPhoto.width/currentPhoto.height;if(w/h>aspect)w=h*aspect;else h=w/aspect;}
  h/=crop;
  const base='選取區域 '+fmt(fraction*100,1)+'%；有效成像高度 '+fmt(h)+'mm。';
  const caveat=unknown?' 裁切未知：以下為假設未額外裁切的參考，無法還原原始焦距／距離。':' 中央裁切近似；傾斜人物、透視與非中央裁切會增加誤差。';
  const mode=$('infer-mode').value;
  let result;
  if(mode==='focal')result='估算距離 '+fmt(inferDistance(h,p.focal,hmin,fraction))+'–'+fmt(inferDistance(h,p.focal,hmax,fraction))+'m';
  else if(mode==='distance'){
    const lo=inferFocal(h,dmin,hmax,fraction),hi=inferFocal(h,dmax,hmin,fraction);
    result='實際焦距 '+fmt(lo)+'–'+fmt(hi)+'mm（按目前畫幅等效 '+fmt(lo*cropFactor(p.sensor))+'–'+fmt(hi*cropFactor(p.sensor))+'mm）';
  }else result='焦距與距離不能同時唯一解出。下圖是目前身高區間的可能組合。';
  $('photo-result').textContent=base+result+caveat;
  $('photo-curve').replaceChildren();
  if(mode==='unknown'){
    const points=[10,20,35,50,85,135,200,300];
    const ymax=inferDistance(h,300,hmax,fraction);
    const upper=points.map(f=>[45+f/300*520,180-inferDistance(h,f,hmax,fraction)/ymax*145]);
    const lower=points.map(f=>[45+f/300*520,180-inferDistance(h,f,hmin,fraction)/ymax*145]);
    $('photo-curve').append(svgElement('polygon',{points:[...upper,...lower.reverse()].map(x=>x.join(',')).join(' '),fill:'#a8cf76'}));
    $('photo-curve').append(svgElement('path',{d:'M45 25 V180 H570',fill:'none',stroke:'#52674d'}),svgText(45,210,'實際焦距 0 → 300mm'),svgText(55,20,'距離 0 → '+fmt(ymax)+'m（陰影為高度範圍）'));
  }
}

// Editable local equipment library. Import validation happens before replacement.
function persist(){
  try{localStorage.setItem(key,JSON.stringify(library));storageMessage='已儲存在此瀏覽器。照片不會保存或上傳。';}
  catch{storageMessage='本機儲存不可用；變更只保留本次，請匯出 JSON 備份。';}
  $('storage-status').textContent=storageMessage;
}
function showGear(){
  $('storage-status').textContent=storageMessage;$('gear-list').replaceChildren();$('gear-owner').replaceChildren();
  library.bodies.filter(b=>b.mount==='phone').forEach(b=>option($('gear-owner'),b.id,b.name));
  for(const type of ['bodies','lenses'])for(const item of library[type]){
    const row=document.createElement('div');row.className='gear-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=item.enabled;check.setAttribute('aria-label','啟用 '+item.name);
    check.addEventListener('change',()=>{stop();item.enabled=check.checked;persist();populateBodies();render();});
    const title=document.createElement('span');title.textContent=item.name;
    const edit=document.createElement('button');edit.textContent='編輯';edit.addEventListener('click',()=>editGear(type,item));
    row.append(check,title,edit);$('gear-list').append(row);
  }
}
function editGear(type,item){
  $('gear-type').value=type==='bodies'?'body':'lens';$('gear-type').disabled=true;
  for(const [field,value] of Object.entries({id:item.id,name:item.name,mount:item.mount,owner:item.body||'',width:item.sensor?.width||item.width||36,height:item.sensor?.height||item.height||24,min:item.min||24,max:item.max||70,wide:item.wide||2.8,tele:item.tele||2.8,mfd:item.mfd??'',digital:item.digitalCrop||1}))$('gear-'+field).value=value;
  $('gear-name').focus();
}
function resetEditor(){$('gear-form').reset();$('gear-id').value='';$('gear-type').disabled=false;$('gear-error').textContent='';}
$('gear-form').addEventListener('submit',e=>{
  e.preventDefault();
  try{
    const copy=clone(library),type=$('gear-type').value==='body'?'bodies':'lenses';
    const id=$('gear-id').value||'custom-'+crypto.randomUUID(),old=copy[type].find(x=>x.id===id);
    const entry={id,name:$('gear-name').value.trim(),mount:$('gear-mount').value,enabled:old?.enabled??true};
    if(type==='bodies'){entry.width=number('gear-width');entry.height=number('gear-height');}
    else {
      Object.assign(entry,{min:number('gear-min'),max:number('gear-max'),wide:number('gear-wide'),tele:number('gear-tele'),mfd:$('gear-mfd').value===''?null:number('gear-mfd')});
      if(entry.mount==='phone')Object.assign(entry,{body:$('gear-owner').value,sensor:{width:number('gear-width'),height:number('gear-height')},digitalCrop:number('gear-digital'),estimated:true,kind:'自訂手機鏡頭'});
    }
    if(old)copy[type][copy[type].indexOf(old)]=entry;else copy[type].push(entry);
    library=validateLibrary(copy);persist();populateBodies();showGear();resetEditor();render();
  }catch(error){$('gear-error').textContent=error.message;}
});
$('new-gear').addEventListener('click',resetEditor);
$('open-gear').addEventListener('click',()=>{stop();showGear();$('gear-dialog').showModal();});
$('export-gear').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(library,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='my-camera-library-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import-gear').addEventListener('change',async()=>{
  const file=$('import-gear').files[0];if(!file)return;
  try{if(file.size>1024*1024)throw new Error('器材檔案不可大於 1MB。');const next=validateLibrary(JSON.parse(await file.text()));if(!confirm('匯入會取代目前器材清單，確定？'))return;library=next;persist();populateBodies();showGear();render();$('gear-error').textContent='';}
  catch(error){$('gear-error').textContent=error.message;}
  finally{$('import-gear').value='';}
});
$('reset-gear').addEventListener('click',()=>{if(!confirm('還原為你的初始器材清單？現有自訂項目將被取代，可先匯出備份。'))return;library=clone(defaultLibrary);persist();populateBodies();showGear();resetEditor();render();});

function switchTab(name){
  stop();activeTab=name;
  document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===name));b.tabIndex=b.dataset.tab===name?0:-1;});
  document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!=='panel-'+name);
  render();
}
document.querySelectorAll('[data-tab]').forEach(button=>{
  button.addEventListener('click',()=>switchTab(button.dataset.tab));
  button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const list=[...document.querySelectorAll('[data-tab]')],i=list.indexOf(button),next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;switchTab(list[next].dataset.tab);list[next].focus();});
});
for(const [id,preset] of Object.entries(scenarios))option($('scenario'),id,preset.name);
$('scenario').addEventListener('change',()=>{
  const s=scenarios[$('scenario').value];
  for(const id of ['distance','near','far','count','rows','ev','shutter'])$(id).value=s[id];
  $('shot').value=s.half?'half':'full';$('orientation').value=s.portrait?'portrait':'landscape';render();
});
$('body').addEventListener('change',()=>{stop();populateLenses();selectLens();});
$('lens').addEventListener('change',()=>{stop();selectLens();});
$('adapter').addEventListener('change',()=>{populateLenses();selectLens();});
$('focal-mode').addEventListener('change',()=>{
  if(!getBody()||!getLens()){mode=$('focal-mode').value;render();return;}
  const sensor=effectiveSensor(getBody(),getLens(),sensorOptions());
  const actual=number('focal')/(mode==='equivalent'?cropFactor(sensor):1);mode=$('focal-mode').value;setFocal(actual,sensor);render();
});
$('focal-slider').addEventListener('input',()=>{if(lastValid)setFocal(number('focal-slider'),lastValid.sensor);render();});
$('video-mode').addEventListener('change',()=>{$('video-crop').disabled=$('video-mode').value!=='custom';$('video-crop').value=$('video-mode').value==='s35'?1.5:1;render();});
$('selfie').addEventListener('click',()=>{$('distance').value=.6;$('shot').value='half';$('solve').value='free';$('selfie-distance').value=60;$('selfie-value').value='60 cm';render();});
$('selfie-distance').addEventListener('input',()=>{$('distance').value=number('selfie-distance')/100;$('solve').value='free';$('selfie-value').value=$('selfie-distance').value+' cm';render();});
$('head-demo').addEventListener('click',()=>{$('model').value='head';$('distance').value=.35;mode=$('focal-mode').value='actual';$('focal').value=24;$('compare-focal').value=85;$('perspective-mode').value='matched';$('count').value=$('rows').value=1;render();});
$('compression-demo').addEventListener('click',()=>{$('model').value='body';$('distance').value=3;mode=$('focal-mode').value='actual';$('focal').value=35;$('compare-focal').value=135;$('perspective-mode').value='matched';render();});
const handled=new Set(['body','lens','adapter','focal-mode','focal-slider','video-mode','selfie-distance','scenario','photo-file','clear-photo']);
document.querySelectorAll('.controls input,.controls select,.workspace input,.workspace select').forEach(input=>{
  if(handled.has(input.id))return;
  input.addEventListener('input',()=>{if(playing)stop();render();});
});
$('play').addEventListener('click',()=>play(1));$('reverse').addEventListener('click',()=>play(-1));$('pause').addEventListener('click',stop);
$('refresh-recommendations').addEventListener('click',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
populateBodies('r6');populateLenses('ef24105');
$('scenario').value='travel';
for(const id of ['distance','near','far','count','rows','ev','shutter'])$(id).value=scenarios.travel[id];
if(getLens()){$('dolly-start').value=getLens().min;$('dolly-end').value=getLens().max;}
$('dolly-distance').value=$('distance').value;
drawPhoto();render();
