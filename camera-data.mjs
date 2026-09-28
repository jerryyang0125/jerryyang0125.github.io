export const sensors = {
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
export const devices = {
  iphone: { name: 'iPhone 15 Pro Max · 5×', sensor: 'phoneTele', focal: 120, aperture: 2.8, mp: 12, source: 'https://support.apple.com/en-ie/111828' },
  samsung: { name: 'Galaxy S23 Ultra · 10×', sensor: 'phoneSuperTele', focal: 230, aperture: 4.9, mp: 10, source: 'https://news.samsung.com/global/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond' },
  full120: { name: '全片幅 · 120mm f/2.8', sensor: 'full', focal: 120, aperture: 2.8 },
  full230: { name: '全片幅 · 230mm f/4.9', sensor: 'full', focal: 230, aperture: 4.9 }
};
