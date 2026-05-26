import { NextResponse } from 'next/server';

// Sets that intentionally have 3-color archetypes
const THREE_COLOR_SETS = new Set(['KTK', 'FRF', 'DTK', 'TDM', 'MOM', 'NEO']);

interface GuideMechanic {
  name: string;
  desc: string;
  colors: string[];
}

// Hardcoded set mechanics from official Wizards prerelease guides.
// Colors indicate which color(s) the mechanic primarily appears in.
const HARDCODED_MECHANICS: Record<string, GuideMechanic[]> = {
  TLA: [
    { name: 'Waterbend', colors: ['U', 'B'], desc: 'A cycle of activated abilities that trigger value when used — card draw, removal, or other effects. Waterbend cards are the backbone of the Blue-Black archetype and appear across all water-aligned strategies.' },
    { name: 'Earthbend', colors: ['R', 'G', 'B'], desc: 'Earthbending animates lands into creatures (often until end of turn) or places +1/+1 counters on your creatures. Central to Red-Green ramp and Black-Green counters archetypes.' },
    { name: 'Ally', colors: ['G', 'W', 'R'], desc: 'Ally is a creature subtype. When an Ally enters, other Allies — and Ally-payoff permanents — trigger bonus effects. Core to the Green-White and Red-White go-wide strategies.' },
    { name: 'Lessons', colors: ['U', 'R', 'G'], desc: 'Lesson spells interact with the graveyard — some gain bonus effects when cast from there, others recur themselves. Key engine in Blue-Red (Combat Lessons) and Green-Blue (Ramp & Lessons).' },
    { name: 'Investigate', colors: ['W', 'U'], desc: 'Creates a Clue artifact token. Sacrifice the Clue and pay {2} to draw a card. Fuels the Blue-Black "draw two" engine and synergizes with the White-Blue flyers archetype.' },
  ],
  FIN: [
    { name: 'Town', colors: [], desc: 'Towns are a new land subtype for FIN dual lands. Each Town enters tapped unless you control the right basic land type, then it produces two colors of mana and often has an additional enters ability.' },
    { name: 'Sagas', colors: [], desc: 'Enchantments with lore counters that trigger on your upkeep. Each chapter has an effect; when the final chapter resolves, the Saga is sacrificed.' },
    { name: 'Job Select', colors: ['W', 'G'], desc: 'Job Select lets you choose one of several distinct modes — each representing a classic Final Fantasy job class — giving the card flexibility depending on the board state.' },
    { name: 'Limit Break', colors: ['R'], desc: 'Limit Break cards are double-faced permanents (usually creatures) that can flip into a stronger form after meeting a condition, referencing the Limit Break mechanic from the Final Fantasy games.' },
    { name: 'Equipment', colors: ['W', 'R'], desc: 'Artifact subtype that can be attached to creatures for bonuses. Equipment stays on the battlefield when the creature dies, ready to be re-equipped.' },
  ],
};

