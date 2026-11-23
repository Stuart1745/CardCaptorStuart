# Cardcaptor Stuart — Handoff Document
**Date:** 2026-11-21 (originally 2026-05-26)  
**Prepared by:** Claude Opus 5.5 (originally Claude Sonnet 4.6)

---

## What This App Is

A personal MTG collection tracker and play-box manager for Stuart Rampy. It lets him manage sealed booster boxes (tracking packs opened), view draft archetypes pulled from 17lands + Scryfall + Draftsim, analyze set mechanics, and manage a receipt inbox for card purchases parsed from Gmail.

---

## Live URLs

| Environment | URL |
|---|---|
| Staging (active) | https://cardcaptorstuart--cardcaptorstuart.us-east4.hosted.app |
| Custom domain | https://ccs.stuartrampy.me |
| GitHub repo | https://github.com/Stuart1745/CardCaptorStuart.git |

---

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Auth:** Firebase Auth — Google popup only (`signInWithPopup`). No OAuth callback route needed.
- **Database:** Firestore
- **Hosting:** Firebase App Hosting — auto-deploys on push to `main`
- **Key APIs:** Scryfall (card data + set list), Wizards prerelease guides (scraped)
- **Draft stats:** 17Lands **public datasets** (CC BY 4.0), precomputed weekly into `data/limited-stats/` — see below

---

## Getting Started Locally

```bash
git clone https://github.com/Stuart1745/CardCaptorStuart.git
cd CardCaptorStuart
npm install
# Copy .env.local.example → .env.local and fill in Firebase values (see Firebase Console)
npm run dev   # http://localhost:3000
```

**Firebase env vars** (all required, all `NEXT_PUBLIC_*`) are in `.env.local`. If someone new needs them, get them from Firebase Console → Project Settings → Your apps → Web app config. **Never commit these to `apphosting.yaml`** — GitHub secret scanning will block the push.

---

## Admin Access

Admin is gated by email check (`ADMIN_EMAILS = ['rampy1745@gmail.com']` in several files). Admins can:
- See the **Collection** nav link (`/collection` — CSV importer)
- See the **Add Box** button on `/play-box`
- Write to the Firestore `playBoxes` collection

Everyone (signed-in or not) can view play boxes and draft archetypes.

---

## Firestore Data Model

Database `(default)` in **us-east4**, created 2026-11-21 (before that Firestore was never enabled and every read/write silently failed).

```
playBoxes/{boxId}             — box metadata (name, setCode, cost, marketPrice, remaining, total, customArchetypes…)
                                Default boxes "2"–"6" are seeded on the first ADMIN visit.
decks/{deckId}                — Deck Hub decks (name, format, commander, thumbnail, link, colors,
                                cards[], decklistText). Original 5 decks seeded on the first admin visit.
users/{uid}/receiptQueue/{id} — receipt inbox items (status: Draft/Approved/Rejected)
users/{uid}/cards/{id}        — approved collection items
```

**Security rules** live in `firestore.rules` (deploy: `npx firebase-tools deploy --only firestore:rules --project cardcaptorstuart`):
- `playBoxes`, `decks`: public read, admin-only write (`isAdmin()` = verified email in the list; keep in sync with `src/lib/admin.ts`)
- `users/{uid}/**`: owner-only read/write; everything else closed

**Verify saves by reading Firestore, not the UI**: when Firebase isn't initialized the pages fall back to built-in boxes/decks and "saves" only change the screen.

---

## Key File Map

