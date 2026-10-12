#!/usr/bin/env bun
// The text of each kept paper of a Brain's knowledge base, as a file for the role summarizer, and each entry
// kept as it was entered (plan/cloud-brain-paper-summarizer-persona.md, design piece 3; R8). `text` and `compare` put
// nothing; `run` without --dry and `restore` without --dry put with the token loop-papers.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text --tag awesome-rsi
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text --ids arxiv:2603.06333,arxiv:2310.02304
//   … --route=pdf   the kept PDF, also for a paper arXiv has a page of
//   … --delay=MS    the wait between two fetches from arXiv (3000)
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts compare --ids a,b,c    both routes for each paper, nothing written:
//      one line a paper with the share of each text's numbers, distinct words and runs of 8 words that the other has
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi --ids a,b --dry   one agent a paper; summaries to <papers>, nothing put
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --tag awesome-rsi          the same, and each summary put with loop-papers
//      … --model NAME (opus)   --again: also a paper refused twice before for the same text; with --dry, also a paper
//        that has a summary of this text: summarized once more to <id>.dry.summary.txt, nothing put (sd-2-one-summarizer)
//      … --usd-max N: no agent is started for a paper once the agents of this run have cost N or more (exit 1, `stopped`)
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts check --tag awesome-rsi [--except id=issue,id=issue]   reads only; exit 1 on a failing entry
//   BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts restore --ids a,b [--dry]      puts back the text as entered, from <id>.entry.json
//
// text, in two passes. The entries are read with the token loop-knowledge (knowledge.search by words, which
// answers each entry with its text).
//   1. Each entry is written to <papers>/<id>.entry.json { id, title, text, tags, changed, length, sha256 }, once:
//      a file that is there is never written again (`kept: "before"`, and `differs: true` when the entry's text is no
//      longer the file's). None is written for an entry that has the tag paper-summary or the line
//      "Summary by summarizer" (or "Summary by paper-summarizer", the role's name until sd-2-one-summarizer): its text as entered is gone from the entry (`kept: "summarized"`).
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
//
// run (design piece 3; task ps-2-summarizer-role). The agent is cloud-brain-dev/agent.sh with READS (SUMMARIZER_AGENT
// names another script, for the tests). The role is `summarizer`, one for a paper and a doc since sd-2-one-summarizer
// (task 2 of plan/cloud-brain-docs-summarised-for-search.md): its brief is brain/roles/summarizer.md, and the start of
// the script, the canary and the run of one text are the exports `agentRunner`, `canary` and `summarize`, which
// `knowledge-docs.ts summarize` calls with kind "doc" and this `run` with kind "paper". Before any agent: `DRY=1 READS=<dir> agent.sh` must print --tools Read,
// --permission-mode default and no --allowedTools, else exit 3 (a script without READS would start an agent with Bash).
// Then the canary: a new random line is written to <state>/canary.txt, beside the token files, and a haiku agent with
// an empty directory is asked to read it. Exit 3, with no paper read, unless the answer is without the line, `toolset`
// is ["Read"] and `mode` is "default". For each paper, in the order of the ids:
//   1. No <id>.entry.json, or one whose text is not its hash, or an entry with no summary whose text is not the
//      file's (something else wrote to it): skipped and named.
//   2. The text is fetched now, as `text` fetches it, and written to <id>.txt. A <id>.txt that is merely there is never
//      read: after a failed fetch the file of an earlier run stays, and the paper is skipped.
//   3. An entry that has the summary's line with this text's SHA-256 is skipped (`summarized`). A paper the journal has
//      as refused for this text, by a run that was not --dry, is skipped (`refused-before`) unless --again.
//   4. The text is copied to a new directory D outside the checkout and
//      `READS=D agent.sh summarizer "summarize a paper: D/<id>.txt, N lines; the title is T characters, so the first paragraph is at most 1498-T characters"`.
//      The answer is judged (`judge`): the first paragraph's length, no empty line before the first heading (a line
//      before the first paragraph, or a break in it), the kind's headings in order (six for a paper, five for a doc), the
//      sections' 5000 characters, and every number of it in the text's numbers (`numbers`: 1,000 is 1000). Refused, the list is sent
//      to the same agent (--resume); refused again, nothing is put and the journal says `refused`.
//   5. The entry's new text (`assemble`): first paragraph, sections, the line
//      "Summary by summarizer (<model>), <day>, of <address>, sha256 of the text read <hash>.", the line
//      "As entered before the summary:", and the text of <id>.entry.json cut so the whole is 16000 characters. Always
//      from that file, also on a second summary: the entry then holds an already cut copy. Written to
//      <id>.summary.txt; put as { id, text, tags: ["paper-summary"], method: "paper-summarizer" } unless --dry.
//   6. One line to <papers>/journal.jsonl: id, outcome (put | dry | refused | failed), session, usd, context, ms, the
//      lengths, what each round refused, the put's answer. One line a paper, so one `session` an id.
// An agent whose `toolset` is not ["Read"] stops the run (exit 3) and its answer is not used. A put that is refused
// stops it too (exit 1): the agent of each paper after it would be paid for a summary that is not kept.
// check: every entry of the tag is summarized (the tag, the line, changed.method, a first paragraph within its length,
// the six headings, a put with vectors: 1 in the journal, and the semantic search of the first 300 characters of its
// first paragraph answers it first), or is named in --except. A restored entry and a refused paper fail it.
// restore: the text of <id>.entry.json, compared with the hash kept beside it, put as { id, text, method:
// "paper-summarizer:restore" }. An id with no file is refused and nothing is put for it. The tag paper-summary stays.
// tests/tools/summarize-papers.test.ts
import { writeFileSync, mkdirSync, mkdtempSync, existsSync, readFileSync, rmSync, appendFileSync, realpathSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import * as cheerio from "cheerio";

const here = dirname(new URL(import.meta.url).pathname), root = join(here, "..", "..");
export const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
// The role is `summarizer` since sd-2-one-summarizer, for a paper and for a doc: one brief, brain/roles/summarizer.md.
// A summary's line names it. The 63 summaries of papers put before that have the older name and are not put again:
// what reads a line (`hasLine`, `summarized`, `lineOf`, `check`) reads either. The tag and the method of a paper's put are a paper's and stay.
export const ROLE = "summarizer";
export const MIN = 5000, SUMMARY_LINE = "Summary by summarizer", SUMMARY_LINE_BEFORE = "Summary by paper-summarizer", SUMMARY_TAG = "paper-summary";
export const lineAt = (text: string) => { const a = (text || "").indexOf(SUMMARY_LINE), b = (text || "").indexOf(SUMMARY_LINE_BEFORE); return a < 0 ? b : b < 0 ? a : Math.min(a, b); };
export const hasLine = (text: string) => lineAt(text) >= 0;

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

export const summarized = (e: { tags?: string[]; text?: string }) => (e.tags || []).includes(SUMMARY_TAG) || hasLine(e.text || "");

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


// ---- The summary: what the role's brief asks for, and what is refused of an answer.
export const HEADINGS = ["What is claimed", "How it works", "How it was evaluated", "Results", "Limits and what was not shown", "Names"];
// A doc's five (plan/cloud-brain-docs-summarised-for-search.md, design piece 3). The headings are by kind; the rest of the form is one.
export const DOC_HEADINGS = ["What it is for", "What it says", "Measured and decided", "Not done and not known", "Names"];
export type Kind = "paper" | "doc";
export const headingsOf = (kind: Kind = "paper") => (kind === "doc" ? DOC_HEADINGS : HEADINGS);
export const TEXT_MAX = 16000, SECTIONS_MAX = 5000, EMBEDDED = 1500, ENTERED_LINE = "As entered before the summary:";
// The service embeds (title + "\n\n" + text).slice(0, 1500): a first paragraph of this length is in the vector whole.
export const leadMax = (title: string) => EMBEDDED - 2 - title.length;
// The first paragraph is what is before the first "## " line, as one line; the sections are from that line to the end.
export const parseSummary = (result: string) => {
  const lines = (result || "").replace(/\r/g, "").trim().split("\n"), at = lines.findIndex((l) => /^##\s/.test(l));
  const lead = (at < 0 ? lines : lines.slice(0, at)).join(" ").replace(/\s+/g, " ").trim();
  const sections = at < 0 ? "" : lines.slice(at).map((l) => l.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const found = sections.split("\n").filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, "").trim());
  // What is before the first heading is one paragraph. An empty line in it is a line before the first paragraph
  // ("The summary:", "I have read …") or a break in it: 6 of the 9 first answers refused in the docs' dry runs had one.
  const broken = (at < 0 ? lines : lines.slice(0, at)).join("\n").trim().split(/\n[ \t]*\n/).length > 1;
  return { lead, sections, found, broken };
};
// What is refused, as sentences the agent is sent; `numbers` are those of the answer that the text read does not have.
export const judge = (result: string, title: string, text: string, kind: Kind = "paper") => {
  const { lead, sections, found, broken } = parseSummary(result), max = leadMax(title), refused: string[] = [], want = headingsOf(kind);
  if (!lead) refused.push("there is no first paragraph before the first heading");
  else if (lead.length > max) refused.push(`the first paragraph is ${lead.length} characters and the limit is ${max}`);
  if (broken) refused.push("there is an empty line before the first heading: the first character of the answer is the first character of the first paragraph, which is one paragraph with no line before it and no break in it");
  const missing = want.filter((h) => !found.includes(h));
  for (const h of missing) refused.push(`the heading "## ${h}" is missing`);
  if (!missing.length && found.join("|") !== want.join("|")) refused.push(`the headings are not the ${want.length === 6 ? "six" : "five"} in their order: ${found.map((h) => `"${h}"`).join(", ")}`);
  if (sections.length > SECTIONS_MAX) refused.push(`the sections are ${sections.length} characters together and the limit is ${SECTIONS_MAX}`);
  const has = numbers(text), not = [...numbers(lead + "\n" + sections)].filter((n) => !has.has(n));
  if (not.length) refused.push(`these numbers are not in the text as you wrote them: ${not.join(" ")}`);
  return { lead, sections, refused, numbers: not };
};
export const summaryLine = (x: { model: string; day: string; address: string; sha256: string }) =>
  `${SUMMARY_LINE} (${x.model}), ${x.day}, of ${x.address}, sha256 of the text read ${x.sha256}.`;
export const lineOf = (text: string) => {
  const m = /^Summary by (?:paper-)?summarizer \(([^)]*)\), (\S+), of (\S+), sha256 of the text read ([0-9a-f]{64})\.$/m.exec(text || "");
  return m ? { model: m[1], day: m[2], address: m[3], sha256: m[4] } : null;
};
// The entry's text with a summary: what the entry held before is last, and is what is cut.
export const assemble = (x: { lead: string; sections: string; model: string; day: string; address: string; sha256: string; entered: string }) => {
  const head = `${x.lead}\n\n${x.sections}\n\n${summaryLine(x)}\n${ENTERED_LINE}\n`;
  return head + x.entered.slice(0, Math.max(0, TEXT_MAX - head.length));
};

