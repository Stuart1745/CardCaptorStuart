"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import type { BoxEv, EvCard } from "@/lib/boxEv";
import type { MarketPrice } from "@/app/api/market-price/route";

const money = (n: number) => `$${n.toFixed(2)}`;
const wholeMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Rarity colors for the value bar: the usual set-symbol colors, foils in sakura. */
const BAR: Record<string, string> = {
  Mythic: "bg-orange-400",
  Rare: "bg-amber-300",
  "Bonus & special": "bg-sky-300",
  Uncommon: "bg-paper-400",
  Common: "bg-paper-700 dark:bg-paper-300",
  Foils: "bg-sakura-300",
};

/** Chance of at least one copy in `packs` packs, as a short phrase. */
function odds(perPack: number, packs: number) {
  const p = 1 - Math.pow(1 - Math.min(perPack, 0.999999), packs);
  if (p >= 0.995) return "in nearly every box";
  if (p >= 0.1) return `${Math.round(p * 100)}% chance per box`;
  return `1 in ${Math.round(1 / perPack).toLocaleString("en-US")} packs`;
}

/**
 * Expected value of a sealed box: the average worth of the cards inside at today's TCGplayer
 * market prices. Shown to signed-in visitors on the set page.
 */
export function BoxEvPanel({ setCode, type, packs, remaining, paid }: {
  setCode: string; type: string; packs: number; remaining: number; paid?: number;
}) {
  const [ev, setEv] = useState<BoxEv | null>(null);
  const [market, setMarket] = useState<MarketPrice | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = `set=${encodeURIComponent(setCode)}&type=${encodeURIComponent(type)}`;
    Promise.all([
      fetch(`/api/box-ev?${q}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/market-price?${q}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([e, m]) => {
      if (cancelled) return;
      setEv(e as BoxEv | null);
      setMarket(m as MarketPrice | null);
      setState(e ? "ready" : "missing");
    });
    return () => { cancelled = true; };
  }, [setCode, type]);

  if (state === "missing") return null;

  const box = ev ? ev.perPack * packs : 0;
  // Compare with what was paid (admins see it) or else today's sealed price
  const against = paid && paid > 0 ? { label: "paid", value: paid } : market ? { label: "market", value: market.marketPrice } : null;
  const diff = against ? box - against.value : 0;
  const cards = ev ? (showAll ? ev.top : ev.top.slice(0, 6)) : [];

  return (
    <section aria-labelledby="ev-heading" className="mb-8 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-2xl shadow-sm p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
        <h2 id="ev-heading" className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden /> Expected value
        </h2>
        <p className="text-sm text-paper-500 dark:text-paper-400">What the cards inside are worth on average, at today&apos;s prices.</p>
      </div>

      {state === "loading" || !ev ? (
        <p className="flex items-center gap-2 text-sm text-paper-500 dark:text-paper-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Working out the pack odds…
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-paper-100 dark:border-paper-800 bg-paper-100 dark:bg-paper-800">
            <div className="bg-white dark:bg-paper-900 p-4">
              <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Per box ({packs} packs)</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">{wholeMoney(box)}</dd>
            </div>
            <div className="bg-white dark:bg-paper-900 p-4">
              <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Per pack</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">{money(ev.perPack)}</dd>
            </div>
            <div className="bg-white dark:bg-paper-900 p-4">
              <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Still in the box ({remaining} packs)</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">{wholeMoney(ev.perPack * remaining)}</dd>
            </div>
            <div className="bg-white dark:bg-paper-900 p-4">
              <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">{against ? `Against ${wholeMoney(against.value)} ${against.label}` : "Sealed price"}</dt>
              <dd className={`mt-1 text-2xl font-bold tabular-nums ${!against ? "text-paper-400" : diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                {against ? `${diff >= 0 ? "+" : "−"}${wholeMoney(Math.abs(diff))}` : "—"}
              </dd>
            </div>
          </dl>

          {/* Where the value comes from, by rarity */}
          <div className="mt-5">
            <div className="flex h-3 rounded-full overflow-hidden bg-paper-100 dark:bg-paper-800" aria-hidden>
              {ev.byRarity.map(r => (
                <span key={r.label} className={BAR[r.label] ?? "bg-paper-300"} style={{ width: `${(r.perPack / ev.perPack) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper-600 dark:text-paper-300">
              {ev.byRarity.map(r => (
                <li key={r.label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${BAR[r.label] ?? "bg-paper-300"}`} aria-hidden />
                  {r.label} <span className="font-semibold tabular-nums text-paper-900 dark:text-paper-100">{wholeMoney(r.perPack * packs)}</span>
                </li>
              ))}
            </ul>
          </div>

          {cards.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-paper-900 dark:text-paper-100 mb-3">The cards that carry the value</h3>
              <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {cards.map((c, i) => <ChaseCard key={`${c.name}-${c.foil}-${i}`} card={c} packs={packs} />)}
              </ol>
              {ev.top.length > 6 && (
                <button type="button" onClick={() => setShowAll(v => !v)} className="mt-3 text-sm font-semibold text-sakura-700 dark:text-sakura-300 hover:underline underline-offset-2">
                  {showAll ? "Show fewer" : `Show ${ev.top.length - 6} more`}
                </button>
              )}
            </div>
          )}

          <p className="mt-5 text-xs leading-relaxed text-paper-500 dark:text-paper-400 max-w-3xl">
            Counts cards worth {money(ev.bulkFloor)} or more at TCGplayer market price, weighted by how often each one is printed in a pack.
            Every card at market price would be {`${wholeMoney(ev.allCardsPerPack * packs)} a box`}, but bulk commons and uncommons rarely sell for that.
            It&apos;s an average over many boxes; one box can land well above or below it.
            Pack contents from MTGJSON, prices from TCGplayer via tcgcsv.com, refreshed daily.
          </p>
        </>
      )}
    </section>
  );
}

function ChaseCard({ card, packs }: { card: EvCard; packs: number }) {
  const body = (
    <>
      <span className="relative block aspect-[5/7] rounded-lg overflow-hidden bg-paper-100 dark:bg-paper-800">
        {card.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl.replace("_200w", "_400w")} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
        {card.foil && <span className="sticker absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sakura-200 text-sakura-950">Foil</span>}
      </span>
      <span className="mt-1.5 block text-xs font-semibold leading-snug text-paper-900 dark:text-paper-100 line-clamp-2">{card.name}</span>
      <span className="block text-xs tabular-nums text-paper-600 dark:text-paper-300">
        <span className="font-bold text-paper-900 dark:text-paper-100">{money(card.price)}</span> · {odds(card.perPack, packs)}
      </span>
    </>
  );
  return (
    <li>
      {card.url ? (
        <a href={card.url} target="_blank" rel="noopener noreferrer" className="block group focus-visible:outline-2 focus-visible:outline-sakura-500 rounded-lg" title={`${card.name} on TCGplayer`}>
          {body}
        </a>
      ) : body}
    </li>
  );
}
