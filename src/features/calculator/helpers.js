export const correctSG = (sg, temp) => {
  const sgDecimal = sg / 1000;
  return sgDecimal + 0.0013 * (temp - 20);
};

export const calculateABV = (ogRaw, ogTemp, fgRaw, fgTemp) => {
  const og = correctSG(ogRaw, ogTemp);
  const fg = correctSG(fgRaw, fgTemp);
  return (og - fg) * 131.25;
};

export const getTargetFreeSO2 = (wineType, pH) => {
  const molecularTarget = wineType === 'red' ? 0.5 : 0.8;
  const ratio = 1 / (1 + Math.pow(10, pH - 1.81));
  return Math.round(molecularTarget / ratio);
};

export const calculateSO2Addition = (targetFree, currentFree, volume, so2Percent) => {
  const so2Needed = targetFree - currentFree;
  if (so2Needed <= 0) return { needed: 0, gPerHl: 0, totalGrams: 0 };
  const gPerHl = (so2Needed * 100) / (so2Percent * 10);
  const totalGrams = gPerHl * (volume / 100);
  return {
    needed: so2Needed,
    gPerHl: Number(gPerHl.toFixed(2)),
    totalGrams: Number(totalGrams.toFixed(1)),
  };
};

