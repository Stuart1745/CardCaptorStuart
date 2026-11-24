---
name: Cardcaptor Stuart
description: A play-night menu built from one Magic collection; the cards are the content.
colors:
  mythic-copper: "#BC4A10"
  mythic-copper-deep: "#9E3E0E"
  mythic-copper-bright: "#FA895C"
  mythic-copper-glow: "#FEB092"
  copper-wash: "#FEF4F1"
  ink-on-copper: "#1C0A02"
  table-night: "#020617"
  panel-night: "#0F172A"
  raised-night: "#1E293B"
  rule-night: "#334155"
  paper: "#F8FAFC"
  panel-paper: "#FFFFFF"
  rule-paper: "#E2E8F0"
  ink: "#0F172A"
  muted-ink: "#64748B"
  muted-night: "#94A3B8"
  sakura-pink: "#F472B6"
  sakura-pink-deep: "#BE185D"
typography:
  brand:
    fontFamily: "Cherry Swash, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.mythic-copper}"
    textColor: "{colors.panel-paper}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.mythic-copper-deep}"
  button-primary-dark:
    backgroundColor: "{colors.mythic-copper-bright}"
    textColor: "{colors.ink-on-copper}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-dark-hover:
    backgroundColor: "{colors.mythic-copper-glow}"
  button-tinted:
    backgroundColor: "{colors.copper-wash}"
    textColor: "{colors.mythic-copper-deep}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chip-pod:
    backgroundColor: "{colors.panel-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-pod-active:
    backgroundColor: "{colors.mythic-copper}"
    textColor: "{colors.panel-paper}"
    rounded: "{rounded.full}"
  panel:
    backgroundColor: "{colors.panel-night}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: Cardcaptor Stuart

## Overview

**Creative North Star: "The Draft Table"**

The site is the table a draft happens at. It is focused and tactical: information is dense and stats come first, and every screen is built for deciding quickly what to play and how to play it. The cards are the loudest thing on any page. The interface around them is slate, quiet and exact, so card art, mana symbols and rarity marks carry the color.

Dark is the default theme (players at a table in the evening), and light mode is fully supported. Laptop and phone are equal: grids reflow and previews reposition, but nothing is cut or squashed at either size.

One accent, Mythic Copper, marks what you can act on: buttons, links, active filters and focus. Its meaning is borrowed from the game, where the mythic rarity symbol is the top pull in a pack.

**Key Characteristics:**
- Slate neutrals and a single copper accent. Color meaning otherwise comes from Magic itself: mana, rarity, tier.
- Card images keep their true 488:680 shape and corner radius everywhere.
- Flat panels with hairline borders; real elevation only for things floating over content.
- Stats shown as numbers, in tabular figures, next to the cards they describe.

## Colors

Cool slate neutrals with one warm, game-derived accent.

### Primary
- **Mythic Copper** (`mythic-copper`): solid buttons and active chips in light mode, with white text (5.1:1). Also the link and icon accent in light mode.
- **Mythic Copper Bright** (`mythic-copper-bright`): the same roles in dark mode, carrying dark **Ink on Copper** text (8.0:1). Accent text and icons on dark surfaces (7.5:1 on panels).
- **Copper Wash** (`copper-wash`): tinted secondary buttons (QR Code) and quiet highlights in light mode. Dark mode uses the deepest copper at 30% over the panel.

The full scale lives as `--color-copper-50…950` in `src/app/globals.css`. Solid surfaces go through the theme-aware tokens `bg-accent`, `hover:bg-accent-hover` and `text-on-accent`, never a fixed step.

### Neutral
- **Table Night** (`table-night`): dark page background.
- **Panel Night** / **Raised Night** (`panel-night`, `raised-night`): dark panels and raised rows, inputs and neutral buttons.
- **Rule Night** (`rule-night`): dark borders and dividers.
- **Paper** / **Panel Paper** / **Rule Paper**: light page, panels and borders.
- **Ink** / **Muted Ink** / **Muted Night**: primary and secondary text.

### Brand
- **Sakura Pink** (`sakura-pink`, dark theme) / **Sakura Pink Deep** (`sakura-pink-deep`, light theme): the site name only, matching the pink card in the logo (7.6:1 and 6.0:1). Nothing else on the page is pink.
- The logo artwork (`public/logo.png`, `src/app/icon.png`) keeps its own pink card, gold star and violet tile.

### Game colors (data, not decoration)
- Mana symbols are the WUBRG images in `public/mana/`, never recolored.
- Rarity badges follow the game: common slate, uncommon silver, rare gold, mythic orange.
- Archetype tiers and Commander brackets use their own badge colors as labels for data.
- Play-box product types have fixed hues for the set symbol and packs-left bar: Draft emerald, Set Booster sky, Collector amber, Cube/Jumpstart rose.

### Named Rules
**The One Accent Rule.** Copper means "you can act on this". Never use it for status, data, decoration or the brand.

**The Game Owns Color Rule.** Any other color on screen must mean something in Magic: a mana color, a rarity, a tier, a product type. If it means nothing, it is slate.

**The No Neon Rule.** No cyan, violet or purple ink on dark surfaces, and no gradient text. (The logo is the exception: Stuart chose on 2026-11-24 to keep its pink Cardcaptor-style card artwork on a violet tile. It is brand art, not interface color, so it stays as drawn.)

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono, for codes and data only.
**Brand Wordmark:** Cherry Swash 700 (Google Fonts, SIL OFL), self-hosted through `next/font`. Used only for the words "Cardcaptor Stuart" (nav and sign-in). It stands in for the anime's hand-drawn logo lettering, which is not available as a font.

