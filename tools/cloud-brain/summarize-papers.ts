#!/usr/bin/env bun
// The text of each kept paper of a Brain's knowledge base, as a file for the role paper-summarizer, and each entry
// kept as it was entered (plan/cloud-brain-paper-summarizer-persona.md, design piece 3; R8). Puts nothing.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text --tag awesome-rsi
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text --ids arxiv:2603.06333,arxiv:2310.02304
//   … --route=pdf   the kept PDF, also for a paper arXiv has a page of
//   … --delay=MS    the wait between two fetches from arXiv (3000)
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts compare --ids a,b,c    both routes for each paper, nothing written:
//      one line a paper with the share of each text's numbers, distinct words and runs of 8 words that the other has
// `run`, `check` and `restore` of the plan are not built: they are the task ps-2-summarizer-role.
//
// text, in two passes. The entries are read with the token loop-knowledge (knowledge.search by words, which
// answers each entry with its text).
//   1. Each entry is written to <papers>/<id>.entry.json { id, title, text, tags, changed, length, sha256 }, once:
//      a file that is there is never written again (`kept: "before"`, and `differs: true` when the entry's text is no
//      longer the file's). None is written for an entry that has the tag paper-summary or the line
//      "Summary by paper-summarizer": its text as entered is gone from the entry (`kept: "summarized"`).
//   2. The paper's text is written to <papers>/<id>.txt, one paragraph a line and no line over 1500 characters, and <id>.text.json beside it
//      { id, route, address, version, chars, lines, sha256 }, every run. From arxiv.org/html/<id>; when that is 404,
//      and for an id that is not arXiv's, from the kept PDF: static.get of the entry's `file` with the token
//      loop-papers, its SHA-256 compared with the entry's `sha256` before pdftotext is given it. With no loop-papers
//      kept the paper is named (`skipped`) and the run goes on; the owner makes that token. A text under 5000
//      characters is a failed fetch: nothing is written for it.
// <papers> is tools/cloud-brain/.emitted/papers of the main checkout, also when the copy that runs is a worktree's
// (BRAIN_STATE_DIR, else the directory above git's common directory, as knowledge-docs.ts finds the state).
// One line of JSON a paper, and a last line of counts. Exit 1 when arXiv answers anything but 200 or 404 (the run
// stops there: a 429 is not asked again), or when the search answered as many entries as its limit.
// tests/tools/summarize-papers.test.ts
import { writeFileSync, mkdirSync, mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import * as cheerio from "cheerio";

const here = dirname(new URL(import.meta.url).pathname), root = join(here, "..", "..");
export const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
export const MIN = 5000, SUMMARY_LINE = "Summary by paper-summarizer", SUMMARY_TAG = "paper-summary";

// The main checkout's state, from whichever worktree `from` is in.
export const stateDir = (from = here, env: Record<string, string | undefined> = process.env) => {
  if (env.BRAIN_STATE_DIR) return env.BRAIN_STATE_DIR;
  const r = spawnSync("git", ["-C", from, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" });
  const common = r.status === 0 ? r.stdout.trim() : "";
  return common ? join(dirname(common), "tools/cloud-brain/.emitted") : "";
};

// A line no longer than WIDTH: Read cuts a longer one. Cut after a sentence's end where there is one, else at a space;
// never inside a run without a space, so a number is whole on one line.
export const WIDTH = 1500;
export const wrap = (line: string, width = WIDTH): string[] => {
  const out: string[] = [];
  while (line.length > width) {
    const head = line.slice(0, width + 1);
    let at = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! ")) + 1;
    if (at < width / 2) at = head.lastIndexOf(" ");
    if (at <= 0) { at = line.indexOf(" ", width); if (at < 0) break; }
    out.push(line.slice(0, at).trimEnd());
    line = line.slice(at).trimStart();
  }
  if (line) out.push(line);
  return out;
};

// ---- HTML: arXiv's page (LaTeXML) as text, one block a line.
const DROP = new Set(["script", "style", "noscript", "nav", "button", "svg", "img", "head", "template", "annotation", "annotation-xml", "footer", "header"]);
const BLOCK = new Set(["p", "div", "section", "article", "main", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "dl", "dt", "dd",
  "table", "thead", "tbody", "tr", "figure", "figcaption", "blockquote", "pre", "br", "hr", "cite-block"]);
// Math that is a number or a name reads as its characters ("28.2%"); math with structure reads as its TeX.
const STRUCTURED = "msub,msup,msubsup,mfrac,msqrt,mroot,munder,mover,munderover,mtable,mmultiscripts";
const DROP_CLASS = /(^|\s)(ltx_page_navbar|ltx_TOC|ltx_page_logo|ltx_page_footer|ltx_pagination|package-alerts)(\s|$)/;

export const htmlText = (html: string) => {
  const $ = cheerio.load(html);
  const start = $("article.ltx_document").first();
  const top = (start.length ? start : $("body")).get(0);
  const lines: string[] = [];
  let cur = "";
  const flush = () => { const s = cur.replace(/\s+/g, " ").trim(); if (s) lines.push(s); cur = ""; };
  const walk = (n: any) => {
    if (n.type === "text") { cur += n.data; return; }
    if (n.type !== "tag") return;
    const name = n.name.toLowerCase();
    if (DROP.has(name) || DROP_CLASS.test(n.attribs?.class || "")) return;
    if (name === "math") {
      const m = $(n), tex = (n.attribs?.alttext || "").trim();
      const plain = () => { const c = m.clone(); c.find("annotation,annotation-xml").remove(); return c.text(); };
      cur += tex && m.find(STRUCTURED).length ? tex : plain() || tex;
      return;
    }
    const block = BLOCK.has(name), cell = name === "td" || name === "th";
    if (block) flush();
    if (cell) cur += " ";
    for (const c of n.children || []) walk(c);
    if (cell) cur += " ";
    if (block) flush();
  };
  if (top) walk(top);
  flush();
  return lines.flatMap((l) => wrap(l)).join("\n") + "\n";
};

// ---- PDF: pdftotext's reading order (no -layout, which sets two columns side by side), one paragraph a line.
export const pdfParagraphs = (raw: string) =>
  raw.replace(/\r/g, "").split(/\f|\n[ \t]*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).flatMap((p) => wrap(p)).join("\n") + "\n";
export const pdfText = (file: string) => {
  const r = spawnSync("pdftotext", ["-enc", "UTF-8", file, "-"], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 120000 });
  if (r.error || r.status !== 0) throw new Error(`pdftotext: ${r.error ? r.error.message : (r.stderr || "").slice(0, 200) || "exit " + r.status}`);
  return pdfParagraphs(r.stdout);
};

export const summarized = (e: { tags?: string[]; text?: string }) => (e.tags || []).includes(SUMMARY_TAG) || (e.text || "").includes(SUMMARY_LINE);

// The entry as entered, once. "wx": a file that is there is never written over.
export const keepEntry = (dir: string, e: any): { kept: "now" | "before" | "summarized"; differs?: boolean; length?: number; sha256?: string } => {
  const file = join(dir, e.id + ".entry.json");
  if (existsSync(file)) {
    const was = JSON.parse(readFileSync(file, "utf8"));
    return { kept: "before", length: was.length, sha256: was.sha256, ...(was.text !== e.text ? { differs: true } : {}) };
  }
  if (summarized(e)) return { kept: "summarized" };
  const text = e.text || "", row = { id: e.id, title: e.title, text, tags: e.tags || [], changed: e.changed ?? null, length: text.length, sha256: sha(text) };
  writeFileSync(file, JSON.stringify(row, null, 1) + "\n", { flag: "wx" });
  return { kept: "now", length: row.length, sha256: row.sha256 };
};

// A number as the plan's rule reads one (design piece 3, step 4): a run of digits with its . , and %, as written but
// for a , between digits and a . or , at its end.
export const numbers = (text: string) => new Set((text.match(/\d[\d.,]*%?/g) || []).map((n) => n.replace(/(?<=\d),(?=\d)/g, "").replace(/[.,]+(%?)$/, "$1")));
const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const shingles = (w: string[], n = 8) => { const s = new Set<string>(); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(" ")); return s; };
const share = (a: Set<string>, b: Set<string>) => (a.size ? Math.round(([...a].filter((x) => b.has(x)).length / a.size) * 1000) / 1000 : null);
// How much of one text the other has: its numbers, its distinct words, and its runs of 8 words (which a text read in
// another order, or with two columns set side by side, does not have).
export const compareTexts = (html: string, pdf: string) => {
  const hn = numbers(html), pn = numbers(pdf), hw = words(html), pw = words(pdf), hs = shingles(hw), ps = shingles(pw);
  return { htmlChars: html.length, pdfChars: pdf.length, htmlNumbers: hn.size, pdfNumbers: pn.size, htmlNumbersInPdf: share(hn, pn), pdfNumbersInHtml: share(pn, hn),
    htmlWordsInPdf: share(new Set(hw), new Set(pw)), pdfWordsInHtml: share(new Set(pw), new Set(hw)), htmlRunsInPdf: share(hs, ps), pdfRunsInHtml: share(ps, hs) };
};

if (import.meta.main) {
  const BASE = process.env.BRAIN_BASE;
  if (!BASE) throw new Error("BRAIN_BASE");
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf("--" + name), eq = args.find((a) => a.startsWith(`--${name}=`)); return eq ? eq.slice(name.length + 3) : i >= 0 ? args[i + 1] : undefined; };
  if (cmd !== "text" && cmd !== "compare") { console.error(`summarize-papers.ts: "${cmd ?? ""}" is not built; this file has: text --tag TAG | --ids a,b [--route=pdf], compare --ids a,b`); process.exit(2); }
  const route = opt("route");
  if (route && route !== "pdf") { console.error("--route=pdf, or none"); process.exit(2); }
  const tag = opt("tag"), ids = (opt("ids") || "").split(",").filter(Boolean), delay = Number(opt("delay") ?? 3000);
  if (!tag && !ids.length) { console.error("text --tag TAG | --ids a,b"); process.exit(2); }
  const ARXIV = process.env.ARXIV_HTML || "https://arxiv.org/html/", UA = "lopecode-cloud-brain summarize-papers (github.com/tomlarkworthy/lopecode-dev)";
  const state = stateDir();
  if (!state) throw new Error("no state directory: not in a git checkout and no BRAIN_STATE_DIR");
  const papers = join(state, "papers");
  mkdirSync(papers, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "papers-"));

  // brain.ts curl: the body on stdout, the status last on stderr. A name with no token kept is answered on stdout, before any call.
  const brain = (path: string, token: string, more: string[] = []) => {
    const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain." + path, "--as", token, "-sS", "-m", "120", ...more],
      { encoding: "utf8", env: { ...process.env, BRAIN_STATE_DIR: state }, maxBuffer: 1 << 26 });
    const text = (r.stdout || "").trim(), st = /\[(\d+)\]\s*$/.exec(r.stderr || "");
    return { text, status: st ? st[1] : "", noToken: text.startsWith(`no token "${token}" is kept`), err: (r.stderr || "").slice(0, 200) };
  };
  const LIMIT = 100;
  const search = (q: string, more = "") => {
    const r = brain(`knowledge.search?kind=paper&limit=${LIMIT}${more}&q=${encodeURIComponent(q)}`, "loop-knowledge");
    if (r.noToken) { console.error(r.text); process.exit(2); }
    if (r.status !== "200") throw new Error(`knowledge.search: ${r.status} ${r.text.slice(0, 200) || r.err}`);
    return JSON.parse(r.text).entries as any[];
  };
  // By words that every paper's text has; the id is searched too, so a paper asked for by id is asked for by it.
  let entries: any[] = [];
  if (tag) {
    entries = search("the a of and we in", "&tag=" + encodeURIComponent(tag));
    if (entries.length >= LIMIT) { console.error(`the search answered ${entries.length} entries, its limit: the set may be cut`); process.exit(1); }
    if (ids.length) entries = entries.filter((e) => ids.includes(e.id));
  } else for (const id of ids) { const e = search(id).find((x) => x.id === id); if (e) entries.push(e); }
  const missing = ids.filter((id) => !entries.some((e) => e.id === id));
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const out: Record<string, any> = {};
  if (cmd === "text") for (const e of entries) out[e.id] = { id: e.id, ...keepEntry(papers, e) };

  const viaPdf = (e: any): Record<string, any> => {
    if (!e.file || !e.sha256) return { skipped: "the entry names no kept file" };
    const file = join(tmp, sha(e.id).slice(0, 16) + ".pdf");
    const r = brain(`static.get?path=${encodeURIComponent(e.file)}`, "loop-papers", ["-o", file]);
    if (r.noToken) return { route: "pdf", skipped: 'no token "loop-papers" is kept; the owner makes it' };
    if (r.status !== "200" || !existsSync(file)) return { route: "pdf", skipped: `static.get ${r.status || r.err}` };
    const got = sha(readFileSync(file));
    if (got !== e.sha256) return { route: "pdf", skipped: `the kept file's sha256 ${got.slice(0, 12)} is not the entry's ${String(e.sha256).slice(0, 12)}` };
    try { return { route: "pdf", address: "static:" + e.file, text: pdfText(file) }; } catch (x: any) { return { route: "pdf", skipped: x.message }; }
  };
  // arXiv's page: { text } on 200, { none: true } on 404, { stop } on anything else.
  let asked = 0;
  const viaHtml = async (num: string): Promise<Record<string, any>> => {
    if (asked++ && delay) await Bun.sleep(delay);
    const res = await fetch(ARXIV + num, { headers: { "user-agent": UA }, redirect: "follow" }).catch((x) => ({ status: 0, error: String(x?.message || x) } as any));
    if (res.status === 404) return { none: true };
    if (res.status !== 200) return { stop: `${ARXIV + num} answered ${res.status || res.error}` };
    const html = await res.text();
    return { route: "html", address: res.url, version: (new RegExp(`arXiv:${num.replace(/\./g, "\\.")}(v\\d+)`).exec(html) || [])[1] ?? null, text: htmlText(html) };
  };

  if (cmd === "compare") {
    // Both routes for each paper, nothing written: how much of each text the other has.
    let bad = 0;
    for (const e of entries) {
      const m = /^arxiv:(.+)$/.exec(e.id), h = m ? await viaHtml(m[1]) : { none: true }, p = viaPdf(e);
      if (h.text == null || p.text == null) { bad++; console.log(JSON.stringify({ id: e.id, skipped: h.stop || (h.none ? "no HTML at arXiv" : p.skipped) })); continue; }
      console.log(JSON.stringify({ id: e.id, version: h.version, ...compareTexts(h.text, p.text) }));
    }
    rmSync(tmp, { recursive: true, force: true });
    process.exit(bad || missing.length ? 1 : 0);
  }

  let stopped = "";
  for (const e of entries) {
    let got: Record<string, any> = {};
    const m = /^arxiv:(.+)$/.exec(e.id);
    if (m && route !== "pdf") {
      got = await viaHtml(m[1]);
      if (got.stop) { stopped = got.stop; out[e.id].skipped = stopped; console.log(JSON.stringify(out[e.id])); break; }
      if (got.none) got = viaPdf(e);
    } else got = viaPdf(e);
    const { text, ...rest } = got;
    if (text != null && text.length < MIN) Object.assign(out[e.id], rest, { skipped: `a text of ${text.length} characters, under ${MIN}: a failed fetch`, chars: text.length });
    else if (text != null) {
      const meta = { id: e.id, ...rest, chars: text.length, lines: text.split("\n").length - 1, sha256: sha(text) };
      writeFileSync(join(papers, e.id + ".txt"), text);
      writeFileSync(join(papers, e.id + ".text.json"), JSON.stringify(meta) + "\n");
      Object.assign(out[e.id], rest, { chars: meta.chars, lines: meta.lines, textSha256: meta.sha256 });
    } else Object.assign(out[e.id], rest);
    console.log(JSON.stringify(out[e.id]));
  }
  for (const e of entries) if (!("route" in out[e.id]) && !("skipped" in out[e.id]) && stopped) console.log(JSON.stringify({ ...out[e.id], skipped: "not asked: the run stopped" }));
  rmSync(tmp, { recursive: true, force: true });
  const rows = Object.values(out), n = (f: (r: any) => boolean) => rows.filter(f).length;
  console.log(JSON.stringify({ papers, entries: rows.length, keptNow: n((r) => r.kept === "now"), keptBefore: n((r) => r.kept === "before"), summarized: n((r) => r.kept === "summarized"),
    differs: n((r) => r.differs), html: n((r) => r.route === "html" && r.chars >= MIN && !r.skipped), pdf: n((r) => r.route === "pdf" && !r.skipped), skipped: rows.filter((r) => r.skipped).map((r) => r.id),
    ...(missing.length ? { missing } : {}), ...(stopped ? { stopped } : {}) }));
  process.exit(stopped || missing.length ? 1 : 0);
}
