#!/usr/bin/env node
/**
 * Visual Search Accuracy Probe
 * ============================
 *
 * Usage:
 *   node scripts/visualSearchProbe.mjs --download         # Download 100+ test images from loremflickr
 *   node scripts/visualSearchProbe.mjs --index            # Bulk-index every listing's images into the CV embedding store
 *   node scripts/visualSearchProbe.mjs --probe            # Run all test images through /VisualSearch/search and dump CSV
 *   node scripts/visualSearchProbe.mjs --report           # Render markdown report from probe CSV
 *   node scripts/visualSearchProbe.mjs --all              # download → index → probe → report
 *
 * Env:
 *   API_BASE   default http://localhost:5188
 *   CV_BASE    default http://localhost:8000
 *   TOP_N      default 5
 *   PER_CAT    default 10  (test images per category)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { request } from "node:https";
import { request as httpRequest } from "node:http";
import { Blob } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const IMG_DIR   = join(__dirname, "visual-search-test-images");
const OUT_DIR   = join(__dirname, "visual-search-results");
const CSV_PATH  = join(OUT_DIR, "probe.csv");
const REPORT    = join(OUT_DIR, "REPORT.md");

const API_BASE = process.env.API_BASE || "http://localhost:5188";
const CV_BASE  = process.env.CV_BASE  || "http://localhost:8000";
const TOP_N    = Number(process.env.TOP_N || 5);
const PER_CAT  = Number(process.env.PER_CAT || 10);

const CATEGORIES = [
  // interior
  { slug: "kitchen",          kind: "interior", keywords: "kitchen,interior" },
  { slug: "bedroom",          kind: "interior", keywords: "bedroom,interior" },
  { slug: "bathroom",         kind: "interior", keywords: "bathroom,interior" },
  { slug: "living-room",      kind: "interior", keywords: "livingroom,sofa" },
  { slug: "dining-room",      kind: "interior", keywords: "diningroom,table" },
  { slug: "balcony-interior", kind: "interior", keywords: "balcony,view" },
  // exterior
  { slug: "villa-exterior",        kind: "exterior", keywords: "villa,house" },
  { slug: "apartment-building",    kind: "exterior", keywords: "apartment,building" },
  { slug: "compound-aerial",       kind: "exterior", keywords: "compound,gated" },
  { slug: "swimming-pool",         kind: "exterior", keywords: "pool,resort" },
];

// ── tiny fetch wrapper (node18+ has global fetch; we just use it) ─────────────
async function jget(url, opts = {}) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}: ${txt.slice(0, 200)}`);
  return JSON.parse(txt);
}
async function postForm(url, file, params = {}) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const form = new FormData();
  const buf = readFileSync(file.path);
  const blob = new Blob([buf], { type: file.mime || "image/jpeg" });
  form.append("Image", blob, file.name);
  const res = await fetch(u, { method: "POST", body: form });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${u}: ${txt.slice(0, 200)}`);
  try { return JSON.parse(txt); } catch { return txt; }
}

function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

// ── 1. DOWNLOAD ──────────────────────────────────────────────────────────────
async function downloadAll() {
  ensureDir(IMG_DIR);
  console.log(`▶ Downloading ${PER_CAT} images for each of ${CATEGORIES.length} categories → ${IMG_DIR}`);
  let count = 0;
  for (const cat of CATEGORIES) {
    const catDir = join(IMG_DIR, cat.slug);
    ensureDir(catDir);
    for (let i = 1; i <= PER_CAT; i++) {
      const dst = join(catDir, `${cat.slug}-${String(i).padStart(2, "0")}.jpg`);
      if (existsSync(dst)) { count++; continue; }
      // loremflickr returns a real Flickr photo matching the keywords.
      // Lock random seed per (slug,i) so re-runs are reproducible.
      const url = `https://loremflickr.com/640/480/${encodeURIComponent(cat.keywords)}?lock=${cat.slug.length * 100 + i}`;
      try {
        await downloadTo(url, dst);
        count++;
        process.stdout.write(`.`);
      } catch (e) {
        process.stdout.write(`x`);
      }
    }
    console.log(` [${cat.slug}]`);
  }
  console.log(`✔ Downloaded ${count} images.`);
}

function downloadTo(url, dst) {
  return new Promise((resolve, reject) => {
    function go(u, depth = 0) {
      if (depth > 5) return reject(new Error("too many redirects"));
      const parsed = new URL(u);
      const lib = parsed.protocol === "https:" ? request : httpRequest;
      const req = lib(parsed, { method: "GET", headers: { "User-Agent": "dari-probe/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return go(new URL(res.headers.location, parsed).toString(), depth + 1);
        }
        if (res.statusCode !== 200) { res.resume(); return reject(new Error("status " + res.statusCode)); }
        const out = createWriteStream(dst);
        res.pipe(out);
        out.on("finish", () => out.close(resolve));
        out.on("error", reject);
      });
      req.on("error", reject);
      req.end();
    }
    go(url);
  });
}

// ── 2. INDEX ALL LISTING IMAGES ──────────────────────────────────────────────
async function indexAllListings() {
  console.log(`▶ Fetching listings from ${API_BASE}/api/Listing/filter ...`);
  const listings = await jget(`${API_BASE}/api/Listing/filter?pageSize=500`);
  // Filter endpoint may return an array or a paged shape.
  const arr = Array.isArray(listings) ? listings : (listings?.data ?? listings?.items ?? []);
  console.log(`  → ${arr.length} listings`);

  let imgCount = 0, indexed = 0, failed = 0;
  for (const l of arr) {
    const imgs = l.images || [];
    for (const img of imgs) {
      imgCount++;
      try {
        const res = await fetch(`${API_BASE}/api/VisualSearch/index/${img.id}`, { method: "POST" });
        if (res.ok) indexed++;
        else failed++;
      } catch { failed++; }
    }
  }
  console.log(`✔ Indexed ${indexed}/${imgCount} images (${failed} failed).`);
  return { listings: arr.length, indexed, failed };
}

// ── 3. PROBE ──────────────────────────────────────────────────────────────────
async function probeAll() {
  ensureDir(OUT_DIR);
  console.log(`▶ Probing /api/VisualSearch/search?topN=${TOP_N} ...`);

  // Sanity: backend reachable?
  try { await fetch(`${API_BASE}/api/Listing/featured`).then(r => r.ok || Promise.reject(r.status)); }
  catch (e) { throw new Error(`Backend not reachable at ${API_BASE}: ${e}`); }
  // Sanity: CV service reachable?
  try { await fetch(`${CV_BASE}/health`).then(r => r.ok || Promise.reject(r.status)); }
  catch (e) { console.warn(`⚠ CV service not reachable at ${CV_BASE}: ${e} — backend will fail`); }

  const rows = [["category", "kind", "image", "rank", "listingId", "title", "score"]];
  let queries = 0, hits = 0, empty = 0, errored = 0;

  for (const cat of CATEGORIES) {
    const catDir = join(IMG_DIR, cat.slug);
    if (!existsSync(catDir)) continue;
    const files = readdirSync(catDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    for (const f of files) {
      const filePath = join(catDir, f);
      queries++;
      try {
        const results = await postForm(`${API_BASE}/api/VisualSearch/search`, { path: filePath, name: f }, { topN: TOP_N });
        if (!Array.isArray(results) || results.length === 0) {
          empty++;
          rows.push([cat.slug, cat.kind, f, "", "", "", ""]);
          continue;
        }
        results.forEach((r, i) => {
          hits++;
          rows.push([
            cat.slug, cat.kind, f, String(i + 1),
            r.listingId ?? "", quote(r.title ?? ""), String(r.similarityScore ?? ""),
          ]);
        });
      } catch (e) {
        errored++;
        rows.push([cat.slug, cat.kind, f, "ERR", "", "", String(e.message).slice(0, 80)]);
      }
      if (queries % 10 === 0) console.log(`  · ${queries} queries`);
    }
  }

  writeFileSync(CSV_PATH, rows.map((r) => r.join(",")).join("\n"));
  console.log(`✔ Wrote ${CSV_PATH} (${queries} queries, ${hits} hits, ${empty} empty, ${errored} errors)`);
  return { queries, hits, empty, errored };
}

function quote(s) { return `"${String(s).replace(/"/g, '""')}"`; }

// ── 4. REPORT ────────────────────────────────────────────────────────────────
function makeReport() {
  if (!existsSync(CSV_PATH)) throw new Error("No CSV — run --probe first");
  const raw = readFileSync(CSV_PATH, "utf8").trim().split("\n");
  const header = raw[0].split(",");
  const rows = raw.slice(1).map((line) => {
    // naive CSV split — handles our quoted titles
    const out = []; let cur = ""; let inQ = false;
    for (const c of line) {
      if (c === '"' && !inQ) { inQ = true; continue; }
      if (c === '"' && inQ)  { inQ = false; continue; }
      if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return Object.fromEntries(header.map((h, i) => [h, out[i] ?? ""]));
  });

  const byImg = new Map();
  for (const r of rows) {
    const k = `${r.category}/${r.image}`;
    if (!byImg.has(k)) byImg.set(k, []);
    if (r.rank && r.rank !== "ERR" && r.listingId) byImg.get(k).push(r);
  }

  const byCat = new Map();
  for (const [k, hits] of byImg.entries()) {
    const cat = k.split("/")[0];
    if (!byCat.has(cat)) byCat.set(cat, { queries: 0, withResults: 0, top1: [], top5avg: [] });
    const b = byCat.get(cat);
    b.queries++;
    if (hits.length > 0) {
      b.withResults++;
      b.top1.push(Number(hits[0].score) || 0);
      b.top5avg.push(hits.reduce((s, h) => s + (Number(h.score) || 0), 0) / hits.length);
    }
  }

  const lines = [];
  lines.push(`# Visual Search Accuracy Report`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Backend: ${API_BASE}  ·  CV service: ${CV_BASE}  ·  topN: ${TOP_N}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  let totalQ = 0, totalHit = 0, allTop1 = [], allTop5 = [];
  for (const [, b] of byCat) {
    totalQ += b.queries; totalHit += b.withResults;
    allTop1.push(...b.top1); allTop5.push(...b.top5avg);
  }
  const avg = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "—";
  lines.push(`- **Total queries**: ${totalQ}`);
  lines.push(`- **Queries with ≥1 result**: ${totalHit} (${totalQ ? ((totalHit / totalQ) * 100).toFixed(1) : 0}%)`);
  lines.push(`- **Avg top-1 similarity**: ${avg(allTop1)}%`);
  lines.push(`- **Avg top-${TOP_N} similarity**: ${avg(allTop5)}%`);
  lines.push(``);
  lines.push(`## Per-category breakdown`);
  lines.push(``);
  lines.push(`| Category | Kind | Queries | Hit rate | Avg top-1 | Avg top-${TOP_N} |`);
  lines.push(`|---|---|---:|---:|---:|---:|`);
  for (const cat of CATEGORIES) {
    const b = byCat.get(cat.slug);
    if (!b) { lines.push(`| ${cat.slug} | ${cat.kind} | 0 | — | — | — |`); continue; }
    const hit = b.queries ? ((b.withResults / b.queries) * 100).toFixed(0) + "%" : "—";
    lines.push(`| ${cat.slug} | ${cat.kind} | ${b.queries} | ${hit} | ${avg(b.top1)}% | ${avg(b.top5avg)}% |`);
  }
  lines.push(``);
  lines.push(`## Sample matches (top-1 per first 3 images of each category)`);
  lines.push(``);
  for (const cat of CATEGORIES) {
    lines.push(`### ${cat.slug} (${cat.kind})`);
    let n = 0;
    for (const [k, hits] of byImg.entries()) {
      if (!k.startsWith(cat.slug + "/") || hits.length === 0 || n >= 3) continue;
      n++;
      const h = hits[0];
      lines.push(`- \`${k.split("/")[1]}\` → **${h.title}** (${h.score}%)`);
    }
    if (n === 0) lines.push(`- _no results_`);
    lines.push(``);
  }

  writeFileSync(REPORT, lines.join("\n"));
  console.log(`✔ Wrote ${REPORT}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
if (args.size === 0) {
  console.log("Usage: node scripts/visualSearchProbe.mjs [--download|--index|--probe|--report|--all]");
  process.exit(1);
}

try {
  if (args.has("--all") || args.has("--download")) await downloadAll();
  if (args.has("--all") || args.has("--index"))    await indexAllListings();
  if (args.has("--all") || args.has("--probe"))    await probeAll();
  if (args.has("--all") || args.has("--report"))   makeReport();
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(2);
}
