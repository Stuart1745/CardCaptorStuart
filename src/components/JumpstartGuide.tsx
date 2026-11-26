"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, GraduationCap, Layers, Loader2, Shuffle } from "lucide-react";
import { ManaIcon } from "@/components/ManaIcon";
import { FloatingPreview } from "@/components/FloatingPreview";

// Theme-pack guide for Jumpstart-style boxes (a Jumpstart cube, a Beginner Box). Each 20-card
// pack is a theme; two packs shuffled together make a 40-card deck. Data: public/data/jumpstart/
// <product>.json, built by scripts/make_jumpstart.py from MTGJSON's official pack lists.

interface JCard { n: string; t: string; c: number; r: string; kw?: string[] }
interface JVariant { v: number; note?: string; cards: [string, number][] }
interface JTheme {
  name: string; colors: string[]; description: string; plan: string;
  pairsWith: string[]; standouts: string[]; keywords: string[]; learn?: boolean; variants: JVariant[];
}
export interface JumpstartData {
  product: string; set: string; kind: "jumpstart" | "beginner";
  glossary: Record<string, string>; cards: Record<string, JCard>; themes: JTheme[];
}

/** Which guide (if any) a box gets: Foundations Jumpstart, or the Foundations Beginner Box. */
export function jumpstartProduct(type?: string, setCode?: string): string | null {
  const t = (type ?? "").toLowerCase();
  const set = (setCode ?? "").split(",")[0].trim().toUpperCase();
  if (t.includes("beginner") && set === "FDN") return "fdn-beginner";
  if ((t.includes("jumpstart") || t.includes("cube")) && set === "J25") return "j25";
  return null;
}

