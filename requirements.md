# Product Requirements Document: Personal MTG Collection Tracker

## 1. Overview & Objective
A web-based personal MTG Collection Tracking application designed to manage individual cards, sealed products, and custom formats like Cubes. The tool will serve as a centralized hub that integrates deeply with external deck-building sites (like Moxfield and ManaBox), tracks real-time financial value, automates data entry via Gmail receipt parsing, and features a collaborative, view-only "Play Night" interface for friends to select game formats.

**Development Note:** The application will be built and autonomously tested using AI-driven development. A final validation packet with visual proof of functionality must be generated upon completion.

## 2. Core Features & Functionality

### A. Individual Card Management
- **Database & Display:** A searchable, filterable grid/list view of all individual cards owned.
- **Card Metadata:** Track fields such as Card Name, Set, Condition (NM, LP, MP, HP), Foil/Non-Foil, Language, and Quantity.
- **Scryfall API Integration:** Automatically fetch card images, Oracle text, mana cost, and up-to-date market prices using the Scryfall API.

### B. Import, Export, & External Sync
- **Universal CSV Migration:** A feature to bulk import/export collections via CSV. Must support mapping the existing CSV format (Quantity, Set Code, Foil, Purchase Price, Date Added) as well as native CSV export formats from ManaBox and Moxfield.
- **Automated API Collection Push:** Integration with the Moxfield API (and ManaBox if available) via user authentication. The app should "Push" the current database of owned cards directly to the user's Moxfield account's "Collection" tab.
- **Scheduled Syncs:** Option to manually push an update to Moxfield or set it to automatically sync whenever new cards are added to the collection.

### C. Finance & Price Tracking
- **Purchase Price Logging:** A dedicated field to log exactly what was paid for a card or sealed product.
- **Current Market Value:** Integration with MTGJSON or Scryfall's Pricing API to display the current market value (e.g., TCGPlayer Market).
- **Profit/Loss & Expected Trends:** A dynamic calculation showing the percentage or dollar amount gained/lost since purchase (Current Price - Purchase Price).
- **Portfolio Dashboard:** A high-level chart or summary card showing the total cost basis of the collection versus the total current market value.

### D. Purchase Automation via Gmail
- **Gmail API Integration:** Secure OAuth2 "Log in with Google" integration to grant the app read-only access to monitor the inbox.
- **Targeted Search:** Query for emails from known vendor addresses (e.g., TCGPlayer, Card Kingdom) with subjects containing "Order Confirmation" or "Receipt".
- **Receipt Scraping:** Extract: Card Name, Set, Condition, Quantity, and Purchase Price.
- **Pending Approval Queue:** Parsed emails generate a "Draft" entry in a dedicated Inbox queue. The user can review the scraped data, correct any errors, and click "Approve" to import them into the main database.

### E. Deck Management & Integration
- **Deck Hub:** A dedicated section listing all constructed decks across formats.
- **External Links:** A field to attach external URLs (specifically Moxfield) to each deck profile.
- **Commander QR Code Generator:** A built-in feature that automatically converts the Moxfield URL of a Commander deck into a downloadable/printable QR Code.

### F. Sealed & Cube Management
- **Sealed Inventory:** A tab dedicated to sealed products (Booster Boxes, Pre-release Kits, Bundles, etc.).
- **Sealed Metadata:** Track the primary Set Code, as well as any associated bonus sheet Set Codes (e.g., spg for Special Guests, brr for Retro Artifacts).
- **Drafting Notes:** A text field for each sealed product to denote its intended purpose (e.g., "Chaos Draft").
- **Cube Builder/Viewer:** A dedicated workspace for custom draft environments.
- **Cube Tagging:** The ability to tag individual cards from the main collection as "In Cube" so they are known to be tied up.

### G. "Play Night" Dashboard & Draft Companion
- **The Play Night Menu:** A dedicated tab designed specifically for a playgroup to browse ready-to-play MTG experiences.
- **Aggregated Content:** This view pulls data from other tabs to create a curated list containing Active Commander Decks, Standard/Custom Cubes, and Jumpstart Cubes.
- **Draftable Playboxes (Draft Companion):** Sealed booster boxes flagged as "Ready to Draft." When viewing a Playbox, the UI must automatically generate draft guides using the following methods:
  - **Automated Archetype Generation (LLM Integration):** The application will utilize an LLM API (e.g., Gemini API) to dynamically fetch and store the 10 draft archetypes for the set by prompting the AI with the Set Code/Name and requesting a JSON response of the color pairs and their themes.
  - **Signpost Uncommon Display:** The app will query the Scryfall API (`set:[code] rarity:uncommon colors=2`) to fetch and display the 10 signpost uncommons so players can visually read the draft build-arounds.
  - **Scryfall Card Pool Link:** An auto-generated Scryfall query link (e.g., `set:dsk OR set:spg`) so players can easily view the entire potential card pool, including bonus sheets and Special Guests.
- **Voting / Claiming:** A lightweight feature allowing friends visiting the link to "upvote" what they want to play this week or claim a specific deck for the night.

### H. Social Sharing & Permissions
- **Role-Based Access Control:**
  - **Admin (User):** Full ability to add, edit, delete, view financial gains, trigger API syncs, and approve Gmail imports.
  - **View-Only (Friends):** A clean, read-only interface with a toggle to hide financial/price history.
- **Shareable Links:** Generate a secure, unique URL to send to friends so they can access the "Play Night" dashboard and the collection binder.

## 3. Technical Requirements (Tech Stack)
- **Frontend:** Next.js paired with Tailwind CSS.
- **Backend/Database:** Firebase (Firestore + Firebase Auth).
- **Deployment:** Google Cloud Run.
- **Pricing/Data APIs:** Scryfall API and MTGJSON API.
- **Email Parsing:** Google Cloud Console / Gmail API.
- **External Syncing:** Moxfield API endpoints.
- **QR Code Generation:** qrcode.react library.
- **AI Integration:** Google Gemini API.

## 4. Automated Testing & Validation Packet
- **Visual Validations (Screenshots):** The AI must take UI screenshots of core workflows, specifically capturing:
  - The UI of the CSV upload and the resulting Card Grid.
  - The Financial Dashboard showing Mock Profit/Loss data.
  - The Gmail "Pending Approval" queue with a mock parsed receipt.
  - A generated Commander QR Code.
  - A successful API sync log/toast notification showing cards pushed to Moxfield.
  - The "Play Night" dashboard interface acting as a menu for friends.
  - A detailed view of a "Draftable Playbox" showing the included Draft Archetypes (via AI generation) and the generated Scryfall Card Pool link / Signpost Uncommons.
- **Validation Test Packet:** Upon project completion, compile a markdown document titled `Validation_Test_Packet` mapping every requirement to a screenshot proving that the feature works.
