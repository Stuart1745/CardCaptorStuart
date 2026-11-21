import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Sets that intentionally have 3-color archetypes
const THREE_COLOR_SETS = new Set(['KTK', 'FRF', 'DTK', 'TDM', 'MOM', 'NEO']);

interface GuideMechanic {
  name: string;
  desc: string;
  colors: string[];
}

// Hardcoded set mechanics from official Wizards prerelease guides.
// Colors indicate which color(s) the mechanic primarily appears in.
const HARDCODED_MECHANICS: Record<string, GuideMechanic[]> = {
  TDM: [
    { name: 'Offspring', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Pay an additional cost when casting a creature to also create a 1/1 token copy of it. Appears across all five colors — every wedge can leverage Offspring for extra bodies and ETB triggers.' },
    { name: 'Harmonize', colors: ['G', 'W'], desc: 'A returning keyword: put a +1/+1 counter on each creature you control that shares a color with a permanent you control. Rewards multicolor wedge builds for snowballing wide boards.' },
    { name: 'Forecast', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Activated abilities on cards in your hand that you can use during your upkeep, revealing the card for the effect. Rewards keeping powerful spells in hand rather than casting them immediately.' },
    { name: 'Wedge Signposts', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'TDM is a three-color wedge set. Each of the five wedges (Abzan, Jeskai, Sultai, Mardu, Temur) has a multicolor uncommon signpost defining its strategy. Draft for your wedge\'s strengths.' },
  ],
  ECL: [
    { name: 'Clash', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Each clashing player reveals the top card of their library; the player with the higher mana cost wins the clash and gets a bonus effect. Appears in all colors — high-cost decks clash more reliably.' },
    { name: 'Changeling', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'This creature is every creature type simultaneously. Changeling creatures count as Merfolk, Faerie, Elf, Goblin, Kithkin, and more — enabling cross-tribal synergies in any deck.' },
    { name: 'Evoke', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Pay the evoke cost instead of the mana cost to cast the creature for a cheaper ETB effect, then sacrifice it. Appears across all colors in Elemental-themed strategies for efficient one-shot value.' },
    { name: 'Prowl', colors: ['U', 'B'], desc: 'If you\'ve dealt combat damage with a creature of the right type this turn, you may cast a spell for its prowl cost instead. Primarily Blue/Black — rewards aggressive Faerie and Rogue strategies.' },
    { name: 'Reinforce', colors: ['W', 'G', 'R'], desc: 'Discard this card and pay the reinforce cost to put +1/+1 counters on a target creature. Creatures discarded for reinforce still provide value — a key enabler in White/Green midrange.' },
  ],
  UNF: [
    { name: 'Stickers', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Stickers are physical stickers placed on cards. Name stickers add words to card names for bonus effects; art stickers change a card\'s art; power/toughness stickers grow creatures; ability stickers grant keywords. You draft a sticker sheet at the start.' },
    { name: 'Attractions', colors: ['U', 'G', 'R'], desc: 'Attraction cards are an Unfinity-specific mini-deck. When you "open an attraction," put the top card of your Attraction deck onto the battlefield. At the start of your first main phase, roll a die — if the result matches a lit number on one of your Attractions, it triggers its ability.' },
    { name: 'Roll to Visit', colors: ['U', 'G', 'R'], desc: 'A subset of cards that let you roll a die and visit your Attractions based on the result. Higher-variance decks benefit most from multiple Attractions in play simultaneously.' },
  ],
  TLA: [
    { name: 'Waterbend', colors: ['U', 'B'], desc: 'A cycle of activated abilities that trigger value when used — card draw, removal, or other effects. Waterbend cards are the backbone of the Blue-Black archetype and appear across all water-aligned strategies.' },
    { name: 'Earthbend', colors: ['R', 'G', 'B'], desc: 'Earthbending animates lands into creatures (often until end of turn) or places +1/+1 counters on your creatures. Central to Red-Green ramp and Black-Green counters archetypes.' },
    { name: 'Ally', colors: ['G', 'W', 'R'], desc: 'Ally is a creature subtype. When an Ally enters, other Allies — and Ally-payoff permanents — trigger bonus effects. Core to the Green-White and Red-White go-wide strategies.' },
    { name: 'Lessons', colors: ['U', 'R', 'G'], desc: 'Lesson spells interact with the graveyard — some gain bonus effects when cast from there, others recur themselves. Key engine in Blue-Red (Combat Lessons) and Green-Blue (Ramp & Lessons).' },
    { name: 'Investigate', colors: ['W', 'U'], desc: 'Creates a Clue artifact token. Sacrifice the Clue and pay {2} to draw a card. Fuels the Blue-Black "draw two" engine and synergizes with the White-Blue flyers archetype.' },
  ],
  FIN: [
    { name: 'Job Select', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Job Select appears on permanents across all five colors. Each card with Job Select lets you choose one of several modes — each representing a classic Final Fantasy job class (Black Mage, White Mage, Monk, etc.) — giving it flexibility based on your board state.' },
    { name: 'Limit Break', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Limit Break cards are double-faced permanents that transform into a more powerful form after meeting a condition, referencing the Limit Break mechanic from the Final Fantasy video games. Appears across all colors.' },
    { name: 'Town', colors: [], desc: 'Towns are a new dual land subtype. Each Town enters tapped unless you control a basic land of the right type, then produces two colors of mana and often has a bonus enters ability. They function as the set\'s primary mana fixing.' },
    { name: 'Sagas', colors: [], desc: 'Enchantments with lore counters that trigger on your upkeep. Each chapter has an effect; when the final chapter resolves, the Saga is sacrificed. Sagas appear across all colors in FIN.' },
    { name: 'Equipment', colors: ['W', 'R'], desc: 'Equipment is a returning artifact subtype — attach to a creature for combat bonuses, and it stays on the battlefield when the creature dies. Primarily found in White and Red, supporting the R/W Equipment Aggro archetype.' },
  ],
  // Secrets of Strixhaven — Wizards mechanics article; college colors inferred from the guide.
  SOS: [
    { name: 'Repartee', colors: ['W', 'B'], desc: 'Silverquill: triggers when you cast an instant or sorcery that targets a creature, and resolves before that spell. Back your creatures with tricks or remove theirs.' },
    { name: 'Opus', colors: ['U', 'R'], desc: 'Prismari: triggers when you cast an instant or sorcery, with a bigger or extra effect if you spent 5 or more mana on it.' },
    { name: 'Infusion', colors: ['B', 'G'], desc: 'Witherbloom: bonus effect if you gained life at any point this turn. Pest tokens and lifegain spells switch it on.' },
    { name: 'Flashback', colors: ['R', 'W'], desc: 'Lorehold (returning): cast the card from your graveyard for its flashback cost, then exile it. Discarding flashback cards still lets you cast them later.' },
    { name: 'Increment', colors: ['G', 'U'], desc: 'Quandrix: when you cast a spell and the mana spent is greater than this creature\'s power or toughness, put a +1/+1 counter on it.' },
    { name: 'Prepare', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'A prepared creature puts a one-time castable copy of its linked spell in exile. The copy is lost if the creature leaves or becomes unprepared.' },
    { name: 'Paradigm', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'One mythic Lesson sorcery per color: the first time it resolves it is exiled, then you may cast a free copy of it in each of your first main phases.' },
  ],
  // Marvel Super Heroes — Wizards mechanics article; color notes from the guide and Draftsim.
  MSH: [
    { name: 'Teamwork', colors: ['W', 'U'], desc: 'Optional extra cost on instants and sorceries: tap untapped creatures with enough total power to get the bonus or upgraded mode. Core of W/U, with commons in every color.' },
    { name: 'Power-up', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'One-time activated ability that adds +1/+1 counters and sometimes more; it costs less if the creature entered this turn. In every color, leaning R/G.' },
    { name: 'Plan', colors: ['B'], desc: 'Enchantment subtype that gains counters on a trigger and is sacrificed at a set total for a bigger payoff. Central to the B/R Villains deck.' },
    { name: 'Connive', colors: ['U', 'B'], desc: 'Draw a card, then discard a card; if you discarded a nonland card, put a +1/+1 counter on this creature. Feeds U/B "draw your second card".' },
    { name: 'Prowess', colors: ['R', 'W'], desc: 'Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn. Payoff for the R/W noncreature spells deck.' },
  ],
  // Reality Fracture — Wizards mechanics article; colors from the guide and Draftsim.
  // Archetypes come automatically from the Wizards guide scrape (all ten pairs).
  FRA: [
    { name: 'Empower Jace', colors: ['G', 'U'], desc: 'Put loyalty counters on your Jace planeswalker token, creating a blue Jace token first if you have none. Jace tokens have "-1: Surveil 1" and "-3: Draw a card." Home of G/U, with support in W and B.' },
    { name: 'Heartwood Tokens', colors: ['R', 'G'], desc: 'Red-green artifact tokens that tap for mana. R/G uses them to ramp into a top-heavy curve of big creatures.' },
    { name: 'Prepare', colors: ['W', 'U', 'B', 'R', 'G'], desc: 'Returning from Strixhaven: a prepared creature lets you cast a copy of its linked spell from exile. Each color pair has its own prepare spell.' },
    { name: 'Echoed Pairs', colors: [], desc: 'Paired Echoverse versions of iconic cards; every Play Booster has three echoed-pair slots.' },
    { name: 'Surveil / Scry', colors: ['W', 'U'], desc: 'Filter the top of your library to set up threats. The engine of W/U Fatehold Surveil Aggro.' },
  ],
  // Star Trek — Wizards mechanics article; colors inferred from the guide's archetypes.
  // Archetypes come automatically from the Wizards guide scrape (all ten pairs).
  TRK: [
    { name: 'Spacecraft / Station', colors: ['W', 'U'], desc: 'Spacecraft are artifacts that become creatures once they have enough charge counters. Station: at sorcery speed, tap another creature to add charge counters equal to its power.' },
    { name: 'Face a Dilemma', colors: ['U', 'B'], desc: 'Happens whenever you choose one or more modes for a modal spell or ability — even if the spell is countered. Payoffs power U/B Dilemma Control.' },
    { name: 'Assimilate', colors: ['W', 'B'], desc: 'Take a card into your control as a Borg artifact creature with a +1/+1 counter; it loses its other creature types. Core of W/B Borg.' },
    { name: 'Strange New Worlds', colors: ['G', 'U'], desc: 'Ability word that counts the differently named lands you control. G/U plays Planet and Anomaly lands to max it out.' },
    { name: 'Beam Me Up', colors: [], desc: 'Cast a spell from your graveyard by returning one of your creatures to your hand; the spell is exiled afterward.' },
    { name: 'Federation', colors: [], desc: 'Ability word that counts the distinct creature types among your non-Borg creatures. On about six cards, mostly rares and mythics.' },
    { name: 'Landfall', colors: ['R', 'G'], desc: 'Returning: triggers whenever a land enters under your control. R/G Away Team builds around it.' },
  ],
  // The Hobbit — Wizards prerelease guide + vision design article. Five two-color archetypes only.
  HOB: [
    { name: 'Recruit', colors: ['W', 'U'], desc: 'New keyword action: draw a card, then discard a card. If you discarded a nonland card, create a 1/1 white Human Soldier token. Fuels the W/U Humans "draw two cards in a turn" deck.' },
    { name: 'Storied', colors: ['R', 'W'], desc: 'New: rewards controlling three or more artifacts, legendary permanents and/or Sagas. The engine of the R/W Dwarves deck — count Equipment, legendary Dwarves and Sagas toward it.' },
    { name: 'Amass Goblins', colors: ['B', 'R'], desc: 'Returning from LTR with Goblins in place of Orcs: put +1/+1 counters on your Army token, creating a 0/0 Goblin Army first if you have none. B/R grows the Army and sacrifices it for value.' },
    { name: 'Ferocious', colors: ['B', 'G'], desc: 'Returning: bonus effects if you control a creature with power 4 or greater. B/G Wolves ramps into a big body early to switch these on.' },
    { name: 'Landfall', colors: ['G', 'U'], desc: 'Returning: triggers whenever a land enters under your control. The G/U Elves deck uses it to control the board and shut down opposing creatures.' },
    { name: 'Adventure', colors: [], desc: 'Returning ("There and Back Again"): cast the instant/sorcery half first, then cast the creature later from exile — two cards of value from one.' },
  ],
};

// Hardcoded archetypes for sets where Draftsim coverage is missing or wrong.
// Source: official Wizards prerelease guides + community analysis.
const HARDCODED_ARCHETYPES: Record<string, Omit<Archetype, 'source'>[]> = {
  TLA: [
    { name: "Air Nomads — Flying Finishers", colors: ["White", "Blue"], desc: "Build an air force of flying creatures, pump them for finishing blows, and soar over the opposition. Investigate for card advantage to stay ahead on resources while pressing the skies." },
    { name: "Water Tribe — Draw Two", colors: ["Blue", "Black"], desc: "Generate Clue tokens, trigger Waterbend abilities, and draw two cards at a time for overwhelming card advantage. Control the pace and bury opponents in value." },
    { name: "Fire Nation — Aggro Tokens", colors: ["Black", "Red"], desc: "The most aggressive archetype: flood the board with creature tokens and convert them into direct damage. The relentless pressure of Fire Nation offense closes games before opponents stabilize." },
    { name: "Earth Rumble — Ramp", colors: ["Red", "Green"], desc: "Use Earthbending to turn lands into creatures for surprise blocks and attacks, while ramping into oversized green threats ahead of schedule. Land acceleration powers an unstoppable late game." },
    { name: "Southern Raiders — Allies", colors: ["Green", "White"], desc: "Ally tribal rewards every new creature with ETB bonuses that snowball across the whole team. Go wide with an army of Allies and overwhelm opponents who can't keep pace." },
    { name: "Dai Li — Sacrifice", colors: ["White", "Black"], desc: "Set up death triggers, manufacture sacrifice fodder, and grind out recursive value effects. Every creature death fuels another threat, making this archetype resilient to removal." },
    { name: "Combat Lessons", colors: ["Blue", "Red"], desc: "Aggressive combat combined with Lesson spells that reward both attacking and graveyard interaction. Tempo attacks enable Lesson payoffs for a hybrid aggressive-value strategy." },
    { name: "Earthbending Counters", colors: ["Black", "Green"], desc: "Earthbend counters onto your creatures to 'arm' them with +1/+1 and power through combat. Finishers grow enormous via counter accumulation while black removal clears the path." },
    { name: "Nations United — Go Wide", colors: ["Red", "White"], desc: "Combine Ally token generation with red aggro spells and combat tricks. Deploy a wide board, trigger Ally synergies, and use red removal to push through the final points of damage." },
    { name: "Avatar Ramp — Lessons", colors: ["Green", "Blue"], desc: "Search out lands, build mana acceleration, and set up unblockable payoffs. Lessons in the graveyard provide repeated value while large late-game spells close out the game." },
  ],
  NEO: [
    { name: "Vehicles / Pilots", colors: ["White", "Blue"], desc: "Crew powerful vehicles using cheap pilot creatures to push massive damage. Artifacts and pilots synergize to apply early pressure." },
    { name: "Ninjutsu / Rogue", colors: ["Blue", "Black"], desc: "Sneak unblockable creatures through and swap them with Ninjas for powerful combat damage triggers. Rogue tribal provides additional payoffs." },
    { name: "Artifact Sacrifice", colors: ["Black", "Red"], desc: "Generate cheap artifact tokens and sacrifice them to fuel powerful engines. Menace creatures and sacrifice outlets create consistent pressure." },
    { name: "Modified / Aggro", colors: ["Red", "Green"], desc: "Equip, enchant, or put counters on your creatures to make them huge and trigger 'modified' synergies. Equipment and auras push through combat." },
    { name: "Enchantments / Go Wide", colors: ["Green", "White"], desc: "Build an army of enchantment creatures and stack auras to overwhelm the board. Token generation supports the wide strategy." },
    { name: "Artifacts & Enchantments", colors: ["White", "Black"], desc: "Balance artifacts and enchantments to trigger synergistic value engines. Removal and recursion keep the engine running." },
    { name: "Artifacts / Spells", colors: ["Blue", "Red"], desc: "Synergize cheap artifacts with powerful spells to build massive mechanical threats. Improvise and spell-based payoffs close games." },
    { name: "Ninjas / Recursion", colors: ["Black", "Green"], desc: "Grind out the long game with recursion and value-generating Ninjas. Channel abilities provide flexible early game plays." },
    { name: "Samurai / Warriors", colors: ["Red", "White"], desc: "Attack with a single, heavily buffed Samurai to trigger powerful 'attacks alone' abilities. Reconfigure artifacts provide versatility." },
    { name: "Channel / Ramp", colors: ["Green", "Blue"], desc: "Discard large creatures for their channel abilities early, then cast them late game. Green ramp enables the enormous payoffs." },
  ],
  ECL: [
    { name: "Merfolk Tempo", colors: ["White", "Blue"], desc: "Tempo-oriented deck using Merfolk and Convoke to overwhelm opponents before they stabilize. Tribal synergies pump the whole team." },
    { name: "Kithkin Aggro", colors: ["Green", "White"], desc: "Go-wide aggressive deck focusing on battlefield presence. Kithkin tribal generates tokens and buffs the whole team." },
    { name: "Goblins / Sacrifice", colors: ["Black", "Red"], desc: "Aggressive deck centered on Blight and sacrifice synergies. Cheap Goblins flood the board and sacrifice for value." },
    { name: "Elves / Graveyard", colors: ["Black", "Green"], desc: "Graveyard-synergy midrange deck. Elves ramp early, and the deck grinds the late game with recursion and persist." },
    { name: "Elementals / Spells", colors: ["Blue", "Red"], desc: "Setup-and-payoff deck for casting spells with MV 4 or greater. Elemental tribal payoffs reward expensive spells." },
    { name: "Faerie Flash", colors: ["Blue", "Black"], desc: "Tempo/control deck that rewards playing at instant speed. Faerie tribal punishes opponents who tap out on their turn." },
    { name: "Orzhov Attrition", colors: ["White", "Black"], desc: "Midrange deck using Blight to weaken opposing creatures. Grind out value through removal and recursion." },
    { name: "Boros Aggro", colors: ["Red", "White"], desc: "Aggressive archetype utilizing combat tricks and efficient threats. Get under the opponent fast and close with burn." },
    { name: "Vivid Ramp", colors: ["Green", "Blue"], desc: "Focuses on the Vivid mechanic for mana fixing and scaling into huge late-game threats." },
    { name: "Vivid Midrange", colors: ["Red", "Green"], desc: "Leverages the Vivid mechanic for fixing and plays midrange threats with strong enters-the-battlefield effects." },
  ],
  UNF: [
    { name: "Name Stickers", colors: ["White", "Blue"], desc: "Add words to card names to trigger bonuses. Sticker Wizard gives permanents extra bonuses based on their names." },
    { name: "Precision Die-Rolling", colors: ["Blue", "Black"], desc: "Use dice rolling for controlling effects and value generation. High rolls generate card advantage and removal." },
    { name: "High-Roll Build-Up", colors: ["Black", "Red"], desc: "Succeed on high dice rolls to generate powerful effects. Aggressive creatures threaten lethal when you hit good numbers." },
    { name: "Art Stickers", colors: ["Blue", "Red"], desc: "Use art stickers and spell-casting synergies. Combo-oriented deck that generates value through sticker synergies." },
    { name: "Hats Matter", colors: ["White", "Black"], desc: "Aggressive archetype rewarding creatures with hats. Sticker synergies buff the whole team when equipped with the right accessories." },
    { name: "Attractions", colors: ["Black", "Green"], desc: "Generate value by opening and visiting Attractions. Consistent Attraction triggers grind out opponents over time." },
    { name: "Clown Robot Aggro", colors: ["Red", "White"], desc: "Aggressive tribal strategy focused on Clown creatures and artifact synergies. Overwhelm before opponents can stabilize." },
    { name: "P/T Stickers", colors: ["Green", "Blue"], desc: "Stompy deck using power/toughness stickers to grow creatures into massive threats that demand immediate answers." },
    { name: "Mass Die-Rolling", colors: ["Red", "Green"], desc: "Roll many dice at once to overwhelm the opponent with sheer volume of triggers and random beneficial effects." },
    { name: "Ability Stickers", colors: ["Green", "White"], desc: "Put ability stickers on creatures to give them keywords and go tall. A single huge threat with multiple abilities closes the game." },
  ],
  KTK: [
    { name: "Abzan / Outlast", colors: ["White", "Black", "Green"], desc: "Grind out the long game with +1/+1 counters and resilient creatures. Outlast builds a snowballing board that never stops growing." },
    { name: "Jeskai / Prowess", colors: ["Blue", "Red", "White"], desc: "Chain non-creature spells to buff your team with Prowess triggers and push through damage each combat step." },
    { name: "Sultai / Delve", colors: ["Black", "Green", "Blue"], desc: "Fill your graveyard to cast massive Delve threats ahead of schedule. Graveyard density unlocks enormous mana efficiency." },
    { name: "Mardu / Raid", colors: ["Red", "White", "Black"], desc: "Aggressively attack to trigger powerful Raid bonuses. Fast threats and removal clear the way for constant pressure." },
    { name: "Temur / Ferocious", colors: ["Green", "Blue", "Red"], desc: "Deploy huge 4-power creatures to unlock powerful Ferocious abilities. Ramp accelerates into game-ending threats early." },
  ],
  MH2: [
    { name: "Artifacts / Affinity", colors: ["White", "Blue"], desc: "Utilize artifact synergies, token generation, and affinity payoffs. Modular counters spread across the artifact team on death." },
    { name: "Reanimator", colors: ["White", "Black"], desc: "Discard large creatures and return them to the battlefield for massive tempo advantage. Recursion provides resilience to removal." },
    { name: "Surveil / Self-Discard", colors: ["Blue", "Black"], desc: "Manage the graveyard and utilize self-discard effects. Fill the bin to enable powerful graveyard payoffs." },
    { name: "Delirium", colors: ["Blue", "Red"], desc: "Achieve delirium by filling your graveyard with multiple card types to unlock powerful spell payoffs." },
    { name: "Madness / Aggro", colors: ["Black", "Red"], desc: "Aggressively utilize madness cards and discard outlets. Get double value from cards by casting them on the way to the bin." },
    { name: "Squirrels / Sacrifice", colors: ["Black", "Green"], desc: "Generate Squirrel tokens and leverage sacrifice value. A massive Squirrel army supported by sacrifice payoffs overwhelms opponents." },
    { name: "Storm / Spells", colors: ["Red", "Green"], desc: "Use cheap spells and madness to enable storm turns. A critical mass of spells creates explosive game-ending finishes." },
    { name: "+1/+1 Counters", colors: ["Green", "White"], desc: "Focus on modular and +1/+1 counter synergies. Persist and undying creatures provide inevitable recursive threats." },
    { name: "Tokens / Value", colors: ["Green", "Blue"], desc: "Generate various token types and play for midrange value. Token variety enables powerful cross-synergies." },
    { name: "Modular / Artifact Aggro", colors: ["Red", "White"], desc: "An aggressive deck utilizing modular creatures and artifact synergies. Counters spread on death to maintain relentless pressure." },
  ],
  FIN: [
    { name: 'W/U Artifacts', colors: ['White', 'Blue'], desc: 'Assemble a massive board of artifacts — artifact creatures, Equipment, Treasures, and more. Key cards: Tidus, Blitzball Star grows with artifact tokens; Cid, Timeless Artificer supports artifact creatures.' },
    { name: 'U/B Control', colors: ['Blue', 'Black'], desc: 'Accrue value from the graveyard while playing defensively. Locke Cole enables card draw via discard; Ultimecia, Time Sorceress takes extra turns fueled by discarded resources.' },
    { name: 'B/R Black Mage Aggro', colors: ['Black', 'Red'], desc: 'Cast noncreature spells to deal devastating damage. Black Waltz No. 3 and Wizard tokens convert spells into direct damage; Garland, Knight of Cornelia closes out games.' },
    { name: 'R/G Landfall Aggro', colors: ['Red', 'Green'], desc: 'Transform lands into tide-turning tempo. Rydia, Summoner of Mist searches and recurs creatures; Gladiolus Amicitia applies consistent pressure every turn.' },
    { name: 'G/W Go Wide', colors: ['Green', 'White'], desc: 'Flood the board with creature tokens, then attack for the win. Rinoa Heartilly rewards wide boards; Garnet, Princess of Alexandria powers Saga-focused variants.' },
    { name: 'W/B Sacrifice', colors: ['White', 'Black'], desc: 'Turn permanents into resources through sacrifice synergies. Rufus Shinra generates tokens on attacks; Judge Magister Gabranth provides sacrifice payoffs.' },
    { name: 'U/R Big Noncreatures', colors: ['Blue', 'Red'], desc: 'Cast massive spells for massive value. Shantotto, Tactician Magician and The Emperor of Palamecia reward high-mana spells, synergizing with tiered spells and flashback.' },
    { name: 'B/G Graveyard Value', colors: ['Black', 'Green'], desc: 'Stock the graveyard with permanents to supercharge spells. Exdeath, Void Warlock transforms into threats; Cloud of Darkness provides removal that goes on offense.' },
    { name: 'R/W Equipment Aggro', colors: ['Red', 'White'], desc: 'Suit up creatures with powerful Equipment to dominate combat. Zidane, Tantalus Thief benefits from gear; Giott, King of the Dwarves generates value through the job select mechanic.' },
    { name: 'G/U Town Ramp', colors: ['Green', 'Blue'], desc: 'Play Towns to squeeze extra value from lands. Ignis Scientia accelerates mana; Omega, Heartless Evolution is the late-game payoff after building Town synergies.' },
  ],
  // Secrets of Strixhaven — five college archetypes (prerelease guide).
  SOS: [
    { name: 'Silverquill — Repartee Aggro', colors: ['White', 'Black'], desc: 'Target creatures with your own spells — tricks on yours, removal on theirs — to trigger repartee. Balance creatures with targeting spells. Signposts: Abigale, Poet Laureate; Snooping Page.' },
    { name: 'Prismari — Opus Spellcasting', colors: ['Blue', 'Red'], desc: 'Cast lots of instants and sorceries and reach 5+ mana for opus bonuses; mana creatures help pay for the big spells. Signposts: Sanar, Unfinished Genius; Spectacular Skywhale.' },
    { name: 'Witherbloom — Lifegain Swarm', colors: ['Black', 'Green'], desc: 'Gain life every turn to switch on infusion; Pest tokens gain life and still attack. Signposts: Lluwen, Exchange Student; Old-Growth Educator.' },
    { name: 'Lorehold — Flashback Excavation', colors: ['Red', 'White'], desc: 'Cast spells from hand, then again from the graveyard; Archaeologists trigger when cards leave your graveyard. Signposts: Kirol, History Buff; Molten Note.' },
    { name: 'Quandrix — Incremental Value', colors: ['Green', 'Blue'], desc: 'Green creatures grow off big blue spells through increment, and evasion carries the damage. Signposts: Tam, Observant Sequencer; Fractal Tender.' },
  ],
  // Marvel Super Heroes — all ten pairs (prerelease guide).
  MSH: [
    { name: 'White-Blue Teamwork', colors: ['White', 'Blue'], desc: 'Teamwork spells plus creatures to tap for them, fed by token makers. Signposts: Captain America, Living Legend; Spider-Woman, Secret Agent.' },
    { name: 'Blue-Black Draw Second Card', colors: ['Blue', 'Black'], desc: 'Draw two cards a turn with cheap draw and connive; instant-speed draw works on the opponent\'s turn. Signposts: Kang, Temporal Tyrant; Ghost, Spectral Saboteur.' },
    { name: 'Black-Red Villains Matter', colors: ['Black', 'Red'], desc: 'Build up Villain tokens and cash in black Plan enchantments. Signposts: Madame Hydra; Bullseye, Death Dealer.' },
    { name: 'Red-Green Power-Up', colors: ['Red', 'Green'], desc: 'Power-up creatures grow big enough to push through blockers. Signposts: Hulk, Gamma Goliath; Abomination, Terrifying Titan.' },
    { name: 'Green-White Heroes Matter', colors: ['Green', 'White'], desc: 'Go wide with Heroes; Hero token makers keep triggering the payoffs. Signposts: Black Panther, Vanguard; Spider-Man, To the Rescue.' },
    { name: 'White-Black Attack Alone', colors: ['White', 'Black'], desc: 'Attack with one well-equipped creature backed by tricks. Signposts: Black Widow, Double Agent; U.S.Agent, John Walker.' },
    { name: 'Blue-Red Artifacts', colors: ['Blue', 'Red'], desc: 'A dense artifact count with Treasure, Clue and Robot Villain tokens. Signposts: Iron Man, Master of Machines; Speedball, New Warrior.' },
    { name: 'Black-Green Creatures in Graveyard', colors: ['Black', 'Green'], desc: 'Self-mill and cycle creatures; payoffs switch on with 2+ creature cards in your graveyard. Signposts: Killmonger, Scourge of Wakanda; Titania, Rugged Rumbler.' },
    { name: 'Red-White Noncreature Spells', colors: ['Red', 'White'], desc: 'Cheap noncreature spells grow prowess creatures. Signposts: Thor Odinson; War Machine, Legacy of Iron.' },
    { name: 'Green-Blue +1/+1 Counters', colors: ['Green', 'Blue'], desc: 'Evasive creatures grow from instants and sorceries and are protected by hexproof or indestructible. Signposts: Ant-Man, Colony Commander; Beast, Erudite Aerialist.' },
  ],
  // The Hobbit — only five supported pairs (prerelease guide: "There are five two-color draft archetypes").
  HOB: [
    { name: 'White-Blue Humans', colors: ['White', 'Blue'], desc: 'Draw two cards in a turn, recruit Human Soldier tokens, then pump the team and attack. Key cards: Bard the Bowman (signpost), Esgaroth Garrison, Thorin\'s Last Stand.' },
    { name: 'Black-Red Goblins', colors: ['Black', 'Red'], desc: 'Amass a Goblin Army, sacrifice it and other creatures for value, and grind with dies triggers. Key cards: Bolg of the North and Misty Mountains Raider (signposts), Stir Up Trouble.' },
    { name: 'Black-Green Wolves', colors: ['Black', 'Green'], desc: 'Ramp into a power 4+ creature early to turn on ferocious, then overpower the board. Key cards: The Chief Warg and Nighthowl Pursuer (signposts), Beorn, Reluctant Host.' },
    { name: 'Red-White Dwarves', colors: ['Red', 'White'], desc: 'Assemble three or more artifacts, legendaries and Sagas to enable storied, with Equipment to win combat. Key cards: Thorin Oakenshield, Iron Hills Blacksmith, Dori, Bearer of Friends.' },
    { name: 'Green-Blue Elves', colors: ['Green', 'Blue'], desc: 'A controlling landfall deck that locks down opposing creatures while building advantage from land drops. Key cards: Silvan Reveler and Mirkwood Pathmaker (signposts), Thranduil, Sindarin Liege.' },
  ],
};

// Maps set codes → Wizards prerelease guide slug.
// Pattern: https://magic.wizards.com/en/news/feature/{slug}
// Add new sets here as guides are published.
const WIZARDS_GUIDE_SLUGS: Record<string, string> = {
  TRK: 'star-trek-prerelease-guide',
  FRA: 'reality-fracture-prerelease-guide',
  HOB: 'the-hobbit-prerelease-guide',
  MSH: 'marvel-super-heroes-prerelease-guide',
  SOS: 'secrets-of-strixhaven-prerelease-guide',
  TLA: 'avatar-the-last-airbender-prerelease-guide',
  FIN: 'final-fantasy-prerelease-guide',
  TDM: 'tarkir-dragonstorm-prerelease-guide',
  DSK: 'duskmourn-house-of-horror-prerelease-guide',
  BLB: 'bloomburrow-prerelease-guide',
  OTJ: 'outlaws-of-thunder-junction-prerelease-guide',
  MKM: 'murders-at-karlov-manor-prerelease-guide',
  LCI: 'lost-caverns-of-ixalan-prerelease-guide',
  WOE: 'wilds-of-eldraine-prerelease-guide',
  LTR: 'lord-of-the-rings-tales-of-middle-earth-prerelease-guide',
  MOM: 'march-of-the-machine-prerelease-guide',
};

/** Guess a set's Wizards prerelease guide slug from its Scryfall name. */
async function deriveGuideSlug(setCode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.scryfall.com/sets/${setCode.toLowerCase()}`, {
      headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const { name } = await res.json() as { name?: string };
    if (!name) return null;
    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}-prerelease-guide`;
  } catch {
    return null;
  }
}

const SYMBOL_TO_NAME: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
};

// Guild/wedge/shard → canonical colors (keys must be exact whole words)
const GUILD_COLORS: Record<string, string[]> = {
  azorius: ['White', 'Blue'], dimir: ['Blue', 'Black'], rakdos: ['Black', 'Red'],
  gruul: ['Red', 'Green'], selesnya: ['Green', 'White'], orzhov: ['White', 'Black'],
  izzet: ['Blue', 'Red'], golgari: ['Black', 'Green'], boros: ['Red', 'White'],
  simic: ['Green', 'Blue'],
  // 3-color — only used when allowThreeColor is true
  abzan: ['White', 'Black', 'Green'], jeskai: ['Blue', 'Red', 'White'],
  sultai: ['Black', 'Green', 'Blue'], mardu: ['Red', 'White', 'Black'],
  temur: ['Green', 'Blue', 'Red'], esper: ['White', 'Blue', 'Black'],
  grixis: ['Blue', 'Black', 'Red'], jund: ['Black', 'Red', 'Green'],
  naya: ['Red', 'Green', 'White'], bant: ['Green', 'White', 'Blue'],
};

const COLOR_NAMES = ['white', 'blue', 'black', 'red', 'green'] as const;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .trim();
}

/**
 * Detect color pair from heading text.
 * Priority order:
 *  1. Mana symbols {W}{U}
 *  2. Written pairs "White/Blue", "White-Blue"
 *  3. Single-letter pairs "W/U"
 *  4. Guild names as whole words (\bAzorius\b)
 *  5. Individual color names as whole words
 */
function inferColors(text: string, allowThreeColor: boolean): string[] | null {
  // 1. Mana symbol patterns: {W}{U} or {W}/{U}
  const symbolHits = [...text.matchAll(/\{([WUBRG])\}/gi)].map(m => m[1].toUpperCase());
  const uniqueSymbols = [...new Set(symbolHits)].filter(s => s in SYMBOL_TO_NAME);
  if (uniqueSymbols.length === 2 || (allowThreeColor && uniqueSymbols.length === 3)) {
    return uniqueSymbols.map(s => SYMBOL_TO_NAME[s]);
  }

  // 2. Written color pair: "White/Blue", "White-Blue", "White and Blue"
  const writtenPair = text.match(
    new RegExp(`\\b(${COLOR_NAMES.join('|')})[\\s/\\-–—]+(${COLOR_NAMES.join('|')})\\b`, 'i')
  );
  if (writtenPair) {
    const c1 = writtenPair[1].toLowerCase();
    const c2 = writtenPair[2].toLowerCase();
    if (c1 !== c2) {
      return [c1[0].toUpperCase() + c1.slice(1), c2[0].toUpperCase() + c2.slice(1)];
    }
  }

  // 3. Symbol pair: "W/U", "WU" at word boundary
  const symbolPair = text.match(/\b([WUBRG])\/([WUBRG])\b/i);
  if (symbolPair) {
    return [SYMBOL_TO_NAME[symbolPair[1].toUpperCase()], SYMBOL_TO_NAME[symbolPair[2].toUpperCase()]];
  }

  // 4. Guild/wedge/shard names as whole words only
  for (const [guild, colors] of Object.entries(GUILD_COLORS)) {
    if (!allowThreeColor && colors.length > 2) continue;
    if (new RegExp(`\\b${guild}\\b`, 'i').test(text)) return colors;
  }

  // 5. Individual color names as whole words — accept exactly 2 (or 3 if allowed)
  const found = new Set<string>();
  for (const name of COLOR_NAMES) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.add(name[0].toUpperCase() + name.slice(1));
  }
  if (found.size === 2 || (allowThreeColor && found.size === 3)) return Array.from(found);

  return null;
}

function extractTextAfterHeading(html: string, afterIndex: number, maxChars = 500): string {
  const slice = html.slice(afterIndex);
  const nextHeadingIdx = slice.search(/<h[1-4][^>]*>/i);
  const section = slice.slice(0, nextHeadingIdx === -1 ? undefined : nextHeadingIdx);

  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = paragraphRegex.exec(section)) !== null && parts.join(' ').length < maxChars) {
    const text = stripHtml(m[1]).replace(/\s+/g, ' ').trim();
    if (text.length > 30) parts.push(text);
    if (parts.length >= 3) break;
  }

  const combined = parts.join(' ');
  if (combined.length <= maxChars) return combined;
  const cut = combined.slice(0, maxChars);
  return cut.slice(0, cut.lastIndexOf(' ')) + '...';
}

