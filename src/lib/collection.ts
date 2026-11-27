// The card collection, imported from a ManaBox CSV export. Stored in users/{uid}/collection
// as one document per ManaBox binder or deck, with the cards as a JSON string in `cards`
// (one Firestore index entry per doc, and the whole collection loads in a few dozen reads).
// ManaBox stays the source of truth: a re-import replaces every doc.

/** One ManaBox row: a printing in a binder, with its finish, condition and what was paid. */
export interface CollectionCard {
  /** Name */
  n: string;
  /** Set code (lower case) */
  s: string;
  /** Set name */
  sn: string;
  /** Collector number */
  cn: string;
  /** Rarity: C U R M S B */
  r: string;
  /** Quantity */
  q: number;
  /** Scryfall ID of the printing */
  id: string;
  /** Finish when not normal: "foil" or "etched" */
  f?: "foil" | "etched";
  /** Purchase price per copy, USD */
  p?: number;
  /** Condition when not near mint (excellent, good, light_played...) */
  c?: string;
  /** Date added in ManaBox, YYYY-MM-DD */
  a: string;
  misprint?: boolean; altered?: boolean; signed?: boolean; proxy?: boolean;
}

export interface CollectionBinder {
  id: string;
  binder: string;
  /** ManaBox binder type: binder, deck or list */
  kind: string;
  cards: CollectionCard[];
  importedAt?: string;
}

const RARITY: Record<string, string> = { common: "C", uncommon: "U", rare: "R", mythic: "M", special: "S", bonus: "B" };

export const binderSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unnamed";

export const MANABOX_COLUMNS = ["Binder Name", "Name", "Set code", "Collector number", "Foil", "Quantity", "Scryfall ID"];

/** Group ManaBox CSV rows (as parsed with header: true) into binders. Same shape as the one-off import script. */
export function binderFromManaBox(rows: Record<string, string>[]): Omit<CollectionBinder, "importedAt">[] {
  const byName = new Map<string, { kind: string; cards: CollectionCard[] }>();
  for (const r of rows) {
    if (!r["Name"] || !r["Scryfall ID"]) continue;
    const name = (r["Binder Name"] ?? "").trim() || "Unsorted";
    const b = byName.get(name) ?? { kind: r["Binder Type"] || "binder", cards: [] };
    byName.set(name, b);
    const price = r["Purchase price"] ? parseFloat(r["Purchase price"]) : NaN;
    const card: CollectionCard = {
      n: r["Name"], s: (r["Set code"] ?? "").toLowerCase(), sn: r["Set name"] ?? "", cn: r["Collector number"] ?? "",
      r: RARITY[r["Rarity"]] ?? (r["Rarity"] ?? "").slice(0, 1).toUpperCase(), q: parseInt(r["Quantity"], 10) || 1,
      id: r["Scryfall ID"], a: (r["Added"] ?? "").slice(0, 10),
    };
    if (r["Foil"] === "foil" || r["Foil"] === "etched") card.f = r["Foil"];
    if (!Number.isNaN(price)) card.p = price;
    if (r["Condition"] && r["Condition"] !== "near_mint") card.c = r["Condition"];
    if (r["Misprint"] === "true") card.misprint = true;
    if (r["Altered"] === "true") card.altered = true;
    if (r["Signed"] === "true") card.signed = true;
    if (r["Proxy"] === "true") card.proxy = true;
    b.cards.push(card);
  }
  const used = new Set<string>();
  return [...byName].map(([binder, b]) => {
    let id = binderSlug(binder);
    for (let i = 2; used.has(id); i++) id = `${binderSlug(binder)}-${i}`;
    used.add(id);
    return { id, binder, kind: b.kind, cards: b.cards };
  });
}

export const CONDITION_LABEL: Record<string, string> = {
  mint: "Mint", excellent: "Excellent", good: "Good", light_played: "Lightly played", played: "Played", poor: "Poor",
};
