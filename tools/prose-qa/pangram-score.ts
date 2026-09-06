#!/usr/bin/env bun
// Score a notebook module's markdown prose with Pangram 4 and map the result back to paragraphs.
//
//   bun tools/prose-qa/pangram-score.ts <notebook.html> --module <id>            # dry run: text + cost
//   bun tools/prose-qa/pangram-score.ts <notebook.html> --module <id> --score    # spend credits
//   bun tools/prose-qa/pangram-score.ts --from tools/prose-qa/reports/<f>.json   # replay a saved run
//
// Options
//   --min <0..1>        flag paragraphs whose best window scores at least this (default 0.7)
//   --emit-cells <f>    write Observable source for one annotation per flagged paragraph
//   --key <k>           API key (else PANGRAM_API_KEY, else tools/prose-qa/.env)
//   --report <f>        where to save the raw response (default tools/prose-qa/reports/)
//
// The API is async (POST /task, poll GET /task/{id}) and has no CORS headers, so this runs
// here, not in the page. One credit = 100 words, rounded up, $0.05 each (pricing 2026-09-06).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";

const HERE = dirname(new URL(import.meta.url).pathname);
const ROOT = join(HERE, "..", "..");
const API = "https://text.external-api.pangram.com";
const PRICE_PER_CREDIT = 0.05;
const HOLE = ""; // stands in for a `${…}` hole until offsets are known

// ---------- args ----------
const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const flag = (name: string) => argv.includes(name);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--score", "--help"].includes(argv[i - 1])));


// ---------- module source ----------
export type Para = { pid: string; cell: string | null; idx: number; text: string; cuts: number[]; start: number; end: number; words: number };

export function moduleSource(notebook: string, moduleId: string): string {
  const r = spawnSync("bun", [join(ROOT, "tools", "lope-reader.ts"), notebook, "--get-module", moduleId], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout.trim()) throw new Error(`lope-reader failed for ${moduleId}: ${r.stderr}`);
  return r.stdout;
}

// Scan a template literal body starting just after the opening backtick. Returns the text with
// each `${…}` replaced by HOLE and the index just past the closing backtick.
function scanTemplate(src: string, i: number): { text: string; end: number } {
  let out = "";
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") { const n = src[i + 1]; out += n === "`" || n === "$" || n === "\\" ? n : c + n; i += 2; continue; }
    if (c === "`") return { text: out, end: i + 1 };
    if (c === "$" && src[i + 1] === "{") { i = skipHole(src, i + 2); out += HOLE; continue; }
    out += c; i++;
  }
  throw new Error("unterminated template literal");
}
// i is just past `${`; returns index just past the matching `}`.
function skipHole(src: string, i: number): number {
  let depth = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"') { i = skipString(src, i); continue; }
    if (c === "`") { i = scanTemplate(src, i + 1).end; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  throw new Error("unterminated ${ hole");
}
function skipString(src: string, i: number): number {
  const q = src[i++];
  while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++; }
  return i + 1;
}

