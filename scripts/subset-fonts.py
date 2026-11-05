"""Subset the two variable fonts to Latin (+ IAST diacritics for Indian names) and ₹.

Run: npm run fonts. Output: public/fonts/*.woff2. Needs: pip install fonttools brotli
Sources: google/fonts (SIL OFL 1.1). Licences copied next to the output.
"""
import shutil
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts/data/fonts"
OUT = ROOT / "public/fonts"
OUT.mkdir(parents=True, exist_ok=True)

# Basic Latin, Latin-1, Latin Ext-A, Latin Ext Additional (ā ī ū ṭ ḍ ṇ ś ṣ …), punctuation,
# ₹, primes for coordinates, arrows, minus, multiplication.
UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x1E00, 0x1F00))
    + list(range(0x2000, 0x2070)) + [0x20B9, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x2212, 0x2215, 0x2032, 0x2033, 0x25CF, 0x2713]
)

# Display face only sets headlines/HUD labels: Basic Latin + Latin-1 + punctuation + ₹ keeps it small.
DISPLAY_UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x2010, 0x2027)) + [0x20B9, 0x2032, 0x2033, 0x2192, 0x2197, 0x2212, 0x00D7]

JOBS = [
    # (source, output, axis limits)
    ("AnekLatin[wdth,wght].ttf", "anek-latin-var.woff2", {"wght": (500, 750), "wdth": (75, 125)}, DISPLAY_UNICODES),
    ("Inter[opsz,wght].ttf", "inter-var.woff2", {"wght": (400, 700), "opsz": 14}, UNICODES),
]

for src, out, limits, unicodes in JOBS:
    # Instancing first and saving round-trips gvar; subsetting a freshly instanced font
    # in-memory trips a lazy-loading KeyError in fontTools 4.68.
    tmp = OUT / (out + ".tmp.ttf")
    instancer.instantiateVariableFont(TTFont(SRC / src), limits).save(tmp)
    font = TTFont(tmp)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "tnum", "case", "ss01", "cv11"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    dest = OUT / out
    font.flavor = "woff2"
    font.save(dest)
    cmap = font.getBestCmap()
    assert 0x20B9 in cmap, f"{out}: ₹ glyph missing after subsetting"
    tmp.unlink()
    print(f"{out}: {dest.stat().st_size/1024:.1f} KB, glyphs={len(font.getGlyphOrder())}, rupee={0x20B9 in cmap}")

for lic in SRC.glob("OFL-*.txt"):
    shutil.copy(lic, OUT / lic.name)
