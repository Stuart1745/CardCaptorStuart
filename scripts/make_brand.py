"""Build every logo and icon the site serves from the brand masters in assets/brand/.

The masters are Stuart's Gemini-generated images (2026-11-24), downsized:
  assets/brand/emblem.png   winged pink "S" in a magic circle, on navy (square)
  assets/brand/banner.jpg   wide "CARD CAPTOR STUART" banner
  assets/brand/stacked.jpg  stacked "CARD CAPTOR / STUART" logo

Run from the repo root:  python scripts/make_brand.py
Writes: src/app/icon.png (512), src/app/apple-icon.png (180), src/app/favicon.ico (16/32/48),
public/logo.png (64), public/brand/banner.png (nav sticker), public/brand/stacked.jpg (sign-in),
src/app/opengraph-image.jpg (1200x630 link preview).
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "brand"


def rounded(img: Image.Image, radius_frac: float) -> Image.Image:
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    r = int(min(img.size) * radius_frac)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=r, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main():
    emblem = Image.open(SRC / "emblem.png").convert("RGB")
    s = emblem.width
    # Full emblem, trimmed of most of the navy margin, for the app icons
    full = emblem.crop((int(s * 0.06), int(s * 0.06), int(s * 0.94), int(s * 0.94)))
    rounded(full.resize((512, 512), Image.LANCZOS), 0.22).save(ROOT / "src/app/icon.png", optimize=True)
    full.resize((180, 180), Image.LANCZOS).save(ROOT / "src/app/apple-icon.png", optimize=True)  # iOS rounds it
    rounded(full.resize((128, 128), Image.LANCZOS), 0.22).resize((64, 64), Image.LANCZOS).save(ROOT / "public/logo.png", optimize=True)
    # Favicon: tighter on the S and star so it still reads at 16 px
    tight = emblem.crop((int(s * 0.14), int(s * 0.11), int(s * 0.85), int(s * 0.82)))
    rounded(tight.resize((256, 256), Image.LANCZOS), 0.22).save(ROOT / "src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Nav sticker: the banner's lettering band, wings included
    banner = Image.open(SRC / "banner.jpg").convert("RGB")
    w, h = banner.size
    band = banner.crop((int(w * 0.028), int(h * 0.32), int(w * 0.966), int(h * 0.745)))
    band_h = 200
    band = band.resize((round(band.width * band_h / band.height), band_h), Image.LANCZOS)
    (ROOT / "public/brand").mkdir(parents=True, exist_ok=True)
    rounded(band, 0.16).save(ROOT / "public/brand/banner.png", optimize=True)

    # Sign-in logo and the link-preview image
    stacked = Image.open(SRC / "stacked.jpg").convert("RGB")
    stacked.resize((1200, round(stacked.height * 1200 / stacked.width)), Image.LANCZOS).save(ROOT / "public/brand/stacked.jpg", quality=86, optimize=True)
    og_h = 630
    scaled = stacked.resize((round(stacked.width * og_h / stacked.height), og_h), Image.LANCZOS)
    og = Image.new("RGB", (1200, 630), stacked.getpixel((4, 4)))
    og.paste(scaled, ((1200 - scaled.width) // 2, 0))
    og.save(ROOT / "src/app/opengraph-image.jpg", quality=86, optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
