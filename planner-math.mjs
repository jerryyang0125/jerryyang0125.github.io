export const diagonal = s => Math.hypot(s.width, s.height);
export const cropFactor = s => Math.hypot(36, 24) / diagonal(s);
export function positive(...values) {
  if (values.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('請填入有效的正數。');
}
export function compatible(body, lens, adapter = true) {
  if (body.mount === 'phone') return lens.body === body.id;
  return body.mount === lens.mount || (body.mount === 'EF' && lens.mount === 'EF-S') ||
    (body.mount === 'RF' && adapter && ['EF', 'EF-S'].includes(lens.mount));
}
// Body/lens crop and video crop describe overlapping center windows, not cumulative crops.
export function effectiveSensor(body, lens, { videoCrop = 1, extraCrop = 1, ratio = 0, portrait = false } = {}) {
  const source = lens.sensor || body;
  positive(source.width, source.height, videoCrop, extraCrop);
  const mountCrop = body.mount === 'RF' && lens.mount === 'EF-S' ? 1.6 : 1;
  const c = Math.max(mountCrop, videoCrop) * extraCrop * (lens.digitalCrop || 1);
  let width = source.width / c, height = source.height / c;
  if (ratio > 0) {
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
  }
  if (portrait) [width, height] = [height, width];
  return { width, height, crop: c, mountCrop };
}
export function field(sensor, focal, distance) {
  positive(sensor.width, sensor.height, focal, distance);
  return { width: distance * sensor.width / focal, height: distance * sensor.height / focal };
}
export function framing({ height = 1.7, shoulder = .45, count = 1, rows = 1, gap = .25, half = false, halfHeight = .85, fill = .85 }) {
  positive(height, shoulder, count, rows, halfHeight, fill);
  if (fill > 1 || gap < 0) throw new Error('佔比需在 0–100% 之間，間距不可為負。');
  const columns = Math.ceil(count / rows);
  return { height: half ? halfHeight : height, width: columns * shoulder + (columns - 1) * gap, fill };
}
export function distanceFor(sensor, focal, target) {
  return Math.max(focal * target.height / (sensor.height * target.fill), focal * target.width / (sensor.width * target.fill));
}
export function focalFor(sensor, distance, target) {
  return Math.min(distance * sensor.height * target.fill / target.height, distance * sensor.width * target.fill / target.width);
}
export function exposureISO(aperture, denominator, ev) {
  positive(aperture, denominator);
  if (!Number.isFinite(ev)) throw new Error('EV 必須是數字。');
  return 100 * aperture ** 2 * denominator / 2 ** ev;
}
export function apertureRange(lens, focal) {
  if (focal <= lens.min + 1e-6) return [lens.wide, lens.wide];
  if (focal >= lens.max - 1e-6) return [lens.tele, lens.tele];
  return [Math.min(lens.wide, lens.tele), Math.max(lens.wide, lens.tele)];
}
export function recommend(body, lens, options) {
  const sensor = effectiveSensor(body, lens, options);
  const usableNear = Math.max(options.near, lens.mfd || 0.01);
  const anchorDistance = Math.min(options.far, Math.max(usableNear, options.distance));
  const desired = focalFor(sensor, anchorDistance, options.target);
  const focal = Math.min(lens.max, Math.max(lens.min, desired));
  const idealDistance = distanceFor(sensor, focal, options.target);
  const distance = Math.min(options.far, Math.max(usableNear, idealDistance));
  const coverage = field(sensor, focal, distance);
  const actualFill = Math.max(options.target.height / coverage.height, options.target.width / coverage.width);
  const crop = Math.max(1, options.target.fill / actualFill);
  const clipped = actualFill > options.target.fill + 1e-6;
  const outOfFocus = lens.mfd != null && distance < lens.mfd;
  const reachable = !clipped && !outOfFocus && usableNear <= options.far;
  const apertures = apertureRange(lens, focal);
  const isos = apertures.map(n => exposureISO(n, options.shutter, options.ev));
  return { body, lens, sensor, focal, desired, distance, idealDistance, crop, clipped, outOfFocus, reachable, apertures, isos,
    movement: distance - options.distance, margin: 1 - actualFill,
    score: (reachable ? 0 : 1e6) + (crop - 1) * 1e4 + Math.abs(actualFill - options.target.fill) * 1e3 + Math.log2(isos[1]) };
}
export function dolly(startFocal, endFocal, startDistance, progress, seconds) {
  positive(startFocal, endFocal, startDistance, seconds);
  const p = Math.min(1, Math.max(0, progress));
  const endDistance = startDistance * endFocal / startFocal;
  const distance = startDistance + (endDistance - startDistance) * p;
  return { focal: startFocal * distance / startDistance, distance, endDistance, travel: Math.abs(endDistance - startDistance), speed: Math.abs(endDistance - startDistance) / seconds };
}
export function inferDistance(sensorHeight, focal, knownHeight, fraction) {
  positive(sensorHeight, focal, knownHeight, fraction);
  return focal * knownHeight / (sensorHeight * fraction);
}
export function inferFocal(sensorHeight, distance, knownHeight, fraction) {
  positive(sensorHeight, distance, knownHeight, fraction);
  return distance * sensorHeight * fraction / knownHeight;
}
export function perspectiveRatio(distance, backgroundGap) {
  positive(distance); return distance / (distance + backgroundGap);
}
export function validateLibrary(value) {
  if (value?.version !== 1 || !Array.isArray(value.bodies) || !Array.isArray(value.lenses) || !value.bodies.length || !value.lenses.length ||
      value.bodies.length > 100 || value.lenses.length > 300) throw new Error('不是支援的器材庫 v1 檔案。');
  for (const list of [value.bodies, value.lenses]) {
    const ids = new Set();
    for (const item of list) {
      if (typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160 || typeof item.enabled !== 'boolean') throw new Error('器材名稱、ID 或啟用欄位錯誤。');
      ids.add(item.id);
      if (!['EF','EF-S','RF','E','Z','phone'].includes(item.mount)) throw new Error('不支援此接環。');
    }
  }
  value.bodies.forEach(b => positive(b.width, b.height));
  value.lenses.forEach(l => {
    positive(l.min, l.max, l.wide, l.tele);
    if (l.max < l.min || l.mfd != null && (!Number.isFinite(l.mfd) || l.mfd <= 0)) throw new Error('焦段或最近對焦距離錯誤。');
    if (l.sensor) positive(l.sensor.width, l.sensor.height);
    if (l.digitalCrop != null) { positive(l.digitalCrop); if (l.digitalCrop < 1) throw new Error('裁切倍率不可小於 1。'); }
    if (l.mount === 'phone' && (!l.sensor || !value.bodies.some(b => b.id === l.body && b.mount === 'phone'))) throw new Error('手機鏡頭需要有效感光尺寸及所屬手機。');
  });
  return value;
}