// Hardcoded archetypes for sets where Draftsim coverage is missing or wrong.
// Source: official Wizards prerelease guides + community analysis.
const HARDCODED_ARCHETYPES: Record<string, Omit<Archetype, 'source'>[]> = {
  TLA: [
    { name: "Air Nomads — Flying Finishers", colors: ["White", "Blue"], desc: "Build an air force of flying creatures, pump them for finishing blows, and soar over the opposition. Investigate for card advantage to stay ahead on resources while pressing the skies." },
    { name: "Water Tribe — Draw Two", colors: ["Blue", "Black"], desc: "Generate Clue tokens, trigger Waterbend abilities, and draw two cards at a time for overwhelming card advantage. Control the pace and bury opponents in value." },
    { name: "Fire Nation — Aggro Tokens", colors: ["Black", "Red"], desc: "The most aggressive archetype: flood the board with creature tokens and convert them into direct damage. The relentless pressure of Fire Nation offense closes games before opponents stabilize." },
    { name: "Earth Rumble — Ramp", colors: ["Red", "Green"], desc: "Use Earthbending to turn lands into creatures for surprise blocks and attacks, while ramping into oversized green threats ahead of schedule. Land acceleration powers an unstoppable late game." },
    { name: "Southern Raiders — Allies", colors: ["Green", "White"], desc: "Ally tribal rewards every new creature with ETB bonuses that snowball across the whole team. Go wide with an army of Allies and overwhelm opponents who can't keep pace." },
    { name: "Dai Li — Sacrifice", colors: ["White", "Black"], desc: "Set up death triggers, manufacture sacrifice fodder, and grind out recursive value effects. Every creature death fuels another threat, making this archetype resilient to removal." },
    { name: "Combat Lessons", colors: ["Blue", "Red"], desc: "Aggressive combat combined with Lesson spells that reward both attacking and graveyard interaction. Tempo attacks enable Lesson payoffs for a hybrid aggressive-value strategy." },
    { name: "Earthbending Counters", colors: ["Black", "Green"], desc: "Earthbend counters onto your creatures to 'arm' them with +1/+1 and power through combat. Finishers grow enormous via counter accumulation while black removal clears the path." },
    { name: "Nations United — Go Wide", colors: ["Red", "White"], desc: "Combine Ally token generation with red aggro spells and combat tricks. Deploy a wide board, trigger Ally synergies, and use red removal to push through the final points of damage." },
    { name: "Avatar Ramp — Lessons", colors: ["Green", "Blue"], desc: "Search out lands, build mana acceleration, and set up unblockable payoffs. Lessons in the graveyard provide repeated value while large late-game spells close out the game." },
  ],
  NEO: [
    { name: "Vehicles / Pilots", colors: ["White", "Blue"], desc: "Crew powerful vehicles using cheap pilot creatures to push massive damage. Artifacts and pilots synergize to apply early pressure." },
    { name: "Ninjutsu / Rogue", colors: ["Blue", "Black"], desc: "Sneak unblockable creatures through and swap them with Ninjas for powerful combat damage triggers. Rogue tribal provides additional payoffs." },
    { name: "Artifact Sacrifice", colors: ["Black", "Red"], desc: "Generate cheap artifact tokens and sacrifice them to fuel powerful engines. Menace creatures and sacrifice outlets create consistent pressure." },
    { name: "Modified / Aggro", colors: ["Red", "Green"], desc: "Equip, enchant, or put counters on your creatures to make them huge and trigger 'modified' synergies. Equipment and auras push through combat." },
    { name: "Enchantments / Go Wide", colors: ["Green", "White"], desc: "Build an army of enchantment creatures and stack auras to overwhelm the board. Token generation supports the wide strategy." },
    { name: "Artifacts & Enchantments", colors: ["White", "Black"], desc: "Balance artifacts and enchantments to trigger synergistic value engines. Removal and recursion keep the engine running." },
    { name: "Artifacts / Spells", colors: ["Blue", "Red"], desc: "Synergize cheap artifacts with powerful spells to build massive mechanical threats. Improvise and spell-based payoffs close games." },
    { name: "Ninjas / Recursion", colors: ["Black", "Green"], desc: "Grind out the long game with recursion and value-generating Ninjas. Channel abilities provide flexible early game plays." },
    { name: "Samurai / Warriors", colors: ["Red", "White"], desc: "Attack with a single, heavily buffed Samurai to trigger powerful 'attacks alone' abilities. Reconfigure artifacts provide versatility." },
    { name: "Channel / Ramp", colors: ["Green", "Blue"], desc: "Discard large creatures for their channel abilities early, then cast them late game. Green ramp enables the enormous payoffs." },
  ],
  ECI: [
    { name: "Merfolk Tempo", colors: ["White", "Blue"], desc: "Tempo-oriented deck using Merfolk and Convoke to overwhelm opponents before they stabilize. Tribal synergies pump the whole team." },
    { name: "Kithkin Aggro", colors: ["Green", "White"], desc: "Go-wide aggressive deck focusing on battlefield presence. Kithkin tribal generates tokens and buffs the whole team." },
    { name: "Goblins / Sacrifice", colors: ["Black", "Red"], desc: "Aggressive deck centered on Blight and sacrifice synergies. Cheap Goblins flood the board and sacrifice for value." },
    { name: "Elves / Graveyard", colors: ["Black", "Green"], desc: "Graveyard-synergy midrange deck. Elves ramp early, and the deck grinds the late game with recursion and persist." },
    { name: "Elementals / Spells", colors: ["Blue", "Red"], desc: "Setup-and-payoff deck for casting spells with MV 4 or greater. Elemental tribal payoffs reward expensive spells." },
    { name: "Faerie Flash", colors: ["Blue", "Black"], desc: "Tempo/control deck that rewards playing at instant speed. Faerie tribal punishes opponents who tap out on their turn." },
    { name: "Orzhov Attrition", colors: ["White", "Black"], desc: "Midrange deck using Blight to weaken opposing creatures. Grind out value through removal and recursion." },
    { name: "Boros Aggro", colors: ["Red", "White"], desc: "Aggressive archetype utilizing combat tricks and efficient threats. Get under the opponent fast and close with burn." },
    { name: "Vivid Ramp", colors: ["Green", "Blue"], desc: "Focuses on the Vivid mechanic for mana fixing and scaling into huge late-game threats." },
    { name: "Vivid Midrange", colors: ["Red", "Green"], desc: "Leverages the Vivid mechanic for fixing and plays midrange threats with strong enters-the-battlefield effects." },
  ],
  UNF: [
    { name: "Name Stickers", colors: ["White", "Blue"], desc: "Add words to card names to trigger bonuses. Sticker Wizard gives permanents extra bonuses based on their names." },
    { name: "Precision Die-Rolling", colors: ["Blue", "Black"], desc: "Use dice rolling for controlling effects and value generation. High rolls generate card advantage and removal." },
    { name: "High-Roll Build-Up", colors: ["Black", "Red"], desc: "Succeed on high dice rolls to generate powerful effects. Aggressive creatures threaten lethal when you hit good numbers." },
    { name: "Art Stickers", colors: ["Blue", "Red"], desc: "Use art stickers and spell-casting synergies. Combo-oriented deck that generates value through sticker synergies." },
    { name: "Hats Matter", colors: ["White", "Black"], desc: "Aggressive archetype rewarding creatures with hats. Sticker synergies buff the whole team when equipped with the right accessories." },
    { name: "Attractions", colors: ["Black", "Green"], desc: "Generate value by opening and visiting Attractions. Consistent Attraction triggers grind out opponents over time." },
    { name: "Clown Robot Aggro", colors: ["Red", "White"], desc: "Aggressive tribal strategy focused on Clown creatures and artifact synergies. Overwhelm before opponents can stabilize." },
    { name: "P/T Stickers", colors: ["Green", "Blue"], desc: "Stompy deck using power/toughness stickers to grow creatures into massive threats that demand immediate answers." },
    { name: "Mass Die-Rolling", colors: ["Red", "Green"], desc: "Roll many dice at once to overwhelm the opponent with sheer volume of triggers and random beneficial effects." },
    { name: "Ability Stickers", colors: ["Green", "White"], desc: "Put ability stickers on creatures to give them keywords and go tall. A single huge threat with multiple abilities closes the game." },
  ],
  KTK: [
    { name: "Abzan / Outlast", colors: ["White", "Black", "Green"], desc: "Grind out the long game with +1/+1 counters and resilient creatures. Outlast builds a snowballing board that never stops growing." },
    { name: "Jeskai / Prowess", colors: ["Blue", "Red", "White"], desc: "Chain non-creature spells to buff your team with Prowess triggers and push through damage each combat step." },
    { name: "Sultai / Delve", colors: ["Black", "Green", "Blue"], desc: "Fill your graveyard to cast massive Delve threats ahead of schedule. Graveyard density unlocks enormous mana efficiency." },
    { name: "Mardu / Raid", colors: ["Red", "White", "Black"], desc: "Aggressively attack to trigger powerful Raid bonuses. Fast threats and removal clear the way for constant pressure." },
    { name: "Temur / Ferocious", colors: ["Green", "Blue", "Red"], desc: "Deploy huge 4-power creatures to unlock powerful Ferocious abilities. Ramp accelerates into game-ending threats early." },
  ],
  MH2: [
    { name: "Artifacts / Affinity", colors: ["White", "Blue"], desc: "Utilize artifact synergies, token generation, and affinity payoffs. Modular counters spread across the artifact team on death." },
    { name: "Reanimator", colors: ["White", "Black"], desc: "Discard large creatures and return them to the battlefield for massive tempo advantage. Recursion provides resilience to removal." },
    { name: "Surveil / Self-Discard", colors: ["Blue", "Black"], desc: "Manage the graveyard and utilize self-discard effects. Fill the bin to enable powerful graveyard payoffs." },
    { name: "Delirium", colors: ["Blue", "Red"], desc: "Achieve delirium by filling your graveyard with multiple card types to unlock powerful spell payoffs." },
    { name: "Madness / Aggro", colors: ["Black", "Red"], desc: "Aggressively utilize madness cards and discard outlets. Get double value from cards by casting them on the way to the bin." },
    { name: "Squirrels / Sacrifice", colors: ["Black", "Green"], desc: "Generate Squirrel tokens and leverage sacrifice value. A massive Squirrel army supported by sacrifice payoffs overwhelms opponents." },
    { name: "Storm / Spells", colors: ["Red", "Green"], desc: "Use cheap spells and madness to enable storm turns. A critical mass of spells creates explosive game-ending finishes." },
    { name: "+1/+1 Counters", colors: ["Green", "White"], desc: "Focus on modular and +1/+1 counter synergies. Persist and undying creatures provide inevitable recursive threats." },
    { name: "Tokens / Value", colors: ["Green", "Blue"], desc: "Generate various token types and play for midrange value. Token variety enables powerful cross-synergies." },
    { name: "Modular / Artifact Aggro", colors: ["Red", "White"], desc: "An aggressive deck utilizing modular creatures and artifact synergies. Counters spread on death to maintain relentless pressure." },
  ],
  FIN: [
    { name: 'W/U Artifacts', colors: ['White', 'Blue'], desc: 'Assemble a massive board of artifacts — artifact creatures, Equipment, Treasures, and more. Key cards: Tidus, Blitzball Star grows with artifact tokens; Cid, Timeless Artificer supports artifact creatures.' },
    { name: 'U/B Control', colors: ['Blue', 'Black'], desc: 'Accrue value from the graveyard while playing defensively. Locke Cole enables card draw via discard; Ultimecia, Time Sorceress takes extra turns fueled by discarded resources.' },
    { name: 'B/R Black Mage Aggro', colors: ['Black', 'Red'], desc: 'Cast noncreature spells to deal devastating damage. Black Waltz No. 3 and Wizard tokens convert spells into direct damage; Garland, Knight of Cornelia closes out games.' },
    { name: 'R/G Landfall Aggro', colors: ['Red', 'Green'], desc: 'Transform lands into tide-turning tempo. Rydia, Summoner of Mist searches and recurs creatures; Gladiolus Amicitia applies consistent pressure every turn.' },
    { name: 'G/W Go Wide', colors: ['Green', 'White'], desc: 'Flood the board with creature tokens, then attack for the win. Rinoa Heartilly rewards wide boards; Garnet, Princess of Alexandria powers Saga-focused variants.' },
    { name: 'W/B Sacrifice', colors: ['White', 'Black'], desc: 'Turn permanents into resources through sacrifice synergies. Rufus Shinra generates tokens on attacks; Judge Magister Gabranth provides sacrifice payoffs.' },
    { name: 'U/R Big Noncreatures', colors: ['Blue', 'Red'], desc: 'Cast massive spells for massive value. Shantotto, Tactician Magician and The Emperor of Palamecia reward high-mana spells, synergizing with tiered spells and flashback.' },
    { name: 'B/G Graveyard Value', colors: ['Black', 'Green'], desc: 'Stock the graveyard with permanents to supercharge spells. Exdeath, Void Warlock transforms into threats; Cloud of Darkness provides removal that goes on offense.' },
    { name: 'R/W Equipment Aggro', colors: ['Red', 'White'], desc: 'Suit up creatures with powerful Equipment to dominate combat. Zidane, Tantalus Thief benefits from gear; Giott, King of the Dwarves generates value through the job select mechanic.' },
    { name: 'G/U Town Ramp', colors: ['Green', 'Blue'], desc: 'Play Towns to squeeze extra value from lands. Ignis Scientia accelerates mana; Omega, Heartless Evolution is the late-game payoff after building Town synergies.' },
  ],
};

