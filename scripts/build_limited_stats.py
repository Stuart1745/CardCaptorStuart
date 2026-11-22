#!/usr/bin/env python3
"""Build per-set limited stats from 17Lands' PUBLIC datasets (CC BY 4.0).

17Lands permits outside use only of https://www.17lands.com/public_datasets, so the app
reads these precomputed files instead of calling 17Lands' site APIs.

For each draftable set (from Scryfall) whose PremierDraft game data file exists, this
streams game_data_public.{SET}.PremierDraft.csv.gz and writes data/limited-stats/{SET}.json:
  - colorPairs: win rate + games by main deck colors ("WU", "WBG", ...)
  - cards: GIH WR, GP WR, OH WR, GNS WR, IWD and game counts per card
  - ata: average pick taken at, from draft_data (with --with-draft)
Files are only re-processed when 17Lands' Last-Modified changes (tracked in manifest.json),
so the weekly job is cheap and picks up new sets on its own once 17Lands publishes them.

Usage:
  python scripts/build_limited_stats.py                 # all sets, incremental
  python scripts/build_limited_stats.py --sets FRA,HOB  # just these
  python scripts/build_limited_stats.py --with-draft    # also compute ATA (big files)
  python scripts/build_limited_stats.py --force         # ignore manifest
  python scripts/build_limited_stats.py --jobs 4        # sets built in parallel (default 4)
Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import tarfile
import json
import sys
import tempfile
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://17lands-public.s3.amazonaws.com/analysis_data"
GAME_URL = BASE + "/game_data/game_data_public.{set}.PremierDraft.csv.gz"
DRAFT_URL = BASE + "/draft_data/draft_data_public.{set}.PremierDraft.csv.gz"
SCRYFALL_SETS = "https://api.scryfall.com/sets"
UA = {"User-Agent": "ccs-limited-stats/1.0", "Accept": "*/*"}
DRAFTABLE_TYPES = {"expansion", "core", "masters", "draft_innovation", "funny"}
FIRST_17LANDS_DATE = "2019-01-01"  # 17Lands' public data starts around WAR/M20

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "limited-stats"
MANIFEST = OUT_DIR / "manifest.json"
NL = chr(10)  # LF line endings on every OS (the files are committed)

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


def log(msg: str) -> None:
    print(msg, flush=True)


def http_json(url: str):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def head_last_modified(url: str) -> str | None:
    """Last-Modified of a public file, or None if it isn't published (403/404)."""
    req = urllib.request.Request(url, headers=UA, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.headers.get("Last-Modified")
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            return None
        raise


def download(url: str, dest: Path) -> None:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)


def candidate_sets() -> list[str]:
    data = http_json(SCRYFALL_SETS)["data"]
    today = datetime.now(timezone.utc).date().isoformat()
    codes = [
        s["code"].upper()
        for s in data
        if s["set_type"] in DRAFTABLE_TYPES
        and not s.get("digital")
        and not s.get("parent_set_code")
        and FIRST_17LANDS_DATE <= (s.get("released_at") or "") <= today
    ]
    return sorted(set(codes))


def open_csv(path: Path):
    """Text stream of the CSV inside a 17Lands file.

    Newer files are plain gzipped CSV; older ones (e.g. KHM, STX, AFR, MID, VOW) are a
    gzipped TAR holding the CSV, so detect the tar header ("ustar" at offset 257).
    """
    with gzip.open(path, "rb") as g:
        head = g.read(512)
    if head[257:262] == b"ustar":
        tf = tarfile.open(path, "r:gz")
        member = next(m for m in tf.getmembers() if m.isfile() and m.name.endswith(".csv"))
        return io.TextIOWrapper(tf.extractfile(member), encoding="utf-8", newline="")
    return gzip.open(path, "rt", newline="", encoding="utf-8")


def rate(wins: int, games: int) -> float | None:
    return round(wins / games, 4) if games else None


def build_game_stats(path: Path) -> dict:
    with open_csv(path) as f:
        reader = csv.reader(f)
        header = next(reader)
        width = len(header)
        idx = {name: i for i, name in enumerate(header)}
        won_i = idx["won"]
        colors_i = idx.get("main_colors")  # missing in the oldest files (KHM): no color tiers
        cards = sorted(c[5:] for c in header if c.startswith("deck_"))
        cols = [
            (name, idx[f"deck_{name}"], idx.get(f"opening_hand_{name}"), idx.get(f"drawn_{name}"))
            for name in cards
        ]
        # per card: [gp_g, gp_w, oh_g, oh_w, gih_g, gih_w, gns_g, gns_w]
        acc = {name: [0] * 8 for name in cards}
        pairs: dict[str, list[int]] = {}
        games = wins = 0

        for row in reader:
            if len(row) != width:  # truncated/malformed line
                continue
            won = row[won_i] == "True"
            games += 1
            wins += won
            key = row[colors_i] if colors_i is not None else ""
            if key:
                p = pairs.setdefault(key, [0, 0])
                p[0] += 1
                p[1] += won
            for name, d_i, oh_i, dr_i in cols:
                if row[d_i] in ("0", ""):
                    continue
                a = acc[name]
                a[0] += 1
                a[1] += won
                in_oh = oh_i is not None and row[oh_i] not in ("0", "")
                drawn = dr_i is not None and row[dr_i] not in ("0", "")
                if in_oh:
                    a[2] += 1
                    a[3] += won
                if in_oh or drawn:
                    a[4] += 1
                    a[5] += won
                else:
                    a[6] += 1
                    a[7] += won

    card_out = {}
    for name, a in acc.items():
        if not a[0]:
            continue
        gih, gns = rate(a[5], a[4]), rate(a[7], a[6])
        card_out[name] = {
            "gpWr": rate(a[1], a[0]), "gpGames": a[0],
            "ohWr": rate(a[3], a[2]), "ohGames": a[2],
            "gihWr": gih, "gihGames": a[4],
            "gnsWr": gns, "gnsGames": a[6],
            "iwd": round(gih - gns, 4) if gih is not None and gns is not None else None,
        }
    color_out = {
        k: {"winRate": rate(w, g), "games": g}
        for k, (g, w) in sorted(pairs.items(), key=lambda kv: -kv[1][0])
    }
    return {"games": games, "winRate": rate(wins, games), "colorPairs": color_out, "cards": card_out}