const NAME_TO_SYMBOL: Record<string, string> = {
  White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G',
};

const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

function colorsTo17LandsKey(colors: string[]): string {
  const symbols = colors.map(c => NAME_TO_SYMBOL[c] || c[0].toUpperCase());
  return symbols
    .sort((a, b) => (WUBRG_ORDER[a] ?? 9) - (WUBRG_ORDER[b] ?? 9))
    .join('');
}

interface Archetype {
  name: string;
  colors: string[];
  desc: string;
  source?: string;
  tier?: string;
}

interface CardRating {
  name: string;
  /** Games-in-hand win rate (GIH WR), 0..1 */
  winRate: number;
  gihGames: number;
  gpWr?: number | null;
  iwd?: number | null;
  /** Average pick taken at (1 = first pick) */
  ata?: number;
}

interface LimitedStats {
  set: string;
  games: number;
  generatedAt: string;
  source: { name: string; url: string; license: string; gameDataModified?: string };
  colorPairs: Record<string, { winRate: number | null; games: number }>;
  cards: Record<string, { gihWr: number | null; gihGames: number; gpWr: number | null; iwd: number | null; ata?: number }>;
}

/**
 * Precomputed stats from 17Lands' PUBLIC datasets (CC BY 4.0) — built weekly by
 * scripts/build_limited_stats.py into data/limited-stats/{SET}.json. 17Lands permits
 * outside use only of the public datasets, so the app no longer calls its site APIs.
 */
