# Ship Vinar — TestFlight + Play Internal

Run this on your Mac this week. The cloud agent cannot `eas login` or talk to App Store Connect / Play Console.

Bundle ID / package: `com.danilo1.vinar`. EAS project: `danilo1` / `vinar`. Version codes auto-increment (`eas.json` `appVersionSource: remote`).

Privacy URL after GitHub Pages is enabled (Settings → Pages → Source: GitHub Actions), once `main` has this workflow:

```
https://dominikkrsini-a11y.github.io/Vinar/privacy.html
```

Paste that into App Store Connect and Play Console. Until Pages is on, host `web/` anywhere and use that URL instead.

## 0. Expo production env (once)

https://expo.dev → project **vinar** → Environment variables → environment **production**:

- All `EXPO_PUBLIC_FIREBASE_*` from `.env.example`
- `EXPO_PUBLIC_ASSISTANT_BASE_URL` = https URL of the deployed assistant proxy (no trailing slash, not localhost)
- **Sentry (required for production Android/iOS source maps)** — see the table below. Preview/development can omit these; those EAS profiles set `SENTRY_DISABLE_AUTO_UPLOAD=true`.

### Sentry — copy from sentry.io into EAS production

Create a **React Native** project at [sentry.io](https://sentry.io) if you do not have one. Then on expo.dev → **vinar** → **Environment variables** → environment **production**, add:

| EAS variable | Visibility | Copy from sentry.io |
| --- | --- | --- |
| `EXPO_PUBLIC_SENTRY_DSN` | Plain text | **Settings → Projects → [your project] → Client Keys (DSN)**. Looks like `https://<key>@o<orgId>.ingest.sentry.io/<projectId>`. This is bundled into the app (not a secret). |
| `SENTRY_ORG` | Plain text | **Settings → General Settings → Organization Slug**, or the first path segment in `https://<slug>.sentry.io/…`. Example: `my-winery`. Not the numeric `o123456` from the DSN. |
| `SENTRY_PROJECT` | Plain text | **Settings → Projects** → the project’s **slug** in the list (often `react-native` or `vinar`). Case-sensitive. |
| `SENTRY_AUTH_TOKEN` | **Secret** (or Sensitive) | **Settings → Developer Settings → [Auth Tokens](https://sentry.io/settings/auth-tokens/)** → create an **Organization Auth Token**. Default scopes (source maps + releases) are enough. Never prefix this with `EXPO_PUBLIC_`. |

Do not put `SENTRY_AUTH_TOKEN` in `app.config.js`, `eas.json`, or git. After saving the four variables, rebuild:

```bash
npx eas-cli env:list --environment production
npx eas-cli build --platform android --profile production
```

If the proxy is not live, testers can still use the logbook and calculators; the assistant will show “not configured”.

```bash
npx eas-cli login
npx eas-cli whoami          # danilo1
npx eas-cli env:list --environment production
```

Skip `eas init` unless the projectId in `app.json` is missing. Do not create a new EAS project.

## 1. Build + submit

```bash
# iOS (TestFlight binary)
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production --latest
# First submit: Apple ID + app-specific password (appleid.apple.com)

# Android (Play Internal AAB)
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production --latest
# First submit: Play API service account, or download the AAB from expo.dev
# and upload in Play Console → Testing → Internal testing → Create new release
```

Same thing via npm scripts: `npm run eas:build:ios` / `eas:submit:ios` / `eas:build:android` / `eas:submit:android`.

Both platforms at once: `npx eas-cli build --platform all --profile production`.

Let EAS generate iOS certs and the Android keystore on first build. Then download and backup the Android keystore from expo.dev → Credentials. Losing it means you cannot update the Play app.

## 2. TestFlight (OPGs = External group)

Internal TestFlight is only for people who already have App Store Connect seats. OPGs need External.

1. App Store Connect → Vinar → TestFlight. Wait for processing (Apple email).
2. Beta App Information: what to test + privacy policy URL.
3. Create External group `OPG Korcula`, enable public link.
4. Add the build to that group → submit for Beta App Review (~24–48h).
5. Send testers the public link. They install TestFlight, then Vinar. No UDIDs.

App record: name `Vinar`, bundle `com.danilo1.vinar`, primary language Croatian. Export compliance is skipped via `ITSAppUsesNonExemptEncryption`. Screenshots are not required for TestFlight.

## 3. Google Play Internal

1. Play Console → create app if needed (app, free), package `com.danilo1.vinar`.
2. Set the privacy policy URL (required because of login).
3. Testing → Internal testing → testers’ Gmail list.
4. Create release, upload AAB (or trust `eas submit`), rollout 100%.
5. Copy the opt-in link (`play.google.com/apps/internaltest/...`) and send it. Testers accept, then install from Play.

No review. Usually live in under an hour. Do **not** use the Production track this week. Store listing, screenshots, and the data-safety form can wait until Closed/Production.

## Owner checklist (this week)

**App Store Connect**

- Paid Apple Developer membership
- App record + privacy policy URL
- External group + public link
- Account deletion is in the app (Profile → Delete account)

**Play Console**

- Paid Play developer account
- App created, privacy policy URL
- Internal testing email list + opt-in link
- Do not ship Production