| Path | What it does |
|---|---|
| `src/lib/firebase.ts` | Firebase init — **guarded behind `if (apiKey)`** to survive SSG builds |
| `src/components/AuthProvider.tsx` | Firebase auth state via `onAuthStateChanged`; export `useAuth()` |
| `src/components/LoginButton.tsx` | Google sign-in/out button in nav |
| `src/components/Navigation.tsx` | Top nav — Collection link admin-only |
| `src/app/play-box/page.tsx` | Box listing — loads from Firestore `playBoxes` |
| `src/app/play-box/[id]/page.tsx` | Box detail — fetches all set cards from Scryfall, shows archetypes |
| `src/app/api/archetypes/route.ts` | Archetype API — calls 17lands + Scryfall + Draftsim, returns tiers |
| `src/app/inbox/page.tsx` | Receipt inbox — Firebase Auth client component |
| `src/app/inbox/InboxClient.tsx` | Inbox mutations — Firestore `writeBatch` for approve/reject |
| `src/app/collection/page.tsx` | CSV importer — admin-only |
| `src/app/login/LoginForm.tsx` | Google sign-in form on `/login` |
| `public/mana/` | Mana symbol PNGs: `w.png`, `u.png`, `b.png`, `r.png`, `g.png` |

---

## Archetype / Draft Analysis System

The `/api/archetypes?set=FIN` endpoint returns archetypes, mechanics, tiers and card ratings.

Archetypes come from the first source that has them:

1. **`HARDCODED_ARCHETYPES`** in `route.ts` — entered from Wizards prerelease guides. When present it is the **complete** list (The Hobbit supports only five pairs, so it is not padded).
2. **Wizards guide scrape** — slug from `WIZARDS_GUIDE_SLUGS`, or **derived automatically** from the set's Scryfall name (`"Star Trek"` → `star-trek-prerelease-guide`). FRA and TRK get all ten archetypes this way with no hardcoding.
3. **Draftsim scrape** — fallback draft guide
4. **Scryfall multicolor uncommons** — last resort

Hardcoded archetypes: `TLA`, `FIN`, `NEO`, `ECL`, `UNF`, `KTK`, `MH2`, `SOS`, `MSH`, `HOB`. Hardcoded mechanics: `TDM`, `ECL`, `UNF`, `TLA`, `FIN`, `SOS`, `MSH`, `HOB`, `FRA`, `TRK`.

### New sets are automatic

- **Set picker:** `/api/sets` serves Scryfall's draftable set list (cached a day); the Add Box set field suggests from it and fills the box name.
- **Archetypes:** derived Wizards guide slug (above).
- **Bonus sheets:** `BONUS_SHEETS` in `play-box/[id]/page.tsx`, else Scryfall "masterpiece" child sets via `/api/sets` (matches every hand-entered entry).
- **Stats:** the weekly job adds a set once 17Lands publishes its public file.
- Scryfall's `is:booster` flag is missing on 2026 play-booster sets; both Scryfall searches retry without it.

### Draft stats (17Lands public datasets)

17Lands' site APIs say their data is "only for use on 17Lands.com"; only the **public datasets** (17lands.com/public_datasets, CC BY 4.0) are allowed elsewhere. So the app never calls 17Lands at runtime:

- `scripts/build_limited_stats.py` (Python stdlib) streams `game_data_public.{SET}.PremierDraft.csv.gz` (+ `draft_data` with `--with-draft`) and writes `data/limited-stats/{SET}.json`: color-pair win rates, per-card GIH WR / GP WR / OH WR / GNS WR / IWD, and ATA. Incremental via `manifest.json` (17Lands Last-Modified).
- `.github/workflows/limited-stats.yml` runs it Mondays 09:17 UTC (and on demand, with optional set list / force), committing only real changes — which redeploys.
- `route.ts` reads the file (`loadLimitedStats`); `next.config.ts` `outputFileTracingIncludes` ships the folder with the API route.
- Tiers = quintiles of color-pair win rate, ignoring combos with < 1% of the top pair's games. Card picks use GIH WR (≥ 200 games).
- **Attribution is required:** the box page shows a credit link under "Draft Archetypes"; tooltips show GIH WR, IWD and ATA.
- 17Lands publishes a set's file about 2 weeks after release, so a brand-new set (e.g. TRK in Nov 2026) has archetypes but no tiers until then.

### Pack contents (MTGJSON)

