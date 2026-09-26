const sensors = {
  full: { name: '全片幅 36 × 24mm', width: 36, height: 24 },
  apsc: { name: 'APS-C 24 × 16mm（1.5×）', width: 24, height: 16 },
  apscCanon: { name: 'Canon APS-C 22.3 × 14.9mm', width: 22.3, height: 14.9 },
  m43: { name: 'M4/3 17.3 × 13mm', width: 17.3, height: 13 },
  one: { name: '1" 型 13.2 × 8.8mm', width: 13.2, height: 8.8 },
  // Representative active dimensions, not a literal inches-to-mm conversion.
  // Sony LYTIA L910: 12.49mm diagonal, 4:3 aspect ratio.
  phoneMain: { name: '手機 1/1.28" 型（約 9.99 × 7.49mm）', width: 9.992, height: 7.494 },
  // Sony IMX363: 4032 × 3024 pixels at 1.4µm pitch.
  phoneSmall: { name: '手機 1/2.55" 型（約 5.64 × 4.23mm）', width: 5.6448, height: 4.2336 }
};
const $=id=>document.getElementById(id);
for(const side of ["a","b"]){const select=$(`sensor-${side}`);Object.entries(sensors).forEach(([value,sensor])=>select.add(new Option(sensor.name,value)));}
$("sensor-a").value="full";$("sensor-b").value="apsc";
function read(side){const sensor=sensors[$(`sensor-${side}`).value];return{...sensor,name:$(`name-${side}`).value||`設定 ${side.toUpperCase()}`,focal:Number($(`focal-${side}`).value),aperture:Number($(`aperture-${side}`).value),subject:Number($(`subject-${side}`).value)*1000,background:Number($(`background-${side}`).value)*1000};}
function calculate(x){const diagonal=Math.hypot(x.width,x.height),crop=Math.hypot(36,24)/diagonal,coc=diagonal/1500,hyperfocal=x.focal**2/(x.aperture*coc)+x.focal,near=hyperfocal*x.subject/(hyperfocal+x.subject-x.focal),farDenominator=hyperfocal-x.subject+x.focal,far=farDenominator<=0?Infinity:hyperfocal*x.subject/farDenominator,blurCircle=x.focal**2*(x.background-x.subject)/(x.aperture*x.background*(x.subject-x.focal));return{...x,diagonal,crop,near,far,eqFocal:x.focal*crop,eqAperture:x.aperture*crop,fov:2*Math.atan(x.width/(2*x.focal))*180/Math.PI,blurCircle,normalizedBlur:blurCircle/diagonal,exposure:1/x.aperture**2,totalLight:x.width*x.height/x.aperture**2};}
function ratioText(a,b){const ratio=a/b;if(Math.abs(Math.log2(ratio))<.025)return"兩者近似相同";return ratio>1?`A 是 ${ratio.toFixed(2)}×`:`B 是 ${(1/ratio).toFixed(2)}×`;}
const fmtDistance=mm=>!Number.isFinite(mm)?"∞":mm>=1000?`${(mm/1000).toFixed(2)}m`:`${mm.toFixed(0)}mm`;
const pair=(a,b)=>`A ${a} ／ B ${b}`;
function render(){const a=calculate(read("a")),b=calculate(read("b"));const invalid=[a,b].find(x=>!x.focal||!x.aperture||!x.subject||!x.background||x.subject<=x.focal||x.background<=x.subject);if(invalid){$("error").textContent="請確認所有數值大於 0、被攝距離大於焦段，而且背景比主體更遠。";return;}$("error").textContent="";
  $("eq-focal").textContent=pair(`${a.eqFocal.toFixed(1)}mm`,`${b.eqFocal.toFixed(1)}mm`);$("eq-aperture").textContent=pair(`f/${a.eqAperture.toFixed(1)}`,`f/${b.eqAperture.toFixed(1)}`);$("fov").textContent=pair(`${a.fov.toFixed(1)}°`,`${b.fov.toFixed(1)}°`);$("dof").textContent=pair(`${fmtDistance(a.near)}–${fmtDistance(a.far)}`,`${fmtDistance(b.near)}–${fmtDistance(b.far)}`);$("exposure").textContent=ratioText(a.exposure,b.exposure);$("total-light").textContent=ratioText(a.totalLight,b.totalLight);
  const ratio=a.normalizedBlur/b.normalizedBlur,almostSame=Math.abs(Math.log2(ratio))<.04;$("blur-summary").textContent=almostSame?"兩者的背景虛化程度近似":ratio>1?`${a.name} 的背景光斑較大`:`${b.name} 的背景光斑較大`;$("blur-detail").textContent=`感光元件上的模糊圈：A ${a.blurCircle.toFixed(3)}mm、B ${b.blurCircle.toFixed(3)}mm；換算成同尺寸輸出後，${ratioText(a.normalizedBlur,b.normalizedBlur)}。`;
  const maxBlur=Math.max(a.normalizedBlur,b.normalizedBlur),orbSize=value=>54+78*Math.sqrt(value/maxBlur),sizeA=orbSize(a.normalizedBlur),sizeB=orbSize(b.normalizedBlur);document.querySelector(".orb-a").style.cssText=`width:${sizeA}px;height:${sizeA}px`;document.querySelector(".orb-b").style.cssText=`width:${sizeB}px;height:${sizeB}px`;
}
const presets={apsc:{a:["全片幅 50mm f/2.8","full",50,2.8,3,10],b:["APS-C 33mm f/2.8","apsc",33,2.8,3,10]},tele:{a:["24mm f/4","full",24,4,8,30],b:["300mm f/4","full",300,4,8,30]},distance:{a:["5m・24mm","full",24,4,5,15],b:["5m・105mm","full",105,4,5,15]}};
function applyPreset(key){for(const side of ["a","b"]){const[name,sensor,focal,aperture,subject,background]=presets[key][side];$(`name-${side}`).value=name;$(`sensor-${side}`).value=sensor;$(`focal-${side}`).value=focal;$(`aperture-${side}`).value=aperture;$(`subject-${side}`).value=subject;$(`background-${side}`).value=background;}render();}
document.querySelectorAll("input,select").forEach(element=>element.addEventListener("input",render));document.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>applyPreset(button.dataset.preset)));render();