async function loadLimitedStats(setCode: string): Promise<LimitedStats | null> {
  if (!/^[A-Z0-9]{2,6}$/.test(setCode)) return null; // set code is used in a file path
  try {
    const raw = await readFile(path.join(process.cwd(), 'data', 'limited-stats', `${setCode}.json`), 'utf8');
    return JSON.parse(raw) as LimitedStats;
  } catch {
    return null; // no public data for this set yet (17Lands publishes ~2 weeks after release)
  }
}

function cardRatingsFrom(stats: LimitedStats): CardRating[] {
  return Object.entries(stats.cards)
    .filter(([, c]) => c.gihWr != null && c.gihGames >= 200)
    .map(([name, c]) => ({ name, winRate: c.gihWr!, gihGames: c.gihGames, gpWr: c.gpWr, iwd: c.iwd, ata: c.ata }));
}

/** Map color pair (or triplet) win rates to S/A/B/C/D tiers by quintile. */
function tiersFrom(stats: LimitedStats, allowThreeColor: boolean): Map<string, string> {
  const tiers = new Map<string, string>();
  const entries = Object.entries(stats.colorPairs).filter(([k, v]) => /^[WUBRG]+$/.test(k) && v.winRate != null);
  // Skip combos too rarely drafted to rate (e.g. TDM Grixis had 2 games)
  const maxGames = Math.max(0, ...entries.map(([, v]) => v.games));
  const minGames = Math.max(100, maxGames * 0.01);
  const pairs = entries.filter(([k, v]) =>
    v.games >= minGames && (allowThreeColor ? (k.length === 2 || k.length === 3) : k.length === 2));
  if (pairs.length === 0) return tiers;

  const sorted = pairs.map(([, v]) => v.winRate!).sort((a, b) => b - a);
  const cutoffs = [0.2, 0.4, 0.6, 0.8].map(q => sorted[Math.floor(sorted.length * q)] ?? sorted[0]);
  for (const [key, v] of pairs) {
    const wr = v.winRate!;
    tiers.set(key, wr >= cutoffs[0] ? 'S' : wr >= cutoffs[1] ? 'A' : wr >= cutoffs[2] ? 'B' : wr >= cutoffs[3] ? 'C' : 'D');
  }
  return tiers;
}

