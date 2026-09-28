import { sensors, devices } from './camera-data.mjs';
import { cropFactor } from './planner-math.mjs';
export const sources = {
  apple: 'https://support.apple.com/en-au/111829',
  appleMax: 'https://support.apple.com/en-ie/111828',
  samsung: 'https://news.samsung.com/global/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond',
  sony: 'https://www.sony.com/electronics/support/e-mount-body-ilce-7-series/ilce-7m4/specifications',
  canon: 'https://cam.start.canon/en/C004/manual/html/UG-03_Shooting-1_0040.html',
  nikon: 'https://www.nikonusa.com/p/z-fc/1671/overview',
  tamron: 'https://www.tamron.com/jp/consumer/lenses/a058/spec.html'
};
const body = (id,name,mount,width,height) => ({id,name,mount,width,height,enabled:true});
const lens = (id,name,mount,min,max,wide,tele,mfd=null) => ({id,name,mount,min,max,wide,tele,mfd,enabled:true});
const bodies = [
  body('60d','Canon EOS 60D','EF',22.3,14.9),
  body('r6','Canon EOS R6','RF',35.9,23.9),
  body('a74','Sony A7 IV','E',35.9,23.9),
  body('zfc','Nikon Z fc','Z',23.5,15.7),
  body('ip15','iPhone 15 Pro','phone',9.992,7.494),
  body('ipmax','iPhone 15 Pro Max','phone',9.992,7.494),
  body('s23','Galaxy S23 Ultra','phone',9.792,7.344)
];
const lenses = [
  lens('ef2035','EF 20–35mm f/3.5–4.5','EF',20,35,3.5,4.5),
  lens('ef24105','EF 24–105mm f/4L IS USM','EF',24,105,4,4),
  lens('ef70210','EF 70–210mm f/4','EF',70,210,4,4),
  lens('efs18135','EF-S 18–135mm f/3.5–5.6 IS STM','EF-S',18,135,3.5,5.6),
  lens('rf50','RF 50mm f/1.8 STM','RF',50,50,1.8,1.8),
  {...lens('tam35150','Tamron 35–150mm f/2–2.8','E',35,150,2,2.8,.85), mfdNote:'保守採望遠端 0.85m；廣角端官方 0.33m',source:sources.tamron},
  lens('art24','7artisans 24mm f/1.8','E',24,24,1.8,1.8),
  lens('z1650','Z DX 16–50mm f/3.5–6.3 VR','Z',16,50,3.5,6.3)
];
function phone(id, owner, name, sensor, eq, aperture, mp, source, digitalCrop=1, baseEq=eq) {
  const f = baseEq / cropFactor(sensor);
  return {...lens(id,name,'phone',f,f,aperture,aperture),body:owner,sensor:{width:sensor.width,height:sensor.height},
    equivalent:eq,mp,source,digitalCrop,estimated:true,kind:digitalCrop>1?'感光元件裁切':'實體鏡頭'};
}
for (const owner of ['ip15','ipmax']) {
  const source = owner === 'ip15' ? sources.apple : sources.appleMax;
  lenses.push(
    phone(owner+'-uw',owner,'0.5× 超廣角 · 13mm',sensors.phoneSmall,13,2.2,12,source),
    phone(owner+'-main',owner,'1× 主鏡頭 · 24mm',sensors.phoneMain,24,1.78,48,source),
    phone(owner+'-28',owner,'28mm 主鏡頭裁切',sensors.phoneMain,28,1.78,24,source,28/24,24),
    phone(owner+'-35',owner,'35mm 主鏡頭裁切',sensors.phoneMain,35,1.78,24,source,35/24,24),
    phone(owner+'-2x',owner,'2× 主鏡頭裁切 · 48mm',sensors.phoneMain,48,1.78,12,source,2,24),
    phone(owner+'-front',owner,'前鏡頭 · 約 23mm', {width:4.032,height:3.024},23,1.9,12,source)
  );
}
lenses.push(phone('ip15-tele','ip15','3× 望遠 · 77mm',{width:4.032,height:3.024},77,2.8,12,sources.apple));
lenses.push(phone('ipmax-tele','ipmax','5× 望遠 · 120mm',sensors[devices.iphone.sensor],devices.iphone.focal,devices.iphone.aperture,12,sources.appleMax));
const s23main={width:9.792,height:7.344};
lenses.push(
  phone('s23-uw','s23','0.6× 超廣角 · 約 13mm',sensors.phoneSmall,13,2.2,12,sources.samsung),
  phone('s23-main','s23','1× 主鏡頭 · 約 23mm',s23main,23,1.7,200,sources.samsung),
  phone('s23-2x','s23','2× 主鏡頭裁切 · 約 46mm',s23main,46,1.7,null,sources.samsung,2,23),
  phone('s23-3x','s23','3× 望遠 · 約 70mm',sensors.phoneSuperTele,70,2.4,10,sources.samsung),
  phone('s23-10x','s23','10× 望遠 · 230mm',sensors[devices.samsung.sensor],devices.samsung.focal,devices.samsung.aperture,10,sources.samsung),
  phone('s23-front','s23','前鏡頭 · 約 26mm',{width:3.84,height:2.88},26,2.2,12,sources.samsung)
);
export const defaultLibrary = {version:1,bodies,lenses};
// Illustrative planning scenarios, never measurements of actual venues.
export const scenarios = {
  travel:{name:'旅遊／街拍',distance:3,near:1,far:8,count:1,rows:1,ev:12,shutter:250,half:false},
  live:{name:'Live house',distance:8,near:5,far:12,count:1,rows:1,ev:5,shutter:250,half:true},
  outdoor:{name:'戶外舞台',distance:20,near:15,far:30,count:1,rows:1,ev:11,shutter:500,half:false},
  arena:{name:'小巨蛋看台',distance:60,near:55,far:65,count:1,rows:1,ev:7,shutter:500,half:true},
  solo:{name:'單人直拍',distance:15,near:10,far:20,count:1,rows:1,ev:7,shutter:250,half:false,portrait:true},
  group:{name:'團體直拍',distance:15,near:10,far:25,count:5,rows:1,ev:7,shutter:250,half:false},
  sport:{name:'單人比賽',distance:20,near:10,far:35,count:1,rows:1,ev:10,shutter:1000,half:false}
};
