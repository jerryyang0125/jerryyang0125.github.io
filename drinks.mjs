import { calculateDrink } from './drink-math.mjs';
const $ = id => document.getElementById(id);
let catalogue = [];
const money = value => `NT$ ${value.toLocaleString('zh-TW', {maximumFractionDigits: 1})}`;
const number = value => value.toLocaleString('zh-TW', {maximumFractionDigits: 1});
function readDrink() {
  return {volume_ml: Number($('volume').value), abv_percent: Number($('abv').value), price_twd: Number($('price').value), sugar_g_100ml: $('sugar').value === '' ? null : Number($('sugar').value)};
}
function renderComparison(weight) {
  const mode = $('compare-mode').value;
  const entries = catalogue.map(drink => {
    const result = calculateDrink(drink, 1, weight);
    const value = mode === 'calories' ? result.alcoholCalories / drink.volume_ml * 100 : mode === 'price' ? drink.price_twd : result.referenceCost;
    return {drink, value};
  });
  const maximum = Math.max(1, ...entries.map(x => x.value ?? 0));
  $('comparison').replaceChildren();
  for (const {drink, value} of entries) {
    const row = document.createElement('div');
    row.className = `bar-row${drink.id === $('drink-select').value ? ' selected' : ''}`;
    const label = document.createElement('div'); label.className = 'bar-label';
    const name = document.createElement('span'); name.textContent = drink.name;
    const metric = document.createElement('strong'); metric.textContent = value == null ? '不適用（無酒精）' : mode === 'calories' ? `${number(value)} kcal` : money(value);
    label.append(name, metric);
    const track = document.createElement('div'); track.className = 'bar-track'; track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = `${(value ?? 0) / maximum * 100}%`;
    track.append(fill); row.append(label, track); $('comparison').append(row);
  }
}
function render() {
  $('quantity-label').textContent = `${number(Number($('quantity').value))} 份`;
  if (!$('drink-form').checkValidity()) {
    $('drink-error').textContent = '請填入有效數值：容量 1–100,000 ml、濃度 0–100%、價格 0–1,000,000 元、體重 20–300 kg、糖量 0–100 g。';
    $('dashboard').hidden = true; $('comparison').replaceChildren(); return;
  }
  try {
    const drink = readDrink(), quantity = Number($('quantity').value), weight = Number($('weight').value);
    const result = calculateDrink(drink, quantity, weight);
    $('drink-error').textContent = ''; $('dashboard').hidden = false;
    $('calories').textContent = number(result.calories);
    $('alcohol-calories').textContent = `${number(result.alcoholCalories)} kcal`;
    $('sugar-calories').textContent = result.sugarCalories == null ? '未知' : `${number(result.sugarCalories)} kcal`;
    $('alcohol-grams').textContent = number(result.grams);
    $('calorie-mode').textContent = result.sugarCalories == null ? '僅酒精' : '酒精 + 糖分';
    $('calorie-note').textContent = result.sugarCalories == null ? '糖量未知，目前僅估算酒精熱量；不是完整飲品熱量。' : '計入酒精與填入的糖分；其他營養成分未計入。';
    const share = result.calories > 0 ? result.alcoholCalories / result.calories * 100 : 0;
    $('calorie-ring').style.background = result.calories === 0 ? '#edf0e5' : `conic-gradient(#d6ed8a ${share}%, #e9ae88 ${share}%)`;
    $('cost').textContent = money(result.cost);
    $('cost-detail').textContent = `${number(quantity)} 份 × ${money(drink.price_twd)}／份`;
    $('reference-cost').textContent = result.referenceCost == null ? '不適用' : money(result.referenceCost);
    $('reference-detail').textContent = result.referenceCost == null ? '無酒精飲品不適用原表公式。' : `按比例約 ${result.referenceBottles.toFixed(2)} 份；整份買 ${Math.ceil(result.referenceBottles)} 份，共 ${money(result.purchaseCost)}。`;
    renderComparison(weight);
  } catch (error) { $('drink-error').textContent = error.message; $('dashboard').hidden = true; $('comparison').replaceChildren(); }
}
function applyDrink() {
  const drink = catalogue.find(x => x.id === $('drink-select').value);
  if (drink) {
    for (const [field, key] of Object.entries({volume:'volume_ml',abv:'abv_percent',price:'price_twd',sugar:'sugar_g_100ml'})) $(field).value = drink[key] ?? '';
    $('source-note').textContent = `原表參考資料 · 每份 ${number(drink.volume_ml)} ml；可修改下方數值。`;
  } else $('source-note').textContent = '自訂數值僅用於本次計算，不會寫入資料庫。';
  render();
}
function validateCatalogue(data) {
  if (!Array.isArray(data) || !data.length) throw new Error('酒款資料為空');
  const ids = new Set();
  for (const row of data) {
    if (!row || typeof row.id !== 'string' || ids.has(row.id) || row.id === 'custom' || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 120) throw new Error('酒款格式無效');
    calculateDrink(row, 1, 75); ids.add(row.id);
  }
  return data;
}
async function getJson(url, options = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {...options, signal:controller.signal});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return validateCatalogue(await response.json());
  } finally { clearTimeout(timer); }
}
async function load() {
  const config = window.DRINKS_CONFIG ?? {};
  let status = '● 原表快照 · 15 款酒';
  try {
    if (config.supabaseUrl || config.supabasePublishableKey) {
      try {
        const url = new URL(config.supabaseUrl);
        if (url.protocol !== 'https:' || !config.supabasePublishableKey) throw new Error('設定不完整');
        catalogue = await getJson(`${url.origin}/rest/v1/drinks?select=id,name,volume_ml,abv_percent,price_twd,sugar_g_100ml,sort_order&order=sort_order.asc,id.asc`, {headers:{apikey:config.supabasePublishableKey}});
        status = `● Supabase 已連線 · ${catalogue.length} 款酒`;
      } catch {
        catalogue = await getJson('./data/drinks.json');
        status = '○ 資料庫連線失敗 · 使用原表快照';
      }
    } else catalogue = await getJson('./data/drinks.json');
    for (const drink of catalogue) $('drink-select').add(new Option(drink.name, drink.id));
    $('drink-select').value = catalogue[0].id;
    applyDrink();
  } catch { status = '○ 酒款載入失敗 · 可手動輸入'; render(); }
  $('data-status').textContent = status;
}
$('drink-form').addEventListener('submit', event => event.preventDefault());
$('drink-select').addEventListener('change', applyDrink);
$('drink-form').addEventListener('input', event => {
  if (event.target.id === 'drink-select') return;
  if (['volume','abv','price','sugar'].includes(event.target.id)) {
    $('drink-select').value = 'custom'; $('source-note').textContent = '自訂數值僅用於本次計算，不會寫入資料庫。';
  }
  render();
});
$('compare-mode').addEventListener('change', render);
$('reset').addEventListener('click', () => { HTMLFormElement.prototype.reset.call($('drink-form')); if (catalogue.length) $('drink-select').value = catalogue[0].id; applyDrink(); });
render(); load();
