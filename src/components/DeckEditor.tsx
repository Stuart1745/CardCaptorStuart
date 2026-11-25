"use client";

import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, X, AlertCircle, Download, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  DECK_FORMATS, BRACKETS, type Deck, parseDecklist, resolveDecklist, fetchCardByName, coverArtFor, colorIdentityOf, slugify,
  parsePods, requestBracketEstimate,
} from "@/lib/decks";

const PLACEHOLDER = `Commander
1 Celes, Rune Knight

Deck
1 Sol Ring
1 Arcane Signet
1 Swords to Plowshares (CMM) 75
...`;

const inputCls =
  "w-full px-3 py-2 border border-paper-300 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500";
const labelCls = "block text-sm font-semibold text-paper-700 dark:text-paper-300 mb-1.5";

/** A new deck’s document id: its name plus a short random suffix. */
const newDeckId = (name: string) => `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

/** Create or edit a deck. Saves to Firestore decks/{id} (admin only by the rules). */
export function DeckEditor({ deck, allPods = [], onClose, onSaved }: {
  deck?: Deck;
  /** Pod names already used on other decks, offered as suggestions */
  allPods?: string[];
  onClose: () => void;
  onSaved: (deck: Deck) => void;
}) {
  const [name, setName] = useState(deck?.name ?? "");
  const [format, setFormat] = useState(deck?.format ?? "Commander");
  const [commander, setCommander] = useState(deck?.commander ?? "");
  const [link, setLink] = useState(deck?.link ?? "");
  const [decklist, setDecklist] = useState(deck?.decklistText ?? "");
  const [bracket, setBracket] = useState<string>(deck?.bracket ? String(deck.bracket) : "");
  const [podsText, setPodsText] = useState((deck?.pods ?? []).join(", "));
  const [isPrecon, setIsPrecon] = useState(!!deck?.precon);
  const [preconName, setPreconName] = useState(deck?.precon ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [playGuide, setPlayGuide] = useState(deck?.playGuide ?? "");
  const [primer, setPrimer] = useState(deck?.primer ?? "");
  const [importUrl, setImportUrl] = useState("");
  /** Key cards named by the last import, marked on save */
  const [importedKeys, setImportedKeys] = useState<string[]>([]);
  const [importNote, setImportNote] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [savedWithMisses, setSavedWithMisses] = useState<Deck | null>(null);
  const isCommanderFormat = format === "Commander" || format === "Brawl";
  const currentPods = parsePods(podsText);
  const podSuggestions = allPods.filter(p => !currentPods.some(c => c.toLowerCase() === p.toLowerCase()));

  /** Fill the form from an Archidekt link (cards, description, key cards); a Moxfield link fills Link and explains Export. */
  const importFromLink = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImportNote(null);
    if (/moxfield[.]com/i.test(url)) {
      setLink(url.startsWith("http") ? url : `https://${url}`);
      setImportNote({ tone: "info", text: "Moxfield doesn’t let other sites read its decks. On the Moxfield deck, choose Export and copy the list with its tags, then paste it into Decklist below: cards tagged Key or Win Con become key cards. Copy its description into Description. The Link field is filled in." });
      setImportUrl("");
      return;
    }
    setBusy("Importing from Archidekt…");
    try {
      const res = await fetch(`/api/import-deck?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setImportNote({ tone: "error", text: data.error ?? `Import failed (HTTP ${res.status}).` });
        return;
      }
      const site = "Archidekt";
      if (!deck || !name.trim()) setName(data.name ?? name);
      if (data.format) setFormat(data.format);
      if (data.commander) setCommander(data.commander);
      if (data.bracket) setBracket(String(data.bracket));
      setLink(data.link);
      setDecklist(data.decklistText);
      const keys: string[] = Array.isArray(data.keyCards) ? data.keyCards : [];
      setImportedKeys(keys);
      const keptDescription = !!data.description && !!description.trim() && description.trim() !== data.description;
      if (data.description && !description.trim()) setDescription(data.description);
      if (data.primer && !primer.trim()) setPrimer(data.primer);
      setImportUrl("");
      const extras = [
        data.description && !keptDescription ? "its description" : "",
        data.primer && !primer.trim() ? "its primer" : "",
        keys.length ? `${keys.length} key card${keys.length === 1 ? "" : "s"}` : "",
      ].filter(Boolean).join(" and ");
      setImportNote({
        tone: "info",
        text: `Imported ${data.name}${extras ? ` with ${extras}` : ""}${data.bracket ? ` (Bracket ${data.bracket} on ${site})` : ""}.`
          + (keptDescription ? ` Your description was kept; ${site}'s was not copied over.` : "")
          + ` Check it over, then ${deck ? "save" : "create the deck"}.`,
      });
    } catch {
      setImportNote({ tone: "error", text: "Couldn’t reach the import service. Try again, or paste the list." });
    } finally {
      setBusy(null);
    }
  };

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
        // Keep the key-card marks from the previous version of the list, plus any the import named
        const keyNames = new Set([...(deck?.cards ?? []).filter(c => c.key).map(c => c.name), ...importedKeys]
          .map(n => n.toLowerCase()));
        const isKey = (n: string) => keyNames.has(n.toLowerCase()) || keyNames.has(n.split(" // ")[0].toLowerCase());
        cards = r.cards.map(c => (isKey(c.name) ? { ...c, key: true } : c));
        // Commander has no sideboard: a pasted Sideboard/Maybeboard section is left out
        if (isCommanderFormat) cards = cards.filter(c => c.board !== "sideboard");
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

      // Bracket check (Commander Spellbook). Re-run when the list changed or was never checked;
      // if Spellbook can't be reached, drop a stale estimate rather than keep one for old cards.
      let bracketEstimate = deck?.bracketEstimate;
      const listChanged = decklist !== (deck?.decklistText ?? "");
      if (isCommanderFormat && cards.length && (listChanged || !bracketEstimate)) {
        setBusy("Checking the bracket with Commander Spellbook…");
        bracketEstimate = (await requestBracketEstimate(cards)) ?? undefined;
      }
      if (!isCommanderFormat || !cards.length) bracketEstimate = undefined;

      setBusy("Saving…");
      const now = new Date().toISOString();
      const id = deck?.id ?? newDeckId(name);
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
        ...(isCommanderFormat && bracket ? { bracket: Number(bracket) } : {}),
        ...(bracketEstimate ? { bracketEstimate } : {}),
        ...(currentPods.length ? { pods: currentPods } : {}),
        ...(isPrecon ? { precon: preconName.trim() || "Precon" } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(playGuide.trim() ? { playGuide: playGuide.trim() } : {}),
        ...(primer.trim() ? { primer: primer.trim() } : {}),
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-paper-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-100 dark:border-paper-800">
          <h3 className="font-bold text-lg text-paper-900 dark:text-paper-100">{deck ? "Edit Deck" : "New Deck"}</h3>
          <button type="button" aria-label="Close" onClick={onClose}
            className="p-1 rounded-md text-paper-500 dark:text-paper-400 hover:text-paper-600 dark:hover:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedWithMisses ? (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-paper-700 dark:text-paper-300">
              Saved <strong>{savedWithMisses.name}</strong>, but Scryfall couldn&apos;t find {notFound.length === 1 ? "this card" : `these ${notFound.length} cards`}, so {notFound.length === 1 ? "it was" : "they were"} left out:
            </p>
            <ul className="text-sm font-mono bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              {notFound.map(n => <li key={n}>{n}</li>)}
            </ul>
            <p className="text-sm text-paper-500 dark:text-paper-400">Fix the spelling with Edit and save again to add them.</p>
            <button type="button" onClick={() => onSaved(savedWithMisses)}
              className="self-end px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent rounded-lg font-medium">Done</button>
          </div>
        ) : (
          <form onSubmit={save} className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label htmlFor="deck-import" className={labelCls}>Import from a link <span className="font-normal text-paper-500 dark:text-paper-400">(Archidekt brings the cards, description and key cards; for Moxfield, paste its Export)</span></label>
              <div className="flex gap-2">
                <input id="deck-import" type="url" value={importUrl} onChange={e => setImportUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); importFromLink(); } }}
                  placeholder="https://archidekt.com/decks/1234567" className={inputCls} />
                <button type="button" onClick={importFromLink} disabled={!!busy || !importUrl.trim()}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-700 font-medium disabled:opacity-50">
                  <Download className="w-4 h-4" /> Import
                </button>
              </div>
              {importNote && (
                <p role={importNote.tone === "error" ? "alert" : "status"} className={`mt-2 flex items-start gap-2 text-sm rounded-lg p-3 border ${importNote.tone === "error"
                  ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
                  : "text-sakura-800 dark:text-sakura-200 bg-sakura-50 dark:bg-sakura-900/20 border-sakura-200 dark:border-sakura-800/50"}`}>
                  {importNote.tone === "error" ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />} {importNote.text}
                </p>
              )}
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
                <label htmlFor="deck-commander" className={labelCls}>{isCommanderFormat ? "Commander" : "Cover card"} <span className="font-normal text-paper-500 dark:text-paper-400">(optional)</span></label>
                <input id="deck-commander" type="text" value={commander} onChange={e => setCommander(e.target.value)}
                  placeholder={isCommanderFormat ? "e.g. Celes, Rune Knight" : "Card whose art fronts the deck"} className={inputCls} />
              </div>
              <div>
                <label htmlFor="deck-link" className={labelCls}>Link <span className="font-normal text-paper-500 dark:text-paper-400">(optional)</span></label>
                <input id="deck-link" type="url" value={link} onChange={e => setLink(e.target.value)}
                  placeholder="https://moxfield.com/decks/…" className={inputCls} />
              </div>
            </div>
            <div className={`grid grid-cols-1 ${isCommanderFormat ? "sm:grid-cols-3" : ""} gap-4`}>
              {isCommanderFormat && (
                <div>
                  <label htmlFor="deck-bracket" className={labelCls}>Bracket</label>
                  <select id="deck-bracket" value={bracket} onChange={e => setBracket(e.target.value)} className={inputCls}>
                    <option value="">Estimate (Commander Spellbook)</option>
                    {Object.entries(BRACKETS).map(([n, label]) => <option key={n} value={n}>{n}: {label}</option>)}
                  </select>
                </div>
              )}
              <div className={isCommanderFormat ? "sm:col-span-2" : ""}>
                <label htmlFor="deck-pods" className={labelCls}>Pods / battle boxes <span className="font-normal text-paper-500 dark:text-paper-400">(optional, comma-separated)</span></label>
                <input id="deck-pods" type="text" value={podsText} onChange={e => setPodsText(e.target.value)}
                  placeholder="e.g. Final Fantasy Pod, Precon Battle Box" className={inputCls} />
                {podSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {podSuggestions.map(p => (
                      <button key={p} type="button" onClick={() => setPodsText([...currentPods, p].join(", "))}
                        className="text-xs px-2 py-1 rounded-full border border-sakura-200 dark:border-sakura-800/60 text-sakura-700 dark:text-sakura-300 hover:bg-sakura-50 dark:hover:bg-sakura-900/30">
                        + {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <label className="flex items-center gap-2 text-sm font-semibold text-paper-700 dark:text-paper-300 sm:pb-2.5">
                <input type="checkbox" checked={isPrecon} onChange={e => setIsPrecon(e.target.checked)} className="w-4 h-4 rounded" />
                Precon (a preconstructed deck)
              </label>
              {isPrecon && (
                <div className="sm:col-span-2">
                  <label htmlFor="deck-precon" className={labelCls}>Precon name <span className="font-normal text-paper-500 dark:text-paper-400">(product and set)</span></label>
                  <input id="deck-precon" type="text" value={preconName} onChange={e => setPreconName(e.target.value)}
                    placeholder="e.g. Revival Trance (FINAL FANTASY VI)" className={inputCls} />
                </div>
              )}
            </div>
            <div>
              <label htmlFor="deck-description" className={labelCls}>Description <span className="font-normal text-paper-500 dark:text-paper-400">(optional; shown on the Deck Hub and the deck page)</span></label>
              <textarea id="deck-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="What the deck does, in a sentence or two." className={inputCls} />
            </div>
            <div>
              <label htmlFor="deck-guide" className={labelCls}>Play guide <span className="font-normal text-paper-500 dark:text-paper-400">(optional)</span></label>
              <textarea id="deck-guide" value={playGuide} onChange={e => setPlayGuide(e.target.value)} rows={7}
                placeholder={`How to pilot it: early turns, what to protect, how it wins.

- Start a line with a dash for a bullet`} className={inputCls} />
              <p className="text-xs text-paper-500 dark:text-paper-400 mt-1.5">A blank line starts a new paragraph; lines starting with &ldquo;- &rdquo; become bullets.</p>
            </div>
            <div>
              <label htmlFor="deck-primer" className={labelCls}>Primer <span className="font-normal text-paper-500 dark:text-paper-400">(optional; the long write-up)</span></label>
              <textarea id="deck-primer" value={primer} onChange={e => setPrimer(e.target.value)} rows={8}
                placeholder={`## Game plan

Paste a Moxfield or Archidekt primer here. [[Card Name]] links to the card.`} className={`${inputCls} text-sm`} />
              <p className="text-xs text-paper-500 dark:text-paper-400 mt-1.5">
                From Moxfield: open the deck&apos;s <strong>Primer</strong> tab, choose Edit, copy the text and paste it here. Headings (<code>#</code>), lists, <code>**bold**</code>, <code>*italic*</code> and links work.
              </p>
            </div>
            <div>
              <label htmlFor="deck-list" className={labelCls}>Decklist <span className="font-normal text-paper-500 dark:text-paper-400">(paste from Moxfield, Archidekt or Arena: one card per line)</span></label>
              <textarea id="deck-list" value={decklist} onChange={e => setDecklist(e.target.value)} rows={12}
                placeholder={PLACEHOLDER} spellCheck={false}
                className={`${inputCls} font-mono text-sm leading-relaxed`} />
              <p className="text-xs text-paper-500 dark:text-paper-400 mt-1.5">
                From Moxfield: open the deck, choose <strong>Export</strong>, copy the list, and paste it here. Cards tagged <code>#Key</code> or <code>#Win Con</code> (or in an Archidekt <code>[Key Cards]</code> category) become key cards. Section headers like <code>Commander</code>, <code>Deck</code> and <code>Sideboard</code> are understood, as is Moxfield&apos;s <code>*CMDR*</code> marker. Art and colors come from the commander.
              </p>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              {busy && <span className="flex items-center gap-2 text-sm text-paper-500 dark:text-paper-400"><Loader2 className="w-4 h-4 animate-spin" /> {busy}</span>}
              <button type="button" onClick={onClose} disabled={!!busy}
                className="px-4 py-2 rounded-lg text-paper-700 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 font-medium disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={!!busy}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent rounded-lg font-medium disabled:opacity-50">
                {deck ? "Save Changes" : "Create Deck"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
