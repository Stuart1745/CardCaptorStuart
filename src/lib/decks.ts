// Deck Hub data model, decklist parsing and Scryfall lookups.
// Decks live in Firestore `decks/{id}` (public read, admin write — see firestore.rules).

export type Board = "commander" | "main" | "sideboard";

export interface DeckCardEntry {
  qty: number;
  name: string;
  board: Board;
  /** Front-face type line, used for grouping */
  type: string;
  cmc: number;
  image?: string;
  scryfallUri?: string;
}

export interface Deck {
  id: string;
  name: string;
  format: string;
  /** Commander (or cover card) name */
  commander?: string;
  thumbnail: string;
  link?: string;
  colors: string[];
  cards: DeckCardEntry[];
  /** The decklist exactly as pasted, so Edit shows it back */
  decklistText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DECK_FORMATS = ["Commander", "Brawl", "Standard", "Pioneer", "Modern", "Legacy", "Pauper", "Limited", "Other"];

// The original hard-coded Deck Hub decks, seeded into Firestore on the first admin visit.
export const DEFAULT_DECKS: Deck[] = [
  { id: "fin-ffvi", name: "FF VI: Echoes of the Past", format: "Commander", commander: "Celes, Rune Knight",
    thumbnail: "https://cards.scryfall.io/art_crop/front/3/0/30584c53-533b-4dc7-b07c-8600164a99b3.jpg?1752052917",
    link: "https://edhrec.com/route/?cc=Celes%2C+Rune+Knight", colors: ["W", "B", "R"], cards: [] },
  { id: "fin-ffvii", name: "FF VII: SOLDIER of the Planet", format: "Commander", commander: "Cloud, Ex-SOLDIER",
    thumbnail: "https://cards.scryfall.io/art_crop/front/0/7/07b4e4f8-6a31-4533-be51-668ce3ddc84f.jpg?1752052926",
    link: "https://edhrec.com/route/?cc=Cloud%2C+Ex-SOLDIER", colors: ["G", "R", "W"], cards: [] },
  { id: "fin-ffxiv", name: "FF XIV: Warriors of Darkness", format: "Commander", commander: "G'raha Tia, Scion Reborn",
    thumbnail: "https://cards.scryfall.io/art_crop/front/f/9/f90eb8ef-ad70-4d6c-9958-e6153f8599bc.jpg?1752052927",
    link: "https://edhrec.com/route/?cc=G%27raha+Tia%2C+Scion+Reborn", colors: ["W", "U", "B"], cards: [] },
  { id: "fin-ffx", name: "FF X: Champions of Spira", format: "Commander", commander: "Tidus, Yuna's Guardian",
    thumbnail: "https://cards.scryfall.io/art_crop/front/2/c/2cfd4494-346c-4cbc-8072-e267254cefcc.jpg?1752052930",
    link: "https://edhrec.com/route/?cc=Tidus%2C+Yuna%27s+Guardian", colors: ["G", "U", "W"], cards: [] },
  { id: "eoc-worldshaper", name: "World Shaper", format: "Commander", commander: "Hearthhull, the Worldseed",
    thumbnail: "https://cards.scryfall.io/art_crop/front/6/b/6b913e79-a9f6-44d4-bb37-c4f6f66b8151.jpg?1754673442",
    link: "https://edhrec.com/route/?cc=Hearthhull%2C+the+Worldseed", colors: ["B", "G", "R"], cards: [] },
];

export interface ParsedLine {
  qty: number;
  name: string;
  board: Board;
  set?: string;
  number?: string;
}

const SECTION_HEADERS: Record<string, Board> = {
  commander: "commander", commanders: "commander",
  deck: "main", main: "main", mainboard: "main", "main deck": "main",
  sideboard: "sideboard", maybeboard: "sideboard", considering: "sideboard", companion: "sideboard",
};

// "1 Sol Ring", "1x Sol Ring", "Sol Ring", "1 Sol Ring (CMM) 395 *F*", "1 Atraxa (ONC) 2 *CMDR*"
const LINE_RE = /^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★-]+))?)?((?:\s+\*[A-Za-z]+\*)*)\s*$/;

