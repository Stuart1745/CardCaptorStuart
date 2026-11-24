import NextImage from "next/image";

const MANA_SYMBOL_FILE: Record<string, string> = { W: "w", U: "u", B: "b", R: "r", G: "g" };
const MANA_NAME: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };

/** A WUBRG mana symbol from /public/mana. Unknown symbols render nothing. */
export function ManaIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const file = MANA_SYMBOL_FILE[symbol];
  if (!file) return null;
  return <NextImage src={`/mana/${file}.png`} alt={MANA_NAME[symbol]} title={MANA_NAME[symbol]} width={size} height={size} className="rounded-full shrink-0" />;
}
