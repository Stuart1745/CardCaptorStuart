"""Build the Jumpstart pack guides served at public/data/jumpstart/<product>.json.

Inputs (in --src, default assets/jumpstart):
  raw_j25.json, raw_fdn.json   official pack lists from MTGJSON (api/v5/decks/<Theme>_<SET>.json),
                               {cards: {scryfallId: {...}}, packs: [{theme, variant, colors, cards, keywords}]}
  themes_j25.json              theme write-ups for Foundations Jumpstart (description, plan, pairsWith,
                               standouts, variants notes), written for this site
  themes_fdn.json              the same for the Foundations Beginner Box's ten packs (learn: true = the
                               two learn-to-play decks)
  glossary.json                one plain-English line per mechanic keyword

Stuart's boxes (2026-11-26): the Beginner Box keeps only its two learn-to-play decks (Cats,
Vampires); its other eight packs live in the Foundations Jumpstart cube, so the j25 guide carries
them as extra themes marked source "Beginner Box".

Run from the repo root:  python scripts/make_jumpstart.py [--src DIR]
"""
import json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[sys.argv.index("--src") + 1]) if "--src" in sys.argv else ROOT / "assets" / "jumpstart"
out_dir = ROOT / "public" / "data" / "jumpstart"
out_dir.mkdir(parents=True, exist_ok=True)
glossary = json.load(open(src / "glossary.json", encoding="utf-8"))

def slug(text):
    return "".join(ch if ch.isalnum() else "-" for ch in text.lower()).strip("-")


def build_themes(raw, notes, source=None, only=None):
    """Theme entries for one pack list; `only` keeps a subset of theme names."""
    by_theme = {}
    for p in raw["packs"]:
        if only is None or p["theme"] in only:
            by_theme.setdefault(p["theme"], []).append(p)
    missing = sorted(set(by_theme) - set(notes))
    if missing:
        sys.exit(f"no write-up for {missing}")
    themes, used = [], set()
    for name in sorted(by_theme):
        packs = sorted(by_theme[name], key=lambda p: p["variant"])
        n = notes[name]
        kw_count = {}
        for p in packs:
            for i, k in enumerate(p["keywords"]):
                kw_count[k] = kw_count.get(k, 0) + (len(p["keywords"]) - i)
        names_in_theme = {raw["cards"][cid]["name"] for p in packs for cid, _ in p["cards"]}
        bad = [x for x in n.get("standouts", []) if x not in names_in_theme]
        if bad:
            sys.exit(f"{name}: standout cards not in its packs: {bad}")
        variants = []
        for p in packs:
            used.update(cid for cid, _ in p["cards"])
            note = (n.get("variants") or {}).get(str(p["variant"]))
            variants.append({"v": p["variant"], **({"note": note} if note and len(packs) > 1 else {}), "cards": p["cards"]})
        themes.append({
            "id": slug(f"{name} {source}" if source else name), "name": name,
            **({"source": source} if source else {}),
            "colors": sorted({c for p in packs for c in p["colors"]}, key="WUBRG".index),
            "description": n["description"], "plan": n["plan"],
            "pairsWith": [x for x in n.get("pairsWith", []) if x != name],
            "standouts": n.get("standouts", []), "keywords": sorted(kw_count, key=lambda k: -kw_count[k]),
            **({"learn": True} if n.get("learn") else {}), "variants": variants,
        })
    return themes, used


def write(key, product, kind, themes, raws, used):
    # pairsWith -> [{id, name}] among themes in the same guide and the same source
    ids = {(t.get("source"), t["name"]): t["id"] for t in themes}
    for t in themes:
        t["pairsWith"] = [{"id": ids[(t.get("source"), x)], "name": x} for x in t["pairsWith"] if (t.get("source"), x) in ids]
    cards = {}
    for raw in raws:
        for cid in used & set(raw["cards"]):
            c = raw["cards"][cid]
            cards[cid] = {"n": c["name"], "t": c["type"], "c": c["cmc"], "r": c["rarity"], **({"kw": c["keywords"]} if c.get("keywords") else {})}
    kws = {k for t in themes for k in t["keywords"]}
    data = {"product": product, "kind": kind, "glossary": {k: v for k, v in glossary.items() if k in kws}, "cards": cards, "themes": themes}
    path = out_dir / f"{key}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline=chr(10))
    print(f"{key}: {len(themes)} themes, {sum(len(t['variants']) for t in themes)} packs, {len(cards)} cards, "
          f"{len(data['glossary'])}/{len(kws)} keywords defined, {path.stat().st_size // 1024} KB")


raw_j25 = json.load(open(src / "raw_j25.json", encoding="utf-8"))
raw_fdn = json.load(open(src / "raw_fdn.json", encoding="utf-8"))
notes_j25 = json.load(open(src / "themes_j25.json", encoding="utf-8"))
notes_fdn = json.load(open(src / "themes_fdn.json", encoding="utf-8"))
learn = {name for name, n in notes_fdn.items() if n.get("learn")}

j25_themes, j25_used = build_themes(raw_j25, notes_j25)
extra_themes, extra_used = build_themes(raw_fdn, notes_fdn, source="Beginner Box", only={t["theme"] for t in raw_fdn["packs"]} - learn)
write("j25", "Foundations Jumpstart", "jumpstart", j25_themes + extra_themes, [raw_j25, raw_fdn], j25_used | extra_used)

learn_themes, learn_used = build_themes(raw_fdn, notes_fdn, only=learn)
write("fdn-beginner", "Foundations Beginner Box", "beginner", learn_themes, [raw_fdn], learn_used)