- `scripts/build_pack_contents.py` (stdlib) reads each draftable set's MTGJSON file (`booster.play`, else `draft`, else `default`) and writes `data/pack-contents/{SET}.json`: per sheet the expected cards per pack, the chance a pack has one, sheet size; plus cards and mythics per pack. Big sheet families (FRA's ~100 echoed-pair sheets) collapse into one row. Rebuilt when missing, within 60 days of release, or with `--force`.
- Runs in the same weekly workflow; `/api/archetypes` returns it as `packContents`; the box page shows a Pack Contents panel (with per-box mythic and bonus-sheet estimates) and an MTGJSON credit.

To add guide text for a set by hand: read the Wizards prerelease guide and add to `HARDCODED_ARCHETYPES` / `HARDCODED_MECHANICS` in `route.ts`.

---

## Pre-Push Hook

Every push runs: **typecheck → lint (warnings only) → build**. This blocks on any TypeScript or build error. Lint warnings are allowed (there are ~31 pre-existing warnings, mostly `<img>` tags and `any` types).

```bash
npm run typecheck   # tsc --noEmit
eslint src          # warnings OK, errors block
npm run build       # next build
```

---

## Blocking Issues (Needs Manual Action)

### 0. Billing (resolved 2026-11-21)

The site went down because the project's billing account ("Firebase Payment") was closed; App Hosting needs Blaze. It is now linked to "My Billing Account". If the site ever returns Google's generic 404 again, check `gcloud billing projects describe cardcaptorstuart` first.

### 1. Firebase not initializing in the browser (resolved 2026-11-22)

The App Hosting env var names were saved with a trailing TAB (`NEXT_PUBLIC_FIREBASE_API_KEY⇥`, also PROJECT_ID, STORAGE_BUCKET, MEASUREMENT_ID), so Next never inlined them and Firebase never started client-side. `next.config.ts` now resolves each value by whitespace-trimmed name, falling back to App Hosting's injected `FIREBASE_WEBAPP_CONFIG`. Retyping the names in the console is still worthwhile but no longer required.

### 2. Custom domain `ccs.stuartrampy.me` (resolved 2026-11-23)

DNS at **Hover**: A `ccs` → 35.219.200.198, TXT `ccs` fah-claim, CNAME `_acme-challenge_tko4xnq2rja5zoh7` → certificatemanager. App Hosting reports host/ownership/cert ACTIVE.

### 3. Google sign-in shows `cardcaptorstuart.firebaseapp.com` (in progress)

`next.config.ts` proxies `/__/auth/*` to firebaseapp.com on both hosts. Branding (name, logo, `/privacy`, `/terms`) submitted for Google verification 2026-11-23. **Before** merging local branch `auth-own-domain` (authDomain = page host), the OAuth web client `413719591693-d58lsnmamjcs6s7lrh4esetebgb5acj9` must list `https://ccs.stuartrampy.me/__/auth/handler` and the hosted.app equivalent as redirect URIs, or sign-in breaks. Check: Google's authorize URL with that redirect_uri must not say `redirect_uri_mismatch`.

---

## Known Issues / Pending Work

| Item | Status | Notes |
|---|---|---|
| Firebase Auth / saving | **Fixed** (Nov 2026) | See Blocking Issues 1 |
| Custom domain `ccs.stuartrampy.me` | **Live** (Nov 2026) | |
| Google sign-in shows firebaseapp.com | **In progress** | See Blocking Issues 3 |
| Deck Hub | **Done** (Nov 2026) | Real decks in Firestore; paste a decklist (Moxfield Export). Moxfield's api2 is behind Cloudflare and 403s Google Cloud and browser-origin requests, so there is no direct import. |
| Open Pack | **Done** (Nov 2026) | Decrements `remaining`, 8 s Undo; admin-only |
| Inbox "Sync Gmail" | **Broken (legacy)** | `/api/gmail/sync` still uses Supabase auth (always 401). Gmail read scopes need Google restricted-scope verification (CASA); privacy policy must change first. |
| Bomb Rares showing uncommon (Lorwyn/ECL) | **Likely fixed** (Nov 2026) | Replaying `getTopCardsForArchetype` on live ECL Scryfall data gives rare/mythic for all 30 picks. Probable cause: box 4 briefly defaulted to set code `LRW` (2007 Lorwyn), later corrected to `ECI`→`ECL`. No Firestore record can be stale: the database did not exist until 2026-11-21. Reopen if it recurs. |
| Set Mechanics for non-guide sets | Partial | TLA + FIN have guide mechanics; others use card-scan fallback |
| Phase 11: CSV Ratings / 17Lands Importer | **Done** (Nov 2026) | Public-dataset pipeline, see Draft stats |
| Live market price for pack cost | **Done** | `marketPrice` field on Add Box + card |
| Pack contents / odds from MTGJSON | **Done** (Nov 2026) | See Pack contents below |

