"use client";

import { DeckCard } from "@/components/DeckCard";
import { Plus } from "lucide-react";

// TODO: Replace moxfieldUrl placeholders with actual Moxfield precon deck links once you open them in a browser.
const DECKS = [
  {
    id: "fin-ffvi",
    name: "FF VI: Echoes of the Past",
    format: "Commander",
    thumbnail: "https://cards.scryfall.io/art_crop/front/3/0/30584c53-533b-4dc7-b07c-8600164a99b3.jpg?1752052917",
    moxfieldUrl: "https://edhrec.com/route/?cc=Celes%2C+Rune+Knight",
    colors: ["W", "B", "R"]
  },
  {
    id: "fin-ffvii",
    name: "FF VII: SOLDIER of the Planet",
    format: "Commander",
    thumbnail: "https://cards.scryfall.io/art_crop/front/0/7/07b4e4f8-6a31-4533-be51-668ce3ddc84f.jpg?1752052926",
    moxfieldUrl: "https://edhrec.com/route/?cc=Cloud%2C+Ex-SOLDIER",
    colors: ["G", "R", "W"]
  },
  {
    id: "fin-ffxiv",
    name: "FF XIV: Warriors of Darkness",
    format: "Commander",
    thumbnail: "https://cards.scryfall.io/art_crop/front/f/9/f90eb8ef-ad70-4d6c-9958-e6153f8599bc.jpg?1752052927",
    moxfieldUrl: "https://edhrec.com/route/?cc=G%27raha+Tia%2C+Scion+Reborn",
    colors: ["W", "U", "B"]
  },
  {
    id: "fin-ffx",
    name: "FF X: Champions of Spira",
    format: "Commander",
    thumbnail: "https://cards.scryfall.io/art_crop/front/2/c/2cfd4494-346c-4cbc-8072-e267254cefcc.jpg?1752052930",
    moxfieldUrl: "https://edhrec.com/route/?cc=Tidus%2C+Yuna%27s+Guardian",
    colors: ["G", "U", "W"]
  },
  {
    id: "eoc-worldshaper",
    name: "World Shaper",
    format: "Commander",
    thumbnail: "https://cards.scryfall.io/art_crop/front/6/b/6b913e79-a9f6-44d4-bb37-c4f6f66b8151.jpg?1754673442",
    moxfieldUrl: "https://edhrec.com/route/?cc=Hearthhull%2C+the+Worldseed",
    colors: ["B", "G", "R"]
  }
];

export default function DecksPage() {
  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Deck Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your constructed decks and generate QR codes.</p>
          </div>
          <button
            type="button"
            onClick={() => alert("Creating a new deck is disabled in Offline Mode. Please configure Firebase to enable database writes.")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            New Deck
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DECKS.map(deck => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      </div>
    </main>
  );
}
