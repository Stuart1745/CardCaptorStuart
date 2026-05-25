"use client";

import React, { useState } from "react";
import Link from "next/link";
import { QrCode, ExternalLink, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Deck {
  id: string;
  name: string;
  format: string;
  thumbnail: string;
  moxfieldUrl: string;
  colors: string[];
}

export function DeckCard({ deck }: { deck: Deck }) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
        <Link href={`/decks/${deck.id}`} className="h-32 w-full relative overflow-hidden bg-slate-200 dark:bg-slate-800 group block">
          <img 
            src={deck.thumbnail} 
            alt={deck.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
            style={{ objectPosition: 'center 20%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
          <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
            <h3 className="font-bold text-white text-lg leading-tight truncate pr-2 group-hover:text-indigo-300 transition-colors">{deck.name}</h3>
          </div>
        </Link>
        
        <div className="p-4 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              {deck.format}
            </span>
            <div className="flex gap-1">
              {deck.colors.map(c => (
                <div key={c} className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[8px] font-bold shadow-sm" style={{
                  backgroundColor: 
                    c === 'W' ? '#f8f6d8' : 
                    c === 'U' ? '#c1d7e9' : 
                    c === 'B' ? '#bab1ab' : 
                    c === 'R' ? '#e49977' : 
                    c === 'G' ? '#a3c095' : '#ccc',
                  color: c === 'W' ? '#333' : '#111'
                }}>
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-auto">
            <a 
              href={deck.moxfieldUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Moxfield
            </a>
            {deck.format.toLowerCase() === 'commander' && (
              <button 
                onClick={() => setIsQrModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium transition-colors border border-indigo-100 dark:border-indigo-800/50"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </button>
            )}
          </div>
        </div>
      </div>

      {isQrModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Scan to View Deck</h3>
              <button 
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <QRCodeSVG 
                  value={deck.moxfieldUrl} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Share this QR code with your playgroup so they can easily pull up the decklist on Moxfield.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setIsQrModalOpen(false)}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
