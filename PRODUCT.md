# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Stuart (owner, sole admin).** Curates everything: adds sealed boxes, imports decks, tags pods, keeps the collection. Plans on a laptop ahead of play night.
- **The playgroup (view-only friends).** Open a shared link to decide what to play and to learn a format before or during the game. They do not sign in to browse.

Play night comes first: the app earns its keep when friends use it to pick something to play. Stuart's admin side is upkeep that makes that possible.

## Product Purpose

A personal Magic: The Gathering hub that turns one collection into a menu of ready-to-play experiences. It covers sealed booster boxes ready to draft, Commander decks grouped into pods, and later cubes. Each comes with enough guidance (draft archetypes, set mechanics, key cards, Commander brackets) that a friend can sit down and play without prior homework.

Success: on play night, a friend can open the link, choose something, and understand how to play it in a few minutes, on whatever device is in their hand.

## Positioning

It is built from what is actually on Stuart's shelf. Other draft guides and deck sites describe every set or every deck. This one shows only the boxes Stuart owns and the decks he has built, and annotates them for this playgroup: which decks play well together (pods), how strong a Commander deck is (bracket), and what each sealed box drafts like.

## Operating Context

- Used evenly on laptops (planning, browsing ahead of time) and phones (looking something up mid-game at the table). Both are first-class; neither is a reduced version.
- Shared by link with friends. Browsing is public; only Stuart writes.
- Play night is the ritual: a sealed box gets drafted, or decks from a pod get played against each other.

## Capabilities and Constraints

Live today:
- **Play boxes** (`/play-box`): sealed products, packs left, and a set page per box with pack contents, set mechanics, the ten draft archetypes with tiers, key cards per archetype, and mana fixing.
- **Deck hub** (`/decks`): decks imported from Archidekt links or pasted lists, Commander bracket (set by hand or estimated from Game Changers), pods for decks that play well together, and QR codes for deck links.
- **Collection** (`/collection`, admin only): CSV import.

Planned (confirmed 2026-11-24):
- Collection value: purchase price, current market value and profit/loss. Prices must be hideable from friends.
- Cube builder: a cube workspace, plus tagging collection cards as "In Cube".
- Play-night voting/claiming: friends upvote what to play or claim a deck for the night.

Dropped (confirmed 2026-11-24):
- Gmail receipt parsing and the Inbox approval queue.
- Pushing the collection to Moxfield. Moxfield blocks automated access, so Moxfield decks come in as pasted lists.

Data constraints:
- Draft statistics come only from 17Lands **public datasets** (CC BY 4.0), precomputed into `data/limited-stats/`. The app never calls 17Lands at runtime. A new set has no tiers until about two weeks after release.
- Card data and images come from Scryfall. Archidekt is fetched server-side only.
- Terminology follows Magic usage: Play box, Pod, Bracket (1 Exhibition, 2 Core, 3 Upgraded, 4 Optimized, 5 cEDH), Game Changers, Archetype, Signpost uncommon, Mechanic.

## Brand Commitments

- Name: **Cardcaptor Stuart**.
- Existing logo (`src/app/icon.png`, `public/logo.png`) and the WUBRG mana symbol images in `public/mana/`.

## Evidence on Hand

- Real content only: Stuart's actual boxes, decks and collection in Firestore. Card art and text from Scryfall. Archetype text from Wizards prerelease guides. Win rates from 17Lands public data.
- No testimonials, user counts, or prices exist yet. Do not invent them.

## Product Principles

1. **Play night first.** A friend picking something to play is the primary path; admin tools stay out of their way.
2. **Shelf truth.** Show what is actually owned and built, with real data. Never mock ratings, prices or stats.
3. **Learn it in minutes.** Every playable thing carries just enough guidance to start playing, not a full strategy article.
4. **Equal on phone and laptop.** Card images, previews and grids must work at both sizes without clipping.
5. **Cards are the content.** Card images keep their true shape and stay readable; the interface supports them, not the other way round.
