from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)

INK = HexColor("#121317")
INK_60 = HexColor("#5b606f")
LAV = HexColor("#b7bfd9")
LAV_SOFT = HexColor("#eef0f8")
WHITE = HexColor("#ffffff")
BORDER = HexColor("#e5e7eb")

PAGE_W, PAGE_H = A4
M = 15 * mm
CONTENT_W = PAGE_W - 2 * M

def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=8.2, leading=11.6, textColor=INK_60)
    base.update(kw)
    return ParagraphStyle(name, **base)

title = S("title", fontSize=26, leading=29, textColor=INK, spaceAfter=2)
sub = S("sub", fontSize=10.2, leading=14, textColor=INK_60, spaceAfter=8)
kicker = S("kicker", fontName="Helvetica-Bold", fontSize=7.2, leading=10, textColor=INK, spaceAfter=3)
h1 = S("h1", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=INK, spaceBefore=8, spaceAfter=4)
body = S("body", fontSize=8.2, leading=11.6, textColor=INK_60, spaceAfter=3)
bullet = S("bullet", fontSize=8.1, leading=11.2, textColor=INK_60, leftIndent=9, bulletIndent=1, spaceAfter=1.2)
cell = S("cell", fontSize=7.2, leading=9.4, textColor=INK_60)
cell_ink = S("cellInk", parent=cell, fontName="Helvetica-Bold", textColor=INK)
cell_mono = S("cellMono", fontName="Courier", fontSize=6.7, leading=9.0, textColor=INK)
foot = S("foot", fontSize=7.0, leading=9.2, textColor=INK_60)

def rule(gap=4):
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=gap, spaceAfter=gap)

def bullets(items):
    out = []
    for it in items:
        out.append(Paragraph(f"<font color='#b7bfd9'>•</font>&nbsp;&nbsp;{it}", bullet))
    return out

def table(rows, widths, header=True, pad=3.2):
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), pad),
        ("RIGHTPADDING", (0,0), (-1,-1), pad),
        ("TOPPADDING", (0,0), (-1,-1), pad),
        ("BOTTOMPADDING", (0,0), (-1,-1), pad),
        ("LINEBELOW", (0,0), (-1,-1), 0.5, BORDER),
    ]
    if header:
        style += [
            ("BACKGROUND", (0,0), (-1,0), LAV_SOFT),
            ("LINEBELOW", (0,0), (-1,0), 0.75, BORDER),
        ]
    t.setStyle(TableStyle(style))
    return t

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(M, PAGE_H - 12*mm, PAGE_W - M, PAGE_H - 12*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(INK_60)
    canvas.drawString(M, PAGE_H - 10.2*mm, "System Portal — Implementation & Technologies")
    canvas.drawRightString(PAGE_W - M, PAGE_H - 10.2*mm, f"{doc.page} / 4")
    canvas.setStrokeColor(BORDER)
    canvas.line(M, 10.5*mm, PAGE_W - M, 10.5*mm)
    canvas.drawString(M, 7.2*mm, "Public repository: system · Static build · Localhost-ready")
    canvas.restoreState()

OUT = "IMPLEMENTATION.pdf"
doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=13*mm, bottomMargin=16*mm, title="System Portal Implementation", author="System Portal")

story = []
story.append(Paragraph("IMPLEMENTATION", kicker))
story.append(Paragraph("System Portal", title))
story.append(Paragraph("Architecture, implementation details, and every technology/tool used in this build.", sub))
story.append(rule(0))

story.append(Paragraph("1. Overview", h1))
story.append(Paragraph(
    "System Portal is a static, multi-page gamified progression dashboard inspired by Solo Leveling’s ‘System’ UI. "
    "It runs entirely in the browser (no backend). Users must authenticate before accessing the site; each account gets "
    "its own local progression profile (quests, stats, XP, gold, streaks, check-ins, transformation posts). "
    "All 270 supplied frame images are used for autoplaying cinematic chapter/hero sequences.", body))

