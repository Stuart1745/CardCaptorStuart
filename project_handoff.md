# MTG Collection Tracker - AI Handoff Document

## Project Overview
This project is a Next.js 14+ (App Router) web application designed as a Personal MTG Collection Tracker and Draft Companion. 

**Current Tech Stack:**
- **Frontend:** Next.js + Tailwind CSS + Lucide React
- **Backend:** Next.js API Routes (Serverless Functions)
- **Data Integrations:** Scryfall API (Card Data & Pricing), Draftsim (Scraped Draft Guides), 17Lands (Pending)
- **Database/Auth:** Currently mocked in `localStorage`. Firebase (Firestore + Auth) integration is planned but NOT YET STARTED.

---

## 🏆 What Was Accomplished Most Recently

We just completed a massive build-out of the **Play Box / Draft Companion Dashboard** (`src/app/play-box/[id]/page.tsx`), completely satisfying the user's requirements for Phase 7/8.

Key features implemented:
1. **Multi-Set Support & Scryfall Integration:** The drafting tool fetches full set data directly from Scryfall. We added support for merging multiple sets simultaneously (e.g. `FIN, FCA` for Final Fantasy) and automatically inject known "Bonus Sheets" (e.g. `BIG` for `OTJ`) into the card pool.
2. **Automated Draftsim Scraper (`/api/archetypes`):** Built a Node API route using `cheerio` to dynamically scrape Draftsim.com for set-specific draft guides. It successfully extracts Archetype names, descriptions, top commons/uncommons, signposts, and bomb rares.
3. **Hero Image Engine:** The UI automatically scans the Scryfall card pool for a random Mythic Rare and uses its `art_crop` as a beautiful, transparent background banner overlay for the dashboard.
4. **Financial Tracking:** Added an Edit Box modal that calculates "Net Return" by comparing the user's inputted "Paid Price" against the real-time TCGPlayer USD sum of all opened cards in the box.
5. **UI/UX Polish:** 
   - Reordered the layout to be a CSS Grid (Archetypes in the main pane, Mechanics/Mana Fixing stacked in a right sidebar).
   - Built a dynamic gradient helper (`getArchetypeGradient`) to generate a slick multi-colored border atop Archetype cards based on their specific mana colors (e.g., U/B Dimir colors).
   - Added a transparent magic wand icon next to "Cardcaptor Stuart" in the global navigation bar.

---

## 🚀 What Needs To Be Done Next (START HERE)

The user is ready to begin **Phase 9: The CSV Ratings / 17Lands Importer**.

**Immediate Next Steps for the Next AI Agent:**
1. **Review `src/components/CsvImporter.tsx`**: We have a basic shell of a CSV parser that uses `papaparse`.
2. **Integrate 17Lands Data**: The user wants to hook up 17Lands data or personal CSV ratings. You need to expand the importer to handle strategy imports/ratings.
3. **Implement Firebase Authentication & Storage**: The entire app currently runs off `localStorage` (mock data). Once the CSV importer is rock solid, the next major architectural step is ripping out `localStorage` and hooking up Firebase Auth (`signInWithPopup`) and Cloud Firestore for permanent remote state persistence.

**Agent Context Note:**
- **DO NOT** use `cat` or `sed` to edit files. Use the provided tools (`multi_replace_file_content`).
- The user prefers "premium, rich aesthetic" designs (glassmorphism, vibrant colors, clean layouts). Do not output basic generic UI!
- The Next.js dev server is running on `http://localhost:3001` (Task ID 121).

Good luck!
