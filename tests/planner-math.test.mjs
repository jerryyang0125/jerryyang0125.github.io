import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveSensor, cropFactor, compatible, framing, field, distanceFor, focalFor, exposureISO, dolly, inferDistance, inferFocal, perspectiveRatio, recommend, validateLibrary, apertureRange } from '../planner-math.mjs';
import { defaultLibrary } from '../planner-data.mjs';
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps, a+' != '+b);
const full={width:36,height:24,mount:'RF'},lens={min:24,max:105,wide:4,tele:4,mount:'EF'},target=framing({});
test('50mm whole body occupies 85 percent: landscape 4.17m, portrait 2.78m',()=>{
  near(distanceFor(full,50,target),4.166666666666667);
  near(distanceFor({width:24,height:36},50,target),2.777777777777778);
});
test('EF-S and video center windows are not double cropped; aspect and portrait follow',()=>{
  const s=effectiveSensor(full,{mount:'EF-S'},{videoCrop:1.6});
  near(s.width,22.5);near(s.height,15);
  const video=effectiveSensor(full,{mount:'EF-S'},{videoCrop:1.5,ratio:16/9,portrait:true});
  near(video.width,22.5*9/16);near(video.height,22.5);
});
test('phone digital crop preserves actual focal but reduces sensor window once',()=>{
  const p=defaultLibrary.bodies.find(b=>b.id==='ip15');
  const a=defaultLibrary.lenses.find(l=>l.id==='ip15-main'),b=defaultLibrary.lenses.find(l=>l.id==='ip15-2x');
  near(a.min,b.min);near(cropFactor(effectiveSensor(p,b))/cropFactor(effectiveSensor(p,a)),2);
  near(b.min*cropFactor(effectiveSensor(p,b)),48);
});
test('RF on 60D rejected; EF on R6 depends on adapter; phone belongs to body',()=>{
  assert.equal(compatible({mount:'EF'},{mount:'RF'}),false);
  assert.equal(compatible({mount:'RF'},lens,false),false);
  assert.equal(compatible({mount:'RF'},lens,true),true);
  assert.equal(compatible({id:'a',mount:'phone'},{body:'b',mount:'phone'}),false);
});
test('wide group limits framing horizontally',()=>{
  const group=framing({count:8,rows:1});
  const d=distanceFor(full,50,group),f=field(full,50,d);
  assert.ok(d>distanceFor(full,50,target));near(group.width/f.width,.85);
  near(focalFor(full,d,group),50);
});
test('one stop shutter and aperture ISO behavior',()=>{
  const base=exposureISO(2.8,250,8);
  near(exposureISO(2.8,500,8)/base,2);
  near(exposureISO(4,250,8)/base,16/7.84);
});
test('Dolly Zoom keeps subject projected height constant and permits reverse',()=>{
  for(const p of [0,.2,.5,1]){const v=dolly(35,150,3,p,6);near(v.focal/v.distance,35/3);}
  near(dolly(150,35,12,1,6).distance,2.8);
});
test('fixed position relative scale invariant; moving back increases compression',()=>{
  const d=4,gap=10,ratio=perspectiveRatio(d,gap);
  for(const f of [24,85,200])near((f/(d+gap))/(f/d),ratio);
  assert.ok(perspectiveRatio(12,gap)>ratio);
});
test('known photo geometry roundtrips; crop changes inverse result predictably',()=>{
  const fraction=1.7/field(full,50,4).height;
  near(inferDistance(24,50,1.7,fraction),4);near(inferFocal(24,4,1.7,fraction),50);
  near(inferDistance(12,50,1.7,fraction),8);
});
test('recommendations expose crop and unreachable range',()=>{
  const r=recommend(full,lens,{target,distance:50,near:45,far:55,ev:8,shutter:250});
  assert.ok(r.crop>1);assert.ok(r.reachable);
  const close=recommend(full,{...lens,min:200,max:200},{target,distance:1,near:.5,far:2,ev:8,shutter:250});
  assert.equal(close.reachable,false);
});
test('variable aperture endpoints remain exact, unknown intermediate stays bounded',()=>{
  const l={min:35,max:150,wide:2,tele:2.8};
  assert.deepEqual(apertureRange(l,35),[2,2]);assert.deepEqual(apertureRange(l,85),[2,2.8]);assert.deepEqual(apertureRange(l,150),[2.8,2.8]);
});
test('recommendation finds available zoom when current position is outside permitted range',()=>{
  const r=recommend(full,{...lens,max:200},{target,distance:2,near:10,far:12,ev:8,shutter:250});
  near(r.distance,10);near(r.crop,1);assert.equal(r.reachable,true);
});
test('library validation refuses broken import without changing original',()=>{
  validateLibrary(defaultLibrary);
  for(const mutate of [
    x=>x.version=99,x=>x.bodies[0].width=-1,x=>x.lenses[0].max=0,
    x=>x.lenses[0].enabled='yes',x=>x.lenses.push(x.lenses[0]),
    x=>x.lenses.find(l=>l.mount==='phone').body='missing'
  ]){const copy=structuredClone(defaultLibrary);mutate(copy);assert.throws(()=>validateLibrary(copy));}
  assert.equal(defaultLibrary.version,1);
});
