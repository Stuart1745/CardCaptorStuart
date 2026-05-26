"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import NextImage from "next/image";
import { ArrowLeft, Package, Loader2, AlertCircle, BookOpen, Map as MapIcon, Star, Zap, Share2, Check, Settings, X, Image as ImageIcon } from "lucide-react";

const MANA_SYMBOL_FILE: Record<string, string> = { W: 'w', U: 'u', B: 'b', R: 'r', G: 'g' };
const COLOR_NAME_TO_SYMBOL: Record<string, string> = { White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G' };

const ManaIcon = ({ symbol, size = 20 }: { symbol: string; size?: number }) => {
  const file = MANA_SYMBOL_FILE[symbol];
  if (!file) return null;
  return <NextImage src={`/mana/${file}.png`} alt={symbol} width={size} height={size} className="rounded-full" />;
};

const getArchetypeGradient = (colors: string[]) => {
  const getSafeColor = (c: string) => {
    switch(c) {
      case 'W': return '#fef08a';
      case 'U': return '#3b82f6';
      case 'B': return '#1e293b';
      case 'R': return '#ef4444';
      case 'G': return '#10b981';
      default: return '#94a3b8';
    }
  };
  if (colors.length === 0) return { backgroundColor: '#cbd5e1' };
  if (colors.length === 1) return { backgroundColor: getSafeColor(colors[0]) };
  const stops = colors.map((c, i) => `${getSafeColor(c)} ${(i / (colors.length - 1)) * 100}%`).join(', ');
  return { backgroundImage: `linear-gradient(to right, ${stops})` };
};

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

const DEFAULT_BOX_INFO: Record<string, { name: string; setCode: string; remaining: number; total: number }> = {
  "2": { name: "Avatar", setCode: "TLA", remaining: 36, total: 36 },
  "3": { name: "Tarkir Dragonstorm", setCode: "TDM", remaining: 36, total: 36 },
  "4": { name: "Lorwyn Eclipsed", setCode: "ECI", remaining: 36, total: 36 },
  "5": { name: "Unfinity", setCode: "UNF", remaining: 36, total: 36 },
  "6": { name: "Final Fantasy", setCode: "FIN", remaining: 36, total: 36 },
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
  "FIN": ["FCA"]
};

// Deterministic mock generator for Draftsim ratings since there is no public API
const getMockRating = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const score = 1.0 + (Math.abs(hash) % 41) / 10; 
  return score.toFixed(1);
};

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
  "ECI": [
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
  const [error, setError] = useState<string | null>(null);
  const [isSharedMode, setIsSharedMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', setCode: '', cost: '', imageUrl: '' });
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
        if (data.cardRatings?.length > 0) {
          const rmap = new Map<string, number>();
          for (const r of data.cardRatings) if (r.name) rmap.set(r.name, r.winRate ?? 0);
          setCardRatingMap(rmap);
        }
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
    }

    (async () => {
      // Seed from local fallback immediately so header + archetypes show correct data before Firestore responds
      const localFallback = DEFAULT_BOX_INFO[id];
      let foundBox: { name: string; setCode: string; remaining: number; total: number; imageUrl?: string } =
        localFallback ?? { name: "Unknown Box", setCode: "FDN", remaining: 0, total: 0 };

      if (localFallback) {
        setBox({ id, ...localFallback, cost: 0, packsOpen: 0, totalPacks: localFallback.total, inventory: [] });
        setEditFormData({ name: localFallback.name, setCode: localFallback.setCode, cost: '0', imageUrl: '' });
      }

      if (db) {
        try {
          const snap = await getDoc(doc(db, 'playBoxes', id));
          if (snap.exists()) {
            const matched = { id: snap.id, ...snap.data() } as any;
            foundBox = matched;
            setBox(matched);
            setEditFormData({ name: matched.name, setCode: matched.setCode || matched.set || '', cost: matched.cost?.toString() || '0', imageUrl: matched.imageUrl || '' });
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
          if (data.cardRatings?.length > 0) {
            const rmap = new Map<string, number>();
            for (const r of data.cardRatings) if (r.name) rmap.set(r.name, r.winRate ?? 0);
            setCardRatingMap(rmap);
          }
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
        const bonus = setCodes.flatMap((c: string) => BONUS_SHEETS[c] || []);
        const uniqueSets = Array.from(new Set([...setCodes, ...bonus]));
        const setQuery = uniqueSets.map((s: string) => `set:${s}`).join(" OR ");
        const query = encodeURIComponent(`(${setQuery}) is:booster -type:basic`);
        let url = `https://api.scryfall.com/cards/search?q=${query}`;
        
        while (url) {
          const res = await fetch(url);
          if (!res.ok) {
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

              if (!extractedMechanics.has(kw)) {
                const textToSearch = card.oracle_text || (card.card_faces ? card.card_faces.map(f => f.oracle_text).join(" ") : "");
                const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedKw + '[^\\(]*\\((.*?)\\)', 'i');
                const match = textToSearch.match(regex);

                if (match && match[1]) {
                  let desc = match[1].trim();
                  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
                  extractedMechanics.set(kw, { desc, colors: new Set(), examples: [] });
                }
              }
              
              if (extractedMechanics.has(kw)) {
                const data = extractedMechanics.get(kw)!;
                if (card.colors) card.colors.forEach(c => data.colors.add(c));
                data.examples.push(card);
              }
            }
          }
          
          const abilityWordMatch = (card.oracle_text || "").match(/(?:^|\n)([A-Z][a-z]+)\s+—/);
          if (abilityWordMatch && abilityWordMatch[1]) {
             const aw = abilityWordMatch[1];
             if (!EVERGREEN_KEYWORDS.has(aw) && !aw.toLowerCase().includes('cycling')) {
               if (!extractedMechanics.has(aw)) {
                 const regex = new RegExp(aw + '[^\\(]*\\((.*?)\\)', 'i');
                 const match = (card.oracle_text || "").match(regex);
                 if (match && match[1]) {
                   let desc = match[1].trim();
                   desc = desc.charAt(0).toUpperCase() + desc.slice(1);
                   extractedMechanics.set(aw, { desc, colors: new Set(), examples: [] });
                 }
               }
               
               if (extractedMechanics.has(aw)) {
                 const data = extractedMechanics.get(aw)!;
                 if (card.colors) card.colors.forEach(c => data.colors.add(c));
                 data.examples.push(card);
               }
             }
          }
        }

        const sortedMechanics = Array.from(extractedMechanics.entries())
          .filter(([, data]) => data.examples.length >= 3)
          .map(([name, data]) => {
             const topExamples = [...data.examples].sort((a, b) => parseFloat(getMockRating(b.name)) - parseFloat(getMockRating(a.name))).slice(0, 3);
             return { 
               name, 
               desc: data.desc, 
               colors: Array.from(data.colors).sort((a, b) => "WUBRG".indexOf(a) - "WUBRG".indexOf(b)),
               examples: topExamples
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
      case 'Black': return 'text-slate-700 dark:text-slate-400';
      case 'Red': return 'text-red-600 dark:text-red-500';
      case 'Green': return 'text-green-600 dark:text-green-500';
      default: return 'text-slate-500';
    }
  };

  const getTierStyle = (tier: string) => {
    switch(tier) {
      case 'S': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'C': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'D': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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

  const CardRenderer = ({ card, showRarityLabel }: { card: ScryfallCard; showRarityLabel?: boolean }) => {
    const [tooltipSide, setTooltipSide] = useState<'left' | 'right'>('right');

    const handleMouseEnter = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipSide(rect.left + rect.width / 2 > window.innerWidth * 0.6 ? 'left' : 'right');
    };

    const rarityBadge = () => {
      const r = (card.rarity || '').toLowerCase();
      if (r === 'mythic') return <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded bg-orange-500/90 text-white shadow-sm">M</span>;
      if (r === 'rare') return <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-400/90 text-slate-900 shadow-sm">R</span>;
      if (r === 'uncommon') return <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded bg-slate-400/90 text-white shadow-sm">U</span>;
      return <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded bg-slate-600/90 text-white shadow-sm">C</span>;
    };

    return (
      <div
        className="relative group w-36 sm:w-40 shrink-0 z-10 hover:z-[100] flex flex-col gap-1"
        onMouseEnter={handleMouseEnter}
        onClick={() => window.open(`https://scryfall.com/search?q=!"${encodeURIComponent(card.name)}"`, '_blank')}
      >
        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center truncate px-0.5 leading-tight cursor-pointer">
          {card.name}
        </p>
        <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-105 group-hover:shadow-xl group-hover:z-50 transition-all duration-300 ease-out cursor-pointer">
          <img
            src={getImageUrl(card)}
            alt={card.name}
            className="w-full h-full object-cover"
          />
          {rarityBadge()}
        </div>

        {showRarityLabel && (() => {
          const r = (card.rarity || '').toLowerCase();
          const cls = r === 'mythic' ? 'text-orange-500' : r === 'rare' ? 'text-amber-500' : r === 'uncommon' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500';
          const label = r.charAt(0).toUpperCase() + r.slice(1) || 'Common';
          return <span className={`text-[9px] font-bold text-center block ${cls}`}>{label}</span>;
        })()}

        {/* Side tooltip: image on left, text on right — avoids top/bottom clipping */}
        <div className={`absolute hidden group-hover:flex top-0 w-80 bg-slate-900/95 backdrop-blur-sm text-slate-50 p-3 rounded-xl shadow-2xl border border-slate-700 z-[100] pointer-events-none animate-in fade-in zoom-in-95 duration-150 gap-3 ${
          tooltipSide === 'right' ? 'left-full ml-3 origin-left' : 'right-full mr-3 origin-right'
        }`}>
          <div className="w-20 shrink-0 rounded-lg overflow-hidden self-start aspect-[2.5/3.5]">
            <img src={getImageUrl(card)} alt={card.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex justify-between items-start mb-1 gap-1">
              <h4 className="font-bold text-sm leading-tight">{card.name}</h4>
              <span className="font-mono text-xs whitespace-nowrap bg-slate-800 px-1 py-0.5 rounded flex-shrink-0">{getManaCost(card)}</span>
            </div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 truncate pr-1">{card.type_line}</p>
              <span className="text-[10px] text-slate-500 font-medium capitalize flex-shrink-0">{card.rarity}</span>
            </div>
            <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {getOracleText(card)}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Click to open on Scryfall</p>
          </div>
        </div>
      </div>
    );
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
    const updatedBox = { ...box, name: editFormData.name, setCode: editFormData.setCode, cost: parseFloat(editFormData.cost) || 0, imageUrl: editFormData.imageUrl };
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
          <Link href="/play-box" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Link>
        )}
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          
          {/* Hero Banner Overlay */}
          {(boxInfo.imageUrl || autoHeroImage) && (
            <div className="absolute inset-0 z-0">
              <img src={(boxInfo.imageUrl || autoHeroImage) as string} alt="Banner" className="w-full h-full object-cover opacity-20 dark:opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent dark:from-slate-900/95 dark:via-slate-900/80 dark:to-transparent"></div>
            </div>
          )}

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                {boxInfo.name}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 flex gap-2 items-center">
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                Draft Box
              </span>
              • Set: {boxInfo.setCode} • {boxInfo.remaining} / {boxInfo.total} Packs Remaining
            </p>
          </div>
          <div className="relative z-10 flex gap-3">
            {!isSharedMode && (
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />} 
                {copied ? "Copied Link!" : "Share Link"}
              </button>
            )}
            {!isSharedMode && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold shadow-sm"
              >
                <Settings className="w-4 h-4" /> Edit
              </button>
            )}
            {!isSharedMode && (
              <button 
                onClick={() => alert("Opening packs is disabled in Offline Mode. Please configure Firebase to enable database writes.")}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
              >
                <Package className="w-4 h-4" /> Open Pack
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

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {/* Main Pane: Draft Archetypes */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">

            <div>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" /> Draft Archetypes & Signposts
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Discover the primary draft strategies for this set.</p>
                </div>
                <div className="flex flex-col items-end">
                  {fetchMessage && <span className="text-sm text-cyan-400 mb-2 font-medium">{fetchMessage}</span>}
                  {box && (
                    <button
                      onClick={handleFetchArchetypes}
                      disabled={isFetchingArchetypes}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {isFetchingArchetypes ? 'Refreshing...' : 'Refresh Archetypes'}
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Fetching entire draft environment from Scryfall... This may take a moment.</p>
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
                    
                    return (
                      <div key={archetype.name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative">
                        {/* Top: Archetype Info */}
                        <div className="relative p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-center">
                          {/* Sleek Top Colored Border */}
                          <div className="absolute top-0 left-0 w-full h-2 rounded-t-2xl" style={getArchetypeGradient(archetype.colors)}></div>
                          
                          <div className="flex items-center justify-between mb-3 mt-1">
                            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                              {archetype.colors.map((c, i) => (
                                <React.Fragment key={c}>
                                  <span className="flex items-center gap-1">
                                    <ManaIcon symbol={COLOR_NAME_TO_SYMBOL[c] || c} size={16} />
                                    <span className={getColorStyle(c)}>{c}</span>
                                  </span>
                                  {i < archetype.colors.length - 1 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                                </React.Fragment>
                              ))}
                            </p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shadow-sm ${getTierStyle(tier)}`}>
                              Tier {tier}
                            </span>
                          </div>
                          
                          <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{archetype.name}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">{archetype.desc}</p>
                        </div>
                        
                        {/* Right: Signpost, Rare, and Commons */}
                        <div className="p-6 flex-1 bg-slate-100/50 dark:bg-slate-800/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                             {topCards.signposts.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Signpost Uncommons</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.signposts.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}

                             {topCards.rares.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bomb Rares</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.rares.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}

                             {topCards.removal.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Key Removal</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.removal.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}

                             {topCards.evasion.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Evasion & Threats</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.evasion.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}

                             {topCards.draw.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Card Advantage</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.draw.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}

                             {topCards.commons.length > 0 && (
                               <div>
                                 <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Top Synergistic Commons</h5>
                                 <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                                   {topCards.commons.map(card => (
                                     <CardRenderer key={card.id} card={card} />
                                   ))}
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Pane: Mechanics and Mana Fixing */}
          <div className="space-y-8">
            {/* Set Mechanics Section */}
            {(guideMechanics.length > 0 || mechanics.length > 0) && !loading && !error && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-500" /> Set Mechanics
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* Guide-sourced mechanics first (authoritative, from Wizards prerelease guide) */}
                  {guideMechanics.map(mech => (
                    <div key={`guide-${mech.name}`} className="relative group p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{mech.name}</h4>
                        <div className="flex gap-1 items-center">
                          {mech.colors.map(c => (
                            <ManaIcon key={c} symbol={c} size={20} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{mech.desc}</p>
                    </div>
                  ))}
                  {/* Separator if both sources have data */}
                  {guideMechanics.length > 0 && mechanics.filter(m => !guideMechanics.some(g => g.name.toLowerCase() === m.name.toLowerCase())).length > 0 && (
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pt-1">Also in this set</p>
                  )}
                  {/* Card-scanned mechanics (exclude any already shown from guide) */}
                  {mechanics.filter(m => !guideMechanics.some(g => g.name.toLowerCase() === m.name.toLowerCase())).map(mech => (
                    <div key={mech.name} className="relative group p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl cursor-help">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{mech.name}</h4>
                        <div className="flex gap-1">
                          {mech.colors.length > 0 ? mech.colors.map(c => (
                            <ManaIcon key={c} symbol={c} size={20} />
                          )) : (
                            <span className="text-[10px] text-slate-400 font-medium">Colorless</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        &ldquo;{mech.desc}&rdquo;
                      </p>
                      
                      {/* Tooltip */}
                      {mech.examples.length > 0 && (
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-4 w-max max-w-md bg-slate-900/95 backdrop-blur-sm text-slate-50 p-4 rounded-xl shadow-2xl border border-slate-700 z-[100] pointer-events-none transform origin-bottom animate-in fade-in zoom-in-95 duration-200">
                          <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400" fill="currentColor" /> Top {mech.name} Cards
                          </h5>
                          <div className="flex gap-4 justify-center">
                            {mech.examples.map(card => (
                               <div key={card.id} className="relative aspect-[2.5/3.5] w-24 sm:w-28 rounded-xl overflow-hidden shadow-sm border border-slate-700">
                                 <img src={getImageUrl(card)} alt={card.name} className="w-full h-full object-cover" />
                               </div>
                            ))}
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mana Fixing Section */}
            {manaFixing.length > 0 && !loading && !error && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-emerald-500" /> Mana Fixing Environment
                  </h3>
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {manaFixing.length} Fixers
                  </span>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  {(() => {
                    const lands = manaFixing.filter(c => c.type_line.includes("Land"));
                    const colorlessNoncreature = manaFixing.filter(c =>
                      !c.type_line.includes("Land") &&
                      (!c.colors || c.colors.length === 0) &&
                      (c.type_line.includes("Artifact") || c.type_line.includes("Creature"))
                    );
                    const spells = manaFixing.filter(c =>
                      !c.type_line.includes("Land") &&
                      !((!c.colors || c.colors.length === 0) && (c.type_line.includes("Artifact") || c.type_line.includes("Creature")))
                    );
                    return (
                      <>
                        {lands.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Lands</h5>
                            <div className="grid grid-cols-2 gap-4 justify-items-center">
                              {lands.map(card => <CardRenderer key={card.id} card={card} showRarityLabel />)}
                            </div>
                          </div>
                        )}
                        {colorlessNoncreature.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Artifacts & Colorless</h5>
                            <div className="grid grid-cols-2 gap-4 justify-items-center">
                              {colorlessNoncreature.map(card => <CardRenderer key={card.id} card={card} showRarityLabel />)}
                            </div>
                          </div>
                        )}
                        {spells.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Spells</h5>
                            <div className="grid grid-cols-2 gap-4 justify-items-center">
                              {spells.map(card => <CardRenderer key={card.id} card={card} showRarityLabel />)}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              type="button"
              aria-label="Close modal"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Edit Box Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Box Name</label>
                <input
                  type="text"
                  aria-label="Box Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Set Codes (Comma Separated)</label>
                <input 
                  type="text" 
                  value={editFormData.setCode}
                  onChange={(e) => setEditFormData({...editFormData, setCode: e.target.value})}
                  placeholder="e.g. FIN, FCA"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  You can specify multiple set abbreviations separated by commas (e.g. FIN, FCA) to combine them into one draft environment!
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Hero Image URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    aria-label="Custom Hero Image URL"
                    placeholder="https://... (Leave blank for random Mythic)"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData({...editFormData, imageUrl: e.target.value})}
                    className="w-full pl-9 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Paid Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input 
                    type="number"
                    aria-label="Paid Price"
                    step="0.01"
                    value={editFormData.cost}
                    onChange={(e) => setEditFormData({...editFormData, cost: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Box Paid Price</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">${parseFloat(editFormData.cost || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Market Value (Opened)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${calculateMarketValue()}</span>
                </div>
                <div className="h-px bg-indigo-200 dark:bg-indigo-800/50 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Net Return</span>
                  <span className={`font-bold ${parseFloat(calculateMarketValue()) - parseFloat(editFormData.cost || '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    ${(parseFloat(calculateMarketValue()) - parseFloat(editFormData.cost || '0')).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
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
