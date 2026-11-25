import { NextResponse } from 'next/server';
import type { BracketEstimate } from '@/lib/decks';

// Estimate a Commander deck's bracket with Commander Spellbook's open estimator
// (https://commanderspellbook.com), which flags Game Changers, mass land denial, extra turns
// and known combos against Wizards' bracket criteria. Called server-side because Spellbook's
// API does not allow browser calls from other sites.

const UA = 'CardcaptorStuart/1.0 (+https://ccs.stuartrampy.me)';
const TAGS = new Set(['E', 'C', 'O', 'P', 'S', 'R', 'B']);

interface SpellbookCard { card: { name: string }; gameChanger?: boolean; massLandDenial?: boolean; extraTurn?: boolean; banned?: boolean }
interface SpellbookCombo {
  combo: { id?: string; uses?: { card: { name: string } }[] };
  relevant?: boolean;
  definitelyTwoCard?: boolean;
  arguablyTwoCard?: boolean;
}
interface SpellbookResult { bracketTag: string; cards?: SpellbookCard[]; combos?: SpellbookCombo[] }

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  let body: { commanders?: unknown; main?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Send JSON: { commanders: [{ card, quantity }], main: [{ card, quantity }] }.');
  }
  const clean = (list: unknown) => (Array.isArray(list) ? list : [])
    .filter((c): c is { card: string; quantity?: number } => !!c && typeof c.card === 'string' && c.card.length <= 256)
    .map(c => ({ card: c.card, quantity: Math.max(1, Math.min(99, Number(c.quantity) || 1)) }));
  const commanders = clean(body.commanders).slice(0, 12);
  const main = clean(body.main).slice(0, 600);
  if (!commanders.length && !main.length) return fail(400, 'The deck has no cards.');

  let r: SpellbookResult;
  try {
    const res = await fetch('https://backend.commanderspellbook.com/estimate-bracket', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ commanders, main }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return fail(502, `Commander Spellbook returned an error (HTTP ${res.status}).`);
    r = await res.json() as SpellbookResult;
  } catch {
    return fail(502, 'Couldn’t reach Commander Spellbook.');
  }
  if (!TAGS.has(r.bracketTag)) return fail(502, 'Commander Spellbook sent an unexpected answer.');

  const cards = r.cards ?? [];
  const names = (pick: (c: SpellbookCard) => boolean | undefined) => cards.filter(pick).map(c => c.card.name);
  const estimate: BracketEstimate = {
    tag: r.bracketTag as BracketEstimate['tag'],
    gameChangers: names(c => c.gameChanger),
    massLandDenial: names(c => c.massLandDenial),
    extraTurns: names(c => c.extraTurn),
    banned: names(c => c.banned),
    combos: (r.combos ?? [])
      .filter(v => v.relevant)
      .map(v => ({
        cards: (v.combo.uses ?? []).map(u => u.card.name),
        twoCard: !!(v.definitelyTwoCard || v.arguablyTwoCard),
        ...(v.combo.id ? { id: String(v.combo.id) } : {}),
      }))
      .filter(c => c.cards.length > 0)
      .slice(0, 12),
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(estimate);
}