### Done: Live Market Price for Draft/Sealed Cost (kept for reference)

Currently "Draft / person" and "Sealed / person" costs use the stored **purchase price** (`box.cost`) divided by `box.total`. Stuart wants **current market price** (not what he paid).

**Plan:**
1. Add `marketPrice?: string` field to `PlayBox` interface in both `play-box/page.tsx` and `play-box/[id]/page.tsx`
2. Add "Current Market Price" input to the **Add Box** modal in `play-box/page.tsx`
3. Add "Current Market Price" input to the **Edit** modal in `play-box/[id]/page.tsx`
4. In `play-box/page.tsx`, change the cost calculation:
   ```ts
   const packPrice = box.marketPrice && box.total
     ? parseFloat(box.marketPrice) / box.total
     : null;  // show nothing if no market price set
   ```
5. Remove the `est.` label once using market price; replace with a small "update" link for admins

**TCGPlayer API note:** No free public API exists for sealed box prices. Stuart can manually update `marketPrice` as needed.

---

## Recent Work (May 2026 Sprint)

- Migrated all localStorage / Supabase to Firestore
- Firebase Auth Google popup — fixed "offline mode" false-positive
- Play-box listing: instant display with `DEFAULT_BOXES` seed (no loading spinner)
- Play-box detail: `DEFAULT_BOX_INFO` fallback so header/archetypes/button show immediately
- Auto-Fetch Archetypes persists fetched data to Firestore `customArchetypes` field
- TLA (Avatar) archetypes updated with official Wizards prerelease guide data (10 archetypes + 6 mechanics)
- TLA + FIN added to `WIZARDS_GUIDE_SLUGS` and `HARDCODED_MECHANICS`
- Mana symbol PNGs (`w/u/b/r/g.png`) added to `public/mana/`; replaced Lucide icon circles with actual mana symbols in archetype and mechanics sections
- Rarity text labels added to Mana Fixing section cards
- `.vscode/settings.json` disables i18n-ally extension to suppress false-positive warnings
- Set code for Lorwyn Eclipsed corrected to `ECI` throughout
- Default boxes: IDs "2"–"6" only (Kamigawa and Foundations removed until auth works)

---

## Things to Know Before Touching Anything

1. **SSG guard in `firebase.ts`** — `db` and `auth` can be `undefined`. Always `if (!db)` guard before Firestore calls.
2. **`export const dynamic = 'force-dynamic'`** — any page doing server-side auth/data needs this or it'll be statically generated without env vars.
3. **`apphosting.yaml`** — contains NO env vars. All Firebase config is set in Firebase Console → App Hosting → Backend → Environment Variables with BUILD availability.
4. **Three-color sets** — `allowThreeColor` flag in `fetch17LandsTiers()` handles sets like Tarkir Dragonstorm.
5. **WUBRG order** — 17lands uses two-letter color pair keys in WUBRG order (W=0, U=1, B=2, R=3, G=4). See `colorsTo17LandsKey()` in `route.ts`.
6. **Mana symbol images** — live in `public/mana/{w,u,b,r,g}.png`. The `ManaIcon` component in `play-box/[id]/page.tsx` renders them. Pass single-letter symbols (W/U/B/R/G).
