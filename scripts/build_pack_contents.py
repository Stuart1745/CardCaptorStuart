#!/usr/bin/env python3
"""Build per-set play-booster contents and odds from MTGJSON.

MTGJSON (https://mtgjson.com, free and open) publishes each set's booster configuration:
weighted pack variants, the sheets each variant draws from, and every sheet's cards. This
summarizes the draft product ("play", else "draft", else "default") into
data/pack-contents/{SET}.json:
  - slots: per sheet, expected cards per pack, chance a pack has at least one, sheet size
  - cardsPerPack and mythicsPerPack (expected values)
The full set files are 3-4 MB, too big to fetch per request, hence precomputing.

Sets are discovered from Scryfall (draftable, released or within 30 days). A set is rebuilt
when its file is missing, it released in the last 60 days (configs get corrected), or --force.

Usage:
  python scripts/build_pack_contents.py                 # all draftable sets, incremental
  python scripts/build_pack_contents.py --sets TRK,FRA  # just these
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

MTGJSON_SET = "https://mtgjson.com/api/v5/{set}.json"
SCRYFALL_SETS = "https://api.scryfall.com/sets"
UA = {"User-Agent": "ccs-pack-contents/1.0", "Accept": "application/json"}
DRAFTABLE_TYPES = {"expansion", "core", "masters", "draft_innovation", "funny"}
BOOSTER_PREFERENCE = ("play", "draft", "default")
FIRST_DATE = "2015-01-01"
UPCOMING_DAYS = 30
FRESH_DAYS = 60

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "pack-contents"
NL = chr(10)

LABELS = {
    "common": "Common",
    "uncommon": "Uncommon",
    "rare": "Rare",
    "mythic": "Mythic",
    "rareMythic": "Rare / Mythic",
    "nonFoilLand": "Land",
    "foilLand": "Foil land",
    "foil": "Traditional foil",
    "wildcard": "Wildcard (any rarity)",
    "specialGuest": "Special Guest",
    "commonUncommon": "Common / Uncommon",
    # Grouped sheet families (see group_key): FRA's echoed pairs, ~70 sheets
    "pair": "Echoed pair",
    "third": "Echoed pair: third card",
}
GROUP_MIN = 4  # this many sheets sharing a first camelCase word become one row


def log(msg: str) -> None:
    print(msg, flush=True)


def http_json(url: str):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return json.load(r)


def label_for(sheet: str) -> str:
    if sheet in LABELS:
        return LABELS[sheet]
    # Variants of a base sheet ("rareMythicBoosterfun", "uncommonFable") keep the base label
    base = max((k for k in LABELS if sheet.startswith(k) and sheet[len(k):len(k) + 1].isupper()), key=len, default=None)
    if base:
        return LABELS[base]
    words = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", sheet).split()
    return " ".join(words).capitalize() if words else sheet


def first_word(sheet: str) -> str:
    return re.split(r"(?=[A-Z])", sheet, maxsplit=1)[0]


def group_key_fn(sheet_names) -> callable:
    """Collapse big sheet families ("pairAjani", "pairGarruk", ...) into one key."""
    counts: dict[str, int] = {}
    for name in sheet_names:
        counts[first_word(name)] = counts.get(first_word(name), 0) + 1
    return lambda name: first_word(name) if counts[first_word(name)] >= GROUP_MIN else name


def candidate_sets() -> list[tuple[str, str]]:
    data = http_json(SCRYFALL_SETS)["data"]
    horizon = (datetime.now(timezone.utc) + timedelta(days=UPCOMING_DAYS)).date().isoformat()
    return sorted(
        (s["code"].upper(), s["released_at"])
        for s in data
        if s["set_type"] in DRAFTABLE_TYPES
        and not s.get("digital")
        and not s.get("parent_set_code")
        and FIRST_DATE <= (s.get("released_at") or "") <= horizon
    )


def summarize(code: str, data: dict) -> dict | None:
    boosters = data.get("booster") or {}
    kind = next((k for k in BOOSTER_PREFERENCE if k in boosters), None)
    if not kind:
        return None
    cfg = boosters[kind]
    total_w = cfg["boostersTotalWeight"]
    sheets = cfg["sheets"]
    rarity = {c["uuid"]: c.get("rarity") for c in data.get("cards", [])}

    group_of = group_key_fn({sheet for v in cfg["boosters"] for sheet in v["contents"]})
    sheet_per_pack: dict[str, float] = {}
    per_pack: dict[str, float] = {}
    chance: dict[str, float] = {}
    members: dict[str, set[str]] = {}
    for variant in cfg["boosters"]:
        share = variant["weight"] / total_w
        present: set[str] = set()
        for sheet, n in variant["contents"].items():
            key = group_of(sheet)
            members.setdefault(key, set()).add(sheet)
            sheet_per_pack[sheet] = sheet_per_pack.get(sheet, 0.0) + share * n
            per_pack[key] = per_pack.get(key, 0.0) + share * n
            if n > 0:
                present.add(key)
        for key in present:  # chance a pack has >= 1 card from this sheet (or family)
            chance[key] = chance.get(key, 0.0) + share

    mythics = 0.0
    for sheet, expected in sheet_per_pack.items():
        cards = sheets.get(sheet, {}).get("cards", {})
        sheet_w = sheets.get(sheet, {}).get("totalWeight") or sum(cards.values()) or 1
        mythic_w = sum(w for uuid, w in cards.items() if rarity.get(uuid) == "mythic")
        mythics += expected * mythic_w / sheet_w

    slots = sorted(
        (
            {
                "sheet": sheet,
                "label": label_for(sheet),
                "perPack": round(per_pack[sheet], 3),
                "chance": round(min(chance[sheet], 1.0), 4),
                "cards": len({u for m in members[sheet] for u in sheets.get(m, {}).get("cards", {})}),
                "foil": all(sheets.get(m, {}).get("foil") for m in members[sheet]),
                **({"sheets": len(members[sheet])} if len(members[sheet]) > 1 else {}),
            }
            for sheet in per_pack
        ),
        key=lambda s: (-s["chance"], -s["perPack"]),
    )
    return {
        "set": code,
        "booster": kind,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {"name": "MTGJSON", "url": f"https://mtgjson.com/api/v5/{code}.json"},
        "variants": len(cfg["boosters"]),
        "cardsPerPack": round(sum(per_pack.values()), 2),
        "mythicsPerPack": round(mythics, 4),
        "slots": slots,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sets", help="comma-separated set codes (default: all draftable sets)")
    ap.add_argument("--force", action="store_true", help="rebuild even if a file exists")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fresh_after = (datetime.now(timezone.utc) - timedelta(days=FRESH_DAYS)).date().isoformat()
    if args.sets:
        sets = [(s.strip().upper(), "") for s in args.sets.split(",")]
    else:
        sets = candidate_sets()

    built = skipped = failed = 0
    for code, released in sets:
        out_path = OUT_DIR / f"{code}.json"
        if out_path.exists() and not args.force and not args.sets and released < fresh_after:
            continue
        try:
            data = http_json(MTGJSON_SET.format(set=code))["data"]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                skipped += 1
                continue
            failed += 1
            log(f"{code}: FAILED: HTTP {e.code}")
            continue
        except Exception as e:  # one bad set shouldn't sink the run
            failed += 1
            log(f"{code}: FAILED: {e}")
            continue
        finally:
            time.sleep(0.5)  # be polite to MTGJSON

        summary = summarize(code, data)
        if not summary:
            skipped += 1
            continue
        old = json.loads(out_path.read_text("utf-8")) if out_path.exists() else None
        if old and {k: v for k, v in old.items() if k != "generatedAt"} == {k: v for k, v in summary.items() if k != "generatedAt"}:
            continue  # unchanged: keep the file (and its timestamp) so git sees no diff
        out_path.write_text(json.dumps(summary, separators=(",", ":"), ensure_ascii=False) + NL, "utf-8", newline=NL)
        built += 1
        log(f"{code}: {summary['booster']} booster, {summary['cardsPerPack']} cards/pack, "
            f"{len(summary['slots'])} slots, {summary['mythicsPerPack']:.3f} mythics/pack")

    log(f"Done: {built} built, {skipped} without booster data, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