// Markdown → the text the browser will hold in the rendered cell (approximate, line-wise).
function stripMarkdown(md: string): string {
  md = md.replace(/(\*\*|__)([\s\S]+?)\1/g, "$2"); // bold can span lines
  return md.split("\n").map((line) => {
    let l = line;
    l = l.replace(/^\s{0,3}#{1,6}\s+/, "");          // headings
    l = l.replace(/^\s{0,3}>\s?/, "");               // blockquote
    l = l.replace(/^\s*([-*+]|\d+\.)\s+/, "");        // list markers
    l = l.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");   // images
    l = l.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");    // links
    l = l.replace(/<[^>]+>/g, "");                    // html tags
    l = l.replace(/`([^`]+)`/g, "$1");                // code spans
    l = l.replace(/(\*\*|__)(.+?)\1/g, "$2");          // bold
    l = l.replace(/(^|[^\w*])[*_]([^*_\n]+?)[*_](?=[^\w*]|$)/g, "$1$2"); // italics
    return l;
  }).join("\n");
}

export function extractParagraphs(src: string): Para[] {
  // $def("pid", name|null, [deps], fn) — one per cell; only md cells carry prose.
  const defs = [...src.matchAll(/\$def\("([^"]*)",\s*(null|"[^"]*"),\s*\[([^\]]*)\],\s*(_[\w$]+)\)/g)]
    .map((m) => ({ pid: m[1], cell: m[2] === "null" ? null : JSON.parse(m[2]), deps: m[3], fn: m[4] }))
    .filter((d) => /(^|,)\s*"md"\s*(,|$)/.test(d.deps));
  const paras: Para[] = [];
  for (const d of defs) {
    const at = src.indexOf(`const ${d.fn} = `);
    if (at === -1) continue;
    const open = src.indexOf("md`", at);
    if (open === -1) continue;
    const { text: raw } = scanTemplate(src, open + 3);
    const stripped = stripMarkdown(raw);
    let idx = 0;
    for (const chunk of stripped.split(/\n[ \t]*\n/)) {
      const cuts: number[] = [];
      let text = "";
      for (const ch of chunk) { if (ch === HOLE) cuts.push(text.length); else text += ch; }
      text = text.replace(/^\n+|\n+$/g, "");
      const words = text.split(/\s+/).filter(Boolean).length;
      if (!words) continue;
      paras.push({ pid: d.pid, cell: d.cell, idx: idx++, text, cuts, start: 0, end: 0, words });
    }
  }
  let pos = 0;
  for (const p of paras) { p.start = pos; p.end = pos + p.text.length; pos = p.end + 2; }
  return paras;
}

export const documentOf = (paras: Para[]) => paras.map((p) => p.text).join("\n\n");
export const creditsFor = (words: number) => Math.ceil(words / 100);

// ---------- Pangram ----------
function apiKey(): string {
  const k = opt("--key") || process.env.PANGRAM_API_KEY;
  if (k) return k;
  const env = join(HERE, ".env");
  if (existsSync(env)) {
    const m = readFileSync(env, "utf8").match(/^PANGRAM_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("no API key: pass --key, set PANGRAM_API_KEY, or write tools/prose-qa/.env");
}

async function score(text: string, key: string): Promise<any> {
  const headers = { "Content-Type": "application/json", "x-api-key": key };
  const post = await fetch(`${API}/task`, { method: "POST", headers, body: JSON.stringify({ text, model: "pangram-4" }) });
  const created = await post.json();
  if (!post.ok) throw new Error(`POST /task ${post.status}: ${JSON.stringify(created)}`);
  const id = created.task_id ?? created.id;
  if (!id) throw new Error(`no task id in ${JSON.stringify(created)}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const r = await fetch(`${API}/task/${id}`, { headers: { "x-api-key": key } });
    const j = await r.json();
    if (j.stage === "STAGE_SUCCESS") return j;
    if (j.stage === "STAGE_FAILED") throw new Error(`task failed: ${JSON.stringify(j)}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("timed out waiting for Pangram");
}

// ---------- mapping ----------
export type Window = { label: string; ai_assistance_score: number; confidence: string; start_index: number; end_index: number };
export type Scored = Para & { score: number; label: string; confidence: string; windows: number; best: Window | null };

export function mapWindows(paras: Para[], windows: Window[]): Scored[] {
  return paras.map((p) => {
    const hits = windows.filter((w) => w.start_index < p.end && w.end_index > p.start);
    const best = hits.reduce<Window | null>((a, w) => (!a || w.ai_assistance_score > a.ai_assistance_score ? w : a), null);
    return { ...p, score: best ? best.ai_assistance_score : 0, label: best ? best.label : "unscored", confidence: best ? best.confidence : "-", windows: hits.length, best };
  });
}

// The anchor quote must be a contiguous run of rendered text: one source line, no hole cut.
export function quoteFor(p: Para, win?: { start_index: number; end_index: number }): { prefix: string; exact: string; suffix: string } {
  // Prefer the run that overlaps the flagged window, so the note lands on the flagged words.
  const ws = win ? Math.max(0, win.start_index - p.start) : 0;
  const we = win ? Math.min(p.text.length, win.end_index - p.start) : p.text.length;
  const bounds = [0, ...p.cuts, ...[...p.text.matchAll(/\n/g)].map((m) => m.index!), p.text.length].sort((a, b) => a - b);
  let best = { s: 0, e: 0 };
  const overlap = (s: number, e: number) => Math.max(0, Math.min(e, we) - Math.max(s, ws));
  for (let i = 0; i + 1 < bounds.length; i++) {
    const [s0, e0] = [bounds[i], bounds[i + 1]];
    const better = overlap(s0, e0) > overlap(best.s, best.e) || (overlap(s0, e0) === overlap(best.s, best.e) && e0 - s0 > best.e - best.s);
    if (better) best = { s: s0, e: e0 };
  }
  let run = p.text.slice(best.s, best.e).replace(/^\n/, "");
  const runStart = best.s + (p.text[best.s] === "\n" ? 1 : 0);
  let exact = run.trim();
  if (exact.length > 100) { exact = exact.slice(0, 100).replace(/\s+\S*$/, ""); }
  const at = runStart + run.indexOf(exact);
  return { prefix: p.text.slice(Math.max(0, at - 32), at), exact, suffix: p.text.slice(at + exact.length, at + exact.length + 32) };
}

export function emitCells(flagged: Scored[], moduleId: string, date: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return flagged.map((p) => {
    const id = `prose_${p.pid.replace(/^_/, "").replace(/[^\w]/g, "_")}_${p.idx}`;
    const q = quoteFor(p, p.best || undefined);
    const rec = { ...(p.cell ? { cell: p.cell } : {}), pid: p.pid, module: moduleId, quote: q, box: { dx: 320, dy: -10, w: 260 }, source: "pangram-4", score: +p.score.toFixed(3), label: p.label, scanned: date };
    return `annotation_${id} = annotation(${JSON.stringify(rec, null, 2)})\n\n` +
      `annotation_${id}_note = md\`**Pangram 4**: ${esc(p.label)} (score ${p.score.toFixed(2)}, ${esc(p.confidence)} confidence), ${date}. ` +
      `Rewrite with specifics and evidence, then rescore.\``;
  }).join("\n\n");
}

// ---------- main ----------
if (import.meta.main) {
  if (flag("--help") || (!positional[0] && !opt("--from"))) {
    console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(0);
  }
  const min = Number(opt("--min") ?? 0.7);
  const date = new Date().toISOString().slice(0, 10);
  let paras: Para[], moduleId: string, notebook: string, response: any;

  if (opt("--from")) {
    const saved = JSON.parse(readFileSync(opt("--from")!, "utf8"));
    ({ paras, moduleId, notebook, response } = saved);
  } else {
    notebook = positional[0];
    moduleId = opt("--module")!;
    if (!moduleId) throw new Error("--module <id> is required");
    paras = extractParagraphs(moduleSource(notebook, moduleId));
    const doc = documentOf(paras);
    const words = doc.split(/\s+/).filter(Boolean).length;
    const credits = creditsFor(words);
    console.log(`${moduleId}: ${paras.length} paragraphs, ${words} words → ${credits} credits ≈ $${(credits * PRICE_PER_CREDIT).toFixed(2)}`);
    if (!flag("--score")) {
      console.log("dry run (pass --score to spend). Text that would be sent:\n");
      console.log(doc);
      process.exit(0);
    }
    response = await score(doc, apiKey());
    const out = opt("--report") || join(HERE, "reports", `${basename(notebook, ".html")}-${moduleId.split("/").pop()}-${date}.json`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ notebook, moduleId, date, credits, paras, response }, null, 2));
    console.log(`saved ${out}`);
  }

  const windows: Window[] = response.windows || [];
  const scored = mapWindows(paras, windows);
  console.log(`\nheadline: ${response.headline}  ai=${response.fraction_ai} assisted=${response.fraction_ai_assisted} human=${response.fraction_human}  windows=${windows.length}\n`);
  console.log("| score | label | conf | cell | ¶ | words | opens with |\n|---|---|---|---|---|---|---|");
  for (const p of scored.slice().sort((a, b) => b.score - a.score)) {
    console.log(`| ${p.score.toFixed(2)} | ${p.label} | ${p.confidence} | ${p.cell ?? p.pid} | ${p.idx} | ${p.words} | ${p.text.slice(0, 60).replace(/\n/g, " ").replace(/\|/g, "\\|")}… |`);
  }
  const flagged = scored.filter((p) => p.score >= min);
  console.log(`\n${flagged.length} paragraph(s) at or above ${min}`);
  if (opt("--emit-cells")) {
    const src = emitCells(flagged, moduleId, date);
    writeFileSync(opt("--emit-cells")!, src);
    console.log(`wrote ${flagged.length * 2} cells to ${opt("--emit-cells")}`);
  }
}