story.append(Paragraph("2. Repository & file structure", h1))
rows = [
    [Paragraph("Path", cell_ink), Paragraph("Purpose", cell_ink)],
    [Paragraph("index.html + 10 pages", cell_mono), Paragraph("Home, 4 chapter pages (awakening, extraction, arise, army), 6 dashboard modules (status, quests, vision, advisor, progress, inventory). All protected by auth guard.", cell)],
    [Paragraph("login.html", cell_mono), Paragraph("Sign-in/sign-up screen with Google Identity Services button (when configured) and local email/password auth, plus animated visuals.", cell)],
    [Paragraph("styles/design-system.css", cell_mono), Paragraph("Global tokens, reset, typography, layout, components, navigation, user menu, empty/history/check-in states, responsive rules.", cell)],
    [Paragraph("styles/pages.css", cell_mono), Paragraph("Page composition: hero/chapter stages, HUD, modules, gauges, quests, chat, inventory, modals, toasts, motion/FX, boot sequence, ticker, notifications.", cell)],
    [Paragraph("styles/auth.css", cell_mono), Paragraph("Login layout and animations (particles canvas, orbs, rings, scan beam, entrance transitions).", cell)],
    [Paragraph("scripts/config.js", cell_mono), Paragraph("Runtime config: app name, Google OAuth client ID placeholder, session hours, built-in admin email/name/password.", cell)],
    [Paragraph("scripts/auth.js", cell_mono), Paragraph("Client-side auth: session storage/expiry, route guard, local account hashing (PBKDF2-SHA-256), sign-in/up, admin seeding, Google credential decode + audience/expiry checks.", cell)],
    [Paragraph("scripts/login.js", cell_mono), Paragraph("Login UI controller: tabs, form handling, GIS initialization/rendering, particle animation on the visual panel.", cell)],
    [Paragraph("scripts/app.js", cell_mono), Paragraph("Shared app: shell/header/footer, per-user Store (v3), progression math, frame player, FX, and page initializers for every module.", cell)],
    [Paragraph("ezgif-frame-001.jpg … 270.jpg", cell_mono), Paragraph("270 animation frames used by the canvas frame player (home slice + full chapter slices).", cell)],
    [Paragraph("generate_build_report.py", cell_mono), Paragraph("ReportLab script that generates the 3-page build report PDF (SYSTEM_PORTAL_BUILD_REPORT.pdf).", cell)],
    [Paragraph("generate_implementation_pdf.py", cell_mono), Paragraph("ReportLab script that generates this implementation PDF (IMPLEMENTATION.pdf).", cell)],
    [Paragraph("verify.py", cell_mono), Paragraph("Validation helper for pages/structure/IDs (project checks).", cell)],
]
story.append(table(rows, [0.34*CONTENT_W, 0.66*CONTENT_W]))
story.append(PageBreak())

story.append(Paragraph("3. Authentication & access control", h1))
story += bullets([
    "<b>Route guard:</b> every protected HTML page loads <font face='Courier'>config.js</font>, <font face='Courier'>auth.js</font>, then calls <font face='Courier'>SystemAuth.requireAuth()</font> in <font face='Courier'>&lt;head&gt;</font> to redirect unauthenticated visitors to <font face='Courier'>login.html?next=…</font> before content paints.",
    "<b>Local accounts:</b> email/password accounts stored in <font face='Courier'>localStorage</font> (<font face='Courier'>system_portal_users_v1</font>). Passwords are never stored in plain text: PBKDF2-SHA-256 via Web Crypto with 210,000 iterations and a random 16-byte salt per account.",
    "<b>Built-in admin:</b> configured in <font face='Courier'>scripts/config.js</font> (admin@system.local / AriseAdmin#2026 by default) and ensured/hashed on admin sign-in.",
    "<b>Google Sign-In:</b> Google Identity Services (<font face='Courier'>accounts.google.com/gsi/client</font>) renders a real sign-in button when a valid OAuth Web client ID is set. The ID token payload is decoded in-browser; audience and expiry are checked. <b>Limitation (static site):</b> token signature cannot be server-verified without a backend.",
    "<b>Sessions:</b> stored in <font face='Courier'>localStorage</font> (<font face='Courier'>system_portal_session_v1</font>) with configurable expiry (default 12 hours); sign-out and cross-tab storage events clear/redirect sessions.",
])

story.append(Paragraph("4. Data model & progression (real, derived)", h1))
story += bullets([
    "<b>Per-user storage:</b> <font face='Courier'>system_portal_state_v3_&lt;email&gt;</font>. New accounts start at Level 1, Rank E, 0 XP/gold/AP, stats 10/10/10/10/10, no preloaded quests/items/check-ins.",
    "<b>XP & leveling:</b> XP to next level = <font face='Courier'>100 + (level-1)*50</font>. Completing quests grants XP; level-ups grant +3 ability points. Ranks/titles are derived from level (E→S).",
    "<b>Quests:</b> user-created with title, rank (E–S multiplier), and duration. Rewards computed as duration × rank multiplier (XP/gold/AP shown before issuing). Deadlines are real wall-clock timestamps; expiry applies fatigue/penalty rules; history is recorded.",
    "<b>Stats & derived vitals:</b> STR/AGI/VIT/INT/PER allocated from earned AP. Max HP/MP and gauges are derived from level and stats. Streaks computed from completed quest dates.",
    "<b>Vision/check-ins:</b> real camera capture via <font face='Courier'>getUserMedia</font>, frames downscaled to canvas and stored locally as JPEG data URLs (no upload, no fake posture analysis). Reminders use real due timestamps.",
    "<b>Progress feed:</b> user-uploaded before/current photos resized client-side and stored locally with consent; no fabricated sample posts.",
    "<b>Inventory/milestones:</b> records and skills unlock from real counts/levels/streaks (no stat buffs). Advisor answers from the user’s actual state via deterministic rules.",
])

