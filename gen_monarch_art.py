"""MONARCH art pack: nebula backdrop (1080x2400) + six rank emblems (512px)."""
from PIL import Image, ImageDraw, ImageFilter
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent
A = ROOT / "assets"
A.mkdir(exist_ok=True)
(A / "ranks").mkdir(exist_ok=True)

# ---------------------------------------------------------------- nebula
print("nebula...")
W, H = 1080, 1920
img = Image.new("RGB", (W, H), (4, 3, 12))
draw = ImageDraw.Draw(img)

# vertical gradient over the full height (no seam)
for y in range(H):
    t = y / H
    r = int(14 * (1 - t) + 4 * t)
    g = int(6 * (1 - t) + 3 * t)
    b = int(26 * (1 - t) + 12 * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# nebula clouds (many soft colored blobs)
random.seed(7)
img = img.filter(ImageFilter.GaussianBlur(2))
cloud = Image.new("RGB", (W, H), (0, 0, 0))
cd = ImageDraw.Draw(cloud)
for _ in range(90):
    cx = random.uniform(0, W); cy = random.uniform(0, H)
    rx = random.uniform(90, 380); ry = random.uniform(60, 240)
    v = random.choice([(74, 33, 150), (99, 40, 220), (139, 60, 250), (56, 20, 120), (120, 70, 240)])
    a = random.uniform(0.35, 0.8)
    cd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=tuple(int(x * a) for x in v))
cloud = cloud.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, Image.composite(cloud, img, cloud.convert("L")), 1.0)

# starfield
star_img = Image.new("RGB", (W, H), (0, 0, 0))
sd = ImageDraw.Draw(star_img)
for _ in range(420):
    x, y = random.uniform(0, W), random.uniform(0, H)
    r = random.choice([1, 1, 1, 2, 2, 3])
    v = random.randint(120, 255)
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, int(v * 0.92)))
star_img = star_img.filter(ImageFilter.GaussianBlur(0.6))
img = Image.blend(img, Image.composite(star_img, img, star_img.convert("L")), 1.0)

# bright core glow (ellipse)
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W * 0.30, H * 0.02, W * 0.70, H * 0.34], fill=(90, 45, 190))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, Image.composite(glow, img, glow.convert("L")), 1.0)

img.save(A / "nebula.png")
print("nebula saved")

# ---------------------------------------------------------------- rank emblems
RANKS = {
    "e": ("assistant", (198, 200, 206)),   # visual: gray shards
    "d": ("scout", (140, 210, 220)),       # teal chevrons
    "c": ("veteran", (245, 215, 120)),     # gold chevron
    "b": ("elite", (250, 165, 110)),       # orange claw
    "a": ("master", (255, 120, 160)),      # magenta flame
    "s": ("monarch", (196, 170, 255)),     # violet crown
}
S = 3
def new_rank():
    im = Image.new("RGBA", (512 * S, 512 * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im), 256 * S, 256 * S

def finish(im, name):
    im = im.resize((512, 512), Image.LANCZOS)
    im2 = Image.new("RGB", (512, 512), (8, 6, 18))
    im2.paste(im, (0, 0), im)
    im2.save(A / "ranks" / f"rank-{name}.png")
    print("rank", name, "saved")

def ring(d, cx, cy, rr, width, color):
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=color, width=width)

for key, (motif, col) in RANKS.items():
    im, d, cx, cy = new_rank()
    # orbit ring
    ring(d, cx, cy, int(178 * S), int(7 * S), col)
    ring(d, cx, cy, int(142 * S), int(2 * S), (*col, 90))
    C = (*col, 255)
    tall = int(80 * S)
    # common: center diamond + flanking shards
    d.polygon([(cx, cy - tall), (cx + int(34 * S), cy), (cx, cy + int(72 * S)), (cx - int(34 * S), cy)], fill=(16, 12, 30, 255), outline=C, width=int(5 * S))
    d.polygon([(cx - int(64 * S), cy - int(60 * S)), (cx - int(96 * S), cy + int(30 * S)), (cx - int(40 * S), cy + int(80 * S)), (cx - int(26 * S), cy - int(8 * S))], fill=(16, 12, 30, 255), outline=C, width=int(4 * S))
    d.polygon([(cx + int(64 * S), cy - int(60 * S)), (cx + int(96 * S), cy + int(30 * S)), (cx + int(40 * S), cy + int(80 * S)), (cx + int(26 * S), cy - int(8 * S))], fill=(16, 12, 30, 255), outline=C, width=int(4 * S))
    if key in ("c", "b", "a", "s"):
        d.polygon([(cx - int(30 * S), cy - int(150 * S)), (cx, cy - int(105 * S)), (cx + int(30 * S), cy - int(150 * S)), (cx + int(20 * S), cy - int(95 * S)), (cx - int(20 * S), cy - int(95 * S))], fill=(16, 12, 30, 255), outline=C, width=int(4 * S))
    if key in ("b", "a", "s"):
        d.line([(cx, cy - int(140 * S)), (cx, cy + int(30 * S))], fill=C, width=int(3.2 * S))
    if key in ("a", "s"):
        d.arc([cx - int(120 * S), cy - int(120 * S), cx + int(120 * S), cy + int(120 * S)], 200, 340, fill=C, width=int(6 * S))
    if key == "s":
        d.polygon([(cx - int(58 * S), cy - int(140 * S)), (cx, cy - int(185 * S)), (cx + int(58 * S), cy - int(140 * S))], fill=(16, 12, 30, 255), outline=C, width=int(5 * S))
    # core ember
    cd2 = ImageDraw.Draw(im)
    cd2.ellipse([cx - int(26 * S), cy - int(24 * S), cx + int(26 * S), cy + int(24 * S)], fill=(*col, 210))
    finish(im, key)
print("done")
