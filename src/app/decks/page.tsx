"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { Plus } from "lucide-react";
import { DeckCard } from "@/components/DeckCard";
import { DeckEditor } from "@/components/DeckEditor";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { isAdminUser } from "@/lib/admin";
import { DEFAULT_DECKS, type Deck } from "@/lib/decks";

export default function DecksPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pod, setPod] = useState<string | null>(null);
  const allPods = [...new Set(decks.flatMap(d => d.pods ?? []))].sort((a, b) => a.localeCompare(b));
  const shown = pod ? decks.filter(d => d.pods?.includes(pod)) : decks;

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

        {allPods.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Filter by pod">
            <span className="text-sm font-semibold text-paper-600 dark:text-paper-400 mr-1">Pods:</span>
            {[null, ...allPods].map(p => {
              const active = pod === p;
              const count = p ? decks.filter(d => d.pods?.includes(p)).length : decks.length;
              return (
                <button key={p ?? "__all"} type="button" aria-pressed={active} onClick={() => setPod(p)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${active
                    ? "gel-circle bg-transparent border-transparent text-sakura-700 dark:text-sakura-300"
                    : "bg-white dark:bg-paper-900 border-paper-200 dark:border-paper-700 text-paper-700 dark:text-paper-300 hover:bg-paper-50 dark:hover:bg-paper-800"}`}>
                  {p ?? "All decks"} <span className={active ? "opacity-75" : "text-paper-500"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shown.map(deck => (
            <DeckCard key={deck.id} deck={deck} />
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
