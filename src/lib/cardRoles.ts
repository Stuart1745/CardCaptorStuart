// Automatic role tags for a card, read from its rules text. Used only for cards that came in
// without a tag (no Moxfield #tag, no Archidekt category, none kept from an earlier save), so
// a deck's category view is never mostly "Other". Hand-made tags always win over these.

/** Roles in priority order: the first one found becomes the card's primary role. */
const RULES: { role: string; test: (text: string, type: string) => boolean }[] = [
  { role: "Board Wipe", test: t => has(t, "destroy all", "exile all", "all creatures get -", "each creature gets -", "deals damage to each creature", "damage to each creature", "return all", "creatures your opponents control get -") || (has(t, "each player sacrifices") && has(t, "creatures")) },
  { role: "Counterspell", test: t => has(t, "counter target") },
  { role: "Removal", test: t => has(t, "destroy target", "exile target creature", "exile target nonland", "exile target artifact", "exile target enchantment", "exile target permanent", "exile another target", "damage to target creature", "damage to any target", "target creature gets -", "fights target", "fights another target", "return target creature to its owner", "return target nonland permanent", "each opponent sacrifices", "target player sacrifices", "target opponent sacrifices", "each other player sacrifices", "each player sacrifices") },
  { role: "Ramp", test: (t, ty) => !ty.includes("land") && (/add [{]|add one mana|add two mana|add three mana|mana of any/.test(t) || (has(t, "search your library for") && has(t, "land card") && has(t, "onto the battlefield")) || has(t, "put a land card from your hand onto the battlefield", "play an additional land")) },
  { role: "Tutor", test: t => has(t, "search your library for a card", "search your library for an instant", "search your library for a creature", "search your library for an artifact", "search your library for an enchantment") },
  { role: "Sacrifice Outlet", test: t => has(t, "sacrifice a creature:", "sacrifice another creature:", "sacrifice a creature, ", "sacrifice another creature, ", "sacrifice a creature or", "sacrifice an artifact:", "sacrifice a permanent:", "as an additional cost to cast this spell, sacrifice") },
  { role: "Token Generator", test: t => t.includes("create") && t.includes("token") },
  { role: "Card Advantage", test: t => has(t, "draw a card", "draws a card", "draw two", "draw three", "draw cards", "draw that many", "draw x", "you may play that card", "you may cast that card", "you may play it", "you may play them", "into your hand", "from the top of your library") },
  { role: "Drain", test: t => has(t, "each opponent loses", "target opponent loses", "target player loses", "each player loses", "controller loses", "damage to each opponent", "damage to target opponent") },
  // Bringing back other creatures is Reanimation; a card that returns itself is Recursion.
  { role: "Reanimation", test: t => !has(t, "return this card", "return it from your graveyard") && has(t, "from your graveyard to the battlefield", "from a graveyard to the battlefield", "from a graveyard onto the battlefield", "from your graveyard onto the battlefield") },
  { role: "Recursion", test: t => has(t, "from your graveyard to your hand", "return this card from your graveyard", "cast this card from your graveyard", "from your graveyard") },
  { role: "Anthem", test: t => /creatures you control get [+]|you control get [+]|creatures you control have/.test(t) },
  { role: "Protection", test: t => has(t, "hexproof", "indestructible", "shroud", "phase out", "protection from") },
  { role: "Lifegain", test: t => has(t, "you gain") && has(t, "life") && !has(t, "each opponent loses", "damage to each opponent", "target opponent loses") },
];

function has(text: string, ...needles: string[]) {
  return needles.some(n => text.includes(n));
}

/** Up to three roles for a card from its type line and oracle text ("Land" for plain lands). */
export function autoRoles(typeLine: string | undefined, oracleText: string | undefined): string[] {
  const type = (typeLine ?? "").toLowerCase();
  const text = (oracleText ?? "").toLowerCase();
  if (type.includes("land") && !type.includes("creature")) {
    const extra = RULES.filter(r => !["Ramp", "Lifegain", "Protection"].includes(r.role) && r.test(text, type)).map(r => r.role);
    return ["Land", ...extra.slice(0, 1)];
  }
  const roles = RULES.filter(r => r.test(text, type)).map(r => r.role);
  return roles.length ? roles.slice(0, 3) : ["Utility"];
}
