import { adminDb } from '../middleware/auth.js';
import { winemakerKnowledge } from '../data/winemakerKnowledge.js';
import {
  computeFermentationStatus,
  computeSo2Advice,
  densityAsGL,
  isWhiteLike,
  toNumber,
} from './wineMath.js';
import { computeYeastAdvice } from './yeastStrategy.js';

// Ported from src/services/assistant/prompt.js. The server now owns this
// entirely — the client never sends profile/wine/entry data or a system
// prompt; it only sends the verified Firebase ID token, and this module
// fetches everything it needs directly from Firestore using the admin SDK
// (which bypasses the security rules created in Phase 1, by design).

async function fetchUserContext(uid) {
  const userRef = adminDb.collection('users').doc(uid);

  const userSnap = await userRef.get();
  const profile = userSnap.exists ? userSnap.data() : null;

  const winesSnap = await userRef.collection('wines').orderBy('createdAt', 'desc').get();
  const wines = winesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const entriesByWineId = {};
  await Promise.all(
    wines.map(async (wine) => {
      const entriesSnap = await userRef
        .collection('wines')
        .doc(wine.id)
        .collection('entries')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      entriesByWineId[wine.id] = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    })
  );

  return { profile, wines, entriesByWineId };
}

function entryDate(entry) {
  const raw = entry?.createdAt;
  if (!raw || typeof raw !== 'string') return null;
  return raw.slice(0, 10);
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  const t = Date.parse(isoDate);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function formatEntry(e) {
  const date = entryDate(e) || '?';
  const note = e.notes ? `; notes: ${e.notes}` : '';

  if (e.type === 'fermentation') {
    const parts = [
      `temp ${e.temperature ?? '?'}°C`,
      `density ${e.density ?? '?'}`,
      `sugar ${e.sugar ?? '?'}`,
    ];
    if (e.ph) parts.push(`pH ${e.ph}`);
    if (e.yeast) parts.push(`yeast: ${e.yeast}`);
    return `  - Fermentation (${date}): ${parts.join(', ')}${note}`;
  }

  if (e.type === 'sulfur') {
    const parts = [`${e.amount ?? '?'} g/hL`, `product: ${e.product || '?'}`];
    // Labelled as "before" on purpose — this is the reading that prompted the
    // addition, not the level the wine sits at afterwards.
    if (e.freeSo2) parts.push(`free SO₂ before addition ${e.freeSo2} ppm`);
    if (e.ph) parts.push(`pH ${e.ph}`);
    return `  - SO₂ addition (${date}): ${parts.join(', ')}${note}`;
  }

  if (e.type === 'racking') {
    const parts = [];
    if (e.volumeRacked) parts.push(`${e.volumeRacked} L`);
    if (e.lees) parts.push(`off ${e.lees} lees`);
    if (e.vesselTo) parts.push(`into ${e.vesselTo}`);
    if (e.method) parts.push(`by ${e.method}`);
    return `  - Racking (${date}): ${parts.join(', ') || 'no detail'}${note}`;
  }

  if (e.type === 'measurement') {
    const parts = [];
    if (e.ph) parts.push(`pH ${e.ph}`);
    if (e.freeSo2) parts.push(`free SO₂ ${e.freeSo2} ppm`);
    if (e.totalSo2) parts.push(`total SO₂ ${e.totalSo2} ppm`);
    if (e.ta) parts.push(`TA ${e.ta} g/L`);
    if (e.temperature) parts.push(`temp ${e.temperature}°C`);
    return `  - Lab measurement (${date}): ${parts.join(', ') || 'no values'}${note}`;
  }

  return `  - Note (${date}): ${e.notes || ''}`;
}

// Free SO₂ on a measurement entry is where the wine currently sits. The same
// field on a sulfur entry is the reading taken *before* that addition, so it is
// only a fallback — otherwise a wine looks underprotected right after being
// sulfited, which is the opposite of the truth.
function currentFreeSo2(entries) {
  const measured = entries.find(
    (e) => e.type === 'measurement' && toNumber(e.freeSo2) !== null
  );
  if (measured) return toNumber(measured.freeSo2);

  const beforeAddition = entries.find(
    (e) => e.type === 'sulfur' && toNumber(e.freeSo2) !== null
  );
  return beforeAddition ? toNumber(beforeAddition.freeSo2) : null;
}

function densityTrendLine(entries) {
  const ferm = (entries || [])
    .filter((e) => e.type === 'fermentation' && densityAsGL(e.density) !== null)
    .slice(0, 5);
  if (ferm.length < 2) return null;

  // Entries are newest-first; show oldest → newest for a readable trend.
  const chronological = [...ferm].reverse();
  const values = chronological.map((e) => e.density);
  return `  Density trend: ${values.join(' → ')} (last ${values.length})`;
}

function formatMustFacts(wine) {
  const parts = [];
  if (wine.harvestDate) {
    const day = String(wine.harvestDate).slice(0, 10);
    parts.push(`harvest: ${day}`);
  }
  if (wine.brix) parts.push(`Brix ${wine.brix}`);
  if (wine.babo) parts.push(`Babo ${wine.babo}`);
  if (wine.mustPh) parts.push(`must pH ${wine.mustPh}`);
  if (wine.ta) parts.push(`TA ${wine.ta} g/L`);
  if (wine.yan) parts.push(`YAN ${wine.yan}`);
  return parts.length > 0 ? parts.join(', ') : '';
}

function formatWineBlock(wine, entries) {
  const wineEntries = (entries || []).slice(0, 5);
  const must = formatMustFacts(wine);
  const header = `Wine: ${wine.name} (${wine.type || ''}, ${wine.grape || ''}, ${
    wine.vintage || ''
  }${wine.volume ? `, ${wine.volume}L` : ''}${
    wine.vessel ? `, vessel: ${wine.vessel}` : ''
  }${must ? `, ${must}` : ''})`;

  if (wineEntries.length === 0) {
    return `${header}\nNo logbook entries yet.`;
  }

  const entryText = wineEntries.map(formatEntry).join('\n');
  const trend = densityTrendLine(wineEntries);
  return `${header}\nRecent logbook entries:\n${entryText}${trend ? `\n${trend}` : ''}`;
}

// Volume is the only equipment-adjacent signal in the data model, so scale is
// derived from it rather than asked for. Falls back to "small" instead of
// staying silent — the model must never default to top-estate technique.
function computeScaleHint(wines) {
  const volumes = (wines || []).map((w) => toNumber(w.volume)).filter((v) => v !== null && v > 0);

  if (volumes.length === 0) {
    return 'SCALE: unknown — assume a small producer with basic equipment (a gentle press and temperature control may not be available).';
  }

  const total = Math.round(volumes.reduce((sum, v) => sum + v, 0));
  const count = volumes.length;

  let band;
  if (total < 1000) band = 'hobby / very small';
  else if (total < 10000) band = 'small commercial';
  else if (total < 50000) band = 'mid-sized';
  else band = 'larger producer';

  return `SCALE: ~${total} L across ${count} wine${count === 1 ? '' : 's'} — ${band}. Assume basic equipment unless the user says otherwise.`;
}

function latestValue(entries, read) {
  for (const e of entries) {
    const value = read(e);
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

// Runs the same two calculators the model can call as tools, but over the
// logbook, so the numbers are already in the prompt. This is what stops the
// assistant answering "measure your pH and calculate the dose" when the pH is
// sitting right there in the data.
function computeDerivedFacts(wines, entriesByWineId) {
  const lines = [];

  for (const wine of wines || []) {
    const entries = entriesByWineId?.[wine.id] || [];
    if (entries.length === 0) continue;

    const label = wine.name || 'Wine';
    const ferm = entries.filter((e) => e.type === 'fermentation');

    let fermentStatus = null;
    if (ferm.length > 0) {
      // Entries arrive newest-first from Firestore; wineMath expects oldest-first.
      fermentStatus = computeFermentationStatus({
        wineType: wine.type,
        readings: [...ferm].reverse().map((e) => ({
          date: e.createdAt,
          density: e.density,
          temperature: e.temperature,
          sugar: e.sugar,
        })),
      });
      if (fermentStatus.ok) {
        lines.push(`- ${label} — fermentation ${fermentStatus.status.toUpperCase()}: ${fermentStatus.summary}`);
      }
    }

    const ph = latestValue(entries, (e) => toNumber(e.ph));
    if (ph !== null) {
      const latestDensity = ferm.length > 0 ? densityAsGL(ferm[0].density) : null;
      const so2 = computeSo2Advice({
        ph,
        wineType: isWhiteLike(wine.type) ? 'white' : 'red',
        stage: latestDensity !== null && latestDensity > 1005 ? 'fermenting' : 'aging',
        currentFreeSo2: currentFreeSo2(entries),
        volumeL: toNumber(wine.volume),
      });
      if (so2.ok) lines.push(`- ${label} — SO₂: ${so2.summary}`);
    }

    // When ferment is stuck, inject restart yeast context without waiting for a tool call.
    if (
      fermentStatus?.ok &&
      (fermentStatus.status === 'stuck' || fermentStatus.status === 'not_started')
    ) {
      const yeast = computeYeastAdvice({
        grape: wine.grape,
        wineType: wine.type,
        brix: wine.brix,
        babo: wine.babo,
        yan: wine.yan,
        situation: 'stuck_restart',
      });
      if (yeast.ok) {
        lines.push(`- ${label} — YEAST CONTEXT: treat as restart — ${yeast.summary}`);
      }
    }
  }

  return lines;
}

function computeRiskFlags(wines, entriesByWineId) {
  const risks = [];

  for (const wine of wines || []) {
    const entries = entriesByWineId?.[wine.id] || [];
    if (entries.length === 0) continue;

    const label = wine.name || 'Wine';

    const latestPh = latestValue(entries, (e) => toNumber(e.ph));
    const latestFreeSo2 = currentFreeSo2(entries);

    if (latestPh !== null && latestPh >= 3.6 && latestFreeSo2 !== null && latestFreeSo2 < 20) {
      risks.push(
        `- ${label}: pH ${latestPh} + free SO₂ ${latestFreeSo2} ppm — underprotected`
      );
    }

    const fermWithDensity = entries.filter(
      (e) => e.type === 'fermentation' && densityAsGL(e.density) !== null
    );
    if (fermWithDensity.length >= 2) {
      // One source of truth with tools / derived facts — recent-window rate.
      const status = computeFermentationStatus({
        wineType: wine.type,
        readings: [...fermWithDensity].reverse().map((e) => ({
          date: e.createdAt,
          density: e.density,
          temperature: e.temperature,
          sugar: e.sugar,
        })),
      });
      if (
        status.ok &&
        (status.status === 'stuck' ||
          status.status === 'slow' ||
          status.status === 'not_started')
      ) {
        const shown = [...fermWithDensity]
          .reverse()
          .map((e) => e.density)
          .join(' → ');
        risks.push(
          `- ${label}: fermentation ${status.status} (${shown}) — ${status.summary}`
        );
      }
    }

    const latestFerm = entries.find((e) => e.type === 'fermentation');
    if (latestFerm) {
      const temp = toNumber(latestFerm.temperature);
      const dens = densityAsGL(latestFerm.density);
      const whiteLike = isWhiteLike(wine.type);

      if (temp !== null) {
        if (whiteLike && temp > 20) {
          risks.push(`- ${label}: fermentation temp ${temp}°C — hot for white`);
        } else if (!whiteLike && temp > 30) {
          risks.push(`- ${label}: fermentation temp ${temp}°C — hot fermentation`);
        } else if (temp < 12 && dens !== null && dens > 1050) {
          risks.push(
            `- ${label}: fermentation temp ${temp}°C with density ${latestFerm.density} — cold / slow start risk`
          );
        }
      }
    }

    // A lab measurement counts as checking on SO₂ just as much as an addition does.
    const latestSo2Touch = entries.find(
      (e) => e.type === 'sulfur' || (e.type === 'measurement' && toNumber(e.freeSo2) !== null)
    );
    const hasFermActivity = entries.some((e) => e.type === 'fermentation');
    if (hasFermActivity) {
      if (!latestSo2Touch) {
        risks.push(`- ${label}: fermentation activity recorded, no SO₂ entry yet — check protection`);
      } else {
        const age = daysSince(entryDate(latestSo2Touch));
        if (age !== null && age > 30) {
          risks.push(
            `- ${label}: free SO₂ last looked at ${age} days ago — measure again`
          );
        }
      }
    }
  }

  return risks;
}

function buildSystemPromptText(profile, wines, entriesByWineId) {
  const wineList = (wines || [])
    .map((w) => formatWineBlock(w, entriesByWineId?.[w.id]))
    .join('\n\n');

  const scaleHint = computeScaleHint(wines);
  const risks = computeRiskFlags(wines, entriesByWineId);
  const risksBlock =
    risks.length > 0
      ? `CURRENT RISKS (mention briefly even if user did not ask):\n${risks.join('\n')}\n\n`
      : '';

  const derived = computeDerivedFacts(wines, entriesByWineId);
  const derivedBlock =
    derived.length > 0
      ? `ALREADY CALCULATED FROM THE LOGBOOK (use these figures, do not recalculate):\n${derived.join('\n')}\n\n`
      : '';

  return `You are Vinar, a practical AI assistant for small winemakers.
Rules you must always follow:
- Be short and direct. Prefer 2–5 sentences. Never write long paragraphs.
- No fluff, no greetings, no "Great question", no "I'd be happy to help".
- Start with the direct answer or recommendation.
- Use bullet points only when listing clear steps or options.
- Sound like an experienced winemaker giving practical advice in the cellar, not a chatbot.
- You have strong knowledge of Croatian varieties and practices (Plavac Mali, Pošip, Malvazija, Grk, Babić, Teran, etc.), but you also help winemakers from other regions (France, Italy, Australia, Spain, Germany, etc.).
- Adapt advice to the grape variety, climate, and region when the user mentions them.
- LOGBOOK — PRIORITY OVER GENERAL ADVICE:
  - Always start from the user's actual logbook numbers (density, temperature, pH, free SO₂, sugar, yeast) before any general knowledge.
  - Name the wine and quote the relevant values in the answer. Do not give generic advice when numbers exist.
  - Entries come in five kinds: fermentation readings, SO₂ additions, rackings, lab measurements and notes.
    A lab measurement is the current state of the wine. A figure marked "free SO₂ before addition" is the
    reading that triggered that addition, so never treat it as where the wine sits today.
  - Rackings tell you about oxygen exposure and time on lees — use their dates when timing the next step.
  - If CURRENT RISKS lists a problem for that wine, mention it in one short sentence even if the user did not ask — then continue answering their question.
  - Prefer the wine the user named. If it is unclear which wine they mean and they have more than one, ask which wine.
  - Stay short: 2–5 sentences. A risk mention must not make the answer chatty.
- CALCULATIONS:
  - Anything under ALREADY CALCULATED is done — quote those figures, never redo the arithmetic.
  - You have three tools: so2_advice, fermentation_status, and yeast_advice. Use them for numbers
    or yeast decisions the user types in chat that are not already covered in ALREADY CALCULATED
    (e.g. "pH is 3.5, how much for 300 L", "recommend a yeast for my Malvazija").
  - Never invent an SO₂ dose, fermentation verdict, or yeast strategy by hand when a tool or a
    calculated figure covers it.
- YEAST:
  - Prefer a yeast STRATEGY first (neutral/structural vs aromatic thiol/ester vs fresh commercial
    vs high-alcohol restart), then give 1–2 example strains. Never claim one brand is the only correct choice.
  - Use must/harvest fields from the wine header (Brix, Babo, must pH, TA, YAN, harvest) when present.
  - For Grk and premium/structural whites: neutral/structural strategy — do NOT default to QA23 or
    other loud aromatic thiol yeasts.
  - For Graševina, Malvazija, Pošip, Plavac, Teran/Vranac: give practical variety options, not only Grk logic.
  - If fermentation is stuck (or YEAST CONTEXT says restart): restart protocol path — not a normal
    healthy-ferment aromatic pick.
  - If yeast_advice returns ask, or style/conditions are missing and would change the strategy: ask
    ONE short clarifying question (style or temperature control), never a questionnaire.
- THINK ABOUT THE WHOLE PROCESS, NOT JUST THE QUESTION:
  - Work through fruit, equipment, chemistry, timing and the logbook numbers before answering.
    A cellar problem usually starts an earlier step than the one being asked about — if the real
    cause is upstream (hard pressing, no cooling, low YAN, ullage), say so in one short sentence.
  - Give the reason in a few words, never a lecture: what to do now, and the number or symptom it fixes.
- SCALE AND EQUIPMENT:
  - Use the SCALE line above. If scale is unknown, assume a small producer with basic equipment.
  - Never offer top-estate technique (optical sorting, cross-flow filtration, new barrique
    programmes, micro-oxygenation) as the default for a small setup. Prefer what they can actually
    do with what they have.
  - If they mention their press, cooling, tanks or pump, adapt the answer to it explicitly.
- ASK ONE QUESTION, THEN ANSWER:
  - Ask only when the missing fact would genuinely change your recommendation — press type,
    cooling, pH, free SO₂, turbidity method, vessel size, or which wine they mean.
  - One question maximum, never a list. Otherwise state your assumption in half a sentence and
    answer anyway. Never interrogate the user instead of helping them.
- BE HONEST ABOUT LIMITS:
  - Fruit quality, hygiene and process control set the ceiling. Advice cannot replace them.
  - If what they want is not reachable with their fruit or equipment, say so in one sentence, give
    the best result that is reachable, and name the single upgrade that would help most.
  - Never promise a specific score or medal.
- Only give longer explanations if the user explicitly asks for more detail.
- LANGUAGE — STRICT, NO EXCEPTIONS:
  - Answer 100% in the language the user wrote in. Croatian in → Croatian out. English in → English out.
    Never mix two languages in one answer.
  - CROATIAN MUST SOUND NATIVE. Write the way a Croatian winemaker actually talks in the podrum:
    short, plain, grammatically correct sentences. If a sentence would sound strange to a vinar from
    Korčula or Istria, rewrite it before you send it.
  - NEVER translate word for word. The reference knowledge below is written in idiomatic English.
    Say the same thing in natural Croatian instead of tracing the English sentence. English figures of
    speech ("chase the sugar", "won or lost", "the decisive question", "quality dial") must never be
    translated literally — drop the image and state the meaning plainly.
  - Grapes are picked, not reaped: berba, brati, obrati. Never "žetva", "žanjenje", "žanjenju".
  - Never leave an English word sitting in a Croatian sentence. Say "jabučna kiselina" not "malic",
    "vinska kiselina" not "tartaric", "samotok" not "free run", "pretok" not "racking",
    "odležavanje na talogu" not "sur lie", "zastoj vrenja" not "stuck fermentation".
  - Use the simple everyday words small producers use — see CROATIAN WINEMAKING TERMS below.
    Plain and clear always beats technical and impressive.
  - Equipment words too: "pneumatska preša", "rashladni plašt", "inox posuda", "pretok gravitacijom".
    See CELLAR EQUIPMENT in the terms list — never leave the English name in a Croatian sentence.
  - Only these may stay in their original form: Brix, pH, YAN, NTU, barrique, Brettanomyces, TCA.
    Explain them briefly in Croatian the first time: "YAN (dostupni dušik za kvasac)".
  - Reread every Croatian answer before sending. Fix anything that looks machine-translated, any
    invented word, any broken sentence. A short correct sentence always beats a long clumsy one.
  - Keep it practical and direct in every language: say what to do, with the numbers.
Your goal: give useful, no-nonsense advice that a small producer can act on immediately.

WINEMAKER: ${profile?.firstName || 'a winemaker'} ${profile?.lastName || ''} — ${
    profile?.wineryName || 'their winery'
  }, ${profile?.region || 'Croatia'}

${scaleHint}

${derivedBlock}${risksBlock}WINEMAKER'S CURRENT WINES AND LOGBOOK — USE THESE NUMBERS FIRST:
${wineList || 'No wines added yet.'}

REFERENCE KNOWLEDGE:
${winemakerKnowledge}`;
}

export async function buildSystemPromptForUser(uid) {
  const { profile, wines, entriesByWineId } = await fetchUserContext(uid);
  return buildSystemPromptText(profile, wines, entriesByWineId);
}
