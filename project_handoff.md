# MTG Collection Tracker — AI Handoff Document

## Project Overview
A Next.js 16 (App Router) personal MTG Collection Tracker and Draft Companion called **Cardcaptor Stuart**.

**Tech Stack:**
- **Frontend:** Next.js 16 + Tailwind CSS v4 + Lucide React
- **Backend:** Next.js API Routes (serverless)
- **Data:** Scryfall API (cards/pricing), Draftsim scraper, Gmail/Gemini AI receipt parsing
- **Auth/DB:** Firebase Auth + Firestore (partially wired — see Phase 9 below)
- **Hosting:** Firebase App Hosting → `stuartrampy.me/ccs`
- **Repo:** https://github.com/Stuart1745/CardCaptorStuart

---

## 🏆 What Was Accomplished Most Recently

### UI & Bug Fixes
- **Mana Fixing grid:** Changed from `flex flex-wrap` to `grid grid-cols-2 gap-4 justify-items-center` — 2 cards per row in sidebar
- **Navigation icon:** Fixed `Calendar` → `Package` icon for Play Box nav link; removed unused `React` import
- **`EVERGREEN_KEYWORDS`:** Removed duplicates (`Vigilance` appeared twice, `Double Strike`/`Double strike` both present)
- **`getArchetypeGradient`:** Moved after import statements (was incorrectly declared before them)

### TypeScript Fixes (play-box/[id]/page.tsx)
- Added `art_crop?: string` to `ScryfallCard.image_uris` interface
- Added `imageUrl?: string` to `boxInfo` state type
- Fixed `calculateMarketValue()` early-return from `0` → `'0.00'` (consistent `string` return type)
- Fixed `symbols.includes(c)` narrowing error with `(symbols as string[]).includes(c)`
- Fixed `Array.from(new Map(...).values())` cast to `ScryfallCard[]`
- Fixed unused `name` in `.filter(([name, data])` → `.filter(([, data])`
- Removed unused imports: `Image` (next/image), `LayoutGrid`, `BarChart3`

### Missing Packages Installed
`@supabase/supabase-js`, `googleapis`, `@google/genai` — were imported but missing from `package.json`, causing production build failures.

### Missing Supabase Utility Files Created
- `src/utils/supabase/client.ts` — exports `createClient()` factory used by login/logout/inbox
- `src/utils/supabase/server.ts` — exports async `createClient()` for server components

### InboxClient.tsx Rewrite
- Replaced all `any` types with typed `QueueItem` and `QueueGroup` interfaces
- Added `useMemo` for `groupedQueue` computation
- Converted `err: any` → `err instanceof Error` pattern
- Added `type="button"` to all buttons (prevents accidental form submit)
- Added `aria-label` to icon-only buttons

### Archetype Card Selection Overhaul (play-box/[id]/page.tsx)
`getTopCardsForArchetype` now takes the full archetype object `{ name, colors, desc }` instead of just colors, and uses a two-layer scoring system:

1. **Color fit score:** exact multicolor match = +4, multicolor subset = +2.5, monocolor = +1.5, colorless = +0.5
2. **Keyword synergy score:** extracts meaningful terms from archetype name + description (filtered stop-words), searches card oracle text/type line/keywords for matches (+1.5 per hit)

**Signpost uncommons** now prioritise exact-color multicolor uncommons (the designed signposts) before falling back to high-synergy monocolor uncommons. All card categories (rares, commons, removal, evasion, draw) are ranked by combined score.

### Archetype Scraper Rewrite (src/app/api/archetypes/route.ts)
**Root cause of shard bug:** `inferColors` used `String.includes()` — any mention of "Esper" or "Grixis" in body text created phantom 3-color archetypes for 2-color sets.

**Fixes:**
- Color detection priority: `{W}{U}` symbols → written pairs (`White/Blue`) → letter pairs (`W/U`) → **whole-word** guild names (`\bAzorius\b`) → individual color names
- `allowThreeColor` flag — 3-color guilds (Esper, Grixis, Abzan, etc.) only parsed for sets in `THREE_COLOR_SETS = ['KTK', 'FRF', 'DTK', 'TDM', 'MOM', 'NEO']`
- **Scryfall signpost source added:** runs in parallel with Draftsim via `Promise.allSettled`. Fetches `rarity:uncommon colors>=2 is:booster` — Wizards designs one multicolor uncommon per archetype. Fills any gaps Draftsim misses (critical for themed sets like FIN where Draftsim may not use guild names)
- Results merged: Draftsim descriptions preferred; Scryfall fills gaps
- Response includes `sources` field showing which sources contributed

