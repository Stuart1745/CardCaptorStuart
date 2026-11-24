"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Edit3, ExternalLink, Loader2, Share2, Trash2, X } from "lucide-react";
import { DeckEditor } from "@/components/DeckEditor";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { isAdminUser } from "@/lib/admin";
import { DEFAULT_DECKS, type Deck, deckSize, groupDeck, linkLabel, deckBracket, gameChangersIn } from "@/lib/decks";
import { ManaIcon } from "@/components/ManaIcon";


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

  const shareUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* clipboard refused; the URL is shown for manual copying */ }
  };

  if (!deck) {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Deck Hub</Link>
          {loading
            ? <p className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading deck…</p>
            : <p className="text-slate-600 dark:text-slate-400">This deck doesn&apos;t exist or was deleted.</p>}
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

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deck Hub
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-5 sm:gap-6 min-w-0">
            {commanderCard ? (
              <a href={commanderCard.scryfallUri ?? "#"} target="_blank" rel="noopener noreferrer"
                className="w-28 sm:w-36 shrink-0 aspect-[488/680] rounded-[4.5%/3.2%] overflow-hidden shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 bg-slate-200 dark:bg-slate-800">
                <img src={commanderCard.image} alt={commanderCard.name} className="w-full h-full object-cover" />
              </a>
            ) : (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg shrink-0 bg-slate-200 dark:bg-slate-800">
                {deck.thumbnail && <img src={deck.thumbnail} alt={deck.commander ?? deck.name} className="w-full h-full object-cover" />}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{deck.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>{deck.format}{total > 0 ? ` · ${total} cards` : ""}{deck.commander ? ` · ${deck.commander}` : ""}</span>
                <span className="flex gap-1">
                  {deck.colors.map(c => <ManaIcon key={c} symbol={c} size={18} />)}
                </span>
              </p>
              {(bracket || (deck.pods && deck.pods.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {bracket && (
                    <span title={bracket.detail} className={`text-xs font-bold px-2 py-1 rounded-md ${bracket.estimated
                      ? "border border-dashed border-slate-400 text-slate-700 dark:text-slate-300"
                      : "bg-indigo-600 text-white"}`}>
                      {bracket.estimated ? `${bracket.label} (estimated)` : bracket.detail}
                    </span>
                  )}
                  {deck.pods?.map(p => (
                    <Link key={p} href="/decks" className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">{p}</Link>
                  ))}
                </div>
              )}
              {bracket && gameChangers.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Game Changers ({gameChangers.length}): {gameChangers.join(", ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {deck.link && (
              <a href={deck.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">
                <ExternalLink className="w-4 h-4" /> {linkLabel(deck.link)}
              </a>
            )}
            <button type="button" onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">
              <Share2 className="w-4 h-4" /> Share
            </button>
            {isAdmin && (
              <>
                <button type="button" onClick={() => setIsEditorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
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

        {confirmDelete && (
          <div role="alert" className="mb-8 p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-red-800 dark:text-red-300">Delete <strong>{deck.name}</strong>? This can&apos;t be undone.{deleteError && <span className="block text-sm mt-1">{deleteError}</span>}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 font-medium">Keep deck</button>
              <button type="button" onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Delete deck</button>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <p className="text-slate-700 dark:text-slate-300 font-medium">No decklist yet.</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {isAdmin ? "Use Edit Deck to import it from Moxfield or paste the list." : deck.link ? `See the list on ${linkLabel(deck.link)}.` : "Check back later."}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
            {groups.map(g => (
              <section key={g.label}>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
                  {g.label} <span className="text-slate-500 dark:text-slate-400 font-normal">({g.count})</span>
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-5">
                  {g.cards.map(card => (
                    <a key={`${card.board}-${card.name}`} href={card.scryfallUri ?? `https://scryfall.com/search?q=!"${encodeURIComponent(card.name)}"`}
                      target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1.5 min-w-0">
                      <div className="relative aspect-[488/680] rounded-[4.5%/3.2%] overflow-hidden shadow-sm ring-1 ring-slate-900/10 dark:ring-white/10 group-hover:ring-2 group-hover:ring-indigo-500 transition-shadow duration-150 bg-slate-200 dark:bg-slate-800">
                        {card.image && <img src={card.image} alt={card.name} loading="lazy" className="w-full h-full object-cover" />}
                        {card.qty > 1 && (
                          <span className="absolute top-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-md bg-slate-900/85 text-white">×{card.qty}</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{card.name}</p>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {isShareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Share {deck.name}</h3>
              <button type="button" aria-label="Close" onClick={() => setIsShareOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 flex flex-col items-center gap-5">
              <div className="bg-white p-4 rounded-xl border border-slate-200"><QRCodeSVG value={shareUrl} size={200} level="H" /></div>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-all text-center select-all">{shareUrl}</p>
              <button type="button" onClick={copyLink} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
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
    </main>
  );
}
