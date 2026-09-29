import { mean, stddev, round, clamp } from '../utils/random.js';
import { CROPS, CROP_META, CROP_LABELS, criticalMonths } from '../data/cropMeta.js';

function rainfallForMonth(districtRainfall, calendarMonth) {
  // average across the (up to 2) years present in the seed for that calendar month
  const matches = districtRainfall.filter((r) => Number(r.month.slice(5, 7)) === calendarMonth);
  return matches.length ? mean(matches.map((r) => r.rainfall_mm)) : 0;
}

export function computeRainfallRisk(crop, districtRainfall) {
  const meta = CROP_META[crop.crop_name];
  const [m1, m2] = criticalMonths(crop.sowing_month);
  const avgCriticalRainfall = mean([rainfallForMonth(districtRainfall, m1), rainfallForMonth(districtRainfall, m2)]);
  const ratio = meta.criticalMonthWaterNeedMm > 0 ? avgCriticalRainfall / meta.criticalMonthWaterNeedMm : 1;

  let score = 0;
  if (ratio < 0.6) score = 70;
  else if (ratio < 0.8) score = 40;
  else score = 0;

  if (crop.irrigation_type !== 'rainfed') score = Math.min(score, 20);

  return { score, avgCriticalRainfall: round(avgCriticalRainfall, 1), waterNeed: meta.criticalMonthWaterNeedMm, ratio: round(ratio, 2) };
}

export function computePriceRisk(cropName, cropPrices) {
  const prices = cropPrices.filter((p) => p.crop_name === cropName).map((p) => p.price_per_quintal);
  const m = mean(prices);
  const sd = stddev(prices);
  const volatilityPct = m > 0 ? (sd / m) * 100 : 0;

  let score;
  if (volatilityPct < 15) score = 20;
  else if (volatilityPct <= 25) score = 50;
  else score = 80;

  const currentPrice = prices.length ? prices[prices.length - 1] : m;
  return { score, volatilityPct: round(volatilityPct, 1), currentPrice: round(currentPrice) };
}

export function computePestRisk(crop) {
  const meta = CROP_META[crop.crop_name];
  let score = meta.pestBase;
  const offSchedule = crop.sowing_month !== meta.recommendedSowingMonth;
  if (offSchedule) score += 10;
  return { score, offSchedule, recommendedSowingMonth: meta.recommendedSowingMonth };
}

function classify(score) {
  if (score > 60) return 'HIGH';
  if (score >= 35) return 'MODERATE';
  return 'LOW';
}

/**
 * Full risk assessment for one crop entry, plus rule-based recommendations.
 * `allCropsForSameWindow` lets us pick a lower-risk alternative crop for the
 * same sowing window when this one comes back HIGH + rainfed.
 */
export function assessCropRisk(crop, { districtRainfall, cropPrices }) {
  const rainfall = computeRainfallRisk(crop, districtRainfall);
  const price = computePriceRisk(crop.crop_name, cropPrices);
  const pest = computePestRisk(crop);

  const overall = 0.4 * rainfall.score + 0.35 * price.score + 0.25 * pest.score;
  const classification = classify(overall);

  const recommendations = [];

  if (classification === 'HIGH' && crop.irrigation_type === 'rainfed') {
    const alt = findLowerRiskAlternative(crop, { districtRainfall, cropPrices });
    if (alt) {
      recommendations.push(
        `Risk is HIGH on rainfed land. Consider switching to ${CROP_LABELS[alt.crop_name]} for this sowing window — its estimated risk score is lower (${round(alt.overall)} vs ${round(overall)}). Also enroll this plot under PMFBY (Pradhan Mantri Fasal Bima Yojana) crop insurance before the cut-off date.`
      );
    } else {
      recommendations.push(
        'Risk is HIGH on rainfed land. Enroll this plot under PMFBY (Pradhan Mantri Fasal Bima Yojana) crop insurance before the cut-off date.'
      );
    }
  }

  if (price.score >= 50) {
    recommendations.push(
      `Price risk is elevated (volatility ${price.volatilityPct}%). Sell in staggered lots across a few weeks after harvest instead of the whole crop at once, to average out the price swing.`
    );
  }

  if (rainfall.score >= 50 && crop.irrigation_type === 'rainfed') {
    const estimatedLoss = round(crop.expected_yield_quintal * price.currentPrice);
    recommendations.push(
      `Rainfall risk is high for a rainfed plot. Consider investing in supplementary irrigation (borewell/canal access) or switching to a drought-tolerant variety. If the worst seeded rainfall year repeats, the estimated loss on this plot is about ₹${estimatedLoss.toLocaleString('en-IN')}.`
    );
  }

  return {
    cropId: crop.id,
    cropName: crop.crop_name,
    label: CROP_LABELS[crop.crop_name],
    rainfall,
    price,
    pest,
    overall: round(overall, 1),
    classification,
    recommendations,
  };
}

function findLowerRiskAlternative(crop, ctx) {
  const [m1] = criticalMonths(crop.sowing_month);
  let best = null;
  for (const cropName of CROPS) {
    if (cropName === crop.crop_name) continue;
    const meta = CROP_META[cropName];
    // "same sowing window" — recommended sowing month within 1 month of this crop's sowing month
    const diff = Math.min(
      Math.abs(meta.recommendedSowingMonth - crop.sowing_month),
      12 - Math.abs(meta.recommendedSowingMonth - crop.sowing_month)
    );
    if (diff > 1) continue;
    const hypotheticalCrop = { ...crop, crop_name: cropName, sowing_month: meta.recommendedSowingMonth };
    const rainfall = computeRainfallRisk(hypotheticalCrop, ctx.districtRainfall);
    const price = computePriceRisk(cropName, ctx.cropPrices);
    const pest = computePestRisk(hypotheticalCrop);
    const overall = 0.4 * rainfall.score + 0.35 * price.score + 0.25 * pest.score;
    if (!best || overall < best.overall) best = { crop_name: cropName, overall };
  }
  return best;
}

export function incomeConcentrationByCrop(crops, cropPrices) {
  const values = crops.map((c) => {
    const priceInfo = computePriceRisk(c.crop_name, cropPrices);
    return { cropId: c.id, cropName: c.crop_name, label: CROP_LABELS[c.crop_name], value: round(c.expected_yield_quintal * priceInfo.currentPrice) };
  });
  const total = values.reduce((s, v) => s + v.value, 0);
  return values.map((v) => ({ ...v, sharePct: total > 0 ? round((v.value / total) * 100, 1) : 0 }));
}
