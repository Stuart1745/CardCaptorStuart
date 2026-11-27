"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { Loader2, Search, Upload, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ManaBoxImporter } from "@/components/ManaBoxImporter";
import { FloatingPreview } from "@/components/FloatingPreview";
import { db } from "@/lib/firebase";
import { isAdminUser } from "@/lib/admin";
import { CONDITION_LABEL, type CollectionBinder, type CollectionCard } from "@/lib/collection";
import { formatPrice, pricePrintings } from "@/lib/cardPrices";

type Item = CollectionCard & { binder: string; kind: string; key: string };
type Sort = "value" | "paid" | "gain" | "loss" | "name" | "added";

const PAGE = 60;
const img = (id: string, size: "small" | "large") => `https://cards.scryfall.io/${size}/front/${id[0]}/${id[1]}/${id}.jpg`;
const priceKey = (c: CollectionCard) => `${c.id}|${c.f ?? ""}`;
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminUser(user);

  const [binders, setBinders] = useState<CollectionBinder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [prices, setPrices] = useState<Map<string, number | null> | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  /** Scryfall stopped answering before every printing was priced */
  const [incomplete, setIncomplete] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showImporter, setShowImporter] = useState(false);

  const [query, setQuery] = useState("");
  const [binder, setBinder] = useState("all");
  const [finish, setFinish] = useState<"all" | "foil" | "normal">("all");
  const [sort, setSort] = useState<Sort>("value");
  const [shown, setShown] = useState(PAGE);
  const [preview, setPreview] = useState<{ id: string; anchor: DOMRect } | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/play-box");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!user || !isAdmin || !db) return;
    let cancelled = false;
    getDocs(collection(db, "users", user.uid, "collection"))
      .then(snap => {
        if (cancelled) return;
        setBinders(snap.docs.map(d => {
          const x = d.data();
          return {
            id: d.id, binder: x.binder, kind: x.kind,
            cards: JSON.parse(x.cards ?? "[]") as CollectionCard[],
            importedAt: (x.importedAt as Timestamp | undefined)?.toDate().toISOString(),
          };
        }).sort((a, b) => a.binder.localeCompare(b.binder)));
        setLoadError(null);
      })
      .catch(() => { if (!cancelled) setLoadError("Couldn't load your collection. Try refreshing the page."); });
    return () => { cancelled = true; };
  }, [user, isAdmin, reload]);

  const items = useMemo<Item[]>(() => (binders ?? []).flatMap(b =>
    b.cards.map((c, i) => ({ ...c, binder: b.binder, kind: b.kind, key: `${b.id}-${i}` }))), [binders]);

  // Today's prices for every printing: thousands of cards, so it reports progress
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const unique = [...new Map(items.map(c => [priceKey(c), { id: c.id, finish: c.f }])).values()];
    pricePrintings(unique, (done, total) => { if (!cancelled) setProgress({ done, total }); })
      .then(r => { if (!cancelled) { setPrices(r.prices); setIncomplete(!r.complete); } })
      .catch(() => { if (!cancelled) setIncomplete(true); });
    return () => { cancelled = true; };
  }, [items, retry]);

  const today = (c: CollectionCard) => prices?.get(priceKey(c)) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(c =>
      (binder === "all" || c.binder === binder) &&
      (finish === "all" || (finish === "foil" ? !!c.f : !c.f)) &&
      (!q || c.n.toLowerCase().includes(q) || c.s === q || c.sn.toLowerCase().includes(q)));
    const val = (c: CollectionCard) => (prices?.get(priceKey(c)) ?? 0) * c.q;
    const gain = (c: CollectionCard) => val(c) - (c.p ?? 0) * c.q;
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      value: (a, b) => val(b) - val(a),
      paid: (a, b) => (b.p ?? 0) * b.q - (a.p ?? 0) * a.q,
      gain: (a, b) => gain(b) - gain(a),
      loss: (a, b) => gain(a) - gain(b),
      name: (a, b) => a.n.localeCompare(b.n),
      added: (a, b) => b.a.localeCompare(a.a),
    };
    return list.sort(by[sort]);
  }, [items, query, binder, finish, sort, prices]);

  const totals = useMemo(() => {
    let cards = 0, paid = 0, market = 0;
    for (const c of filtered) {
      cards += c.q;
      paid += (c.p ?? 0) * c.q;
      market += (prices?.get(priceKey(c)) ?? 0) * c.q;
    }
    return { cards, printings: filtered.length, paid, market };
  }, [filtered, prices]);

  if (loading || !isAdmin) return null;

  const importedAt = binders?.map(b => b.importedAt).filter(Boolean).sort().pop();
  const pricing = !prices && progress;
  const decks = (binders ?? []).filter(b => b.kind === "deck");
  const notDecks = (binders ?? []).filter(b => b.kind !== "deck");
  const resetPage = () => setShown(PAGE);
  const hover = (id: string, el: HTMLElement) => {
    if (window.matchMedia("(hover: hover)").matches) setPreview({ id, anchor: el.getBoundingClientRect() });
  };

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-brand font-bold text-paper-900 dark:text-paper-50"><span className="washi">Collection</span></h1>
            <p className="text-paper-500 dark:text-paper-400 mt-1">
              {importedAt ? `From your ManaBox export, imported ${new Date(importedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.` : "Your cards, from ManaBox."}
            </p>
          </div>
          <button type="button" onClick={() => setShowImporter(v => !v)} aria-expanded={showImporter}
            className="flex items-center gap-2 px-4 py-2 bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-paper-700 font-medium">
            {showImporter ? <X className="w-4 h-4" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
            {showImporter ? "Close" : "Import a new export"}
          </button>
        </div>

        {(showImporter || (binders && binders.length === 0)) && user && (
          <div className="mb-8">
            <ManaBoxImporter uid={user.uid} onImported={() => { setShowImporter(false); setPrices(null); setBinders(null); setReload(n => n + 1); }} />
          </div>
        )}

        {loadError && <p role="alert" className="mb-6 text-sm text-red-700 dark:text-red-300">{loadError}</p>}

        {!binders && !loadError ? (
          <p className="flex items-center gap-2 text-paper-500 dark:text-paper-400"><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading your collection…</p>
        ) : binders && binders.length > 0 && (
          <>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-paper-200 dark:border-paper-800 bg-paper-200 dark:bg-paper-800 mb-6">
              <div className="bg-white dark:bg-paper-900 p-4">
                <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Cards</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">{totals.cards.toLocaleString("en-US")}</dd>
                <dd className="text-xs text-paper-500 dark:text-paper-400 tabular-nums">{totals.printings.toLocaleString("en-US")} printings</dd>
              </div>
              <div className="bg-white dark:bg-paper-900 p-4">
                <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Paid</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">{whole(totals.paid)}</dd>
              </div>
              <div className="bg-white dark:bg-paper-900 p-4">
                <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Worth today</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-paper-900 dark:text-paper-50">
                  {prices ? whole(totals.market) : <span className="text-base font-medium text-paper-500 dark:text-paper-400">Pricing…</span>}
                </dd>
                {pricing && progress.total > 0 && (
                  <dd className="mt-1">
                    <span className="block h-1.5 rounded-full bg-paper-100 dark:bg-paper-800 overflow-hidden">
                      <span className="block h-full bg-sakura-400" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </span>
                    <span className="text-xs text-paper-500 dark:text-paper-400 tabular-nums">{progress.done.toLocaleString("en-US")} of {progress.total.toLocaleString("en-US")} printings</span>
                  </dd>
                )}
              </div>
              <div className="bg-white dark:bg-paper-900 p-4">
                <dt className="text-xs font-medium text-paper-500 dark:text-paper-400">Up or down</dt>
                <dd className={`mt-1 text-2xl font-bold tabular-nums ${!prices ? "text-paper-400" : totals.market >= totals.paid ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                  {prices ? `${totals.market >= totals.paid ? "+" : "−"}${whole(Math.abs(totals.market - totals.paid))}` : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <label className="relative flex-1 min-w-[14rem]">
                <span className="sr-only">Search cards</span>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paper-400" aria-hidden />
                <input type="search" value={query} onChange={e => { setQuery(e.target.value); resetPage(); }} placeholder="Card, set name or set code"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-paper-200 dark:border-paper-700 bg-white dark:bg-paper-900 text-paper-900 dark:text-paper-100 placeholder:text-paper-400" />
              </label>
              <label className="sr-only" htmlFor="binder-filter">Binder</label>
              <select id="binder-filter" value={binder} onChange={e => { setBinder(e.target.value); resetPage(); }}
                className="py-2 px-3 rounded-lg border border-paper-200 dark:border-paper-700 bg-white dark:bg-paper-900 text-paper-900 dark:text-paper-100 max-w-full">
                <option value="all">All binders and decks</option>
                <optgroup label="Binders">
                  {notDecks.map(b => <option key={b.id} value={b.binder}>{b.binder} ({b.cards.reduce((n, c) => n + c.q, 0)})</option>)}
                </optgroup>
                {decks.length > 0 && (
                  <optgroup label="Decks">
                    {decks.map(b => <option key={b.id} value={b.binder}>{b.binder} ({b.cards.reduce((n, c) => n + c.q, 0)})</option>)}
                  </optgroup>
                )}
              </select>
              <div role="group" aria-label="Finish" className="inline-flex rounded-lg border border-paper-200 dark:border-paper-700 p-0.5 bg-paper-50 dark:bg-paper-800">
                {([["all", "All"], ["foil", "Foil"], ["normal", "Non-foil"]] as const).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={finish === v} onClick={() => { setFinish(v); resetPage(); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${finish === v
                      ? "bg-white dark:bg-paper-900 text-paper-900 dark:text-paper-50 shadow-sm"
                      : "text-paper-600 dark:text-paper-300 hover:text-paper-900 dark:hover:text-paper-50"}`}>{label}</button>
                ))}
              </div>
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <select id="sort" value={sort} onChange={e => { setSort(e.target.value as Sort); resetPage(); }}
                className="py-2 px-3 rounded-lg border border-paper-200 dark:border-paper-700 bg-white dark:bg-paper-900 text-paper-900 dark:text-paper-100">
                <option value="value">Most valuable</option>
                <option value="paid">Most paid</option>
                <option value="gain">Biggest gain</option>
                <option value="loss">Biggest loss</option>
                <option value="added">Recently added</option>
                <option value="name">Name</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-paper-500 dark:text-paper-400">No cards match.</p>
            ) : (
              <div className="bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <caption className="sr-only">Cards in your collection</caption>
                  <thead className="text-left text-xs text-paper-500 dark:text-paper-400 border-b border-paper-100 dark:border-paper-800">
                    <tr>
                      <th scope="col" className="font-medium py-2.5 pl-4 pr-2">Card</th>
                      <th scope="col" className="font-medium py-2.5 px-2 hidden lg:table-cell">Binder</th>
                      <th scope="col" className="font-medium py-2.5 px-2 text-right">Qty</th>
                      <th scope="col" className="font-medium py-2.5 px-2 text-right hidden sm:table-cell">Paid each</th>
                      <th scope="col" className="font-medium py-2.5 px-2 text-right hidden sm:table-cell">Today each</th>
                      <th scope="col" className="font-medium py-2.5 pl-2 pr-4 text-right">Worth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-100 dark:divide-paper-800">
                    {filtered.slice(0, shown).map(c => {
                      const now = today(c);
                      const worth = now != null ? now * c.q : null;
                      const up = now != null && c.p != null ? now - c.p : null;
                      return (
                        <tr key={c.key} className="align-middle">
                          <td className="py-2 pl-4 pr-2">
                            <a href={`https://scryfall.com/card/${c.s}/${encodeURIComponent(c.cn)}`} target="_blank" rel="noopener noreferrer"
                              onMouseEnter={e => hover(c.id, e.currentTarget)} onMouseLeave={() => setPreview(null)}
                              className="flex items-center gap-3 min-w-0 group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img(c.id, "small")} alt="" loading="lazy" className="w-9 shrink-0 aspect-[488/680] rounded-[5%/3.5%] bg-paper-200 dark:bg-paper-800" />
                              <span className="min-w-0">
                                <span className="block font-medium text-paper-900 dark:text-paper-100 truncate group-hover:text-sakura-700 dark:group-hover:text-sakura-300">{c.n}</span>
                                <span className="block text-xs text-paper-500 dark:text-paper-400 truncate">
                                  {c.s.toUpperCase()} #{c.cn}
                                  {c.f && <span className="ml-1.5 font-semibold text-sakura-700 dark:text-sakura-300">{c.f === "etched" ? "Etched" : "Foil"}</span>}
                                  {c.c && <span className="ml-1.5">{CONDITION_LABEL[c.c] ?? c.c}</span>}
                                  <span className="lg:hidden"> · {c.binder}</span>
                                </span>
                              </span>
                            </a>
                          </td>
                          <td className="py-2 px-2 text-paper-600 dark:text-paper-300 hidden lg:table-cell max-w-[12rem] truncate">{c.binder}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{c.q}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-paper-600 dark:text-paper-300 hidden sm:table-cell">{c.p != null ? formatPrice(c.p) : "—"}</td>
                          <td className="py-2 px-2 text-right tabular-nums hidden sm:table-cell">
                            {now != null ? formatPrice(now) : prices ? "—" : ""}
                            {up != null && Math.abs(up) >= 0.01 && (
                              <span className={`block text-xs ${up > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{up > 0 ? "+" : "−"}{formatPrice(Math.abs(up))}</span>
                            )}
                          </td>
                          <td className="py-2 pl-2 pr-4 text-right tabular-nums font-semibold text-paper-900 dark:text-paper-100">{worth != null ? formatPrice(worth) : prices ? "—" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > shown && (
                  <div className="p-4 border-t border-paper-100 dark:border-paper-800 text-center">
                    <button type="button" onClick={() => setShown(n => n + PAGE * 2)} className="text-sm font-semibold text-sakura-700 dark:text-sakura-300 hover:underline underline-offset-2">
                      Show more ({(filtered.length - shown).toLocaleString("en-US")} left)
                    </button>
                  </div>
                )}
              </div>
            )}
            {incomplete && (
              <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                Scryfall stopped answering before every card was priced, so the totals are low.{" "}
                <button type="button" onClick={() => { setIncomplete(false); setRetry(n => n + 1); }} className="font-semibold underline underline-offset-2">Finish pricing</button>
              </p>
            )}
            <p className="mt-3 text-xs text-paper-500 dark:text-paper-400">
              Today&apos;s prices are TCGplayer market prices for each exact printing and finish, from Scryfall, refreshed daily. Paid is the purchase price recorded in ManaBox.
            </p>
          </>
        )}
      </div>
      {preview && (
        <FloatingPreview anchor={preview.anchor} maxWidth={280} interactive={false} side="right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(preview.id, "large")} alt="" className="w-full rounded-[4.5%/3.2%] shadow-2xl ring-1 ring-black/10" />
        </FloatingPreview>
      )}
    </main>
  );
}
