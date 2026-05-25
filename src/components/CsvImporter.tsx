"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, Save } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { db } from '@/lib/firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';

export interface ParsedCard {
  Quantity: number;
  "Card Name": string;
  "Set Code": string;
  Foil: string;
  "Purchase Price": string;
  "Date Added": string;
  scryfallImage?: string;
  scryfallPrice?: string;
  scryfallType?: string;
}

export default function CsvImporter() {
  const [data, setData] = useState<ParsedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingScryfall, setIsFetchingScryfall] = useState(false);
  const [scryfallProgress, setScryfallProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user } = useAuth();

  const handleSaveToFirestore = async () => {
    if (!user || data.length === 0) return;
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Create a batch
      const batch = writeBatch(db);
      const userColRef = collection(db, 'users', user.uid, 'cards');

      data.forEach((card) => {
        // Use a new document ref for each card
        const cardRef = doc(userColRef);
        batch.set(cardRef, {
          ...card,
          addedAt: new Date().toISOString()
        });
      });

      // Commit the batch
      await batch.commit();
      setSaveSuccess(true);
    } catch (err) {
      console.error("Error saving to Firestore", err);
      setError("Failed to save collection to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const enrichWithScryfall = async (cards: ParsedCard[]) => {
    setIsFetchingScryfall(true);
    setScryfallProgress({ current: 0, total: cards.length });
    
    // Scryfall allows max 75 cards per request in /cards/collection
    const chunkSize = 75;
    const enrichedCards = [...cards];
    let processed = 0;

    for (let i = 0; i < cards.length; i += chunkSize) {
      const chunk = cards.slice(i, i + chunkSize);
      const identifiers = chunk.map(c => ({
        set: c["Set Code"].toLowerCase(),
        name: c["Card Name"]
      }));

      try {
        const res = await fetch("https://api.scryfall.com/cards/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiers })
        });
        
        if (res.ok) {
          const json = await res.json();
          const fetchedCards = json.data || [];
          
          fetchedCards.forEach((apiCard: {
            name: string;
            set: string;
            prices?: { usd?: string; usd_foil?: string; usd_etched?: string };
            image_uris?: { small?: string };
            card_faces?: { image_uris?: { small?: string } }[];
            type_line?: string;
          }) => {
            // Find the index in the original array matching this card
            // Scryfall might return different casing, so we compare loosely
            const matchIndex = enrichedCards.findIndex(c => 
              c["Card Name"].toLowerCase() === apiCard.name.toLowerCase() && 
              c["Set Code"].toLowerCase() === apiCard.set.toLowerCase()
            );

            if (matchIndex !== -1) {
              const c = enrichedCards[matchIndex];
              const isFoil = c.Foil && c.Foil.toLowerCase() === 'true';
              
              // Get price
              let price = null;
              if (isFoil) {
                price = apiCard.prices?.usd_foil || apiCard.prices?.usd_etched;
              }
              if (!price) {
                price = apiCard.prices?.usd || apiCard.prices?.usd_foil;
              }

              // Get image
              let image = apiCard.image_uris?.small;
              // Handle dual-faced cards where images are in card_faces
              if (!image && apiCard.card_faces?.length > 0) {
                image = apiCard.card_faces[0].image_uris?.small;
              }

              enrichedCards[matchIndex] = {
                ...c,
                scryfallPrice: price ? `$${price}` : 'N/A',
                scryfallImage: image,
                scryfallType: apiCard.type_line
              };
            }
          });
        }
      } catch (err) {
        console.error("Error fetching from Scryfall", err);
      }

      processed += chunk.length;
      setScryfallProgress({ current: processed, total: cards.length });
      
      // Delay 100ms between requests to respect Scryfall rate limits
      if (i + chunkSize < cards.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setData(enrichedCards);
    setIsFetchingScryfall(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV. Please ensure it matches the template.");
          console.error(results.errors);
          return;
        }
        const parsed = results.data as ParsedCard[];
        setData(parsed);
        setError(null);
        enrichWithScryfall(parsed);
      },
    });
  };

  return (
    <div className="w-full mx-auto p-4 md:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Upload Collection CSV</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">Drag and drop or click to browse</p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Parsed Collection ({data.length} cards)</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {isFetchingScryfall && (
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin"></div>
                  Fetching Scryfall Data... ({scryfallProgress.current} / {scryfallProgress.total})
                </div>
              )}
              
              {!isFetchingScryfall && user && data.length > 0 && (
                <button
                  onClick={handleSaveToFirestore}
                  disabled={isSaving || saveSuccess}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 rounded-lg transition-colors shadow-sm w-full sm:w-auto justify-center"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : saveSuccess ? "Saved Successfully!" : "Save to Collection"}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map((card, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow">
                <div className="shrink-0">
                  {card.scryfallImage ? (
                    <img src={card.scryfallImage} alt={card["Card Name"]} className="w-16 h-24 object-cover rounded-md shadow-sm" />
                  ) : (
                    <div className="w-16 h-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
                  )}
                </div>
                <div className="flex flex-col flex-1 justify-between min-w-0">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{card["Card Name"]}</h4>
                    {card.scryfallType && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.scryfallType}</p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3 text-sm">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Set</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">{card["Set Code"]}</span>
                      {card.Foil && card.Foil.toLowerCase() === 'true' && (
                        <span className="ml-1.5 text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded font-bold">FOIL</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Qty</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{card.Quantity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-none mb-0.5">Paid</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{card["Purchase Price"] || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-indigo-500 dark:text-indigo-400 block leading-none mb-0.5">TCGPlayer Market</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{card.scryfallPrice || '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
