---
name: Cardcaptor Stuart
description: A play-night menu built from one Magic collection, written as deadpan draft math on 90s fancy stationery.
colors:
  raspberry-ink: "#C52C7C"
  raspberry-deep: "#A71F67"
  sakura-pink: "#F87AB2"
  sakura-blossom: "#FEAACC"
  sakura-focus: "#E9509A"
  petal-wash: "#FEF4F7"
  blush-paper: "#FFF8FB"
  rose-tissue: "#FDF0F5"
  dot-hairline: "#F6DFE9"
  input-edge: "#E8C8D6"
  muted-night: "#BA91A3"
  muted-ink: "#8E6578"
  soft-ink: "#774E61"
  quiet-ink: "#61394C"
  plum-raised: "#4E293B"
  plum-ink: "#3D1C2D"
  plum-night: "#2D111F"
  letter-sheet: "#FFFFFF"
  butter: "#FCD34D"
  mint: "#A7F3D0"
  sky-sticker: "oklch(90.1% 0.058 230.902)"
  peach-sticker: "oklch(90.1% 0.076 70.697)"
  logo-pink: "oklch(52.5% 0.223 3.958)"
  logo-pink-night: "oklch(71.8% 0.202 349.761)"
typography:
  display:
    fontFamily: "Cherry Swash, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Cherry Swash, Geist, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  1: "4px"
  1.5: "6px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.raspberry-ink}"
    textColor: "{colors.letter-sheet}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.raspberry-deep}"
  button-primary-night:
    backgroundColor: "{colors.sakura-pink}"
    textColor: "{colors.plum-night}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-night-hover:
    backgroundColor: "{colors.sakura-blossom}"
  button-neutral:
    backgroundColor: "{colors.rose-tissue}"
    textColor: "{colors.quiet-ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-neutral-hover:
    backgroundColor: "{colors.dot-hairline}"
  button-tinted:
    backgroundColor: "{colors.petal-wash}"
    textColor: "{colors.raspberry-deep}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chip-pod:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.quiet-ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-pod-active:
    textColor: "{colors.raspberry-deep}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  letter-sheet:
    backgroundColor: "{colors.letter-sheet}"
    rounded: "{rounded.xl}"
    padding: "20px"
  letter-sheet-night:
    backgroundColor: "{colors.plum-ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  set-panel:
    backgroundColor: "{colors.letter-sheet}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.blush-paper}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  sticker-draft:
    backgroundColor: "{colors.mint}"
    textColor: "oklch(26.2% 0.051 172.552)"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  sticker-set-booster:
    backgroundColor: "{colors.sky-sticker}"
    textColor: "oklch(29.3% 0.066 243.157)"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  sticker-collector:
    backgroundColor: "{colors.butter}"
    textColor: "oklch(27.9% 0.077 45.635)"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  sticker-cube-jumpstart:
    backgroundColor: "{colors.peach-sticker}"
    textColor: "oklch(26.6% 0.079 36.259)"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  sticker-price-paid:
    backgroundColor: "{colors.butter}"
    textColor: "oklch(27.9% 0.077 45.635)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  sticker-price-market:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  floating-preview:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.blush-paper}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Cardcaptor Stuart

## Overview

**Creative North Star: "Letter-Set Stationery"**

Brutally serious draft math written on the cutest letter paper money can buy. The page is a 90s fancy-stationery set: blush letter paper with a faint dot grid, white letter sheets for every box and deck, raspberry ink for anything you can act on, washi tape behind headings, die-cut stickers for labels, a gel pen that underlines the page you are on and circles the pod you picked. The numbers on that paper stay deadpan: win rates, per-person costs, brackets and pack counts are set in plain Geist with tabular figures, at the same size and weight they would have on a spreadsheet. The paper does the gushing; the stats never do. The joke is the contrast, and nothing gets harder to read because of it.

Light is the default theme because the world is a sheet of stationery. Night is the same set printed on plum paper: plum ground, plum letter sheets, sakura pink ink in place of raspberry, deeper tape. Laptop and phone are equal; grids reflow, the preview repositions, and nothing is cut at either size.

