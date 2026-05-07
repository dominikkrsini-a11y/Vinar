# Option B Assistant Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Anthropic calls to a local-only dev proxy server, remove secrets from Expo config, refactor bloated screens into helpers/components, add shared UI primitives, and add Jest unit tests for calculator helpers.

**Architecture:** The Expo app calls `POST /api/assistant` on a local Node/Express server. The server validates inputs, rate-limits per-IP in memory, applies CORS for Expo dev, and forwards the request to Anthropic using `ANTHROPIC_API_KEY`. The app uses `EXPO_PUBLIC_ASSISTANT_BASE_URL` (default `http://localhost:3001`) and keeps prompts in `src/services/assistant/prompt.js`. Error handling is centralized via `src/utils/reportError.js`.

**Tech Stack:** Expo (React Native), Node.js + Express, Jest + jest-expo, plain JavaScript.

---

## File structure (new / changed)

- Create: `.env.example`
- Create: `app.config.js`
- Modify: `app.json` (remove secrets/minimize)
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `src/services/assistant/client.js`
- Create: `src/services/assistant/prompt.js`
- Modify: `src/screens/AssistantScreen.js`
- Modify: `src/firebase/auth.js` (remove unused imports)
- Create: `src/utils/reportError.js`
- Modify: `src/screens/WineDetailScreen.js` (extract helpers/components + reportError)
- Create: `src/screens/wine-detail/buildWinePdfHtml.js`
- Create: `src/screens/wine-detail/FermentationChart.js`
- Modify: `src/screens/MarketplaceScreen.js` (extract modal/helper + reportError)
- Create: `src/screens/marketplace/PostListingModal.js`
- Create: `src/screens/marketplace/imageHelpers.js`
- Modify: `src/screens/CalculatorScreen.js` (split helpers + UI components)
- Create: `src/features/calculator/helpers.js`
- Create: `src/features/calculator/components/*` (small UI components)
- Create: `src/components/ui/*` (4–6 shared primitives)
- Create: `src/features/calculator/__tests__/helpers.test.js`
- Modify: `package.json` (Jest config + test script + devDependencies)

---

### Task 1: Remove secrets from Expo config

**Files:**
- Create: `app.config.js`
- Modify: `app.json`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

Include:
- `ANTHROPIC_API_KEY=`
- `EXPO_PUBLIC_ASSISTANT_BASE_URL=http://localhost:3001`

- [ ] **Step 2: Create `app.config.js`**

Behavior:
- Load `.env` (via `dotenv/config` import or `dotenv` in node) during config evaluation
- Return Expo config with `extra` containing only safe public values (do not include `ANTHROPIC_API_KEY`)

- [ ] **Step 3: Minimize `app.json`**

Move any `expo.extra.*` secrets out (especially `anthropicApiKey`) and keep only non-secret metadata.

- [ ] **Step 4: Verify secrets removed**

Run:
- `git grep -n "anthropicApiKey"` (expect no matches)

---

### Task 2: Add local-only Express proxy server

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`

- [ ] **Step 1: Create `server/package.json`**

Dependencies:
- `express`
- `cors`
- `dotenv`

Scripts:
- `dev`: `node index.js`

- [ ] **Step 2: Implement `POST /api/assistant` in `server/index.js`**

Requirements:
- Read `ANTHROPIC_API_KEY` from env (throw 500 if missing)
- Validate request body (messages array length, max text size, optional base64 image size)
- In-memory rate limit per-IP (e.g. 20 req / 5 min)
- CORS allowing Expo dev origins and LAN access
- Forward to Anthropic `v1/messages` and return JSON response transparently (pass through status)

- [ ] **Step 3: Manual smoke test**

Run:
- `cd server; npm i; npm run dev`

Then in another terminal:
- `curl -X POST http://localhost:3001/api/assistant -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"hi\"}]}],\"system\":\"test\",\"model\":\"claude-3-5-haiku-latest\",\"max_tokens\":16}"`

Expected: JSON response or a clear error about missing API key.

---

### Task 3: Wire app Assistant to backend client + prompt module

