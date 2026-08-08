# Vinar 🍷

**The winemaker's assistant** — a mobile app for small wine producers: a cellar logbook, winemaking calculators, and an AI assistant that knows your wines.

Built for family wineries and OPGs, bilingual (Croatian / English), with offline-first logging so it works in the cellar without a signal.

## Features

- **Cellar logbook** — track each wine from harvest to bottle: fermentation, sulfur additions, racking, measurements, and notes. Works offline and syncs automatically. Includes a fermentation chart and per-wine status (fermenting, stuck, SO₂ due, too warm…).
- **Calculators** — ABV from specific gravity (temperature corrected) and SO₂ dosing by pH and wine type, with output in g/hL and total grams for K₂S₂O₅, blend powder, Campden tablets, or liquid SO₂. Results can be saved straight into the logbook or shared.
- **AI assistant** — chat about your wines; the server builds context from your actual logbook so the answers are specific, not generic. Croatian grape-variety knowledge included.
- **PDF export** — a wine's full logbook as a clean, shareable PDF.
- **Marketplace** — peer listings (grapes, bulk wine, equipment) plus a directory of Croatian winemaking suppliers.
- **Reference tables** — free SO₂ targets by pH, acidity ranges, lab guide, and Croatian lab contacts.

## Tech stack

| Layer | Tech |
| --- | --- |
| Mobile app | Expo / React Native (repo root), React Navigation, dark wine-themed UI |
| Backend | Firebase Auth + Firestore (offline persistence) + Storage |
| AI proxy | Node/Express server in [`server/`](server/) that talks to Anthropic, with Firebase token verification |
| Crash reporting | Sentry (optional, enabled via env) |
| Analytics | Lightweight Firestore-backed event tracking (`src/services/analytics.js`) |

## Getting started

Prerequisites: Node 20+, npm, and the [Expo Go](https://expo.dev/go) app on your phone (or a simulator).

```bash
# 1. Install dependencies (app + assistant proxy)
npm ci
npm ci --prefix server

# 2. Configure environment
cp .env.example .env               # fill in your Firebase web config (EXPO_PUBLIC_*)
cp server/.env.example server/.env # fill in Anthropic + Firebase service account

# 3. Run the assistant proxy (optional — only needed for the AI assistant)
npm run dev --prefix server        # http://localhost:3001

# 4. Run the app
npm start                          # scan the QR code with Expo Go
```

The app is mobile-only (`npm run web` is not a supported target).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server (Metro) |
| `npm test` | Jest — covers app logic **and** `server/services` in one run |
| `npm run lint` | ESLint over `src/` |
| `npm run check:i18n` | Verify every referenced translation key exists in both `en` and `hr` |

## Project structure

```
src/
  screens/        one file per screen (dashboard, wine detail, calculator, …)
  features/       calculator + marketplace domain logic (pure, tested)
  firebase/       auth / firestore / storage / feedback wrappers
  services/       assistant client, analytics
  i18n/           en + hr translations (checked in CI)
  logbook/        shared entry schema driving forms, detail view, and PDF
server/           Express assistant proxy (Anthropic + Firebase Admin)
store/            App Store / Google Play listing copy (HR + EN)
web/              static marketing landing page (deploy to any static host)
```

## Marketing assets

- `store/listing.md` — ready-to-paste store listing copy (titles, keywords, descriptions, screenshot shot list) in Croatian and English.
- `web/index.html` — a self-contained bilingual landing page; deploy it to GitHub Pages, Netlify, or any static host.