// Maps set codes → Wizards prerelease guide slug.
// Pattern: https://magic.wizards.com/en/news/feature/{slug}
// Add new sets here as guides are published.
const WIZARDS_GUIDE_SLUGS: Record<string, string> = {
  TLA: 'avatar-the-last-airbender-prerelease-guide',
  FIN: 'final-fantasy-prerelease-guide',
  TDM: 'tarkir-dragonstorm-prerelease-guide',
  DSK: 'duskmourn-house-of-horror-prerelease-guide',
  BLB: 'bloomburrow-prerelease-guide',
  OTJ: 'outlaws-of-thunder-junction-prerelease-guide',
  MKM: 'murders-at-karlov-manor-prerelease-guide',
  LCI: 'lost-caverns-of-ixalan-prerelease-guide',
  WOE: 'wilds-of-eldraine-prerelease-guide',
  LTR: 'lord-of-the-rings-tales-of-middle-earth-prerelease-guide',
  MOM: 'march-of-the-machine-prerelease-guide',
};

const SYMBOL_TO_NAME: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
};

// Guild/wedge/shard → canonical colors (keys must be exact whole words)
const GUILD_COLORS: Record<string, string[]> = {
  azorius: ['White', 'Blue'], dimir: ['Blue', 'Black'], rakdos: ['Black', 'Red'],
  gruul: ['Red', 'Green'], selesnya: ['Green', 'White'], orzhov: ['White', 'Black'],
  izzet: ['Blue', 'Red'], golgari: ['Black', 'Green'], boros: ['Red', 'White'],
  simic: ['Green', 'Blue'],
  // 3-color — only used when allowThreeColor is true
  abzan: ['White', 'Black', 'Green'], jeskai: ['Blue', 'Red', 'White'],
  sultai: ['Black', 'Green', 'Blue'], mardu: ['Red', 'White', 'Black'],
  temur: ['Green', 'Blue', 'Red'], esper: ['White', 'Blue', 'Black'],
  grixis: ['Blue', 'Black', 'Red'], jund: ['Black', 'Red', 'Green'],
  naya: ['Red', 'Green', 'White'], bant: ['Green', 'White', 'Blue'],
};