def build_ata(path: Path) -> dict[str, float]:
    """Average pick a card is taken at (1-based within a pack), 17Lands' ATA."""
    totals: dict[str, list[int]] = {}
    with open_csv(path) as f:
        reader = csv.reader(f)
        header = next(reader)
        pick_i, num_i = header.index("pick"), header.index("pick_number")
        for row in reader:
            if len(row) <= max(pick_i, num_i) or not row[num_i].isdigit():
                continue
            t = totals.setdefault(row[pick_i], [0, 0])
            t[0] += 1
            t[1] += int(row[num_i]) + 1
    return {name: round(s / n, 2) for name, (n, s) in totals.items() if n}


def build_set(code: str, modified: str, with_draft: bool) -> tuple[str, dict]:
    """Download and summarize one set (runs in a worker process)."""
    with tempfile.TemporaryDirectory() as tmp:
        gz = Path(tmp) / "game.csv.gz"
        download(GAME_URL.format(set=code), gz)
        stats = build_game_stats(gz)
        gz.unlink()
        ata_modified = None
        if with_draft:
            draft_url = DRAFT_URL.format(set=code)
            ata_modified = head_last_modified(draft_url)
            if ata_modified:
                dgz = Path(tmp) / "draft.csv.gz"
                download(draft_url, dgz)
                for name, ata in build_ata(dgz).items():
                    if name in stats["cards"]:
                        stats["cards"][name]["ata"] = ata

    out = {
        "set": code,
        "format": "PremierDraft",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "name": "17Lands public datasets",
            "url": "https://www.17lands.com/public_datasets",
            "license": "CC BY 4.0",
            "gameDataModified": modified,
            "draftDataModified": ata_modified,
        },
        **stats,
    }
    return code, out


def save_manifest(manifest: dict) -> None:
    manifest["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest["sets"] = dict(sorted(manifest["sets"].items()))
    MANIFEST.write_text(json.dumps(manifest, indent=2) + NL, "utf-8", newline=NL)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sets", help="comma-separated set codes (default: all draftable sets)")
    ap.add_argument("--with-draft", action="store_true", help="also compute ATA from draft data")
    ap.add_argument("--force", action="store_true", help="rebuild even if unchanged")
    ap.add_argument("--jobs", type=int, default=4, help="sets built in parallel (default 4)")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {"sets": {}}
    sets = [s.strip().upper() for s in args.sets.split(",")] if args.sets else candidate_sets()
    log(f"Checking {len(sets)} set(s)")

    # Cheap, polite, serial HEAD checks decide what needs rebuilding.
    todo: list[tuple[str, str]] = []
    for code in sets:
        modified = head_last_modified(GAME_URL.format(set=code))
        time.sleep(0.2)
        if modified is None:
            continue
        prev = manifest["sets"].get(code, {})
        if not args.force and prev.get("gameDataModified") == modified and (prev.get("hasAta") or not args.with_draft):
            continue
        todo.append((code, modified))
    log(f"Rebuilding {len(todo)} set(s) with {max(1, args.jobs)} worker(s): {', '.join(c for c, _ in todo) or '-'}")

    changed = failed = 0
    with ProcessPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        futures = {pool.submit(build_set, code, modified, args.with_draft): code for code, modified in todo}
        for fut in as_completed(futures):
            code = futures[fut]
            try:
                _, out = fut.result()
            except Exception as e:  # one bad file shouldn't sink the whole run
                failed += 1
                log(f"{code}: FAILED: {e}")
                continue
            (OUT_DIR / f"{code}.json").write_text(
                json.dumps(out, separators=(",", ":"), ensure_ascii=False) + NL, "utf-8", newline=NL)
            manifest["sets"][code] = {
                "gameDataModified": out["source"]["gameDataModified"],
                "games": out["games"],
                "cards": len(out["cards"]),
                "hasAta": bool(out["source"]["draftDataModified"]),
                "generatedAt": out["generatedAt"],
            }
            save_manifest(manifest)  # after every set, so an interrupted run keeps its progress
            changed += 1
            log(f"{code}: {out['games']:,} games, {len(out['cards'])} cards")

    log(f"Done: {changed} set(s) rebuilt, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
