"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { Layers, Plus, Shield, Users } from "lucide-react";
import { DeckCard } from "@/components/DeckCard";
import { DeckEditor } from "@/components/DeckEditor";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { isAdminUser } from "@/lib/admin";
import { BRACKETS, DEFAULT_DECKS, type Deck, deckBracket } from "@/lib/decks";

/** Hub filters: everything, the automatic groups (precon or not, bracket) and the pods. */
type Filter = "all" | "precon" | "own" | `bracket:${number}` | `pod:${string}`;

function matches(deck: Deck, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "precon") return !!deck.precon;
  if (f === "own") return !deck.precon;
  if (f.startsWith("bracket:")) return deckBracket(deck)?.value === Number(f.slice("bracket:".length));
  return !!deck.pods?.includes(f.slice("pod:".length));
}

export default function DecksPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  // A pod tag on a deck page links here as /decks?pod=Name
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("pod");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after hydration
    if (p) setFilter(`pod:${p}`);
  }, []);
  const allPods = [...new Set(decks.flatMap(d => d.pods ?? []))].sort((a, b) => a.localeCompare(b));
  const brackets = [...new Set(decks.map(d => deckBracket(d)?.value).filter((v): v is number => !!v))].sort((a, b) => a - b);
  const precons = decks.filter(d => d.precon).length;
  const shown = decks.filter(d => matches(d, filter));
  const pickPod = (p: string) => { setFilter(`pod:${p}`); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /** One filter chip; the active one gets the gel-pen circle. */
  const chip = (f: Filter, label: string, title?: string) => {
    const active = filter === f;
    const count = decks.filter(d => matches(d, f)).length;
    return (
      <button key={f} type="button" aria-pressed={active} title={title} onClick={() => setFilter(active && f !== "all" ? "all" : f)}
        className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${active
          ? "gel-circle bg-transparent border-transparent text-sakura-700 dark:text-sakura-300"
          : "bg-white dark:bg-paper-900 border-paper-200 dark:border-paper-700 text-paper-700 dark:text-paper-300 hover:bg-paper-50 dark:hover:bg-paper-800"}`}>
        {label} <span className={active ? "opacity-75" : "text-paper-500"}>{count}</span>
      </button>
    );
  };
  const rowLabel = "inline-flex items-center gap-1.5 text-sm font-semibold text-paper-600 dark:text-paper-400 w-full sm:w-24 shrink-0";

  useEffect(() => {
    const load = async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, "decks"));
        if (snap.empty) {
          // First admin visit: save the original hard-coded decks (refused for everyone else).
          if (isAdmin) {
            const batch = writeBatch(db);
            for (const { id, ...data } of DEFAULT_DECKS) batch.set(doc(db, "decks", id), data);
            await batch.commit();
          }
          setDecks(DEFAULT_DECKS);
        } else {
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Deck));
          loaded.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.name.localeCompare(b.name));
          setDecks(loaded);
        }
      } catch {
        // Database unavailable: keep the built-in decks on screen.
      }
    };
    load();
    // Re-run once auth restores so the admin seed isn't attempted anonymously.
  }, [user?.uid, isAdmin]);

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-brand font-bold text-paper-900 dark:text-paper-50"><span className="washi">Deck Hub</span></h1>
            <p className="text-paper-500 dark:text-paper-400 mt-1">Your constructed decks, with shareable QR codes.</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              New Deck
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mb-6" role="group" aria-label="Filter decks">
          <div className="flex flex-wrap items-center gap-2">
            <span className={rowLabel}><Layers className="w-4 h-4" aria-hidden /> Show:</span>
            {chip("all", "All decks")}
            {precons > 0 && chip("precon", "Precons")}
            {precons > 0 && precons < decks.length && chip("own", "Own builds")}
          </div>
          {brackets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={rowLabel}><Shield className="w-4 h-4" aria-hidden /> Brackets:</span>
              {brackets.map(n => chip(`bracket:${n}`, `Bracket ${n}`, BRACKETS[n]))}
            </div>
          )}
          {allPods.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={rowLabel}><Users className="w-4 h-4" aria-hidden /> Pods:</span>
              {allPods.map(p => chip(`pod:${p}`, p))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shown.map(deck => (
            <DeckCard key={deck.id} deck={deck} onPodSelect={pickPod} />
          ))}
        </div>
      </div>

      {isEditorOpen && (
        <DeckEditor
          allPods={allPods}
          onClose={() => setIsEditorOpen(false)}
          onSaved={saved => {
            setIsEditorOpen(false);
            setDecks(prev => [saved, ...prev.filter(d => d.id !== saved.id)]);
            router.push(`/decks/${saved.id}`);
          }}
        />
      )}
    </main>
  );
}
