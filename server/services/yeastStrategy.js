// Practical yeast decision helper — strategy first, then 1–2 example strains.
// Used as the yeast_advice tool and (via prompt rules) as the source of truth
// so the model does not invent a single “correct” brand like QA23 for Grk.

import { toNumber } from './wineMath.js';

const STYLE_GOALS = new Set(['aromatic', 'neutral_structural', 'fresh_commercial']);

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function grapeKey(grape) {
  const g = norm(grape);
  if (!g) return null;
  if (g.includes('grk')) return 'grk';
  if (g.includes('malvaz') || g.includes('malvas')) return 'malvazija';
  if (g.includes('posip') || g.includes('poship')) return 'posip';
  if (g.includes('grasevin') || g.includes('welschriesling') || g.includes('riesling italico')) {
    return 'grasevina';
  }
  if (g.includes('plavac') || g.includes('dingac') || g.includes('dinga')) return 'plavac';
  if (g.includes('teran') || g.includes('refosk') || g.includes('refosco')) return 'teran';
  if (g.includes('vranac')) return 'vranac';
  if (g.includes('babic')) return 'babic';
  if (g.includes('marastin')) return 'marastina';
  return 'other';
}

function isWhiteLike(type) {
  const t = norm(type);
  return (
    t.includes('white') ||
    t.includes('bijel') ||
    t.includes('rose') ||
    t.includes('orange') ||
    t.includes('naranc') ||
    t.includes('sparkling') ||
    t.includes('pjenus')
  );
}

function isRedLike(type, key) {
  if (key === 'plavac' || key === 'teran' || key === 'vranac' || key === 'babic') return true;
  const t = norm(type);
  return t.includes('red') || t.includes('crn');
}

/** Rough potential alcohol from Brix (~0.55–0.59); Babo ~ °Oe/scale used locally. */
function estimatePotentialAlcohol({ potentialAlcohol, brix, babo }) {
  const pa = toNumber(potentialAlcohol);
  if (pa !== null) return pa;
  const bx = toNumber(brix);
  if (bx !== null) return Number((bx * 0.57).toFixed(1));
  const bb = toNumber(babo);
  if (bb !== null) return Number((bb * 0.6).toFixed(1));
  return null;
}

function resolveStyleGoal(styleGoal, key, premium) {
  const raw = norm(styleGoal).replace(/-/g, '_');
  if (STYLE_GOALS.has(raw)) return raw;
  if (raw === 'neutral' || raw === 'structural' || raw === 'premium') return 'neutral_structural';
  if (raw === 'fresh' || raw === 'commercial') return 'fresh_commercial';
  if (raw === 'thiol' || raw === 'ester' || raw === 'aromatic_white') return 'aromatic';

  // Variety playbook defaults when style was not stated.
  if (key === 'grk') return 'neutral_structural';
  if (premium && (key === 'grk' || key === 'other')) return 'neutral_structural';
  if (key === 'malvazija' || key === 'posip' || key === 'grasevina' || key === 'marastina') {
    return 'aromatic';
  }
  if (key === 'plavac' || key === 'teran' || key === 'vranac' || key === 'babic') {
    return 'neutral_structural';
  }
  return null;
}

function varietyHasClearPlaybook(key) {
  return (
    key === 'grk' ||
    key === 'malvazija' ||
    key === 'posip' ||
    key === 'grasevina' ||
    key === 'plavac' ||
    key === 'teran' ||
    key === 'vranac' ||
    key === 'babic'
  );
}

function buildRestartAdvice({ yan }) {
  const examples = ['EC-1118', 'Uvaferm 43'];
  const parts = [
    'STRATEGY: high-alcohol restart (not a normal healthy-ferment yeast pick).',
    'Warm to 20–25°C, add yeast hulls, build an alcohol-tolerant starter and blend it into the stuck wine in steps.',
    `Example restart yeasts (not the only options): ${examples.join(', ')}.`,
    'Do not add DAP this late; do not switch to an aromatic premium-white yeast.',
  ];
  const yanNum = toNumber(yan);
  if (yanNum !== null && yanNum < 150) {
    parts.push(`YAN was low (${yanNum}) — nutrition earlier may have contributed; for restart use hulls, not late DAP.`);
  }
  return {
    ok: true,
    strategy: 'high_alcohol_restart',
    examples,
    avoid: ['QA23', 'aromatic thiol yeasts for restart'],
    ask: null,
    summary: parts.join(' '),
  };
}

function pickExamples(strategy, key, highAlcohol) {
  if (strategy === 'neutral_structural') {
    if (key === 'grk') return ['Lalvin CY3079', 'a neutral glycerol-leaning strain'];
    if (isRedLike(null, key) || highAlcohol) {
      return highAlcohol
        ? ['an alcohol-tolerant red strain (e.g. BDX-type)', 'a clean fermenter rated 16%+']
        : ['a clean structural red strain', 'an alcohol-tolerant option if sugar is high'];
    }
    return ['Lalvin CY3079', 'a neutral / low-ester white strain'];
  }
  if (strategy === 'aromatic') {
    if (key === 'malvazija' || key === 'posip') {
      return ['a thiol/ester-enhancing white strain', 'QA23-type only if you want a louder aromatic style'];
    }
    if (key === 'grasevina') {
      return ['a clean ester-forward white strain', 'a cool-ferment aromatic option'];
    }
    return ['an ester/thiol-enhancing white strain', 'a cool-ferment aromatic option'];
  }
  if (strategy === 'fresh_commercial') {
    return ['a fast clean commercial white strain', 'a cool-ferment ester strain'];
  }
  if (strategy === 'alcohol_tolerant_red') {
    return ['an alcohol-tolerant red strain (16%+ rated)', 'a robust fermenter for warm cellars'];
  }
  return ['a clean reliable fermenter'];
}

