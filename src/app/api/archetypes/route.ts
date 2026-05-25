import { NextResponse } from 'next/server';

// Sets that intentionally have 3-color archetypes
const THREE_COLOR_SETS = new Set(['KTK', 'FRF', 'DTK', 'TDM', 'MOM', 'NEO']);

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

interface Archetype {
  name: string;
  colors: string[];
  desc: string;
  source?: string;
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
      name: signpost.name,
      colors,
      desc: oracleSnippet
        ? `Signpost — ${signpost.type_line}. "${oracleSnippet}${oracleSnippet.length >= 220 ? '...' : ''}"`
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

  // Run Draftsim scrape and Scryfall signpost fetch in parallel
  const [draftsimResult, scryfallArchetypes] = await Promise.allSettled([
    (async () => {
      const response = await fetch(draftsimUrl, {
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
        if (!headingText || headingText.length < 4 || headingText.length > 100) continue;

        if (/^\d+$/.test(headingText)) continue;
        if (/table of contents|introduction|overview|conclusion|tldr|tl;dr|rating|tier|key mechanic|format tip|general advice|wrap.?up|summary|final thoughts/i.test(headingText)) continue;

        const colors = inferColors(headingText, allowThreeColor);
        if (!colors || colors.length === 0) continue;

        const colorKey = [...colors].sort().join('/');
        if (seenColorKeys.has(colorKey)) continue;
        seenColorKeys.add(colorKey);

        const desc = extractTextAfterHeading(html, match.index + match[0].length);
        if (!desc) continue;

        found.push({ name: headingText, colors, desc, source: 'draftsim' });
      }
      return found;
    })(),
    fetchScryfallSignposts(setCode, allowThreeColor),
  ]);

  const draftsimArchetypes = draftsimResult.status === 'fulfilled' ? draftsimResult.value : [];
  const scryfallData = scryfallArchetypes.status === 'fulfilled' ? scryfallArchetypes.value : [];

  // Merge: use Draftsim descriptions where available, fill gaps with Scryfall
  const seenKeys = new Set<string>();
  const merged: Archetype[] = [];

  for (const a of draftsimArchetypes) {
    const key = [...a.colors].sort().join('/');
    if (!seenKeys.has(key)) { seenKeys.add(key); merged.push(a); }
  }

  for (const a of scryfallData) {
    const key = [...a.colors].sort().join('/');
    if (!seenKeys.has(key)) { seenKeys.add(key); merged.push(a); }
  }

  if (merged.length === 0) {
    return NextResponse.json(
      { error: `No archetypes found for "${setCode}" from Draftsim or Scryfall. The set may be too new or use a non-standard set code.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    archetypes: merged,
    sources: {
      draftsim: draftsimArchetypes.length > 0 ? draftsimUrl : null,
      scryfall: scryfallData.length > 0 ? `https://scryfall.com/search?q=set:${setCode}+rarity:uncommon+colors>=2` : null,
    },
  });
}