const COLOR_NAMES = ['white', 'blue', 'black', 'red', 'green'] as const;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .trim();
}

/**
 * Detect color pair from heading text.
 * Priority order:
 *  1. Mana symbols {W}{U}
 *  2. Written pairs "White/Blue", "White-Blue"
 *  3. Single-letter pairs "W/U"
 *  4. Guild names as whole words (\bAzorius\b)
 *  5. Individual color names as whole words
 */
function inferColors(text: string, allowThreeColor: boolean): string[] | null {
  // 1. Mana symbol patterns: {W}{U} or {W}/{U}
  const symbolHits = [...text.matchAll(/\{([WUBRG])\}/gi)].map(m => m[1].toUpperCase());
  const uniqueSymbols = [...new Set(symbolHits)].filter(s => s in SYMBOL_TO_NAME);
  if (uniqueSymbols.length === 2 || (allowThreeColor && uniqueSymbols.length === 3)) {
    return uniqueSymbols.map(s => SYMBOL_TO_NAME[s]);
  }

  // 2. Written color pair: "White/Blue", "White-Blue", "White and Blue"
  const writtenPair = text.match(
    new RegExp(`\\b(${COLOR_NAMES.join('|')})[\\s/\\-–—]+(${COLOR_NAMES.join('|')})\\b`, 'i')
  );
  if (writtenPair) {
    const c1 = writtenPair[1].toLowerCase();
    const c2 = writtenPair[2].toLowerCase();
    if (c1 !== c2) {
      return [c1[0].toUpperCase() + c1.slice(1), c2[0].toUpperCase() + c2.slice(1)];
    }
  }

  // 3. Symbol pair: "W/U", "WU" at word boundary
  const symbolPair = text.match(/\b([WUBRG])\/([WUBRG])\b/i);
  if (symbolPair) {
    return [SYMBOL_TO_NAME[symbolPair[1].toUpperCase()], SYMBOL_TO_NAME[symbolPair[2].toUpperCase()]];
  }

  // 4. Guild/wedge/shard names as whole words only
  for (const [guild, colors] of Object.entries(GUILD_COLORS)) {
    if (!allowThreeColor && colors.length > 2) continue;
    if (new RegExp(`\\b${guild}\\b`, 'i').test(text)) return colors;
  }

  // 5. Individual color names as whole words — accept exactly 2 (or 3 if allowed)
  const found = new Set<string>();
  for (const name of COLOR_NAMES) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.add(name[0].toUpperCase() + name.slice(1));
  }
  if (found.size === 2 || (allowThreeColor && found.size === 3)) return Array.from(found);

  return null;
}