/** Scryfall: fetch multicolor uncommons — these are the official signpost cards */
async function fetchScryfallSignposts(setCode: string, allowThreeColor: boolean): Promise<Archetype[]> {
  const minColors = 2;
  // Scryfall's is:booster flag is missing on newer play-booster sets (FRA returns 0 with it,
  // 25 without), so retry without it when the filtered search finds nothing.
  const search = (q: string) =>
    fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=color`, {
      headers: { 'User-Agent': 'MTG-Collection-Tracker/1.0', Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
  const base = `set:${setCode} rarity:uncommon colors>=${minColors} -type:basic`;
  let res = await search(`${base} is:booster`);
  if (res.status === 404) res = await search(base);
  if (!res.ok) return [];

  const data = await res.json();
  const cards: Array<{
    name: string;
    colors: string[];
    oracle_text?: string;
    type_line: string;
  }> = data.data || [];

  // Group cards by color pair — the dominant card per group is the signpost
  const byPair = new Map<string, typeof cards[0][]>();
  for (const card of cards) {
    if (!card.colors) continue;
    if (!allowThreeColor && card.colors.length > 2) continue;
    const key = [...card.colors].sort().join('/');
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(card);
  }

  const archetypes: Archetype[] = [];
  for (const [, group] of byPair) {
    const signpost = group[0];
    const colors = signpost.colors.map(sym => SYMBOL_TO_NAME[sym] || sym);
    const colorDesc = colors.join('/');

    // Derive strategy hints from oracle text rather than pasting it verbatim
    const oracle = (signpost.oracle_text || '').toLowerCase();
    const hints: string[] = [];
    if (/flying/.test(oracle)) hints.push('flying creatures');
    if (/\+1\/\+1 counter/.test(oracle)) hints.push('+1/+1 counters');
    if (/draw a card|draw cards|draw two/.test(oracle)) hints.push('card draw');
    if (/create.*token/.test(oracle)) hints.push('token generation');
    if (/sacrifice/.test(oracle)) hints.push('sacrifice synergies');
    if (/graveyard/.test(oracle)) hints.push('graveyard value');
    if (/deathtouch/.test(oracle)) hints.push('deathtouch');
    if (/lifelink/.test(oracle)) hints.push('lifegain');
    if (/trample/.test(oracle)) hints.push('trample threats');
    if (/haste/.test(oracle)) hints.push('haste aggro');
    if (/whenever.*attacks|when.*attacks/.test(oracle)) hints.push('attack triggers');
    if (/whenever.*enters|when.*enters/.test(oracle)) hints.push('ETB effects');
    if (/instant|sorcery/.test(oracle) && !/type.*instant|type.*sorcery/.test(oracle)) hints.push('spells matter');

    const hintStr = hints.length > 0 ? `Themes: ${hints.slice(0, 3).join(', ')}. ` : '';
    const typeShort = (signpost.type_line || '').split(' — ')[0];

    archetypes.push({
      name: `${colorDesc} Strategy`,
      colors,
      desc: `${colorDesc} archetype. Key signpost: ${signpost.name} (${typeShort}). ${hintStr}Click Auto-Fetch Archetypes after adding this set's prerelease guide to HARDCODED_ARCHETYPES for full strategy descriptions.`,
      source: 'scryfall',
    });
  }

  return archetypes;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setCode = searchParams.get('set')?.toUpperCase();

  if (!setCode) {
    return NextResponse.json({ error: 'Missing set code parameter' }, { status: 400 });
  }

  const allowThreeColor = THREE_COLOR_SETS.has(setCode);
  const draftsimUrl = `https://draftsim.com/mtg-${setCode.toLowerCase()}-draft-guide/`;

  /** Shared heading-scraper: works on any HTML page that uses headings for color-pair archetypes */
  async function scrapeHeadingsFromUrl(url: string, sourceName: string): Promise<Archetype[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const headingRegex = /<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi;
    const found: Archetype[] = [];
    const seenColorKeys = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(html)) !== null) {
      const headingText = stripHtml(match[1]).replace(/\s+/g, ' ').trim();
      if (!headingText || headingText.length < 4 || headingText.length > 120) continue;
      if (/^\d+$/.test(headingText)) continue;
      if (/table of contents|introduction|overview|conclusion|tldr|tl;dr|rating|tier|key mechanic|format tip|general advice|wrap.?up|summary|final thoughts|draft tips|limited tips|how to play/i.test(headingText)) continue;

      const colors = inferColors(headingText, allowThreeColor);
      if (!colors || colors.length === 0) continue;

      const colorKey = [...colors].sort().join('/');
      if (seenColorKeys.has(colorKey)) continue;
      seenColorKeys.add(colorKey);

      const desc = extractTextAfterHeading(html, match.index + match[0].length);
      if (!desc) continue;

      found.push({ name: headingText, colors, desc, source: sourceName });
    }
    return found;
  }

  // Use hardcoded archetypes when available (authoritative, from official Wizards prerelease guides)
  const hardcoded: Archetype[] = (HARDCODED_ARCHETYPES[setCode] ?? []).map(a => ({ ...a, source: 'hardcoded' }));

  // Wizards guide URL for this set (if known)
  // New sets: derive the slug from the set's Scryfall name ("The Hobbit" →
  // "the-hobbit-prerelease-guide"); the pattern held for HOB, SOS and MSH.
  const wizardsSlug = WIZARDS_GUIDE_SLUGS[setCode]
    ?? (hardcoded.length === 0 ? await deriveGuideSlug(setCode) : null);
  const wizardsUrl = wizardsSlug
    ? `https://magic.wizards.com/en/news/feature/${wizardsSlug}`
    : null;

  const stats = await loadLimitedStats(setCode);

  // Run all sources in parallel; skip Draftsim/Wizards if hardcoded data covers the set
  const [wizardsResult, draftsimResult, scryfallResult, tiersResult, cardRatingsResult] = await Promise.allSettled([
    wizardsUrl && hardcoded.length === 0
      ? scrapeHeadingsFromUrl(wizardsUrl, 'wizards')
      : Promise.resolve([]),
    hardcoded.length === 0
      ? scrapeHeadingsFromUrl(draftsimUrl, 'draftsim')
      : Promise.resolve([]),
    fetchScryfallSignposts(setCode, allowThreeColor),
    Promise.resolve(stats ? tiersFrom(stats, allowThreeColor) : new Map<string, string>()),
    Promise.resolve(stats ? cardRatingsFrom(stats) : []),
  ]);

  const wizardsArchetypes = wizardsResult.status === 'fulfilled' ? wizardsResult.value : [];
  const draftsimArchetypes = draftsimResult.status === 'fulfilled' ? draftsimResult.value : [];
  const scryfallData = scryfallResult.status === 'fulfilled' ? scryfallResult.value : [];
  const tierMap = tiersResult.status === 'fulfilled' ? tiersResult.value : new Map<string, string>();
  const cardRatings = cardRatingsResult.status === 'fulfilled' ? cardRatingsResult.value : [];

  // Merge priority: hardcoded > Wizards guide > Draftsim > Scryfall signposts
  const seenKeys = new Set<string>();
  const merged: Archetype[] = [];

  // Hardcoded guide data is the complete list when present: sets like HOB support only five
  // pairs, so don't pad them with generic Scryfall "Strategy" entries for unsupported pairs.
  const candidates = hardcoded.length > 0
    ? hardcoded
    : [...wizardsArchetypes, ...draftsimArchetypes, ...scryfallData];
  for (const a of candidates) {
    const key = [...a.colors].sort().join('/');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const landsKey = colorsTo17LandsKey(a.colors);
      const tier = tierMap.get(landsKey);
      merged.push(tier ? { ...a, tier } : a);
    }
  }

  if (merged.length === 0) {
    return NextResponse.json(
      { error: `No archetypes found for "${setCode}" from Draftsim or Scryfall. The set may be too new or use a non-standard set code.` },
      { status: 404 }
    );
  }

  const guideMechanics: GuideMechanic[] = HARDCODED_MECHANICS[setCode] ?? [];

  return NextResponse.json({
    archetypes: merged,
    mechanics: guideMechanics,
    cardRatings,
    tierSource: tierMap.size > 0 ? '17lands' : null,
    cardRatingsSource: cardRatings.length > 0 ? '17lands' : null,
    // Attribution required by CC BY 4.0 — the page shows this as a visible credit link
    statsSource: stats
      ? { name: stats.source.name, url: stats.source.url, license: stats.source.license, games: stats.games, updated: stats.source.gameDataModified ?? stats.generatedAt }
      : null,
    sources: {
      draftsim: draftsimArchetypes.length > 0 ? draftsimUrl : null,
      scryfall: scryfallData.length > 0 ? `https://scryfall.com/search?q=set:${setCode}+rarity:uncommon+colors>=2` : null,
    },
  });
}
