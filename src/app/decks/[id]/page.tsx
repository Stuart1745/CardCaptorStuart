"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Share2 } from "lucide-react";

export default function DeckDetailsPage({ params }: { params: { id: string } }) {
  // Mock data for internal deck viewer
  const mockCards = [
    { name: "The Ur-Dragon", type: "Legendary Creature", image: "https://cards.scryfall.io/small/front/7/e/7e78b70b-0c67-4f14-8ad7-c9f8e3f59743.jpg?1562614382" },
    { name: "Sol Ring", type: "Artifact", image: "https://cards.scryfall.io/small/front/c/b/cbfa38af-6761-4601-8fcb-2b6241a41857.jpg?1674367355" },
    { name: "Arcane Signet", type: "Artifact", image: "https://cards.scryfall.io/small/front/9/d/9d44c8f5-3c1e-4ba0-afab-b9baee8293dd.jpg?1674367200" },
    { name: "Crux of Fate", type: "Sorcery", image: "https://cards.scryfall.io/small/front/1/2/12a5e4cb-d3ed-466e-bc35-01e403dcc5cc.jpg?1673814421" },
    { name: "Dragon Tempest", type: "Enchantment", image: "https://cards.scryfall.io/small/front/f/1/f1933d08-07fe-45ea-9b60-d9afb98d5753.jpg?1562855620" },
    { name: "Savage Ventmaw", type: "Creature", image: "https://cards.scryfall.io/small/front/4/7/471cd229-c80f-4dc2-a174-96984fc80a2f.jpg?1562909475" },
    { name: "Utvara Hellkite", type: "Creature", image: "https://cards.scryfall.io/small/front/3/3/33f6914d-808f-4502-a87a-70912d98d8fc.jpg?1562604627" },
    { name: "Scion of the Ur-Dragon", type: "Legendary Creature", image: "https://cards.scryfall.io/small/front/5/6/565b2a40-57b1-451f-8c2a-e02222502288.jpg?1562608891" }
  ];

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link href="/decks" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deck Hub
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg shrink-0">
              <img src={mockCards[0].image} className="w-full h-full object-cover" style={{ objectPosition: 'center 20%' }} alt="Commander" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Ur-Dragon Tribal</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Commander Format • 100 Cards</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => alert("Sharing decks is disabled in Offline Mode. Please configure Firebase.")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button 
              onClick={() => alert("Editing decks is disabled in Offline Mode. Please configure Firebase to enable database writes.")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Edit3 className="w-4 h-4" /> Edit List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {mockCards.map((card, idx) => (
            <div key={idx} className="relative group cursor-pointer">
              <img 
                src={card.image} 
                alt={card.name} 
                className="w-full rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300"
              />
            </div>
          ))}
          {/* Add more placeholders to simulate a full deck */}
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={`placeholder-${idx}`} className="relative group">
               <div className="w-full aspect-[2.5/3.5] bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center opacity-50">
                 <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
