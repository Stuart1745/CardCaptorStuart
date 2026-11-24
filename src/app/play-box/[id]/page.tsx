"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { isAdminUser } from "@/lib/admin";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ManaIcon } from "@/components/ManaIcon";
import { Sparkle } from "@/components/Sparkle";
import { ArrowLeft, Package, Loader2, AlertCircle, BookOpen, Map as MapIcon, Star, Zap, Share2, Check, Settings, X, Image as ImageIcon } from "lucide-react";

const COLOR_NAME_TO_SYMBOL: Record<string, string> = { White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G' };


/** Scryfall's image ratio (488x680), so card frames never crop or squash the image. */
const CARD_ASPECT = "aspect-[488/680]";
const CARD_RADIUS = "rounded-[4.5%/3.2%]";

const rarityBadge = (rarity?: string) => {
  const r = (rarity || '').toLowerCase();
  const base = "absolute bottom-1 left-1 text-xs leading-none font-bold px-1 py-0.5 rounded shadow-sm";
  if (r === 'mythic') return <span className={`${base} bg-orange-500 text-paper-950`}>M</span>;
  if (r === 'rare') return <span className={`${base} bg-amber-400 text-paper-900`}>R</span>;
  if (r === 'uncommon') return <span className={`${base} bg-paper-300 text-paper-900`}>U</span>;
  return <span className={`${base} bg-paper-600 text-white`}>C</span>;
};

/**
 * A hover/tap preview rendered with position: fixed, so no panel or grid can clip it. It is
 * measured after render and placed above the anchor if it fits under the sticky nav, else
 * below, else pinned under the nav; horizontally it is clamped inside the viewport.
 */
function FloatingPreview({ anchor, maxWidth, interactive, children }: {
  anchor: DOMRect;
  maxWidth: number;
  interactive: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = 8;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const navBottom = Math.max(0, document.querySelector('nav')?.getBoundingClientRect().bottom ?? 0) + m;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(m, anchor.left + anchor.width / 2 - w / 2), vw - w - m);
    const top = anchor.top - h - m >= navBottom ? anchor.top - h - m
      : anchor.bottom + m + h <= vh - m ? anchor.bottom + m
      : Math.max(navBottom, vh - h - m);
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.visibility = 'visible';
  }, [anchor]);
  return (
    <div ref={ref} role="tooltip" data-floating-preview
      style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden', width: `min(${maxWidth}px, calc(100vw - 16px))` }}
      className={`z-[150] ${interactive ? '' : 'pointer-events-none'}`}>
      {children}
    </div>
  );
}

interface PlayBox {
  id: string;
  name: string;
  setCode: string;
  cost: number;
  packsOpen: number;
  totalPacks: number;
  inventory: ScryfallCard[];
  customArchetypes?: { name: string; colors: string[]; desc: string; tier?: string }[];
}

interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  oracle_text?: string;
  image_uris?: {
    normal: string;
    art_crop?: string;
  };
  card_faces?: {
    mana_cost?: string;
    oracle_text?: string;
    colors?: string[];
    image_uris?: {
      normal: string;
      art_crop?: string;
    }
  }[];
  colors: string[];
  type_line: string;
  rarity: string;
  keywords?: string[];
}

const EVERGREEN_KEYWORDS = new Set([
  'Flying', 'Trample', 'Deathtouch', 'Defender', 'Double strike', 'Double', 'Enchant', 'Equip',
  'First strike', 'Flash', 'Haste', 'Hexproof', 'Indestructible', 'Lifelink',
  'Menace', 'Reach', 'Vigilance', 'Ward', 'Scry', 'Mill', 'Fight', 'Prowess', 'Cycling', 'Treasure', 'Surveil',
  'Islandwalk', 'Forestwalk', 'Mountainwalk', 'Swampwalk', 'Plainswalk', 'Landwalk', 'Nonbasic landwalk', 'Food',
  'Kicker', 'Convoke', 'Delve', 'Escape', 'Foretell', 'Learn', 'Cleave', 'Compleated',
  'Protection', 'Phasing', 'Banding', 'Rampage', 'Cumulative upkeep', 'Echo', 'Buyback',
  'Flashback', 'Madness', 'Morph', 'Megamorph', 'Forecast', 'Ripple', 'Suspend',
  'Vanishing', 'Absorb', 'Fading', 'Modular', 'Bloodthirst', 'Haunt', 'Replicate', 'Forecast',
  'Poisonous', 'Transfigure', 'Champion', 'Ninjutsu', 'Epic', 'Gravestorm', 'Hideaway',
  'Evoke', 'Reinforce', 'Conspire', 'Persist', 'Wither', 'Retrace', 'Devour', 'Exalted',
  'Unearth', 'Cascade', 'Rebound', 'Totem armor', 'Infect', 'Battle cry', 'Living weapon',
  'Undying', 'Miracle', 'Soulbond', 'Overload', 'Scavenge', 'Unleash', 'Cipher',
  'Evolve', 'Extort', 'Fuse', 'Bestow', 'Tribute', 'Dethrone', 'Hidden agenda',
  'Outlast', 'Prowess', 'Dash', 'Exploit', 'Menace', 'Renown', 'Awaken', 'Devoid',
  'Ingest', 'Myriad', 'Surge', 'Skulk', 'Emerge', 'Escalate', 'Meld', 'Improvise',
  'Aftermath', 'Embalm', 'Eternalize', 'Afflict', 'Ascend', 'Assist', 'Jump-start',
  'Mentor', 'Afterlife', 'Spectacle', 'Escape', 'Companion', 'Mutate', 'Encore',
  'Boast', 'Foretell', 'Disturb', 'Decayed', 'Cleave', 'Training', 'Compleated',
  'Reconfigure', 'Blitz', 'Casualty', 'Enlist', 'Read ahead', 'Ravenous', 'Squad',
  'Prototype', 'Unearth', 'Toxic', 'Backup', 'Bargain', 'Celebrate', 'Disguise',
  'Endure', 'Gift', 'Plot', 'Saddle', 'Spree', 'Expend', 'Offspring', 'Impending',
]);

interface CardStat {
  name: string;
  /** Games-in-hand win rate, 0..1 */
  winRate: number;
  gihGames: number;
  iwd?: number | null;
  ata?: number;
}

interface PackSlot {
  sheet: string;
  label: string;
  /** Expected cards from this sheet per pack */
  perPack: number;
  /** Chance a pack has at least one */
  chance: number;
  cards: number;
  foil: boolean;
  sheets?: number;
}

interface PackContents {
  booster: string;
  cardsPerPack: number;
  mythicsPerPack: number;
  source: { name: string; url: string };
  slots: PackSlot[];
}

const formatCount = (n: number) => (Math.round(n * 10) / 10).toString();
const formatOdds = (chance: number) =>
  chance >= 0.995 ? 'every pack'
    : chance >= 0.5 ? `${Math.round(chance * 100)}% of packs`
    : `1 in ${Math.round(1 / chance)} packs`;

interface StatsSource {
  name: string;
  url: string;
  license: string;
  games: number;
  updated: string;
}

const DEFAULT_BOX_INFO: Record<string, { name: string; setCode: string; remaining: number; total: number }> = {
  "2": { name: "Avatar", setCode: "TLA", remaining: 30, total: 30 },
  "3": { name: "Tarkir Dragonstorm", setCode: "TDM", remaining: 30, total: 30 },
  "4": { name: "Lorwyn Eclipsed", setCode: "ECL", remaining: 36, total: 36 },
  "5": { name: "Unfinity", setCode: "UNF", remaining: 36, total: 36 },
  "6": { name: "Final Fantasy", setCode: "FIN", remaining: 30, total: 30 },
};

const BONUS_SHEETS: Record<string, string[]> = {
  "STX": ["STA"],
  "BRO": ["BRR"],
  "MOM": ["MUL"],
  "WOE": ["WOT"],
  "MKM": ["SPG"],
  "LCI": ["SPG"],
  "OTJ": ["OTP", "BIG", "SPG"],
  "BLB": ["SPG"],
  "DSK": ["SPG"],
  "FDN": ["SPG"],
  "FIN": ["FCA"],
  // From each set's Wizards "Collecting" article (2026). HOB lists no bonus sheet.
  "SOS": ["SOA", "SPG"],
  "MSH": ["MAR"],
  "FRA": ["SPG"],
  "TRK": ["SDS"]
};

