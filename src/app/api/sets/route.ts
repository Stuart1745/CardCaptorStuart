import { NextResponse } from 'next/server';

// Draftable set list, straight from Scryfall, so new sets appear in the Add Box picker the
// day Scryfall lists them — no code change needed. Cached for a day.

const DRAFTABLE_TYPES = new Set(['expansion', 'core', 'masters', 'draft_innovation', 'funny']);
const UPCOMING_WINDOW_DAYS = 30;

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  digital: boolean;
  parent_set_code?: string;
  icon_svg_uri?: string;
}

export interface DraftSet {
  code: string;
  name: string;
  releasedAt: string;
  type: string;
  cardCount: number;
  iconUrl?: string;
  upcoming: boolean;
}

export async function GET() {
  try {
    const res = await fetch('https://api.scryfall.com/sets', {
      headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Scryfall returned ${res.status}` }, { status: 502 });
    }
    const { data } = await res.json() as { data: ScryfallSet[] };

    const today = new Date();
    const horizon = new Date(today.getTime() + UPCOMING_WINDOW_DAYS * 86400_000).toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    const sets: DraftSet[] = data
      .filter(s =>
        DRAFTABLE_TYPES.has(s.set_type) &&
        !s.digital &&
        !s.parent_set_code &&          // skip art series, alchemy, promos, commander decks
        s.card_count >= 60 &&          // skip tiny teaser/preview sets
        !!s.released_at &&
        s.released_at <= horizon)
      .map(s => ({
        code: s.code.toUpperCase(),
        name: s.name,
        releasedAt: s.released_at!,
        type: s.set_type,
        cardCount: s.card_count,
        iconUrl: s.icon_svg_uri,
        upcoming: s.released_at! > todayStr,
      }))
      .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));

    return NextResponse.json({ sets });
  } catch {
    return NextResponse.json({ error: 'Could not reach Scryfall' }, { status: 502 });
  }
}
