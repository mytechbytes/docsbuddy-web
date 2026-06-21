# DocsBuddy — public website &amp; deep-link hosting

Marketing site + mobile App-Links hosting for **https://docsbuddy.mytechbytes.in**,
built with **Astro 6 + Tailwind 4**. Content is baked into static HTML at build
time; JavaScript is used only for animation and genuine interaction (theme
persistence, scroll-reveal, the mobile drawer is pure CSS, and the auth-bridge
deep-link handoff).

## Develop

```bash
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/  (static)
npm run preview    # serve the built dist/
```

## Project layout

```
src/
├─ pages/                 index · privacy · terms · login-callback  (→ /x.html)
├─ layouts/               BaseLayout (head, theme injection, pre-paint script)
│                         LegalLayout (narrow legal doc shell)
├─ components/            SiteHeader (nav + theme toggle + CSS drawer), SiteFooter,
│                         StoreBadge, FeatureSection, ValueCard, Step, ContactCard,
│                         PhoneArt, Icon, ThemeToggle, Wordmark
├─ data/                  site.json · themes.json · valueProps · features · steps · contacts
├─ scripts/               theme.js · reveal.js (reveal + count-up) · nav.js · login-callback.js
└─ styles/global.css      @import fonts → tailwindcss → @theme tokens → utilities

public/                   (copied verbatim to dist/)
├─ assets/                phone screenshots
├─ .well-known/           assetlinks.json · apple-app-site-association
└─ _headers               Cloudflare Pages — forces JSON content-type (see below)

design-source/            the original hand-written HTML (reference only)
```

### Editing content

All copy lives in `src/data/*.json`. Edit those and the static HTML regenerates on
build — `features.json` drives the alternating feature sections, `themes.json`
drives the light/dark palettes. Per-item accent tints and animation values stay as
inline `style` (Tailwind can't emit classes from runtime data); everything static
is a utility.

### Theme system

`themes.json` → `:root` (default = light) + `html[data-theme="…"]` blocks injected
by `BaseLayout`. Every themeable color maps to a `--color-*: var(--runtime)` token
so utilities stay theme-reactive. A tiny inline head script applies the stored
theme **before first paint** (no flash); `theme.js` wires the toggle and persists
to `localStorage`. Scroll-reveal is gated behind `html.js`, so no-JS visitors see
everything instantly.

## Before you go live — replace these placeholders

| Where | Placeholder | Replace with |
|---|---|---|
| `public/.well-known/assetlinks.json` | `<<REPLACE: SHA-256 …>>` | The **SHA-256 fingerprint of your Google Play App-Signing key** (see below). |
| `public/.well-known/apple-app-site-association` | `<<REPLACE: APPLE_TEAM_ID>>` | Your **Apple Developer Team ID** (10 chars, e.g. `A1B2C3D4E5`). |
| `src/data/site.json` → `ios.appStoreUrl` / `ios.live` | empty / `false` | The live App Store URL and `true` once the iOS app ships (flips the badge from "Coming soon"). |
| `src/data/site.json` → `supportEmail` | `support@docsbuddy.mytechbytes.in` | Your real support email, if different. |

> The Play Store fallback URL on `login-callback` comes from `site.json`
> (`android.playUrl`) — update it there if the listing URL changes.

### Where the Android fingerprint comes from
Use the **Play App Signing** key, *not* your local upload key:
**Play Console → your app → Test and release → App integrity → App signing →
SHA-256 certificate fingerprint.** Copy the colon-separated hex string into the
`sha256_cert_fingerprints` array. You can list more than one fingerprint.

### Where the Apple Team ID comes from
**Apple Developer account → Membership** (top-right shows your Team ID). The
`appID` must be `TEAMID.bundleIdentifier`, i.e. `TEAMID.in.mytechbytes.docsbuddy`.

## Deploy — Cloudflare Pages (static, Git-connected)

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** from `.nvmrc` (22) — set `NODE_VERSION=22` if needed
- **Framework preset:** Astro (or "None"); **no SSR adapter** — this is fully static

`public/_headers` ships to `dist/` and sets `Content-Type: application/json` on the
two verification files. The extensionless `apple-app-site-association` would
otherwise be served with the wrong MIME type and rejected by iOS.

## Critical hosting requirements for the `.well-known/` files

Both verification files **must** be reachable at these EXACT URLs:

- `https://docsbuddy.mytechbytes.in/.well-known/assetlinks.json`
- `https://docsbuddy.mytechbytes.in/.well-known/apple-app-site-association`

For each one the server must return:

1. **HTTP 200** with **no redirects** — not even http→https or trailing-slash
   redirects. The OS fetchers do not follow redirects.
2. **`Content-Type: application/json`** — including for
   `apple-app-site-association`, which has **no `.json` extension** (handled by
   `public/_headers` on Cloudflare Pages).
3. Served over **HTTPS** with a valid certificate.
4. **Publicly accessible** (no auth, no IP allow-list, no "Under Attack" challenge
   on that path).

## How the auth bridge works

Supabase auth flows redirect the browser to
`https://docsbuddy.mytechbytes.in/login-callback`. That page (`login-callback.js`):

1. Reconstructs the deep link, preserving **both** the query string and the URL
   hash (Supabase puts tokens in either):
   `in.mytechbytes.docsbuddy://login-callback` + `location.search` + `location.hash`.
2. Auto-redirects to that custom scheme to hand control back to the installed app.
3. Shows an "Opening DocsBuddy…" state with manual **Open the app** and
   **Get it on Google Play** fallbacks.

In Supabase, add `https://docsbuddy.mytechbytes.in/login-callback` to
**Authentication → URL Configuration → Redirect URLs**.

## Verifying after deploy

- **Android:** https://developers.google.com/digital-asset-links/tools/generator
- **iOS:** validate at https://branch.io/resources/aasa-validator/
- **Quick check:** `curl -I https://docsbuddy.mytechbytes.in/.well-known/apple-app-site-association`
  → expect `200` and `content-type: application/json`, no `location:` header.
