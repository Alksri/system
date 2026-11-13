# -*- coding: utf-8 -*-
"""
Generate a PDF analysis report for the Solo Leveling System Portal.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem, HRFlowable
)

OUT = "SOLO_LEVELING_SYSTEM_ANALYSIS_REPORT.pdf"

# -----------------------------------------------------------------------------
# Color palette (matches the app's theme)
# -----------------------------------------------------------------------------
CYAN = colors.HexColor("#00f0ff")
CYAN_DARK = colors.HexColor("#0284c7")
PURPLE = colors.HexColor("#a855f7")
PURPLE_BRIGHT = colors.HexColor("#c084fc")
GOLD = colors.HexColor("#fbbf24")
RED = colors.HexColor("#ef4444")
DARK_BG = colors.HexColor("#04060a")
DARK_CARD = colors.HexColor("#0a0f1c")
TEXT_WHITE = colors.HexColor("#f8fafc")
TEXT_MUTED = colors.HexColor("#94a3b8")
BORDER_CYAN = colors.HexColor("#38bdf8")
BORDER_PURPLE = colors.HexColor("#c084fc")

# -----------------------------------------------------------------------------
# Styles
# -----------------------------------------------------------------------------
title_style = ParagraphStyle(
    "title", fontName="Helvetica-Bold", fontSize=26, leading=32,
    textColor=TEXT_WHITE, alignment=TA_CENTER, spaceAfter=6
)
subtitle_style = ParagraphStyle(
    "subtitle", fontName="Helvetica", fontSize=13, leading=18,
    textColor=CYAN, alignment=TA_CENTER, spaceAfter=2
)
meta_style = ParagraphStyle(
    "meta", fontName="Helvetica", fontSize=9.5, leading=14,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)
h1_style = ParagraphStyle(
    "h1", fontName="Helvetica-Bold", fontSize=16, leading=21,
    textColor=CYAN, spaceBefore=14, spaceAfter=8
)
h2_style = ParagraphStyle(
    "h2", fontName="Helvetica-Bold", fontSize=12.5, leading=17,
    textColor=PURPLE_BRIGHT, spaceBefore=12, spaceAfter=6
)
body_style = ParagraphStyle(
    "body", fontName="Helvetica", fontSize=9.5, leading=14,
    textColor=TEXT_WHITE, alignment=TA_JUSTIFY, spaceAfter=6
)
body_left = ParagraphStyle(
    "bodyLeft", parent=body_style, alignment=TA_LEFT
)
bullet_style = ParagraphStyle(
    "bullet", fontName="Helvetica", fontSize=9.5, leading=13.5,
    textColor=TEXT_WHITE, alignment=TA_LEFT, spaceAfter=3
)
feature_style = ParagraphStyle(
    "feature", fontName="Helvetica-Bold", fontSize=10, leading=14,
    textColor=CYAN, spaceAfter=2
)
detail_style = ParagraphStyle(
    "detail", fontName="Helvetica", fontSize=9, leading=13,
    textColor=TEXT_MUTED, spaceAfter=4, alignment=TA_LEFT
)
table_cell = ParagraphStyle(
    "tableCell", fontName="Helvetica", fontSize=8.5, leading=11,
    textColor=TEXT_WHITE
)
table_cell_bold = ParagraphStyle(
    "tableCellBold", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
    textColor=CYAN
)
table_header = ParagraphStyle(
    "tableHeader", fontName="Helvetica-Bold", fontSize=9, leading=12,
    textColor=TEXT_WHITE
)
footer_style = ParagraphStyle(
    "footer", fontName="Helvetica", fontSize=8, leading=11,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)

def P(text, style=body_style):
    return Paragraph(text, style)

def bullet(text, style=bullet_style):
    return ListItem(Paragraph(text, style), value="•", leftIndent=10)

# -----------------------------------------------------------------------------
# Header / Footer
# -----------------------------------------------------------------------------
def on_page(canvas, doc):
    canvas.saveState()
    # Header band
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, A4[1] - 28, A4[0], 28, stroke=0, fill=1)
    canvas.setStrokeColor(PURPLE)
    canvas.setLineWidth(1.2)
    canvas.line(0, A4[1] - 28, A4[0], A4[1] - 28)
    canvas.setFillColor(CYAN)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18, A4[1] - 18, "SOLO LEVELING // SYSTEM PORTAL")
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 18, A4[1] - 18, "Analysis Report")

    # Footer band
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, 0, A4[0], 26, stroke=0, fill=1)
    canvas.setStrokeColor(PURPLE)
    canvas.setLineWidth(0.8)
    canvas.line(0, 26, A4[0], 26)
    canvas.setFillColor(GOLD)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18, 12, "◈ HUNTER SYSTEM ACTIVE")
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 18, 12, f"Page {doc.page}")
    canvas.restoreState()

# -----------------------------------------------------------------------------
# Build document
# -----------------------------------------------------------------------------
doc = SimpleDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=40 * mm,
    bottomMargin=30 * mm,
    title="Solo Leveling System Portal - Analysis Report",
    author="System Analysis",
)

story = []

# ============================ COVER ============================
story.append(Spacer(1, 10 * mm))
story.append(P("SOLO LEVELING", title_style))
story.append(P("// SYSTEM PORTAL & PROGRESSION PLATFORM", subtitle_style))
story.append(Spacer(1, 6 * mm))
story.append(HRFlowable(width="60%", thickness=1.5, color=PURPLE, hAlign="CENTER"))
story.append(Spacer(1, 6 * mm))
story.append(P("Complete Feature Analysis, Capability Breakdown,<br/>and Improvement Roadmap Report", body_style))
story.append(Spacer(1, 8 * mm))

meta = Table(
    [[P("<b>Prepared By:</b> System Analyst", meta_style),
      P("<b>Date:</b> 13 Nov 2026", meta_style)],
     [P("<b>Scope:</b> index.html, app.js, style.css (+ 270 animation frames)", meta_style),
      P("<b>Status:</b> Single-file static web application", meta_style)]],
    colWidths=[90 * mm, 90 * mm]
)
meta.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
]))
story.append(meta)
story.append(Spacer(1, 8 * mm))

# Executive summary box
exec_box = Table(
    [[P("<b>EXECUTIVE SUMMARY</b>", ParagraphStyle(
        "execHead", fontName="Helvetica-Bold", fontSize=11,
        textColor=CYAN, alignment=TA_LEFT))],
     [P("The Solo Leveling System Portal is a gamified, browser-based real-life "
        "progression engine themed after the Solo Leveling universe. It combines "
        "an animated hero scroll narrative, an RPG player status window, timed "
        "daily quests with penalty mechanics, webcam-based Hunter Vision scanning, "
        "an AI chatbot advisor, a before/after transformation social feed, and an "
        "inventory/skill arsenal — all persisted via browser localStorage and "
        "styled with a neon cyberpunk aesthetic.", body_left)]]
)
exec_box.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 1, BORDER_CYAN),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("TOPPADDING", (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
]))
story.append(exec_box)

story.append(PageBreak())

# ============================ SECTION 1: OVERVIEW ============================
story.append(P("1. SYSTEM OVERVIEW", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
story.append(P(
    "This is a client-side web application built with plain HTML5, CSS3, and "
    "vanilla JavaScript (no frameworks, no build step, no backend). It loads 270 "
    "pre-cached animation frames (ezgif-frame-001.jpg through ezgif-frame-270.jpg) "
    "to produce a smooth, scroll-synchronized hero narrative, then transitions into "
    "a dashboard of gamified productivity modules. Player state (level, stats, "
    "quests, reminders, transformations) is stored in the browser's localStorage, "
    "so progress persists across sessions.", body_style))

story.append(P("Core Technology Stack", h2_style))
stack_data = [
    [P("<b>Layer</b>", table_header), P("<b>Technology</b>", table_header), P("<b>Purpose</b>", table_header)],
    [P("Markup", table_cell), P("index.html (HTML5)", table_cell), P("Structure & semantics", table_cell)],
    [P("Styling", table_cell), P("style.css (CSS3)", table_cell), "Neon cyberpunk UI, responsive layout, animations"],
    [P("Logic", table_cell), P("app.js (Vanilla JS)", table_cell), "All engines, state, audio, camera, AI chatbot"],
    [P("Media", table_cell), P("270 JPG frames", table_cell), P("Scroll-synced hero animation", table_cell)],
    [P("Storage", table_cell), P("localStorage API", table_cell), P("Persistent player state (no server)", table_cell)],
    [P("Audio", table_cell), P("Web Audio API", table_cell), P("Procedural sound effects (no files)", table_cell)],
    [P("Camera", table_cell), P("getUserMedia API", table_cell), P("Webcam access for Hunter Vision", table_cell)],
    [P("Fonts", table_cell), P("Google Fonts (Orbitron, Rajdhani, Syne, JetBrains Mono)", table_cell), P("Sci-fi typography", table_cell)],
]
stack_tbl = Table(stack_data, colWidths=[32 * mm, 55 * mm, 83 * mm])
stack_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), DARK_CARD),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#0a0f1c"), colors.HexColor("#08101c")]),
    ("GRID", (0, 0), (-1, -1), 0.4, BORDER_PURPLE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
]))
story.append(stack_tbl)

story.append(PageBreak())

# ============================ SECTION 2: WHAT IT CAN DO ============================
story.append(P("2. WHAT THE SYSTEM CAN DO — COMPLETE CAPABILITY BREAKDOWN", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
story.append(P(
    "The application is organized into seven functional modules plus shared systems "
    "(audio, notifications, persistence). Below is a complete inventory of every "
    "capability.", body_style))

# Module cards as tables
modules = [
    ("MODULE 1 — HERO SCROLL ANIMATION (Story Track)",
     "A 480vh scroll-track divided into 4 story chapters that synchronizes a 270-frame "
     "animation with the user's scroll position.",
     ["Scroll-synced frame playback (270 frames at 30 FPS)",
      "Four chapters: The Awakening, Shadow Extraction, System: Arise, The Shadow Army",
      "Interactive playback deck: Play/Pause, Replay, 0.5x–2x speed, frame scrubber",
      "Keyboard shortcuts: Space, Left/Right arrows, R (reset), M (SFX), Home/End",
      "Jump pills to teleport to any chapter",
      "Chapter-based HUD (frame counter, % progress, chapter name)",
      "Ambient particle system and vignette/scanline overlay"]),
    ("MODULE 2 — PLAYER STATUS & RPG LEVELING ENGINE",
     "A full RPG character window with level, stats, gold, fatigue, HP/MP/EXP gauges, "
     "and ability-point allocation.",
     ["Player state: Level 18, Title 'The Shadow Monarch', Job 'Shadow Lord (Necromancer)', Rank S",
      "Attributes: STR 124, AGI 118, VIT 95, INT 165, PER 88",
      "Dynamic rank calculation (E → D → C → B → A → S/Monarch) based on level",
      "HP = 5000 + VIT×35 + Level×150; MP = 8000 + INT×40 + Level×200",
      "EXP bar with level-up triggers (+3 AP per level, maxExp grows ×1.3)",
      "Unallocated AP distribution into any stat (+1 per click)",
      "Penalty system: level decrease + fatigue increase on quest expiry",
      "localStorage persistence of all player state"]),
    ("MODULE 3 — DAILY QUESTS & TIMED PENALTY ZONE",
     "A quest log with countdown timers, rewards, and automatic penalties for expired quests.",
     ["3 preset daily quests (Physical Conditioning, Deep Focus, Mana & Hydration)",
      "Countdown timer per quest (ticks every 1 second)",
      "Urgent warning when < 5 minutes remain",
      "Auto-expiry → Penalty Zone (level decrease + fatigue spike)",
      "Quest completion awards EXP, Gold, AP, and reduces fatigue",
      "Custom quest creator with rank-based XP/Gold/AP rewards",
      "Re-issuable custom quests (1–1440 minutes)"]),
    ("MODULE 4 — HUNTER VISION & CAMERA AI SCANNER",
     "Webcam-based biometric/posture assessment plus a reminder/alarm scheduler.",
     ["Start/stop webcam via getUserMedia (user-facing camera)",
      "Capture frame and render to canvas",
      "Simulated AI assessment report (posture integrity, fatigue, task verification)",
      "System recommendation output after scan",
      "Reminder scheduler with countdown and browser notifications",
      "Toast notifications when reminders fire",
      "Fallback path when camera is denied/blocked"]),
    ("MODULE 5 — SYSTEM AI CHATBOT ('THE ARCHITECT')",
     "A rule-based knowledge-base chatbot that answers leveling, stat, and workout questions.",
     ["Chat interface with user vs. system message bubbles",
      "Knowledge base with keyword matching (leveling, stats, penalty, workout, shadow)",
      "Quick-query chips for common questions",
      "Typing-delay simulation for responses",
      "Fallback calibration response for unknown queries"]),
    ("MODULE 6 — HUNTER PROGRESSION & TRANSFORMATION FEED",
     "A before/after social feed where users post transformation updates with explicit consent.",
     ["Post transformation updates (before photo + after photo + caption)",
      "FileReader DataURL storage of images in local state",
      "Explicit privacy permission checkbox before posting",
      "Like / 'Arise Respect' counter with toggle",
      "Sample showcase card (Sung Jin-Woo, 90 days of progress)",
      "User cards prepended to the feed"]),
    ("MODULE 7 — INVENTORY & SHADOW SKILLS ARSENAL",
     "Dimensional storage slots and a Monarch skill list with levels and descriptions.",
     ["8 inventory slots (4 equipped, 4 empty): Knight Killer, Rasaka's Fang, HP Potion ×5, Dungeon Key",
      "Item rarity badges (Rank B, C, S)",
      "Skill list: Sprint (Passive), Stealth (Active), Ruler's Authority, Shadow Extraction 'Arise'",
      "Per-skill level and description",
      "Gold counter (45,800 G) displayed in header"]),
]

for title, desc, feats in modules:
    # Title row
    t = Table([[P(f"<b>{title}</b>", ParagraphStyle(
        "modTitle", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=CYAN, alignment=TA_LEFT))],
               [P(desc, detail_style)]],
             colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
        ("BOX", (0, 0), (-1, -1), 0.8, BORDER_CYAN),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t)
    story.append(Spacer(1, 3 * mm))
    story.append(ListFlowable([bullet(f) for f in feats],
                              bulletType="bullet", start="•",
                              leftIndent=14, bulletFontSize=8,
                              bulletColor=PURPLE))
    story.append(Spacer(1, 5 * mm))

story.append(PageBreak())

# ============================ SECTION 3: SHARED SYSTEMS ============================
story.append(P("3. SHARED SYSTEMS (CROSS-CUTTING FEATURES)", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
shared = [
    ("Audio Synthesizer (Web Audio API)", [
        "Procedural sound effects with no audio files: level-up fanfare, quest-done chime, penalty buzzer, UI click",
        "SFX toggle (mute/unmute) with visual state and toast confirmation",
        "AudioContext resume on user interaction (handles browser autoplay policy)"]),
    ("Holographic Toast Notification Hub", [
        "Fixed-position notification toasts (top-right)",
        "Type-styled toasts: info, level-up (gold), penalty (red)",
        "Auto-dismiss after 4.5 seconds with slide-out animation"]),
    ("Persistence (localStorage)", [
        "Player state saved as 'solo_leveling_player_state' JSON",
        "Survives page refresh and browser restart",
        "Auto-saved on every state mutation"]),
    ("Browser Notifications", [
        "Requests notification permission on load",
        "Desktop notifications fire when reminders expire"]),
    ("Responsive Design", [
        "CSS grid collapses to single column on ≤1024px and ≤768px screens",
        "Hidden nav tabs and condensed cards on mobile"]),
]
for title, feats in shared:
    story.append(P(f"<b>{title}</b>", feature_style))
    story.append(ListFlowable([bullet(f) for f in feats],
                              bulletType="bullet", start="•",
                              leftIndent=14, bulletFontSize=8,
                              bulletColor=PURPLE))
    story.append(Spacer(1, 3 * mm))

story.append(PageBreak())

# ============================ SECTION 4: STRENGTHS ============================
story.append(P("4. STRENGTHS & WHAT WORKS WELL", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
strengths = [
    "Zero dependencies — runs entirely in the browser with no build step, npm install, or server required.",
    "Strong thematic consistency — the Solo Leveling aesthetic (neon cyan/purple, Orbitron font, holographic cards) is applied throughout.",
    "Rich interactivity — scroll-synced animation, scrubber, keyboard shortcuts, and jump pills make the hero track engaging.",
    "Gamified psychology — XP, levels, AP, rank, gold, fatigue, and penalty mechanics create real motivation hooks.",
    "Client-side persistence — localStorage means no database or backend is needed for basic progress tracking.",
    "Privacy-by-design — transformation photos require explicit consent and are stored locally, never uploaded.",
    "Graceful degradation — camera access is optional; the app remains fully usable if the webcam is denied.",
    "Extensible modular structure — each module is a self-contained block of code, easy to extend or replace.",
]
story.append(ListFlowable([bullet(s) for s in strengths],
                          bulletType="bullet", start="•",
                          leftIndent=14, bulletFontSize=9,
                          bulletColor=CYAN))
story.append(Spacer(1, 4 * mm))

# ============================ SECTION 5: IMPROVEMENT ROADMAP ============================
story.append(P("5. IMPROVEMENT ROADMAP — MAKING IT MUCH BETTER", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
story.append(P(
    "The following are concrete, prioritized enhancements to evolve this prototype "
    "into a polished production-grade gamified productivity platform.", body_style))

roadmap = [
    ("P0 — Critical / Stability", [
        "Add input validation and sanitization for chatbot and quest fields to prevent XSS (user text is currently inserted via innerHTML).",
        "Replace innerHTML with textContent or a sanitizer for all user-generated content (quest titles, captions, author names).",
        "Add error boundaries / try-catch around canvas drawing to prevent a single bad frame from freezing the render loop.",
        "Persist quest completion progress (e.g., push-up counters) so partially completed quests survive refresh.",
    ]),
    ("P1 — Core Experience", [
        "Connect quest progress to real inputs: add checkboxes/numeric inputs so users can log actual push-ups, sit-ups, squats, km run, and focus minutes.",
        "Replace the rule-based chatbot with an LLM integration (e.g., OpenAI / local model) for genuinely useful fitness and study advice.",
        "Add a dark/light theme toggle and CSS custom-property theming.",
        "Add sound on/off per-category (UI vs. level-up vs. penalty) and a volume slider.",
    ]),
    ("P2 — Social & Progression Depth", [
        "Add friend/guild system and shared leaderboards (requires a backend).",
        "Add skill trees with prerequisites and unlock conditions instead of flat AP buttons.",
        "Add streak tracking (consecutive days quests completed) and streak rewards.",
        "Add image compression/optimization before storing transformation photos in localStorage (to avoid quota limits).",
    ]),
    ("P3 — Polish & Distribution", [
        "Convert to a PWA (service worker + manifest) so it can be installed offline and run like a native app.",
        "Add a backend (Node.js/Express or Supabase) for cloud sync, multi-user accounts, and public transformation feeds.",
        "Add unit tests (Jest/Vitest) for the leveling, quest, and timer logic.",
        "Add accessibility improvements: ARIA labels, keyboard focus indicators, reduced-motion support.",
        "Optimize the 270-frame animation: lazy-load frames or convert to a video/WebM for faster initial load.",
    ]),
]
for tier, items in roadmap:
    story.append(P(f"<b>{tier}</b>", feature_style))
    story.append(ListFlowable([bullet(i) for i in items],
                              bulletType="bullet", start="•",
                              leftIndent=14, bulletFontSize=8.5,
                              bulletColor=PURPLE_BRIGHT))
    story.append(Spacer(1, 3 * mm))

story.append(PageBreak())

# ============================ SECTION 6: LOCALHOST / HOW TO RUN ============================
story.append(P("6. HOW TO RUN LOCALLY — LOCALHOST LINK", h1_style))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
story.append(P(
    "Because this is a static front-end app (no backend), you only need a simple HTTP "
    "server to serve the files. Opening index.html directly via file:// may block the "
    "webcam and some features due to browser security restrictions, so a localhost "
    "server is recommended.", body_style))

story.append(P("Option A — Python (built-in, no install)", h2_style))
story.append(P("Open a terminal in the project folder and run:", detail_style))
code = Table([[P("python -m http.server 8000", ParagraphStyle(
    "code", fontName="Courier", fontSize=9, leading=13,
    textColor=CYAN, alignment=TA_LEFT))]], colWidths=[170 * mm])
code.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 0.8, BORDER_CYAN),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(code)
story.append(Spacer(1, 3 * mm))
story.append(P("Then open in your browser:", detail_style))
link = Table([[P("<font color='#00f0ff'><b>http://localhost:8000</b></font>", ParagraphStyle(
    "link", fontName="Courier-Bold", fontSize=11, leading=15,
    textColor=CYAN, alignment=TA_LEFT))]], colWidths=[170 * mm])
link.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 0.8, BORDER_PURPLE),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(link)
story.append(Spacer(1, 5 * mm))

story.append(P("Option B — Node.js (npx http-server)", h2_style))
story.append(P("Run:", detail_style))
code2 = Table([[P("npx http-server -p 8080", ParagraphStyle(
    "code2", fontName="Courier", fontSize=9, leading=13,
    textColor=CYAN, alignment=TA_LEFT))]], colWidths=[170 * mm])
code2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 0.8, BORDER_CYAN),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(code2)
story.append(Spacer(1, 3 * mm))
story.append(P("Then open:", detail_style))
link2 = Table([[P("<font color='#00f0ff'><b>http://localhost:8080</b></font>", ParagraphStyle(
    "link2", fontName="Courier-Bold", fontSize=11, leading=15,
    textColor=CYAN, alignment=TA_LEFT))]], colWidths=[170 * mm])
link2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 0.8, BORDER_PURPLE),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(link2)
story.append(Spacer(1, 5 * mm))

story.append(P("Option C — VS Code 'Live Server' extension", h2_style))
story.append(P("Install the 'Live Server' extension, right-click index.html, and choose "
               "'Open with Live Server'. It typically starts at:", detail_style))
link3 = Table([[P("<font color='#00f0ff'><b>http://127.0.0.1:5500</b></font>", ParagraphStyle(
    "link3", fontName="Courier-Bold", fontSize=11, leading=15,
    textColor=CYAN, alignment=TA_LEFT))]], colWidths=[170 * mm])
link3.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), DARK_CARD),
    ("BOX", (0, 0), (-1, -1), 0.8, BORDER_PURPLE),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(link3)

story.append(Spacer(1, 6 * mm))
story.append(HRFlowable(width="100%", thickness=0.8, color=BORDER_PURPLE))
story.append(Spacer(1, 4 * mm))
story.append(P("NOTE: For full functionality (Hunter Vision camera scan), you must serve "
               "via http://localhost (not file://) and grant camera permission when prompted.", detail_style))
story.append(Spacer(1, 4 * mm))
story.append(P("Solo Leveling is owned by Chugong & Redice Studio. This is a fan-made "
               "gamified productivity prototype. All rights reserved to their respective owners.", footer_style))

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF generated: {OUT}")
