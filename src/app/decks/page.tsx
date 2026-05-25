"use client";

import React from "react";
import { DeckCard } from "@/components/DeckCard";
import { Plus } from "lucide-react";

export default function DecksPage() {
  // Placeholder data since Firebase is not connected yet
  const dummyDecks = [
    {
      id: "1",
      name: "Ur-Dragon Tribal",
      format: "Commander",
      thumbnail: "https://cards.scryfall.io/small/front/7/e/7e78b70b-0c67-4f14-8ad7-c9f8e3f59743.jpg?1562614382",
      moxfieldUrl: "https://moxfield.com/decks/public?q=Ur-Dragon",
      colors: ["W", "U", "B", "R", "G"]
    },
    {
      id: "2",
      name: "Edgar Markov Vampires",
      format: "Commander",
      thumbnail: "https://cards.scryfall.io/small/front/8/d/8d94b8ec-ecda-43c8-a60e-1ba33e6a54a4.jpg?1562616128",
      moxfieldUrl: "https://moxfield.com/decks/public?q=Edgar+Markov",
      colors: ["W", "B", "R"]
    },
    {
      id: "3",
      name: "Modern Murktide",
      format: "Modern",
      thumbnail: "https://cards.scryfall.io/small/front/2/0/20c4a446-fa42-4f6c-8ed1-9544ea45acb1.jpg?1626094254",
      moxfieldUrl: "https://moxfield.com/decks/public?q=Murktide+Regent",
      colors: ["U", "R"]
    }
  ];

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Deck Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your constructed decks and generate QR codes.</p>
          </div>
          <button 
            onClick={() => alert("Creating a new deck is disabled in Offline Mode. Please configure Firebase to enable database writes.")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            New Deck
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dummyDecks.map(deck => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      </div>
    </main>
  );
}
