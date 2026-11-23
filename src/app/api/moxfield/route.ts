import { NextResponse } from 'next/server';

// Import a public Moxfield deck as plain decklist text for the Deck Hub editor.
//
// Moxfield has no public API; this uses the same unofficial endpoint as the
// `moxfield-api` library (api2.moxfield.com/v3/decks/all/{id}). Moxfield sits behind
// Cloudflare rate limiting, so be gentle: one request per import, NO retries (a 429 is
// reported back with its Retry-After), responses cached 10 minutes per deck, and at most
// one upstream call every 3 seconds per server instance. Pasting the list is the fallback.

const UPSTREAM = 'https://api2.moxfield.com/v3/decks/all/';
const MIN_GAP_MS = 3000;
let lastUpstreamCall = 0;

interface MoxEntry {
  quantity: number;
  card: { name: string; set?: string; cn?: string };
}
interface MoxBoard { count?: number; cards?: Record<string, MoxEntry> }
interface MoxDeck {
  name?: string;
  format?: string;
  publicUrl?: string;
  boards?: Record<string, MoxBoard>;
}

const FORMAT_MAP: Record<string, string> = {
  commander: 'Commander', brawl: 'Brawl', historicbrawl: 'Brawl', standardbrawl: 'Brawl',
  standard: 'Standard', pioneer: 'Pioneer', modern: 'Modern', legacy: 'Legacy',
  pauper: 'Pauper', limited: 'Limited', draft: 'Limited', sealed: 'Limited',
};

/** Accepts a full moxfield.com/decks/... URL or a bare public id. */
function deckIdFrom(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/i);
  const id = fromUrl ? fromUrl[1] : trimmed;
  return /^[A-Za-z0-9_-]{6,40}$/.test(id) ? id : null;
}

function boardLines(board?: MoxBoard): string[] {
  return Object.values(board?.cards ?? {}).map(e => {
    const printing = e.card.set && e.card.cn ? ` (${e.card.set.toUpperCase()}) ${e.card.cn}` : '';
    return `${e.quantity} ${e.card.name}${printing}`;
  });
}

export async function GET(request: Request) {
  const deckId = deckIdFrom(new URL(request.url).searchParams.get('deck') ?? '');
  if (!deckId) {
    return NextResponse.json({ error: 'Paste a Moxfield deck link like https://moxfield.com/decks/abc123.' }, { status: 400 });
  }

  const wait = lastUpstreamCall + MIN_GAP_MS - Date.now();
  if (wait > 0) {
    return NextResponse.json(
      { error: `Please wait ${Math.ceil(wait / 1000)} seconds before importing again.`, retryAfter: Math.ceil(wait / 1000) },
      { status: 429 });
  }

  let res: Response;
  try {
    lastUpstreamCall = Date.now();
    res = await fetch(UPSTREAM + deckId, {
      headers: { Accept: 'application/json', 'User-Agent': 'CardcaptorStuart/1.0 (personal deck import)' },
      next: { revalidate: 600 },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach Moxfield. Paste the decklist instead." }, { status: 502 });
  }

  if (res.status === 404) {
    return NextResponse.json({ error: "Moxfield couldn't find that deck. Make sure it's public." }, { status: 404 });
  }
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10) || 60;
    return NextResponse.json(
      { error: `Moxfield is rate-limiting requests. Try again in ${retryAfter} seconds, or paste the decklist.`, retryAfter },
      { status: 429 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: `Moxfield refused the request (HTTP ${res.status}). Use Moxfield's Export → Copy and paste the list instead.` },
      { status: 502 });
  }

  let deck: MoxDeck;
  try {
    deck = await res.json() as MoxDeck;
  } catch {
    return NextResponse.json({ error: 'Moxfield sent something unexpected. Paste the decklist instead.' }, { status: 502 });
  }

  const b = deck.boards ?? {};
  const commanders = boardLines(b.commanders);
  const sections: string[] = [];
  if (commanders.length) sections.push(['Commander', ...commanders].join('\n'));
  if (boardLines(b.companions).length) sections.push(['Companion', ...boardLines(b.companions)].join('\n'));
  sections.push(['Deck', ...boardLines(b.mainboard)].join('\n'));
  const side = [...boardLines(b.sideboard), ...boardLines(b.maybeboard)];
  if (side.length) sections.push(['Sideboard', ...side].join('\n'));

  const firstCommander = Object.values(b.commanders?.cards ?? {})[0]?.card.name;
  return NextResponse.json({
    name: deck.name ?? '',
    format: FORMAT_MAP[(deck.format ?? '').toLowerCase()] ?? 'Other',
    commander: firstCommander ?? '',
    link: deck.publicUrl ?? `https://moxfield.com/decks/${deckId}`,
    decklistText: sections.join('\n\n'),
    cardCount: Object.values(b).reduce((n, board) => n + (board.count ?? 0), 0),
  });
}
