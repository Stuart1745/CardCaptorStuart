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
  theme: {
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
    color: "cyan",
    cost: "140.00",
    setCode: "TLA",
    theme: {
      borderTop: "bg-cyan-500 dark:bg-cyan-600",
      badge: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
      icon: "text-cyan-600 dark:text-cyan-400",
      progressFill: "bg-cyan-500 dark:bg-cyan-400",
      btn: "bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50"
    }
  },
  {
    id: "3",
    name: "Tarkir Dragonstorm",
    type: "Draft Booster Box",
    capacity: "Pack cracking only",
    remaining: 30,
    total: 30,
    format: "Draft",
    color: "rose",
    cost: "125.00",
    setCode: "TDM",
    theme: {
      borderTop: "bg-rose-500 dark:bg-rose-600",
      badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
      icon: "text-rose-600 dark:text-rose-400",
      progressFill: "bg-rose-500 dark:bg-rose-400",
      btn: "bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
    }
  },
  {
    id: "4",
    name: "Lorwyn Eclipsed",
    type: "Draft Environment",
    capacity: "Drafts up to 8 players",
    remaining: 36,
    total: 36,
    format: "Draft",
    color: "emerald",
    cost: "135.00",
    setCode: "ECL",
    theme: {
      borderTop: "bg-emerald-500 dark:bg-emerald-600",
      badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-400",
      progressFill: "bg-emerald-500 dark:bg-emerald-400",
      btn: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
    }
  },
  {
    id: "5",
    name: "Unfinity",
    type: "Draft Booster Box",
    capacity: "Drafts up to 8 players",
    remaining: 36,
    total: 36,
    format: "Draft",
    color: "amber",
    cost: "95.00",
    setCode: "UNF",
    theme: {
      borderTop: "bg-amber-500 dark:bg-amber-600",
      badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
      progressFill: "bg-amber-500 dark:bg-amber-400",
      btn: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
    }
  },
  {
    id: "6",
    name: "Final Fantasy",
    type: "Draft Environment",
    capacity: "Drafts up to 8 players",
    remaining: 30,
    total: 30,
    format: "Draft",
    color: "indigo",
    cost: "150.00",
    setCode: "FIN",
    theme: {
      borderTop: "bg-indigo-500 dark:bg-indigo-600",
      badge: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
      icon: "text-indigo-600 dark:text-indigo-400",
      progressFill: "bg-indigo-500 dark:bg-indigo-400",
      btn: "bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50"
    }
  }
];

const getTheme = (color: string) => {
  const themes: Record<string, PlayBox['theme']> = {
    indigo: {
      borderTop: "bg-indigo-500 dark:bg-indigo-600",
      badge: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
      icon: "text-indigo-600 dark:text-indigo-400",
      progressFill: "bg-indigo-500 dark:bg-indigo-400",
      btn: "bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50"
    },
    emerald: {
      borderTop: "bg-emerald-500 dark:bg-emerald-600",
      badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      icon: "text-emerald-600 dark:text-emerald-400",
      progressFill: "bg-emerald-500 dark:bg-emerald-400",
      btn: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
    },
    rose: {
      borderTop: "bg-rose-500 dark:bg-rose-600",
      badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
      icon: "text-rose-600 dark:text-rose-400",
      progressFill: "bg-rose-500 dark:bg-rose-400",
      btn: "bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
    },
    amber: {
      borderTop: "bg-amber-500 dark:bg-amber-600",
      badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
      progressFill: "bg-amber-500 dark:bg-amber-400",
      btn: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
    },
    cyan: {
      borderTop: "bg-cyan-500 dark:bg-cyan-600",
      badge: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
      icon: "text-cyan-600 dark:text-cyan-400",
      progressFill: "bg-cyan-500 dark:bg-cyan-400",
      btn: "bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50"
    }
  };
  return themes[color] || themes.indigo;
};