This world replaced the earlier slate "Draft Table" system. Copper, slate neutrals and the dark-first default no longer exist anywhere in the code.

**Key Characteristics:**
- Blush dot-grid paper ground, white letter sheets, plum ink; every neutral is tinted pink-plum, never gray.
- One action color, sakura (raspberry by day, sakura pink by night). It never carries data or status.
- Stationery marks carry state and labels: washi tape on headings, die-cut stickers for types and prices, gel-pen underline and circle for "you are here".
- Stats are plain Geist, tabular, deadpan. A butter sparkle appears only beside a number that earns it.
- Cards are the content: true 488:680 shape and corner, never cropped.

## Colors

A warm pink-plum stationery palette: one tinted neutral scale, one action pink, and a small box of sticker colors.

### Primary
- **Raspberry Ink** (#C52C7C, the light-theme action color): solid buttons with white text (5.2:1), links and hover ink, the gel-pen underline and circle, heading icons, focus outlines. On blush paper as text it reaches 5.0:1.
- **Raspberry Deep** (#A71F67): hover on solid buttons; active pod text; tinted-button text (6.4:1 on Petal Wash).
- **Sakura Pink** (#F87AB2, the night action color): the same roles on plum paper, carrying Plum Night ink on solid fills (6.95:1).
- **Sakura Blossom** (#FEAACC): night hover; also the lighter of the two washi-tape stripes (at 55% opacity).
- **Sakura Focus** (#E9509A): input focus rings and the ring that appears around a hovered card image.
- **Petal Wash** (#FEF4F7): background of the tinted secondary button (QR Code).

Solid action surfaces go through the theme-aware accent, accent-hover and on-accent tokens, never a fixed sakura step, so both themes pass.

### Secondary (stationery stickers and stars)
- **Butter** (#FCD34D): Collector Booster stickers, the "paid" price sticker, and the sparkle fill (with a burnt-amber edge, #B45309).
- **Mint** (#A7F3D0): Draft stickers (Play and Draft Booster boxes) and the deck format sticker.
- **Sky Sticker** (oklch(90.1% 0.058 230.902)): Set Booster stickers.
- **Peach Sticker** (oklch(90.1% 0.076 70.697)): Cube and Jumpstart stickers.

Each sticker carries the darkest step of its own hue as ink (emerald, sky, amber, orange 950). The same product-type hue colors that box's set symbol and packs-left bar.

### Neutral
- **Blush Paper** (#FFF8FB): the page ground in light, with a dot grid of **Dot Hairline** (#F6DFE9) dots 1px wide every 18px. Also input fill.
- **Letter Sheet** (#FFFFFF): box cards, deck cards, set panels, dialogs. Also the photo border and the sticker cut edge in light.
- **Rose Tissue** (#FDF0F5): neutral buttons, progress-bar track, quiet row tints.
- **Dot Hairline** (#F6DFE9): hairline borders on sheets, dividers, the dot grid, the scallop's shadow line.
- **Input Edge** (#E8C8D6): input borders; hover border on letter sheets.
- **Muted Ink** (#8E6578): secondary text on white and blush (4.9:1 on white).
- **Soft Ink** / **Quiet Ink** (#774E61 / #61394C): nav links at rest, labels, neutral-button text.
- **Plum Ink** (#3D1C2D): body text in light (14.3:1 on blush); the letter-sheet fill at night; the Floating Preview panel in both themes.
- **Plum Raised** (#4E293B): night inputs, neutral buttons and borders.
- **Muted Night** (#BA91A3): secondary text at night (5.47:1 on Plum Ink).
- **Plum Night** (#2D111F): the page ground at night, and ink on solid Sakura Pink.

### Brand
- **Logo Pink** (oklch(52.5% 0.223 3.958), light, 5.65:1 on blush) / **Logo Pink Night** (oklch(71.8% 0.202 349.761), 6.27:1 on plum): the "Cardcaptor Stuart" name in the letterhead only, matched to the pink card in the logo. A binding brand commitment; it sits outside the sakura scale on purpose.
- The logo artwork (`public/logo.png`, `src/app/icon.png`) keeps its own pink card, gold star and violet tile, as drawn.

### Game colors (data, not decoration)
- Mana symbols are the WUBRG images in `public/mana/`, never recolored. Color-name labels beside them use the game hue (white amber, blue, black plum, red, green).
- Rarity badges (a small square letter in the card's bottom-left corner): common Soft Ink with white, uncommon Input Edge, rare amber, mythic orange.
- Dialog scrims are Plum Ink at 60% with a light blur.
- Archetype tiers are stickers in their own hues: S amber, A emerald, B blue, C paper, D red.
- Commander brackets use their own badge; an estimated bracket has a dashed border and "(est.)".

### Named Rules
**The One Ink Rule.** Sakura is the action color and nothing else: buttons, links, focus, the current page, the active pod, heading icons. It never labels data, a product type, a bracket or a status. Status uses emerald (success, shared view) and red (errors).

**The Tinted Paper Rule.** Every neutral is a step of the plum-tinted paper scale. No slate, no pure gray, no black text.

**The Sticker Box Rule.** Product types have fixed sticker colors so a box looks the same every time: Draft mint, Set Booster sky, Collector butter, Cube and Jumpstart peach. Sakura is never one of them.

## Typography

**Display Font:** Cherry Swash 700 (via next/font, falls back to Geist)
**Body Font:** Geist (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono, for mana costs and codes only.

**Character:** a storybook swash face for the stationery's printed titles, and a calm, exact sans for everything that is information. Cherry Swash decorates the paper; Geist reports the numbers.

### Hierarchy
- **Display** (Cherry Swash 700, 1.875rem; set pages 2.25rem from md): one page title, always sitting on washi tape.
- **Headline** (Cherry Swash 700, 1.25rem; 1.125rem in the set-page context band): section headings ("Draft Archetypes & Signposts", "Mana Fixing"), on a tilted washi-tape block with a raspberry icon.
- **Title** (Geist 700, 1.125rem; archetype names 1.25rem): box, deck and archetype names. Long names clamp at two lines.
- **Body** (Geist 400, 0.875rem, line height 1.625): descriptions and oracle text, kept within about 48rem.
- **Label** (Geist 500 to 700, 0.75rem, tabular): stickers, captions under cards, stat lines, the cost-math panel. Uppercase with wide tracking only on short stickers (tiers, format, "Draft Box").

The site name in the letterhead is Cherry Swash 700 at 1.25rem in Logo Pink, shown from md (logo only below).

### Named Rules
**The Deadpan Numbers Rule.** Win rates, prices, per-person costs, counts and odds are plain Geist with tabular figures. They rank by weight and case at one body size, never by a display face, a color or a size jump.

**The Swash Is Paper Rule.** Cherry Swash appears only on the site name, page titles and section headings. Never on a number, a button or body text.

## Layout

- Pages sit in a 80rem column (`max-w-7xl`) with a 16px gutter on phones and 32px from md; the letterhead runs slightly wider (84rem).
- Card-image grids are fluid: auto-fill columns with an 8.5rem minimum (7.5rem for mana fixing), 12px column gap and 20px row gap. A phone gets two columns, a laptop six or seven. Never a fixed card width inside a fixed track.
- Index grids: Play Box is one, two, then three columns (sm, xl) with a 20px gap; Deck Hub one to four columns (sm, lg, xl) with a 24px gap.
- The set page opens with a context band, Pack Contents beside Set Mechanics at 1:2 from lg, then full-width archetype sheets stacked 24px apart.
- Rhythm: tight inside a group (4 to 12px), 32px under a page header, 48px between sections.
- The letterhead is one row, 56px on phones and 64px from sm, sticky at the top.
- Touch screens (no hover) get inline versions of anything that is hover-only on laptops: the cost-math panel drops under the costs, and the first tap on a card opens its preview.

## Elevation & Depth

The page is paper on paper. Letter sheets lie flat with a hairline edge and a small ambient shadow, and lift to a medium shadow on hover. Stationery objects carry their own physical depth: stickers and taped photos cast a soft plum-tinted shadow (rgb(66 10 39) at 8 to 22% opacity) because they sit on top of the sheet. Real elevation is reserved for things that float over content: dialogs and toasts use a large soft shadow, and the Floating Preview the largest.

### Named Rules
**The Plum Shadow Rule.** Stationery shadows are tinted plum (rgb(66 10 39)), never black, and stay small and soft: an object pressed onto paper, not a card hovering in space.

**The Float Only Rule.** A shadow larger than the hover lift means the element is above the page (preview, dialog, toast). Letter sheets never go further than the hover lift.

## Shapes

- Letter sheets for boxes and decks use 12px corners; set-page panels and dialogs 16px; buttons and inputs 8px; stickers and nav links 6px; pod chips, the theme toggle and progress bars are full pills.
- Card images keep the printed card's own shape: a 488:680 box with an elliptical corner of 4.5% by 3.2%. Images are never cropped with object-cover inside a card frame.
- Stickers are die-cut: a 2px cut edge (white by day, Rose Tissue by night) and a tilt of 2 degrees, alternating left and right.
- The letterhead ends in a scalloped edge: 6px half-circles every 14px, with a 1px hairline under them.
- Washi tape is diagonal stripes of two sakura tints (7px bands at -45 degrees), overhanging its text by 0.3em; as a heading block it tilts -1 degree.
- Taped photos have a 5px white print border, a 2-degree tilt and a 56 by 18px strip of tape across the top.
- Borders are 1px hairlines. No one-sided accent bars on rounded sheets.

## Components

### Buttons
Crisp and stationery-quiet: the ink does the work, not the shape.
- **Shape:** gently rounded (8px).
- **Primary:** Raspberry Ink with white text by day, Sakura Pink with Plum Night ink at night; 8px by 16px, medium weight, a small shadow. One per region (Add Box, New Deck, Open Pack, Sign In, Done).
- **Hover / Focus:** the fill steps one shade (Raspberry Deep by day, Sakura Blossom at night), color transition only. Every control shows a raspberry focus-visible outline.
- **Neutral:** Rose Tissue with Quiet Ink text, for links out and admin upkeep (EDHREC, Share Link, Edit, Cancel, Refresh archetypes).
- **Tinted:** Petal Wash with Raspberry Deep text and a faint sakura border, for a secondary action that still belongs to the ink (QR Code).
- **Outline:** white sheet with an Input Edge border (Sign Out).

### Chips (pods)
- **Style:** full pills, 1px Dot Hairline border, white fill, Quiet Ink text, the count in Muted Ink.
- **State:** the active pod drops its fill and border and is circled in gel pen (a hand-drawn raspberry loop), with Raspberry Deep text and `aria-pressed`. One control restyles the whole deck grid at once.

### Stickers (signature)
Die-cut labels for data: product type on box cards, deck format, archetype tier, Commander bracket, and the two price stickers. Paid price is a butter sticker shown only to the admin; market price is a white sticker with Plum Ink. Prices are bold tabular figures.

### Cards / Containers (letter sheets)
- **Corner Style:** 12px (box and deck sheets), 16px (set-page panels).
- **Background:** Letter Sheet by day, Plum Ink at night.
- **Shadow Strategy:** small ambient shadow, medium on hover (see Elevation).
- **Border:** 1px Dot Hairline (Plum Raised at night), stepping to Input Edge on hover.
- **Internal Padding:** 20px on box sheets, 16px on deck sheets, 20px rising to 24px from md on set panels.

### Inputs / Fields
- **Style:** 1px Input Edge border, 8px corners, Blush Paper fill (Plum Raised at night), 8px by 12px.
- **Focus:** a 2px Sakura Focus ring, outline removed.
- Labels are 0.875rem semibold Quiet Ink above the field.

### Navigation (letterhead)
- A solid paper bar in the page color, sticky, ending in the scalloped edge. Logo at 32px, then the Cherry Swash site name in Logo Pink from md.
- Links are 0.875rem medium with an icon: Soft Ink at rest, Rose Tissue hover. The current page is Plum Ink with a wavy raspberry gel-pen underline and `aria-current`.
- Sign In is a primary button that collapses to its icon on phones; the theme toggle is a round Rose Tissue button.

### Card Tile (signature)
A card image at its true shape with a hairline ring, a rarity badge in the bottom-left corner, then the card name and a one-line role caption ("Bomb rare", "Signpost", "Land"). Hover adds a 2px Sakura Focus ring and a medium shadow, never a scale. Hover or focus opens the Floating Preview.

### Floating Preview (signature)
A fixed Plum Ink panel up to 28rem wide (30rem for mechanic examples) with a 12px corner, the largest shadow and a faint white ring: the full card image, mana cost in Geist Mono, type line and rarity, complete oracle text, and the 17Lands stat line (GIH WR, IWD, ATA, games). It is measured after render and clamped inside the viewport, placed above its card when it fits under the letterhead, otherwise below. On touch screens the first tap opens it and it carries an "Open on Scryfall" link.

### Box Sheet and cost math (signature)
A letter sheet with the set symbol in a small paper tile, tinted in the product-type hue; the name; the type sticker; the price stickers; a packs-left bar in the product-type hue; and a two-column Draft / Sealed per-person cost list (3 and 6 packs). The arithmetic behind those costs ("$140.00 ÷ 30 packs = $4.67 a pack; Draft 3 × $4.67 = $14.00") appears in a small white panel over the inventory row on hover or keyboard focus, and inline under the costs on touch screens. It is always shown in full; nothing is rounded silently ("≈" marks a rounded per-pack price).

### Deck Sheet (signature)
A 16:9 art header with the deck name in white over a plum gradient and the bracket sticker in the top corner, then the format sticker in mint, color identity, pod tags, and a neutral link-out button beside the tinted QR Code button.

### Sparkle
A four-point butter star with a burnt-amber edge, 14px, set inline before a stat. It appears only beside a number that earns it: today a 17Lands GIH win rate of 58% or more, with a "58%+ win rate" title.

## Do's and Don'ts

### Do:
- **Do** route every solid action surface through the accent, accent-hover and on-accent tokens: white on Raspberry Ink is 5.2:1 by day, Plum Night on Sakura Pink is 6.95:1 at night.
- **Do** put page titles in Cherry Swash on washi tape, and section headings in Cherry Swash on a tilted washi block with a raspberry icon.
- **Do** mark "you are here" with the gel pen: the wavy underline for the current page, the hand-drawn circle for the active pod.
- **Do** use stickers for data labels (type, format, tier, bracket, price), in their own hue, never sakura.
- **Do** keep card images at 488:680 with the card's own corner (4.5% by 3.2%) in fluid auto-fill grids.
- **Do** clamp every floating element to the viewport at 390px, 1024px and 1440px.
- **Do** give touch screens an inline version of anything that is hover-only on laptops.
- **Do** keep secondary text at Muted Ink or darker on white and blush (4.9:1), and Muted Night or lighter on plum (5.47:1).

### Don't:
- **Don't** use sakura for data, status, product types, brackets or decoration (The One Ink Rule).
- **Don't** put a sparkle anywhere except beside a number that earns it (58% or more win rate). No decorative stars, hearts or glitter in the interface (the logo's gold star is brand art).
- **Don't** dress up a stat: no Cherry Swash, color or size jump on win rates and costs; plain Geist, tabular. The two price stickers are the only stickers that hold a figure, and their figures stay Geist tabular.
- **Don't** use slate, pure gray or black; every neutral comes from the plum-tinted paper scale.
- **Don't** use black shadows on stickers or photos; stationery shadows are plum-tinted and small.
- **Don't** crop or rescale card art to fit a box; change the box.
- **Don't** recolor the logo artwork or move the site name off Logo Pink and Cherry Swash.
- **Don't** invent ratings, prices or stats; show nothing until real data exists.
