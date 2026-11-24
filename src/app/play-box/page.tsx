"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Plus, X, DollarSign, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { isAdminUser } from "@/lib/admin";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, writeBatch } from "firebase/firestore";


interface PlayBox {
  id: string;
  name: string;
  type: string;
  capacity: string;
  remaining: number;
  total: number;
  format: string;
  color?: string;
  cost?: string;
  marketPrice?: string;
  setCode?: string;
  imageUrl?: string;
  /** Legacy: stored on older boxes, no longer read. */
  theme?: {
    borderTop: string;
    badge: string;
    icon: string;
    progressFill: string;
    btn: string;
  };
}

const DEFAULT_BOXES: PlayBox[] = [
  {
    id: "2",
    name: "Avatar",
    type: "Draft Environment",
    capacity: "Drafts up to 8 players",
    remaining: 30,
    total: 30,
    format: "Draft",
    cost: "140.00",
    setCode: "TLA",
  },
  {
    id: "3",
    name: "Tarkir Dragonstorm",
    type: "Draft Booster Box",
    capacity: "Pack cracking only",
    remaining: 30,
    total: 30,
    format: "Draft",
    cost: "125.00",
    setCode: "TDM",
  },
  {
    id: "4",
    name: "Lorwyn Eclipsed",
    type: "Draft Environment",
    capacity: "Drafts up to 8 players",
    remaining: 36,
    total: 36,
    format: "Draft",
    cost: "135.00",
    setCode: "ECL",
  },
  {
    id: "5",
    name: "Unfinity",
    type: "Draft Booster Box",
    capacity: "Drafts up to 8 players",
    remaining: 36,
    total: 36,
    format: "Draft",
    cost: "95.00",
    setCode: "UNF",
  },
  {
    id: "6",
    name: "Final Fantasy",
    type: "Draft Environment",
    capacity: "Drafts up to 8 players",
    remaining: 30,
    total: 30,
    format: "Draft",
    cost: "150.00",
    setCode: "FIN",
  }
];

/** Packs each player opens: a booster draft is 3 packs, a sealed pool 6. */
const DRAFT_PACKS = 3;
const SEALED_PACKS = 6;

/** Play Boosters replaced Draft Boosters in 2024; both are made for drafting. */
const isDraftable = (type: string) => /draft|play booster/i.test(type);

/**
 * Each product type has a fixed stationery color for its sticker, set symbol and packs-left
 * bar, so a box looks the same every time. Sakura is the action color and stays out of this set.
 */
const typeTheme = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("collector")) return { sticker: "bg-butter text-amber-950", icon: "text-amber-700 dark:text-amber-300", progressFill: "bg-amber-300" };
  if (t.includes("set booster")) return { sticker: "bg-sky-200 text-sky-950", icon: "text-sky-700 dark:text-sky-300", progressFill: "bg-sky-300" };
  if (t.includes("cube") || t.includes("jumpstart")) return { sticker: "bg-orange-200 text-orange-950", icon: "text-orange-700 dark:text-orange-300", progressFill: "bg-orange-300" };
  return { sticker: "bg-mint text-emerald-950", icon: "text-emerald-700 dark:text-emerald-300", progressFill: "bg-emerald-300" };
};

const money = (n: number) => `$${n.toFixed(2)}`;
/** "≈" when a per-pack price was rounded to the cent for display. */
const approx = (n: number) => (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6 ? "≈" : "=");

