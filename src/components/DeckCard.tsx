"use client";

import React, { useState } from "react";
import Link from "next/link";
import { QrCode, ExternalLink, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type Deck, linkLabel, deckSize, deckBracket } from "@/lib/decks";
import { ManaIcon } from "@/components/ManaIcon";

export function DeckCard({ deck }: { deck: Deck }) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  // QR points at this app's deck page (it has the full list); falls back to the external link.
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/decks/${deck.id}` : (deck.link ?? "");
  const size = deckSize(deck.cards ?? []);
  const bracket = deckBracket(deck);

  return (
    <>
      <div className="flex flex-col bg-white dark:bg-paper-900 rounded-xl shadow-sm border border-paper-200 dark:border-paper-800 overflow-hidden hover:shadow-md transition-shadow">
        <Link href={`/decks/${deck.id}`} className="aspect-[16/9] w-full relative overflow-hidden bg-paper-200 dark:bg-paper-800 group block">
          <img
            src={deck.thumbnail}
            alt={deck.name}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
            style={{ objectPosition: 'center 25%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-paper-900/90 via-paper-900/20 to-transparent"></div>
          {bracket && (
            <span title={bracket.detail}
              className={`sticker absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md ${bracket.estimated
                ? "bg-paper-900/70 text-paper-100 border border-dashed border-paper-300/70"
                : "bg-butter text-amber-950"}`}>
              {bracket.label}{bracket.estimated ? " (est.)" : ""}
            </span>
          )}
          <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
            <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 pr-2 group-hover:text-sakura-200 transition-colors">{deck.name}</h3>
          </div>
        </Link>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="sticker text-xs font-semibold uppercase tracking-wider text-emerald-950 bg-mint px-2 py-1 rounded-md">
              {deck.format}{size > 0 ? ` · ${size}` : ""}
            </span>
            <div className="flex gap-1">
              {deck.colors.map(c => <ManaIcon key={c} symbol={c} size={18} />)}
            </div>
          </div>

          {deck.pods && deck.pods.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {deck.pods.map(p => (
                <span key={p} className="text-xs font-medium px-2 py-0.5 rounded-full bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-300 border border-paper-200 dark:border-paper-700">{p}</span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            {deck.link && (
              <a
                href={deck.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-paper-100 dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-paper-700 dark:text-paper-300 rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {linkLabel(deck.link)}
              </a>
            )}
            {(
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-sakura-50 dark:bg-sakura-900/30 hover:bg-sakura-100 dark:hover:bg-sakura-900/50 text-sakura-700 dark:text-sakura-400 rounded-lg text-sm font-medium transition-colors border border-sakura-100 dark:border-sakura-800/50"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </button>
            )}
          </div>
        </div>
      </div>

      {isQrModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-paper-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-paper-100 dark:border-paper-800">
              <h3 className="font-bold text-paper-900 dark:text-paper-100">Scan to View Deck</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-md text-paper-500 dark:text-paper-400 hover:text-paper-600 dark:hover:text-paper-300 hover:bg-paper-100 dark:hover:bg-paper-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center justify-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-paper-200">
                <QRCodeSVG
                  value={shareUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="mt-6 text-center text-sm text-paper-500 dark:text-paper-400">
                Share this QR code with your playgroup so they can pull up the decklist.
              </p>
            </div>

            <div className="bg-paper-50 dark:bg-paper-800/50 px-6 py-4 border-t border-paper-100 dark:border-paper-800">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent rounded-lg font-medium transition-colors"
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