### Deployment Setup
- `next.config.ts`: `basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''`
- `apphosting.yaml`: Firebase App Hosting config (only `NEXT_PUBLIC_BASE_PATH=/ccs` — all other env vars set in Firebase Console)
- `src/app/login/LoginForm.tsx`: OAuth redirect uses `${origin}${NEXT_PUBLIC_BASE_PATH}/auth/callback`
- Firebase project: `cardcaptorstuart`
- GitHub repo: https://github.com/Stuart1745/CardCaptorStuart
- Domain: `stuartrampy.me` (registered on Hover.com) → DNS A record pointing to Firebase App Hosting

---

## 🚀 What Needs To Be Done Next (START HERE)

### Immediate: Finish the Firebase App Hosting deployment

The build is failing / partially set up. The agent that exposed the API key in `apphosting.yaml` cleaned it out. **The Firebase config env vars must now be added through the Firebase Console** (not in the yaml file):

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → project `cardcaptorstuart`
2. App Hosting → select the backend → **Environment variables**
3. Add all of these:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDivE_l5W6142q9FNaYBIMjumh16RL97gY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `cardcaptorstuart.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `cardcaptorstuart` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `cardcaptorstuart.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `413719591693` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:413719591693:web:fefee8d6e40a6806084e44` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-T9R2KHX0MF` |

4. Redeploy. App should build clean and be live at the Firebase-assigned URL.
5. Add custom domain `stuartrampy.me` in Firebase App Hosting → connect Hover.com DNS.

### Phase 9: Firebase Auth Migration (Replace Supabase)

The app currently has **two competing auth systems**:
- **Firebase Auth** — installed (`src/lib/firebase.ts`, `src/components/AuthProvider.tsx`)
- **Supabase Auth** — used by login page, inbox, logout button, auth callback

The `@supabase/supabase-js` package is now installed but Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are not configured — so those pages will fail at runtime.

**Decision needed:** Pick one. Recommended path is **Firebase Auth** since:
- Firebase project is already set up
- Firestore + Firebase Storage are the planned database
- Keeping everything in Google is the stated preference

**Files to migrate:**
- `src/app/login/LoginForm.tsx` — replace `supabase.auth.signInWithOAuth` with `signInWithPopup(auth, new GoogleAuthProvider())`
- `src/app/login/page.tsx` — remove Supabase server client, use Firebase Admin or client auth check
- `src/app/inbox/page.tsx` — replace Supabase session check with Firebase Auth
- `src/app/inbox/InboxClient.tsx` — replace Supabase DB calls with Firestore
- `src/components/LogoutButton.tsx` — replace `supabase.auth.signOut()` with `signOut(auth)`
- `src/app/auth/callback/route.ts` — remove entirely (Firebase uses popup-based auth, no callback needed)

### Phase 10: Replace localStorage with Firestore

All play boxes currently live in `localStorage` (mock data). Migration path:
- `src/app/play-box/page.tsx` — read/write boxes from Firestore `users/{uid}/playBoxes`
- `src/app/play-box/[id]/page.tsx` — load box by ID from Firestore instead of `localStorage.getItem`
- Keep `localStorage` as offline fallback with a sync mechanism

### Phase 11: CSV Ratings / 17Lands Importer

See `src/components/CsvImporter.tsx` — basic `papaparse` shell exists. Needs:
- Column mapping UI (map CSV columns to card fields)
- 17Lands card-level data integration
- Store ratings in Firestore per user per set

---

## Key File Map

| File | Purpose |
|---|---|
| `src/app/play-box/[id]/page.tsx` | Main draft companion dashboard (1000+ lines — the heart of the app) |
| `src/app/api/archetypes/route.ts` | Archetype scraper (Draftsim + Scryfall signpost detection) |
| `src/app/api/gmail/sync/route.ts` | Gmail receipt parser using Gemini AI |
| `src/components/Navigation.tsx` | Global nav bar |
| `src/lib/firebase.ts` | Firebase app init (uses env vars) |
| `src/utils/supabase/client.ts` | Supabase client factory (legacy — replace with Firebase) |
| `apphosting.yaml` | Firebase App Hosting config — only `NEXT_PUBLIC_BASE_PATH` here, all other env vars in Firebase Console |
| `.env.local` | Local dev secrets — **gitignored, never commit** |

---

## Agent Notes

- **DO NOT** hardcode env vars in `apphosting.yaml` — GitHub secret scanning will block the push
- **DO NOT** use `cat`/`sed` to edit files — use the provided tools
- The user prefers premium glassmorphism aesthetic — don't regress the UI quality
- `next.config.ts` is overridden at build time by Firebase App Hosting — don't fight it
- The dev server runs locally on `http://localhost:3001`
- `@supabase/supabase-js`, `googleapis`, `@google/genai` are now properly in `package.json`
