import os, re, sys, glob

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

errors = []

# 1. JS syntax check via node
import subprocess
r = subprocess.run(["node", "--check", "scripts/app.js"], capture_output=True, text=True)
if r.returncode != 0:
    errors.append("app.js syntax: " + r.stderr)
else:
    print("OK  app.js syntax valid")

# 2. Collect IDs referenced by app.js
app = open("scripts/app.js", encoding="utf-8").read()
ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", app))
# classes used by querySelectorAll
classes = set(re.findall(r"querySelectorAll\(['\"]\.([a-zA-Z0-9_-]+)['\"]\)", app))

# 3. Every page must have header/footer placeholders + CSS/JS links
pages = [p for p in glob.glob("*.html") if not p.startswith("_")]
print(f"Pages found: {len(pages)} -> {sorted(pages)}")

for p in sorted(pages):
    html = open(p, encoding="utf-8").read()
    checks = {
        "site-header": 'id="site-header"' in html,
        "site-footer": 'id="site-footer"' in html,
        "design-system.css": "styles/design-system.css" in html,
        "pages.css": "styles/pages.css" in html,
        "app.js": "scripts/app.js" in html,
        "toast-hub": 'id="toast-hub"' in html,
        "data-page": re.search(r'<body data-page="([^"]+)"', html) is not None,
    }
    missing = [k for k, v in checks.items() if not v]
    if missing:
        errors.append(f"{p}: missing {missing}")

# 4. Per-page ID requirements
page_ids = {
    "index.html": ["hero-canvas"],
    "awakening.html": ["chapter-canvas"],
    "extraction.html": ["chapter-canvas"],
    "arise.html": ["chapter-canvas"],
    "army.html": ["chapter-canvas"],
    "status.html": ["st-level","st-rank","st-gold","st-fatigue","st-ap","st-hp","st-mp","st-exp","st-expbar","stat-str","stat-agi","stat-vit","stat-int","stat-per","st-reset"],
    "quests.html": ["quests-container","quest-title","quest-rank","quest-minutes","add-quest"],
    "vision.html": ["camera-video","camera-canvas","cam-start","cam-scan","cam-stop","cam-status","assessment-out","reminder-text","reminder-minutes","reminder-add","reminder-list"],
    "advisor.html": ["chat-form","chat-input","chat-messages"],
    "progress.html": ["trans-grid","trans-modal","trans-open","trans-close","trans-form","trans-author","trans-before","trans-after","trans-caption","trans-perm","trans-cancel"],
    "inventory.html": ["inv-grid"],
}
for page, needed in page_ids.items():
    if not os.path.exists(page):
        errors.append(f"missing page {page}")
        continue
    html = open(page, encoding="utf-8").read()
    for i in needed:
        if f'id="{i}"' not in html and i != "inv-grid":
            errors.append(f"{page}: missing id={i}")
    # class checks
    if page == "quests.html" and "quests-container" in html:
        pass
    if page == "advisor.html":
        if "quick-chip" not in html: errors.append("advisor: missing .quick-chip")
    if page == "inventory.html":
        if 'class="inv-grid"' not in html: errors.append("inventory: missing .inv-grid")

# 5. CSS files exist
for f in ["styles/design-system.css","styles/pages.css","scripts/app.js"]:
    if not os.path.exists(f):
        errors.append(f"missing file {f}")

print("\n--- RESULT ---")
if errors:
    for e in errors:
        print("FAIL:", e)
    sys.exit(1)
else:
    print("ALL CHECKS PASSED")
