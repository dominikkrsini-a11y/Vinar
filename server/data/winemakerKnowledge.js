// server/data/winemakerKnowledge.js
// Winemaking knowledge base for the AI assistant. This is the only copy that
// reaches the model — it is injected into every request by
// services/promptBuilder.js under "REFERENCE KNOWLEDGE:".
//
// It lives inside server/ because Railway deploys with root directory =
// server/, so nothing outside this folder is reachable at runtime.
//
// Keep it dense: every line costs tokens on every single request.
// Sources: Technical Standards in Viticulture & Oenological Engineering
//          Croatian Oenological & Viticultural Framework

export const winemakerKnowledge = `

═══════════════════════════════════════════════════════
HOW TO USE THIS KNOWLEDGE
═══════════════════════════════════════════════════════

- Adapt, do not recite. Everything below is a reference point, not a recipe. The right answer
  depends on the fruit, the equipment, the vintage and the numbers in the logbook.
- Assume a small producer with basic equipment unless told otherwise. Do not offer top-estate
  technique (optical sorting, cross-flow filtration, new barrique programmes, micro-oxygenation)
  as the default answer for a small or amateur cellar. Raise it only if they ask or clearly have it.
- If a missing fact would change the recommendation (press type, cooling, pH, free SO₂, turbidity
  method, vessel size), ask one short question. Otherwise state the assumption in half a sentence
  and answer anyway.
- Prefer the method they can carry out today over the theoretically best one.
- Say the honest limit when it applies: fruit quality, hygiene and process control set the ceiling,
  and advice cannot lift it on its own.
- Whole-cluster pressing and stem use are never automatic. Stems help drainage but can add
  bitterness and raise pH. For Grk especially, already firm and slightly bitter, treat stems as
  a deliberate choice rather than a habit.

═══════════════════════════════════════════════════════
CROATIAN WINEMAKING TERMS
═══════════════════════════════════════════════════════

Everything below is written in English. When answering a Croatian speaker, use these words
instead — this is what small producers actually say in the cellar. Format: english = hrvatski

grape = grožđe · must = mošt · skins = kožica · stems = peteljke · seeds = sjemenke
crushing = muljanje · destemming = runjenje · maceration / skin contact = maceracija (na kožici)
pressing = prešanje · the press = preša · free run juice = samotok · press fraction = frakcija prešanja
juice settling = taloženje mošta · turbidity = mutnoća
fermentation = vrenje · alcoholic fermentation = alkoholno vrenje · slow start = spor početak vrenja
stuck fermentation = zastoj vrenja · malolactic fermentation = malolaktična (jabučno-mliječna) fermentacija
yeast = kvasac · yeast nutrient = hrana za kvasac · nutrients = hranjiva
cap = klobuk · punch-down = potapanje klobuka · pump-over = prelijevanje (remontaža)
lees = talog (grubi talog / fini talog) · sur lie aging = odležavanje na talogu · bâtonnage = miješanje taloga
racking = pretok (pretakanje) · topping up = nadolijevanje · headspace/ullage = prazan prostor u posudi
sulfiting / SO₂ addition = sumporenje · fining = bistrenje · filtration = filtracija
cold stabilization = hladna stabilizacija · degassing = otplinjavanje
aging / maturation = odležavanje (dozrijevanje) · barrel = bačva · stainless tank = inox posuda (cisterna)
bottling = punjenje u boce · cork = čep · bottle = boca
harvest = berba · yield = prinos (urod) · vine = trs · vineyard = vinograd · cellar = podrum
total acidity = ukupna kiselost · volatile acidity = hlapiva kiselina · residual sugar = neprevreli šećer
density = gustoća · alcohol = alkohol · tannin = tanin · bitterness = gorčina · freshness = svježina
oxidation = oksidacija · reduction = redukcija · off-aroma = strani miris · fault = mana

CELLAR EQUIPMENT (podrumska oprema):
press = preša · pneumatic / bladder press = pneumatska preša · basket press = preša na koš (tijesak)
continuous screw press = pužna (kontinuirana) preša · press pressure = pritisak prešanja
crusher-destemmer = muljača-runjača · pump = pumpa · peristaltic pump = peristaltička pumpa
hose = crijevo · gravity transfer = pretok gravitacijom · cooling = hlađenje
cooling jacket = rashladni plašt · immersion coil = uronjena spirala za hlađenje
cold room = hladnjača · tank / vessel = posuda (cisterna) · stainless tank = inox posuda
variable capacity tank = posuda s plivajućim poklopcem · concrete tank = betonska posuda
inert gas = inertni plin (dušik, argon) · food grade = prehrambena kvaliteta
hygiene = higijena · cleaning = pranje · sanitizing = dezinfekcija

ACIDS AND ADDITIVES:
malic acid = jabučna kiselina · tartaric acid = vinska kiselina · lactic acid = mliječna kiselina
acetic acid = octena kiselina · citric acid = limunska kiselina · sulfur = sumpor · sulfites = sulfiti
copper sulfate = modra galica · bentonite = bentonit · potassium metabisulfite = kalijev metabisulfit

EVERYDAY VERBS (use these, do not invent new ones):
to pick / harvest = brati, obrati · to crush = muljati · to destem = runjiti · to press = prešati
to ferment = vreti (fermentirati) · to rack = pretočiti · to sulfur = sumporiti · to top up = nadoliti
to fine = bistriti · to filter = filtrirati · to stir the lees = miješati talog · to blend = kupažirati
to taste = kušati · to measure = izmjeriti · to cool = ohladiti · to warm = zagrijati · to add = dodati

bench trial / small-scale test = probno bistrenje na malom uzorku (pokus na uzorku)
over-fining = prekomjerno bistrenje · too much bentonite = previše bentonita
fruit set = oplodnja (zametanje ploda) · vigour = bujnost · concentration = koncentracija (punoća)
mouthfeel / texture = tekstura (punoća u ustima) · finish = završetak (u ustima) · body = tijelo

WATCH OUT — these went wrong before:
- Grapes are always "berba" (brati, obrati). Never "žetva" or "žanjenje" — that is for grain.
- "Free run" is "samotok", never "ocjed" or "ocjedak".
- Say "jabučna kiselina", never "malic". Say "vinska kiselina", never "tartaric".
- "Bench trial" is a small test on a sample: "probno bistrenje na malom uzorku".
  Never "klupi test" — "klupa" is a bench you sit on.
- "Heavy fining" means too much of it: "prekomjerno bistrenje" or "previše bentonita".
  Never "teško bistrenje" — that means difficult, not excessive.
- Never invent words like "prebistreni". Say "vino koje je previše bistreno".

NO GOOD CROATIAN EQUIVALENT — keep the original and explain briefly on first use:
Brix, pH, YAN (dostupni dušik za kvasac), NTU (mjera mutnoće), barrique, Brettanomyces, TCA

═══════════════════════════════════════════════════════
CROATIAN REGIONAL TERROIR
═══════════════════════════════════════════════════════

DALMATIA
- Terrain: Karst limestone bedrock, rapid drainage, vines struggle for water/nutrients
- Climate: Mediterranean, intense sun, heat
- Dingač & Postup (Pelješac): "Triple insolation" — direct sun + Adriatic reflection + white rock reflection
  → Plavac Mali reaches extreme sugar/phenolic maturity, often 15–16% vol.
- Key whites: Pošip, Grk, Maraština
- Key reds: Plavac Mali, Babić
- Training: Traditional Gobelet (bush-vine) — short trunk, 3–5 arms, free-standing
  → Reduces evapotranspiration (vital on karst)
  → Canopy shades fruit from intense sun
  → Incompatible with mechanization → fully manual

ISTRIA & KVARNER
- Terrain: Three soil zones:
  → Red Istria (Terra Rossa): Iron-rich red clay, coastal (Poreč, Rovinj) → robust, earthy Teran
  → Gray Istria: Flysch (marl/sand/clay), balanced → aromatic whites
  → White Istria: Thin carbonate soils, north/northeast → mineral, high-acid whites
- Climate: Sub-Mediterranean, moderated by Adriatic + Julian Alps
- Winds: Bura (cold/dry, up to 200 km/h) → natural fungal disease protection
         Maestral (sea breeze) → moderates summer heat, preserves acidity
- Key whites: Malvazija Istarska
- Key reds: Teran, Merlot
- Training: Espalier (Guyot, Spur-Cordon)

SLAVONIA & DANUBE
- Terrain: Loess and alluvial soils, flat to gently rolling, Pannonian Plain
- Climate: Continental — hot dry summers, cold winters
- Key variety: Graševina (Welschriesling) — most planted in Croatia
- Slavonian oak (Quercus robur): World-renowned large aging barrels used in Croatia and Piedmont
- Training: Spur-pruned Cordon (mechanization-friendly)

CROATIAN UPLANDS (Bregovita Hrvatska)
- Districts: Plešivica, Zagorje, Moslavina — surrounds Zagreb
- Climate: Coolest, wettest viticultural zone in Croatia
- Strengths: Sparkling wine (Plešivica), high-acid whites
- Key varieties: Škrlet, Sauvignon Blanc, Pinot Noir, Portugizac
- Training: Guyot — lifts fruiting zone above ground frost, excellent ventilation

TRIBIDRAG: genetic progenitor of Zinfandel (USA) and Primitivo (Italy).

═══════════════════════════════════════════════════════
CROATIAN VARIETY PLAYBOOK
═══════════════════════════════════════════════════════

PLAVAC MALI (red — Dalmatia, Pelješac, Hvar, Brač)
- Harvest: 24–27 Brix typical, finished alcohol 14.5–16% vol.
- Uneven ripening is its defining trait: green, ripe and raisined berries on the same cluster
  → Pick in two passes, or sort on a table; raisins alone can push +1% alcohol
- pH runs high (3.6–3.9) with low TA → correct at crush with tartaric 1–2 g/L to reach pH ≤3.6
  → High pH is the real risk, not sugar: it costs double SO₂ and invites Brett/lactic spoilage
- Ferment 24–28°C. Watch the peak — high sugar + high temp is the classic stuck-fermentation setup
  → Choose an alcohol-tolerant yeast (16%+ rated) and feed nutrients in two doses
- Maceration: modern 7–14 days (fresher dark fruit, mineral nuance);
  traditional 20–30 days (robust, tannic "wall-of-flavor" style)
- Aging: large Slavonian oak (500–2000 L), 12–24 months; small new barrels cover the fruit
- Top Dingač/Postup ages 20+ years → leather, cedar, dried figs
- COMMON MISTAKES: picking on sugar alone and ignoring pH; skipping the tartaric correction at
  pH 3.7+; letting the peak run past 30°C with no cooling; adding DAP once the ferment is
  already stalling instead of feeding early in two doses

BABIĆ (red — Primošten, Šibenik karst)
- Holds acidity better than Plavac Mali; naturally deep color and firm tannin
- Harvest: 23–25 Brix, TA 5.5–6.5 g/L — do not let it overripen, it loses its freshness
- Ferment 24–26°C; extract gently — pump-over or light punch-down, avoid délestage
- Maceration 7–12 days. Its tannin turns aggressive and drying with long skin contact
- Press early and finish tannin in barrel: 12 months oak + 6 months bottle before release

TERAN (red — Istria, Terra Rossa)
- Harvest: 22–24 Brix; naturally very high malic acid and low pH (3.1–3.4), high anthocyanin/iron
- MLF is not optional — run full MLF to drop TA and soften; expect TA to fall 1–2 g/L
- Ferment 22–25°C; short maceration 5–8 days — long maceration turns the tannin harsh and green
- Reductive tendency: rack with aeration at the first sign of H₂S; do not leave long on gross lees
- Low pH is an advantage: target molecular SO₂ is reached at a low dose (see SO₂ table)

VRANAC (red — south Dalmatia, Montenegro border country)
- Style goal: deep colour, firm tannin, dark fruit — structure without drying the mouth
- Harvest: 23–25 Brix; ripens in heat, so check pH as well as sugar. pH often 3.6+ → correct with
  tartaric at crush; at that pH the SO₂ dose from the table roughly doubles and Brett risk rises
- Ferment 24–27°C; keep the peak below 30°C or the ferment stalls with sugar still left
- Yeast strategy: clean alcohol-tolerant red strain when potential alcohol is 14.5%+, nutrients
  in two doses. No aromatic white-style strains
- Maceration 7–12 days is enough; the tannin is already firm
- COMMON MISTAKE: over-extraction — long maceration plus hard pressing gives a hard, drying wine

MALVAZIJA ISTARSKA (white — Istria)
- Decide the style before harvest — fresh, aged on lees, or amber. It changes picking date,
  yeast and SO₂ handling
- Harvest: 20–22.5 Brix for the fresh style, TA 6–7 g/L, pH 3.2–3.4; thin-skinned and
  oxidation-prone. For the aged or amber style pick a few days later, but not past TA 5.5 g/L
- Protect from O₂ before fermentation: 30–40 mg/L SO₂ at crush, dry ice or inert gas on the must
- Settle juice cold (10–12°C, 12–24h) before racking to ferment
- Three styles:
  1. Fresh: stainless steel, 15–18°C → acacia flower, green apple
  2. Aged: fine lees in large oak or acacia barrels 6–12 months + bâtonnage → creamy, oily texture
  3. Orange/Amber: extended skin contact (weeks to months) in open vats or qvevri (clay amphorae)
     → white wine acidity + red wine structure; thick skins make stable low-sulfur wine possible
- Short 12–48h skin contact is a middle path for texture without going full amber
- Yeast strategy: aromatic thiol/ester strain for the fresh style; a more neutral strain for the
  aged and amber styles, where texture and lees do the work
- SO₂ discipline matters more here than on a thick-skinned white: keep free SO₂ at the molecular
  target for its pH from the first racking, and keep vessels topped up — ullage browns it fast
- Block MLF for the fresh style; it costs the acidity that carries the aroma
- COMMON MISTAKES: settling warm; pressing hard for extra juice (phenolic bitterness);
  fermenting above 18°C in the fresh style and losing the aromatics; long skin contact on
  low-acid fruit, which gives a flat amber wine

POŠIP (white — Korčula, Pelješac, wider Dalmatia)
- Harvest: 21–23 Brix, keep TA ≥5.5 g/L. Acid collapses fast in the last week
  → Pick at dawn, check TA every 2 days near the end, not just sugar
- Whole-cluster press; cut the press at 1.2–1.5 bar — hard pressing brings phenolic bitterness
- Ferment 15–17°C. Aromatic but fuller-bodied than Malvazija; carries texture work well
- Sur lie 3–6 months with weekly bâtonnage → almond, dried apricot, broader mid-palate
- Handles a small share of large-barrel aging (20–30% of blend) without losing varietal character

GRK (white — Lumbarda, Korčula)
Structural white, not an aromatic one — quality comes from texture and extract.
- Functionally female flowers: it needs a pollinator planted among the vines, traditionally
  Plavac Mali at 10–15% within a few rows. A block of Grk alone sets almost no fruit
- Poor, uneven fruit set is normal — sort, or pick in two passes
- The deep Lumbarda sand is ungrafted and low in nitrogen: YAN is often below 150 mg/L.
  Measure it and feed organic nitrogen in two doses to about 200–250 mg/L
- Yield decides quality: 1.5–2.5 kg per vine, 35–45 hL/ha for the top wines
- Harvest on acidity, not sugar: 21.5–23 Brix, TA 6–7 g/L, pH 3.15–3.30. Past ~14% alcohol it
  loses freshness and the bitterness turns harsh. Malic drops fast in the last 10 days of heat —
  sample every 2 days from 21 Brix, and track pH (sand potassium raises it while TA still looks fine)
- Pick at night or early morning, fruit to the press below 15°C
- Pressing decides the wine: skin contact only on purpose (2–6h cold at 8–10°C, or none) —
  warm maceration past ~12h gives harsh phenolics no fining will remove. Destem unless the stems
  are fully brown and ripe. Free run plus light pressing to 0.6–0.8 bar is the best juice; stop at
  1.0–1.2 bar; keep fractions separate and taste before blending; aim 55–60% juice
- Settle cold to 80–150 NTU — cleaner than that ferments slowly and gives a thin wine
- Bitterness: a firm, slightly bitter finish is correct. Soften it with lees and time, not fining.
  PVPP 5–15 g/hL only if truly needed, bench-tested first. Heavy bentonite, casein or gelatin
  strip the character permanently
- Ferment 15–17°C (below 14°C brings banana/pear that covers the vineyard). Neutral / structural
  yeast strategy that supports glycerol and texture; loud thiol/ester strains (QA23-style defaults)
  do not suit premium Grk. Examples only, never one brand as the only correct choice
- A slow 3–4 week ferment gives body, but low YAN plus phenolics plus low temperature can stall it
- Lees ageing 6–12 months is the biggest improvement; stir gently every 2–3 weeks, then monthly.
  Age in large neutral wood (500–2500 L), concrete or amphora — new barrique covers the salty,
  mineral character. Best wines need 2–3 years in bottle and can hold 10+
- COMMON MISTAKES: picking by sugar alone; pressing too hard for more juice; fining out the
  bitterness; treating it like Pošip (aromatic, bottled early), which wastes its structure

GRAŠEVINA (white — Slavonia)
- Neutral-to-floral, high yielding, very adaptable. Style goal is clean fruit and acidity,
  not weight — a dry, fresh wine bottled young, or a late-harvest sweet style
- Harvest: 19–21 Brix for dry style, TA 6.5–8 g/L, pH 3.1–3.3; can be picked late for sweet styles
- Yield is the quality dial: it crops heavily and dilutes. Thin to keep flavour and acidity,
  or accept a simple wine
- Ferment 14–17°C, stainless steel, bottle early
- Yeast strategy: clean fresh/aromatic white strain, cool ferment. No structural or high-extract
  programme — there is nothing for it to carry
- Block MLF for the dry style; the acidity is the wine's backbone
- pH is usually friendly, so the SO₂ dose from the table is modest — but check TA and free SO₂
  before bottling, because a low-alcohol fresh white shows oxidation quickly
- Its strength is clean fruit and acidity — heavy lees or oak work usually costs more than it adds
- COMMON MISTAKES: picking late chasing sugar and losing the acidity that defines it; oak or heavy
  lees work on a fruit-driven wine; bottling with too little free SO₂; carrying a big crop and
  then trying to fix the thin result in the cellar

═══════════════════════════════════════════════════════
EQUIPMENT REALITY — WHAT THE GEAR DECIDES
═══════════════════════════════════════════════════════

Match advice to what the winemaker can actually do. Equipment sets the ceiling on quality
more than technique does.

PRESS (the biggest quality lever for whites):
- Free run juice is always the cleanest fraction. Light pressing to 0.6–0.8 bar stays clean.
- Above roughly 1.2 bar the juice carries harsh phenolics, more potassium and higher pH.
  You gain volume and lose quality — rarely worth it for a wine you care about.
- Keep fractions separate, taste them, then decide what goes into the good wine.
  Aim for 55–60% juice off the total weight, not 70% or more.
- Bladder (pneumatic) press: gentle and controllable — the practical choice for quality whites.
- Basket press: gentle if filled shallow and pressed slowly, but slow and labour-heavy.
- Continuous screw press: fast and harsh. Send its fractions to bulk wine, not the top cuvée.
- Bad pressing shows as bitterness, grip and browning that no fining will fully remove.

PUMPS AND TRANSFERS:
- Gravity beats every pump. If the cellar layout allows it, move wine by gravity.
- Peristaltic (hose) pump: gentle, handles must and lees well.
- Centrifugal pump: fast, but shears the lees and pulls in oxygen.
- Every transfer costs a little aroma and picks up oxygen. Move the wine fewer times,
  and fill vessels slowly from the bottom instead of splashing.

COOLING (decides whether white winemaking works at all):
- Without cooling you cannot settle juice cold, cannot hold 15–17°C, and cannot stop a
  temperature spike — the classic setup for a stuck fermentation.
- Options, best to simplest: glycol jacket on the tank, immersion coil in the tank,
  cold room for the whole vessel, or picking at night and working with cold fruit.
- With no cooling at all: pick at night, ferment in the smallest vessels you have (they lose
  heat faster), work in the coolest corner of the cellar, and accept a fuller style.

TANKS AND VESSELS:
- Cleanability first. A tank you cannot clean properly will eventually spoil a vintage.
- Variable capacity (floating lid) tanks solve topping up in a small cellar — usually the
  cheapest real quality upgrade for someone with part-full vessels.
- Small vessels have more surface per litre: they oxidise and swing in temperature faster.
  Top up and check them more often than a big tank.
- Inert gas (nitrogen or argon) on the headspace is worth more than an extra SO₂ addition.
- Stainless is neutral and cleanable; concrete holds temperature steady; plastic is short term
  only and must be food grade.

HONEST LIMIT — SAY THIS WHEN IT MATTERS:
Without a gentle press and some temperature control, top quality is much harder. Careful work,
clean fruit and good hygiene close part of the gap, not all of it. Do not promise a 96-point wine
from equipment that cannot deliver it. Say what the realistic ceiling is, and which single
upgrade would move it most.

═══════════════════════════════════════════════════════
PROCESS CHEMISTRY — WHAT ACTUALLY DRIVES DECISIONS
═══════════════════════════════════════════════════════

The numbers live in the tables below. This is the reasoning that decides which number matters.

pH IS THE MASTER VARIABLE:
- It sets how much free SO₂ you need for real protection (see SO₂ MANAGEMENT — pH TABLE).
  A white at pH 3.2 is protected by about 20 ppm; at pH 3.6 it takes about 50 ppm for the same
  effect, and that you can taste. High pH costs money and sensory quality at once.
- It sets microbial risk: above pH 3.6, Brett and lactic spoilage become likely.
- It drives colour and ageing in reds, freshness in whites.
- TA and pH are not the same thing. Potassium-rich soils give decent TA with high pH.
  Ask for pH, not only total acidity.

FREE SO₂:
- Measure before every addition. Dosing off a schedule without measuring is guessing.
- Stage targets are in DOSING BY STAGE. What protects the wine is the molecular target,
  not a fixed ppm — that is exactly why the dose depends on pH.

YAN (yeast assimilable nitrogen):
- Low YAN is the most common cause of a slow start, H₂S and stuck fermentation.
- Below about 150 mg/L expect trouble; feed in two doses (see YEAST NUTRITION).
- Sandy, low-vigour vineyards are usually low in YAN — Grk at Lumbarda is the classic case.

MALIC ACID AND THE MLF DECISION:
- High malic with low pH (Teran, cool vintages) → run MLF; it softens and stabilises.
- Whites you want crisp (Malvazija, Pošip, Graševina) → block MLF and keep the acidity.
- The choice is style plus the pH you can afford (see MALOLACTIC FERMENTATION).

VA, OXIDATION, REDUCTION — the faults that come from process, not fruit:
- VA (vinegar) = acetic bacteria + oxygen + low SO₂. Ullage and stuck wines are the entry points.
- Oxidation (browning, bruised apple) = too much oxygen, too little SO₂. Cannot be reversed.
- Reduction (rotten egg) = low YAN or thick lees. Easy early, hard once it turns to mercaptans.
→ Details in TROUBLESHOOTING. All three are prevented by the same routine: vessels full,
  SO₂ measured, lees managed, transfers gentle.

═══════════════════════════════════════════════════════
HARVEST TIMING
═══════════════════════════════════════════════════════

TARGET NUMBERS AT PICKING:

Style              | Brix    | TA (g/L)  | pH
-------------------|---------|-----------|----------
Sparkling base     | 17–19   | 8–10      | 2.9–3.1
Fresh white        | 19–22   | 6–8       | 3.1–3.3
Full/aged white    | 21–23   | 5.5–7     | 3.2–3.4
Rosé               | 20–23   | 6–7.5     | 3.2–3.4
Red                | 23–26   | 5.5–7     | 3.4–3.6

CONVERSIONS:
- Potential alcohol (% vol.) ≈ Brix × 0.59
- 1 °Brix ≈ 4.25 °Oechsle ≈ 1.8 °KMW (Babo)
- Sugar in must (g/L) ≈ Brix × 10 × 1.0 (close enough for planning)
- Density 1.090 ≈ 21.5 Brix; density drops ~0.008 per 1% alcohol formed
- Dry wine = residual sugar below 2 g/L (density ~0.992–0.995)

→ Sample several rows and both sides of the canopy; one bunch is not a vineyard

EARLY HARVEST:
- Lower sugar/alcohol, higher TA, lower pH
- Fresh fruit, citrus, green notes
- Potential bitter/green tannins → may need fining
- Superior aging potential (high acidity protects)

LATE HARVEST:
- Higher alcohol, riper/polymerized tannins, lower acidity
- Ripe fruit, jammy notes
- Risk: "flabby" wine if delayed too long → may need acidification

HARVEST READINESS INDICATORS:
- Seed color: green → brown = phenolic ripeness
- Berry firmness decreasing
- Skin texture: softening
- Taste: sugar/acid balance, tannin texture

HAND vs. MECHANICAL HARVEST:
- Hand: cluster-by-cluster selection, whole intact fruit, the only option on steep slopes.
  Slower and dearer — worth it for premium and delicate varieties
- Mechanical: fast and cheaper, flat to moderate slopes only, brings more juice and MOG to the
  cellar → sulfite at the crusher and settle harder

═══════════════════════════════════════════════════════
FERMENTATION — RED WINES
═══════════════════════════════════════════════════════

TEMPERATURE: 20–25°C (extracts phenolics while maintaining yeast health)
- Hot fermentation (26–37°C): Maximum color/tannin extraction
- Cold soak pre-fermentation (<10°C): Aqueous extraction of color/fruit without harsh ethanol-soluble tannins

CAP MANAGEMENT:
- Pump-over (remontage): Pump juice from bottom, spray over cap
  → More oxygen (good for yeast in large tanks), more aggressive extraction
- Punch-down (pigeage): Push cap into juice manually/mechanically
  → Less oxygen, gentler → preferred for Pinot Noir, non-interventionist styles
- Rack-and-return (délestage): Drain completely, cap falls, return wine over cap
  → Maximum color extraction, allows seed removal

SAIGNÉE METHOD:
- Remove 10% of juice immediately after crushing
- Same skins + less juice = more intense phenolic/color extraction
- Removed juice → rosé wine

CARBONIC MACERATION:
- Whole clusters in CO₂-filled sealed vessel → intracellular fermentation
- Result: Vibrant cherry/raspberry/strawberry, low tannin, soft mouthfeel
- Used in: Beaujolais style

ADDITIONS DURING FERMENTATION:
- Maceration enzymes break down pectins and cell walls → faster extraction, better press yield
- Oenological tannin added early binds anthocyanins → stabilises colour in the first 3–4 days

→ Variety-specific red guidance: see CROATIAN VARIETY PLAYBOOK above

═══════════════════════════════════════════════════════
FERMENTATION — WHITE WINES
═══════════════════════════════════════════════════════

TEMPERATURE: 6–18°C (preserves volatile aromatics)
- 15–18°C: Standard for aromatic whites (Malvazija fresh style)
- 6–10°C: Maximum aromatic preservation

→ Variety-specific white guidance (Malvazija, Pošip, Grk, Graševina): see CROATIAN VARIETY PLAYBOOK above

NON-SACCHAROMYCES YEASTS (climate adaptation):
- Lachancea thermotolerans: Produces lactic acid → reduces final pH up to 0.4 units
  → Use when grapes over-ripe/low acidity (increasingly common with climate change)
- Metschnikowia pulcherrima: Increases ester production → fruity/floral aromatic complexity

SUR LIE AGING:
- Wine left on lees (dead yeast cells) → autolysis releases polysaccharides/proteins
- Result: Creamy/nutty character, enhanced mouthfeel, natural antioxidant protection

═══════════════════════════════════════════════════════
MALOLACTIC FERMENTATION (MLF)
═══════════════════════════════════════════════════════

WHAT IT DOES: Oenococcus oeni converts sharp malic acid → softer lactic acid + CO₂
- TA drops 1–3 g/L, pH rises 0.1–0.3 → softer mouthfeel, microbial stability
- Standard for nearly all reds; optional for whites (skip it to keep Malvazija/Pošip crisp)
- Essential for Teran and any high-malic, low-pH wine

CONDITIONS TO RUN IT:
- Temperature: 18–22°C (below 16°C it stalls; this is the most common failure)
- pH: above 3.2 (below 3.1 bacteria struggle — use an acid-tolerant strain)
- Free SO₂: below 10–15 ppm. Do NOT sulfite before MLF if you plan to run it
- Alcohol: below 14.5% vol. (above that use a high-alcohol-tolerant strain)
- Finish alcoholic fermentation first unless co-inoculating

CO-INOCULATION vs SEQUENTIAL:
- Co-inoculation (bacteria added 24–48h after yeast): faster, finishes with AF,
  lower VA risk, less diacetyl. Best for high-pH or high-alcohol musts
- Sequential (after AF completes): more classic, more diacetyl/buttery character,
  but the wine sits unprotected longer → higher spoilage risk

TIMELINE: 2–6 weeks typically. Keep the vessel warm and leave it alone; do not aerate.

TESTING COMPLETION:
- Paper chromatography or enzymatic kit — malic acid must be below 0.1 g/L (100 mg/L)
- Density and taste are not proof. Test before you sulfite.

AFTER MLF — DO THIS IMMEDIATELY:
1. Rack off gross lees
2. Add SO₂ to hit the molecular target for your pH (see SO₂ table)
3. Top up the vessel completely
→ Wine sitting post-MLF with no SO₂ is the single fastest route to high VA and Brett

IF MLF STALLS: Warm to 20°C, check free SO₂ is under 10 ppm, and re-inoculate with
an acclimatised starter. Bacterial nutrient (Opti'Malo) helps in nutrient-poor wines.

═══════════════════════════════════════════════════════
YEAST NUTRITION
═══════════════════════════════════════════════════════

YAN (Yeast Assimilable Nitrogen):
- Most critical nutrient
- Deficiency → H₂S (rotten egg aroma), stuck fermentation
- Measure with Formol titration or enzymatic kit before fermentation
- Supplement with DAP (diammonium phosphate) or organic nitrogen (Fermaid-O, Nutriferm)

REHYDRATION NUTRIENTS:
- Add during yeast preparation (Go-Ferm, Nutriferm Arom)
- Critical for osmotic shock protection in high-sugar musts

THIOLS (varietal aroma compounds):
- Contribute tropical/citrus notes in whites
- Glutathione/cysteine supplements (Optithiols) maximize thiol expression

NUTRIENT TIMING:
- 1/3 into fermentation: Second addition of organic nitrogen
- Never add DAP after 2/3 of sugars consumed (yeast can't use it, risks microbial issues)

═══════════════════════════════════════════════════════
OAK AGING
═══════════════════════════════════════════════════════

OAK SPECIES:
- French oak: Subtle, elegant spice, tight grain, complex structure → premium reds/whites
- American oak: Bold vanilla, coconut, sweet notes → accessible style
- Hungarian oak: Between French and American
- Slavonian oak: Large barrels (500–2000L), neutral and slow — structure without oak flavor

COMMON BLEND: 70% French + 30% American → complex spice profile

OAK ALTERNATIVES (for smaller producers/stainless steel tanks):
- Chips, cubes, staves → similar flavor in more cost-effective, controllable way
- Good for blending trials before committing to barrel program

COMPOUNDS FROM OAK:
- Vanilla (vanillin), clove (eugenol), smoke, coconut (lactones)
- Micro-oxygenation through barrel staves → softens tannins over time

═══════════════════════════════════════════════════════
SO₂ MANAGEMENT — pH TABLE
═══════════════════════════════════════════════════════

MOLECULAR SO₂ TARGETS:
- White wines: 0.8 ppm molecular SO₂
- Red wines: 0.5 ppm molecular SO₂
- Free SO₂ detectable on palate above ~50 ppm → keep pH low to minimize dose needed

FREE SO₂ REQUIRED BY pH:

pH   | For 0.5 ppm molecular | For 0.8 ppm molecular
-----|----------------------|----------------------
3.0  | 8 ppm                | 13 ppm
3.2  | 13 ppm               | 20 ppm
3.4  | 20 ppm               | 32 ppm
3.6  | 31 ppm               | 50 ppm
3.8  | 49 ppm               | 81 ppm
4.0  | 78 ppm               | 125 ppm

→ Ideal: Keep pH below 3.5 for reds, below 3.3 for whites
→ Lower pH = effective protection at lower SO₂ dose = better sensory quality

DOSING BY STAGE:

Stage                        | Addition
-----------------------------|------------------------------------------------
Crush — healthy fruit        | 30–50 mg/L (3–5 g/hL)
Crush — damaged/botrytis     | 50–80 mg/L (higher laccase risk)
Crush — MLF planned          | 20–30 mg/L max, or none
During fermentation          | None
Post-MLF / first racking     | 30–50 mg/L to reach molecular target
Each subsequent racking      | Measure free SO₂, top back up to target
Barrel/tank storage          | Check every 4–8 weeks, correct as needed
Pre-bottling                 | Adjust to 0.5 molecular (red) / 0.8 (white)

UNIT CONVERSIONS:
- 1 g/hL = 10 mg/L = 10 ppm
- Potassium metabisulfite (KMS/PMB) is ~57% SO₂ → 1 g KMS/hL ≈ 5.7 mg/L SO₂
  → To add 50 mg/L SO₂ you need ~8.8 g KMS per hL (88 g per 1000 L)
- 10% sulfite solution: 1 mL per L ≈ 100 mg/L SO₂

EU LEGAL TOTAL SO₂ LIMITS:
- Dry red: 150 mg/L        - Dry white/rosé: 200 mg/L
- Red with RS >5 g/L: 200  - White/rosé with RS >5 g/L: 250 mg/L
- Sweet/late harvest: 300–400 mg/L depending on category
- Organic wine: roughly 30–50 mg/L lower than the conventional limits

PRACTICAL RULES:
- Always measure free SO₂ before adding. Never dose blind off a schedule.
- Bound SO₂ is lost protection — repeated small doses bind less than one big late dose
- Dissolve KMS in a little wine before adding, then mix the whole volume thoroughly

═══════════════════════════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════════════════════════

SLOW OR NO START (nothing after 48–72h)
- Causes: must too cold (<15°C for reds), low YAN, too much SO₂ at crush,
  osmotic shock in high-sugar must, yeast rehydrated badly (temperature shock)
- Fix: warm the must to 20°C, rehydrate fresh yeast at 35–40°C with Go-Ferm,
  acclimatise to within 10°C of the must before pitching, add DAP 20–30 g/hL
- Never rehydrate yeast in cold water or pitch straight into a cold must

STUCK FERMENTATION (density flat >48h, sugar still >5 g/L)
- Treat as a RESTART path, not a normal healthy-ferment yeast choice.
- Causes: high alcohol, temp spike >32°C, YAN exhausted, toxic medium-chain fatty acids
- Fix: adjust to 20–25°C, rack to aerate, add yeast hulls 20–30 g/hL to bind toxins,
  restart with an alcohol-tolerant yeast built up as a starter and blended 1:1 with the
  stuck wine in steps until it takes. Example restart yeasts (not the only options):
  EC-1118, Uvaferm 43. Do not switch to an aromatic premium-white strain for a restart.
- Do NOT add DAP this late — the yeast can't use it and it feeds spoilage organisms
- A stuck wine with no SO₂ and residual sugar is at high risk of VA — act within days

REDUCTION / H₂S (rotten egg)
- Causes: YAN deficiency, thick lees, high-sulfide-producing yeast strain
- Fix early and it disappears: splash rack immediately to aerate, add nutrient if still fermenting
- Persistent: copper sulfate 0.1–0.5 mg/L as Cu — test on a small sample first,
  legal residual maximum 1 mg/L
- If it has moved on to mercaptans (garlic, burnt rubber, onion) it is much harder to remove
  → Treat sulfide smells within days, not weeks

OXIDATION (browning, bruised apple, sherry, flat aroma)
- Causes: low free SO₂, headspace in a part-full vessel, over-pumping, splashing
- Cannot be reversed — prevention is the only real cure
- Prevent: top up every vessel, purge headspace with N₂/argon, correct free SO₂ at every racking
- Cosmetic help only: PVPP or casein fining can lighten browning in whites

HIGH VOLATILE ACIDITY (vinegar, nail polish remover)
- Causes: acetic bacteria + oxygen + low SO₂; stuck fermentations and ullage are the usual entry
- Sensory threshold 0.6–0.9 g/L. EU legal limit ~1.2 g/L red, ~1.08 g/L white (as acetic acid)
- Fix: stop it spreading — sterile filter (0.45 µm) and correct SO₂, then blend down with clean wine
- Reverse osmosis works but is only worth it on valuable volumes
- Prevent: vessels always full, free SO₂ maintained, no wine left sweet and unprotected

REFERMENTATION IN BOTTLE (fizz, cloudiness, pushed corks)
- Cause: residual sugar above ~2 g/L plus viable yeast at bottling
- Fix/prevent: confirm dryness (<2 g/L) before bottling, or sterile filter at 0.45 µm
- Potassium sorbate 200 mg/L stops yeast but only works alongside adequate SO₂,
  and never on a wine that has not completed MLF (produces geranium off-aroma)

BRETTANOMYCES (band-aid, barnyard, horse, "spicy" 4-EP)
- Thrives at low SO₂, pH above 3.6, with traces of sugar — barrels are the usual reservoir
- Prevent: keep molecular SO₂ at or above 0.6, keep pH below 3.6, clean and steam barrels
- Once it is in the wine, filtration at 0.45 µm removes the organism but not the aroma

CELLAR ROUTINE THAT PREVENTS MOST OF THIS:
- Top up every vessel every 2–4 weeks — ullage causes more faults than anything else
- Rack off gross lees 2–4 weeks after MLF, then every 3–4 months
- Measure free SO₂ every 4–8 weeks and after every racking
- Keep the cellar at 12–16°C during aging; sudden swings drive oxygen in and out of barrels
- Log temperature, density and pH daily during fermentation — the trend catches problems early

═══════════════════════════════════════════════════════
FINING AGENTS
═══════════════════════════════════════════════════════

Agent              | Source          | Primary Target
-------------------|-----------------|------------------------------------------
Bentonite          | Volcanic clay   | Proteins (heat stability) — essential for whites
Egg white (albumin)| Animal          | Harsh/aggressive tannins in reds
Gelatin            | Animal protein  | General turbidity, high tannin
Potassium caseinate| Milk protein    | Astringency, oxidative browning
Isinglass          | Fish bladder    | Fine polish and brilliance in whites

PROTEIN HAZE: Heat-unstable proteins in white wine coagulate in bottle
→ Always test the bentonite dose on a small sample before treating the whole batch
→ Heat stability test: 80°C for 30 min → check for haze

COLD STABILIZATION:
- Chill to ~0°C for minimum 2 weeks
- Precipitates potassium bitartrate crystals ("wine diamonds") before bottling
- Alternative: CMC (Vinostab) — carboxymethylcellulose, inhibits crystal formation

═══════════════════════════════════════════════════════
FILTRATION AND DEGASSING
═══════════════════════════════════════════════════════

- Depth filters (pads/sheets): 5–10 µm rough for gross turbidity, 1–3 µm for polish
- Membrane 0.45 µm is "sterile" — removes yeast and bacteria. Non-negotiable for any wine with
  residual sugar or incomplete MLF
- Crossflow clogs less and runs continuously, but only pays off on larger volumes
- Every filtration strips a little aroma and texture. Filter as little as the wine allows
- Degassing: residual CO₂ makes a still wine spritzy and thin. Works best above 21°C.
  Vacuum or inert gas sparging is gentle; a degassing rod on a drill is simple but pulls in oxygen

═══════════════════════════════════════════════════════
BOTTLING — OXYGEN MANAGEMENT
═══════════════════════════════════════════════════════

TPO (total package oxygen) = dissolved O₂ + headspace O₂. Target below 2 ppm.
Headspace is the biggest source of bottle-to-bottle variation.
- Flush hoses, pump and filler bowl with inert gas before the wine touches them
- Sparge the empty bottles, and use vacuum plus inert gas before corking
- Check each filling valve — one bad valve ruins part of the batch
- Bottle shock (muted, disjointed aromas) is normal for 1–4 weeks afterwards

═══════════════════════════════════════════════════════
CLOSURES AND STORAGE
═══════════════════════════════════════════════════════

- Natural cork: best for 10+ year ageing (slow micro-oxygenation softens tannin); risk is TCA taint
- Screw cap: airtight, no TCA, consistent — ideal for fresh whites and rosés
- Synthetic cork: TCA-free, for wines drunk within 3–5 years
- Glass stopper: airtight and premium-looking, popular for boutique Croatian whites
- Storage: constant 13°C, 60–70% humidity, dark, bottles horizontal, no vibration.
  Above 21°C the wine ages fast and turns "stewed"

═══════════════════════════════════════════════════════
CROATIAN CLASSIFICATION AND LABELLING
═══════════════════════════════════════════════════════

- Vrhunsko vino: top tier, 100% regional/varietal, max yield 10,000 kg/ha, official tasting panel
- Kvalitetno vino: mid tier, controlled geographical origin
- Stolno vino: basic; may omit vintage and variety
- EU label must carry alcohol, allergens ("sadrži sulfite"), energy value, net volume,
  lot number (prefixed L) and producer address. Ingredients and nutrition may sit behind a QR code
- Prošek: traditional Dalmatian sweet wine from dried grapes, 15–18% vol., aged 1+ year in oak

═══════════════════════════════════════════════════════
CLIMATE CHANGE ADAPTATION IN CROATIA
═══════════════════════════════════════════════════════

- Longer/more severe droughts → high sugar but underdeveloped phenolics in Dalmatia
- Strategy: Earlier harvest + higher altitude vineyards (Dalmatian Zagora) for cooler nights
- Acidity is the first thing lost — see NON-SACCHAROMYCES YEASTS for correction options
- Orange wine revival: Malvazija and Ribolla — thick skins carry low-sulfur wines safely

`;