function extractTextAfterHeading(html: string, afterIndex: number, maxChars = 500): string {
  const slice = html.slice(afterIndex);
  const nextHeadingIdx = slice.search(/<h[1-4][^>]*>/i);
  const section = slice.slice(0, nextHeadingIdx === -1 ? undefined : nextHeadingIdx);

  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = paragraphRegex.exec(section)) !== null && parts.join(' ').length < maxChars) {
    const text = stripHtml(m[1]).replace(/\s+/g, ' ').trim();
    if (text.length > 30) parts.push(text);
    if (parts.length >= 3) break;
  }

  const combined = parts.join(' ');
  if (combined.length <= maxChars) return combined;
  const cut = combined.slice(0, maxChars);
  return cut.slice(0, cut.lastIndexOf(' ')) + '...';
}

const NAME_TO_SYMBOL: Record<string, string> = {
  White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G',
};

const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

function colorsTo17LandsKey(colors: string[]): string {
  const symbols = colors.map(c => NAME_TO_SYMBOL[c] || c[0].toUpperCase());
  return symbols
    .sort((a, b) => (WUBRG_ORDER[a] ?? 9) - (WUBRG_ORDER[b] ?? 9))
    .join('');
}

interface Archetype {
  name: string;
  colors: string[];
  desc: string;
  source?: string;
  tier?: string;
}

