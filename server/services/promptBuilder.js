import { adminDb } from '../middleware/auth.js';
import { winemakerKnowledge } from '../data/winemakerKnowledge.js';

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

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// App stores density as g/L (e.g. 1080). Accept SG (e.g. 1.080) too.
function densityAsGL(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return n < 2 ? n * 1000 : n;
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

function isWhiteLike(type) {
  const t = String(type || '').toLowerCase();
  return t.includes('white') || t.includes('rosé') || t.includes('rose') || t.includes('orange') || t.includes('sparkling');
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
    if (e.freeSo2) parts.push(`free SO₂ ${e.freeSo2} ppm`);
    if (e.ph) parts.push(`pH ${e.ph}`);
    return `  - SO₂ addition (${date}): ${parts.join(', ')}${note}`;
  }

  return `  - Note (${date}): ${e.notes || ''}`;
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

function formatWineBlock(wine, entries) {
  const wineEntries = (entries || []).slice(0, 5);
  const header = `Wine: ${wine.name} (${wine.type || ''}, ${wine.grape || ''}, ${
    wine.vintage || ''
  }${wine.volume ? `, ${wine.volume}L` : ''})`;

  if (wineEntries.length === 0) {
    return `${header}\nNo logbook entries yet.`;
  }

  const entryText = wineEntries.map(formatEntry).join('\n');
  const trend = densityTrendLine(wineEntries);
  return `${header}\nRecent logbook entries:\n${entryText}${trend ? `\n${trend}` : ''}`;
}

function computeRiskFlags(wines, entriesByWineId) {
  const risks = [];

  for (const wine of wines || []) {
    const entries = entriesByWineId?.[wine.id] || [];
    if (entries.length === 0) continue;

    const label = wine.name || 'Wine';

    // Latest pH from any typed entry; latest free SO₂ from sulfur entries.
    let latestPh = null;
    let latestFreeSo2 = null;
    for (const e of entries) {
      if (latestPh === null && toNumber(e.ph) !== null) latestPh = toNumber(e.ph);
      if (e.type === 'sulfur' && latestFreeSo2 === null && toNumber(e.freeSo2) !== null) {
        latestFreeSo2 = toNumber(e.freeSo2);
      }
    }

    if (latestPh !== null && latestPh >= 3.6 && latestFreeSo2 !== null && latestFreeSo2 < 20) {
      risks.push(
        `- ${label}: pH ${latestPh} + free SO₂ ${latestFreeSo2} ppm — underprotected`
      );
    }

    const fermWithDensity = entries.filter(
      (e) => e.type === 'fermentation' && densityAsGL(e.density) !== null
    );
    if (fermWithDensity.length >= 2) {
      const newest = densityAsGL(fermWithDensity[0].density);
      const oldest = densityAsGL(fermWithDensity[fermWithDensity.length - 1].density);
      const drop = Math.abs(oldest - newest);
      const latestSugar = toNumber(fermWithDensity[0].sugar);
      const stillSweet =
        (latestSugar !== null && latestSugar > 5) || (newest !== null && newest > 1000);

      if (drop < 5 && stillSweet) {
        const shown = [...fermWithDensity]
          .reverse()
          .map((e) => e.density)
          .join(' → ');
        risks.push(
          `- ${label}: density flat ${shown} — possible stuck / slow fermentation`
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

    const latestSulfur = entries.find((e) => e.type === 'sulfur');
    const hasFermActivity = entries.some((e) => e.type === 'fermentation');
    if (hasFermActivity) {
      if (!latestSulfur) {
        risks.push(`- ${label}: fermentation activity recorded, no SO₂ entry yet — check protection`);
      } else {
        const age = daysSince(entryDate(latestSulfur));
        if (age !== null && age > 30) {
          risks.push(
            `- ${label}: last SO₂ entry ${age} days ago — free SO₂ may be low, measure again`
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

  const risks = computeRiskFlags(wines, entriesByWineId);
  const risksBlock =
    risks.length > 0
      ? `CURRENT RISKS (mention briefly even if user did not ask):\n${risks.join('\n')}\n\n`
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
  - If CURRENT RISKS lists a problem for that wine, mention it in one short sentence even if the user did not ask — then continue answering their question.
  - Prefer the wine the user named. If it is unclear which wine they mean and they have more than one, ask which wine in one short question.
  - If a needed number is missing (e.g. free SO₂ when advising sulfiting), ask one short clarifying question instead of guessing.
  - Stay short: 2–5 sentences. A risk mention must not make the answer chatty.
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
  - Only these may stay in their original form: Brix, pH, YAN, NTU, barrique, Brettanomyces, TCA.
    Explain them briefly in Croatian the first time: "YAN (dostupni dušik za kvasac)".
  - Reread every Croatian answer before sending. Fix anything that looks machine-translated, any
    invented word, any broken sentence. A short correct sentence always beats a long clumsy one.
  - Keep it practical and direct in every language: say what to do, with the numbers.
Your goal: give useful, no-nonsense advice that a small producer can act on immediately.

WINEMAKER: ${profile?.firstName || 'a winemaker'} ${profile?.lastName || ''} — ${
    profile?.wineryName || 'their winery'
  }, ${profile?.region || 'Croatia'}

${risksBlock}WINEMAKER'S CURRENT WINES AND LOGBOOK — USE THESE NUMBERS FIRST:
${wineList || 'No wines added yet.'}

REFERENCE KNOWLEDGE:
${winemakerKnowledge}`;
}

export async function buildSystemPromptForUser(uid) {
  const { profile, wines, entriesByWineId } = await fetchUserContext(uid);
  return buildSystemPromptText(profile, wines, entriesByWineId);
}
