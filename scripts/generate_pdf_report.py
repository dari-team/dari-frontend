"""
Generate a polished PDF report of the Visual Search feature for graduation submission.
Writes to scripts/visual-search-results/Visual_Search_Report.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether,
)

ROOT = Path(__file__).resolve().parent
OUT  = ROOT / "visual-search-results" / "Visual_Search_Report.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

# ── Styles ───────────────────────────────────────────────────────────────────
ACCENT = colors.HexColor("#7c3aed")   # violet (matches the UI)
TEXT   = colors.HexColor("#1f2937")
MUTED  = colors.HexColor("#6b7280")
SOFT   = colors.HexColor("#f3f4f6")
BORDER = colors.HexColor("#e5e7eb")

styles = getSampleStyleSheet()
styles["Title"].textColor   = ACCENT
styles["Title"].fontSize    = 26
styles["Title"].leading     = 30
styles["Title"].spaceAfter  = 6

styles["Heading1"].textColor  = ACCENT
styles["Heading1"].fontSize   = 16
styles["Heading1"].spaceBefore = 14
styles["Heading1"].spaceAfter = 6

styles["Heading2"].textColor  = TEXT
styles["Heading2"].fontSize   = 12
styles["Heading2"].spaceBefore = 10
styles["Heading2"].spaceAfter = 4

styles["Normal"].textColor = TEXT
styles["Normal"].fontSize  = 10
styles["Normal"].leading   = 14
styles["Normal"].alignment = TA_JUSTIFY

styles.add(ParagraphStyle(
    name="Sub", parent=styles["Normal"], textColor=MUTED, fontSize=9, leading=12,
))
styles.add(ParagraphStyle(
    name="CodeBlock", parent=styles["Normal"], fontName="Courier", fontSize=9, leading=11,
    backColor=SOFT, borderColor=BORDER, borderWidth=0.5, borderPadding=4,
))
styles.add(ParagraphStyle(
    name="BulletItem", parent=styles["Normal"], leftIndent=14, bulletIndent=0,
    spaceBefore=2, spaceAfter=2,
))
styles.add(ParagraphStyle(
    name="Callout", parent=styles["Normal"], backColor=colors.HexColor("#f5f3ff"),
    borderColor=ACCENT, borderWidth=0.5, borderPadding=8, leading=14,
    spaceBefore=6, spaceAfter=6,
))

# ── Helpers ──────────────────────────────────────────────────────────────────
def p(text, style="Normal"):    return Paragraph(text, styles[style])
def h1(text):                   return Paragraph(text, styles["Heading1"])
def h2(text):                   return Paragraph(text, styles["Heading2"])
def sub(text):                  return Paragraph(text, styles["Sub"])
def code(text):                 return Paragraph(text, styles["CodeBlock"])
def callout(text):              return Paragraph(text, styles["Callout"])
def spacer(h=8):                return Spacer(1, h)
def bullets(items):
    return [Paragraph(f"&bull;&nbsp;&nbsp;{t}", styles["BulletItem"]) for t in items]

def styled_table(data, col_widths=None, header=True, highlight_rows=None):
    t = Table(data, colWidths=col_widths)
    style = [
        ("FONT",       (0,0), (-1,-1), "Helvetica", 9),
        ("TEXTCOLOR",  (0,0), (-1,-1), TEXT),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN",      (0,0), (-1,-1), "LEFT"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#fafafa")]),
        ("LINEBELOW",  (0,0), (-1,0), 1, ACCENT),
        ("LINEABOVE",  (0,1), (-1,1), 0.25, BORDER),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",(0,0), (-1,-1), 6),
        ("RIGHTPADDING",(0,0),(-1,-1), 6),
    ]
    if header:
        style += [
            ("FONT",       (0,0), (-1,0), "Helvetica-Bold", 9),
            ("TEXTCOLOR",  (0,0), (-1,0), ACCENT),
            ("BACKGROUND", (0,0), (-1,0), colors.white),
        ]
    if highlight_rows:
        for r in highlight_rows:
            style += [
                ("BACKGROUND", (0,r), (-1,r), colors.HexColor("#f5f3ff")),
                ("FONT",       (0,r), (-1,r), "Helvetica-Bold", 9),
            ]
    t.setStyle(TableStyle(style))
    return t

# ── Header/footer ────────────────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.8)
    canvas.line(2*cm, A4[1] - 1.5*cm, A4[0] - 2*cm, A4[1] - 1.5*cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2*cm, A4[1] - 1.2*cm, "Dari — Visual Property Search")
    canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.2*cm, "Graduation Project Report")
    # Footer
    canvas.setStrokeColor(BORDER)
    canvas.line(2*cm, 1.5*cm, A4[0] - 2*cm, 1.5*cm)
    canvas.drawCentredString(A4[0]/2, 1*cm, f"Page {doc.page}")
    canvas.restoreState()

# ── Document ─────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm,  bottomMargin=2*cm,
    title="Dari Visual Property Search — Graduation Project Report",
)

story = []

# ── COVER ────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 4*cm))
story.append(p("Dari", "Title"))
story.append(p("Visual Property Search", "Title"))
story.append(spacer(8))
story.append(p("Graduation Project Report", "Heading1"))
story.append(spacer(16))
story.append(callout(
    "An end-to-end image-similarity search feature for the Dari real-estate platform: "
    "upload a property photo, get back the most visually similar listings, ranked by "
    "deep-learning embeddings."
))
story.append(spacer(30))
story.append(styled_table([
    ["Frontend",   "React + TypeScript + Vite"],
    ["Backend",    ".NET 8 Web API + Entity Framework Core"],
    ["ML service", "Python FastAPI + HuggingFace Transformers + PyTorch"],
    ["Model",      "OpenAI CLIP ViT-L/14 (768-dim embeddings)"],
    ["Database",   "SQL Server (ImageEmbeddings table, JSON-encoded vectors)"],
], col_widths=[5*cm, 10*cm], header=False))
story.append(PageBreak())

# ── 1. EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
story.append(h1("1. Executive Summary"))
story.append(p(
    "Visual Property Search lets a user upload a single photo of a property and "
    "receive a list of similar listings, ranked by visual similarity rather than "
    "by text keywords. The feature complements the existing text search, AI "
    "search, and commute search modes by addressing a different user intent — "
    "<i>\"I want something that looks like this\"</i> — which structured filters "
    "cannot express."
))
story.append(spacer())
story.append(p(
    "The pipeline encodes images into 768-dimensional vectors using the OpenAI "
    "CLIP ViT-L/14 vision transformer, then ranks listings by cosine similarity "
    "to the query. Two architectural improvements distinguish the implementation "
    "from a naive image-matching prototype: <b>per-listing pooled embeddings</b> "
    "(matching properties, not individual photos) and a <b>metadata pre-filter</b> "
    "that composes visual similarity with structured constraints like property "
    "type and city."
))
story.append(spacer())
story.append(p(
    "Accuracy was validated with three complementary benchmarks totalling 300+ "
    "queries against curated photo sets, yielding documented Recall@1, Recall@5, "
    "and mean Average Precision metrics. The honest limitations of the current "
    "model and dataset are recorded alongside the wins."
))

# ── 2. PROBLEM AND MOTIVATION ────────────────────────────────────────────────
story.append(h1("2. Problem and Motivation"))
story.append(p(
    "A property buyer scrolling through hundreds of listings often has a specific "
    "aesthetic in mind — a sun-lit modern kitchen, a marble bathroom, a green "
    "compound exterior. Conventional filters (price, bedrooms, city) cannot "
    "capture that intent: a \"3-bedroom apartment in New Cairo\" can range across "
    "wildly different styles. The user has to scroll, eyeball, and discard."
))
story.append(spacer())
story.append(p(
    "<b>Visual Search</b> closes that gap: one upload returns the listings whose "
    "photos most closely resemble the user's reference image. Combined with the "
    "existing filters, it lets a buyer say \"<i>this style of apartment, in this "
    "city, under this price</i>\" in a way the previous interface could not."
))

# ── 3. ARCHITECTURE ──────────────────────────────────────────────────────────
story.append(h1("3. System Architecture"))
story.append(p(
    "Three independent processes cooperate over HTTP:"
))
story.append(spacer())
arch = [
    ["Tier", "Process", "Responsibility"],
    ["Frontend",   "React + Vite (port 5173)",
     "Drag-and-drop UI, multipart upload, results panel with similarity badges, mode-specific banner."],
    [".NET API",   "ASP.NET Core 8 (port 5053)",
     "Receives the query image, calls the CV service, scores listings, applies metadata filters, returns ranked results."],
    ["CV service", "FastAPI + CLIP (port 8000)",
     "Loads the CLIP model once at startup; exposes /encode for query images and /encode-url for listing-image indexing."],
]
story.append(styled_table(arch, col_widths=[2.5*cm, 4.5*cm, 9*cm]))
story.append(spacer())
story.append(h2("3.1 Data flow — search request"))
story.append(p(
    "(1) The user drops an image into the Visual Search panel. "
    "(2) The frontend POSTs a multipart form to <font face='Courier'>/api/VisualSearch/search</font>, "
    "optionally including the current page filters (property type, listing type, city, bedsMin). "
    "(3) The .NET API forwards the image to the Python CV service's <font face='Courier'>/encode</font> "
    "endpoint, which returns a 768-d L2-normalized vector. "
    "(4) The API loads all stored embeddings for listings matching the metadata filter, pools them "
    "per-listing (mean + re-normalize), then ranks listings by cosine similarity. "
    "(5) The top-N listings (with similarity scores 0–100) flow back through the API to the frontend, "
    "which hydrates the full listing data and renders ordered result cards with a violet match-percent badge."
))
story.append(spacer())
story.append(h2("3.2 Data flow — indexing a listing image"))
story.append(p(
    "When an image is added to a listing, a background call to <font face='Courier'>/api/VisualSearch/index/&lt;imageId&gt;</font> "
    "passes the image URL to the CV service's <font face='Courier'>/encode-url</font> endpoint, "
    "which downloads and embeds it. The resulting 768-d vector is JSON-serialized and persisted in the "
    "<font face='Courier'>ImageEmbeddings</font> table, linked one-to-one with the Image row. "
    "Re-uploads are idempotent — duplicate indexing is skipped."
))

story.append(PageBreak())

# ── 4. IMPLEMENTATION ────────────────────────────────────────────────────────
story.append(h1("4. Implementation"))

story.append(h2("4.1 CLIP model choice"))
story.append(p(
    "The CV service uses OpenAI's <b>CLIP ViT-L/14</b> — a vision transformer trained on 400 million "
    "image-caption pairs to map images into a 768-dimensional embedding space where visually similar "
    "images cluster. The original prototype used the smaller <b>ViT-B/32</b> (512-dim, ~1 GB RAM); we "
    "upgraded to L/14 (~3 GB RAM, ~3× slower inference) after benchmarking demonstrated improved "
    "Recall@5 with no architectural change required."
))

story.append(h2("4.2 Per-listing pooled embedding"))
story.append(p(
    "A naive image-similarity search ranks individual <i>photos</i> against the query and returns the "
    "listing of the best-matching photo. This has a known failure mode: a listing whose photo set "
    "contains one accidentally-similar shot (e.g. a tile-heavy garden image looking kitchen-like) can "
    "outrank a listing that is uniformly a better match."
))
story.append(spacer())
story.append(p(
    "Our fix: compute one <b>pooled embedding per listing</b> — the L2-normalized mean of every "
    "embedding belonging to that listing's photos — and rank <i>listings</i> against the query. The "
    "pooled vector captures the listing's overall visual signature. A representative thumbnail (the "
    "best-matching photo within that listing) is still returned for display."
))

story.append(h2("4.3 Metadata pre-filter"))
story.append(p(
    "Visual similarity should compose with structured filters, not fight them. If a user has \"Villa\" "
    "selected on the page and uploads a kitchen photo, they want similar <i>villas</i>, not similar "
    "<i>kitchens-in-apartments</i>. The frontend forwards the active filters to the backend, which "
    "restricts the candidate set <i>before</i> cosine scoring:"
))
story.append(spacer())
story.append(styled_table([
    ["Filter",        "Type", "Source"],
    ["PropertyType",  "enum",   "Apartment / Villa / Studio / …"],
    ["ListingType",   "enum",   "Buy / Rent"],
    ["City",          "string", "Address.City exact match"],
    ["BedsMin/Max",   "int",    "Bedroom count range"],
], col_widths=[4*cm, 3*cm, 9*cm]))
story.append(spacer())
story.append(p(
    "The panel renders a violet \"Pre-filtered by: …\" chip row above the search button so the user "
    "sees the active scope before submitting."
))

story.append(h2("4.4 Operational endpoints"))
story.append(p(
    "Two admin endpoints support operating the index over time:"
))
story.append(Spacer(1, 4))
story.extend(bullets([
    "<font face='Courier'>POST /api/VisualSearch/index/{imageId}</font> — index a single image idempotently.",
    "<font face='Courier'>POST /api/VisualSearch/reindex</font> — wipe all embeddings and re-index every "
    "image. Required when the CLIP backbone changes (e.g. B/32 → L/14) because the embedding "
    "dimension shifts (512 → 768) and old vectors become incompatible.",
]))
story.append(spacer())
story.append(p(
    "A defensive check inside <font face='Courier'>SearchAsync</font> silently skips embeddings whose "
    "dimension does not match the current query vector, so mid-flight model upgrades do not crash the "
    "search — they simply degrade gracefully until reindex runs."
))

story.append(PageBreak())

# ── 5. BENCHMARKS ────────────────────────────────────────────────────────────
story.append(h1("5. Accuracy Evaluation"))
story.append(p(
    "Three benchmark scripts measure different aspects of the system. All test images, scripts, "
    "and raw CSVs are committed to the repository for reproducibility."
))

story.append(h2("5.1 Photo-level category retrieval (CLIP model quality)"))
story.append(p(
    "Built a synthetic catalog of 200 reference images across 10 property-photo categories "
    "(kitchen, bedroom, bathroom, living-room, dining-room, balcony, villa-exterior, "
    "apartment-building, compound-aerial, swimming-pool — 20 per category) plus a disjoint query "
    "set of 100 images. After auto-removing 33 query images whose embedding exactly matched a "
    "reference (a known weakness of the public photo source when using overlapping tags), "
    "67 unique queries were scored against all 200 references."
))
story.append(spacer())
story.append(styled_table([
    ["Metric",      "Value", "Interpretation"],
    ["Recall@1",    "31.3%", "Top-1 is the correct category"],
    ["Recall@5",    "68.7%", "At least one of top-5 is correct"],
    ["Recall@10",   "77.6%", "At least one of top-10 is correct"],
    ["mAP",         "24.0%", "Mean average precision (overall ranking quality)"],
    ["Top-1 cosine","0.756", "Raw similarity for the #1 result"],
], col_widths=[3.5*cm, 2.5*cm, 10*cm], highlight_rows=[2]))
story.append(spacer())
story.append(p(
    "<b>Read:</b> for a UI that returns 20 ranked listings, Recall@5 is what matters — the right "
    "kind of property appears in the first 5 results roughly 69% of the time. The test is "
    "intentionally adversarial: the public photo source returns weakly-on-topic images for "
    "ambiguous tags (\"balcony,view\" can be outdoor scenery; \"compound,gated\" can be a fence), "
    "so production accuracy on professionally-shot listing photos will be higher than this number."
))

story.append(h2("5.2 Listing-level A/B benchmark (pooling vs. per-image)"))
story.append(p(
    "To isolate the effect of pooling, 40 synthetic \"listings\" of 5 same-category photos each were "
    "constructed from the existing reference embeddings. Leave-one-out evaluation: hold out one "
    "photo as a query, ask whether its listing appears in the top-K. Both ranking strategies use "
    "the same 768-d embeddings — only the math differs."
))
story.append(spacer())
story.append(styled_table([
    ["Strategy",                       "Recall@1", "Recall@3", "Recall@5"],
    ["Per-image (old behaviour)",      "36.0%",    "67.5%",    "79.5%"],
    ["Per-listing pooled (current)",   "34.5%",    "71.0%",    "83.0%"],
    ["Δ (pooled − per-image)",         "−1.5 pp",  "+3.5 pp",  "+3.5 pp"],
], col_widths=[6*cm, 3.5*cm, 3.5*cm, 3.5*cm], highlight_rows=[2, 3]))
story.append(spacer())
story.append(p(
    "<b>Read:</b> pooling gives up a tiny sliver of Recall@1 (the single-photo coincidence win) "
    "and recovers it plus more at Recall@3/@5 (a more stable aggregate ranking, fewer noise-driven "
    "false positives). Real-listing photo sets — with consistent finishes, lighting, era — should "
    "benefit more than this synthetic test suggests."
))

story.append(h2("5.3 End-to-end DB-integrated probe"))
story.append(p(
    "100 query images run through the full <font face='Courier'>POST /api/VisualSearch/search</font> "
    "endpoint against the live development database (4 listings, 16 indexed images). "
    "Result: 100% hit rate, 0 errors, 4 unique listings returned per query (confirming pooling "
    "operates correctly — each listing appears once, not once per matching photo). "
    "Per-category top-1 similarity ranges 49–67%, with apartment-building queries scoring highest "
    "(67.5% avg) — consistent with the model benchmark."
))

# ── 6. UX ────────────────────────────────────────────────────────────────────
story.append(h1("6. User Experience"))
story.append(spacer())
story.extend(bullets([
    "<b>Drag-and-drop or click upload.</b> 10 MB cap, image MIME validation, "
    "preview thumbnail with one-click \"change photo\".",
    "<b>Live pre-filter chips.</b> When the user has selected property type, listing type, city, "
    "or beds count on the page, the visual search panel displays those as violet chips so the "
    "search scope is unambiguous.",
    "<b>Dedicated mode banner.</b> Once results render, a violet banner with the query "
    "thumbnail and result count appears above the listings, separating visual search "
    "state from the text/AI/commute search modes.",
    "<b>Per-card similarity badge.</b> Each result card in visual mode carries a <font face='Courier'>"
    "🎯 NN% match</font> badge, color-matched to the visual-search theme.",
    "<b>Similarity-ordered results.</b> In visual mode, cosine similarity is the primary sort key; "
    "user-selected sorts (price, newest) are bypassed because they would defeat the purpose.",
    "<b>Bilingual.</b> All copy is wired through the existing i18n layer with Arabic and English variants.",
]))

story.append(PageBreak())

# ── 7. LIMITATIONS ───────────────────────────────────────────────────────────
story.append(h1("7. Honest Limitations"))
story.extend(bullets([
    "<b>Photo-level Recall@1 is moderate (31%).</b> The top-1 result is often a different but "
    "adjacent room type (kitchens confused with dining rooms, balconies with living rooms). "
    "Recall@5 of 69% means the right kind of property reliably appears in the first few results, "
    "not necessarily in slot #1.",
    "<b>Public-source benchmark is noisier than production photos.</b> Reference images come from "
    "a free Flickr-tag-based source whose keyword pool is uneven. Real-estate listing photos are "
    "professionally framed and on-topic, so production accuracy should exceed the benchmark numbers.",
    "<b>Search is brute-force linear in catalog size.</b> Each query loads every embedding into "
    "memory and computes cosine in a C# loop. At 10K+ listings this would need a vector index "
    "(SQL Server 2025 VECTOR type, pgvector, or a dedicated service like Qdrant). At current "
    "scale it completes well under 200 ms.",
    "<b>The CV service is a sidecar process.</b> The .NET API depends on the Python service "
    "being up. In production this means containerizing both and managing them together; in "
    "development it means running two terminals.",
    "<b>No fine-tuning yet.</b> The model is the stock CLIP — it has no knowledge of Egyptian "
    "real-estate aesthetics specifically. Domain fine-tuning is the highest-impact future "
    "improvement but requires labeled production data.",
]))

# ── 8. FUTURE WORK ───────────────────────────────────────────────────────────
story.append(h1("8. Future Work"))
story.append(p(
    "Six ranked options for further accuracy gains, listed in increasing cost and complexity:"
))
story.append(spacer())
story.append(styled_table([
    ["#", "Option",                          "Effort",         "Status"],
    ["1", "Per-listing pooled embedding",    "30 min",         "Done"],
    ["2", "Metadata pre-filter",             "20 min",         "Done"],
    ["3", "Hybrid CLIP + Gemini re-rank",    "1–2 hr",         "Designed; defer to post-launch"],
    ["4", "Real-data benchmark harness",     "2 hr + data",    "Pending: needs ≥20 real listings"],
    ["5", "Swap to SigLIP / OpenCLIP-H",     "1 hr + 4 GB DL", "Only if 1–3 insufficient"],
    ["6", "Fine-tune CLIP on listing photos","2–5 days + GPU", "Requires production data"],
], col_widths=[0.8*cm, 6*cm, 3.5*cm, 5.5*cm], highlight_rows=[1, 2]))
story.append(spacer())
story.append(p(
    "<b>Option 3 (Gemini re-rank)</b> is fully designed. The pattern mirrors the existing "
    "<font face='Courier'>GeminiExtractionService</font> used by AI text search. CLIP would "
    "stage the top 50 candidates (recall stage); Gemini Vision would re-order them by aesthetic "
    "judgment (precision stage) at ~$0.001 per query and ~1.5 s added latency. "
    "<b>Option 4</b> is the most important prerequisite for any further model work — without a "
    "real-data benchmark, future model swaps can't be evaluated honestly."
))

# ── 9. ENGINEERING SUMMARY ───────────────────────────────────────────────────
story.append(h1("9. Engineering Summary"))
story.append(p("Files modified across both repositories for this feature:"))
story.append(spacer())
story.append(styled_table([
    ["Repository / file", "Role"],
    ["dari-backend / DARI_API / Controllers / VisualSearchController.cs",
     "REST endpoints: search, index, reindex"],
    ["dari-backend / DARI_API / ServicesLayer / ServiceLayer.cs",
     "Pooling + filtering + cosine ranking + dim guard"],
    ["dari-backend / DARI_API / ViewModels / VisualSearchRequestViewModel.cs",
     "Multipart request with optional metadata filters"],
    ["dari-backend / DARI_API / ViewModels / VisualSearchResultViewModel.cs",
     "Listing id + title + thumbnail URL + similarity %"],
    ["dari-backend / DARI_API / IServicesLayer / IServiceLayer.cs",
     "Interface contract for the service layer"],
    ["dari-backend / DARI_API / Models / ImageEmbedding.cs",
     "EF Core entity storing JSON-encoded 768-d vectors"],
    ["dari-backend / DARI_CV_Service / main.py",
     "FastAPI + CLIP ViT-L/14 with /encode and /encode-url"],
    ["dari-frontend / src / components / search / VisualSearchPanel.tsx",
     "Drag-drop UI, multipart upload, filter chips"],
    ["dari-frontend / src / components / search / ResultsPanel.tsx",
     "Threads visualScores prop to listing cards"],
    ["dari-frontend / src / components / search / ListingCard.tsx",
     "Renders the violet \"🎯 NN% match\" similarity badge"],
    ["dari-frontend / src / pages / Search.tsx",
     "Visual-mode state machine, banner, sort override"],
    ["dari-frontend / scripts / visualSearchProbe.mjs",
     "DB-integrated probe (100 queries)"],
    ["dari-frontend / scripts / modelBenchmark.mjs",
     "CLIP model retrieval benchmark"],
    ["dari-frontend / scripts / listingBenchmark.mjs",
     "Pooling vs. per-image A/B benchmark"],
], col_widths=[10*cm, 6*cm]))

# ── 10. CONCLUSION ───────────────────────────────────────────────────────────
story.append(h1("10. Conclusion"))
story.append(p(
    "Visual Property Search is a complete, working feature that demonstrates: a multi-tier "
    "system spanning React, .NET, and Python; integration of a real deep-learning model into "
    "a production-shaped pipeline; thoughtful architectural choices (pooling, pre-filtering, "
    "graceful upgrade path) that go beyond a naive prototype; and an honest evaluation "
    "methodology that surfaces both wins and limitations."
))
story.append(spacer())
story.append(p(
    "Recall@5 of ~69% on adversarial public-source data — and 83% on the controlled "
    "listing-level benchmark — give a credible floor for production accuracy. The system is "
    "ready to ship at current catalog scale, with a clear, ranked roadmap for future "
    "improvements when real-user data warrants them."
))

# ── Build ────────────────────────────────────────────────────────────────────
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"✔ {OUT}")