const image = (id: string, size: "normal" | "large" = "normal") => `https://cards.scryfall.io/${size}/front/${id[0]}/${id[1]}/${id}.jpg`;
const scryfall = (name: string) => `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`;
const COLOR_NAMES: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
const anchorId = (theme: string) => `theme-${theme.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const TYPE_ORDER: [string, (t: string) => boolean][] = [
  ["Creatures", t => t.includes("Creature")],
  ["Planeswalkers", t => t.includes("Planeswalker")],
  ["Instants & sorceries", t => t.includes("Instant") || t.includes("Sorcery")],
  ["Artifacts & enchantments", t => t.includes("Artifact") || t.includes("Enchantment")],
  ["Lands", t => t.includes("Land")],
  ["Other", () => true],
];
const groupIndex = (type: string) => TYPE_ORDER.findIndex(([, test]) => test(type));

export function JumpstartGuide({ product }: { product: string }) {
  const [data, setData] = useState<JumpstartData | null>(null);
  const [failed, setFailed] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [variantOf, setVariantOf] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<{ src: string; anchor: DOMRect } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/data/jumpstart/${product}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: JumpstartData) => {
        if (cancelled) return;
        setData(d);
        // Beginner Box: the two learn-to-play decks start open
        if (d.kind === "beginner") setOpen(new Set(d.themes.filter(t => t.learn).map(t => t.name)));
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [product]);

  useEffect(() => {
    if (!preview) return;
    const hide = () => setPreview(null);
    window.addEventListener("scroll", hide, { passive: true, once: true });
    return () => window.removeEventListener("scroll", hide);
  }, [preview]);

  const themes = useMemo(() => (data?.themes ?? []).filter(t => !color || t.colors.includes(color)), [data, color]);

  if (failed) return <p className="text-paper-500 dark:text-paper-400">The pack guide couldn&apos;t load. Refresh to try again.</p>;
  if (!data) return <div className="flex items-center gap-2 text-paper-500 dark:text-paper-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading the packs…</div>;

  const beginner = data.kind === "beginner";
  const learn = beginner ? themes.filter(t => t.learn) : [];
  const rest = beginner ? themes.filter(t => !t.learn) : themes;
  const pairings = (data.themes.length * (data.themes.length - 1)) / 2;
  const hover = (src: string, el: HTMLElement) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    setPreview({ src, anchor: el.getBoundingClientRect() });
  };
  const toggle = (name: string) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const jumpTo = (name: string) => {
    setColor(null);
    setOpen(prev => new Set(prev).add(name));
    requestAnimationFrame(() => document.getElementById(anchorId(name))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const renderTheme = (t: JTheme, big = false) => {
    const isOpen = open.has(t.name);
    const vIndex = Math.min(variantOf[t.name] ?? 0, t.variants.length - 1);
    const v = t.variants[vIndex];
    const cardsOf = (v?.cards ?? []).map(([id, n]) => ({ id, n, card: data.cards[id] })).filter(x => x.card);
    const standoutIds = t.standouts.map(name => cardsOf.find(x => x.card.n === name)?.id
      ?? t.variants.flatMap(vv => vv.cards).find(([id]) => data.cards[id]?.n === name)?.[0]).filter(Boolean) as string[];
    return (
      <article key={t.name} id={anchorId(t.name)}
        className={`scroll-mt-24 bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm ${isOpen || big ? "md:col-span-2" : ""}`}>
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-50 flex flex-wrap items-center gap-2">
                {t.name}
                <span className="flex gap-1" aria-label={t.colors.map(c => COLOR_NAMES[c]).join(" and ") || "Colorless"}>
                  {t.colors.map(c => <ManaIcon key={c} symbol={c} size={18} />)}
                </span>
                {t.learn && <span className="sticker text-xs font-bold px-2 py-0.5 rounded-md bg-butter text-amber-950">Learn to play</span>}
              </h3>
              {t.variants.length > 1 && <p className="text-xs text-paper-500 dark:text-paper-400 mt-0.5">{t.variants.length} versions of this pack</p>}
            </div>
            {standoutIds.length > 0 && (
              <div className="flex -space-x-6 shrink-0" aria-hidden>
                {standoutIds.slice(0, 3).map(id => (
                  <img key={id} src={image(id)} alt="" loading="lazy" onMouseEnter={e => hover(image(id, "large"), e.currentTarget)} onMouseLeave={() => setPreview(null)}
                    className="w-14 aspect-[488/680] rounded-[4.5%/3.2%] shadow ring-1 ring-black/10 object-cover bg-paper-200 dark:bg-paper-800" />
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 text-paper-700 dark:text-paper-200 leading-relaxed">{t.description}</p>
          <p className="mt-2 text-sm text-paper-600 dark:text-paper-300 leading-relaxed"><strong className="font-semibold text-paper-800 dark:text-paper-100">How to play it:</strong> {t.plan}</p>
          {t.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.keywords.slice(0, 6).map(k => (
                <span key={k} title={data.glossary[k]} className="text-xs font-medium px-2 py-0.5 rounded-full bg-paper-100 dark:bg-paper-800 text-paper-700 dark:text-paper-200 border border-paper-200 dark:border-paper-700">{k}</span>
              ))}
            </div>
          )}
          {t.pairsWith.length > 0 && (
            <p className="mt-3 text-sm text-paper-600 dark:text-paper-300 flex flex-wrap items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5" aria-hidden /> Pairs well with
              {t.pairsWith.map((p, i) => (
                <React.Fragment key={p}>
                  <button type="button" onClick={() => jumpTo(p)} className="font-semibold text-sakura-700 dark:text-sakura-300 hover:underline underline-offset-2">{p}</button>
                  {i < t.pairsWith.length - 1 ? "·" : ""}
                </React.Fragment>
              ))}
            </p>
          )}
          <button type="button" onClick={() => toggle(t.name)} aria-expanded={isOpen}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-paper-800 text-paper-800 dark:text-paper-100 hover:bg-paper-200 dark:hover:bg-paper-700">
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
            {isOpen ? "Hide the cards" : `See the ${v?.cards.reduce((n, [, q]) => n + q, 0) ?? 20} cards`}
          </button>
        </div>

        {isOpen && v && (
          <div className="border-t border-paper-100 dark:border-paper-800 p-5 md:p-6 space-y-6">
            {t.variants.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${t.name} versions`}>
                {t.variants.map((vv, i) => (
                  <button key={vv.v} type="button" aria-pressed={i === vIndex} onClick={() => setVariantOf(prev => ({ ...prev, [t.name]: i }))}
                    className={`text-sm px-3 py-1 rounded-full border font-medium ${i === vIndex
                      ? "gel-circle bg-transparent border-transparent text-sakura-700 dark:text-sakura-300"
                      : "bg-white dark:bg-paper-900 border-paper-200 dark:border-paper-700 text-paper-700 dark:text-paper-300 hover:bg-paper-50 dark:hover:bg-paper-800"}`}>
                    Version {vv.v}
                  </button>
                ))}
                {v.note && <span className="text-sm text-paper-500 dark:text-paper-400">{v.note}</span>}
              </div>
            )}
            {t.keywords.some(k => data.glossary[k]) && (
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
                {t.keywords.filter(k => data.glossary[k]).map(k => (
                  <div key={k}><dt className="inline font-semibold text-paper-900 dark:text-paper-100">{k}: </dt><dd className="inline text-paper-600 dark:text-paper-300">{data.glossary[k]}</dd></div>
                ))}
              </dl>
            )}
            {TYPE_ORDER.map(([label], gi) => {
              const inGroup = cardsOf.filter(x => groupIndex(x.card.t) === gi)
                .sort((a, b) => a.card.c - b.card.c || a.card.n.localeCompare(b.card.n));
              if (!inGroup.length) return null;
              return (
                <section key={label}>
                  <h4 className="text-sm font-semibold text-paper-700 dark:text-paper-200 mb-2">
                    {label} <span className="font-normal text-paper-500 dark:text-paper-400">({inGroup.reduce((n, x) => n + x.n, 0)})</span>
                  </h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-x-3 gap-y-4">
                    {inGroup.map(x => (
                      <a key={x.id} href={scryfall(x.card.n)} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1 min-w-0"
                        onMouseEnter={e => hover(image(x.id, "large"), e.currentTarget)} onMouseLeave={() => setPreview(null)}
                        onFocus={e => setPreview({ src: image(x.id, "large"), anchor: e.currentTarget.getBoundingClientRect() })} onBlur={() => setPreview(null)}>
                        <div className="relative aspect-[488/680] rounded-[4.5%/3.2%] overflow-hidden shadow-sm ring-1 ring-paper-900/10 dark:ring-white/10 group-hover:ring-2 group-hover:ring-sakura-500 bg-paper-200 dark:bg-paper-800">
                          <img src={image(x.id)} alt={x.card.n} loading="lazy" className="w-full h-full object-cover" />
                          {x.n > 1 && <span className="absolute top-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded-md bg-paper-900/85 text-white">×{x.n}</span>}
                        </div>
                        <p className="text-xs font-medium text-paper-700 dark:text-paper-300 truncate">{x.card.n}</p>
                      </a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-paper-900 rounded-2xl border border-paper-200 dark:border-paper-800 shadow-sm p-5 md:p-6">
        <h2 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block flex items-center gap-2 mb-3">
          {beginner ? <GraduationCap className="w-5 h-5 text-sakura-600 dark:text-sakura-400" /> : <Layers className="w-5 h-5 text-sakura-600 dark:text-sakura-400" />}
          {beginner ? "How the Beginner Box works" : "How Jumpstart works"}
        </h2>
        <div className="text-paper-700 dark:text-paper-200 leading-relaxed space-y-2 max-w-3xl">
          {beginner ? (
            <>
              <p>The box holds ten themed 20-card packs. For your first game, play the two <strong>learn-to-play decks</strong>, Cats and Vampires, against each other: each comes ready to go, and the guide in the box walks you through the first five turns.</p>
              <p>After that, any two packs shuffle together into a 40-card deck. That&apos;s {pairings} different pairings from the ten packs, and nothing gets used up.</p>
            </>
          ) : (
            <>
              <p>Every pack is a 20-card theme. Each player picks two packs, shuffles them together into a 40-card deck, and plays. No deckbuilding, nothing to open: after the game the packs go back in the box.</p>
              <p>There are {data.themes.length} themes, most with a few versions. Mixing two colors works fine; matching plans (say, two token packs) makes a stronger deck.</p>
            </>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter packs by color">
        <span className="text-sm font-semibold text-paper-600 dark:text-paper-400 mr-1">Color:</span>
        {[null, "W", "U", "B", "R", "G"].map(c => (
          <button key={c ?? "all"} type="button" aria-pressed={color === c} onClick={() => setColor(c)} title={c ? COLOR_NAMES[c] : "All colors"}
            className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium ${color === c
              ? "gel-circle bg-transparent border-transparent text-sakura-700 dark:text-sakura-300"
              : "bg-white dark:bg-paper-900 border-paper-200 dark:border-paper-700 text-paper-700 dark:text-paper-300 hover:bg-paper-50 dark:hover:bg-paper-800"}`}>
            {c ? <ManaIcon symbol={c} size={16} /> : null}{c ? COLOR_NAMES[c] : "All"}
            <span className="text-paper-500">{c ? data.themes.filter(t => t.colors.includes(c)).length : data.themes.length}</span>
          </button>
        ))}
      </div>

      {learn.length > 0 && (
        <section>
          <h2 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block mb-4">Start here: the learn-to-play decks</h2>
          <div className="grid gap-5 md:grid-cols-2">{learn.map(t => renderTheme(t))}</div>
        </section>
      )}

      <section>
        <h2 className="font-brand font-bold text-xl text-paper-900 dark:text-paper-100 washi-block mb-4">
          {beginner ? "The other packs" : "The theme packs"} <span className="font-sans font-normal text-base text-paper-500 dark:text-paper-400">({rest.length})</span>
        </h2>
        <div className="grid gap-5 md:grid-cols-2">{rest.map(t => renderTheme(t))}</div>
      </section>

      {preview && (
        <FloatingPreview anchor={preview.anchor} maxWidth={300} interactive={false} side="right">
          <img src={preview.src} alt="" className="w-full rounded-[4.5%/3.2%] shadow-2xl ring-1 ring-black/10" />
        </FloatingPreview>
      )}
    </div>
  );
}
