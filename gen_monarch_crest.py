"""
MONARCH crest generator — draws an original sigil (no external assets).
Out: assets/monarch-crest.png (512x512) and icons/monarch-*.png for the APK.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
W = H = 512
S = 4  # supersample
W2, H2 = W * S, H * S

img = Image.new("RGB", (W2, H2), (6, 4, 16))
d = ImageDraw.Draw(img)

cx, cy = W2 // 2, H2 // 2

# --- soft radial background glow ---
glow = Image.new("RGB", (W2, H2), (0, 0, 0))
gd = ImageDraw.Draw(glow)
for r, a in [(int(240 * S), 34), (int(180 * S), 30), (int(120 * S), 26), (int(70 * S), 22)]:
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(a // 8, a // 14, a))
glow = glow.filter(ImageFilter.GaussianBlur(40 * S // 2))
img = Image.blend(img, Image.composite(glow, img, glow.convert("L")), 1.0)
d = ImageDraw.Draw(img, "RGBA")

# --- outer ring ---
outer_r = int(190 * S)
ring = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
rd = ImageDraw.Draw(ring)
rd.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], outline=(167, 139, 250, 255), width=int(10 * S))
rd.ellipse([cx - outer_r + 30 * S, cy - outer_r + 30 * S, cx + outer_r - 30 * S, cy + outer_r - 30 * S], outline=(109, 40, 217, 200), width=int(3 * S))
blur = ring.filter(ImageFilter.GaussianBlur(6 * S))
img.paste(blur, (0, 0), blur)
img.paste(ring, (0, 0), ring)

# --- sigil: abstract monarch crown/glyph ---
violet = (167, 139, 250, 255)
violet_hot = (216, 195, 255, 255)
core = (139, 92, 246, 255)
deep = (24, 13, 44, 255)

def shard(points, fill=deep, outline=violet, gloww=None):
    d.polygon(points, fill=fill, outline=outline)
    if outline:
        d.line(points + [points[0]], fill=outline, width=int(3.2 * S), joint="curve")

# center spike
shard([(cx, cy - int(150 * S)), (cx + int(34 * S), cy - int(58 * S)), (cx + int(20 * S), cy + int(20 * S)),
       (cx, cy + int(58 * S)), (cx - int(20 * S), cy + int(20 * S)), (cx - int(34 * S), cy - int(58 * S))])
# side shards (symmetric)
shard([(cx - int(66 * S), cy - int(120 * S)), (cx - int(96 * S), cy - int(34 * S)), (cx - int(58 * S), cy + int(96 * S)),
       (cx - int(28 * S), cy + int(8 * S)), (cx - int(30 * S), cy - int(60 * S))])
shard([(cx + int(66 * S), cy - int(120 * S)), (cx + int(96 * S), cy - int(34 * S)), (cx + int(58 * S), cy + int(96 * S)),
       (cx + int(28 * S), cy + int(8 * S)), (cx + int(30 * S), cy - int(60 * S))])
# shoulder shards
shard([(cx - int(128 * S), cy - int(30 * S)), (cx - int(152 * S), cy + int(58 * S)), (cx - int(88 * S), cy + int(116 * S)),
       (cx - int(92 * S), cy + int(8 * S))])
shard([(cx + int(128 * S), cy - int(30 * S)), (cx + int(152 * S), cy + int(58 * S)), (cx + int(88 * S), cy + int(116 * S)),
       (cx + int(92 * S), cy + int(8 * S))])

# inner core glow embers
core_layer = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
cd = ImageDraw.Draw(core_layer)
cd.ellipse([cx - int(46 * S), cy - int(40 * S), cx + int(46 * S), cy + int(40 * S)], fill=(139, 92, 246, 160))
cd.ellipse([cx - int(18 * S), cy - int(18 * S), cx + int(18 * S), cy + int(18 * S)], fill=(196, 181, 253, 220))
core_layer = core_layer.filter(ImageFilter.GaussianBlur(8 * S))
img.paste(core_layer, (0, 0), core_layer)

# center glyph slit
d.line([(cx, cy - int(108 * S)), (cx, cy + int(34 * S))], fill=violet_hot, width=int(4 * S))

# ember dots
import random
random.seed(11)
for _ in range(42):
    ang = random.uniform(0, 2 * math.pi)
    rad = random.uniform(outer_r * 0.35, outer_r * 0.92)
    x = cx + math.cos(ang) * rad
    y = cy + math.sin(ang) * rad
    r = random.uniform(1.6, 4.6) * S
    a = random.randint(90, 220)
    d.ellipse([x - r, y - r, x + r, y + r], fill=(167, 139, 250, a))

img = img.resize((W, H), Image.LANCZOS)
assets = ROOT / "assets"
assets.mkdir(exist_ok=True)
img.save(assets / "monarch-crest.png")

# app icon: solid square crop with same crest
icon_bg = Image.new("RGB", (512, 512), (11, 7, 22))
crest = img.resize((384, 384), Image.LANCZOS)
icon_bg.paste(crest, ((512 - 384) // 2, (512 - 384) // 2), crest.convert("RGBA") if crest.mode == "RGBA" else None)
icon_bg.save(assets / "monarch-icon-512.png")

mask = Image.new("RGBA", (512, 512), (11, 7, 22, 255))
crest2 = img.resize((400, 400), Image.LANCZOS)
mask.paste(crest2, ((512 - 400) // 2, (512 - 400) // 2), crest2.convert("RGBA") if crest2.mode == "RGBA" else None)
mask.save(assets / "monarch-icon-maskable.png")
print("wrote", assets / "monarch-crest.png")
