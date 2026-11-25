import { NextResponse } from 'next/server';
import { KEY_TAG } from '@/lib/decks';

// Import a deck from an Archidekt link and return it as decklist text the Deck Editor already
// understands, plus the deck's description and the cards its author marked as key. Archidekt's
// public API is read server-side (it only allows browser calls from its own origins).
// Moxfield is not fetched: it has no public API, and Cloudflare refuses server requests to its
// site API (tested 2026-11-25), so the editor asks for Moxfield's Export text, whose #tags
// carry key cards through the decklist parser.


const UA = 'CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)';
const NL = String.fromCharCode(10);
const MAX_DESCRIPTION = 5000;

interface ArchidektCard {
  quantity: number;
  categories?: string[] | null;
  label?: string | null;
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
  description?: string | null;
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
  description?: string;
  /** Card names the author marked as key (by a "Key"/"Win Con" category, label or tag) */
  keyCards?: string[];
  decklistText: string;
  link: string;
}

type Boards = Record<'commander' | 'main' | 'sideboard', string[]>;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const line = (qty: number, name: string, set?: string, num?: string) =>
  `${qty} ${name}${set && num ? ` (${set.toUpperCase()}) ${num}` : ''}`;

function toText(boards: Boards) {
  return [
    boards.commander.length ? `Commander${NL}${boards.commander.join(NL)}` : '',
    boards.main.length ? `Deck${NL}${boards.main.join(NL)}` : '',
    boards.sideboard.length ? `Sideboard${NL}${boards.sideboard.join(NL)}` : '',
  ].filter(Boolean).join(NL + NL);
}

const tidy = (text: string) => {
  const t = text.split(String.fromCharCode(13)).join('').trim();
  return t.length > MAX_DESCRIPTION ? `${t.slice(0, MAX_DESCRIPTION).trimEnd()}…` : t;
};

/** Archidekt stores descriptions as a Quill document: {"ops":[{"insert":"text"}, …]}. */
function archidektDescription(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const doc = JSON.parse(raw) as { ops?: { insert?: unknown }[] };
    const text = (doc.ops ?? []).map(op => (typeof op.insert === 'string' ? op.insert : '')).join('');
    return tidy(text) || undefined;
  } catch {
    return tidy(raw) || undefined;
  }
}

const validBracket = (n?: number | null) => (n && n >= 1 && n <= 5 ? n : undefined);

function respond(body: ImportedDeck) {
  return NextResponse.json(body);
}

async function fromArchidekt(id: string) {
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
  const boards: Boards = { commander: [], main: [], sideboard: [] };
  const keyCards: string[] = [];
  let commander: string | undefined;
  for (const c of deck.cards ?? []) {
    const name = c.card?.oracleCard?.name;
    if (!name || !c.quantity) continue;
    const cats = c.categories ?? [];
    const board = cats.includes('Commander') ? 'commander'
      : cats.length && included.get(cats[0]) === false ? 'sideboard' : 'main';
    if (board === 'commander' && !commander) commander = name;
    boards[board].push(line(c.quantity, name, c.card.edition?.editioncode, c.card.collectorNumber));
    // Archidekt labels look like "Key Card,#ff0000"; the part before the comma is the name.
    const label = (c.label ?? '').split(',')[0];
    if (board !== 'sideboard' && [...cats, label].some(t => t && KEY_TAG.test(t))) keyCards.push(name);
  }
  if (!boards.commander.length && !boards.main.length) return fail(422, 'That Archidekt deck has no cards yet.');

  const format = boards.commander.length ? 'Commander' : ARCHIDEKT_FORMATS[deck.deckFormat ?? 0];
  const description = archidektDescription(deck.description);
  const bracket = validBracket(deck.edhBracket);
  return respond({
    source: 'archidekt',
    name: deck.name,
    ...(format ? { format } : {}),
    ...(bracket ? { bracket } : {}),
    ...(commander ? { commander } : {}),
    ...(description ? { description } : {}),
    ...(keyCards.length ? { keyCards } : {}),
    decklistText: toText(boards),
    link: `https://archidekt.com/decks/${id}`,
  });
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')?.trim() ?? '';
  let url: URL;
  try {
    url = new URL(/^https?:[/][/]/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return fail(400, 'That doesn’t look like a link. Paste the deck’s address from Archidekt.');
  }
  const host = url.hostname.toLowerCase().replace(/^www[.]/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const afterDecks = parts[0] === 'api' ? parts[2] : parts[1];
  const isDecks = (parts[0] === 'api' ? parts[1] : parts[0]) === 'decks';

  if (host === 'moxfield.com') {
    return fail(422, 'Moxfield doesn’t let other sites read its decks. On the Moxfield deck, choose Export, copy the list (tags and all, so key cards come along) and paste it into Decklist below; paste its description too. The link has been filled in for you.');
  }
  if (host === 'archidekt.com') {
    if (!isDecks || !afterDecks || !/^[0-9]{1,12}$/.test(afterDecks)) {
      return fail(400, 'That Archidekt link doesn’t point at a deck. It should look like archidekt.com/decks/1234567.');
    }
    return fromArchidekt(afterDecks);
  }
  return fail(400, 'Only Archidekt links can be imported (Moxfield: use its Export). For other sites, paste the decklist below.');
}
