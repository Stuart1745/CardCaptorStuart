"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Edit3, ExternalLink, Loader2, Share2, Star, Trash2, X } from "lucide-react";
import { DeckEditor } from "@/components/DeckEditor";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { isAdminUser } from "@/lib/admin";
import { DEFAULT_DECKS, type Deck, type DeckCardEntry, deckSize, groupDeck, linkLabel, deckBracket, gameChangersIn, textBlocks, preconLabel, bracketReasons } from "@/lib/decks";
import { ManaIcon } from "@/components/ManaIcon";
import { FloatingPreview } from "@/components/FloatingPreview";

/** Scryfall's bigger scan for the hover preview ("normal" is 488px wide, "large" 672px). */
const largeImage = (url: string) => url.replace("/normal/", "/large/");


export default function DeckDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const [deck, setDeck] = useState<Deck | null>(() => DEFAULT_DECKS.find(d => d.id === id) ?? null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  /** Hover preview of a card (mouse and keyboard focus only; touch taps go straight to Scryfall) */
  const [preview, setPreview] = useState<{ card: DeckCardEntry; anchor: DOMRect } | null>(null);
  const showPreview = (card: DeckCardEntry, el: HTMLElement, viaFocus = false) => {
    if (!card.image) return;
    if (!viaFocus && typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    setPreview({ card, anchor: el.getBoundingClientRect() });
  };
  const hidePreview = () => setPreview(null);
  useEffect(() => {
    if (!preview) return;
    window.addEventListener("scroll", hidePreview, { passive: true, once: true });
    return () => window.removeEventListener("scroll", hidePreview);
  }, [preview]);

  useEffect(() => {
    (async () => {
      if (!db) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "decks", id));
        if (snap.exists()) setDeck({ id: snap.id, ...snap.data() } as Deck);
      } catch {
        // keep the built-in fallback, if any
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!db || !deck) return;
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, "decks", deck.id));
      router.push("/decks");
    } catch {
      setDeleteError("Deleting was refused. Make sure you're signed in with the admin account.");
    }
  };

  /** Admin: mark or unmark a key card (saved straight to the deck). */
  const toggleKey = async (card: DeckCardEntry) => {
    if (!db || !deck) return;
    setKeyError(null);
    const before = deck.cards;
    const cards = deck.cards.map(c => {
      if (c.board !== card.board || c.name !== card.name) return c;
      if (!c.key) return { ...c, key: true };
      const copy = { ...c };
      delete copy.key;
      return copy;
    });
    setDeck({ ...deck, cards });
    try {
      await updateDoc(doc(db, "decks", deck.id), { cards });
    } catch {
      setDeck({ ...deck, cards: before });
      setKeyError("Couldn't save the key card. Make sure you're signed in with the admin account.");
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* clipboard refused; the URL is shown for manual copying */ }
  };

  if (!deck) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-paper-500 dark:text-paper-400 hover:text-sakura-600 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Deck Hub</Link>
          {loading
            ? <p className="flex items-center gap-2 text-paper-500 dark:text-paper-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading deck…</p>
            : <p className="text-paper-600 dark:text-paper-400">This deck doesn&apos;t exist or was deleted.</p>}
        </div>
      </main>
    );
  }

  const commanderCard = (deck.cards ?? []).find(c => c.board === "commander" && c.image);
  // The commander's card goes in the header, so leave it out of the list below.
  const groups = groupDeck(deck.cards ?? []).filter(g => !(commanderCard && g.label.startsWith("Commander") && g.cards.length === 1));
  const total = deckSize(deck.cards ?? []);
  const bracket = deckBracket(deck);
  const gameChangers = gameChangersIn(deck.cards ?? []);
  const keyCards = (deck.cards ?? []).filter(c => c.key);
  const guide = deck.playGuide ? textBlocks(deck.playGuide) : [];

  const renderCard = (card: DeckCardEntry, where: string) => (
    <div key={`${where}-${card.board}-${card.name}`} className="flex flex-col gap-1.5 min-w-0">
      <a href={card.scryfallUri ?? `https://scryfall.com/search?q=!"${encodeURIComponent(card.name)}"`}
        target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0"
        onMouseEnter={e => showPreview(card, e.currentTarget.firstElementChild as HTMLElement)} onMouseLeave={hidePreview}
        onFocus={e => showPreview(card, e.currentTarget.firstElementChild as HTMLElement, true)} onBlur={hidePreview}>
        <div className="relative aspect-[488/680] rounded-[4.5%/3.2%] overflow-hidden shadow-sm ring-1 ring-paper-900/10 dark:ring-white/10 group-hover:ring-2 group-hover:ring-sakura-500 transition-shadow duration-150 bg-paper-200 dark:bg-paper-800">
          {card.image && <img src={card.image} alt={card.name} loading="lazy" className="w-full h-full object-cover" />}
          {card.qty > 1 && (
            <span className="absolute top-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-md bg-paper-900/85 text-white">×{card.qty}</span>
          )}
          {card.key && (
            <span className="sticker absolute bottom-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 rounded-md bg-butter text-amber-950">Key</span>
          )}
        </div>
        <p className="text-xs font-medium text-paper-700 dark:text-paper-300 truncate">{card.name}</p>
      </a>
      {isAdmin && (
        <button type="button" onClick={() => toggleKey(card)} aria-pressed={!!card.key}
          className={`self-start flex items-center gap-1 text-xs font-medium rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors ${card.key
            ? "text-sakura-700 dark:text-sakura-300 hover:bg-sakura-50 dark:hover:bg-sakura-900/30"
            : "text-paper-500 dark:text-paper-400 hover:text-sakura-700 dark:hover:text-sakura-300 hover:bg-paper-100 dark:hover:bg-paper-800"}`}>
          <Star className="w-3.5 h-3.5" fill={card.key ? "currentColor" : "none"} /> {card.key ? "Key card" : "Mark as key"}
        </button>
      )}
    </div>
  );

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-paper-500 dark:text-paper-400 hover:text-sakura-600 dark:hover:text-sakura-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deck Hub
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 min-w-0">
            {commanderCard ? (
              <a href={commanderCard.scryfallUri ?? "#"} target="_blank" rel="noopener noreferrer"
                aria-label={`${commanderCard.name} on Scryfall`}
                onMouseEnter={e => showPreview(commanderCard, e.currentTarget)} onMouseLeave={hidePreview}
                onFocus={e => showPreview(commanderCard, e.currentTarget, true)} onBlur={hidePreview}
                className="w-36 sm:w-48 lg:w-56 shrink-0 aspect-[488/680] rounded-[4.5%/3.2%] overflow-hidden shadow-lg ring-1 ring-paper-900/10 dark:ring-white/10 bg-paper-200 dark:bg-paper-800 hover:ring-2 hover:ring-sakura-500 transition-shadow duration-150">
                <img src={commanderCard.image} alt={commanderCard.name} className="w-full h-full object-cover" />
              </a>
            ) : (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-paper-800 shadow-lg shrink-0 bg-paper-200 dark:bg-paper-800">
                {deck.thumbnail && <img src={deck.thumbnail} alt={deck.commander ?? deck.name} className="w-full h-full object-cover" />}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-brand font-bold text-paper-900 dark:text-paper-50"><span className="washi">{deck.name}</span></h1>
              <p className="text-paper-500 dark:text-paper-400 mt-1 flex flex-wrap items-center gap-2">
                <span>{deck.format}{total > 0 ? ` · ${total} cards` : ""}{deck.commander ? ` · ${deck.commander}` : ""}</span>
                <span className="flex gap-1">
                  {deck.colors.map(c => <ManaIcon key={c} symbol={c} size={18} />)}
                </span>
              </p>
              {(bracket || deck.precon || (deck.pods && deck.pods.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {deck.precon && (
                    <span className="sticker text-xs font-bold px-2 py-1 rounded-md bg-sky-200 text-sky-950">Precon · {preconLabel(deck)}</span>
                  )}
                  {bracket && (
                    <span title={bracket.detail} className={`sticker text-xs font-bold px-2 py-1 rounded-md ${bracket.estimated
                      ? "border border-dashed border-paper-400 text-paper-700 dark:text-paper-300"
                      : "bg-butter text-amber-950"}`}>
                      {bracket.estimated ? `${bracket.label} (estimated)` : bracket.detail}
                    </span>
                  )}
                  {deck.pods?.map(p => (
                    <Link key={p} href="/decks" className="text-xs font-medium px-2 py-1 rounded-full bg-sakura-50 dark:bg-sakura-900/30 text-sakura-700 dark:text-sakura-300 border border-sakura-100 dark:border-sakura-800/50">{p}</Link>
                  ))}
                </div>
              )}
              {bracket && !deck.bracket && deck.bracketEstimate ? (
                <div className="text-xs text-paper-500 dark:text-paper-400 mt-2 space-y-0.5 max-w-prose">
                  {bracketReasons(deck.bracketEstimate).map(r => <p key={r}>{r}</p>)}
                  {bracketReasons(deck.bracketEstimate).length === 0 && <p>No Game Changers, two-card combos, extra turns or mass land denial.</p>}
                  <p>Checked with <a href="https://commanderspellbook.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-sakura-700 dark:hover:text-sakura-300">Commander Spellbook</a>.</p>
                </div>
              ) : bracket && gameChangers.length > 0 && (
                <p className="text-xs text-paper-500 dark:text-paper-400 mt-2">
                  Game Changers ({gameChangers.length}): {gameChangers.join(", ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {deck.link && (
              <a href={deck.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-paper-700 font-medium">
                <ExternalLink className="w-4 h-4" /> {linkLabel(deck.link)}
              </a>
            )}
            <button type="button" onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-paper-700 font-medium">
              <Share2 className="w-4 h-4" /> Share
            </button>
            {isAdmin && (
              <>
                <button type="button" onClick={() => setIsEditorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-on-accent rounded-lg hover:bg-accent-hover font-medium shadow-sm">
                  <Edit3 className="w-4 h-4" /> Edit Deck
                </button>
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {(deck.description || guide.length > 0) && (
          <div className="grid gap-6 mb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start">
            {deck.description && (
              <section className="bg-white dark:bg-paper-900 rounded-2xl p-5 md:p-6 border border-paper-200 dark:border-paper-800 shadow-sm">
                <h2 className="font-brand font-bold text-lg text-paper-900 dark:text-paper-100 washi-block mb-3">About this deck</h2>
                <p className="text-paper-700 dark:text-paper-300 leading-relaxed max-w-prose whitespace-pre-line">{deck.description}</p>
              </section>
            )}
            {guide.length > 0 && (
              <section className="bg-white dark:bg-paper-900 rounded-2xl p-5 md:p-6 border border-paper-200 dark:border-paper-800 shadow-sm">
                <h2 className="font-brand font-bold text-lg text-paper-900 dark:text-paper-100 washi-block mb-3">How to play it</h2>
                <div className="space-y-3 text-paper-700 dark:text-paper-300 leading-relaxed max-w-prose">
                  {guide.map((b, i) => b.kind === "p"
                    ? <p key={i}>{b.text}</p>
                    : <ul key={i} className="list-disc pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>)}
                </div>
              </section>
            )}
          </div>
        )}
        {isAdmin && !deck.description && !deck.playGuide && (
          <p className="mb-8 text-sm text-paper-500 dark:text-paper-400">No description or play guide yet. Add them with Edit Deck.</p>
        )}

        {confirmDelete && (
          <div role="alert" className="mb-8 p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-red-800 dark:text-red-300">Delete <strong>{deck.name}</strong>? This can&apos;t be undone.{deleteError && <span className="block text-sm mt-1">{deleteError}</span>}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                className="px-4 py-2 rounded-lg text-paper-700 dark:text-paper-300 hover:bg-white/60 dark:hover:bg-paper-800 font-medium">Keep deck</button>
              <button type="button" onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Delete deck</button>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white dark:bg-paper-900 rounded-2xl p-10 border border-paper-200 dark:border-paper-800 shadow-sm text-center">
            <p className="text-paper-700 dark:text-paper-300 font-medium">No decklist yet.</p>
            <p className="text-paper-500 dark:text-paper-400 text-sm mt-1">
              {isAdmin ? "Use Edit Deck to import it from Moxfield or paste the list." : deck.link ? `See the list on ${linkLabel(deck.link)}.` : "Check back later."}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-paper-900 rounded-2xl p-5 md:p-6 border border-paper-200 dark:border-paper-800 shadow-sm space-y-10">
            {keyError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{keyError}</p>}
            {keyCards.length > 0 && (
              <section>
                <h2 className="text-lg font-brand font-bold text-paper-900 dark:text-paper-100 pb-2 mb-4 border-b border-paper-100 dark:border-paper-800">
                  Key cards <span className="text-paper-500 dark:text-paper-400 font-normal">({keyCards.length})</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-5">
                  {keyCards.map(card => renderCard(card, "key"))}
                </div>
              </section>
            )}
            {groups.map(g => (
              <section key={g.label}>
                <h2 className="text-lg font-brand font-bold text-paper-900 dark:text-paper-100 pb-2 mb-4 border-b border-paper-100 dark:border-paper-800">
                  {g.label} <span className="text-paper-500 dark:text-paper-400 font-normal">({g.count})</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-5">
                  {g.cards.map(card => renderCard(card, g.label))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {isShareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-paper-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-paper-100 dark:border-paper-800">
              <h3 className="font-bold text-paper-900 dark:text-paper-100">Share {deck.name}</h3>
              <button type="button" aria-label="Close" onClick={() => setIsShareOpen(false)} className="p-1 rounded-md text-paper-500 dark:text-paper-400 hover:bg-paper-100 dark:hover:bg-paper-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center gap-5">
              <div className="bg-white p-4 rounded-xl border border-paper-200"><QRCodeSVG value={shareUrl} size={200} level="H" /></div>
              <p className="text-xs text-paper-500 dark:text-paper-400 break-all text-center select-all">{shareUrl}</p>
              <button type="button" onClick={copyLink} className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent rounded-lg font-medium">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <DeckEditor
          deck={deck}
          onClose={() => setIsEditorOpen(false)}
          onSaved={saved => { setDeck(saved); setIsEditorOpen(false); }}
        />
      )}
      {preview?.card.image && (
        <FloatingPreview anchor={preview.anchor} maxWidth={336} interactive={false} side="right">
          <img src={largeImage(preview.card.image)} alt="" className="w-full rounded-[4.5%/3.2%] shadow-2xl ring-1 ring-black/10" />
        </FloatingPreview>
      )}
    </main>
  );
}
