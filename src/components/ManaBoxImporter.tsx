"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { AlertCircle, Upload } from "lucide-react";
import { db } from "@/lib/firebase";
import { MANABOX_COLUMNS, binderFromManaBox, type CollectionBinder } from "@/lib/collection";
import { formatPrice } from "@/lib/cardPrices";

/**
 * Replace the collection with a ManaBox export (Collection > Export > CSV in the ManaBox app).
 * Shows what is in the file first; nothing is written until "Replace my collection".
 */
export function ManaBoxImporter({ uid, onImported }: { uid: string; onImported: () => void }) {
  const [parsed, setParsed] = useState<{ file: string; binders: Omit<CollectionBinder, "importedAt">[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setParsed(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        const cols = res.meta.fields ?? [];
        const missing = MANABOX_COLUMNS.filter(c => !cols.includes(c));
        if (missing.length) {
          setError(`This doesn't look like a ManaBox export: it has no ${missing.join(", ")} column${missing.length > 1 ? "s" : ""}.`);
          return;
        }
        const binders = binderFromManaBox(res.data);
        if (!binders.length) { setError("The file has no cards in it."); return; }
        setParsed({ file: file.name, binders });
      },
      error: err => setError(`Couldn't read the file: ${err.message}`),
    });
  };

  const save = async () => {
    if (!db || !parsed) return;
    setSaving(true);
    setError(null);
    try {
      const col = collection(db, "users", uid, "collection");
      const keep = new Set(parsed.binders.map(b => b.id));
      const stale = (await getDocs(col)).docs.filter(d => !keep.has(d.id));
      const batch = writeBatch(db);
      for (const b of parsed.binders) {
        batch.set(doc(col, b.id), {
          binder: b.binder, kind: b.kind, rows: b.cards.length,
          count: b.cards.reduce((n, c) => n + c.q, 0),
          paid: Math.round(b.cards.reduce((n, c) => n + (c.p ?? 0) * c.q, 0) * 100) / 100,
          importedAt: serverTimestamp(), source: "ManaBox CSV export",
          cards: JSON.stringify(b.cards),
        });
      }
      for (const d of stale) batch.delete(d.ref);
      await batch.commit();
      setParsed(null);
      onImported();
    } catch {
      setError("Saving was refused. Make sure you're signed in with your own account and try again.");
    } finally {
      setSaving(false);
    }
  };

  const cards = parsed ? parsed.binders.flatMap(b => b.cards) : [];
  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-paper-300 dark:border-paper-700 rounded-xl bg-paper-50 dark:bg-paper-900 hover:bg-paper-100 dark:hover:bg-paper-800 transition-colors cursor-pointer text-center">
        <Upload className="w-8 h-8 text-paper-500 dark:text-paper-400" aria-hidden />
        <span className="font-semibold text-paper-800 dark:text-paper-100">Choose a ManaBox CSV export</span>
        <span className="text-sm text-paper-500 dark:text-paper-400">In ManaBox: Collection, then Export, then CSV. Sets, foils, conditions and purchase prices come across.</span>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" />
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      {parsed && (
        <div className="rounded-xl border border-paper-200 dark:border-paper-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-paper-700 dark:text-paper-200">
            <span className="font-semibold">{parsed.file}</span>: {cards.reduce((n, c) => n + c.q, 0).toLocaleString("en-US")} cards
            ({cards.length.toLocaleString("en-US")} printings) in {parsed.binders.length} binders and decks,
            {" "}{formatPrice(cards.reduce((n, c) => n + (c.p ?? 0) * c.q, 0))} paid.
            This replaces the collection you have now.
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setParsed(null)} className="px-4 py-2 rounded-lg text-paper-700 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 font-medium">Cancel</button>
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Replace my collection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