// Deterministic mock generator for Draftsim ratings since there is no public API
const getCardQualityTier = (topCards: { signposts: ScryfallCard[], rares: ScryfallCard[], removal: ScryfallCard[], evasion: ScryfallCard[], draw: ScryfallCard[], commons: ScryfallCard[] }) => {
  const r = (c: ScryfallCard) => (c.rarity || '').toLowerCase();
  let score = 0;
  score += topCards.rares.filter(c => r(c) === 'mythic').length * 3;
  score += topCards.rares.filter(c => r(c) === 'rare').length * 2;
  score += topCards.signposts.length * 1;
  score += topCards.removal.length * 0.5;
  score += topCards.evasion.length * 0.5;
  if (score >= 7) return 'S';
  if (score >= 5) return 'A';
  if (score >= 3) return 'B';
  if (score >= 1) return 'C';
  return 'D';
};

const SET_ARCHETYPES: Record<string, {name: string, colors: string[], desc: string}[]> = {
  "TLA": [
    { name: "Air Nomads — Flying Finishers", colors: ["White", "Blue"], desc: "Build an air force of flying creatures, pump them for finishing blows, and soar over the opposition. Investigate for card advantage while pressing the skies." },
    { name: "Water Tribe — Draw Two", colors: ["Blue", "Black"], desc: "Generate Clue tokens, trigger Waterbend abilities, and draw two cards at a time for overwhelming card advantage." },
    { name: "Fire Nation — Aggro Tokens", colors: ["Black", "Red"], desc: "Flood the board with creature tokens and convert them into direct damage. The most aggressive archetype in the format." },
    { name: "Earth Rumble — Ramp", colors: ["Red", "Green"], desc: "Use Earthbending to animate lands into creatures and ramp into oversized threats ahead of schedule." },
    { name: "Southern Raiders — Allies", colors: ["Green", "White"], desc: "Ally tribal rewards every new creature with ETB bonuses. Go wide and snowball Ally synergies across the team." },
    { name: "Dai Li — Sacrifice", colors: ["White", "Black"], desc: "Set up death triggers, manufacture sacrifice fodder, and grind out recursive value. Every creature death fuels another threat." },
    { name: "Combat Lessons", colors: ["Blue", "Red"], desc: "Aggressive combat combined with Lesson spells that reward both attacking and graveyard interaction for a hybrid tempo-value strategy." },
    { name: "Earthbending Counters", colors: ["Black", "Green"], desc: "Earthbend counters onto creatures to arm them with +1/+1 and power through combat. Finishers grow enormous via counter accumulation." },
    { name: "Nations United — Go Wide", colors: ["Red", "White"], desc: "Combine Ally token generation with red aggro spells. Deploy a wide board, trigger Ally synergies, and push through with combat tricks." },
    { name: "Avatar Ramp — Lessons", colors: ["Green", "Blue"], desc: "Search out lands, build mana, and set up unblockable payoffs. Lessons in the graveyard provide repeated value into large late-game spells." },
  ],
  "FIN": [
    { name: "W/U Artifacts", colors: ["White", "Blue"], desc: "Assemble a board of artifacts — artifact creatures, Equipment, and Treasure tokens. Key cards like Tidus and Cid reward artifact density." },
    { name: "U/B Control", colors: ["Blue", "Black"], desc: "Accrue graveyard value while playing defensively. Discard outlets fuel reanimation and powerful value effects." },
    { name: "B/R Aggro Spells", colors: ["Black", "Red"], desc: "Cast noncreature spells for direct damage. Wizard tokens and spell payoffs convert casts into a win condition." },
    { name: "R/G Landfall Aggro", colors: ["Red", "Green"], desc: "Transform land drops into combat advantage. Creatures that reward landfall apply consistent pressure each turn." },
    { name: "G/W Go Wide", colors: ["Green", "White"], desc: "Flood the board with creature tokens and attack for lethal. Saga-focused variants use Garnet as an additional engine." },
    { name: "W/B Sacrifice", colors: ["White", "Black"], desc: "Turn permanents into resources through sacrifice synergies. Token generation on attacks fuels sacrifice payoffs." },
    { name: "U/R Big Noncreatures", colors: ["Blue", "Red"], desc: "Cast massive spells for massive value. High-mana spells and flashback rewards synergize with tiered spell payoffs." },
    { name: "B/G Graveyard Value", colors: ["Black", "Green"], desc: "Stock the graveyard with permanents to supercharge spells and flip threats. Removal that goes on offense closes games." },
    { name: "R/W Equipment Aggro", colors: ["Red", "White"], desc: "Suit up creatures with powerful Equipment to dominate combat. Job Select mechanic adds flexible modes." },
    { name: "G/U Town Ramp", colors: ["Green", "Blue"], desc: "Play Towns for extra land value and squeeze into enormous late-game threats after building mana." },
  ],
  "NEO": [
    { name: "Vehicles / Pilots", colors: ["White", "Blue"], desc: "Crew powerful vehicles using cheap pilot creatures to push massive damage." },
    { name: "Ninjutsu / Rogue", colors: ["Blue", "Black"], desc: "Sneak unblockable creatures through and swap them with Ninjas for powerful combat damage triggers." },
    { name: "Artifact Sacrifice", colors: ["Black", "Red"], desc: "Generate cheap artifact tokens and sacrifice them to fuel powerful engines." },
    { name: "Modified / Aggro", colors: ["Red", "Green"], desc: "Equip, enchant, or put counters on your creatures to make them huge and trigger 'modified' synergies." },
    { name: "Enchantments", colors: ["Green", "White"], desc: "Build an army of enchantment creatures and stack auras to overwhelm the board." },
    { name: "Artifacts & Enchantments", colors: ["White", "Black"], desc: "Balance artifacts and enchantments to trigger synergistic value engines." },
    { name: "Artifacts / Mecha", colors: ["Blue", "Red"], desc: "Synergize cheap artifacts with powerful spells to build massive mechanical threats." },
    { name: "Ninjas / Evasion", colors: ["Black", "Green"], desc: "Grind out the long game with recursion and value-generating Ninjas." },
    { name: "Samurai / Warriors", colors: ["Red", "White"], desc: "Attack with a single, heavily buffed Samurai to trigger powerful 'attacks alone' abilities." },
    { name: "Channel / Ramp", colors: ["Green", "Blue"], desc: "Discard large creatures for their channel abilities early, then cast them late game." }
  ],
  "TDM": [
    { name: "Abzan Strategy", colors: ["White", "Black", "Green"], desc: "Review the 3-color signpost cards to determine the strategy for this Wedge." },
    { name: "Jeskai Strategy", colors: ["Blue", "Red", "White"], desc: "Review the 3-color signpost cards to determine the strategy for this Wedge." },
    { name: "Sultai Strategy", colors: ["Black", "Green", "Blue"], desc: "Review the 3-color signpost cards to determine the strategy for this Wedge." },
    { name: "Mardu Strategy", colors: ["Red", "White", "Black"], desc: "Review the 3-color signpost cards to determine the strategy for this Wedge." },
    { name: "Temur Strategy", colors: ["Green", "Blue", "Red"], desc: "Review the 3-color signpost cards to determine the strategy for this Wedge." }
  ],
  "KTK": [
    { name: "Abzan / Outlast", colors: ["White", "Black", "Green"], desc: "Grind out the long game with +1/+1 counters and resilient creatures." },
    { name: "Jeskai / Prowess", colors: ["Blue", "Red", "White"], desc: "Chain non-creature spells to buff your team and push through damage." },
    { name: "Sultai / Delve", colors: ["Black", "Green", "Blue"], desc: "Fill your graveyard to cast massive threats ahead of schedule." },
    { name: "Mardu / Raid", colors: ["Red", "White", "Black"], desc: "Aggressively attack to trigger powerful Raid bonuses." },
    { name: "Temur / Ferocious", colors: ["Green", "Blue", "Red"], desc: "Deploy huge 4-power creatures to unlock powerful Ferocious abilities." }
  ],
  "MH2": [
    { name: "Artifacts / Affinity", colors: ["White", "Blue"], desc: "Utilize artifact synergies, token generation, and affinity payoffs." },
    { name: "Reanimator", colors: ["White", "Black"], desc: "Discard large creatures and return them to the battlefield." },
    { name: "Surveil / Self-Discard", colors: ["Blue", "Black"], desc: "Manage the graveyard and utilize self-discard effects." },
    { name: "Delirium", colors: ["Blue", "Red"], desc: "Achieve delirium for various spell payoffs." },
    { name: "Madness", colors: ["Black", "Red"], desc: "Aggressively utilize madness cards and discard outlets." },
    { name: "Squirrels / Sacrifice", colors: ["Black", "Green"], desc: "Generate Squirrel tokens and leverage sacrifice value." },
    { name: "Storm", colors: ["Red", "Green"], desc: "Use cheap spells and madness to enable storm turns." },
    { name: "+1/+1 Counters", colors: ["Green", "White"], desc: "Focus on modular and other +1/+1 counter synergies." },
    { name: "Tokens / Value", colors: ["Green", "Blue"], desc: "Generate various token types and play for midrange value." },
    { name: "Modular / Artifact Aggro", colors: ["Red", "White"], desc: "An aggressive deck utilizing modular creatures and artifact synergies." }
  ],
  "UNF": [
    { name: "Name Stickers", colors: ["White", "Blue"], desc: "Add words to card names to trigger bonuses." },
    { name: "Precision Die-Rolling", colors: ["Blue", "Black"], desc: "Use dice rolling for controlling effects and value." },
    { name: "High-Roll Build-Up", colors: ["Black", "Red"], desc: "Succeed on high dice rolls to generate powerful effects." },
    { name: "Art Stickers", colors: ["Blue", "Red"], desc: "Use art stickers and spell-casting synergies." },
    { name: "Hats Matter", colors: ["White", "Black"], desc: "Aggressive archetype rewarding creatures with hats." },
    { name: "Attractions", colors: ["Black", "Green"], desc: "Generate value by opening and visiting Attractions." },
    { name: "Clown Robot Aggro", colors: ["Red", "White"], desc: "Aggressive tribal strategy focused on Clown creatures." },
    { name: "Power/Toughness Stickers", colors: ["Green", "Blue"], desc: "Stompy deck using P/T stickers to grow creatures." },
    { name: "Mass Die-Rolling", colors: ["Red", "Green"], desc: "Roll many dice to overwhelm the opponent." },
    { name: "Ability Stickers", colors: ["Green", "White"], desc: "Put ability stickers on creatures to go tall." }
  ],
  "ECL": [
    { name: "Merfolk Tempo", colors: ["White", "Blue"], desc: "Tempo-oriented deck that utilizes the Convoke mechanic." },
    { name: "Kithkin Aggro", colors: ["Green", "White"], desc: "Go-wide aggressive deck focusing on battlefield presence." },
    { name: "Goblins / Sacrifice", colors: ["Black", "Red"], desc: "Aggressive deck centered on Blight and sacrifice synergies." },
    { name: "Elves / Graveyard", colors: ["Black", "Green"], desc: "Graveyard-synergy midrange deck." },
    { name: "Elementals", colors: ["Blue", "Red"], desc: "Setup-and-payoff deck for casting spells with MV 4 or greater." },
    { name: "Faerie Flash", colors: ["Blue", "Black"], desc: "Tempo/control deck that rewards playing at instant speed." },
    { name: "Orzhov Attrition", colors: ["White", "Black"], desc: "Midrange deck using Blight to weaken opposing creatures." },
    { name: "Boros Aggro", colors: ["Red", "White"], desc: "Aggressive archetype utilizing -1/-1 counters." },
    { name: "Vivid Ramp", colors: ["Green", "Blue"], desc: "Focuses on the Vivid mechanic for fixing and scaling." },
    { name: "Vivid Midrange", colors: ["Red", "Green"], desc: "Leverages the Vivid mechanic and midrange threats." }
  ],
  "DEFAULT": [
    { name: "White / Blue Strategy", colors: ["White", "Blue"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Blue / Black Strategy", colors: ["Blue", "Black"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Black / Red Strategy", colors: ["Black", "Red"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Red / Green Strategy", colors: ["Red", "Green"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Green / White Strategy", colors: ["Green", "White"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "White / Black Strategy", colors: ["White", "Black"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Blue / Red Strategy", colors: ["Blue", "Red"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Black / Green Strategy", colors: ["Black", "Green"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Red / White Strategy", colors: ["Red", "White"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." },
    { name: "Green / Blue Strategy", colors: ["Green", "Blue"], desc: "Review the signpost cards and bomb rares to determine the strategy for this color pair in this set." }
  ]
};

export default function PlayboxDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [boxInfo, setBoxInfo] = useState<{ name: string, setCode: string, remaining: number, total: number, imageUrl?: string }>({ name: "Loading...", setCode: "NEO", remaining: 0, total: 0 });
  const [box, setBox] = useState<PlayBox | null>(null);
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingArchetypes, setIsFetchingArchetypes] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');
  const [mechanics, setMechanics] = useState<{ name: string, desc: string, colors: string[], examples: ScryfallCard[] }[]>([]);
  const [guideMechanics, setGuideMechanics] = useState<{ name: string; desc: string; colors: string[] }[]>([]);
  const [cardRatingMap, setCardRatingMap] = useState<Map<string, number>>(new Map());
  // Per-card 17Lands public-dataset stats for tooltips, plus the source to credit (CC BY 4.0)
  const [cardStatsMap, setCardStatsMap] = useState<Map<string, CardStat>>(new Map());
  const [statsSource, setStatsSource] = useState<StatsSource | null>(null);
  const [packContents, setPackContents] = useState<PackContents | null>(null);

  const applyRatings = (data: { cardRatings?: CardStat[]; statsSource?: StatsSource | null; packContents?: PackContents | null }) => {
    setStatsSource(data.statsSource ?? null);
    setPackContents(data.packContents ?? null);
    if (!data.cardRatings?.length) return;
    const rmap = new Map<string, number>();
    const smap = new Map<string, CardStat>();
    for (const r of data.cardRatings) {
      if (!r.name) continue;
      rmap.set(r.name, r.winRate ?? 0);
      smap.set(r.name, r);
    }
    setCardRatingMap(rmap);
    setCardStatsMap(smap);
  };
  /** Best three cards for a mechanic: highest 17Lands GIH win rate, else highest rarity. */
  const RARITY_RANK: Record<string, number> = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
  const bestExamples = (cards: ScryfallCard[]) =>
    [...cards]
      .sort((a, b) =>
        (cardRatingMap.get(b.name) ?? -1) - (cardRatingMap.get(a.name) ?? -1) ||
        (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0))
      .slice(0, 3);
  const [error, setError] = useState<string | null>(null);
  const [isSharedMode, setIsSharedMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  // Last pack change, kept briefly so a mis-tap can be undone
  const [packToast, setPackToast] = useState<{ text: string; undo?: number; error?: boolean } | null>(null);
  const [isSavingPack, setIsSavingPack] = useState(false);

  /** Change the packs-remaining count by `delta` (-1 opens a pack, +1 undoes) and save it. */
  const changePacks = async (delta: number) => {
    if (!db || !box || isSavingPack) return;
    const before = boxInfo.remaining;
    const after = Math.min(Math.max(before + delta, 0), boxInfo.total || before);
    if (after === before) return;
    setIsSavingPack(true);
    // Keep `box` in step too: the Edit modal saves the whole box object back.
    const setRemaining = (n: number) => {
      setBoxInfo(prev => ({ ...prev, remaining: n }));
      setBox(prev => (prev ? ({ ...prev, remaining: n } as PlayBox) : prev));
    };
    setRemaining(after);
    try {
      await updateDoc(doc(db, 'playBoxes', box.id), { remaining: after });
      setPackToast(delta < 0
        ? { text: `Opened a pack · ${after} left`, undo: -delta }
        : { text: `Undone · ${after} left` });
    } catch {
      setRemaining(before);
      setPackToast({ text: "Couldn't save the pack count. Make sure you're signed in as the admin.", error: true });
    } finally {
      setIsSavingPack(false);
    }
  };

  useEffect(() => {
    if (!packToast) return;
    const t = setTimeout(() => setPackToast(null), packToast.error ? 6000 : 8000);
    return () => clearTimeout(t);
  }, [packToast]);
  const [editFormData, setEditFormData] = useState({ name: '', setCode: '', cost: '', marketPrice: '', imageUrl: '' });
  const [autoHeroImage, setAutoHeroImage] = useState<string | null>(null);

  const calculateMarketValue = () => {
    if (!box || !box.inventory) return '0.00';
    return box.inventory.reduce((sum, card: any) => {
      const price = parseFloat(card.prices?.usd || card.prices?.usd_foil || '0');
      return sum + (isNaN(price) ? 0 : price);
    }, 0).toFixed(2);
  };

  const handleFetchArchetypes = async () => {
    if (!box) return;
    setIsFetchingArchetypes(true);
    setFetchMessage('Fetching archetypes from Draftsim + Scryfall...');
    try {
      // Use the first set code if it's a comma-separated list
      const primarySet = box.setCode.split(',')[0].trim();
      const res = await fetch(`/api/archetypes?set=${primarySet}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchMessage(`Error: ${data.error || 'Failed to fetch'}`);
      } else {
        const updatedBox = { ...box, customArchetypes: data.archetypes };
        setBox(updatedBox);
        if (data.mechanics?.length > 0) setGuideMechanics(data.mechanics);
        applyRatings(data);
        try {
          if (db) {
            await updateDoc(doc(db, 'playBoxes', box.id), { customArchetypes: data.archetypes });
          }
        } catch { /* Firestore update failed silently */ }
        const sources = [
          data.sources?.draftsim ? 'Draftsim' : null,
          data.sources?.scryfall ? 'Scryfall' : null,
          data.tierSource ? `17lands tiers` : null,
        ].filter(Boolean).join(' + ');
        setFetchMessage(`Loaded ${data.archetypes.length} archetypes from ${sources || 'API'}.`);
      }
    } catch (err) {
      setFetchMessage('Failed to connect to archetype API.');
    } finally {
      setIsFetchingArchetypes(false);
      setTimeout(() => setFetchMessage(''), 4000);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSharedMode(window.location.search.includes("mode=shared"));
      // The Play Box list's Edit button links here with ?edit=1
      if (new URLSearchParams(window.location.search).get("edit") === "1") setIsEditModalOpen(true);
    }

    (async () => {
      // Seed from local fallback immediately so header + archetypes show correct data before Firestore responds
      const localFallback = DEFAULT_BOX_INFO[id];
      let foundBox: { name: string; setCode: string; remaining: number; total: number; imageUrl?: string } =
        localFallback ?? { name: "Unknown Box", setCode: "FDN", remaining: 0, total: 0 };

      if (localFallback) {
        setBox({ id, ...localFallback, cost: 0, packsOpen: 0, totalPacks: localFallback.total, inventory: [] });
        setEditFormData({ name: localFallback.name, setCode: localFallback.setCode, cost: '0', marketPrice: '', imageUrl: '' });
      }

      if (db) {
        try {
          const snap = await getDoc(doc(db, 'playBoxes', id));
          if (snap.exists()) {
            const matched = { id: snap.id, ...snap.data() } as any;
            foundBox = matched;
            setBox(matched);
            setEditFormData({ name: matched.name, setCode: matched.setCode || matched.set || '', cost: matched.cost?.toString() || '0', marketPrice: matched.marketPrice?.toString() || '', imageUrl: matched.imageUrl || '' });
          }
        } catch {
          // Firestore unavailable — keep local fallback already set above
        }
      }
      setBoxInfo(foundBox);

      // Auto-fetch archetypes in background — API is cached at edge so this is fast on repeat visits
      const primarySet = foundBox.setCode.split(',')[0].trim().toUpperCase();
      fetch(`/api/archetypes?set=${primarySet}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) return;
          setBox(prev => prev ? { ...prev, customArchetypes: data.archetypes } : prev);
          if (data.mechanics?.length > 0) setGuideMechanics(data.mechanics);
          applyRatings(data);
        })
        .catch(() => { /* API unavailable — SET_ARCHETYPES fallback already shown */ });

      const fetchFullSet = async () => {
      setLoading(true);
      setError(null);
      try {
        const inventory = (box as any)?.inventory || [];
        const uniqueCards = Array.from(new Map(inventory.map((c: ScryfallCard) => [c.name, c])).values()) as ScryfallCard[];
        setCards(uniqueCards);
        

        
        let allCards: ScryfallCard[] = [];
        const setCodes = foundBox.setCode.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        // Sets without a hand-entered bonus map get theirs from Scryfall via /api/sets
        let autoBonus: Record<string, string[]> = {};
        if (setCodes.some((c: string) => !BONUS_SHEETS[c])) {
          try {
            const res = await fetch('/api/sets');
            const data = res.ok ? await res.json() : null;
            for (const s of data?.sets ?? []) autoBonus[s.code] = s.bonusSets ?? [];
          } catch { autoBonus = {}; }
        }
        const bonus = setCodes.flatMap((c: string) => BONUS_SHEETS[c] ?? autoBonus[c] ?? []);
        const uniqueSets = Array.from(new Set([...setCodes, ...bonus]));
        const setQuery = uniqueSets.map((s: string) => `set:${s}`).join(" OR ");
        const query = encodeURIComponent(`(${setQuery}) is:booster -type:basic`);
        let url = `https://api.scryfall.com/cards/search?q=${query}`;
        // Scryfall's is:booster flag is missing on newer play-booster sets (e.g. FRA), so
        // retry once without it; showcase/borderless duplicates are deduped by name below.
        let triedWithoutBoosterFlag = false;

        while (url) {
          const res = await fetch(url);
          if (!res.ok) {
            if (res.status === 404 && !triedWithoutBoosterFlag && allCards.length === 0) {
              triedWithoutBoosterFlag = true;
              url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`(${setQuery}) -type:basic`)}`;
              continue;
            }
            if (res.status === 404) {
               throw new Error(`No cards found for set ${foundBox.setCode}. Make sure the Set Code is valid.`);
            }
            throw new Error(`Failed to fetch data from Scryfall. Status: ${res.status}`);
          }
          const data = await res.json();
          allCards = [...allCards, ...data.data];
          
          if (data.has_more && data.next_page) {
             url = data.next_page;
             await new Promise(r => setTimeout(r, 100));
          } else {
             break;
          }
        }
        const uniqueAllCards = Array.from(new Map(allCards.map(c => [c.name, c])).values());
        setCards(uniqueAllCards);

        // Extract auto hero image from a random mythic
        if (!foundBox.imageUrl) {
           const mythics = uniqueAllCards.filter(c => c.rarity === 'mythic' && c.image_uris?.art_crop);
           if (mythics.length > 0) {
              const seed = foundBox.name.length; // deterministic random based on name length
              const randomMythic = mythics[seed % mythics.length];
              setAutoHeroImage(randomMythic.image_uris!.art_crop ?? null);
           }
        }

        // Extract Mechanics
        const extractedMechanics = new Map<string, { desc: string, colors: Set<string>, examples: ScryfallCard[] }>();
        
        for (const card of allCards) {
          if (card.keywords && card.keywords.length > 0) {
            for (const kw of card.keywords) {
              if (EVERGREEN_KEYWORDS.has(kw) || kw.toLowerCase().includes('cycling')) continue;
              const textToSearch = card.oracle_text || (card.card_faces ? card.card_faces.map(f => f.oracle_text).join("\n") : "");
              const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // Scryfall lists ability words as keywords too; the ability-word scan below handles those.
              if (new RegExp('(?:^|\\n)' + escapedKw + '\\s+—').test(textToSearch)) continue;

              if (!extractedMechanics.has(kw)) {
                // Reminder text on the same line as the keyword, not a later ability's
                const regex = new RegExp(escapedKw + '[^\\(\\n]*\\((.*?)\\)', 'i');
                const match = textToSearch.match(regex);

                if (match && match[1]) {
                  let desc = match[1].trim();
                  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
                  extractedMechanics.set(kw, { desc, colors: new Set(), examples: [] });
                }
              }
              
              if (extractedMechanics.has(kw)) {
                const data = extractedMechanics.get(kw)!;
                (card.colors ?? card.card_faces?.flatMap(f => f.colors ?? []) ?? []).forEach(c => data.colors.add(c));
                if (!data.examples.includes(card)) data.examples.push(card); // keyword + same-named ability word
              }
            }
          }
          
          // Ability words ("Landfall — Whenever…") carry no reminder text, so describe them by the
          // text that follows the dash on the first card that uses them. Every line is checked,
          // since a card can have more than one.
          const cardText = card.oracle_text || (card.card_faces ? card.card_faces.map(f => f.oracle_text).join("\n") : "");
          for (const m of cardText.matchAll(/(?:^|\n)([A-Z][a-z]+)\s+—\s*([^\n]*)/g)) {
             const aw = m[1];
             if (EVERGREEN_KEYWORDS.has(aw) || aw.toLowerCase().includes('cycling') || /^(Choose|Chapter)$/.test(aw)) continue;
             // Drop reminder text and a leading mana cost ("{B}, Exile this card…" → "Exile this card…")
             const effect = m[2].replace(/\s*\(.*?\)\s*/g, ' ').trim()
               .replace(/^(\{[^}]*\})+\s*[,:]?\s*/, '').replace(/[,.].*$/, '');
             const existing = extractedMechanics.get(aw);
             if (!existing) {
               if (!effect) continue;
               extractedMechanics.set(aw, { desc: `Ability word: ${effect}…`, colors: new Set(), examples: [] });
             } else if (existing.desc.startsWith('Ability word: {') && effect && !effect.startsWith('{')) {
               // Prefer a trigger or condition ("As long as…") over an activated cost
               existing.desc = `Ability word: ${effect}…`;
             }
             const data = extractedMechanics.get(aw)!;
             (card.colors ?? card.card_faces?.flatMap(f => f.colors ?? []) ?? []).forEach(c => data.colors.add(c));
             if (!data.examples.includes(card)) data.examples.push(card); // keyword + same-named ability word
          }
        }

        // Keep every example; the panel picks the best three by 17Lands win rate when it renders,
        // because the stats can arrive after the card list.
        const sortedMechanics = Array.from(extractedMechanics.entries())
          .filter(([, data]) => data.examples.length >= 3)
          // "Manifest" rides along with "Manifest dread": keep only the longer name
          .filter(([name, data], _i, all) => !all.some(([other, od]) =>
            other.startsWith(name + ' ') && od.examples.length >= data.examples.length * 0.8))
          .map(([name, data]) => {
             return {
               name,
               desc: data.desc,
               colors: Array.from(data.colors).sort((a, b) => "WUBRG".indexOf(a) - "WUBRG".indexOf(b)),
               examples: data.examples
             };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setMechanics(sortedMechanics);

      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

      await fetchFullSet();
    })();
  }, [id]);

  const getColorStyle = (c: string) => {
    switch (c) {
      case 'White': return 'text-amber-600 dark:text-amber-500';
      case 'Blue': return 'text-blue-600 dark:text-blue-500';
      case 'Black': return 'text-paper-700 dark:text-paper-400';
      case 'Red': return 'text-red-600 dark:text-red-500';
      case 'Green': return 'text-green-600 dark:text-green-500';
      default: return 'text-paper-500';
    }
  };

  const getTierStyle = (tier: string) => {
    switch(tier) {
      case 'S': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'C': return 'bg-paper-100 text-paper-700 dark:bg-paper-800 dark:text-paper-300 border-paper-200 dark:border-paper-700';
      case 'D': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-paper-100 text-paper-700 border-paper-200';
    }
  }

  const getSymbolFromName = (name: string) => {
    switch(name) {
      case 'White': return 'W';
      case 'Blue': return 'U';
      case 'Black': return 'B';
      case 'Red': return 'R';
      case 'Green': return 'G';
      default: return '';
    }
  }

  const getImageUrl = (card: ScryfallCard) => {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
    return "https://cards.scryfall.io/large/front/e/0/e0d6b6cd-2495-4eb8-b99b-d72b535d8869.jpg?1559959223";
  };

  const getOracleText = (card: ScryfallCard) => {
    if (card.oracle_text) return card.oracle_text;
    if (card.card_faces?.[0]?.oracle_text) return card.card_faces[0].oracle_text;
    return "No oracle text available.";
  };

  const getManaCost = (card: ScryfallCard) => {
    if (card.mana_cost) return card.mana_cost;
    if (card.card_faces?.[0]?.mana_cost) return card.card_faces[0].mana_cost;
    return "";
  };

  // Derive fixing and ramp from the full set
  const manaFixing = cards.filter(c => {
    const r = (c.rarity || '').toLowerCase();
    if (r !== 'common' && r !== 'uncommon') return false;
    
    // Always include non-basic lands
    if (c.type_line.includes("Land") && !c.type_line.includes("Basic Land")) return true;

    // Check for mana rocks, mana dorks, and ramp spells
    const oracleText = c.oracle_text || (c.card_faces ? c.card_faces.map(f => f.oracle_text).join(" ") : "");
    if (oracleText) {
      const producesAnyColor = oracleText.includes("Add one mana of any color") || oracleText.includes("Add two mana of any one color");
      const producesMultipleOptions = /Add \{.*?\} or \{.*?\}/.test(oracleText); // e.g., "Add {G} or {W}"
      const searchesForLand = oracleText.includes("Search your library for a basic land card");
      const isManaRock = c.type_line.includes("Artifact") && oracleText.includes("Add {"); // Any artifact that taps for mana

      return producesAnyColor || producesMultipleOptions || searchesForLand || isManaRock;
    }

    return false;
  });

  // Extract meaningful MTG synergy terms from archetype name + description
  const getSynergyTerms = (archetype: { name: string; colors: string[]; desc: string }): string[] => {
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'with', 'your', 'into', 'from', 'this', 'have',
      'are', 'use', 'using', 'can', 'will', 'when', 'then', 'they', 'their', 'which',
      'both', 'each', 'all', 'any', 'its', 'you', 'has', 'deck', 'draft', 'card',
      'cards', 'game', 'player', 'opponent', 'mana', 'color', 'white', 'blue', 'black',
      'red', 'green', 'strategy', 'archetype', 'best', 'good', 'great', 'push', 'make',
      'them', 'also', 'play', 'over', 'more', 'less', 'only', 'just', 'well', 'late',
      'early', 'very', 'most', 'some', 'many', 'much', 'such', 'long', 'high', 'deal',
      'help', 'while', 'even', 'often', 'large', 'small', 'these', 'those', 'about',
      'attack', 'combat', 'turn', 'board', 'pair', 'cheap', 'powerful', 'build',
    ]);
    const text = `${archetype.name} ${archetype.desc}`;
    const words = text.toLowerCase().match(/\b[a-z][a-z'-]{3,}\b/g) || [];
    return [...new Set(words.filter(w => !stopWords.has(w)))];
  };

  // Score a card by how well it fits a specific archetype (color fit + keyword synergy)
  const scoreCardForArchetype = (
    card: ScryfallCard,
    archetypeSymbols: string[],
    synergyTerms: string[],
  ): number => {
    const cardColors = card.colors || [];
    const cardInArchetype = cardColors.every(c => (archetypeSymbols as string[]).includes(c));
    const isExactMulticolor = cardColors.length > 1
      && cardColors.length === archetypeSymbols.length
      && cardInArchetype;

    let score = 0;

    // Color fit
    if (cardColors.length === 0) {
      score += 0.5; // colorless — artifacts, generic spells
    } else if (isExactMulticolor) {
      score += 4; // exact color pair — these are the designed signposts/payoffs
    } else if (cardColors.length > 1 && cardInArchetype) {
      score += 2.5; // multicolor subset of archetype
    } else if (cardInArchetype) {
      score += 1.5; // monocolor in archetype
    }

    // Synergy keyword scoring — check oracle text, type line, and keywords
    const cardText = [
      card.oracle_text || '',
      card.type_line || '',
      (card.keywords || []).join(' '),
      ...(card.card_faces || []).map(f => f.oracle_text || ''),
    ].join(' ').toLowerCase();

    for (const term of synergyTerms) {
      if (cardText.includes(term)) score += 1.5;
    }

    return score;
  };

  const getTopCardsForArchetype = (archetype: { name: string; colors: string[]; desc: string }) => {
    const symbols = archetype.colors.map(getSymbolFromName);
    const synergyTerms = getSynergyTerms(archetype);

    const inArchetype = (card: ScryfallCard) =>
      (card.colors || []).every(c => (symbols as string[]).includes(c));

    const scored = (subset: ScryfallCard[]) =>
      subset
        .map(card => ({
          card,
          score: scoreCardForArchetype(card, symbols, synergyTerms),
          landsWr: cardRatingMap.get(card.name) ?? 0,
        }))
        .filter(({ score, landsWr }) => score > 0 || landsWr > 0.48)
        .sort((a, b) => {
          // 17lands win rate is primary signal when available; blend with color-fit score
          const aVal = a.landsWr > 0 ? a.landsWr * 100 + a.score * 0.1 : a.score;
          const bVal = b.landsWr > 0 ? b.landsWr * 100 + b.score * 0.1 : b.score;
          return bVal - aVal;
        })
        .map(({ card }) => card);

    const rar = (c: ScryfallCard) => (c.rarity || '').toLowerCase();

    // Signpost uncommons: prioritise exact-color multicolor uncommons (designed signposts),
    // then fill with high-synergy monocolor uncommons
    const allUncommons = cards.filter(c => rar(c) === 'uncommon' && inArchetype(c));
    const multiUncommons = scored(allUncommons.filter(c => c.colors?.length === symbols.length && c.colors.length > 1));
    const monoUncommons  = scored(allUncommons.filter(c => c.colors?.length !== symbols.length || symbols.length === 1));
    const signpostsRaw   = [...multiUncommons, ...monoUncommons.filter(c => !multiUncommons.includes(c))];
    const signposts      = signpostsRaw.slice(0, 2);

    // Bomb rares: exact multicolor first, then high-synergy broad pool
    const allRares = cards.filter(c => (rar(c) === 'rare' || rar(c) === 'mythic') && inArchetype(c));
    const rares    = scored(allRares).slice(0, 3);

    // Broad pool for commons/removal/evasion/draw (all cards whose colors fit)
    const broadPool = scored(cards.filter(c => inArchetype(c)));

    const isRemoval = (c: ScryfallCard) => {
      const text = (c.oracle_text || '') + (c.card_faces?.map(f => f.oracle_text).join(' ') || '');
      return /(destroy|exile|deals \d+ damage to).*?target/i.test(text)
        || /target.*?gets -\d+\/-\d+/i.test(text)
        || /fights? target/i.test(text);
    };

    const isEvasion = (c: ScryfallCard) => {
      if (c.keywords?.some(k => ['Flying', 'Menace', 'Fear', 'Intimidate', 'Skulk', 'Shadow', 'Trample'].includes(k))) return true;
      return /can't be blocked/i.test(c.oracle_text || '');
    };

    const isDraw = (c: ScryfallCard) => {
      const text = c.oracle_text || '';
      return /draw (a|one|two|three|\d+) card/i.test(text)
        || /look at the top.*?cards/i.test(text)
        || /investigate/i.test(text);
    };

    const removalPool = broadPool.filter(c => (rar(c) === 'common' || rar(c) === 'uncommon') && isRemoval(c));
    const removal = removalPool.slice(0, 2);

    const evasionPool = broadPool.filter(c => (rar(c) === 'common' || rar(c) === 'uncommon') && isEvasion(c) && !removal.includes(c));
    const evasion = evasionPool.slice(0, 2);

    const drawPool = broadPool.filter(c => (rar(c) === 'common' || rar(c) === 'uncommon') && isDraw(c) && !removal.includes(c) && !evasion.includes(c));
    const draw = drawPool.slice(0, 2);

    const commons = broadPool
      .filter(c => rar(c) === 'common' && !removal.includes(c) && !evasion.includes(c) && !draw.includes(c))
      .slice(0, 3);

    return { signposts, rares, commons, removal, evasion, draw };
  };

  // One preview for the whole page (cards and mechanic examples). On touch screens the first
  // tap shows it, with a link to Scryfall; on mouse screens hover or focus shows it.
  type PreviewState =
    | { kind: 'card'; card: ScryfallCard; anchor: DOMRect; interactive: boolean }
    | { kind: 'mechanic'; name: string; cards: ScryfallCard[]; anchor: DOMRect; interactive: boolean };
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const touchRef = useRef(false);
  useEffect(() => {
    touchRef.current = window.matchMedia('(hover: none)').matches;
    const close = () => setPreview(null);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close); window.removeEventListener('resize', close); };
  }, []);
  useEffect(() => {
    if (!preview?.interactive) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('[data-floating-preview],[data-preview-anchor]')) return;
      setPreview(null);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [preview]);
  const hidePreview = () => { if (!touchRef.current) setPreview(null); };
  const scryfallUrl = (card: ScryfallCard) => `https://scryfall.com/search?q=!"${encodeURIComponent(card.name)}"`;

  const renderCard = (card: ScryfallCard, caption?: string) => (
    <a
      key={card.id}
      href={scryfallUrl(card)}
      target="_blank"
      rel="noopener noreferrer"
      data-preview-anchor
      className="group flex flex-col gap-1.5 min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sakura-500"
      onMouseEnter={e => { if (!touchRef.current) setPreview({ kind: 'card', card, anchor: e.currentTarget.getBoundingClientRect(), interactive: false }); }}
      onMouseLeave={hidePreview}
      onFocus={e => setPreview({ kind: 'card', card, anchor: e.currentTarget.getBoundingClientRect(), interactive: touchRef.current })}
      onBlur={hidePreview}
      onClick={e => {
        if (!touchRef.current) return;
        e.preventDefault();
        setPreview({ kind: 'card', card, anchor: e.currentTarget.getBoundingClientRect(), interactive: true });
      }}
    >
      <div className={`relative ${CARD_ASPECT} w-full ${CARD_RADIUS} overflow-hidden bg-paper-200 dark:bg-paper-800 shadow-sm ring-1 ring-paper-900/10 dark:ring-white/10 transition-shadow duration-150 group-hover:ring-2 group-hover:ring-sakura-500 group-hover:shadow-md`}>
        <img src={getImageUrl(card)} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
        {rarityBadge(card.rarity)}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-xs font-medium leading-snug text-paper-800 dark:text-paper-200 truncate">{card.name}</p>
        {caption && <p className="text-xs leading-snug text-paper-500 dark:text-paper-400 truncate">{caption}</p>}
      </div>
    </a>
  );

  /** Key cards for an archetype as one list, most important first, each tagged with its role. */
  const keyCardsFor = (top: ReturnType<typeof getTopCardsForArchetype>) => {
    const seen = new Set<string>();
    const out: { card: ScryfallCard; role: string }[] = [];
    const add = (list: ScryfallCard[], role: string) => list.forEach(c => {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      out.push({ card: c, role });
    });
    add(top.rares, 'Bomb rare');
    add(top.signposts, 'Signpost');
    add(top.removal, 'Removal');
    add(top.evasion, 'Threat');
    add(top.draw, 'Card advantage');
    add(top.commons, 'Synergy common');
    return out;
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "shared");
      
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url.toString());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          prompt("Copy this link to share:", url.toString());
        }
      } catch (err) {
        prompt("Copy this link to share:", url.toString());
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!box) return;
    const updatedBox = { ...box, name: editFormData.name, setCode: editFormData.setCode, cost: parseFloat(editFormData.cost) || 0, marketPrice: editFormData.marketPrice.trim(), imageUrl: editFormData.imageUrl };
    setBox(updatedBox);
    setBoxInfo({ ...boxInfo, name: editFormData.name, setCode: editFormData.setCode, imageUrl: editFormData.imageUrl });

    try {
      if (db) {
        // Exclude inventory (fetched from Scryfall dynamically — too large for Firestore)
        const { inventory: _inv, ...boxToStore } = updatedBox as any;
        await updateDoc(doc(db, 'playBoxes', box.id), boxToStore);
      }
    } catch { /* Firestore update failed silently */ }

    setIsEditModalOpen(false);
    window.location.reload();
  };

  return (
    <main className="flex-1 bg-transparent p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {!isSharedMode && (
          <Link href="/play-box" className="inline-flex items-center gap-2 text-sm text-paper-500 dark:text-paper-400 hover:text-sakura-600 dark:hover:text-sakura-400 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Play Box
          </Link>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white dark:bg-paper-900 p-6 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm relative overflow-hidden">
          

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-sakura-600 dark:text-sakura-400" />
              <h1 className="text-3xl md:text-4xl font-brand font-bold text-paper-900 dark:text-paper-50">
                <span className="washi">{boxInfo.name}</span>
              </h1>
            </div>
            <p className="text-paper-500 dark:text-paper-400 mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
              <span className="sticker bg-mint text-emerald-950 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
                Draft Box
              </span>
              • Set: {boxInfo.setCode} • {boxInfo.remaining} / {boxInfo.total} Packs Remaining
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-4 md:gap-6">
          {(boxInfo.imageUrl || autoHeroImage) && (
            // The set's art, shown whole as a photo taped into the letter (no fading wash)
            // eslint-disable-next-line @next/next/no-img-element
            <span className="taped-photo hidden sm:block shrink-0 w-32 lg:w-40"><img src={(boxInfo.imageUrl || autoHeroImage) as string} alt="" className="block w-full aspect-[626/457] object-cover" /></span>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {!isSharedMode && (
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-paper-100 text-paper-700 dark:bg-paper-800 dark:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-paper-700 transition-colors font-semibold shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />} 
                {copied ? "Copied Link!" : "Share Link"}
              </button>
            )}
            {!isSharedMode && isAdmin && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-paper-100 text-paper-700 dark:bg-paper-800 dark:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-paper-700 transition-colors font-semibold shadow-sm"
              >
                <Settings className="w-4 h-4" /> Edit
              </button>
            )}
            {!isSharedMode && isAdmin && (
              <button 
                type="button"
                onClick={() => changePacks(-1)}
                disabled={isSavingPack || boxInfo.remaining <= 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" /> {boxInfo.remaining <= 0 ? "Box Empty" : "Open Pack"}
              </button>
            )}
            {isSharedMode && (
              <span className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-bold flex items-center gap-2 relative z-10">
                <Share2 className="w-4 h-4" />
                Read-Only Shared View
              </span>
            )}
          </div>
          </div>
        </div>

        {packToast && (
          <div role="status" aria-live="polite"
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-4 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${packToast.error ? "bg-red-600 text-white" : "bg-paper-900 text-white dark:bg-paper-100 dark:text-paper-900"}`}>
            <span>{packToast.text}</span>
            {packToast.undo && (
              <button type="button" onClick={() => changePacks(packToast.undo!)} disabled={isSavingPack}
                className="font-bold underline underline-offset-2 hover:opacity-80">Undo</button>
            )}
          </div>
        )}

        {(() => {
          // Mechanics: guide entries first, then card-scanned ones not already covered. Guide entries
          // borrow the scan's example cards when the names match.
          const scannedExamples = new Map(mechanics.map(m => [m.name.toLowerCase(), m.examples]));
          const extraMechanics = mechanics.filter(m => !guideMechanics.some(g => g.name.toLowerCase() === m.name.toLowerCase()));
          const mechanicRows = [
            ...guideMechanics.map(g => ({ ...g, examples: scannedExamples.get(g.name.toLowerCase()) ?? [], scanned: false })),
            ...extraMechanics.map(m => ({ ...m, scanned: true })),
          ];
          const showMechanics = mechanicRows.length > 0 && !loading && !error;
          if (!packContents && !showMechanics) return null;
          const packs = box?.totalPacks || boxInfo.total || 0;
          const rareSlots = packContents ? packContents.slots.filter(sl => sl.chance < 0.5 && !/land/i.test(sl.sheet)) : [];
          const showMechanicPreview = (e: React.SyntheticEvent<HTMLElement>, name: string, examples: ScryfallCard[], interactive: boolean) =>
            setPreview({ kind: 'mechanic', name, cards: bestExamples(examples), anchor: e.currentTarget.getBoundingClientRect(), interactive });

          return (
            <section className={`grid gap-6 items-start mb-12 ${packContents && showMechanics ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : ''}`}>
              {packContents && (
                <div className="bg-white dark:bg-paper-900 p-5 md:p-6 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm">
                  <h2 className="font-brand font-bold text-lg text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2">
                    <Package className="w-5 h-5 text-sakura-600 dark:text-sakura-400" /> Pack Contents
                  </h2>
                  <p className="text-xs text-paper-500 dark:text-paper-400 mt-0.5 mb-3 capitalize">
                    {packContents.booster} booster · {formatCount(packContents.cardsPerPack)} cards
                  </p>
                  <ul className="divide-y divide-paper-100 dark:divide-paper-800 text-sm">
                    {packContents.slots.map(sl => (
                      <li key={sl.sheet} className="flex items-baseline justify-between gap-3 py-1.5">
                        <span className="text-paper-700 dark:text-paper-300 min-w-0">
                          {sl.label}
                          <span className="text-xs text-paper-500 dark:text-paper-400"> · {sl.cards} cards{sl.sheets ? ` across ${sl.sheets} sheets` : ''}</span>
                        </span>
                        <span className="text-right font-medium tabular-nums text-paper-900 dark:text-paper-100 whitespace-nowrap">
                          {sl.chance >= 0.995 ? `× ${formatCount(sl.perPack)}` : formatOdds(sl.chance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-paper-700 dark:text-paper-300 space-y-1">
                    <p>Mythic: {formatOdds(Math.min(packContents.mythicsPerPack, 1))}</p>
                    {packs > 0 && (
                      <p>
                        Per box ({packs} packs): ~{formatCount(packContents.mythicsPerPack * packs)} mythics
                        {rareSlots.map(sl => `, ~${formatCount(sl.perPack * packs)} ${sl.label}`).join('')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-paper-500 dark:text-paper-400 mt-3">
                    Booster data from{' '}
                    <a href="https://mtgjson.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-sakura-600 dark:hover:text-sakura-400">MTGJSON</a>
                  </p>
                </div>
              )}

              {showMechanics && (
                <div className="bg-white dark:bg-paper-900 p-5 md:p-6 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm">
                  <h2 className="font-brand font-bold text-lg text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-sakura-600 dark:text-sakura-400" /> Set Mechanics
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-x-8">
                    {mechanicRows.map((mech, i) => {
                      const hasExamples = mech.examples.length > 0;
                      const firstScanned = mech.scanned && (i === 0 || !mechanicRows[i - 1].scanned) && guideMechanics.length > 0;
                      return (
                        <React.Fragment key={`${mech.scanned ? 'scan' : 'guide'}-${mech.name}`}>
                          {firstScanned && (
                            <li className="sm:col-span-2 pt-4 pb-1 text-xs font-semibold text-paper-500 dark:text-paper-400">Also in this set</li>
                          )}
                          <li className="border-t border-paper-100 dark:border-paper-800">
                            <div
                              {...(hasExamples ? {
                                tabIndex: 0,
                                'data-preview-anchor': true,
                                onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => { if (!touchRef.current) showMechanicPreview(e, mech.name, mech.examples, false); },
                                onMouseLeave: hidePreview,
                                onFocus: (e: React.FocusEvent<HTMLDivElement>) => showMechanicPreview(e, mech.name, mech.examples, touchRef.current),
                                onBlur: hidePreview,
                                onClick: (e: React.MouseEvent<HTMLDivElement>) => { if (touchRef.current) showMechanicPreview(e, mech.name, mech.examples, true); },
                              } : {})}
                              className={`py-3 rounded-md ${hasExamples ? 'cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sakura-500' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-paper-900 dark:text-paper-100">{mech.name}</h3>
                                <span className="flex gap-1 shrink-0">
                                  {mech.colors.length > 0
                                    ? mech.colors.map(c => <ManaIcon key={c} symbol={c} size={18} />)
                                    : <span className="text-xs text-paper-500 dark:text-paper-400">Colorless</span>}
                                </span>
                              </div>
                              <p className="text-sm text-paper-600 dark:text-paper-400 leading-relaxed mt-1">{mech.desc}</p>
                              {hasExamples && (
                                <p className="text-xs text-sakura-600 dark:text-sakura-400 mt-1 flex items-center gap-1">
                                  Top cards: hover or tap
                                </p>
                              )}
                            </div>
                          </li>
                        </React.Fragment>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          );
        })()}

        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sakura-600 dark:text-sakura-400" /> Draft Archetypes &amp; Signposts
              </h2>
              <p className="text-paper-500 dark:text-paper-400 text-sm mt-1">The main draft strategies for this set, with the cards that make each one work.</p>
              {statsSource && (
                <p className="text-xs text-paper-500 dark:text-paper-400 mt-1">
                  Tiers and card win rates from{' '}
                  <a href={statsSource.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-sakura-600 dark:hover:text-sakura-400">
                    {statsSource.name}
                  </a>{' '}
                  ({statsSource.license}) · {statsSource.games.toLocaleString()} Premier Draft games
                </p>
              )}
            </div>
            {box && isAdmin && !isSharedMode && (
              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleFetchArchetypes}
                  disabled={isFetchingArchetypes}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-paper-100 text-paper-700 hover:bg-paper-200 dark:bg-paper-800 dark:text-paper-300 dark:hover:bg-paper-700 disabled:opacity-50 transition-colors"
                >
                  {isFetchingArchetypes ? 'Refreshing…' : 'Refresh archetypes'}
                </button>
                {fetchMessage && <span className="text-xs text-paper-500 dark:text-paper-400">{fetchMessage}</span>}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm">
              <Loader2 className="w-8 h-8 text-sakura-600 animate-spin mb-4" />
              <p className="text-paper-500 dark:text-paper-400 font-medium">Loading the set from Scryfall. This can take a moment.</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(box?.customArchetypes || SET_ARCHETYPES[boxInfo.setCode] || SET_ARCHETYPES.DEFAULT).map(archetype => {
                const topCards = getTopCardsForArchetype(archetype);
                const tier = (archetype as { tier?: string }).tier || getCardQualityTier(topCards);
                const keyCards = keyCardsFor(topCards);
                return (
                  <article key={archetype.name} className="bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider flex flex-wrap items-center gap-1.5">
                        {archetype.colors.map((c, i) => (
                          <React.Fragment key={c}>
                            <span className="flex items-center gap-1">
                              <ManaIcon symbol={COLOR_NAME_TO_SYMBOL[c] || c} size={16} />
                              <span className={getColorStyle(c)}>{c}</span>
                            </span>
                            {i < archetype.colors.length - 1 && <span className="text-paper-300 dark:text-paper-600">/</span>}
                          </React.Fragment>
                        ))}
                      </p>
                      <span className={`sticker text-xs font-bold uppercase px-2 py-0.5 rounded-md ${getTierStyle(tier)}`}>
                        Tier {tier}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-paper-900 dark:text-paper-100 mt-2">{archetype.name}</h3>
                    <p className="text-sm text-paper-600 dark:text-paper-400 leading-relaxed max-w-3xl mt-1">{archetype.desc}</p>
                    {keyCards.length > 0 && (
                      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-5">
                        {keyCards.map(({ card, role }) => renderCard(card, role))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {manaFixing.length > 0 && !loading && !error && (() => {
          const isColorlessHelper = (c: ScryfallCard) =>
            (!c.colors || c.colors.length === 0) && (c.type_line.includes("Artifact") || c.type_line.includes("Creature"));
          const lands = manaFixing.filter(c => c.type_line.includes("Land"));
          const colorless = manaFixing.filter(c => !c.type_line.includes("Land") && isColorlessHelper(c));
          const spells = manaFixing.filter(c => !c.type_line.includes("Land") && !isColorlessHelper(c));
          return (
            <section>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5">
                <h2 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-sakura-600 dark:text-sakura-400" /> Mana Fixing
                </h2>
                <span className="text-sm font-medium text-paper-500 dark:text-paper-400 bg-paper-100 dark:bg-paper-800 px-2.5 py-0.5 rounded-full">
                  {manaFixing.length} cards
                </span>
              </div>
              <div className="bg-white dark:bg-paper-900 p-5 md:p-6 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-3 gap-y-5">
                {lands.map(c => renderCard(c, 'Land'))}
                {colorless.map(c => renderCard(c, 'Artifact / colorless'))}
                {spells.map(c => renderCard(c, 'Spell'))}
              </div>
            </section>
          );
        })()}
      </div>

      {preview && (
        <FloatingPreview
          key={preview.kind === 'card' ? `card-${preview.card.id}` : `mech-${preview.name}`}
          anchor={preview.anchor}
          maxWidth={preview.kind === 'card' ? 448 : 480}
          interactive={preview.interactive}
        >
          {preview.kind === 'card' ? (() => {
            const card = preview.card;
            const st = cardStatsMap.get(card.name);
            const mana = getManaCost(card);
            return (
              <div className="flex gap-4 p-4 rounded-xl bg-paper-900 text-paper-50 shadow-2xl ring-1 ring-white/10">
                <img src={getImageUrl(card)} alt="" className={`w-28 sm:w-36 shrink-0 self-start ${CARD_ASPECT} h-auto ${CARD_RADIUS}`} />
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-snug">{card.name}</h4>
                    {mana && <span className="font-mono text-xs text-paper-300 whitespace-nowrap">{mana}</span>}
                  </div>
                  <p className="text-xs text-paper-300 leading-snug">
                    {card.type_line} · <span className="capitalize">{card.rarity}</span>
                  </p>
                  <p className="text-xs text-paper-200 whitespace-pre-wrap leading-relaxed border-t border-white/10 pt-2">
                    {getOracleText(card)}
                  </p>
                  {st && (
                    <p className="text-xs text-paper-100 font-semibold tabular-nums">
                      {st.winRate >= 0.58 && <Sparkle className="w-3.5 h-3.5 mr-1 -mt-0.5 align-middle" title="58%+ win rate" />}
                      GIH WR {(st.winRate * 100).toFixed(1)}%
                      {st.iwd != null && <> · IWD {st.iwd >= 0 ? '+' : ''}{(st.iwd * 100).toFixed(1)}pp</>}
                      {st.ata != null && <> · ATA {st.ata.toFixed(1)}</>}
                      <span className="text-paper-300"> · {st.gihGames.toLocaleString()} games</span>
                    </p>
                  )}
                  {preview.interactive ? (
                    <a href={scryfallUrl(card)} target="_blank" rel="noopener noreferrer"
                      className="mt-auto text-xs font-semibold text-sakura-300 underline underline-offset-2">Open on Scryfall</a>
                  ) : (
                    <p className="mt-auto text-xs text-paper-300">Click to open on Scryfall</p>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="p-4 rounded-xl bg-paper-900 text-paper-50 shadow-2xl ring-1 ring-white/10">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                Top {preview.name} cards
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {preview.cards.map(card => (
                  <img key={card.id} src={getImageUrl(card)} alt={card.name} className={`w-full ${CARD_ASPECT} h-auto ${CARD_RADIUS}`} />
                ))}
              </div>
            </div>
          )}
        </FloatingPreview>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-paper-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-paper-900 rounded-2xl max-w-md w-full border border-paper-200 dark:border-paper-800 shadow-2xl p-6 relative">
            <button
              type="button"
              aria-label="Close modal"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-paper-500 dark:text-paper-400 hover:text-paper-600 dark:hover:text-paper-200 bg-paper-100 dark:bg-paper-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-sakura-600" />
              Edit Box Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-paper-700 dark:text-paper-300 mb-1">Box Name</label>
                <input
                  type="text"
                  aria-label="Box Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-paper-50 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-paper-700 dark:text-paper-300 mb-1">Set Codes (Comma Separated)</label>
                <input 
                  type="text" 
                  value={editFormData.setCode}
                  onChange={(e) => setEditFormData({...editFormData, setCode: e.target.value})}
                  placeholder="e.g. FIN, FCA"
                  className="w-full bg-paper-50 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                />
                <p className="text-xs text-paper-500 dark:text-paper-400 mt-2">
                  You can specify multiple set abbreviations separated by commas (e.g. FIN, FCA) to combine them into one draft environment!
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-paper-700 dark:text-paper-300 mb-1">Custom Hero Image URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-4 w-4 text-paper-500 dark:text-paper-400" />
                  </div>
                  <input
                    type="url"
                    aria-label="Custom Hero Image URL"
                    placeholder="https://... (Leave blank for random Mythic)"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData({...editFormData, imageUrl: e.target.value})}
                    className="w-full pl-9 pr-3 py-3 border border-paper-200 dark:border-paper-700 rounded-lg bg-paper-50 dark:bg-paper-800 text-paper-900 dark:text-paper-100 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-paper-700 dark:text-paper-300 mb-1">Paid Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper-500 dark:text-paper-400">$</span>
                  <input 
                    type="number"
                    aria-label="Paid Price"
                    step="0.01"
                    value={editFormData.cost}
                    onChange={(e) => setEditFormData({...editFormData, cost: e.target.value})}
                    className="w-full bg-paper-50 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-market-price" className="block text-sm font-bold text-paper-700 dark:text-paper-300 mb-1">Market Price, sealed box ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper-500 dark:text-paper-400">$</span>
                  <input
                    id="edit-market-price"
                    type="number"
                    step="0.01"
                    placeholder="e.g. TCGplayer market price"
                    value={editFormData.marketPrice}
                    onChange={(e) => setEditFormData({...editFormData, marketPrice: e.target.value})}
                    className="w-full bg-paper-50 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sakura-500"
                  />
                </div>
                <p className="text-xs text-paper-500 dark:text-paper-400 mt-1">Shown to everyone as the box&rsquo;s market price and its draft and sealed cost per person.</p>
              </div>

              <div className="bg-sakura-50 dark:bg-sakura-900/20 p-4 rounded-xl border border-sakura-100 dark:border-sakura-800/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-paper-600 dark:text-paper-400">Box Paid Price</span>
                  <span className="font-bold text-paper-900 dark:text-paper-100">${parseFloat(editFormData.cost || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-paper-600 dark:text-paper-400">Current Market Value (Opened)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${calculateMarketValue()}</span>
                </div>
                <div className="h-px bg-sakura-200 dark:bg-sakura-800/50 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-paper-900 dark:text-paper-100">Net Return</span>
                  <span className={`font-bold ${parseFloat(calculateMarketValue()) - parseFloat(editFormData.cost || '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    ${(parseFloat(calculateMarketValue()) - parseFloat(editFormData.cost || '0')).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-300 rounded-xl font-bold hover:bg-paper-200 dark:hover:bg-paper-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-accent text-on-accent rounded-xl font-bold hover:bg-accent-hover transition-colors shadow-sm dark:shadow-none"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
