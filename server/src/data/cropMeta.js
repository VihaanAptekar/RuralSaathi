// Embedded per-crop reference tables used by the crop-risk engine.
// Values are illustrative agronomic approximations for a semi-arid
// Maharashtra-style district — good enough for a demo, not agronomy advice.

export const CROPS = ['cotton', 'soybean', 'onion', 'jowar', 'wheat'];

export const CROP_LABELS = {
  cotton: 'Cotton',
  soybean: 'Soybean',
  onion: 'Onion',
  jowar: 'Jowar (Sorghum)',
  wheat: 'Wheat',
};

// recommended sowing month (calendar month, 1-12) and critical-month
// water requirement (mm needed per critical month, i.e. sowing+1, sowing+2)
export const CROP_META = {
  cotton: {
    recommendedSowingMonth: 6, // June (kharif)
    criticalMonthWaterNeedMm: 110,
    pestBase: 60,
    avgPricePerQuintal: 6800,
  },
  soybean: {
    recommendedSowingMonth: 6, // June (kharif)
    criticalMonthWaterNeedMm: 85,
    pestBase: 45,
    avgPricePerQuintal: 4300,
  },
  onion: {
    recommendedSowingMonth: 10, // October (rabi onion)
    criticalMonthWaterNeedMm: 65,
    pestBase: 50,
    avgPricePerQuintal: 1500,
  },
  jowar: {
    recommendedSowingMonth: 10, // October (rabi jowar, drought-hardy — grown on residual soil moisture)
    criticalMonthWaterNeedMm: 20,
    pestBase: 25,
    avgPricePerQuintal: 2800,
  },
  wheat: {
    recommendedSowingMonth: 11, // November (rabi)
    criticalMonthWaterNeedMm: 55,
    pestBase: 30,
    avgPricePerQuintal: 2300,
  },
};

export function criticalMonths(sowingMonth) {
  const m1 = ((sowingMonth) % 12) + 1;
  const m2 = ((sowingMonth + 1) % 12) + 1;
  return [m1, m2];
}