function strategyFor(key, style, highAlcohol, red) {
  if (key === 'grk') return 'neutral_structural';
  if (red) {
    return highAlcohol ? 'alcohol_tolerant_red' : 'neutral_structural';
  }
  if (style === 'neutral_structural') return 'neutral_structural';
  if (style === 'fresh_commercial') return 'fresh_commercial';
  if (style === 'aromatic') return 'aromatic';
  return 'aromatic';
}

/**
 * @param {object} input
 * @param {string} [input.grape]
 * @param {string} [input.wineType]
 * @param {string} [input.styleGoal] aromatic | neutral_structural | fresh_commercial
 * @param {number|string} [input.potentialAlcohol]
 * @param {number|string} [input.brix]
 * @param {number|string} [input.babo]
 * @param {boolean} [input.tempControl]
 * @param {number|string} [input.yan]
 * @param {string} [input.situation] healthy_start | stuck_restart
 * @param {boolean} [input.premium]
 */
export function computeYeastAdvice(input = {}) {
  const situation = norm(input.situation).replace(/-/g, '_');
  if (situation === 'stuck_restart' || situation === 'stuck' || situation === 'restart') {
    return buildRestartAdvice({ yan: input.yan });
  }

  const key = grapeKey(input.grape);
  const premium = Boolean(input.premium) || norm(input.styleGoal).includes('premium');
  const styleFromUser = STYLE_GOALS.has(norm(input.styleGoal).replace(/-/g, '_'))
    || ['neutral', 'structural', 'premium', 'fresh', 'commercial', 'thiol', 'ester', 'aromatic_white']
      .includes(norm(input.styleGoal).replace(/-/g, '_'));

  const style = resolveStyleGoal(input.styleGoal, key, premium);
  const white = isWhiteLike(input.wineType);
  const red = isRedLike(input.wineType, key);
  const pa = estimatePotentialAlcohol(input);
  const highAlcohol = pa !== null && pa >= 14.5;
  const yanNum = toNumber(input.yan);
  const tempControl = input.tempControl;

  // Missing critical info: no clear variety playbook and no style — ask once.
  if (!styleFromUser && !varietyHasClearPlaybook(key) && !premium) {
    const ask =
      tempControl === undefined || tempControl === null
        ? 'Aromatic/fresh style, or more neutral/structural? (And do you have temperature control?)'
        : 'Aromatic/fresh style, or more neutral/structural?';
    return {
      ok: true,
      strategy: null,
      examples: [],
      avoid: [],
      ask,
      summary: `Need one detail before recommending a yeast strategy: ${ask}`,
    };
  }

  // White without grape and without style — ask style (one question).
  if (!styleFromUser && !key && white) {
    return {
      ok: true,
      strategy: null,
      examples: [],
      avoid: [],
      ask: 'Aromatic/fresh, or neutral/structural?',
      summary: 'Need style before picking a yeast strategy: aromatic/fresh, or neutral/structural?',
    };
  }

  const strategy = strategyFor(key, style || 'aromatic', highAlcohol, red);
  const examples = pickExamples(strategy, key, highAlcohol);
  const avoid = [];
  if (key === 'grk' || (strategy === 'neutral_structural' && premium)) {
    avoid.push('QA23', 'strong aromatic thiol defaults');
  }

  const parts = [];
  const strategyLabel = {
    neutral_structural: 'neutral / structural',
    aromatic: 'aromatic (thiol/ester)',
    fresh_commercial: 'fresh commercial',
    alcohol_tolerant_red: 'alcohol-tolerant red',
  }[strategy] || strategy;

  parts.push(`STRATEGY: ${strategyLabel}.`);

  if (key === 'grk') {
    parts.push('Grk is structural — do not default to loud aromatic yeasts like QA23.');
  } else if (key === 'malvazija') {
    parts.push('Malvazija usually wants clean cool-ferment aromatics unless you asked for a fuller structural style.');
  } else if (key === 'posip') {
    parts.push('Pošip takes aromatic or lightly textured approaches; pick by style goal.');
  } else if (key === 'grasevina') {
    parts.push('Graševina is usually a clean fresh/aromatic program, bottled early.');
  } else if (key === 'plavac') {
    parts.push('Plavac often runs hot and high sugar — favour alcohol-tolerant, clean fermenters.');
  } else if (key === 'teran' || key === 'vranac' || key === 'babic') {
    parts.push('Choose a robust red fermenter; alcohol tolerance if sugar is high.');
  }

  parts.push(`Example strains (not the only options): ${examples.join('; ')}.`);

  if (highAlcohol) {
    parts.push(`Potential alcohol ~${pa}% — prefer alcohol-tolerant options.`);
  }
  if (yanNum !== null && yanNum < 150) {
    parts.push(`YAN ${yanNum} is low — plan two nutrient feeds (~200–250 mg/L target); do not treat brand choice as the fix.`);
  }
  if (tempControl === false) {
    parts.push('No temperature control — prefer a wider-temp robust strain and watch for heat spikes.');
  } else if (tempControl === true && (strategy === 'aromatic' || strategy === 'fresh_commercial')) {
    parts.push('With cooling, aim ~14–17°C for aromatic whites.');
  }

  parts.push('Never treat one brand as the only correct choice.');

  return {
    ok: true,
    strategy,
    examples,
    avoid,
    ask: null,
    summary: parts.join(' '),
  };
}
