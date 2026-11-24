import { NextResponse } from 'next/server';

// Import a deck from a deck-site link and return it as decklist text the Deck Editor already
// understands. Archidekt's public API is read server-side (it only allows browser calls from
// its own origins). Moxfield is not fetched: its API sits behind Cloudflare and refuses other
// sites, so the editor asks for Moxfield's own Export text instead.

const UA = 'CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)';

interface ArchidektCard {
  quantity: number;
  categories?: string[] | null;
  card: {
    collectorNumber?: string;
    edition?: { editioncode?: string };
    oracleCard: { name: string; gameChanger?: boolean };
  };
}
interface ArchidektDeck {
  name: string;
  deckFormat?: number;
  edhBracket?: number | null;
  categories?: { name: string; includedInDeck?: boolean; isPremier?: boolean }[];
  cards?: ArchidektCard[];
}

// Archidekt's numeric formats, only the ones Deck Hub has a name for.
const ARCHIDEKT_FORMATS: Record<number, string> = { 1: 'Standard', 2: 'Modern', 3: 'Commander', 4: 'Legacy', 6: 'Pauper' };

export interface ImportedDeck {
  source: 'archidekt';
  name: string;
  format?: string;
  bracket?: number;
  commander?: string;
  decklistText: string;
  link: string;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')?.trim() ?? '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return fail(400, 'That doesn’t look like a link. Paste the deck’s address from Archidekt.');
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'moxfield.com') {
    return fail(422, 'Moxfield doesn’t let other sites read its decks. On the Moxfield deck, choose Export, copy the list and paste it below. The link has been filled in for you.');
  }
  if (host !== 'archidekt.com') {
    return fail(400, 'Only Archidekt links can be imported. For other sites, paste the decklist below.');
  }

  const id = url.pathname.match(/^\/(?:api\/)?decks\/(\d{1,12})(?:\/|$)/)?.[1];
  if (!id) return fail(400, 'That Archidekt link doesn’t point at a deck. It should look like archidekt.com/decks/1234567.');

  let deck: ArchidektDeck;
  try {
    const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404 || res.status === 403) return fail(404, 'Archidekt says that deck is private or doesn’t exist. Make it public (or unlisted) and try again.');
    if (res.status === 429) return fail(429, 'Archidekt is rate-limiting requests. Wait a minute and try again.');
    if (!res.ok) return fail(502, `Archidekt returned an error (HTTP ${res.status}). Try again later, or paste the list.`);
    deck = await res.json() as ArchidektDeck;
  } catch {
    return fail(502, 'Couldn’t reach Archidekt. Try again later, or paste the list.');
  }

  // A card's first category decides where it goes; categories marked "not in deck"
  // (Maybeboard, Sideboard) become the sideboard.
  const included = new Map((deck.categories ?? []).map(c => [c.name, c.includedInDeck !== false]));
  const boards: Record<'commander' | 'main' | 'sideboard', string[]> = { commander: [], main: [], sideboard: [] };
  for (const c of deck.cards ?? []) {
    const name = c.card?.oracleCard?.name;
    if (!name || !c.quantity) continue;
    const cats = c.categories ?? [];
    const board = cats.includes('Commander') ? 'commander'
      : cats.length && included.get(cats[0]) === false ? 'sideboard' : 'main';
    const set = c.card.edition?.editioncode;
    const num = c.card.collectorNumber;
    boards[board].push(`${c.quantity} ${name}${set && num ? ` (${set.toUpperCase()}) ${num}` : ''}`);
  }
  if (!boards.commander.length && !boards.main.length) return fail(422, 'That Archidekt deck has no cards yet.');

  const sections = [
    boards.commander.length ? `Commander\n${boards.commander.join('\n')}` : '',
    boards.main.length ? `Deck\n${boards.main.join('\n')}` : '',
    boards.sideboard.length ? `Sideboard\n${boards.sideboard.join('\n')}` : '',
  ].filter(Boolean);

  const format = boards.commander.length ? 'Commander' : ARCHIDEKT_FORMATS[deck.deckFormat ?? 0];
  const body: ImportedDeck = {
    source: 'archidekt',
    name: deck.name,
    ...(format ? { format } : {}),
    ...(deck.edhBracket && deck.edhBracket >= 1 && deck.edhBracket <= 5 ? { bracket: deck.edhBracket } : {}),
    ...(boards.commander.length ? { commander: boards.commander[0].replace(/^\d+\s+/, '').replace(/\s+\([A-Z0-9]+\)\s+\S+$/, '') } : {}),
    decklistText: sections.join('\n\n'),
    link: `https://archidekt.com/decks/${id}`,
  };
  return NextResponse.json(body);
}