story.append(Paragraph("5. Animation & visual system", h1))
story += bullets([
    "<b>Frame player:</b> custom canvas player preloads frame slices, draws with DPR scaling and cover-fit (bottom watermark cropped), autoplays at fixed fps, loops, pauses offscreen (IntersectionObserver), supports play/pause + progress UI.",
    "<b>Sequences:</b> Home hero plays frames 1–90 @20fps with boot/loading overlay; chapters autoplay their slices @15fps (Awakening 1–65, Extraction 66–130, Arise 131–190, Army 191–270).",
    "<b>FX & motion:</b> ambient particle canvas, scanlines/vignette, HUD corners, tickers, notification panels, scroll reveals, counters, reading progress, hero signals, and login-page animations (canvas particles, orbs, rings, scan beam, entrance transitions). Honors <font face='Courier'>prefers-reduced-motion</font>.",
    "<b>Brand/UI:</b> custom SVG monolith logo mark, “SYSTEM / PORTAL” wordmark, dark Solo Leveling ‘System’ palette (violet/cyan on near-black) with Antigravity-inspired layout primitives.",
])

story.append(PageBreak())

story.append(Paragraph("6. Technologies & tools used", h1))
rows = [
    [Paragraph("Category", cell_ink), Paragraph("Used for", cell_ink), Paragraph("Details", cell_ink)],
    [Paragraph("HTML5", cell_ink), Paragraph("Structure", cell), Paragraph("Semantic multi-page documents, forms, canvas/video elements, metadata.", cell)],
    [Paragraph("CSS3", cell_ink), Paragraph("Styling & motion", cell), Paragraph("Custom properties, Grid/Flexbox, gradients, filters, backdrop-filter, keyframe animations, responsive breakpoints, reduced-motion media queries.", cell)],
    [Paragraph("JavaScript (ES5/ES6+)", cell_ink), Paragraph("Application logic", cell), Paragraph("Vanilla JS modules (IIFEs), DOM APIs, Canvas 2D, Intersection/ResizeObserver, FileReader, URL/createObjectURL, timers, async/await for crypto flows.", cell)],
    [Paragraph("Web Crypto API", cell_ink), Paragraph("Password security", cell), Paragraph("PBKDF2-SHA-256 (210k iterations), random salts, subtle.importKey/deriveBits for local account hashing.", cell)],
    [Paragraph("localStorage / sessionStorage", cell_ink), Paragraph("Persistence", cell), Paragraph("Per-user state, accounts, sessions, boot flag; cross-tab session sync via storage events.", cell)],
    [Paragraph("Google Identity Services", cell_ink), Paragraph("Google Sign-In", cell), Paragraph("GSI client script, ID token credential callback, client-side payload decode/audience/expiry checks (client ID required).", cell)],
    [Paragraph("MediaDevices API", cell_ink), Paragraph("Camera check-ins", cell), Paragraph("getUserMedia for live preview and snapshot capture to canvas.", cell)],
    [Paragraph("Notifications API", cell_ink), Paragraph("Reminders", cell), Paragraph("Optional browser notifications when permission is granted.", cell)],
    [Paragraph("Python 3", cell_ink), Paragraph("Tooling", cell), Paragraph("Local static server (<font face='Courier'>python -m http.server 8090</font>) and PDF/report generation scripts.", cell)],
    [Paragraph("ReportLab", cell_ink), Paragraph("PDF generation", cell), Paragraph("Programmatic creation of SYSTEM_PORTAL_BUILD_REPORT.pdf and IMPLEMENTATION.pdf.", cell)],
    [Paragraph("Git & GitHub CLI (gh)", cell_ink), Paragraph("Versioning & publish", cell), Paragraph("Repository initialization, commits, and publishing the public <font face='Courier'>system</font> repository to GitHub.", cell)],
    [Paragraph("Assets", cell_ink), Paragraph("Animation frames", cell), Paragraph("270 JPEG frames (ezgif-frame-001..270.jpg) rendered through the canvas player.", cell)],
]
story.append(table(rows, [0.22*CONTENT_W, 0.22*CONTENT_W, 0.56*CONTENT_W]))

story.append(Paragraph("7. How to run locally", h1))
story += bullets([
    "From the project folder run: <font face='Courier'>python -m http.server 8090</font>",
    "Open <font face='Courier'>http://localhost:8090/login.html</font> and sign in (admin: admin@system.local / AriseAdmin#2026, or create a local account, or configure Google client ID in <font face='Courier'>scripts/config.js</font>).",
    "Data is stored in the browser’s localStorage for the signed-in email on that device/origin.",
])

story.append(Paragraph("8. Notes & limitations", h1))
story += bullets([
    "No backend/database: accounts, sessions, and progression live in the browser; clearing site data resets them.",
    "Google token signatures are not server-verified in this static build (audience/expiry checked client-side only).",
    "Admin credentials are defined in client-side config for this local/demo setup; treat accordingly for any shared deployment.",
    "Fan-made productivity prototype. Solo Leveling is owned by Chugong & Redice Studio.",
])

story.append(Spacer(1, 8))
story.append(rule(4))
story.append(Paragraph("Generated for the System Portal public repository.", foot))

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("Wrote", OUT)