interface CardRating {
  name: string;
  winRate: number;
  avgLastSeen?: number;
}

/** 17lands: fetch individual card win rates for the set */
async function fetch17LandsCardRatings(setCode: string): Promise<CardRating[]> {
  try {
    const url = `https://www.17lands.com/card_ratings/data?expansion=${setCode}&format=PremierDraft`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data: Array<{ name?: string; ever_drawn_win_rate?: number; win_rate?: number; avg_last_seen_at?: number }> = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter(d => d.name)
      .map(d => ({
        name: d.name!,
        winRate: d.ever_drawn_win_rate ?? d.win_rate ?? 0,
        avgLastSeen: d.avg_last_seen_at,
      }));
  } catch {
    return [];
  }
}

/** 17lands: fetch color pair (or triplet) win rates and map to S/A/B/C/D tiers */
async function fetch17LandsTiers(setCode: string, allowThreeColor: boolean): Promise<Map<string, string>> {
  const tiers = new Map<string, string>();
  try {
    const url = `https://www.17lands.com/color_ratings/data?expansion=${setCode}&format=PremierDraft`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return tiers;
    const data: Array<{ color_name?: string; win_rate?: number; wins?: number; games?: number }> = await res.json();
    if (!Array.isArray(data) || data.length === 0) return tiers;

    // Include 2-color pairs; optionally include 3-color triplets
    const pairs = data.filter(d => {
      const len = (d.color_name || '').length;
      return allowThreeColor ? (len === 2 || len === 3) : len === 2;
    });
    if (pairs.length === 0) return tiers;

    const rates = pairs.map(d => d.win_rate ?? (d.wins && d.games ? d.wins / d.games : 0)).filter(r => r > 0);
    if (rates.length === 0) return tiers;

    const sorted = [...rates].sort((a, b) => b - a);
    const cutoffs = [
      sorted[Math.floor(sorted.length * 0.2)] ?? sorted[0],
      sorted[Math.floor(sorted.length * 0.4)] ?? sorted[0],
      sorted[Math.floor(sorted.length * 0.6)] ?? sorted[0],
      sorted[Math.floor(sorted.length * 0.8)] ?? sorted[0],
    ];

    for (const entry of pairs) {
      const key = (entry.color_name || '').toUpperCase();
      const wr = entry.win_rate ?? (entry.wins && entry.games ? entry.wins / entry.games : 0);
      let tier = 'D';
      if (wr >= cutoffs[0]) tier = 'S';
      else if (wr >= cutoffs[1]) tier = 'A';
      else if (wr >= cutoffs[2]) tier = 'B';
      else if (wr >= cutoffs[3]) tier = 'C';
      tiers.set(key, tier);
    }
  } catch { /* 17lands unavailable or set not yet tracked */ }
  return tiers;
}

