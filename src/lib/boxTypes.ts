// Box-type rules shared by the Play Box list and the set page.

/** Jumpstart-style boxes: each player shuffles two 20-card packs together. */
export const JUMPSTART_PACKS = 2;

/**
 * Cubes, Jumpstart cubes and Beginner Boxes are played and shuffled back in, never opened:
 * nothing is used up, so they have no packs-left count and no per-person cost.
 */
export const isReusableBox = (type?: string) => /cube|jumpstart|beginner/i.test(type ?? "");