/** Parse a pasted decklist (Moxfield, Arena, MTGO or plain text). */
export function parseDecklist(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  let board: Board = "main";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = line.replace(/^\/\/\s*/, "").replace(/^#+\s*/, "").replace(/:$/, "").replace(/\s*\(\d+\)$/, "").trim().toLowerCase();
    if (SECTION_HEADERS[header]) { board = SECTION_HEADERS[header]; continue; }
    if (line.startsWith("//") || line.startsWith("#")) continue;
    const m = line.match(LINE_RE);
    if (!m) continue;
    const markers = (m[5] || "").toUpperCase();
    out.push({
      qty: m[1] ? parseInt(m[1], 10) : 1,
      name: m[2].trim(),
      board: markers.includes("*CMDR*") ? "commander" : board,
      set: m[3]?.toLowerCase(),
      number: m[4],
    });
  }
  return out;
}

interface ScryfallCard {
  name: string;
  type_line?: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
  scryfall_uri?: string;
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: { name: string; type_line?: string; colors?: string[]; image_uris?: { normal?: string; art_crop?: string } }[];
}

const SCRYFALL_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

const frontImage = (c: ScryfallCard, kind: "normal" | "art_crop") =>
  c.image_uris?.[kind] ?? c.card_faces?.[0]?.image_uris?.[kind];

const sameName = (card: ScryfallCard, name: string) => {
  const n = name.toLowerCase();
  return card.name.toLowerCase() === n || card.card_faces?.some(f => f.name.toLowerCase() === n) === true;
};

export interface ResolveResult {
  cards: DeckCardEntry[];
  notFound: string[];
  colors: string[];
  thumbnail?: string;
  commander?: string;
}

/**
 * Look the parsed lines up on Scryfall (/cards/collection, 75 per request) and build the
 * deck's cards, colors and cover art. `coverName` (commander or chosen cover card) wins
 * for the art; otherwise the first commander, then the first card.
 */
export async function resolveDecklist(lines: ParsedLine[], coverName?: string): Promise<ResolveResult> {
  const found: { line: ParsedLine; card: ScryfallCard }[] = [];
  const notFound: string[] = [];

  // Exact printings (set + collector number) first; any that miss (odd set codes from
  // Moxfield, promos) are retried by name alone.
  const lookup = async (batch: ParsedLine[], byPrinting: boolean): Promise<ParsedLine[]> => {
    const misses: ParsedLine[] = [];
    for (let i = 0; i < batch.length; i += 75) {
      const chunk = batch.slice(i, i + 75);
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: SCRYFALL_HEADERS,
        body: JSON.stringify({
          identifiers: chunk.map(l => (byPrinting && l.set && l.number ? { set: l.set, collector_number: l.number } : { name: l.name })),
        }),
      });
      if (!res.ok) throw new Error(`Scryfall lookup failed (HTTP ${res.status}). Try again in a minute.`);
      const data = await res.json() as { data: ScryfallCard[] };
      // Scryfall returns found cards in request order, skipping misses; match them back by name.
      const pool = [...data.data];
      for (const line of chunk) {
        const idx = pool.findIndex(c => sameName(c, line.name));
        if (idx >= 0) found.push({ line, card: pool.splice(idx, 1)[0] });
        else misses.push(line);
      }
      await new Promise(r => setTimeout(r, 120)); // Scryfall asks for 50–100 ms between calls
    }
    return misses;
  };
  const printingMisses = await lookup(lines, true);
  const retry = printingMisses.filter(l => l.set && l.number);
  const nameMisses = retry.length ? await lookup(retry, false) : [];
  notFound.push(...printingMisses.filter(l => !(l.set && l.number)).map(l => l.name), ...nameMisses.map(l => l.name));

  // Merge duplicate lines of the same card on the same board
  const merged = new Map<string, DeckCardEntry>();
  for (const { line, card } of found) {
    const isCommander = line.board === "commander" || (!!coverName && sameName(card, coverName) && line.board !== "sideboard");
    const board: Board = isCommander ? "commander" : line.board;
    const key = `${board}|${card.name}`;
    const prev = merged.get(key);
    if (prev) { prev.qty += line.qty; continue; }
    merged.set(key, {
      qty: line.qty,
      name: card.name,
      board,
      type: card.type_line?.split(" // ")[0] ?? card.card_faces?.[0]?.type_line ?? "",
      cmc: card.cmc ?? 0,
      image: frontImage(card, "normal"),
      scryfallUri: card.scryfall_uri?.split("?")[0],
    });
  }
  const cards = [...merged.values()];

  const commanders = found.filter(f => cards.some(c => c.board === "commander" && c.name === f.card.name)).map(f => f.card);
  const colorSource = commanders.length ? commanders.flatMap(c => c.color_identity ?? [])
    : found.filter(f => f.line.board !== "sideboard").flatMap(f => f.card.color_identity ?? []);
  const colors = ["W", "U", "B", "R", "G"].filter(c => colorSource.includes(c));

  let coverCard = coverName ? found.find(f => sameName(f.card, coverName))?.card : undefined;
  if (!coverCard && coverName) coverCard = await fetchCardByName(coverName) ?? undefined;
  coverCard = coverCard ?? commanders[0] ?? found[0]?.card;

  return {
    cards,
    notFound,
    colors: colors.length || !coverCard ? colors : ["W", "U", "B", "R", "G"].filter(c => (coverCard!.color_identity ?? []).includes(c)),
    thumbnail: coverCard ? frontImage(coverCard, "art_crop") : undefined,
    commander: commanders[0]?.name ?? (coverName ? coverCard?.name : undefined),
  };
}

