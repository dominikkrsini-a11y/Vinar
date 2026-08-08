# AGENTS.md

## Cursor Cloud specific instructions

Vinar is an **Expo / React Native mobile app** (repo root) plus a small **Node/Express "assistant proxy" server** (`server/`) that talks to Anthropic. Firebase (Auth + Firestore + Storage) is an external managed backend — there is no local emulator configured.

Cloud Agents use a **Dockerfile-based Build** (see [`.cursor/environment.json`](.cursor/environment.json) + [`.cursor/Dockerfile`](.cursor/Dockerfile)). The Build `install` step runs `npm ci` at the repo root and `npm ci --prefix server` (each tree has its own lockfile). Do not put `expo start`, `npm run dev`, or other long-running servers in `install`.

### Services

| Service | Dir | Dev command | Port | Notes |
| --- | --- | --- | --- | --- |
| Expo mobile app | repo root | `npm start` (Metro) | 8081 | Mobile-only — see web caveat below |
| Assistant proxy | `server/` | `npm run dev` | 3001 | `GET /healthz`; `POST /api/assistant` is Firebase-token gated |

### Lint / test / build (standard commands, see `package.json` + `.github/workflows/ci.yml`)
- Lint: `npm run lint` (root only).
- Tests: `npm test` — one `jest-expo` run covers **both** the app tests under `src/**/__tests__` and the server tests under `server/services/__tests__` (there is no separate test script inside `server/`).
- i18n check: `npm run check:i18n`.
- Server has no build step; CI only syntax-checks it (`node --check`) because booting needs secrets.

### Environment variables (non-obvious gotchas)
- `.env` files are git-ignored. Templates: `.env.example` (root, `EXPO_PUBLIC_*`) and `server/.env.example` (server). Copy and fill them from injected cloud secrets when present.
- `server/config.js` runs `validateEnv()` **at import time** and `process.exit(1)` if `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` are missing — it also rejects values that still look like the placeholders (matching `xxxxx` or `your-`/`your_`). `FIREBASE_PRIVATE_KEY` must be a real PEM (literal `\n` sequences are converted to newlines at boot), so for local-only boot you can generate a throwaway RSA key; the server starts and `/healthz` works, but the real `/api/assistant` happy path needs a genuine Anthropic key + a real Firebase service account (token verification and Firestore writes hit Google).
- `UPSTASH_*` and both `SENTRY_DSN`s are optional; unset just disables rate limiting / crash reporting.
- The app defaults `EXPO_PUBLIC_ASSISTANT_BASE_URL` to `http://localhost:3001` in dev.
- Secrets inject at agent **boot**. A long-running session will not see secrets added mid-run until a new agent starts.

### Running the UI in a headless cloud VM (important limitation)
- This is a **device/simulator app** (Expo Go). There is no iOS/Android simulator in the cloud VM, so the interactive UI cannot be rendered here.
- `npm run web` (`expo start --web`) is **not a working target**: it needs undeclared deps (`react-dom`, `react-native-web`, `@expo/metro-runtime`) and, even after installing them, crashes at runtime with `getReactNativePersistence is not a function` because `src/firebase/config.js` uses that React-Native-only Firebase Auth API, which the web SDK does not export. Do not treat a blank web page as a bug to fix — it is inherent to the mobile-only design.
- To verify app-side logic headlessly, run the Jest suites (they cover the calculators, wine math, fermentation status, dates, i18n) or import the pure modules under `src/features/calculator/` and `src/utils/` directly with Node.
- Anything behind login (dashboard, calculator screen, assistant, marketplace) requires a real Firebase project — the whole navigator is gated on `onAuthChange` in `src/navigation/AppNavigator.js`.