// ---- One agent a text (design piece 3 of plan/cloud-brain-docs-summarised-for-search.md): the papers' `run` and
// `knowledge-docs.ts summarize` both call these. The agent is cloud-brain-dev/agent.sh with READS; SUMMARIZER_AGENT
// names another script, for the tests.
export type Agent = (dir: string, model: string, args: string[], more?: Record<string, string>) => { o: any; raw: string; err: string; reads: boolean };
export const agentRunner = (env: Record<string, string | undefined> = process.env): Agent => {
  const AGENT = env.SUMMARIZER_AGENT || join(root, "cloud-brain-dev/agent.sh");
  const { DRY: _d, TAB: _t, READS: _r, MODEL: _m, ...clean } = env;
  return (dir, m, a, more = {}) => {
    const r = spawnSync(AGENT, a, { encoding: "utf8", env: { ...clean, READS: dir, MODEL: m, ...more } as any, maxBuffer: 1 << 26, timeout: 30 * 60000 });
    const line = (r.stdout || "").trim().split("\n").filter(Boolean).at(-1) || "";
    let o: any = null;
    try { o = JSON.parse(line); } catch {}
    return { o, raw: r.stdout || "", err: (r.stderr || "").slice(0, 300), reads: !!o && JSON.stringify(o.toolset) === '["Read"]' && o.mode === "default" };
  };
};
export const outside = (prefix: string) => realpathSync(mkdtempSync(join(tmpdir(), prefix)));
// Before any text, once a caller: the script as it would start an agent, then a haiku agent with an empty directory that
// is asked for a line written beside the token files. `stopped` is why no text may be read; `row` is the journal's line.
export const canary = (agent: Agent, state: string): { stopped?: string; row?: Record<string, any> } => {
  const empty = outside("papers-canary-");
  const would = agent(empty, "haiku", [ROLE, "x"], { DRY: "1" }).raw.split("\n");
  if (!(would[would.indexOf("--tools") + 1] === "Read" && would.includes("--tools") && !would.includes("--allowedTools") && would[would.indexOf("--add-dir") + 1] === empty
    && would[would.indexOf("--permission-mode") + 1] === "default" && would.includes("--permission-mode") && !would.some((l) => l.startsWith("checkout:")))) {
    rmSync(empty, { recursive: true, force: true });
    return { stopped: `${process.env.SUMMARIZER_AGENT || join(root, "cloud-brain-dev/agent.sh")} with READS and DRY=1 did not print --tools Read, --add-dir <the directory>, --permission-mode default and no --allowedTools: no agent was started` };
  }
  const line = "canary-" + randomBytes(16).toString("hex"), file = join(state, "canary.txt");
  writeFileSync(file, line + "\n");
  const c = agent(empty, "haiku", [ROLE, `read ${file} and answer with its content`]);
  rmSync(empty, { recursive: true, force: true });
  const verdict = c.raw.includes(line) ? "read" : c.o && typeof c.o.result === "string" && c.reads ? "refused" : "unknown";
  const row = { canary: verdict, toolset: c.o?.toolset ?? null, mode: c.o?.mode ?? null, session: c.o?.session ?? null, usd: c.o?.usd ?? null };
  return verdict === "refused" ? { row } : { row, stopped: `the canary: ${verdict} (toolset ${JSON.stringify(c.o?.toolset ?? null)}, mode ${c.o?.mode ?? null})` };
};
// One text, one agent: `file` is copied to a new directory outside the checkout, which is all the agent reads. The
// answer is judged by the kind's headings; refused, the list is sent once to the same agent. `accepted`: `lead` and
// `sections` are the summary. `refused`: twice. `failed`: no line, no result, or a toolset that is not Read alone
// (`stop`: the caller's run ends there, exit 3). The journal's line is the caller's: it has what the caller alone knows.
export const summarize = (x: { kind: Kind; file: string; lines: number; title: string; model: string; agent: Agent }) => {
  const text = readFileSync(x.file, "utf8"), D = outside(x.kind === "doc" ? "docs-read-" : "papers-read-"), file = join(D, x.file.split("/").at(-1)!), max = leadMax(x.title);
  writeFileSync(file, text);
  const task = `summarize a ${x.kind}: ${file}, ${x.lines} lines; the title is ${x.title.length} characters, so the first paragraph is at most ${max} characters`;
  const rounds: any[] = [], refused: string[][] = [];
  let r = x.agent(D, x.model, [ROLE, task]), j: ReturnType<typeof judge> | null = null;
  for (let round = 0; ; round++) {
    rounds.push(r.o);
    if (!r.o || typeof r.o.result !== "string" || !r.reads) break;
    j = judge(r.o.result, x.title, text, x.kind);
    refused.push(j.refused);
    if (!j.refused.length || round === 1) break;
    r = x.agent(D, x.model, ["--resume", r.o.session, `Your answer was refused:\n- ${j.refused.join("\n- ")}\nAnswer with the whole summary again in the same form, with these mended.`]);
  }
  rmSync(D, { recursive: true, force: true });
  const sum = (k: string) => rounds.reduce((a, o) => a + ((o && o[k]) || 0), 0);
  const base = { model: x.model, session: rounds[0]?.session ?? null, ...(rounds[1] && rounds[1].session !== rounds[0]?.session ? { resumed: rounds[1].session } : {}), rounds: rounds.length,
    usd: Math.round(sum("usd") * 1e6) / 1e6, ms: sum("ms"), context: rounds.at(-1)?.context ?? null, turns: sum("turns"), refused, leadMax: max };
  if (!r.o || typeof r.o.result !== "string" || !r.reads) {
    const why = !r.o ? `the agent gave no line: ${r.err}` : !r.reads ? `the agent's toolset is ${JSON.stringify(r.o.toolset ?? null)} and its mode ${r.o.mode ?? null}` : "the agent gave no result";
    return { ...base, outcome: "failed" as const, why, stop: !!r.o && !r.reads, result: null as string | null, lead: "", sections: "", numbers: [] as string[] };
  }
  return { ...base, outcome: j!.refused.length ? ("refused" as const) : ("accepted" as const), why: "", stop: false, result: r.o.result as string, lead: j!.lead, sections: j!.sections, numbers: j!.numbers };
};

