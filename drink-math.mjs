export function calculateDrink({volume_ml, abv_percent, price_twd, sugar_g_100ml}, quantity, weight) {
  const fields = [volume_ml, abv_percent, price_twd, quantity, weight];
  if (fields.some(v => typeof v !== 'number' || !Number.isFinite(v)) || volume_ml <= 0 || volume_ml > 100000 || abv_percent < 0 || abv_percent > 100 || price_twd < 0 || quantity < 0 || quantity > 100 || weight < 20 || weight > 300 || (sugar_g_100ml != null && (!Number.isFinite(sugar_g_100ml) || sugar_g_100ml < 0 || sugar_g_100ml > 100))) throw new Error('請輸入有效範圍內的數值。');
  const alcoholMl = volume_ml * abv_percent / 100;
  const grams = alcoholMl * 0.789 * quantity;
  const alcoholCalories = grams * 7;
  const sugarCalories = sugar_g_100ml == null ? null : volume_ml / 100 * sugar_g_100ml * 4 * quantity;
  const referenceBottles = alcoholMl > 0 ? weight * 1.2 / alcoholMl : null;
  return {grams, alcoholCalories, sugarCalories, calories: alcoholCalories + (sugarCalories ?? 0), cost: price_twd * quantity, referenceBottles, referenceCost: referenceBottles == null ? null : referenceBottles * price_twd, purchaseCost: referenceBottles == null ? null : Math.ceil(referenceBottles) * price_twd};
}
