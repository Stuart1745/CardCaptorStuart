"use client";

import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, X, AlertCircle, Download } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  DECK_FORMATS, type Deck, parseDecklist, resolveDecklist, fetchCardByName, coverArtFor, colorIdentityOf, slugify,
} from "@/lib/decks";

const PLACEHOLDER = `Commander
1 Celes, Rune Knight

Deck
1 Sol Ring
1 Arcane Signet
1 Swords to Plowshares (CMM) 75
...`;

const inputCls =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const labelCls = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

/** Create or edit a deck. Saves to Firestore decks/{id} (admin only by the rules). */
export function DeckEditor({ deck, onClose, onSaved }: {
  deck?: Deck;
  onClose: () => void;
  onSaved: (deck: Deck) => void;
}) {
  const [name, setName] = useState(deck?.name ?? "");
  const [format, setFormat] = useState(deck?.format ?? "Commander");
  const [commander, setCommander] = useState(deck?.commander ?? "");
  const [link, setLink] = useState(deck?.link ?? "");
  const [decklist, setDecklist] = useState(deck?.decklistText ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [savedWithMisses, setSavedWithMisses] = useState<Deck | null>(null);
  const [moxUrl, setMoxUrl] = useState("");
  const [importNote, setImportNote] = useState<string | null>(null);

  // One request per click; the server route caches and spaces calls (Moxfield is behind
  // Cloudflare rate limiting), and nothing retries automatically.
  const importFromMoxfield = async () => {
    setError(null);
    setImportNote(null);
    if (!moxUrl.trim()) { setError("Paste a Moxfield deck link first."); return; }
    setBusy("Importing from Moxfield…");
    try {
      const res = await fetch(`/api/moxfield?deck=${encodeURIComponent(moxUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Import failed (HTTP ${res.status}).`); return; }
      if (!name.trim()) setName(data.name);
      setFormat(data.format);
      if (data.commander) setCommander(data.commander);
      setLink(data.link);
      setDecklist(data.decklistText);
      setImportNote(`Imported ${data.cardCount} cards from Moxfield. Check the list, then ${deck ? "save" : "create the deck"}.`);
    } catch {
      setError("Couldn't reach the import service. Paste the decklist instead.");
    } finally {
      setBusy(null);
    }
  };

  const isCommanderFormat = format === "Commander" || format === "Brawl";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotFound([]);
    if (!db) { setError("The database isn't connected. Reload the page and try again."); return; }
    if (!name.trim()) { setError("Give the deck a name."); return; }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) { setError("The link must start with https://"); return; }

    try {
      const lines = parseDecklist(decklist);
      let cards = deck?.cards ?? [];
      let colors = deck?.colors ?? [];
      let thumbnail = deck?.thumbnail ?? "";
      let commanderName = commander.trim() || undefined;
      let misses: string[] = [];

      if (lines.length > 0) {
        setBusy(`Looking up ${lines.length} cards on Scryfall…`);
        const r = await resolveDecklist(lines, commanderName);
        cards = r.cards;
        colors = r.colors;
        thumbnail = r.thumbnail ?? thumbnail;
        commanderName = r.commander ?? commanderName;
        misses = r.notFound;
      } else {
        cards = [];
        if (commanderName && (commanderName !== deck?.commander || !thumbnail)) {
          setBusy("Looking up the cover card…");
          const card = await fetchCardByName(commanderName);
          if (!card) { setError(`Scryfall couldn't find "${commanderName}". Check the spelling.`); setBusy(null); return; }
          commanderName = card.name;
          thumbnail = coverArtFor(card) ?? thumbnail;
          colors = colorIdentityOf(card);
        }
      }

      setBusy("Saving…");
      const now = new Date().toISOString();
      const id = deck?.id ?? `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      const saved: Deck = {
        id,
        name: name.trim(),
        format,
        thumbnail,
        colors,
        cards,
        decklistText: decklist,
        createdAt: deck?.createdAt ?? now,
        updatedAt: now,
        ...(commanderName ? { commander: commanderName } : {}),
        ...(link.trim() ? { link: link.trim() } : {}),
      };
      // Firestore rejects undefined fields; drop the id (it's the document key).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _omit, ...data } = saved;
      await setDoc(doc(db, "decks", id), data);
      setBusy(null);

      if (misses.length) {
        setNotFound(misses);
        setSavedWithMisses(saved);
        return;
      }
      onSaved(saved);
    } catch (err) {
      setBusy(null);
      const msg = err instanceof Error ? err.message : String(err);
      setError(/permission|insufficient/i.test(msg)
        ? "Saving was refused. Make sure you're signed in with the admin account."
        : msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{deck ? "Edit Deck" : "New Deck"}</h3>
          <button type="button" aria-label="Close" onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedWithMisses ? (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-slate-700 dark:text-slate-300">
              Saved <strong>{savedWithMisses.name}</strong>, but Scryfall couldn&apos;t find {notFound.length === 1 ? "this card" : `these ${notFound.length} cards`}, so {notFound.length === 1 ? "it was" : "they were"} left out:
            </p>
            <ul className="text-sm font-mono bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              {notFound.map(n => <li key={n}>{n}</li>)}
            </ul>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fix the spelling with Edit and save again to add them.</p>
            <button type="button" onClick={() => onSaved(savedWithMisses)}
              className="self-end px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">Done</button>
          </div>
        ) : (
          <form onSubmit={save} className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 flex flex-col gap-2">
              <label htmlFor="deck-moxfield" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import from Moxfield <span className="font-normal text-slate-500">(public decks)</span></label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input id="deck-moxfield" type="url" value={moxUrl} onChange={e => setMoxUrl(e.target.value)}
                  placeholder="https://moxfield.com/decks/…" className={inputCls} />
                <button type="button" onClick={importFromMoxfield} disabled={!!busy}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 whitespace-nowrap">
                  <Download className="w-4 h-4" /> Import
                </button>
              </div>
              {importNote && <p className="text-sm text-emerald-700 dark:text-emerald-400">{importNote}</p>}
              <p className="text-xs text-slate-500 dark:text-slate-400">Fills in everything below. If Moxfield refuses, use its Export → Copy and paste the list.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="deck-name" className={labelCls}>Deck name</label>
                <input id="deck-name" type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Celes Knights" className={inputCls} />
              </div>
              <div>
                <label htmlFor="deck-format" className={labelCls}>Format</label>
                <select id="deck-format" value={format} onChange={e => setFormat(e.target.value)} className={inputCls}>
                  {DECK_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="deck-commander" className={labelCls}>{isCommanderFormat ? "Commander" : "Cover card"} <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="deck-commander" type="text" value={commander} onChange={e => setCommander(e.target.value)}
                  placeholder={isCommanderFormat ? "e.g. Celes, Rune Knight" : "Card whose art fronts the deck"} className={inputCls} />
              </div>
              <div>
                <label htmlFor="deck-link" className={labelCls}>Link <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="deck-link" type="url" value={link} onChange={e => setLink(e.target.value)}
                  placeholder="https://moxfield.com/decks/…" className={inputCls} />
              </div>
            </div>
            <div>
              <label htmlFor="deck-list" className={labelCls}>Decklist <span className="font-normal text-slate-400">(paste from Moxfield, Archidekt or Arena: one card per line)</span></label>
              <textarea id="deck-list" value={decklist} onChange={e => setDecklist(e.target.value)} rows={12}
                placeholder={PLACEHOLDER} spellCheck={false}
                className={`${inputCls} font-mono text-sm leading-relaxed`} />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Section headers like <code>Commander</code>, <code>Deck</code> and <code>Sideboard</code> are understood, as is Moxfield&apos;s <code>*CMDR*</code> marker. Art and colors come from the commander.
              </p>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              {busy && <span className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> {busy}</span>}
              <button type="button" onClick={onClose} disabled={!!busy}
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={!!busy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
                {deck ? "Save Changes" : "Create Deck"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