/** Fuzzy single-card lookup (for a cover card that isn't in the list). */
export async function fetchCardByName(name: string): Promise<ScryfallCard | null> {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`, { headers: { Accept: "application/json" } });
    return res.ok ? await res.json() as ScryfallCard : null;
  } catch {
    return null;
  }
}

export const coverArtFor = (card: ScryfallCard | null) => (card ? frontImage(card, "art_crop") : undefined);
export const colorIdentityOf = (card: ScryfallCard | null) =>
  ["W", "U", "B", "R", "G"].filter(c => (card?.color_identity ?? []).includes(c));

// Grouping for the deck page. Order matters: a card goes in the first group it matches.
export const CARD_GROUPS: { label: string; test: (type: string) => boolean }[] = [
  { label: "Creatures", test: t => /\bCreature\b/.test(t) },
  { label: "Planeswalkers", test: t => /\bPlaneswalker\b/.test(t) },
  { label: "Battles", test: t => /\bBattle\b/.test(t) },
  { label: "Lands", test: t => /\bLand\b/.test(t) },
  { label: "Instants", test: t => /\bInstant\b/.test(t) },
  { label: "Sorceries", test: t => /\bSorcery\b/.test(t) },
  { label: "Artifacts", test: t => /\bArtifact\b/.test(t) },
  { label: "Enchantments", test: t => /\bEnchantment\b/.test(t) },
  { label: "Other", test: () => true },
];

export function groupDeck(cards: DeckCardEntry[]): { label: string; cards: DeckCardEntry[]; count: number }[] {
  const groups: { label: string; cards: DeckCardEntry[]; count: number }[] = [];
  const commander = cards.filter(c => c.board === "commander");
  if (commander.length) groups.push({ label: commander.length > 1 ? "Commanders" : "Commander", cards: commander, count: commander.reduce((n, c) => n + c.qty, 0) });
  const main = cards.filter(c => c.board === "main");
  const used = new Set<DeckCardEntry>();
  for (const g of CARD_GROUPS) {
    const inGroup = main.filter(c => !used.has(c) && g.test(c.type)).sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
    inGroup.forEach(c => used.add(c));
    if (inGroup.length) groups.push({ label: g.label, cards: inGroup, count: inGroup.reduce((n, c) => n + c.qty, 0) });
  }
  const side = cards.filter(c => c.board === "sideboard");
  if (side.length) groups.push({ label: "Sideboard / Maybeboard", cards: side, count: side.reduce((n, c) => n + c.qty, 0) });
  return groups;
}

export const deckSize = (cards: DeckCardEntry[]) =>
  cards.filter(c => c.board !== "sideboard").reduce((n, c) => n + c.qty, 0);

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "deck";

/** Short label for a deck's external link button. */
export function linkLabel(url?: string): string {
  if (!url) return "Link";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("moxfield")) return "Moxfield";
    if (host.includes("archidekt")) return "Archidekt";
    if (host.includes("edhrec")) return "EDHREC";
    if (host.includes("mtggoldfish")) return "MTGGoldfish";
    return host;
  } catch {
    return "Link";
  }
}
