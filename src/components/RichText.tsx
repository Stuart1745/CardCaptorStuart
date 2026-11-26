import React from "react";

// A small, safe Markdown subset for deck primers (Moxfield and Archidekt primers are Markdown):
// # headings, paragraphs, - / * / • bullets, 1. numbered lists, --- rules, **bold**, *italic*,
// [[Card Name]] (links to Scryfall) and [label](https://link). Everything renders as React
// elements; raw HTML in the text is shown as text, never injected.
// The page can pass `cardLink` to render card links its own way (hover previews) and
// `autoLink` (card names) so plain mentions of the deck's cards become links too.

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "hr" };

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

function headingLevel(line: string): number {
  let n = 0;
  while (line[n] === "#") n++;
  return n >= 1 && n <= 6 && line[n] === " " ? n : 0;
}
function bulletText(line: string): string | null {
  for (const m of ["- ", "* ", "• "]) if (line.startsWith(m)) return line.slice(m.length).trim();
  return null;
}
function numberedText(line: string): string | null {
  let n = 0;
  while (line[n] >= "0" && line[n] <= "9") n++;
  if (n === 0 || n > 3) return null;
  return (line[n] === "." || line[n] === ")") && line[n + 1] === " " ? line.slice(n + 2).trim() : null;
}

export function richBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ kind: "p", text: para.join(" ") }); para = []; } };
  for (const raw of text.split(CR).join("").split(NL)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const level = headingLevel(line);
    if (level) { flush(); blocks.push({ kind: "h", level, text: line.slice(level + 1).trim() }); continue; }
    if (/^([-*_])( ?[-*_]){2,}$/.test(line)) { flush(); blocks.push({ kind: "hr" }); continue; }
    const b = bulletText(line);
    const o = b === null ? numberedText(line) : null;
    if (b !== null || o !== null) {
      flush();
      const kind = b !== null ? "ul" : "ol";
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push((b ?? o)!);
      else blocks.push({ kind, items: [(b ?? o)!] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

const scryfall = (name: string) => `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`;
export const linkCls = "text-sakura-700 dark:text-sakura-300 underline decoration-dotted underline-offset-2 hover:decoration-solid";

export interface RichOptions {
  /** Render a card link (name = the card, label = what to show) */
  cardLink?: (name: string, label: React.ReactNode, key: string) => React.ReactNode;
  /** Card names to link wherever they appear in plain text, longest match first */
  autoLink?: string[];
}

const defaultCardLink = (name: string, label: React.ReactNode, key: string) => (
  <a key={key} href={scryfall(name)} target="_blank" rel="noopener noreferrer" className={linkCls}>{label}</a>
);

const isWordChar = (ch: string | undefined) => !!ch && /[A-Za-z0-9]/.test(ch);

/** Split plain text around mentions of the given card names. */
function linkify(text: string, opts: RichOptions, keyPrefix: string): React.ReactNode[] {
  const names = opts.autoLink;
  if (!names?.length || !text) return text ? [text] : [];
  const link = opts.cardLink ?? defaultCardLink;
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let k = 0;
  while (i < text.length) {
    const hit = isWordChar(text[i - 1]) ? undefined
      : names.find(n => text.startsWith(n, i) && !isWordChar(text[i + n.length]));
    if (hit) {
      if (buf) { out.push(buf); buf = ""; }
      out.push(link(hit, hit, `${keyPrefix}-a${k++}`));
      i += hit.length;
      continue;
    }
    buf += text[i];
    i++;
  }
  if (buf) out.push(buf);
  return out;
}

/** Inline formatting, scanned by hand so nothing in the text can become markup by accident. */
export function inline(text: string, keyPrefix = "i", opts: RichOptions = {}): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let k = 0;
  const key = () => `${keyPrefix}-${k++}`;
  const flush = () => { if (buf) { out.push(...linkify(buf, opts, key())); buf = ""; } };
  const link = opts.cardLink ?? defaultCardLink;
  while (i < text.length) {
    if (text.startsWith("[[", i)) {
      const j = text.indexOf("]]", i + 2);
      if (j > i + 2) {
        flush();
        const name = text.slice(i + 2, j).split("|")[0].trim();
        out.push(link(name, name, key()));
        i = j + 2;
        continue;
      }
    }
    if (text[i] === "[") {
      const mid = text.indexOf("](", i + 1);
      const end = mid > i ? text.indexOf(")", mid + 2) : -1;
      if (mid > i && end > mid) {
        const label = text.slice(i + 1, mid);
        const url = text.slice(mid + 2, end).trim();
        flush();
        if (/^https?:[/][/]/i.test(url)) {
          out.push(<a key={key()} href={url} target="_blank" rel="noopener noreferrer" className={linkCls}>{inline(label, key(), { ...opts, autoLink: undefined })}</a>);
        } else {
          out.push(...inline(label, key(), opts));
        }
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("**", i)) {
      const j = text.indexOf("**", i + 2);
      if (j > i + 2) {
        flush();
        out.push(<strong key={key()} className="font-semibold text-paper-900 dark:text-paper-50">{inline(text.slice(i + 2, j), key(), opts)}</strong>);
        i = j + 2;
        continue;
      }
    }
    if (text[i] === "*" && text[i + 1] && text[i + 1] !== " " && (i === 0 || text[i - 1] === " " || text[i - 1] === "(")) {
      const j = text.indexOf("*", i + 1);
      if (j > i + 1 && text[j - 1] !== " ") {
        flush();
        out.push(<em key={key()}>{inline(text.slice(i + 1, j), key(), opts)}</em>);
        i = j + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

const HEADING_CLS: Record<number, string> = {
  1: "font-brand font-bold text-xl text-paper-900 dark:text-paper-50 mt-6 first:mt-0",
  2: "font-brand font-bold text-lg text-paper-900 dark:text-paper-50 mt-5 first:mt-0",
  3: "font-semibold text-base text-paper-900 dark:text-paper-100 mt-4 first:mt-0",
};

/** Render primer, play-guide or description text. */
export function RichText({ text, cardLink, autoLink }: { text: string } & RichOptions) {
  const opts: RichOptions = { cardLink, autoLink };
  const blocks = richBlocks(text);
  return (
    <div className="space-y-3 text-paper-700 dark:text-paper-300 leading-relaxed">
      {blocks.map((b, n) => {
        if (b.kind === "h") {
          const Tag = (b.level <= 1 ? "h3" : b.level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
          return <Tag key={n} className={HEADING_CLS[Math.min(b.level, 3)]}>{inline(b.text, `h${n}`, opts)}</Tag>;
        }
        if (b.kind === "hr") return <hr key={n} className="border-paper-200 dark:border-paper-700 my-4" />;
        if (b.kind === "p") return <p key={n}>{inline(b.text, `p${n}`, opts)}</p>;
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={n} className={`${b.kind === "ul" ? "list-disc" : "list-decimal"} pl-5 space-y-1`}>
            {b.items.map((it, j) => <li key={j}>{inline(it, `l${n}-${j}`, opts)}</li>)}
          </List>
        );
      })}
    </div>
  );
}
