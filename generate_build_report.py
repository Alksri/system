# -*- coding: utf-8 -*-
"""
Generate SYSTEM_PORTAL_BUILD_REPORT.pdf — a 3-page implementation report
for the multi-page System Portal rebuild, styled to match the bright
Antigravity design language used by the site itself.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, HRFlowable
)

OUT = "SYSTEM_PORTAL_BUILD_REPORT.pdf"

# ---------------------------------------------------------------- palette ----
INK        = colors.HexColor("#121317")
INK_60     = colors.HexColor("#4b4d55")
LAVENDER   = colors.HexColor("#b7bfd9")
GRAY       = colors.HexColor("#e5e7eb")
SOFT       = colors.HexColor("#f7f8fa")
WASH       = colors.HexColor("#f2f4fb")
WHITE      = colors.HexColor("#ffffff")

# ----------------------------------------------------------------- styles ----
def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9, leading=13, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)

title      = S("title", fontName="Helvetica", fontSize=27, leading=30,
               textColor=INK, spaceAfter=2)
sub        = S("sub", fontSize=10.5, leading=14.5, textColor=INK_60, spaceAfter=8)
kicker     = S("kicker", fontName="Helvetica-Bold", fontSize=7.2, leading=10,
               textColor=INK, spaceAfter=3)
h1         = S("h1", fontName="Helvetica-Bold", fontSize=12, leading=15,
               textColor=INK, spaceBefore=8, spaceAfter=4)
h2         = S("h2", fontName="Helvetica-Bold", fontSize=9.2, leading=12,
               textColor=INK, spaceBefore=7, spaceAfter=2.5)
body       = S("body", fontSize=8.2, leading=11.7, textColor=INK_60,
               spaceAfter=3, alignment=TA_LEFT)
body_ink   = S("bodyInk", parent=body, textColor=INK)
bullet     = S("bullet", fontSize=8.2, leading=11.4, textColor=INK_60,
               leftIndent=9, bulletIndent=1, spaceAfter=1.2)
cell       = S("cell", fontSize=7.2, leading=9.4, textColor=INK_60)
cell_ink   = S("cellInk", parent=cell, fontName="Helvetica-Bold", textColor=INK)
cell_mono  = S("cellMono", fontName="Courier", fontSize=6.7, leading=9.0,
               textColor=INK)
note       = S("note", fontSize=7.6, leading=10.6, textColor=INK_60)
foot       = S("foot", fontSize=7.0, leading=9.2, textColor=INK_60)

PAGE_W, PAGE_H = A4
M = 15 * mm
CONTENT_W = PAGE_W - 2 * M


def rule(space_before=3, space_after=7):
    return HRFlowable(width="100%", thickness=0.6, color=GRAY,
                      spaceBefore=space_before, spaceAfter=space_after)


def bullets(items):
    return [Paragraph(i, bullet, bulletText="•") for i in items]


def data_table(rows, widths, header=True, pad=3.2):
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad + 1),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, GRAY),
        ("LINEBELOW", (0, -1), (-1, -1), 0.7, INK),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), SOFT),
            ("LINEBELOW", (0, 0), (-1, 0), 0.7, INK),
        ]
    t.setStyle(TableStyle(style))
    return t


def callout(title_text, body_text, tint=WASH):
    inner = [[Paragraph(title_text, S("co", fontName="Helvetica-Bold",
                                      fontSize=8.0, leading=10.4, textColor=INK))],
             [Paragraph(body_text, S("cb", fontSize=7.8, leading=10.6,
                                     textColor=INK_60))]]
    t = Table(inner, colWidths=[CONTENT_W - 4])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), tint),
        ("BOX", (0, 0), (-1, -1), 0.5, GRAY),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (0, 0), 7),
        ("BOTTOMPADDING", (0, 0), (0, 0), 1),
        ("TOPPADDING", (0, 1), (0, 1), 1),
        ("BOTTOMPADDING", (0, 1), (0, 1), 7),
    ]))
    return t


def stat_strip(pairs):
    cells = [[Paragraph(v, S("sv", fontName="Helvetica", fontSize=15,
                             leading=17, textColor=INK)),
              Paragraph(k, S("sk", fontName="Helvetica-Bold", fontSize=6.6,
                             leading=9, textColor=INK_60))] for k, v in pairs]
    row_v = [c[0] for c in cells]
    row_k = [c[1] for c in cells]
    t = Table([row_v, row_k], colWidths=[CONTENT_W / len(pairs)] * len(pairs))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 1),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 5),
        ("LINEABOVE", (0, 0), (-1, 0), 0.7, INK),
        ("LINEBELOW", (0, 1), (-1, 1), 0.7, INK),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


# ------------------------------------------------------------------ page ----
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 6.8)
    canvas.setFillColor(INK_60)
    canvas.drawString(M, 11 * mm, "System Portal — Build Report")
    canvas.drawRightString(PAGE_W - M, 11 * mm, f"{doc.page} / 3")
    canvas.setStrokeColor(GRAY)
    canvas.setLineWidth(0.5)
    canvas.line(M, 14.5 * mm, PAGE_W - M, 14.5 * mm)
    canvas.restoreState()


doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=M, rightMargin=M, topMargin=13 * mm, bottomMargin=16 * mm,
    title="System Portal — Build Report",
    author="System Portal",
    subject="Multi-page website rebuild in the Google Antigravity design language",
)

story = []

# ================================================================ PAGE 1 ====
story.append(Paragraph("BUILD REPORT · NOVEMBER 2026", kicker))
story.append(Paragraph("System Portal", title))
story.append(Paragraph(
    "A multi-page site rebuilt as a cinematic Solo Leveling System interface — eleven pages, one "
    "shared design system, live frame animation, and working client-side state.", sub))
story.append(rule(2, 9))

story.append(stat_strip([
    ("Pages", "11"), ("Chapters", "4"), ("Modules", "6"),
    ("Frames", "270"), ("Port", "8090"),
]))
story.append(Spacer(1, 9))

story.append(Paragraph("What this is", h1))
story.append(Paragraph(
    "System Portal is a gamified progression dashboard: it turns everyday habits into timed "
    "quests, awards XP, gold and ability points, and records how you change over time. The "
    "previous version was a single long page built on a dark, neon “system window” aesthetic. "
    "This rebuild keeps every feature but restructures it as a real website — one page per "
    "chapter, one page per module — and re-scores it to the Solo Leveling anime while keeping the "
    "layout grammar from <i>antigravity.google-design.md</i>.", body))
story.append(Spacer(1, 2))

story.append(Paragraph("Design direction", h1))
story.append(Paragraph(
    "Antigravity supplied the structural grammar — pill controls, 8px cards, hairline borders and "
    "airy spacing. The palette and motion were re-scored to the Solo Leveling anime, so the same "
    "skeleton now reads as a System window:", body))
story += bullets([
    "<b>Near-black canvas.</b> A deep <font face='Courier'>#05060c</font> base with violet and cyan "
    "radial washes, a fixed vignette and fine scanlines.",
    "<b>Violet hologram.</b> <font face='Courier'>#8b5cf6</font> carries the anime System UI: glows, "
    "notification panels, stat bars and focus rings. Cyan <font face='Courier'>#38bdf8</font> is the "
    "secondary signal.",
    "<b>Pill and 8px geometry.</b> Buttons stay fully rounded; cards, inputs and modules use 8px "
    "radii with translucent hairline borders.",
    "<b>Angular display type.</b> Chakra Petch for headings, Inter for body copy and JetBrains Mono "
    "for labels and frame counters.",
    "<b>Light as material.</b> Panel glows, HUD corner brackets, animated tickers and a cursor-like "
    "progress beam replace the flat white surfaces.",
])
story.append(Spacer(1, 3))
story.append(callout(
    "One design system, eleven pages",
    "Every page loads the same two stylesheets and the same script. Only the page body differs, so "
    "the site cannot drift out of alignment as it grows."
))

story.append(Spacer(1, 8))
story.append(Paragraph("Page map", h1))
rows = [
    [Paragraph("Page", cell_ink), Paragraph("Files", cell_ink),
     Paragraph("What it does", cell_ink)],
    [Paragraph("Home", cell_ink), Paragraph("index.html", cell_mono),
     Paragraph("Autoplaying 90-frame opening, boot curtain, and indexes for every chapter and module.", cell)],
    [Paragraph("Chapters ×4", cell_ink),
     Paragraph("awakening · extraction<br/>arise · army", cell_mono),
     Paragraph("One full-bleed autoplay stage per chapter, with HUD corners, frame counter, progress "
               "bar and play/pause. Each owns a slice of the 270 frames.", cell)],
    [Paragraph("Dashboard ×6", cell_ink),
     Paragraph("status · quests · vision<br/>advisor · progress · inventory", cell_mono),
     Paragraph("One tool per page: stat allocation, timed quests, webcam check-in, advisor chat, "
               "transformation feed and dimensional inventory.", cell)],
]
story.append(data_table(rows, [0.19 * CONTENT_W, 0.27 * CONTENT_W, 0.54 * CONTENT_W], pad=4))

story.append(PageBreak())

# ================================================================ PAGE 2 ====
story.append(Paragraph("IMPLEMENTATION", kicker))
story.append(Paragraph("How it is built", title))
story.append(Paragraph(
    "A static, framework-free build: HTML for structure, two CSS layers for the design system, "
    "and one JavaScript module for shared behaviour. No build step, no dependencies to install.",
    sub))
story.append(rule(2, 8))

story.append(Paragraph("1 · Architecture", h1))
story.append(Paragraph(
    "The site is deliberately DRY without a framework. Navigation and footer live in a single "
    "array inside <font face='Courier'>scripts/app.js</font> and are injected into an empty "
    "<font face='Courier'>&lt;header id=\"site-header\"&gt;</font> and "
    "<font face='Courier'>&lt;footer id=\"site-footer\"&gt;</font> on every page at "
    "<font face='Courier'>DOMContentLoaded</font>. Editing the nav once updates all eleven pages, "
    "and the active link is derived from the page’s own "
    "<font face='Courier'>data-page</font> attribute, so highlighting can never desync.", body))
story.append(Paragraph(
    "Page logic uses the same dispatch idea: <font face='Courier'>Pages[page]()</font> is looked up "
    "from <font face='Courier'>document.body.dataset.page</font> and called in a try/catch, so a "
    "fault in one page cannot break the shared shell on another.", body))

story.append(Paragraph("2 · The design system, in two layers", h1))
story.append(data_table([
    [Paragraph("File", cell_ink), Paragraph("Contents", cell_ink)],
    [Paragraph("styles/design-system.css", cell_mono),
     Paragraph("Tokens (palette, type scale, spacing, radii, motion), reset, typography classes, "
               "header/nav/dropdown, buttons, cards, chips, forms, footer, responsive rules.", cell)],
    [Paragraph("styles/pages.css", cell_mono),
     Paragraph("Composition only: hero and chapter stage, feature grid, module layout, gauges, "
               "quest rows, chat, transformation cards, inventory, modal, toast, plus the motion "
               "layer — boot curtain, ticker, notification window, player controls, reveals.", cell)],
], [0.26 * CONTENT_W, 0.74 * CONTENT_W], pad=4))

story.append(Paragraph("3 · Shared state", h1))
story.append(Paragraph(
    "A small <font face='Courier'>Store</font> module reads and writes one JSON object to "
    "<font face='Courier'>localStorage</font> under "
    "<font face='Courier'>system_portal_state_v2</font> — level, rank, gold, fatigue, available "
    "ability points, EXP, the five stats, the quest list, reminders and transformation entries. "
    "Every page reads from the same object, so completing a quest on the Quests page immediately "
    "changes the level and gold shown on Status. A <b>Reset progress</b> control restores the "
    "seeded default state.", body))

story.append(Paragraph("4 · Motion and animation", h1))
story.append(Paragraph(
    "The 270 supplied frames are reused as a real, autoplaying sequence rather than a scroll-driven "
    "scrubber. A single reusable player preloads a frame slice, paints it to a canvas with "
    "device-pixel-ratio scaling and cover-fit cropping, advances at a fixed frame rate, loops, and "
    "pauses itself whenever it leaves the viewport. It also reports load progress back to the page — "
    "that is what drives the boot meter.", body))
story += bullets([
    "<b>Home hero</b> plays the opening 90 frames at 20fps (about four and a half seconds) behind "
    "the headline.",
    "<b>Chapters</b> each own a contiguous slice and play at a cinematic 15fps, with an injected "
    "play/pause button, a live progress bar and a frame counter.",
    "<b>Boot sequence.</b> On the first visit the site opens behind a System initialisation curtain "
    "with a rotating sigil, a caching meter and a scan beam; it lifts once frames are ready.",
    "<b>Ambient layer.</b> A fixed canvas drifts violet and cyan mana motes across every page, with "
    "no layout cost and automatic pause when the tab is hidden.",
    "<b>Interface motion.</b> Scroll reveals with stagger, count-up hero stats, a rotating system "
    "signal line, a marquee status ticker, hover glows, a reading-progress beam and a live nav clock.",
    "<b>Accessibility.</b> Every animation is disabled or reduced under "
    "<font face='Courier'>prefers-reduced-motion</font>, and reveals have a timed fallback so content "
    "can never stay hidden.",
])

story.append(Paragraph("5 · Module behaviour", h1))
story += bullets([
    "<b>Status</b> derives max HP, max MP and EXP percentage from stats and level, so spending a "
    "point visibly moves the gauges.",
    "<b>Quests</b> ticks every second, turns its timer red inside the final five minutes, awards XP "
    "and gold on completion, rolls over levels, and applies the level/fatigue penalty on expiry.",
    "<b>Vision</b> requests a webcam stream, captures a frame to an offscreen canvas, and then "
    "presents a simulated posture report; the reminder panel runs real countdowns and can fire a "
    "browser notification.",
    "<b>Advisor</b> answers from a local keyword knowledge base covering leveling, stat builds, "
    "penalties, workouts and extraction — no network call, no key.",
    "<b>Progress</b> reads two images with <font face='Courier'>FileReader</font> and stores them as "
    "data URLs only after an explicit consent checkbox; nothing leaves the browser.",
    "<b>Inventory</b> renders equipped and empty slots plus the skill arsenal, with click feedback "
    "routed through the shared toast.",
])

story.append(PageBreak())

# ================================================================ PAGE 3 ====
story.append(Paragraph("RUNNING &amp; VERIFYING", kicker))
story.append(Paragraph("Open it locally", title))
story.append(Paragraph(
    "The site is served as static files. Any static server works; this build runs on port 8090 "
    "because port 8000 is already occupied on this machine by an unrelated service.",
    sub))
story.append(rule(2, 8))

story.append(Paragraph("Start the server", h1))
cmd = Table([[Paragraph(
    'cd "C:\\Users\\alkes\\OneDrive\\Desktop\\system google"<br/>'
    'python -m http.server 8090', S("cmd", fontName="Courier", fontSize=8.4,
                                    leading=13, textColor=INK))]],
    colWidths=[CONTENT_W])
cmd.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), SOFT),
    ("BOX", (0, 0), (-1, -1), 0.5, GRAY),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(cmd)
story.append(Spacer(1, 7))
story.append(Paragraph(
    "Then open <b>http://localhost:8090</b>. The site is already running on that address if the "
    "server was left in the background. No install step and no build step are required — the "
    "browser loads plain HTML, CSS and JS.", body))

story.append(Paragraph("What was checked", h1))
story.append(Paragraph(
    "A validation script (<font face='Courier'>verify.py</font>) runs three classes of check and "
    "passes all of them:", body))
story += bullets([
    "<b>Syntax.</b> <font face='Courier'>scripts/app.js</font> is parsed with "
    "<font face='Courier'>node --check</font>.",
    "<b>Structure.</b> All eleven pages contain the header/footer placeholders, both stylesheets, "
    "the shared script, the toast hub and a <font face='Courier'>data-page</font> attribute.",
    "<b>Contract.</b> Every element ID and class that the JavaScript queries is present on the page "
    "that owns it, so no initializer can silently no-op.",
])
story.append(Paragraph(
    "All eleven routes were also requested over HTTP and returned 200 with the expected byte "
    "counts; both stylesheets and the script serve correctly.", body))

story.append(Paragraph("File structure", h1))
fs = [
    [Paragraph("Path", cell_ink), Paragraph("What lives there", cell_ink)],
    [Paragraph("index.html → inventory.html", cell_mono),
     Paragraph("The eleven pages — home, four chapters, six modules", cell)],
    [Paragraph("styles/design-system.css", cell_mono),
     Paragraph("Tokens and components — the reusable layer", cell)],
    [Paragraph("styles/pages.css", cell_mono),
     Paragraph("Page composition and layout", cell)],
    [Paragraph("scripts/app.js", cell_mono),
     Paragraph("Shell, state store, animation, page initializers, toast", cell)],
    [Paragraph("ezgif-frame-001…270.jpg", cell_mono),
     Paragraph("Existing animation frames, split across the four chapters", cell)],
    [Paragraph("verify.py", cell_mono),
     Paragraph("Automated syntax, structure and ID-contract checks", cell)],
    [Paragraph("generate_build_report.py", cell_mono),
     Paragraph("This document’s generator", cell)],
]
story.append(data_table(fs, [0.33 * CONTENT_W, 0.67 * CONTENT_W], pad=3.6))

story.append(Spacer(1, 5))
story.append(Paragraph("Result", h1))
story.append(Paragraph(
    "Eleven independently addressable pages, one coherent System interface, and a single shared "
    "state model. Antigravity’s spacing, pills and hairline cards are still the skeleton; the anime "
    "theme — near-black panels, violet holograms, cyan signals and a living 270-frame sequence — "
    "gives the prototype a cinematic identity it did not have before. Every interactive promise of "
    "the original build is kept and, in the case of status derivation, quest economics and the "
    "animation system, made more legible.", body))
story.append(Spacer(1, 12))
story.append(rule(0, 6))
story.append(Paragraph(
    "Fan-made productivity prototype. Solo Leveling is owned by Chugong &amp; Redice Studio. "
    "Layout grammar referenced from the Google Antigravity specification; theme and motion "
    "inspired by the Solo Leveling anime.",
    foot))

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("Wrote", OUT)
