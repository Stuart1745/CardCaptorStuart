// Server-only reader for tcgcsv.com: a free public mirror of TCGplayer's Magic catalog and prices,
// refreshed once a day around 20:00 UTC. TCGplayer no longer issues API keys, so this is the
// no-key route. Each server instance keeps a set's products and prices for 12 hours, so tcgcsv
// sees roughly one request per set per half day from each instance.

const TCGCSV = "https://tcgcsv.com/tcgplayer/1"; // category 1 = Magic: The Gathering
const UA = "CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)";
export const TCGCSV_TTL_MS = 12 * 60 * 60 * 1000;

export interface TcgGroup { groupId: number; name: string; abbreviation: string | null; isSupplemental?: boolean }
export interface TcgProduct { productId: number; name: string; url?: string; imageUrl?: string }
/** Market price per product, by printing: "Normal" (non-foil) and "Foil". */
export interface TcgPrices { normal: Map<number, number>; foil: Map<number, number> }
interface RawPrice { productId: number; marketPrice: number | null; subTypeName: string | null }

export async function getJson<T>(url: string, accept = "application/json"): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return (await res.json()) as T;
}

/** A 12-hour cache that also shares one in-flight request between concurrent callers. */
function cached<T>(load: (key: string) => Promise<T>) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string): Promise<T> => {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < TCGCSV_TTL_MS) return hit.value;
    const value = load(key);
    store.set(key, { at: Date.now(), value });
    value.catch(() => store.delete(key)); // a failed lookup is retried on the next request
    return value;
  };
}

const groupsOnce = cached(async () => (await getJson<{ results: TcgGroup[] }>(`${TCGCSV}/groups`)).results);
export const tcgGroups = () => groupsOnce("all");

/** The TCGplayer group (set) for a set code: the main set, not a supplemental product line. */
export async function tcgGroupFor(setCode: string): Promise<TcgGroup | undefined> {
  const code = setCode.toUpperCase();
  const candidates = (await tcgGroups()).filter(g => (g.abbreviation ?? "").toUpperCase() === code);
  return candidates.find(g => !g.isSupplemental) ?? candidates[0];
}

export const tcgProducts = cached(async groupId =>
  (await getJson<{ results: TcgProduct[] }>(`${TCGCSV}/${groupId}/products`)).results.map(
    ({ productId, name, url, imageUrl }) => ({ productId, name, url, imageUrl }),
  ),
);

export const tcgPrices = cached(async (groupId): Promise<TcgPrices> => {
  const rows = (await getJson<{ results: RawPrice[] }>(`${TCGCSV}/${groupId}/prices`)).results;
  const normal = new Map<number, number>();
  const foil = new Map<number, number>();
  for (const p of rows) {
    if (p.marketPrice == null) continue;
    if (p.subTypeName === "Foil") foil.set(p.productId, p.marketPrice);
    else if (p.subTypeName == null || p.subTypeName === "Normal") normal.set(p.productId, p.marketPrice);
  }
  return { normal, foil };
});
