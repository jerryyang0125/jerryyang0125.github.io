const sensors = {
  full: { name: '全片幅 36 × 24mm', width: 36, height: 24 },
  medium: { name: '中片幅 44×33 級（43.8 × 32.9mm）', width: 43.8, height: 32.9 },
  half: { name: '135 半格 24 × 18mm', width: 24, height: 18 },
  pentax17: { name: '半格 PENTAX 17（24 × 17mm）', width: 24, height: 17 },
  apsc: { name: 'APS-C 24 × 16mm（1.5×）', width: 24, height: 16 },
  apscCanon: { name: 'Canon APS-C 22.3 × 14.9mm', width: 22.3, height: 14.9 },
  apscSony: { name: 'Sony APS-C（α6700）23.3 × 15.5mm', width: 23.3, height: 15.5 },
  apscFuji: { name: 'Fujifilm APS-C（X-T5）23.5 × 15.7mm', width: 23.5, height: 15.7 },
  apscNikon: { name: 'Nikon DX（Z50）23.5 × 15.7mm', width: 23.5, height: 15.7 },
  phoneTele: { name: '手機 1/3.06" 型（約 4.52 × 3.39mm）', width: 4.51584, height: 3.38688 },
  phoneSuperTele: { name: '手機 1/3.52" 型（約 4.09 × 3.07mm）', width: 4.088, height: 3.066 },
  m43: { name: 'M4/3 17.3 × 13mm', width: 17.3, height: 13 },
  one: { name: '1" 型 13.2 × 8.8mm', width: 13.2, height: 8.8 },
  // Representative active dimensions, not a literal inches-to-mm conversion.
  // Sony LYTIA L910: 12.49mm diagonal, 4:3 aspect ratio.
  phoneMain: { name: '手機 1/1.28" 型（約 9.99 × 7.49mm）', width: 9.992, height: 7.494 },
  // Sony IMX363: 4032 × 3024 pixels at 1.4µm pitch.
  phoneSmall: { name: '手機 1/2.55" 型（約 5.64 × 4.23mm）', width: 5.6448, height: 4.2336 }
};
const $=id=>document.getElementById(id);
const devices = {
  iphone: { name: 'iPhone 15 Pro Max · 5×', sensor: 'phoneTele', focal: 120, aperture: 2.8, mp: 12, source: 'https://support.apple.com/en-ie/111828' },
  samsung: { name: 'Galaxy S23 Ultra · 10×', sensor: 'phoneSuperTele', focal: 230, aperture: 4.9, mp: 10, source: 'https://news.samsung.com/global/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond' },
  full120: { name: '全片幅 · 120mm f/2.8', sensor: 'full', focal: 120, aperture: 2.8 },
  full230: { name: '全片幅 · 230mm f/4.9', sensor: 'full', focal: 230, aperture: 4.9 }
};
const cropFor = sensor => Math.hypot(36, 24) / Math.hypot(sensor.width, sensor.height);
const modes = { a: 'actual', b: 'actual' };
for (const side of ['a', 'b']) {
  const select = $('device-' + side);
  select.add(new Option('自訂設定', ''));
  Object.entries(devices).forEach(([key, device]) => select.add(new Option(device.name, key)));
}
for(const side of ["a","b"]){const select=$(`sensor-${side}`);Object.entries(sensors).forEach(([value,sensor])=>select.add(new Option(sensor.name,value)));}
$("sensor-a").value="full";$("sensor-b").value="apsc";
function read(side) {
  const sensor = sensors[$('sensor-' + side).value];
  const inputFocal = Number($('focal-' + side).value);
  return { ...sensor, sensorName: sensor.name, device: devices[$('device-' + side).value],
    name: $('name-' + side).value || '設定 ' + side.toUpperCase(),
    focal: $('mode-' + side).value === 'equivalent' ? inputFocal / cropFor(sensor) : inputFocal,
    aperture: Number($('aperture-' + side).value),
    subject: Number($('subject-' + side).value) * 1000,
    background: Number($('background-' + side).value) * 1000 };
}
function calculate(x){const diagonal=Math.hypot(x.width,x.height),crop=Math.hypot(36,24)/diagonal,coc=diagonal/1500,hyperfocal=x.focal**2/(x.aperture*coc)+x.focal,near=hyperfocal*x.subject/(hyperfocal+x.subject-x.focal),farDenominator=hyperfocal-x.subject+x.focal,far=farDenominator<=0?Infinity:hyperfocal*x.subject/farDenominator,blurCircle=x.focal**2*(x.background-x.subject)/(x.aperture*x.background*(x.subject-x.focal));return{...x,diagonal,crop,near,far,eqFocal:x.focal*crop,eqAperture:x.aperture*crop,fov:2*Math.atan(x.width/(2*x.focal))*180/Math.PI,blurCircle,normalizedBlur:blurCircle/diagonal,exposure:1/x.aperture**2,totalLight:x.width*x.height/x.aperture**2};}
function ratioText(a,b){const ratio=a/b;if(Math.abs(Math.log2(ratio))<.025)return"兩者近似相同";return ratio>1?`A 是 ${ratio.toFixed(2)}×`:`B 是 ${(1/ratio).toFixed(2)}×`;}
const fmtDistance=mm=>!Number.isFinite(mm)?"∞":mm>=1000?`${(mm/1000).toFixed(2)}m`:`${mm.toFixed(0)}mm`;
const pair=(a,b)=>`A ${a} ／ B ${b}`;
function render(){const a=calculate(read("a")),b=calculate(read("b"));const invalid=[a,b].find(x=>[x.focal,x.aperture,x.subject,x.background].some(v=>!Number.isFinite(v)||v<=0)||x.subject<=x.focal||x.background<=x.subject);document.querySelector('.results').hidden=Boolean(invalid);document.querySelector('.spec-table-wrap').hidden=Boolean(invalid);if(invalid){$("error").textContent="請確認所有數值大於 0、被攝距離大於焦段，而且背景比主體更遠。";return;}$("error").textContent="";
  renderSpecs(a, b);
  $("eq-focal").textContent=pair(`${a.eqFocal.toFixed(1)}mm`,`${b.eqFocal.toFixed(1)}mm`);$("eq-aperture").textContent=pair(`f/${a.eqAperture.toFixed(1)}`,`f/${b.eqAperture.toFixed(1)}`);$("fov").textContent=pair(`${a.fov.toFixed(1)}°`,`${b.fov.toFixed(1)}°`);$("dof").textContent=pair(`${fmtDistance(a.near)}–${fmtDistance(a.far)}`,`${fmtDistance(b.near)}–${fmtDistance(b.far)}`);$("exposure").textContent=ratioText(a.exposure,b.exposure);$("total-light").textContent=ratioText(a.totalLight,b.totalLight);
  const ratio=a.normalizedBlur/b.normalizedBlur,almostSame=Math.abs(Math.log2(ratio))<.04;$("blur-summary").textContent=almostSame?"兩者的背景虛化程度近似":ratio>1?`${a.name} 的背景光斑較大`:`${b.name} 的背景光斑較大`;$("blur-detail").textContent=`感光元件上的模糊圈：A ${a.blurCircle.toFixed(3)}mm、B ${b.blurCircle.toFixed(3)}mm；換算成同尺寸輸出後，${ratioText(a.normalizedBlur,b.normalizedBlur)}。`;
  const maxBlur=Math.max(a.normalizedBlur,b.normalizedBlur),orbSize=value=>54+78*Math.sqrt(value/maxBlur),sizeA=orbSize(a.normalizedBlur),sizeB=orbSize(b.normalizedBlur);document.querySelector(".orb-a").style.cssText=`width:${sizeA}px;height:${sizeA}px`;document.querySelector(".orb-b").style.cssText=`width:${sizeB}px;height:${sizeB}px`;
}
const presets={apsc:{a:["全片幅 50mm f/2.8","full",50,2.8,3,10],b:["APS-C 33mm f/2.8","apsc",33,2.8,3,10]},tele:{a:["24mm f/4","full",24,4,8,30],b:["300mm f/4","full",300,4,8,30]},distance:{a:["5m・24mm","full",24,4,5,15],b:["5m・105mm","full",105,4,5,15]}};
function applyPreset(key) {
  const phonePairs = { phones: ['iphone', 'samsung'], iphoneFull: ['iphone', 'full120'], samsungFull: ['samsung', 'full230'] };
  if (phonePairs[key]) {
    ['a', 'b'].forEach((side, i) => {
      applyDevice(side, phonePairs[key][i]);
      $('subject-' + side).value = 5;
      $('background-' + side).value = 15;
    });
  } else for (const side of ['a', 'b']) {
    const [name, sensor, focal, aperture, subject, background] = presets[key][side];
    Object.entries({name,sensor,focal,aperture,subject,background}).forEach(([field,value]) => $(field + '-' + side).value = value);
    $('device-' + side).value = '';
    $('mode-' + side).value = modes[side] = 'actual';
  }
  render();
}
function applyDevice(side, key) {
  const d = devices[key];
  if (!d) return;
  $('device-' + side).value = key;
  $('name-' + side).value = d.name;
  $('sensor-' + side).value = d.sensor;
  $('focal-' + side).value = d.focal;
  $('aperture-' + side).value = d.aperture;
  $('mode-' + side).value = modes[side] = 'equivalent';
}
function renderSpecs(a, b) {
  $('spec-name-a').textContent = 'A · ' + a.name;
  $('spec-name-b').textContent = 'B · ' + b.name;
  const rows = [
    ['感光元件', x => x.sensorName],
    ['像素數', x => x.device?.mp ? x.device.mp + ' MP' : '未指定'],
    ['裁切倍率（對角線）', x => x.crop.toFixed(2) + '×'],
    ['實際焦距', x => x.focal.toFixed(2) + ' mm'],
    ['全片幅等效焦距', x => x.eqFocal.toFixed(1) + ' mm'],
    ['實際光圈', x => 'f/' + x.aperture.toFixed(1)],
    ['全片幅等效光圈', x => 'f/' + x.eqAperture.toFixed(1)],
    ['入瞳直徑', x => (x.focal / x.aperture).toFixed(2) + ' mm'],
    ['主體／背景距離', x => fmtDistance(x.subject) + ' ／ ' + fmtDistance(x.background)],
    ['背景光斑／輸出對角線', x => (100 * x.normalizedBlur).toFixed(3) + '%']
  ];
  $('spec-body').replaceChildren();
  for (const [label, format] of rows) {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row'; heading.textContent = label; row.append(heading);
    for (const x of [a,b]) { const cell = document.createElement('td'); cell.textContent = format(x); row.append(cell); }
    $('spec-body').append(row);
  }
}
for (const side of ['a', 'b']) {
  $('mode-' + side).addEventListener('change', () => {
    const crop = cropFor(sensors[$('sensor-' + side).value]);
    const value = Number($('focal-' + side).value);
    if (Number.isFinite(value) && value > 0) $('focal-' + side).value = Number((value * (modes[side] === 'actual' ? crop : 1 / crop)).toFixed(6));
    modes[side] = $('mode-' + side).value;
    render();
  });
  $('device-' + side).addEventListener('change', () => { applyDevice(side, $('device-' + side).value); render(); });
  for (const field of ['name','sensor','focal','aperture','subject','background']) {
    $(field + '-' + side).addEventListener('input', () => {
      if (['sensor','focal','aperture'].includes(field)) $('device-' + side).value = '';
      render();
    });
  }
}
$('match-full').addEventListener('click', () => {
  const a = calculate(read('a'));
  if (![a.focal,a.aperture,a.subject,a.background].every(v => Number.isFinite(v) && v > 0) || a.subject <= a.focal || a.background <= a.subject) return;
  $('device-b').value = '';
  $('name-b').value = 'A 的全片幅等效';
  $('sensor-b').value = 'full';
  $('mode-b').value = modes.b = 'equivalent';
  $('focal-b').value = Number(a.eqFocal.toFixed(6));
  $('aperture-b').value = Number(a.eqAperture.toFixed(6));
  $('subject-b').value = a.subject / 1000;
  $('background-b').value = a.background / 1000;
  render();
});
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
render();
