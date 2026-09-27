import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDrink } from '../drink-math.mjs';
const beer = {volume_ml:500, abv_percent:9.9, price_twd:66, sugar_g_100ml:null};
test('matches source sheet reference and uses ethanol density for calories', () => {
  const result = calculateDrink(beer, 1, 75);
  assert.ok(Math.abs(result.grams - 39.0555) < 1e-8);
  assert.ok(Math.abs(result.calories - 273.3885) < 1e-8);
  assert.equal(result.referenceCost, 120);
  assert.equal(result.purchaseCost, 132);
  assert.equal(result.sugarCalories, null);
});
test('sugar, fractional servings, and zero servings', () => {
  const result = calculateDrink({...beer, sugar_g_100ml:5}, 0.5, 75);
  assert.equal(result.sugarCalories, 50);
  assert.equal(result.cost, 33);
  assert.equal(calculateDrink(beer, 0, 75).calories, 0);
});
test('zero alcohol has no reference cost and can have sugar calories', () => {
  const result = calculateDrink({...beer, abv_percent:0, sugar_g_100ml:5}, 1, 75);
  assert.equal(result.calories, 100);
  assert.equal(result.referenceCost, null);
});
test('rejects invalid numbers instead of displaying misleading results', () => {
  for (const change of [{volume_ml:0},{abv_percent:-1},{abv_percent:101},{price_twd:NaN},{sugar_g_100ml:-1}]) assert.throws(() => calculateDrink({...beer,...change},1,75));
  assert.throws(() => calculateDrink(beer,1,0));
  assert.throws(() => calculateDrink(beer,Infinity,75));
});
