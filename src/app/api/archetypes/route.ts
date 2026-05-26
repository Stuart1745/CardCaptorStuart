import { NextResponse } from 'next/server';

// Sets that intentionally have 3-color archetypes
const THREE_COLOR_SETS = new Set(['KTK', 'FRF', 'DTK', 'TDM', 'MOM', 'NEO']);

// Hardcoded archetypes for sets where Draftsim coverage is missing or wrong.
// Source: official Wizards prerelease guides.
const HARDCODED_ARCHETYPES: Record<string, Omit<Archetype, 'source'>[]> = {
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
  FIN: 'final-fantasy-prerelease-guide',
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
    const oracleSnippet = signpost.oracle_text
      ? signpost.oracle_text.replace(/\n/g, ' ').slice(0, 220)
      : '';
    archetypes.push({
      name: `${signpost.colors.join('/')} Signpost`,
      colors,
      desc: oracleSnippet
        ? `Signpost (${signpost.name}) — ${signpost.type_line}. "${oracleSnippet}${oracleSnippet.length >= 220 ? '...' : ''}"`
        : `${colors.join('/')} signpost uncommon.`,
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
  const [wizardsResult, draftsimResult, scryfallResult, tiersResult] = await Promise.allSettled([
    wizardsUrl && hardcoded.length === 0
      ? scrapeHeadingsFromUrl(wizardsUrl, 'wizards')
      : Promise.resolve([]),
    hardcoded.length === 0
      ? scrapeHeadingsFromUrl(draftsimUrl, 'draftsim')
      : Promise.resolve([]),
    fetchScryfallSignposts(setCode, allowThreeColor),
    fetch17LandsTiers(setCode, allowThreeColor),
  ]);

  const wizardsArchetypes = wizardsResult.status === 'fulfilled' ? wizardsResult.value : [];
  const draftsimArchetypes = draftsimResult.status === 'fulfilled' ? draftsimResult.value : [];
  const scryfallData = scryfallResult.status === 'fulfilled' ? scryfallResult.value : [];
  const tierMap = tiersResult.status === 'fulfilled' ? tiersResult.value : new Map<string, string>();

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

  return NextResponse.json({
    archetypes: merged,
    tierSource: tierMap.size > 0 ? '17lands' : null,
    sources: {
      draftsim: draftsimArchetypes.length > 0 ? draftsimUrl : null,
      scryfall: scryfallData.length > 0 ? `https://scryfall.com/search?q=set:${setCode}+rarity:uncommon+colors>=2` : null,
    },
  });
}