export default function PlayBoxPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const router = useRouter();
  const [playBoxes, setPlayBoxes] = useState<PlayBox[]>(DEFAULT_BOXES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBox, setNewBox] = useState({ name: "", setCode: "", cost: "", marketPrice: "", type: "Draft Booster Box", total: 30, imageUrl: "" });
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

    const colors = ["indigo", "emerald", "rose", "amber", "cyan"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const theme = getTheme(randomColor);

    const boxData = {
      name: newBox.name,
      type: newBox.type,
      capacity: newBox.type === "Draft Booster Box" ? "Drafts up to 8 players" : "Pack cracking only",
      remaining: newBox.total,
      total: newBox.total,
      format: newBox.type.includes("Draft") ? "Draft" : "Sealed",
      color: randomColor,
      cost: newBox.cost,
      marketPrice: newBox.marketPrice,
      setCode: newBox.setCode.toUpperCase(),
      imageUrl: newBox.imageUrl,
      theme
    };

    if (db) {
      const docRef = await addDoc(collection(db, 'playBoxes'), boxData);
      setPlayBoxes(prev => [...prev, { ...boxData, id: docRef.id }]);
    } else {
      setPlayBoxes(prev => [...prev, { ...boxData, id: Date.now().toString() }]);
    }

    setIsModalOpen(false);
    setNewBox({ name: "", setCode: "", cost: "", marketPrice: "", type: "Draft Booster Box", total: 30, imageUrl: "" });
  };

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Play Box</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your sealed product inventory, draft boxes, and custom cubes.</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Box
            </button>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" /> Add New Box
                </h3>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddBox} className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Box Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bloomburrow Draft Box"
                    value={newBox.name}
                    onChange={e => setNewBox({...newBox, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Set Code</label>
                    <input
                      type="text"
                      required
                      placeholder={knownSets[0] ? `e.g. ${knownSets.find(s => !s.upcoming)?.code ?? knownSets[0].code}` : "e.g. BLB"}
                      maxLength={5}
                      list="ccs-set-options"
                      autoComplete="off"
                      value={newBox.setCode}
                      onChange={e => handleSetCodeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
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
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cost Spent</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="120.00"
                        value={newBox.cost}
                        onChange={e => setNewBox({...newBox, cost: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Market Price <span className="font-normal text-slate-400">(shown publicly)</span></label>
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
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Image URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newBox.imageUrl}
                      onChange={e => setNewBox({...newBox, imageUrl: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Box Type</label>
                  <select
                    aria-label="Box Type"
                    value={newBox.type}
                    onChange={e => setNewBox({...newBox, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Draft Booster Box">Draft Booster Box</option>
                    <option value="Set Booster Box">Set Booster Box</option>
                    <option value="Collector Booster Box">Collector Booster Box</option>
                    <option value="Jumpstart Cube">Jumpstart Cube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Total Packs / Items</label>
                  <input
                    type="number"
                    required
                    aria-label="Total Packs / Items"
                    min="1"
                    value={newBox.total}
                    onChange={e => setNewBox({...newBox, total: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
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
              const theme = box.theme || getTheme(box.color || "indigo");
              const percentage = Math.round((box.remaining / box.total) * 100);
              // Use cost for price-per-pack calculations (visible to everyone; specific paid price is admin-only)
              const packPrice = box.cost && box.total ? parseFloat(box.cost) / box.total : null;
              const draftCost = packPrice ? (packPrice * 3).toFixed(2) : null;
              const sealedCost = packPrice ? (packPrice * 6).toFixed(2) : null;

              return (
              <Link href={`/play-box/${box.id}`} key={box.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-[box-shadow,border-color] duration-150 flex flex-col group relative">

                {/* Hero Image Overlay */}
                {box.imageUrl && (
                  <div className="absolute inset-0 z-0">
                    <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover opacity-20 dark:opacity-40 group-hover:opacity-30 dark:group-hover:opacity-50 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white dark:from-slate-900/90 dark:to-slate-900"></div>
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1 relative z-10">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 shrink-0 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 ${theme.icon}`}>
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
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">
                          {box.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex gap-2">
                          {box.type} • {box.setCode || box.format}
                        </p>
                      </div>
                    </div>
                    {isAdmin && box.cost && (
                      <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        ${box.cost}
                      </span>
                    )}
                    {!isAdmin && box.marketPrice && (
                      <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                        ${box.marketPrice}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">Inventory</span>
                      <span className="text-slate-900 dark:text-slate-100">{box.remaining} / {box.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${theme.progressFill}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>

                  {(draftCost || sealedCost) && (
                    <dl className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                      {draftCost && (
                        <div className="pr-3">
                          <dt className="text-slate-500 dark:text-slate-400">Draft / person</dt>
                          <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">${draftCost} <span className="font-normal text-slate-500 dark:text-slate-400">est.</span></dd>
                        </div>
                      )}
                      {sealedCost && (
                        <div className="pl-3">
                          <dt className="text-slate-500 dark:text-slate-400">Sealed / person</dt>
                          <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">${sealedCost} <span className="font-normal text-slate-500 dark:text-slate-400">est.</span></dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {isAdmin && (
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); router.push(`/play-box/${box.id}?edit=1`); }}
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
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
