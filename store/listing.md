# Vinar — App Store / Google Play listing copy

Ready-to-paste store listing content in Croatian (primary market) and English.
Character limits are noted per field — verify before pasting, store consoles
reject over-length fields.

---

## Croatian (hr) — primary locale

### App name / title (max 30 chars)

```
Vinar — dnevnik za vinare
```

### Subtitle (iOS, max 30 chars) / Short description (Android, max 80 chars)

iOS subtitle:

```
Podrum, kalkulatori i AI
```

Android short description:

```
Podrumski dnevnik, SO₂ i ABV kalkulatori te AI asistent za male vinare.
```

### Keywords (iOS, max 100 chars, comma-separated, no spaces after commas)

```
vinar,vino,vinarija,podrum,dnevnik,enologija,so2,sumporenje,vrenje,fermentacija,kalkulator,opg
```

### Full description (max 4000 chars)

```
Vinar je aplikacija za male proizvođače vina — sve što vam treba u podrumu, na jednom mjestu.

🍷 PODRUMSKI DNEVNIK
Pratite svako vino od berbe do boce: vrenje, sumporenje, pretoci, mjerenja i bilješke. Dnevnik radi i bez interneta — upišite u podrumu, sinkronizira se kasnije. Grafikon fermentacije pokazuje tijek vrenja na prvi pogled, a status vina vas upozorava kada je vrijeme za provjeru SO₂ ili kada vrenje uspori.

🧪 VINARSKI KALKULATORI
• Alkohol (ABV) iz specifične gustoće, korigirano za temperaturu
• Doziranje SO₂ prema pH i vrsti vina — rezultat u g/hL i ukupnim gramima, za K₂S₂O₅, sumporni prah, Campden tablete i tekući SO₂
Rezultat spremite izravno u dnevnik kao unos sumporenja.

💬 AI ASISTENT
Pitajte bilo što o svojim vinima. Asistent poznaje vaš dnevnik i vaša vina, pa odgovara konkretno — poput enologa koji zna vaš podrum. Uključuje i znanje o hrvatskim sortama: Plavac Mali, Pošip, Graševina, Malvazija i druge.

📄 PDF IZVJEŠTAJI
Izvezite dnevnik vina kao uredan PDF — za vlastitu evidenciju, enologa ili inspekciju.

🛒 TRŽNICA
Oglasi za grožđe, rinfuzno vino i opremu te imenik hrvatskih dobavljača vinarske opreme.

📚 REFERENTNE TABLICE
Ciljne vrijednosti SO₂ po pH, rasponi kiselosti, vodič kada poslati uzorak u laboratorij i kontakti hrvatskih vinarskih laboratorija.

Vinar je napravljen za OPG-ove i male vinarije — jednostavan, na hrvatskom jeziku i s podacima koji ostaju vaši.
```

---

## English (en)

### App name / title (max 30 chars)

```
Vinar — Winemaker's Logbook
```

### Subtitle (iOS, max 30 chars) / Short description (Android, max 80 chars)

iOS subtitle:

```
Cellar log, SO₂ math & AI
```

Android short description:

```
Cellar logbook, SO₂ & ABV calculators, and an AI assistant for small wineries.
```

### Keywords (iOS, max 100 chars)

```
wine,winemaking,cellar,logbook,enology,so2,sulfite,fermentation,abv,calculator,winery,vineyard
```

### Full description (max 4000 chars)

```
Vinar is the app for small wine producers — everything you need in the cellar, in one place.

🍷 CELLAR LOGBOOK
Track every wine from harvest to bottle: fermentation, sulfur additions, racking, measurements, and notes. The logbook works offline — log in the cellar, it syncs later. A fermentation chart shows progress at a glance, and wine status warns you when SO₂ is due or fermentation slows down.

🧪 WINEMAKING CALCULATORS
• Alcohol (ABV) from specific gravity, temperature corrected
• SO₂ dosing by pH and wine type — output in g/hL and total grams, for potassium metabisulfite, blend powder, Campden tablets, and liquid SO₂
Save the result straight into the logbook as a sulfur entry.

💬 AI ASSISTANT
Ask anything about your wines. The assistant knows your logbook and your wines, so it answers specifically — like an enologist who knows your cellar.

📄 PDF REPORTS
Export a wine's logbook as a clean PDF — for your records, your enologist, or an inspection.

🛒 MARKETPLACE
Listings for grapes, bulk wine, and equipment, plus a directory of winemaking suppliers.

📚 REFERENCE TABLES
Free SO₂ targets by pH, acidity ranges, a guide on when to send samples to a lab, and lab contacts.

Built for family wineries and small producers — simple, bilingual (Croatian and English), and your data stays yours.
```

---

## Categories

- **App Store:** Primary — Productivity; Secondary — Food & Drink
- **Google Play:** Productivity (alternative: Lifestyle)

## Screenshot shot list (both stores, capture in hr; repeat in en if budget allows)

1. Dashboard with 2–3 wines showing status badges ("Vrenje u toku", "Provjeri SO₂") — headline: "Cijeli podrum na dlanu"
2. Wine detail with the fermentation chart and logbook entries — "Dnevnik koji radi i offline"
3. SO₂ calculator with a computed dose in g/hL — "Točno doziranje SO₂"
4. AI assistant answering a question about a specific wine — "Enolog u džepu"
5. Exported PDF logbook preview — "PDF izvještaj u dva dodira"
6. Marketplace listings — "Tržnica za vinare"

## Still required before submission (owner action)

- Apple Developer / Google Play developer accounts and `eas submit` credentials (see [`ship.md`](ship.md)).
- A public **privacy policy URL** — host [`web/privacy.html`](../web/privacy.html) via GitHub Pages (`https://dominikkrsini-a11y.github.io/Vinar/privacy.html` once Settings → Pages → GitHub Actions is on) and paste that URL into App Store Connect and Play Console.
- Store screenshots (6.5" + 5.5" iPhone, 12.9" iPad if `supportsTablet` stays true; phone + 7"/10" tablet for Play).
- Data-safety / privacy questionnaires: the app collects email (auth), user content (wines, logbook, listings), and analytics events tied to a user id.