/** Scryfall: fetch multicolor uncommons — these are the official signpost cards */
async function fetchScryfallSignposts(setCode: string, allowThreeColor: boolean): Promise<Archetype[]> {
  const minColors = 2;
  const query = encodeURIComponent(
    `set:${setCode} rarity:uncommon colors>=${minColors} is:booster -type:basic`
  );
  const url = `https://api.scryfall.com/cards/search?q=${query}&order=color`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const cards: Array<{
    name: string;
    colors: string[];
    oracle_text?: string;
    type_line: string;
  }> = data.data || [];

  // Group cards by color pair — the dominant card per group is the signpost
  const byPair = new Map<string, typeof cards[0][]>();
  for (const card of cards) {
    if (!card.colors) continue;
    if (!allowThreeColor && card.colors.length > 2) continue;
    const key = [...card.colors].sort().join('/');
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(card);
  }

  const archetypes: Archetype[] = [];
  for (const [, group] of byPair) {
    const signpost = group[0];
    const colors = signpost.colors.map(sym => SYMBOL_TO_NAME[sym] || sym);
    const colorDesc = colors.join('/');

    // Derive strategy hints from oracle text rather than pasting it verbatim
    const oracle = (signpost.oracle_text || '').toLowerCase();
    const hints: string[] = [];
    if (/flying/.test(oracle)) hints.push('flying creatures');
    if (/\+1\/\+1 counter/.test(oracle)) hints.push('+1/+1 counters');
    if (/draw a card|draw cards|draw two/.test(oracle)) hints.push('card draw');
    if (/create.*token/.test(oracle)) hints.push('token generation');
    if (/sacrifice/.test(oracle)) hints.push('sacrifice synergies');
    if (/graveyard/.test(oracle)) hints.push('graveyard value');
    if (/deathtouch/.test(oracle)) hints.push('deathtouch');
    if (/lifelink/.test(oracle)) hints.push('lifegain');
    if (/trample/.test(oracle)) hints.push('trample threats');
    if (/haste/.test(oracle)) hints.push('haste aggro');
    if (/whenever.*attacks|when.*attacks/.test(oracle)) hints.push('attack triggers');
    if (/whenever.*enters|when.*enters/.test(oracle)) hints.push('ETB effects');
    if (/instant|sorcery/.test(oracle) && !/type.*instant|type.*sorcery/.test(oracle)) hints.push('spells matter');

    const hintStr = hints.length > 0 ? `Themes: ${hints.slice(0, 3).join(', ')}. ` : '';
    const typeShort = (signpost.type_line || '').split(' — ')[0];

    archetypes.push({
      name: `${colorDesc} Strategy`,
      colors,
      desc: `${colorDesc} archetype. Key signpost: ${signpost.name} (${typeShort}). ${hintStr}Click Auto-Fetch Archetypes after adding this set's prerelease guide to HARDCODED_ARCHETYPES for full strategy descriptions.`,
      source: 'scryfall',
    });
  }

  return archetypes;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setCode = searchParams.get('set')?.toUpperCase();

  if (!setCode) {
    return NextResponse.json({ error: 'Missing set code parameter' }, { status: 400 });
  }

  const allowThreeColor = THREE_COLOR_SETS.has(setCode);
  const draftsimUrl = `https://draftsim.com/mtg-${setCode.toLowerCase()}-draft-guide/`;

  /** Shared heading-scraper: works on any HTML page that uses headings for color-pair archetypes */
  async function scrapeHeadingsFromUrl(url: string, sourceName: string): Promise<Archetype[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const headingRegex = /<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi;
    const found: Archetype[] = [];
    const seenColorKeys = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(html)) !== null) {
      const headingText = stripHtml(match[1]).replace(/\s+/g, ' ').trim();
      if (!headingText || headingText.length < 4 || headingText.length > 120) continue;
      if (/^\d+$/.test(headingText)) continue;
      if (/table of contents|introduction|overview|conclusion|tldr|tl;dr|rating|tier|key mechanic|format tip|general advice|wrap.?up|summary|final thoughts|draft tips|limited tips|how to play/i.test(headingText)) continue;

      const colors = inferColors(headingText, allowThreeColor);
      if (!colors || colors.length === 0) continue;

      const colorKey = [...colors].sort().join('/');
      if (seenColorKeys.has(colorKey)) continue;
      seenColorKeys.add(colorKey);

      const desc = extractTextAfterHeading(html, match.index + match[0].length);
      if (!desc) continue;

      found.push({ name: headingText, colors, desc, source: sourceName });
    }
    return found;
  }

  // Use hardcoded archetypes when available (authoritative, from official Wizards prerelease guides)
  const hardcoded: Archetype[] = (HARDCODED_ARCHETYPES[setCode] ?? []).map(a => ({ ...a, source: 'hardcoded' }));

  // Wizards guide URL for this set (if known)
  const wizardsSlug = WIZARDS_GUIDE_SLUGS[setCode];
  const wizardsUrl = wizardsSlug
    ? `https://magic.wizards.com/en/news/feature/${wizardsSlug}`
    : null;

  // Run all sources in parallel; skip Draftsim/Wizards if hardcoded data covers the set
  const [wizardsResult, draftsimResult, scryfallResult, tiersResult, cardRatingsResult] = await Promise.allSettled([
    wizardsUrl && hardcoded.length === 0
      ? scrapeHeadingsFromUrl(wizardsUrl, 'wizards')
      : Promise.resolve([]),
    hardcoded.length === 0
      ? scrapeHeadingsFromUrl(draftsimUrl, 'draftsim')
      : Promise.resolve([]),
    fetchScryfallSignposts(setCode, allowThreeColor),
    fetch17LandsTiers(setCode, allowThreeColor),
    fetch17LandsCardRatings(setCode),
  ]);

  const wizardsArchetypes = wizardsResult.status === 'fulfilled' ? wizardsResult.value : [];
  const draftsimArchetypes = draftsimResult.status === 'fulfilled' ? draftsimResult.value : [];
  const scryfallData = scryfallResult.status === 'fulfilled' ? scryfallResult.value : [];
  const tierMap = tiersResult.status === 'fulfilled' ? tiersResult.value : new Map<string, string>();
  const cardRatings = cardRatingsResult.status === 'fulfilled' ? cardRatingsResult.value : [];

  // Merge priority: hardcoded > Wizards guide > Draftsim > Scryfall signposts
  const seenKeys = new Set<string>();
  const merged: Archetype[] = [];

  for (const a of [...hardcoded, ...wizardsArchetypes, ...draftsimArchetypes, ...scryfallData]) {
    const key = [...a.colors].sort().join('/');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const landsKey = colorsTo17LandsKey(a.colors);
      const tier = tierMap.get(landsKey);
      merged.push(tier ? { ...a, tier } : a);
    }
  }

  if (merged.length === 0) {
    return NextResponse.json(
      { error: `No archetypes found for "${setCode}" from Draftsim or Scryfall. The set may be too new or use a non-standard set code.` },
      { status: 404 }
    );
  }

  const guideMechanics: GuideMechanic[] = HARDCODED_MECHANICS[setCode] ?? [];

  return NextResponse.json({
    archetypes: merged,
    mechanics: guideMechanics,
    cardRatings,
    tierSource: tierMap.size > 0 ? '17lands' : null,
    cardRatingsSource: cardRatings.length > 0 ? '17lands' : null,
    sources: {
      draftsim: draftsimArchetypes.length > 0 ? draftsimUrl : null,
      scryfall: scryfallData.length > 0 ? `https://scryfall.com/search?q=set:${setCode}+rarity:uncommon+colors>=2` : null,
    },
  });
}
