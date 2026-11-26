"""Build the Jumpstart pack guides served at public/data/jumpstart/<product>.json.

Inputs (in --src, default assets/jumpstart):
  raw_j25.json, raw_fdn.json   official pack lists from MTGJSON (api/v5/decks/<Theme>_<SET>.json),
                               {cards: {scryfallId: {...}}, packs: [{theme, variant, colors, cards, keywords}]}
  themes_j25.json              theme write-ups for Foundations Jumpstart (description, plan, pairsWith,
                               standouts, variants notes), written for this site
  themes_fdn.json              the same for the Foundations Beginner Box's ten packs (learn: true = the
                               two learn-to-play decks)
  glossary.json                one plain-English line per mechanic keyword

Run from the repo root:  python scripts/make_jumpstart.py [--src DIR]
"""
import json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[sys.argv.index("--src") + 1]) if "--src" in sys.argv else ROOT / "assets" / "jumpstart"
out_dir = ROOT / "public" / "data" / "jumpstart"
out_dir.mkdir(parents=True, exist_ok=True)
glossary = json.load(open(src / "glossary.json", encoding="utf-8"))

PRODUCTS = [
    ("j25", "Foundations Jumpstart", "jumpstart", "raw_j25.json", "themes_j25.json"),
    ("fdn-beginner", "Foundations Beginner Box", "beginner", "raw_fdn.json", "themes_fdn.json"),
]

for key, product, kind, raw_name, themes_name in PRODUCTS:
    raw = json.load(open(src / raw_name, encoding="utf-8"))
    notes = json.load(open(src / themes_name, encoding="utf-8"))
    by_theme = {}
    for p in raw["packs"]:
        by_theme.setdefault(p["theme"], []).append(p)
    missing = sorted(set(by_theme) - set(notes))
    if missing:
        sys.exit(f"{themes_name}: no write-up for {missing}")
    used = set()
    themes = []
    for name in sorted(by_theme):
        packs = sorted(by_theme[name], key=lambda p: p["variant"])
        n = notes[name]
        kw_count = {}
        for p in packs:
            for i, k in enumerate(p["keywords"]):
                kw_count[k] = kw_count.get(k, 0) + (len(p["keywords"]) - i)
        names_in_theme = {raw["cards"][cid]["name"] for p in packs for cid, _ in p["cards"]}
        bad = [s for s in n.get("standouts", []) if s not in names_in_theme]
        if bad:
            sys.exit(f"{name}: standout cards not in its packs: {bad}")
        variants = []
        for p in packs:
            used.update(cid for cid, _ in p["cards"])
            note = (n.get("variants") or {}).get(str(p["variant"]))
            variants.append({"v": p["variant"], **({"note": note} if note and len(packs) > 1 else {}), "cards": p["cards"]})
        colors = sorted({c for p in packs for c in p["colors"]}, key="WUBRG".index)
        themes.append({
            "name": name, "colors": colors, "description": n["description"], "plan": n["plan"],
            "pairsWith": [x for x in n.get("pairsWith", []) if x in by_theme and x != name],
            "standouts": n.get("standouts", []), "keywords": sorted(kw_count, key=lambda k: -kw_count[k]),
            **({"learn": True} if n.get("learn") else {}), "variants": variants,
        })
    cards = {}
    for cid in sorted(used):
        c = raw["cards"][cid]
        cards[cid] = {"n": c["name"], "t": c["type"], "c": c["cmc"], "r": c["rarity"], **({"kw": c["keywords"]} if c.get("keywords") else {})}
    kws = {k for t in themes for k in t["keywords"]}
    data = {"product": product, "set": raw["set"], "kind": kind,
            "glossary": {k: v for k, v in glossary.items() if k in kws}, "cards": cards, "themes": themes}
    path = out_dir / f"{key}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    print(f"{key}: {len(themes)} themes, {sum(len(t['variants']) for t in themes)} packs, {len(cards)} cards, "
          f"{len(data['glossary'])}/{len(kws)} keywords defined, {path.stat().st_size // 1024} KB")
