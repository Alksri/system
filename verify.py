import os
import re
import sys
import glob
import subprocess

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

errors = []

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()

# 1. JS syntax check
for js in ["scripts/app.js", "scripts/auth.js", "scripts/login.js", "scripts/config.js"]:
    if not os.path.exists(js):
        errors.append(f"missing file {js}")
        continue
    r = subprocess.run(["node", "--check", js], capture_output=True, text=True)
    if r.returncode != 0:
        errors.append(f"{js} syntax: {r.stderr.strip()}")
    else:
        print(f"OK  {js} syntax valid")

# 2. Core files exist
for f in [
    "styles/design-system.css", "styles/pages.css", "styles/auth.css",
    "login.html", "index.html",
]:
    if not os.path.exists(f):
        errors.append(f"missing file {f}")

# 3. Pages present
pages = [p for p in glob.glob("*.html") if not p.startswith("_")]
print(f"Pages found: {len(pages)} -> {sorted(pages)}")

protected = [
    "index.html", "awakening.html", "extraction.html", "arise.html", "army.html",
    "status.html", "quests.html", "vision.html", "advisor.html", "progress.html",
    "inventory.html", "diet.html", "foods.html", "nutrition.html",
]

# 4. Protected page checks
for p in protected:
    if not os.path.exists(p):
        errors.append(f"missing page {p}")
        continue
    html = read(p)
    checks = {
        "site-header": 'id="site-header"' in html,
        "site-footer": 'id="site-footer"' in html,
        "design-system.css": "styles/design-system.css" in html,
        "pages.css": "styles/pages.css" in html,
        "app.js": "scripts/app.js" in html,
        "toast-hub": 'id="toast-hub"' in html,
        "data-page": re.search(r'<body data-page="([^"]+)"', html) is not None,
        "config.js": "scripts/config.js" in html,
        "auth.js": "scripts/auth.js" in html,
        "requireAuth": "SystemAuth.requireAuth()" in html,
    }
    missing = [k for k, v in checks.items() if not v]
    if missing:
        errors.append(f"{p}: missing {missing}")

# 5. Login page checks (different structure)
if os.path.exists("login.html"):
    html = read("login.html")
    login_checks = {
        "config.js": "scripts/config.js" in html,
        "auth.js": "scripts/auth.js" in html,
        "login.js": "scripts/login.js" in html,
        "design-system.css": "styles/design-system.css" in html,
        "auth.css": "styles/auth.css" in html,
        "auth-form": 'id="auth-form"' in html,
        "auth-canvas": 'id="auth-canvas"' in html,
        "admin-email": 'id="admin-email"' in html,
        "admin-password": 'id="admin-password"' in html,
        "brand-name": "brand-name" in html,
    }
    missing = [k for k, v in login_checks.items() if not v]
    if missing:
        errors.append(f"login.html: missing {missing}")

# 6. Per-page ID/structure requirements
page_ids = {
    "index.html": ["hero-canvas", "home-rank-chip", "home-notice-title", "home-level", "home-ticker"],
    "awakening.html": ["chapter-canvas"],
    "extraction.html": ["chapter-canvas"],
    "arise.html": ["chapter-canvas"],
    "army.html": ["chapter-canvas"],
    "status.html": [
        "st-level", "st-rank", "st-gold", "st-fatigue", "st-ap", "st-hp", "st-mp",
        "st-exp", "st-expbar", "stat-str", "stat-agi", "stat-vit", "stat-int", "stat-per", "st-reset",
        "st-name", "st-avatar", "st-completed", "st-streak"
    ],
    "quests.html": ["quests-container", "quest-title", "quest-rank", "quest-minutes", "add-quest", "quest-history"],
    "vision.html": [
        "camera-video", "camera-canvas", "cam-start", "cam-capture", "cam-stop",
        "cam-status", "assessment-out", "reminder-text", "reminder-minutes", "reminder-add",
        "reminder-list", "checkin-gallery"
    ],
    "advisor.html": ["chat-form", "chat-input", "chat-messages"],
    "progress.html": [
        "trans-grid", "trans-modal", "trans-open", "trans-close", "trans-form",
        "trans-author", "trans-before", "trans-after", "trans-caption", "trans-perm", "trans-cancel"
    ],
    "inventory.html": ["inv-grid", "skill-list", "inv-count"],
    "diet.html": ["bmi-form", "bmi-age", "bmi-height", "bmi-weight", "bmi-result", "diet-plan"],
    "foods.html": ["food-list", "food-search", "food-category", "food-grams"],
    "nutrition.html": ["meal-name", "meal-search", "meal-item", "meal-grams", "meal-add", "meal-rows", "meal-totals"],
}

for page, needed in page_ids.items():
    if not os.path.exists(page):
        continue
    html = read(page)
    for i in needed:
        if f'id="{i}"' not in html:
            errors.append(f"{page}: missing id={i}")

# 7. Config has admin credentials set
if os.path.exists("scripts/config.js"):
    cfg = read("scripts/config.js")
    if "adminEmail" not in cfg or "adminPassword" not in cfg:
        errors.append("scripts/config.js: missing adminEmail/adminPassword")
    if "admin@system.local" not in cfg:
        errors.append("scripts/config.js: expected default admin email not found")

# 8. Frame assets sanity
frames = glob.glob("ezgif-frame-*.jpg")
if len(frames) != 270:
    errors.append(f"expected 270 frame images, found {len(frames)}")

# 9. Nutrition data & new pages assets
for f in ["scripts/nutrition-data.js", "diet.html", "foods.html", "nutrition.html"]:
    if not os.path.exists(f):
        errors.append(f"missing file {f}")

# 10. Implementation PDF exists
if not os.path.exists("IMPLEMENTATION.pdf"):
    errors.append("missing IMPLEMENTATION.pdf")

print("\n--- RESULT ---")
if errors:
    for e in errors:
        print("FAIL:", e)
    sys.exit(1)
else:
    print("ALL CHECKS PASSED")
