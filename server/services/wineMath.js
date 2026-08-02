// Shared winemaking maths, used from two places:
//   - services/promptBuilder.js runs these over the user's logbook so the
//     figures are already in the system prompt before the model sees anything
//   - services/assistantTools.js exposes the same functions as Anthropic tools
//     for numbers the user types in chat that are not in the logbook
// One implementation, so the prompt and the tools can never disagree.

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// App stores density as g/L (e.g. 1080). Accept SG (e.g. 1.080) too.
export function densityAsGL(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return n < 2 ? n * 1000 : n;
}

export function isWhiteLike(type) {
  const t = String(type || '').toLowerCase();
  return (
    t.includes('white') ||
    t.includes('rosé') ||
    t.includes('rose') ||
    t.includes('orange') ||
    t.includes('sparkling')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SO₂
// ─────────────────────────────────────────────────────────────────────────────

const MOLECULAR_TARGET_WHITE = 0.8;
const MOLECULAR_TARGET_RED = 0.5;

// Potassium metabisulfite is ~57% SO₂ by weight.
const KMS_SO2_FRACTION = 0.57;

// Henderson-Hasselbalch for the SO₂ system, pKa 1.81. This reproduces the pH
// table in data/winemakerKnowledge.js exactly (pH 3.0 → 8 ppm, pH 3.6 → 31,
// pH 3.8 → 49 at 0.5 molecular), so there is only one source of truth.
export function requiredFreeSo2(ph, molecularTarget) {
  return molecularTarget * (1 + Math.pow(10, ph - 1.81));
}

function kmsGramsPerHl(ppm) {
  return (ppm / 10) / KMS_SO2_FRACTION;
}

const FERMENTING_STAGES = new Set(['fermenting', 'fermentation', 'ferment']);
const CRUSH_STAGES = new Set(['must', 'crush', 'juice', 'pre_fermentation']);

export function computeSo2Advice({ ph, wineType, stage, currentFreeSo2, volumeL, mlfPlanned } = {}) {
  const phNum = toNumber(ph);
  if (phNum === null) {
    return { ok: false, reason: 'pH is required. Measure pH before deciding an SO₂ dose.' };
  }
  if (phNum < 2.5 || phNum > 4.5) {
    return { ok: false, reason: `pH ${phNum} is outside the plausible range 2.5–4.5. Re-check the meter.` };
  }
  if (!wineType) {
    return { ok: false, reason: 'Wine type is required — the molecular target is 0.8 for whites and 0.5 for reds.' };
  }

  const white = isWhiteLike(wineType);
  const target = white ? MOLECULAR_TARGET_WHITE : MOLECULAR_TARGET_RED;
  const stageKey = String(stage || 'aging').toLowerCase();
  const required = Math.round(requiredFreeSo2(phNum, target));
  const volume = toNumber(volumeL);
  const current = toNumber(currentFreeSo2);

  // No SO₂ during active fermentation — it inhibits the yeast and binds anyway.
  if (FERMENTING_STAGES.has(stageKey)) {
    return {
      ok: true,
      stage: 'fermenting',
      addPpm: 0,
      summary:
        'Fermentation is active — add no SO₂ now. Sulfite at the first racking once fermentation ' +
        `(and MLF, if planned) is finished. At pH ${phNum} that will be about ${required} ppm free SO₂.`,
    };
  }

  // At crush the dose is set by fruit health, not by the molecular target.
  if (CRUSH_STAGES.has(stageKey)) {
    const dose = mlfPlanned ? '20–30' : '30–50';
    const grams = mlfPlanned ? '3.5–5.3' : '5.3–8.8';
    return {
      ok: true,
      stage: 'must',
      summary:
        `At crush use ${dose} mg/L on healthy fruit (about ${grams} g KMS per hL)` +
        `${mlfPlanned ? ', kept low because MLF is planned' : ''}. ` +
        'Go higher only on damaged or botrytis fruit.',
    };
  }

  const gap = current === null ? null : Math.max(0, required - current);
  const addPpm = gap === null ? null : Math.round(gap);

  let summary = `At pH ${phNum} a ${white ? 'white' : 'red'} needs about ${required} ppm free SO₂ to reach ${target} molecular.`;

  if (current === null) {
    summary += ' Measure current free SO₂ before dosing — without it any dose is a guess.';
  } else if (addPpm === 0) {
    summary += ` Currently ${current} ppm, so it is already protected. Do not add.`;
  } else {
    summary += ` Currently ${current} ppm, so add about ${addPpm} ppm (${kmsGramsPerHl(addPpm).toFixed(1)} g KMS per hL`;
    summary += volume === null
      ? ').'
      : `, i.e. ${((kmsGramsPerHl(addPpm) * volume) / 100).toFixed(1)} g for ${volume} L).`;
  }

  if (phNum >= 3.6) {
    summary += ` pH ${phNum} is high — the dose needed is close to the taste threshold, so consider a tartaric correction instead of more SO₂.`;
  }

  return {
    ok: true,
    stage: stageKey,
    ph: phNum,
    wineType: white ? 'white' : 'red',
    molecularTarget: target,
    requiredFreeSo2: required,
    currentFreeSo2: current,
    addPpm,
    kmsGramsPerHl: addPpm === null ? null : Number(kmsGramsPerHl(addPpm).toFixed(2)),
    kmsGramsTotal:
      addPpm === null || volume === null
        ? null
        : Number(((kmsGramsPerHl(addPpm) * volume) / 100).toFixed(1)),
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fermentation status
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(value) {
  if (!value || typeof value !== 'string') return null;
  const t = Date.parse(value.slice(0, 10));
  return Number.isFinite(t) ? t : null;
}

// `readings` are expected oldest-first. Anything with a parseable date is
// sorted regardless, so callers holding newest-first data still get it right.
export function computeFermentationStatus({ readings, wineType } = {}) {
  const rows = (Array.isArray(readings) ? readings : [])
    .map((r) => ({
      day: parseDay(r?.date),
      density: densityAsGL(r?.density),
      temperature: toNumber(r?.temperature),
      sugar: toNumber(r?.sugar),
    }))
    .filter((r) => r.density !== null || r.sugar !== null);

  if (rows.length === 0) {
    return { ok: false, reason: 'No density or sugar readings to work from.' };
  }

  if (rows.every((r) => r.day !== null)) {
    rows.sort((a, b) => a.day - b.day);
  }

  const latest = rows[rows.length - 1];
  const first = rows[0];
  const white = isWhiteLike(wineType);

  let ratePerDay = null;
  let daysObserved = null;
  if (rows.length >= 2 && first.density !== null && latest.density !== null) {
    if (first.day !== null && latest.day !== null) {
      daysObserved = (latest.day - first.day) / DAY_MS;
    }
    const drop = first.density - latest.density;
    if (daysObserved !== null && daysObserved > 0) {
      ratePerDay = drop / daysObserved;
    }
  }

  const density = latest.density;
  const sugar = latest.sugar;
  const stillSweet = (sugar !== null && sugar > 5) || (density !== null && density > 1000);

  let status;
  if ((density !== null && density <= 995) || (sugar !== null && sugar <= 2)) {
    status = 'finished';
  } else if (rows.length < 2 || ratePerDay === null) {
    status = 'unknown';
  } else if (ratePerDay < 1 && stillSweet) {
    status = density !== null && density > 1070 ? 'not_started' : 'stuck';
  } else if (ratePerDay < 5 && stillSweet) {
    status = 'slow';
  } else if (ratePerDay > 25) {
    status = 'too_fast';
  } else {
    status = 'healthy';
  }

  let temperatureNote = null;
  const temp = latest.temperature;
  if (temp !== null) {
    if (white && temp > 20) {
      temperatureNote = `${temp}°C is hot for a white — you are losing aromatics; cool to 15–17°C.`;
    } else if (!white && temp > 30) {
      temperatureNote = `${temp}°C is hot — above 32°C the yeast starts to die; cool to 24–28°C.`;
    } else if (temp < 12 && density !== null && density > 1050) {
      temperatureNote = `${temp}°C is cold for a must at ${Math.round(density)} — warm to about 20°C to get it moving.`;
    }
  }

  const trend = rows
    .filter((r) => r.density !== null)
    .map((r) => Math.round(r.density))
    .join(' → ');

  const parts = [];
  if (trend) parts.push(trend);
  if (daysObserved !== null && daysObserved > 0) {
    parts.push(`over ${daysObserved % 1 === 0 ? daysObserved : daysObserved.toFixed(1)} days`);
  }
  if (ratePerDay !== null) parts.push(`${ratePerDay.toFixed(1)} g/L per day`);
  if (temp !== null) parts.push(`last temp ${temp}°C`);

  const advice = {
    finished: 'Dry — rack off the gross lees and sulfite to the molecular target for its pH.',
    healthy: 'Progressing normally. Keep logging density and temperature daily.',
    slow: 'Slower than it should be. Check temperature and whether nutrients were fed.',
    stuck: 'Treat as stuck: adjust to 20–25°C, add yeast hulls, restart with an alcohol-tolerant yeast built as a starter. Do not add DAP this late.',
    not_started: 'Has not really started. Warm the must to 20°C and pitch properly rehydrated yeast.',
    too_fast: 'Very fast — watch for a temperature spike and the aroma loss that comes with it.',
    unknown: 'Not enough readings to judge the trend. Log density daily.',
  }[status];

  return {
    ok: true,
    status,
    ratePerDay: ratePerDay === null ? null : Number(ratePerDay.toFixed(1)),
    daysObserved,
    latestDensity: density,
    latestSugar: sugar,
    latestTemperature: temp,
    temperatureNote,
    summary: [parts.length > 0 ? `${parts.join(', ')}.` : null, advice, temperatureNote]
      .filter(Boolean)
      .join(' '),
  };
}