**Files:**
- Create: `src/services/assistant/client.js`
- Create: `src/services/assistant/prompt.js`
- Modify: `src/screens/AssistantScreen.js`

- [ ] **Step 1: Add `src/services/assistant/prompt.js`**

Export `buildSystemPrompt(profile, wines, entries)` extracted from `AssistantScreen.js`.

- [ ] **Step 2: Add `src/services/assistant/client.js`**

Export `sendAssistantMessage({ baseUrl, system, messages, model, max_tokens })` that calls `POST ${baseUrl}/api/assistant`.

Default `baseUrl`:
- `process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL || "http://localhost:3001"`

- [ ] **Step 3: Update `AssistantScreen.js`**

Changes:
- Remove direct `https://api.anthropic.com/v1/messages` call and any in-app API key use
- Remove (or guard behind a dev flag) the `127.0.0.1:7448/ingest/...` debug ingestion fetch calls
- Use `reportError` + `Alert.alert` on failures

---

### Task 4: Introduce `reportError` and apply to key screens

**Files:**
- Create: `src/utils/reportError.js`
- Modify: `src/screens/AssistantScreen.js`
- Modify: `src/screens/WineDetailScreen.js`
- Modify: `src/screens/MarketplaceScreen.js`

- [ ] **Step 1: Add `reportError`**

Minimal API:
- `reportError(error, context)` logs a structured message (and in dev, optionally includes stack).

- [ ] **Step 2: Replace egregious `console.log`-only catches**

In each screen:
- call `reportError(e, { screen: "...", action: "..." })`
- show `Alert.alert(...)` with existing translations where available

---

### Task 5: Debloat WineDetail (PDF + chart extraction)

**Files:**
- Create: `src/screens/wine-detail/buildWinePdfHtml.js`
- Create: `src/screens/wine-detail/FermentationChart.js`
- Modify: `src/screens/WineDetailScreen.js`

- [ ] **Step 1: Move HTML builder**
- [ ] **Step 2: Move chart into component**
- [ ] **Step 3: Ensure UI unchanged**

---

### Task 6: Debloat Marketplace (modal + image helpers)

**Files:**
- Create: `src/screens/marketplace/PostListingModal.js`
- Create: `src/screens/marketplace/imageHelpers.js`
- Modify: `src/screens/MarketplaceScreen.js`

- [ ] **Step 1: Extract modal**
- [ ] **Step 2: Extract image helpers**
- [ ] **Step 3: Ensure behavior unchanged**

---

### Task 7: Debloat Calculator (helpers + components) + tests

**Files:**
- Create: `src/features/calculator/helpers.js`
- Create: `src/features/calculator/components/*`
- Modify: `src/screens/CalculatorScreen.js`
- Create: `src/features/calculator/__tests__/helpers.test.js`
- Modify: `package.json`

- [ ] **Step 1: Move math helpers**

Export:
- `correctSG`
- `calculateABV`
- `getTargetFreeSO2`
- `calculateSO2Addition`

- [ ] **Step 2: Add Jest**

Add devDependencies:
- `jest`
- `jest-expo`

Add script:
- `"test": "jest"`

- [ ] **Step 3: Write 5–10 unit tests**

Test:
- SG correction monotonicity
- ABV known case
- SO2 target for red/white at typical pH
- SO2 addition 0 when current >= target
- g/hL and total grams computation sanity

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

---

### Task 8: Shared UI primitives and adoption

**Files:**
- Create: `src/components/ui/Button.js`
- Create: `src/components/ui/Card.js`
- Create: `src/components/ui/TextField.js`
- Create: `src/components/ui/ModalSheet.js` (or similar)
- Create: `src/components/ui/Chip.js`
- Modify: at least two screens to use them

- [ ] **Step 1: Create primitives matching existing theme**
- [ ] **Step 2: Replace usages in Assistant + Marketplace**
- [ ] **Step 3: Quick manual UI spot-check**

---

### Task 9: Verification

- [ ] **Step 1: `npm test`**
- [ ] **Step 2: `npm start` (Expo) basic run**
- [ ] **Step 3: Document Windows/Expo pitfalls**