**Character:** One neutral, well-drawn sans in a few deliberate weights. Hierarchy comes from size and weight, never from color.

### Hierarchy
- **Display** (700, 1.875rem on phones and 2.25rem from md, tracking -0.025em): one per page, the page or set name.
- **Headline** (700, 1.25rem): section titles such as "Draft Archetypes & Signposts".
- **Title** (700, 1.125rem): panel, archetype, box and deck names. Long names wrap to two lines and then clamp.
- **Body** (400, 0.875rem, line height 1.6): descriptions and oracle text. Keep it within about 75ch.
- **Label** (500–700, 0.75rem): captions under cards, stat lines, badges. Uppercase only for short badges (tiers, product type).

### Named Rules
**The Tabular Stats Rule.** Win rates, counts, prices and odds use tabular figures so columns line up.

## Layout

- Content sits in a `max-w-7xl` column with a 16px side gutter on phones and 32px from md.
- Card grids are fluid, `repeat(auto-fill, minmax(8.5rem, 1fr))` with a 12px column gap and 20px row gap, so a phone gets 2 columns and a laptop 6 to 7. Mana fixing uses a 7.5rem minimum. Never a fixed card width inside a fixed track.
- Index pages use a 1, 2 and 3 column grid (sm, xl) with a 20px gap.
- The set page opens with a context band (Pack Contents beside Set Mechanics on lg, at 1:2), then full-width archetype panels.
- Rhythm: tight inside a group (4–12px), generous between sections (48px). More space above a heading than below it.
- The navigation is one row (56px on phones, 64px from sm) and sticks to the top.

## Elevation & Depth

The page is flat. Panels are separated by a hairline border and at most a small shadow (`shadow-sm`); in dark mode, depth comes from the step between Table Night and Panel Night. Real elevation is reserved for things that float over content: card previews and dialogs use a large soft shadow (`shadow-2xl`) with a border.

### Named Rules
**The Float Only Rule.** A shadow larger than `shadow-sm` means the element sits above the page (preview, dialog, sticky bar). Hover may raise a panel to `shadow-md`, never further.

## Shapes

- Panels and tiles use 12px corners; buttons and inputs 8px; badges 6px; filter chips are full pills.
- Card images use the printed card's own corner, `rounded-[4.5%/3.2%]`, in an `aspect-[488/680]` box. Images are never cropped with object-cover inside a card frame.
- Borders are 1px hairlines. No one-sided accent bars on rounded boxes; use a full border, a tint or a leading icon.

## Components

### Buttons
- **Shape:** gently rounded (8px).
- **Primary:** `bg-accent text-on-accent hover:bg-accent-hover`, 8px × 16px padding, medium weight. One per region.
- **Tinted:** Copper Wash with deep copper text and a faint copper border, for secondary actions that still belong to the accent (QR Code).
- **Neutral:** slate-100 / slate-800 with slate text, for links out (EDHREC, Scryfall, Share Link).
- **Focus:** a 2px copper ring (`focus:ring-copper-500`); every interactive element shows `:focus-visible`.

### Chips (pods)
- **Style:** full pills, 1px slate border, white or Panel Night fill.
- **State:** the active chip fills with the accent and carries `aria-pressed`. Counts sit inside the chip at 75% strength.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Panel Paper / Panel Night.
- **Shadow Strategy:** flat, `shadow-sm` at most (see Elevation).
- **Border:** 1px Rule Paper / Rule Night.
- **Internal Padding:** 20px (24px from md on archetype panels).

### Inputs / Fields
- **Style:** 1px slate border, 8px corners, white / Raised Night fill.
- **Focus:** copper ring.

### Navigation
- Sticky, translucent bar with a hairline bottom border. The site name is the pink Cherry Swash wordmark and shows from md (logo only below). Links are slate; the current page gets a slate pill. Sign-in is a primary button that collapses to an icon on phones.

### Card Tile (signature)
A card image at its true shape, a ring on hover (no scaling), the card name, then a one-line caption (role, or "Land / Artifact / Spell"). Hover or focus opens the **Floating Preview**: a fixed panel up to 26rem wide with the full card image, type line, complete oracle text and the 17Lands stat line. It is clamped inside the viewport, placed above or below its card, and on touch screens opens on the first tap.

### Deck Tile (signature)
16:9 art header with the deck name over a dark gradient, a Commander bracket badge on the art (dashed border when estimated), pod chips, color identity, and an EDHREC / QR action row.

## Do's and Don'ts

### Do:
- **Do** route every solid accent surface through `bg-accent` / `text-on-accent` so light and dark both pass contrast.
- **Do** keep card images at `aspect-[488/680]` with the card corner radius, in fluid `minmax()` grids.
- **Do** show stats as numbers with tabular figures, next to the card they describe.
- **Do** clamp every floating element to the viewport at 390px, 1024px and 1440px.

### Don't:
- **Don't** use copper for status, data, decoration or the brand (The One Accent Rule).
- **Don't** add cyan, violet or purple ink on dark, gradient text, or colored glow shadows.
- **Don't** crop or rescale card art to fit a box; change the box.
- **Don't** put an eyebrow label above a heading or a one-sided bar on a rounded panel.
- **Don't** invent ratings, prices or stats; show nothing until real data exists.