export default function PlayBoxPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const router = useRouter();
  const [playBoxes, setPlayBoxes] = useState<PlayBox[]>(DEFAULT_BOXES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBox, setNewBox] = useState({ name: "", setCode: "", cost: "", marketPrice: "", type: "Play Booster Box", total: 30, imageUrl: "" });
  // Live set list from Scryfall (via /api/sets) — new sets show up here automatically.
  const [knownSets, setKnownSets] = useState<{ code: string; name: string; releasedAt: string; upcoming: boolean }[]>([]);

  useEffect(() => {
    if (!isModalOpen || knownSets.length > 0) return;
    fetch('/api/sets')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.sets) setKnownSets(data.sets); })
      .catch(() => { /* picker falls back to free-text set code */ });
  }, [isModalOpen, knownSets.length]);

  const handleSetCodeChange = (value: string) => {
    const code = value.toUpperCase();
    const match = knownSets.find(s => s.code === code);
    setNewBox(prev => ({
      ...prev,
      setCode: code,
      // Fill the box name from the set when it's still blank
      name: prev.name || !match ? prev.name : `${match.name} Play Box`,
    }));
  };

  useEffect(() => {
    const loadBoxes = async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'playBoxes'));
        if (snap.empty) {
          const batch = writeBatch(db);
          for (const box of DEFAULT_BOXES) {
            batch.set(doc(db, 'playBoxes', box.id), box);
          }
          await batch.commit();
          // DEFAULT_BOXES already set as initial state — no update needed
        } else {
          const firestoreBoxes = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayBox));
          setPlayBoxes(firestoreBoxes);
          // Seed any default boxes missing from Firestore (e.g. newly added defaults)
          const existingIds = new Set(snap.docs.map(d => d.id));
          const missing = DEFAULT_BOXES.filter(b => !existingIds.has(b.id));
          if (missing.length > 0) {
            const batch = writeBatch(db);
            for (const box of missing) batch.set(doc(db, 'playBoxes', box.id), box);
            await batch.commit();
            setPlayBoxes([...firestoreBoxes, ...missing]);
          }
        }
      } catch {
        // Keep DEFAULT_BOXES already shown as initial state
      }
    };
    loadBoxes();
    // Re-run when the signed-in user changes: the first run usually happens before auth has
    // restored, so its default-box seed is refused by the rules (admin-only writes).
  }, [user?.uid]);


  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBox.name || !newBox.setCode) return;


    const boxData = {
      name: newBox.name,
      type: newBox.type,
      capacity: isDraftable(newBox.type) ? "Drafts up to 8 players" : "Pack cracking only",
      remaining: newBox.total,
      total: newBox.total,
      format: isDraftable(newBox.type) ? "Draft" : "Sealed",
      cost: newBox.cost,
      marketPrice: newBox.marketPrice,
      setCode: newBox.setCode.toUpperCase(),
      imageUrl: newBox.imageUrl
    };

    if (db) {
      const docRef = await addDoc(collection(db, 'playBoxes'), boxData);
      setPlayBoxes(prev => [...prev, { ...boxData, id: docRef.id }]);
    } else {
      setPlayBoxes(prev => [...prev, { ...boxData, id: Date.now().toString() }]);
    }

    setIsModalOpen(false);
    setNewBox({ name: "", setCode: "", cost: "", marketPrice: "", type: "Play Booster Box", total: 30, imageUrl: "" });
  };

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-sakura-600 dark:text-sakura-400" />
              <h1 className="text-3xl font-brand font-bold text-paper-900 dark:text-paper-50"><span className="washi">Play Box</span></h1>
            </div>
            <p className="text-paper-500 dark:text-paper-400 mt-1">Manage your sealed product inventory, draft boxes, and custom cubes.</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-on-accent font-medium rounded-lg shadow-sm hover:bg-accent-hover transition-colors w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Box
            </button>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-paper-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-paper-100 dark:border-paper-800">
                <h3 className="font-bold text-lg text-paper-900 dark:text-paper-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-sakura-600" /> Add New Box
                </h3>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-md text-paper-500 dark:text-paper-400 hover:text-paper-600 dark:hover:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddBox} className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Box Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bloomburrow Draft Box"
                    value={newBox.name}
                    onChange={e => setNewBox({...newBox, name: e.target.value})}
                    className="w-full px-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Set Code</label>
                    <input
                      type="text"
                      required
                      placeholder={knownSets[0] ? `e.g. ${knownSets.find(s => !s.upcoming)?.code ?? knownSets[0].code}` : "e.g. BLB"}
                      maxLength={5}
                      list="ccs-set-options"
                      autoComplete="off"
                      value={newBox.setCode}
                      onChange={e => handleSetCodeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500 uppercase"
                    />
                    <datalist id="ccs-set-options">
                      {knownSets.map(s => (
                        <option key={s.code} value={s.code}>
                          {`${s.name} (${s.releasedAt.slice(0, 4)})${s.upcoming ? ' — upcoming' : ''}`}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Cost Spent</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-paper-500 dark:text-paper-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="120.00"
                        value={newBox.cost}
                        onChange={e => setNewBox({...newBox, cost: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Market Price <span className="font-normal text-paper-500 dark:text-paper-400">(shown publicly)</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="130.00"
                      value={newBox.marketPrice}
                      onChange={e => setNewBox({...newBox, marketPrice: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Image URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ImageIcon className="h-4 w-4 text-paper-500 dark:text-paper-400" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newBox.imageUrl}
                      onChange={e => setNewBox({...newBox, imageUrl: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Box Type</label>
                  <select
                    aria-label="Box Type"
                    value={newBox.type}
                    onChange={e => setNewBox({...newBox, type: e.target.value})}
                    className="w-full px-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  >
                    <option value="Play Booster Box">Play Booster Box</option>
                    <option value="Draft Booster Box">Draft Booster Box</option>
                    <option value="Set Booster Box">Set Booster Box</option>
                    <option value="Collector Booster Box">Collector Booster Box</option>
                    <option value="Jumpstart Cube">Jumpstart Cube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5">Total Packs / Items</label>
                  <input
                    type="number"
                    required
                    aria-label="Total Packs / Items"
                    min="1"
                    value={newBox.total}
                    onChange={e => setNewBox({...newBox, total: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-paper-100 dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-paper-700 dark:text-paper-300 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent font-medium rounded-lg shadow-sm transition-colors"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {playBoxes.map(box => {
              const theme = typeTheme(box.type);
              const percentage = Math.round((box.remaining / box.total) * 100);
              // Two prices per box: what was paid (cost) and the current market price (marketPrice).
              // The paid box price itself is admin-only; per-person figures are for everyone.
              const perPack = (price?: string) => {
                const v = price ? parseFloat(price) : NaN;
                return box.total && v > 0 ? v / box.total : null;
              };
              const paidPack = perPack(box.cost);
              const marketPack = perPack(box.marketPrice);
              const priceRows = [
                paidPack !== null && { key: "paid", label: "Paid", pack: paidPack, box: isAdmin ? money(parseFloat(box.cost!)) : "box price" },
                marketPack !== null && { key: "market", label: "Market", pack: marketPack, box: money(parseFloat(box.marketPrice!)) },
              ].filter(Boolean) as { key: string; label: string; pack: number; box: string }[];

              return (
              <Link href={`/play-box/${box.id}`} key={box.id} className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-paper-300 dark:hover:border-paper-700 transition-[box-shadow,border-color] duration-150 flex flex-col group relative">

                {/* Hero Image Overlay */}
                {box.imageUrl && (
                  <div className="absolute inset-0 z-0">
                    <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover opacity-20 dark:opacity-40 group-hover:opacity-30 dark:group-hover:opacity-50 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white dark:from-paper-900/90 dark:to-paper-900"></div>
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1 relative z-10">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 shrink-0 rounded-lg flex items-center justify-center bg-paper-50 dark:bg-paper-800 border border-paper-100 dark:border-paper-700 ${theme.icon}`}>
                        {box.setCode ? (
                          // The set's own symbol (Scryfall SVG), drawn in the box's colour
                          <span aria-hidden className="w-6 h-6 bg-current" style={{
                            WebkitMaskImage: `url(https://svgs.scryfall.io/sets/${box.setCode.split(',')[0].trim().toLowerCase()}.svg)`,
                            maskImage: `url(https://svgs.scryfall.io/sets/${box.setCode.split(',')[0].trim().toLowerCase()}.svg)`,
                            WebkitMaskSize: 'contain', maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center', maskPosition: 'center',
                          }} />
                        ) : <Package className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-paper-900 dark:text-paper-100 group-hover:text-sakura-600 dark:group-hover:text-sakura-400 transition-colors leading-tight line-clamp-2">
                          {box.name}
                        </h3>
                        <p className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`sticker text-xs font-semibold px-1.5 py-0.5 rounded-md ${theme.sticker}`}>{box.type}</span>
                          <span className="text-xs text-paper-500 dark:text-paper-400 font-medium">{box.setCode || box.format}</span>
                        </p>
                      </div>
                    </div>
                    {(isAdmin && box.cost) || box.marketPrice ? (
                      // Price stickers: paid (admin only) and current market
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {isAdmin && box.cost && (
                          <span title="What you paid for the box" className="sticker text-xs font-bold tabular-nums bg-butter text-amber-950 px-2 py-0.5 rounded-md">
                            {money(parseFloat(box.cost))} paid
                          </span>
                        )}
                        {box.marketPrice && (
                          <span title="Current market price for the box" className="sticker text-xs font-bold tabular-nums bg-white dark:bg-paper-100 text-paper-900 px-2 py-0.5 rounded-md">
                            {money(parseFloat(box.marketPrice))} market
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-paper-600 dark:text-paper-400">Inventory</span>
                      <span className="text-paper-900 dark:text-paper-100">{box.remaining} / {box.total}</span>
                    </div>
                    <div className="w-full bg-paper-100 dark:bg-paper-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${theme.progressFill}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>

                  {priceRows.length > 0 && (
                    <div className="relative flex flex-col">
                    {/* The math behind the per-person costs: over the inventory row on hover or keyboard
                        focus; inline under the costs on touch screens, which have no hover. */}
                    <div className="absolute bottom-full inset-x-0 mb-2 rounded-lg border border-paper-200 dark:border-paper-700 bg-white dark:bg-paper-800 px-3 py-2 text-xs leading-relaxed tabular-nums text-paper-600 dark:text-paper-300 shadow-sm opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:order-last [@media(hover:none)]:mb-0 [@media(hover:none)]:mt-3 [@media(hover:none)]:opacity-100 [@media(hover:none)]:shadow-none space-y-1.5">
                      <table className="w-full text-left">
                        <caption className="sr-only">How the per-person costs are worked out</caption>
                        <thead>
                          <tr className="text-paper-500 dark:text-paper-400">
                            <th scope="col" className="font-medium pb-0.5 pr-2"></th>
                            <th scope="col" className="font-medium pb-0.5 pr-2">Box ÷ packs</th>
                            <th scope="col" className="font-medium pb-0.5 pr-2">Per pack</th>
                            <th scope="col" className="font-medium pb-0.5 pr-2">Draft ×{DRAFT_PACKS}</th>
                            <th scope="col" className="font-medium pb-0.5 pr-2">Sealed ×{SEALED_PACKS}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {priceRows.map(r => (
                            <tr key={r.key}>
                              <th scope="row" className="font-semibold text-paper-900 dark:text-paper-100 pr-2">{r.label}</th>
                              <td className="pr-2">{r.box} ÷ {box.total}</td>
                              <td className="pr-2">{approx(r.pack)} {money(r.pack)}</td>
                              <td className="pr-2">{money(r.pack * DRAFT_PACKS)}</td>
                              <td>{money(r.pack * SEALED_PACKS)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <dl className="grid grid-cols-2 divide-x divide-paper-100 dark:divide-paper-800 border-t border-paper-100 dark:border-paper-800 pt-3 text-xs">
                      {[{ label: "Draft / person", packs: DRAFT_PACKS, pad: "pr-3" }, { label: "Sealed / person", packs: SEALED_PACKS, pad: "pl-3" }].map(col => (
                        <div key={col.label} className={col.pad}>
                          <dt className="text-paper-500 dark:text-paper-400">{col.label}</dt>
                          {priceRows.map(r => (
                            <dd key={r.key} className="mt-0.5 tabular-nums">
                              <span className="font-bold text-paper-900 dark:text-paper-100">{money(r.pack * col.packs)}</span>{" "}
                              <span className="text-paper-500 dark:text-paper-400">{r.key}</span>
                            </dd>
                          ))}
                        </div>
                      ))}
                    </dl>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); router.push(`/play-box/${box.id}?edit=1`); }}
                        className="w-full px-3 py-2 bg-paper-100 dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-paper-700 dark:text-paper-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

              </Link>
            )})}
          </div>
      </div>
    </main>
  );
}
