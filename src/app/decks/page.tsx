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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Deck Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Your constructed decks, with shareable QR codes.</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              New Deck
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {decks.map(deck => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      </div>

      {isEditorOpen && (
        <DeckEditor
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