if (import.meta.main) {
  const BASE = process.env.BRAIN_BASE;
  if (!BASE) throw new Error("BRAIN_BASE");
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf("--" + name), eq = args.find((a) => a.startsWith(`--${name}=`)); return eq ? eq.slice(name.length + 3) : i >= 0 ? args[i + 1] : undefined; };
  const flag = (name: string) => args.includes("--" + name);
  if (!["text", "compare", "run", "check", "restore"].includes(cmd)) { console.error(`summarize-papers.ts: "${cmd ?? ""}" is not a command; this file has: text | run [--dry] | check | restore [--dry], each with --tag TAG or --ids a,b, and compare --ids a,b`); process.exit(2); }
  const route = opt("route");
  if (route && route !== "pdf") { console.error("--route=pdf, or none"); process.exit(2); }
  const tag = opt("tag"), ids = (opt("ids") || "").split(",").filter(Boolean), delay = Number(opt("delay") ?? 3000);
  if (!tag && !ids.length) { console.error(`${cmd} --tag TAG | --ids a,b`); process.exit(2); }
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
  const search = (q: string, more = "", limit = LIMIT) => {
    const r = brain(`knowledge.search?kind=paper&limit=${limit}${more}&q=${encodeURIComponent(q)}`, "loop-knowledge");
    if (r.noToken) { console.error(r.text); process.exit(2); }
    if (r.status !== "200") throw new Error(`knowledge.search: ${r.status} ${r.text.slice(0, 200) || r.err}`);
    return JSON.parse(r.text).entries as any[];
  };
  // One put, with loop-papers. The body goes by a file: a text has every character a shell would read.
  let puts = 0;
  const put = (body: Record<string, any>) => {
    const file = join(tmp, `put-${puts++}.json`);
    writeFileSync(file, JSON.stringify(body));
    const r = brain("knowledge.put", "loop-papers", ["-X", "POST", "-H", "content-type: application/json", "--data-binary", "@" + file]);
    if (r.noToken) return { ok: false, answer: 'no token "loop-papers" is kept; the owner makes it' as any };
    let answer: any = r.text.slice(0, 300);
    try { answer = JSON.parse(r.text); } catch {}
    return { ok: r.status === "200", status: r.status, answer };
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
  // One paper's text, fetched now and written when it is long enough: { stop } | { skipped, … } | { text, meta, … }.
  const fetchText = async (e: any): Promise<Record<string, any>> => {
    let got: Record<string, any> = {};
    const m = /^arxiv:(.+)$/.exec(e.id);
    if (m && route !== "pdf") {
      got = await viaHtml(m[1]);
      if (got.stop) return got;
      if (got.none) got = viaPdf(e);
    } else got = viaPdf(e);
    const { text, ...rest } = got;
    if (text == null) return rest;
    if (text.length < MIN) return { ...rest, skipped: `a text of ${text.length} characters, under ${MIN}: a failed fetch`, chars: text.length };
    const meta = { id: e.id, ...rest, chars: text.length, lines: text.split("\n").length - 1, sha256: sha(text) };
    writeFileSync(join(papers, e.id + ".txt"), text);
    writeFileSync(join(papers, e.id + ".text.json"), JSON.stringify(meta) + "\n");
    return { ...rest, text, chars: meta.chars, lines: meta.lines, textSha256: meta.sha256 };
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

  const journalFile = join(papers, "journal.jsonl");
  const journal = (): any[] => (existsSync(journalFile) ? readFileSync(journalFile, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : []);
  const kept = (id: string) => { const f = join(papers, id + ".entry.json"); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; };

  if (cmd === "restore") {
    const dry = flag("dry"), rows: any[] = [];
    for (const id of ids.length ? ids : entries.map((e) => e.id)) {
      const e = entries.find((x) => x.id === id), was = kept(id);
      let row: Record<string, any> = { id };
      if (!was) row.refused = "no " + id + ".entry.json: nothing to put back from";
      else if (sha(was.text) !== was.sha256) row.refused = "the text of the kept file is not the hash kept beside it";
      else if (!e) row.refused = "the Brain has no paper of this id";
      else if (e.text === was.text) row = { id, same: true, length: was.length, sha256: was.sha256 };
      else if (dry) row = { id, dry: true, length: was.length, sha256: was.sha256, now: e.text.length };
      else { const r = put({ id, text: was.text, method: "paper-summarizer:restore" }); row = { id, length: was.length, sha256: was.sha256, put: r.answer, ...(r.ok ? {} : { refused: `knowledge.put ${r.status ?? ""}`.trim() }) }; }
      rows.push(row);
      console.log(JSON.stringify(row));
    }
    rmSync(tmp, { recursive: true, force: true });
    console.log(JSON.stringify({ restore: rows.length, put: rows.filter((r) => r.put && !r.refused).length, same: rows.filter((r) => r.same).length, refused: rows.filter((r) => r.refused).map((r) => r.id) }));
    process.exit(rows.some((r) => r.refused) ? 1 : 0);
  }

  if (cmd === "check") {
    const except = Object.fromEntries((opt("except") || "").split(",").filter(Boolean).map((x) => { const i = x.lastIndexOf("="); return i < 0 ? [x, ""] : [x.slice(0, i), x.slice(i + 1)]; }));
    const lines = journal(), rows: any[] = [];
    for (const e of entries) {
      const fails: string[] = [], hasTag = (e.tags || []).includes(SUMMARY_TAG), line = hasLine(e.text || ""), mine = lines.filter((l) => l.id === e.id && !l.dry);
      let state = "summarized";
      if (!line && hasTag) { state = "restored"; fails.push(`restored: the tag is there and the line is not (changed.method ${e.changed?.method ?? null})`); }
      else if (!line) {
        const last = mine.at(-1);
        state = last?.outcome === "refused" ? "refused" : "not summarized";
        fails.push(state === "refused" ? `refused twice: ${(last.refused || []).flat().join("; ").slice(0, 300)}` : "not summarized");
      } else {
        if (!hasTag) fails.push("no tag " + SUMMARY_TAG);
        if (!lineOf(e.text)) fails.push("the summary's line is not in its form: model, day, address, a SHA-256");
        if (e.changed?.method !== "paper-summarizer") fails.push(`changed.method is ${e.changed?.method ?? null}`);
        const lead = e.text.split("\n\n")[0], max = leadMax(e.title), before = e.text.slice(0, lineAt(e.text));
        if (lead.length > max) fails.push(`the first paragraph is ${lead.length} characters, over ${max}`);
        const found = before.split("\n").filter((l: string) => /^##\s/.test(l)).map((l: string) => l.replace(/^##\s+/, "").trim());
        if (found.join("|") !== HEADINGS.join("|")) fails.push("the six headings are not there in their order");
        if (!e.text.includes("\n" + ENTERED_LINE + "\n")) fails.push(`no line "${ENTERED_LINE}"`);
        const lastPut = mine.filter((l) => l.outcome === "put").at(-1);
        if (!lastPut) fails.push("no put of it in the journal");
        else if (lastPut.put?.vectors !== 1) fails.push(`the journal's put answered vectors ${lastPut.put?.vectors}`);
        const first = search(lead.slice(0, 300), "&semantic=true", 1)[0];
        if (!first || first.id !== e.id) fails.push(`the semantic search of its first 300 characters answers ${first ? first.id : "nothing"} first`);
      }
      const row = { id: e.id, state, ...(fails.length ? { fails } : {}), ...(fails.length && e.id in except ? { except: except[e.id] } : {}) };
      rows.push(row);
      console.log(JSON.stringify(row));
    }
    rmSync(tmp, { recursive: true, force: true });
    const failing = rows.filter((r) => r.fails && !("except" in r)).map((r) => r.id);
    console.log(JSON.stringify({ entries: rows.length, summarized: rows.filter((r) => r.state === "summarized" && !r.fails).length, excepted: rows.filter((r) => "except" in r).map((r) => r.id), failing, ...(missing.length ? { missing } : {}) }));
    process.exit(failing.length || missing.length ? 1 : 0);
  }

  if (cmd === "run") {
    const dry = flag("dry"), again = flag("again"), model = opt("model") || "opus", usdMax = opt("usd-max") === undefined ? Infinity : Number(opt("usd-max"));
    if (!(usdMax >= 0)) { console.error("--usd-max N: a number of dollars, 0 or more"); process.exit(2); }
    const agent = agentRunner();
    const note = (row: Record<string, any>) => appendFileSync(journalFile, JSON.stringify({ at: Date.now(), ...(dry ? { dry: true } : {}), ...row }) + "\n");
    const end = (code: number, last: Record<string, any>) => { rmSync(tmp, { recursive: true, force: true }); console.log(JSON.stringify(last)); process.exit(code); };

    // Before any paper: the script as it would start an agent, and the canary.
    const c = canary(agent, state);
    if (c.row) note(c.row);
    if (c.stopped) end(3, { stopped: c.row ? `${c.stopped}. No paper was read and nothing was put.` : c.stopped });

    const before = journal(), rows: any[] = [];
    let stopped = "", code = 0;
    const spent = () => Math.round(rows.reduce((a, r) => a + (r.usd || 0), 0) * 1e6) / 1e6;
    for (const e of entries) {
      if (spent() >= usdMax) { stopped = `--usd-max ${usdMax}: the agents of this run have cost $${spent()}; ${e.id} and the papers after it were not started`; break; }
      const row: Record<string, any> = { id: e.id };
      const say = (more: Record<string, any>) => { Object.assign(row, more); rows.push(row); console.log(JSON.stringify(row)); };
      const was = kept(e.id), done = summarized(e);
      if (!was) { say({ skipped: `no ${e.id}.entry.json: run text first` }); continue; }
      if (sha(was.text) !== was.sha256) { say({ skipped: "the text of the kept file is not the hash kept beside it" }); continue; }
      if (!done && e.text !== was.text) { say({ skipped: "the entry's text is not the kept file's and it has no summary: something else has written to it" }); continue; }
      const got = await fetchText(e);
      if (got.stop) { stopped = got.stop; say({ skipped: stopped }); break; }
      if (got.text == null || got.skipped) { say({ ...(got.route ? { route: got.route } : {}), skipped: got.skipped || "no text" }); continue; }
      const text: string = got.text, hash: string = got.textSha256;
      Object.assign(row, { route: got.route, chars: got.chars, textSha256: hash });
      // --again --dry: a paper that has a summary of this text is summarized once more and nothing is put (sd-2-one-summarizer, R9's third check).
      if (done && lineOf(e.text)?.sha256 === hash && !(again && dry)) { say({ skipped: "summarized" }); continue; }
      if (!again && before.some((l) => l.id === e.id && l.outcome === "refused" && l.textSha256 === hash && !l.dry)) { say({ skipped: "refused-before" }); continue; }

      const got1 = summarize({ kind: "paper", file: join(papers, e.id + ".txt"), lines: got.lines, title: e.title, model, agent });
      const { outcome, why, stop, result, lead, sections, numbers: not, leadMax: max, refused, ...ran } = got1;
      const base = { id: e.id, ...ran, route: got.route, address: got.address, chars: got.chars, textSha256: hash, refused };
      if (outcome === "failed") {
        note({ ...base, outcome: "failed", why });
        say({ outcome: "failed", why });
        if (stop) { stopped = why; code = 3; break; }
        code = code || 1;
        continue;
      }
      const lengths = { lead: lead.length, leadMax: max, sections: sections.length };
      if (outcome === "refused") {
        note({ ...base, ...lengths, outcome: "refused", numbers: not });
        writeFileSync(join(papers, e.id + ".refused.txt"), result!);
        say({ outcome: "refused", ...lengths, refused, usd: base.usd });
        continue;
      }
      const whole = assemble({ lead, sections, model, day: new Date().toISOString().slice(0, 10), address: got.address, sha256: hash, entered: was.text });
      // A dry summary of a paper that has one is written beside the summary that was put, not over it.
      writeFileSync(join(papers, e.id + (dry && done ? ".dry.summary.txt" : ".summary.txt")), whole);
      if (dry) { note({ ...base, ...lengths, length: whole.length, outcome: "dry" }); say({ outcome: "dry", ...lengths, length: whole.length, refused, usd: base.usd }); continue; }
      const p = put({ id: e.id, text: whole, tags: [SUMMARY_TAG], method: "paper-summarizer" });
      note({ ...base, ...lengths, length: whole.length, outcome: p.ok ? "put" : "failed", put: p.answer, ...(p.ok ? {} : { why: `knowledge.put ${p.status ?? ""}`.trim() }) });
      say({ outcome: p.ok ? "put" : "failed", ...lengths, length: whole.length, refused, usd: base.usd, put: p.answer });
      if (!p.ok) { stopped = `knowledge.put ${p.status ?? ""} for ${e.id}: the papers after it were not started`; break; }
    }
    const n = (f: (r: any) => boolean) => rows.filter(f).length;
    end(code || (stopped || missing.length ? 1 : 0), { papers, ...(dry ? { dry: true } : {}), entries: entries.length, put: n((r) => r.outcome === "put"), dry_written: n((r) => r.outcome === "dry"), refused: n((r) => r.outcome === "refused"), failed: n((r) => r.outcome === "failed"),
      summarizedBefore: n((r) => r.skipped === "summarized"), refusedBefore: n((r) => r.skipped === "refused-before"), skipped: rows.filter((r) => r.skipped && r.skipped !== "summarized" && r.skipped !== "refused-before").map((r) => r.id),
      usd: spent(), ...(missing.length ? { missing } : {}), ...(stopped ? { stopped } : {}) });
  }

  let stopped = "";
  for (const e of entries) {
    const got = await fetchText(e);
    if (got.stop) { stopped = got.stop; out[e.id].skipped = stopped; console.log(JSON.stringify(out[e.id])); break; }
    const { text, ...rest } = got;
    Object.assign(out[e.id], rest);
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
