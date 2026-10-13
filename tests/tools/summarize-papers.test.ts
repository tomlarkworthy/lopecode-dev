// summarize-papers.ts text: a paper's text as a file, and each entry kept as entered.
// Issue ps-1-paper-text, task 1 of plan/cloud-brain-paper-summarizer-persona.md (R8; design piece 3).
// run, check and restore: issue ps-2-summarizer-role, task 2. The agent is a stand-in script (SUMMARIZER_AGENT) that
// writes down how it was started and answers from a list; no case starts claude.
//
//   bun test ./tests/tools/summarize-papers.test.ts
//   SUMMARIZE_PAPERS_TS=/path/to/another/summarize-papers.ts bun test …
// The cases that run the tool make a repository of their own in a new directory (ROOT, below), with a copy of the tool at
// tools/cloud-brain/summarize-papers.ts, a fake brain.ts beside it and a server in arXiv's place: no case calls a
// Brain or arXiv. The PDF cases need pdftotext (poppler) on the PATH, as the tool does.
//
// The two fixtures, both under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), read 2026-10-11:
//   fixtures/summarize-papers/arxiv-2603.06333v1.html      https://arxiv.org/html/2603.06333 as arXiv answered it, whole.
//     "SAHOO: Safeguarded Alignment for High-Order Optimization Objectives in Recursive Self-Improvement",
//     Subramanyam Sahoo, Aman Chadha, Vinija Jain, Divya Chaudhary.
//   fixtures/summarize-papers/arxiv-2308.10144v3-page2.pdf  page 2 of https://arxiv.org/pdf/2308.10144, two columns,
//     written again as one page by `pdftocairo -pdf -f 2 -l 2` (the page cut by pdfseparate was 10 MB).
//     "ExpeL: LLM Agents Are Experiential Learners", Andrew Zhao, Daniel Huang, Quentin Xu, Matthieu Lin, Yong-Jin Liu, Gao Huang.
import { test, expect, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, realpathSync, symlinkSync, readdirSync, chmodSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";

const root = resolve(import.meta.dir, "../..");
const tool = process.env.SUMMARIZE_PAPERS_TS || join(root, "tools/cloud-brain/summarize-papers.ts");
const P = await import(tool);
const { htmlText, pdfText, pdfParagraphs, wrap, keepEntry, stateDir, numbers, compareTexts, WIDTH, HEADINGS, judge, parseSummary, assemble, lineOf, leadMax, summaryLine } = P;
const FIX = join(import.meta.dir, "fixtures/summarize-papers");
const HTML = join(FIX, "arxiv-2603.06333v1.html"), PDF = join(FIX, "arxiv-2308.10144v3-page2.pdf");
const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
// Where every rig of this file is made, and what a tool it starts has as TMPDIR: a directory of this checkout that git
// ignores, removed when the file's tests have run, and each rig at its stop. Not under the system's temporary directory:
// that one had 194,370 entries on 2026-10-13, and a bun whose script or working directory was under it took about 400 ms
// to start, where 12 to 48 ms in this checkout (issue summarize-papers-test-over-30s-in-suite; its record has the runs).
const ROOT = (() => { const base = join(root, "tools/cloud-brain/.emitted/test-tmp"); mkdirSync(base, { recursive: true }); return realpathSync(mkdtempSync(join(base, "papers-"))); })();
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));
// The copy of the tool imports cheerio: the temporary repository is given the node_modules this checkout resolves it in.
const modules = (() => { const p = Bun.resolveSync("cheerio", dirname(tool)); return p.slice(0, p.lastIndexOf("/node_modules/") + "/node_modules".length); })();

test("the arXiv HTML fixture: the paper's text, one block a line, no page furniture, numbers as written", () => {
  const text = htmlText(readFileSync(HTML, "utf8")), lines = text.split("\n");
  expect(text.length).toBe(61090);
  expect(lines[0]).toBe("SAHOO: Safeguarded Alignment for High-Order Optimization Objectives in Recursive Self-Improvement");
  expect(lines.indexOf("Abstract")).toBe(2);
  expect(lines.indexOf("1 Introduction")).toBe(4);
  expect(lines[5].startsWith("The promise of recursive self improvement—systems that autonomously improve")).toBe(true);
  // No tag, script or page furniture of arXiv's.
  expect(text).not.toMatch(/<\/?[a-z]+[ >]/);
  for (const w of ["window.", "function(", "Table of Contents", "Report issue", "HTML conversions"]) expect(text).not.toContain(w);
  // Math that is a number reads as its characters, not as TeX ("28.2\%").
  expect(text).toContain("overconfidence is substantial (48, 28.2%)");
  expect(text).toContain("improved from 0.672→0.795 (+18.3%)");
  // Past the body: the references and the appendices are kept.
  expect(lines).toContain("References");
  expect(lines.filter((l: string) => /^Appendix [A-Z] /.test(l)).length).toBeGreaterThan(0);
  expect(Math.max(...lines.map((l: string) => l.length))).toBeLessThanOrEqual(WIDTH);
});

test("the two-column PDF fixture: the left column is read whole before the right", () => {
  const text = pdfText(PDF), lines = text.split("\n");
  expect(text.length).toBe(6366);
  const at = (s: string) => { const i = text.indexOf(s); expect(i).toBeGreaterThanOrEqual(0); return i; };
  // Left column top to bottom, then right column top to bottom.
  const order = ["Introduction", "Machine learning research has long been captivated", "from their enhanced performances.",
    "Related Work", "We discuss the most relevant related works", "Preliminaries", "Complex Interactive Tasks"].map(at);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // A sentence that runs over line ends of the left column is whole: with -layout the right column's words are between.
  expect(text).toContain("since current LLMs are bounded by context window size (Tworkowski et al. 2023), these agents have no recollections of what they have seen");
  expect(text).not.toMatch(/[a-z]- [a-z]/);
  expect(Math.max(...lines.map((l: string) => l.length))).toBeLessThanOrEqual(WIDTH);
});

test("wrap: no line over the width, cut after a sentence, and never inside a number", () => {
  const s = Array.from({ length: 80 }, (_, i) => `Sentence ${i} has the value 1,234.5${i}% in it.`).join(" ");
  const out = wrap(s, 200);
  expect(out.join(" ")).toBe(s);
  for (const l of out) { expect(l.length).toBeLessThanOrEqual(200); expect(l.endsWith(".")).toBe(true); }
  expect(wrap("a ".repeat(50).trim() + " " + "9".repeat(300) + " b", 100).some((l: string) => l === "9".repeat(300))).toBe(true);
  expect(wrap("short")).toEqual(["short"]);
  expect(pdfParagraphs("one\ntwo\n\nthree\ffour\n")).toBe("one two\nthree\nfour\n");
});

test("keepEntry: written once; never for a summarized entry; a file that is there is not written again", () => {
  const dir = mkdtempSync(join(ROOT, "keep-"));
  const e = { id: "arxiv:0000.00001", title: "T", text: "as entered", tags: ["awesome-rsi"], changed: { by: "owner", method: null, at: 5 } };
  expect(keepEntry(dir, e)).toEqual({ kept: "now", length: 10, sha256: sha("as entered") });
  const file = join(dir, "arxiv:0000.00001.entry.json"), first = readFileSync(file, "utf8");
  expect(JSON.parse(first)).toEqual({ id: e.id, title: "T", text: "as entered", tags: ["awesome-rsi"], changed: e.changed, length: 10, sha256: sha("as entered") });
  // The entry has since been written to: the file is as it was, and the answer says so.
  expect(keepEntry(dir, { ...e, text: "a summary\nSummary by paper-summarizer (opus), …", tags: ["awesome-rsi", "paper-summary"] })).toEqual({ kept: "before", length: 10, sha256: sha("as entered"), differs: true });
  expect(keepEntry(dir, e)).toEqual({ kept: "before", length: 10, sha256: sha("as entered") });
  expect(readFileSync(file, "utf8")).toBe(first);
  // Summarized with no file kept: by the tag, and by the line alone. Nothing is written.
  expect(keepEntry(dir, { id: "arxiv:0000.00002", title: "U", text: "x", tags: ["paper-summary"] })).toEqual({ kept: "summarized" });
  expect(keepEntry(dir, { id: "arxiv:0000.00003", title: "V", text: "lead\nSummary by paper-summarizer (opus), 2026-10-12, of …\nAs entered before the summary:\nold", tags: [] })).toEqual({ kept: "summarized" });
  expect(readdirSync(dir)).toEqual(["arxiv:0000.00001.entry.json"]);
});

// ---- The tool as run: a repository, a fake brain.ts, a server in arXiv's place.
// brain.ts curl as the tool meets it: the body on stdout (or in the file after -o), the status last on stderr; a name
// with no token kept is answered on stdout with exit 1 before any call is sent.
const FAKE = `import { appendFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
const a = process.argv.slice(2), dir = process.env.FAKE_DIR;
appendFileSync(dir + "/calls.jsonl", JSON.stringify({ path: a[1], as: a[a.indexOf("--as") + 1], state: process.env.BRAIN_STATE_DIR ?? null }) + "\\n");
const as = a.indexOf("--as");
if (existsSync(dir + "/no-" + a[as + 1])) {
  console.log('no token "' + a[as + 1] + '" is kept; make one with: token ' + a[as + 1] + " <method…>, or for an agent's tracker calls: agent-token <role>");
  process.exit(1);
}
if (a[1].includes("knowledge.search")) {
  const u = new URL("http://x" + a[1]), tag = u.searchParams.get("tag"), q = u.searchParams.get("q");
  const all = JSON.parse(readFileSync(dir + "/entries.json", "utf8"));
  // semantic: the entry whose text begins with the question, unless the rig says another is first.
  if (u.searchParams.get("semantic")) console.log(JSON.stringify({ entries: existsSync(dir + "/semantic-other") ? [{ id: "arxiv:other" }] : all.filter((e) => e.text.startsWith(q)).slice(0, 1) }));
  else console.log(JSON.stringify({ entries: all.filter((e) => tag ? e.tags.includes(tag) : e.id === q) }));
} else if (a[1].includes("knowledge.put")) {
  // As the service: the text written over, the tags joined, changed.method what the put said.
  const body = JSON.parse(readFileSync(a[a.indexOf("--data-binary") + 1].slice(1), "utf8"));
  appendFileSync(dir + "/puts.jsonl", JSON.stringify(body) + "\\n");
  if (existsSync(dir + "/put-fails")) { console.log(JSON.stringify({ error: "InvalidRequest" })); console.error(" [400]"); process.exit(0); }
  const all = JSON.parse(readFileSync(dir + "/entries.json", "utf8")), e = all.find((x) => x.id === body.id);
  Object.assign(e, { text: body.text, tags: [...new Set([...e.tags, ...(body.tags || [])])], changed: { by: "owner", method: body.method, at: 9 } });
  (await import("node:fs")).writeFileSync(dir + "/entries.json", JSON.stringify(all));
  console.log(JSON.stringify({ entered: 0, changed: 1, ids: [body.id], vectors: 1 }));
} else if (a[1].includes("static.get")) copyFileSync(dir + "/kept.pdf", a[a.indexOf("-o") + 1]);
console.error(" [200]");
`;

// agent.sh as run starts it. It writes down each start (its arguments, READS, MODEL, DRY, the files of READS). With
// DRY=1 it prints what the real script prints (FAKE_DIR/agent-old: what the script printed before READS was built).
// Asked for the canary it answers a refusal (FAKE_DIR/canary-leaks: the file's content, read with its own rights).
// Else the next of FAKE_DIR/answers.json: { result, toolset?, mode? }.
const AGENT = `#!/usr/bin/env bun
import { appendFileSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
const a = process.argv.slice(2), dir = process.env.FAKE_DIR, reads = process.env.READS;
appendFileSync(dir + "/agent.jsonl", JSON.stringify({ args: a, reads, model: process.env.MODEL, dry: process.env.DRY ?? null, tab: process.env.TAB ?? null, files: reads && existsSync(reads) ? readdirSync(reads) : null }) + "\\n");
if (process.env.DRY === "1") {
  console.log(existsSync(dir + "/agent-old") ? ["-p", "role: x", "--tools", "Bash,Read,Grep,Glob", "--allowedTools", "Bash,Read,Grep,Glob", "--add-dir", "/checkout"].join("\\n")
    : ["-p", "role: " + a[0] + "\\nscratch: " + reads + "\\ntask: " + a[1], "--model", process.env.MODEL, "--tools", "Read", "--add-dir", reads, "--permission-mode", "default"].join("\\n"));
  process.exit(0);
}
const n = readFileSync(dir + "/agent.jsonl", "utf8").trim().split("\\n").length;
const line = (o) => console.log(JSON.stringify({ session: a[0] === "--resume" ? a[1] : "s-" + n, usd: 0.25, usage: {}, context: 1000, turns: 2, ms: 500, toolset: ["Read"], mode: "default", ...o }));
const m = /read (\\S+canary\\.txt) and answer/.exec(a[1] || "");
if (m) line(existsSync(dir + "/canary-leaks") ? { result: "It says: " + readFileSync(m[1], "utf8") } : existsSync(dir + "/canary-bash") ? { result: "I could not read it.", toolset: ["Bash", "Read"] } : { result: "I could not read it." });
else { const q = JSON.parse(readFileSync(dir + "/answers.json", "utf8")); const next = q.shift(); writeFileSync(dir + "/answers.json", JSON.stringify(q)); if (next) line(next); else process.exit(2); }
`;

const pdfSha = sha(readFileSync(PDF));
const ENTRIES = [
  { id: "arxiv:2603.06333", title: "SAHOO", text: "abstract of the first", tags: ["t", "x"], changed: { by: "owner", method: null, at: 1 }, file: "corpus/a/2603.06333.pdf", sha256: "00" },
  { id: "arxiv:2308.10144", title: "ExpeL", text: "abstract of the second", tags: ["t"], changed: { by: "owner", method: null, at: 2 }, file: "corpus/a/2308.10144.pdf", sha256: pdfSha },
  { id: "nature:s1", title: "N", text: "abstract of the third", tags: ["t"], changed: null, file: "corpus/n/s1.pdf", sha256: "not the file's" },
  { id: "arxiv:0000.00009", title: "Done", text: "a lead\nSummary by paper-summarizer (opus), 2026-10-12, of https://arxiv.org/html/0000.00009, sha256 of the text read ab.\nAs entered before the summary:\nold", tags: ["t", "paper-summary"], changed: { by: "owner", method: "paper-summarizer", at: 3 } },
  { id: "arxiv:1111.11111", title: "Other tag", text: "not asked for", tags: ["u"], changed: null },
];

const fresh = async () => {
  const dir = mkdtempSync(join(ROOT, "rig-"));
  const repo = join(dir, "repo"), fake = join(dir, "fake");
  const run = async (cwd: string, cmd: string[], env: Record<string, string | undefined> = {}) => {
    const p = Bun.spawn(cmd, { cwd, env: { ...process.env, BRAIN_BASE: "cbtest", BRAIN_STATE_DIR: undefined, FAKE_DIR: fake, TMPDIR: ROOT, ...env }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out: out.trim(), err: err.trim(), lines: out.trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return l; } }) };
  };
  const git = async (cwd: string, ...a: string[]) => { const r = await run(cwd, ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...a]); if (r.code !== 0) throw new Error(`git ${a.join(" ")}: ${r.err}`); return r.out; };
  mkdirSync(fake);
  mkdirSync(join(repo, "tools/cloud-brain"), { recursive: true });
  await git(repo, "init", "-q", "-b", "main");
  writeFileSync(join(repo, "tools/cloud-brain/brain.ts"), FAKE);
  writeFileSync(join(repo, ".gitignore"), "tools/cloud-brain/.emitted\nnode_modules\n");
  copyFileSync(tool, join(repo, "tools/cloud-brain/summarize-papers.ts"));
  await git(repo, "add", "-A");
  await git(repo, "commit", "-q", "-m", "first");
  symlinkSync(modules, join(repo, "node_modules"));
  writeFileSync(join(fake, "entries.json"), JSON.stringify(ENTRIES));
  writeFileSync(join(fake, "agent.mjs"), AGENT);
  chmodSync(join(fake, "agent.mjs"), 0o755);
  writeFileSync(join(fake, "answers.json"), "[]");
  copyFileSync(PDF, join(fake, "kept.pdf"));
  // arXiv: the HTML fixture for one id, 404 for another, and what `status` says for the rest.
  const asked: string[] = [];
  let status = 404;
  const short = new Set<string>();
  const server = Bun.serve({ port: 0, fetch(req) {
    const id = new URL(req.url).pathname.slice("/html/".length);
    asked.push(id);
    if (short.has(id)) return new Response("<html><body><article class=ltx_document><p>Rate limited, try later.</p></article></body></html>", { headers: { "content-type": "text/html" } });
    return id === "2603.06333" ? new Response(Bun.file(HTML), { headers: { "content-type": "text/html; charset=utf-8" } }) : new Response("no", { status: id === "2308.10144" ? 404 : status });
  } });
  const text = (args: string[], env: Record<string, string | undefined> = {}, at = repo, cmd = ["text", "--delay=0"]) =>
    run(join(at, "tools/cloud-brain"), ["bun", join(at, "tools/cloud-brain/summarize-papers.ts"), ...cmd, ...args], { ARXIV_HTML: `http://127.0.0.1:${server.port}/html/`, SUMMARIZER_AGENT: join(fake, "agent.mjs"), DRY: undefined, TAB: undefined, READS: undefined, MODEL: undefined, ...env });
  const jsonl = (f: string) => (existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const calls = () => (existsSync(join(fake, "calls.jsonl")) ? readFileSync(join(fake, "calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  const papers = join(repo, "tools/cloud-brain/.emitted/papers");
  return { dir, repo, fake, git, text, calls, asked, papers, stop: () => { server.stop(true); rmSync(dir, { recursive: true, force: true }); }, setStatus: (n: number) => { status = n; }, short,
    cmd: (c: string, args: string[], env: Record<string, string | undefined> = {}) => text(args, env, repo, [c, "--delay=0"]),
    answers: (list: any[]) => writeFileSync(join(fake, "answers.json"), JSON.stringify(list)),
    agents: () => jsonl(join(fake, "agent.jsonl")), started: () => jsonl(join(fake, "agent.jsonl")).filter((l: any) => l.dry !== "1"),
    puts: () => jsonl(join(fake, "puts.jsonl")), journal: () => jsonl(join(papers, "journal.jsonl")),
    entry: (id: string) => JSON.parse(readFileSync(join(fake, "entries.json"), "utf8")).find((e: any) => e.id === id) };
};

test("text --tag: each entry kept once, none for a summarized one; HTML first, the kept PDF on a 404, its hash compared", async () => {
  const t = await fresh();
  try {
    const r = await t.text(["--tag", "t"]);
    expect(r.code).toBe(0);
    const by = Object.fromEntries(r.lines.slice(0, -1).map((l: any) => [l.id, l])), last: any = r.lines.at(-1);
    expect(Object.keys(by).sort()).toEqual(["arxiv:0000.00009", "arxiv:2308.10144", "arxiv:2603.06333", "nature:s1"]);
    // The entries as entered: three files, and none for the summarized entry, which is named.
    expect(readdirSync(t.papers).filter((f) => f.endsWith(".entry.json")).sort()).toEqual(["arxiv:2308.10144.entry.json", "arxiv:2603.06333.entry.json", "nature:s1.entry.json"]);
    expect(by["arxiv:0000.00009"].kept).toBe("summarized");
    expect(last).toMatchObject({ papers: t.papers, entries: 4, keptNow: 3, keptBefore: 0, summarized: 1, differs: 0, html: 1, pdf: 1 });
    const kept = JSON.parse(readFileSync(join(t.papers, "arxiv:2603.06333.entry.json"), "utf8"));
    expect(kept).toEqual({ id: "arxiv:2603.06333", title: "SAHOO", text: "abstract of the first", tags: ["t", "x"], changed: { by: "owner", method: null, at: 1 }, length: 21, sha256: sha("abstract of the first") });
    expect(by["arxiv:2603.06333"]).toMatchObject({ kept: "now", length: 21, sha256: sha("abstract of the first") });
    // HTML: the text and what was read beside it.
    const txt = readFileSync(join(t.papers, "arxiv:2603.06333.txt"), "utf8"), meta = JSON.parse(readFileSync(join(t.papers, "arxiv:2603.06333.text.json"), "utf8"));
    expect(txt).toBe(htmlText(readFileSync(HTML, "utf8")));
    expect(meta).toMatchObject({ id: "arxiv:2603.06333", route: "html", version: "v1", chars: 61090, sha256: sha(txt) });
    expect(meta.address).toEndWith("/html/2603.06333");
    expect(by["arxiv:2603.06333"]).toMatchObject({ route: "html", chars: 61090, textSha256: sha(txt) });
    // A 404 from arXiv: the kept file, with loop-papers, when its hash is the entry's.
    expect(readFileSync(join(t.papers, "arxiv:2308.10144.txt"), "utf8")).toBe(pdfText(PDF));
    expect(by["arxiv:2308.10144"]).toMatchObject({ route: "pdf", address: "static:corpus/a/2308.10144.pdf", chars: 6366 });
    // Not arXiv's: the kept file is the only route, and a file that is not the entry's is not given to pdftotext.
    expect(by["nature:s1"].skipped).toContain("is not the entry's");
    expect(existsSync(join(t.papers, "nature:s1.txt"))).toBe(false);
    expect(last.skipped).toEqual(["arxiv:0000.00009", "nature:s1"]);
    // The summarized entry's page answered 404 and it names no file.
    expect(by["arxiv:0000.00009"].skipped).toBe("the entry names no kept file");
    // Who was called: the search with loop-knowledge, the files with loop-papers, never the owner.
    expect(t.calls().map((c: any) => c.as)).toEqual(["loop-knowledge", "loop-papers", "loop-papers"]);
    expect(t.calls()[1].path).toContain("static.get?path=" + encodeURIComponent("corpus/a/2308.10144.pdf"));

    // A second run writes no entry again, though one has changed on the Brain since.
    const changed = ENTRIES.map((e) => (e.id === "nature:s1" ? { ...e, text: "written to by something else" } : e));
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(changed));
    const before = readFileSync(join(t.papers, "nature:s1.entry.json"), "utf8");
    const r2 = await t.text(["--tag", "t"]);
    const by2 = Object.fromEntries(r2.lines.slice(0, -1).map((l: any) => [l.id, l]));
    expect(r2.lines.at(-1)).toMatchObject({ keptNow: 0, keptBefore: 3, summarized: 1, differs: 1 });
    expect(by2["nature:s1"]).toMatchObject({ kept: "before", differs: true, sha256: sha("abstract of the third") });
    expect(readFileSync(join(t.papers, "nature:s1.entry.json"), "utf8")).toBe(before);
  } finally { t.stop(); }
});

test("with no loop-papers kept: the HTML papers are read, a paper that needs the kept PDF is named, exit 0", async () => {
  const t = await fresh();
  try {
    writeFileSync(join(t.fake, "no-loop-papers"), "");
    const r = await t.text(["--tag", "t"]);
    expect(r.code).toBe(0);
    const by = Object.fromEntries(r.lines.slice(0, -1).map((l: any) => [l.id, l]));
    expect(by["arxiv:2603.06333"].route).toBe("html");
    expect(by["arxiv:2308.10144"]).toMatchObject({ kept: "now", route: "pdf", skipped: 'no token "loop-papers" is kept; the owner makes it' });
    expect(by["nature:s1"].skipped).toBe('no token "loop-papers" is kept; the owner makes it');
    expect(r.lines.at(-1)).toMatchObject({ keptNow: 3, html: 1, pdf: 0, skipped: ["arxiv:0000.00009", "arxiv:2308.10144", "nature:s1"] });
    expect(r.out + r.err).not.toContain("brain.ts token loop-papers");
  } finally { t.stop(); }
});

test("--ids: one search an id, by the id; an id the Brain has no paper for is named and the exit is 1", async () => {
  const t = await fresh();
  try {
    const r = await t.text(["--ids", "arxiv:2603.06333,arxiv:9999.99999"]);
    expect(r.code).toBe(1);
    expect(r.lines.at(-1)).toMatchObject({ entries: 1, keptNow: 1, html: 1, missing: ["arxiv:9999.99999"] });
    expect(t.calls().map((c: any) => new URL("http://x" + c.path).searchParams.get("q"))).toEqual(["arxiv:2603.06333", "arxiv:9999.99999"]);
    expect(t.asked).toEqual(["2603.06333"]);
  } finally { t.stop(); }
});

test("arXiv answers 429: the run stops there, the entries are kept all the same, exit 1", async () => {
  const t = await fresh();
  try {
    t.setStatus(429);
    const r = await t.text(["--tag", "t"]);
    expect(r.code).toBe(1);
    const last: any = r.lines.at(-1);
    expect(last.stopped).toContain("answered 429");
    expect(last.keptNow).toBe(3);
    // Sorted by id, arxiv:0000.00009 is asked first and is the 429: no other page is asked for.
    expect(t.asked).toEqual(["0000.00009"]);
    expect(readdirSync(t.papers).filter((f) => f.endsWith(".txt"))).toEqual([]);
  } finally { t.stop(); }
});

test("numbers and compareTexts: a number as the plan's rule reads it; what one text has of the other", () => {
  expect([...numbers("1,000 runs, 28.2%, 0.44. In 2025, 3 of 10 (30%).")].sort()).toEqual(["0.44", "10", "1000", "2025", "28.2%", "3", "30%"]);
  const a = "one two three four five six seven eight nine ten 12 34%", b = "nine ten one two three four five six seven eight 12 56";
  expect(compareTexts(a, a)).toMatchObject({ htmlNumbersInPdf: 1, pdfNumbersInHtml: 1, htmlWordsInPdf: 1, htmlRunsInPdf: 1, pdfRunsInHtml: 1 });
  // The same words in another order: every word found, one run of eight in five.
  expect(compareTexts(a, b)).toMatchObject({ htmlChars: a.length, pdfChars: b.length, htmlNumbers: 2, pdfNumbers: 2, htmlNumbersInPdf: 0.5, htmlWordsInPdf: 0.917, htmlRunsInPdf: 0.2 });
});

test("--route=pdf reads the kept PDF of a paper arXiv has a page of; compare reads both and writes nothing", async () => {
  const t = await fresh();
  try {
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(ENTRIES.map((e) => (e.id === "arxiv:2603.06333" ? { ...e, sha256: pdfSha } : e))));
    const c = await t.text([], {}, t.repo, ["compare", "--delay=0", "--ids", "arxiv:2603.06333"]);
    expect(c.code).toBe(0);
    expect(c.lines).toEqual([{ id: "arxiv:2603.06333", version: "v1", ...compareTexts(htmlText(readFileSync(HTML, "utf8")), pdfText(PDF)) }]);
    expect(existsSync(t.papers) ? readdirSync(t.papers) : []).toEqual([]);
    const r = await t.text(["--route=pdf", "--ids", "arxiv:2603.06333"]);
    expect(r.code).toBe(0);
    expect(r.lines[0]).toMatchObject({ id: "arxiv:2603.06333", kept: "now", route: "pdf", chars: 6366 });
    expect(t.asked).toEqual(["2603.06333"]);
    expect(JSON.parse(readFileSync(join(t.papers, "arxiv:2603.06333.text.json"), "utf8")).route).toBe("pdf");
  } finally { t.stop(); }
});

test("from a worktree: the entries and the texts are the main checkout's, and brain.ts is given its state; BRAIN_STATE_DIR is kept", async () => {
  const t = await fresh();
  try {
    const wt = join(t.dir, "wt");
    await t.git(t.repo, "worktree", "add", "-q", wt, "-b", "side");
    symlinkSync(modules, join(wt, "node_modules"));
    expect(stateDir(join(wt, "tools/cloud-brain"), {})).toBe(join(t.repo, "tools/cloud-brain/.emitted"));
    const r = await t.text(["--ids", "arxiv:2603.06333"], {}, wt);
    expect(r.code).toBe(0);
    expect((r.lines.at(-1) as any).papers).toBe(t.papers);
    expect(existsSync(join(t.papers, "arxiv:2603.06333.entry.json"))).toBe(true);
    expect(existsSync(join(t.papers, "arxiv:2603.06333.txt"))).toBe(true);
    expect(existsSync(join(wt, "tools/cloud-brain/.emitted"))).toBe(false);
    expect(t.calls().at(-1).state).toBe(join(t.repo, "tools/cloud-brain/.emitted"));
    const other = join(t.dir, "elsewhere");
    const r2 = await t.text(["--ids", "arxiv:2603.06333"], { BRAIN_STATE_DIR: other }, wt);
    expect((r2.lines.at(-1) as any).papers).toBe(join(other, "papers"));
    expect(t.calls().at(-1).state).toBe(other);
  } finally { t.stop(); }
});

// ---- Task 2: the summary's rules, then run, check and restore against the fake Brain and the stand-in agent.
const SECTIONS = (more = "") => HEADINGS.map((h: string) => `## ${h}\nWhat the text says under this. ${h === "Results" ? more : ""}`.trimEnd()).join("\n");
// Numbers of the HTML fixture: 28.2% and 0.672 are in it as written.
const GOOD = `SAHOO watches a model that improves itself for drift from its goal. Overconfidence violations were 28.2% of tasks.\n\n${SECTIONS("Quality went from 0.672 to 0.795.")}`;

test("judge, the length rule: a first paragraph of 1498 less the title passes and one more character is refused; so the sections at 5000", () => {
  const title = "T".repeat(68), max = leadMax(title);
  expect(max).toBe(1430);
  // The service embeds (title + "\n\n" + text).slice(0, 1500): at the limit the whole first paragraph is in it.
  const at = "a".repeat(max), whole = assemble({ lead: at, sections: SECTIONS(), model: "opus", day: "2026-10-11", address: "https://arxiv.org/html/1", sha256: "0".repeat(64), entered: "old" });
  expect((title + "\n\n" + whole).slice(0, 1500)).toBe(title + "\n\n" + at);
  expect(judge(`${at}\n\n${SECTIONS()}`, title, "").refused).toEqual([]);
  expect(judge(`${at}a\n\n${SECTIONS()}`, title, "").refused).toEqual([`the first paragraph is ${max + 1} characters and the limit is ${max}`]);
  // A first paragraph written over several lines is one paragraph, measured as one line.
  expect(parseSummary("one\ntwo\n\nthree\n## What is claimed\nx").lead).toBe("one two three");
  const pad = (n: number) => { const base = SECTIONS(); return base + "x".repeat(n - base.length); };
  expect(judge(`lead\n\n${pad(5000)}`, title, "").refused).toEqual([]);
  expect(judge(`lead\n\n${pad(5001)}`, title, "").refused).toEqual(["the sections are 5001 characters together and the limit is 5000"]);
});

test("judge, the form: a missing heading, the headings out of order, no first paragraph", () => {
  const without = HEADINGS.filter((h: string) => h !== "Results").map((h: string) => `## ${h}\nx`).join("\n");
  expect(judge(`lead\n\n${without}`, "T", "").refused).toEqual(['the heading "## Results" is missing']);
  const swapped = [HEADINGS[1], HEADINGS[0], ...HEADINGS.slice(2)].map((h: string) => `## ${h}\nx`).join("\n");
  expect(judge(`lead\n\n${swapped}`, "T", "").refused[0]).toStartWith("the headings are not the six in their order");
  expect(judge(SECTIONS(), "T", "").refused).toEqual(["there is no first paragraph before the first heading"]);
  expect(judge("only a paragraph", "T", "").refused.length).toBe(6);
});

test("judge, the number rule: 1,000 is 1000 both ways; a number not in the text, a worked-out one and another form of one are refused", () => {
  const sum = (lead: string) => `${lead}\n\n${SECTIONS()}`;
  const text = "We ran 1,000 episodes and 2500 steps. Accuracy was 28.2%, up from 0.44. See Table 3.";
  expect(judge(sum("It ran 1000 episodes and 2,500 steps; 28.2% against 0.44."), "T", text)).toMatchObject({ refused: [], numbers: [] });
  // A number at a sentence's end, and one before a comma, are the number without the mark.
  expect(judge(sum("Steps: 2500. Then 0.44, then Table 3."), "T", text).refused).toEqual([]);
  expect(judge(sum("It ran 1,001 episodes."), "T", text)).toMatchObject({ numbers: ["1001"], refused: ["these numbers are not in the text as you wrote them: 1001"] });
  // 28.2% is in the text and 28.2 alone is not; nor 28%, nor the difference the summary worked out.
  expect(judge(sum("Accuracy 28.2 percent, about 28%, a gain of 27.76."), "T", text).numbers).toEqual(["28.2", "28%", "27.76"]);
  // The numbers of the sections are read too.
  expect(judge(`lead\n\n${SECTIONS("It scored 99.9%.")}`, "T", text).numbers).toEqual(["99.9%"]);
});

test("assemble: first paragraph, sections, the line, what the entry held, 16000 at most with the old text cut; lineOf reads the line back", () => {
  const x = { lead: "The lead.", sections: SECTIONS(), model: "opus", day: "2026-10-11", address: "https://arxiv.org/html/2603.06333", sha256: "ab".repeat(32), entered: "the abstract as entered\nits second line" };
  const t = assemble(x);
  expect(t).toBe(`The lead.\n\n${SECTIONS()}\n\nSummary by summarizer (opus), 2026-10-11, of https://arxiv.org/html/2603.06333, sha256 of the text read ${"ab".repeat(32)}.\nAs entered before the summary:\nthe abstract as entered\nits second line`);
  expect(lineOf(t)).toEqual({ model: "opus", day: "2026-10-11", address: x.address, sha256: x.sha256 });
  expect(lineOf("no line here")).toBe(null);
  const long = assemble({ ...x, entered: "e".repeat(16000) });
  expect(long.length).toBe(16000);
  expect(long.startsWith(t.slice(0, t.indexOf("the abstract")))).toBe(true);
  expect(long.endsWith("eee")).toBe(true);
});

// A `text` run that is not exit 0 fails with what the tool printed: the code alone left two fails of the suite with no
// cause to read (seen-st6-papers-test-fails-in-suite, 2026-10-13).
const kept = async (t: any, ids = "arxiv:2603.06333") => {
  const r = await t.text(["--ids", ids]);
  if (r.code !== 0) throw new Error(`summarize-papers.ts text --ids ${ids}: exit ${r.code}\nstdout:\n${r.out}\nstderr:\n${r.err}`);
};

test("kept: a text run that is not exit 0 fails with the tool's stdout and stderr, and one that is exit 0 passes", async () => {
  const t = (code: number) => ({ text: async (a: string[]) => ({ code, out: `{"id":"${a[1]}","failed":"said on stdout"}`, err: "said on stderr" }) });
  expect(await kept(t(0))).toBe(undefined);
  const e: any = await kept(t(1), "arxiv:0000.00001").catch((x) => x);
  expect(String(e && e.message)).toBe('summarize-papers.ts text --ids arxiv:0000.00001: exit 1\nstdout:\n{"id":"arxiv:0000.00001","failed":"said on stdout"}\nstderr:\nsaid on stderr');
});

test("the rig: no directory of it, and none an agent is given, is under the system's temporary directory; stop removes it", async () => {
  const t = await fresh(), sys = realpathSync(tmpdir()) + "/";
  try {
    expect([t.dir.startsWith(sys), existsSync(t.repo)]).toEqual([false, true]);
    await kept(t);
    t.answers([{ result: GOOD }]);
    expect((await t.cmd("run", ["--ids", "arxiv:2603.06333", "--dry"])).code).toBe(0);
    // The canary's directory and the paper's are the tool's own, made where its TMPDIR says.
    expect(t.started().map((a: any) => a.reads.startsWith(sys))).toEqual([false, false]);
  } finally { t.stop(); }
  expect(existsSync(t.dir)).toBe(false);
});

test("run --dry: the canary first, one agent that reads one new directory with the paper's text alone, the summary written, nothing put", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333", "--dry"], { DRY: "1", TAB: "1", MODEL: "sonnet" });
    expect(r.code).toBe(0);
    const text = htmlText(readFileSync(HTML, "utf8")), row: any = r.lines[0], last: any = r.lines.at(-1);
    expect(row).toMatchObject({ id: "arxiv:2603.06333", outcome: "dry", route: "html", textSha256: sha(text), lead: parseSummary(GOOD).lead.length, leadMax: 1498 - "SAHOO".length, refused: [[]], usd: 0.25 });
    expect(last).toMatchObject({ dry: true, entries: 1, put: 0, dry_written: 1, refused: 0, failed: 0, usd: 0.25 });
    // Three starts of the script: its arguments asked for with DRY=1, the canary with haiku and an empty directory, the paper.
    const [pre, canary, paper] = t.agents();
    expect(t.agents().length).toBe(3);
    expect([pre.dry, canary.dry, paper.dry, canary.model, paper.model, canary.files, paper.tab]).toEqual(["1", null, null, "haiku", "opus", [], null]);
    expect(canary.args[1]).toBe(`read ${join(t.repo, "tools/cloud-brain/.emitted/canary.txt")} and answer with its content`);
    expect(readFileSync(join(t.repo, "tools/cloud-brain/.emitted/canary.txt"), "utf8")).toMatch(/^canary-[0-9a-f]{32}\n$/);
    // The paper's agent: a directory outside the repository that held the text and nothing else, and is gone.
    expect(paper.files).toEqual(["arxiv:2603.06333.txt"]);
    expect([paper.reads.startsWith(t.repo), existsSync(paper.reads), existsSync(canary.reads)]).toEqual([false, false, false]);
    expect(paper.args).toEqual(["summarizer", `read your brief, brain/roles/summarizer.md, then summarize a paper: ${paper.reads}/arxiv:2603.06333.txt, ${text.split("\n").length - 1} lines; the title is 5 characters, so the first paragraph is at most 1493 characters`]);
    // What would be put is on disk, from the entry as kept; no put was sent and the entry is as it was.
    const whole = readFileSync(join(t.papers, "arxiv:2603.06333.summary.txt"), "utf8");
    expect(whole).toBe(assemble({ ...parseSummary(GOOD), model: "opus", day: new Date().toISOString().slice(0, 10), address: lineOf(whole)!.address, sha256: sha(text), entered: "abstract of the first" }));
    expect(lineOf(whole)!.address).toEndWith("/html/2603.06333");
    expect([t.puts(), t.entry("arxiv:2603.06333").text, t.calls().map((c: any) => c.as).filter((a: string) => a !== "loop-knowledge")]).toEqual([[], "abstract of the first", []]);
    // The journal: the canary's line first, then one line for the paper.
    expect(t.journal()).toMatchObject([{ dry: true, canary: "refused", toolset: ["Read"], mode: "default" }, { dry: true, id: "arxiv:2603.06333", outcome: "dry", session: "s-3", rounds: 1, usd: 0.25, ms: 500, textSha256: sha(text), length: whole.length }]);
  } finally { t.stop(); }
});

test("the canary's stop: an answer with the line, a toolset that is not Read alone, a script without READS; each ends before a paper is read", async () => {
  for (const [file, said, starts] of [["canary-leaks", "the canary: read", 2], ["canary-bash", 'the canary: unknown (toolset ["Bash","Read"]', 2], ["agent-old", "did not print --tools Read", 1]] as const) {
    const t = await fresh();
    try {
      await kept(t);
      t.answers([{ result: GOOD }]);
      writeFileSync(join(t.fake, file), "");
      const before = t.asked.length;
      const r = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
      expect([file, r.code, t.agents().length, t.puts(), t.asked.length - before, existsSync(join(t.papers, "arxiv:2603.06333.summary.txt"))]).toEqual([file, 3, starts, [], 0, false]);
      expect((r.lines.at(-1) as any).stopped).toContain(said);
      // The agent's own answer is not printed: with the leak it holds the canary's line.
      if (file !== "agent-old") {
        expect(r.out + readFileSync(join(t.papers, "journal.jsonl"), "utf8")).not.toContain(readFileSync(join(t.repo, "tools/cloud-brain/.emitted/canary.txt"), "utf8").trim());
        expect(t.journal()[0].canary).toBe(file === "canary-leaks" ? "read" : "unknown");
      } else expect(existsSync(join(t.repo, "tools/cloud-brain/.emitted/canary.txt"))).toBe(false);
    } finally { t.stop(); }
  }
});

test("run: the summary is put with loop-papers; a second run starts no agent but the canary's and puts nothing", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r.code).toBe(0);
    const whole = readFileSync(join(t.papers, "arxiv:2603.06333.summary.txt"), "utf8");
    expect(t.puts()).toEqual([{ id: "arxiv:2603.06333", text: whole, tags: ["paper-summary"], method: "paper-summarizer" }]);
    expect(t.calls().filter((c: any) => c.path.includes("knowledge.put")).map((c: any) => c.as)).toEqual(["loop-papers"]);
    expect(r.lines[0]).toMatchObject({ outcome: "put", put: { changed: 1, vectors: 1 } });
    expect(t.journal()[1]).toMatchObject({ id: "arxiv:2603.06333", outcome: "put", put: { vectors: 1 }, session: "s-3" });
    expect(t.entry("arxiv:2603.06333")).toMatchObject({ tags: ["t", "x", "paper-summary"], changed: { method: "paper-summarizer" } });
    // Again: the entry has the line with this text's hash.
    const r2 = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r2.code).toBe(0);
    expect(r2.lines[0]).toMatchObject({ id: "arxiv:2603.06333", skipped: "summarized" });
    expect(r2.lines.at(-1)).toMatchObject({ put: 0, summarizedBefore: 1 });
    expect([t.started().length, t.started().at(-1).args[1].includes("canary.txt"), t.puts().length]).toEqual([3, true, 1]);
  } finally { t.stop(); }
});

// ps-4-the-rest: the two stops of a run over many papers. The PDF paper is first by id; PLAIN has no number.
const PLAIN = `A first paragraph with no figure.\n\n${SECTIONS()}`;
test("--usd-max: no agent for a paper once this run's agents have cost that much; under it the run goes on; not a number is exit 2", async () => {
  const t = await fresh();
  try {
    await kept(t, "arxiv:2308.10144,arxiv:2603.06333");
    t.answers([{ result: PLAIN }, { result: GOOD }]);
    const bad = await t.cmd("run", ["--ids", "arxiv:2308.10144,arxiv:2603.06333", "--usd-max", "lots"]);
    expect([bad.code, t.started().length]).toEqual([2, 0]);
    // Each agent of the stand-in costs 0.25: at a limit of 0.25 the first paper is put and the second is not started.
    const r = await t.cmd("run", ["--ids", "arxiv:2308.10144,arxiv:2603.06333", "--usd-max", "0.25"]);
    expect(r.code).toBe(1);
    expect(r.lines.slice(0, -1).map((l: any) => [l.id, l.outcome])).toEqual([["arxiv:2308.10144", "put"]]);
    expect(r.lines.at(-1)).toMatchObject({ entries: 2, put: 1, usd: 0.25 });
    expect((r.lines.at(-1) as any).stopped).toBe("--usd-max 0.25: the agents of this run have cost $0.25; arxiv:2603.06333 and the papers after it were not started");
    expect([t.started().length, t.puts().map((p: any) => p.id)]).toEqual([2, ["arxiv:2308.10144"]]);
    // The same command again counts from 0: the first is skipped at no cost and the second is put. A limit above the sum stops nothing.
    const r2 = await t.cmd("run", ["--ids", "arxiv:2308.10144,arxiv:2603.06333", "--usd-max", "0.26"]);
    expect([r2.code, (r2.lines.at(-1) as any).stopped, r2.lines.slice(0, -1).map((l: any) => l.outcome || l.skipped)]).toEqual([0, undefined, ["summarized", "put"]]);
  } finally { t.stop(); }
});

test("a put that is refused stops the run: the paper is failed in the journal and no agent is started for the next", async () => {
  const t = await fresh();
  try {
    await kept(t, "arxiv:2308.10144,arxiv:2603.06333");
    t.answers([{ result: PLAIN }, { result: GOOD }]);
    writeFileSync(join(t.fake, "put-fails"), "");
    const r = await t.cmd("run", ["--ids", "arxiv:2308.10144,arxiv:2603.06333"]);
    expect(r.code).toBe(1);
    expect(r.lines.slice(0, -1).map((l: any) => [l.id, l.outcome])).toEqual([["arxiv:2308.10144", "failed"]]);
    expect(r.lines.at(-1)).toMatchObject({ put: 0, failed: 1, stopped: "knowledge.put 400 for arxiv:2308.10144: the papers after it were not started" });
    // The canary's agent and one paper's; the second paper's answer is still in the stand-in's queue.
    expect([t.started().length, JSON.parse(readFileSync(join(t.fake, "answers.json"), "utf8")).length]).toEqual([2, 1]);
    expect(t.journal().at(-1)).toMatchObject({ id: "arxiv:2308.10144", outcome: "failed", why: "knowledge.put 400" });
  } finally { t.stop(); }
});

test("a second summary is made from the entry as kept, not from the cut copy the entry holds", async () => {
  const t = await fresh();
  try {
    const long = "the abstract as entered. " + "b".repeat(15975);
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(ENTRIES.map((e) => (e.id === "arxiv:2603.06333" ? { ...e, text: long } : e))));
    await kept(t);
    t.answers([{ result: GOOD }]);
    expect((await t.cmd("run", ["--ids", "arxiv:2603.06333"])).code).toBe(0);
    const first = t.entry("arxiv:2603.06333").text;
    expect([first.length, long.startsWith(first.slice(first.indexOf("As entered before the summary:\n") + 31))]).toEqual([16000, true]);
    // The text read is another now (a line of the entry names another hash): summarized again, with a shorter summary.
    const all = JSON.parse(readFileSync(join(t.fake, "entries.json"), "utf8"));
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(all.map((e: any) => (e.id === "arxiv:2603.06333" ? { ...e, text: e.text.replace(/sha256 of the text read [0-9a-f]{64}/, "sha256 of the text read " + "0".repeat(64)) } : e))));
    t.answers([{ result: `Short.\n\n${SECTIONS()}` }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r.lines[0]).toMatchObject({ outcome: "put" });
    const second = t.entry("arxiv:2603.06333").text, tail = second.slice(second.indexOf("As entered before the summary:\n") + 31);
    // More of the entry as entered than the first summary left, and one summary, not two.
    expect([second.length, long.startsWith(tail), tail.length > first.length - first.indexOf("As entered before the summary:\n") - 31, second.split("Summary by summarizer").length]).toEqual([16000, true, true, 2]);
  } finally { t.stop(); }
});

test("refused once: the same agent is sent the list and its second answer is put; refused twice: nothing is put, and a later run starts no agent for that text unless --again", async () => {
  const t = await fresh();
  try {
    await kept(t);
    const bad = GOOD.replace("28.2%", "29.5%"), worse = GOOD.replace("0.672", "0.6729");
    t.answers([{ result: bad }, { result: GOOD }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333", "--dry"]);
    expect(r.lines[0]).toMatchObject({ outcome: "dry", refused: [["these numbers are not in the text as you wrote them: 29.5%"], []], usd: 0.5 });
    const [first, second] = t.started().slice(1);
    expect(second.args).toEqual(["--resume", "s-3", "Your answer was refused:\n- these numbers are not in the text as you wrote them: 29.5%\nAnswer with the whole summary again in the same form, with these mended."]);
    // The resumed agent has the same directory, still there with the text.
    expect([second.reads, second.files, second.model]).toEqual([first.reads, ["arxiv:2603.06333.txt"], "opus"]);
    expect(t.journal().at(-1)).toMatchObject({ outcome: "dry", session: "s-3", rounds: 2, usd: 0.5, ms: 1000 });

    // Twice, not dry: no put, the entry as it was, the journal says what.
    t.answers([{ result: bad }, { result: worse }]);
    const r2 = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r2.code).toBe(0);
    expect(r2.lines[0]).toMatchObject({ outcome: "refused", refused: [["these numbers are not in the text as you wrote them: 29.5%"], ["these numbers are not in the text as you wrote them: 0.6729"]] });
    expect(r2.lines.at(-1)).toMatchObject({ put: 0, refused: 1 });
    expect([t.puts(), t.entry("arxiv:2603.06333").text]).toEqual([[], "abstract of the first"]);
    expect(t.journal().at(-1)).toMatchObject({ outcome: "refused", numbers: ["0.6729"], textSha256: sha(htmlText(readFileSync(HTML, "utf8"))) });
    // A later run: the dry refusal before did not count, this one does.
    const n = t.started().length;
    t.answers([{ result: GOOD }]);
    const r3 = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r3.lines[0]).toMatchObject({ skipped: "refused-before" });
    expect(r3.lines.at(-1)).toMatchObject({ put: 0, refusedBefore: 1 });
    expect(t.started().length - n).toBe(1);
    const r4 = await t.cmd("run", ["--ids", "arxiv:2603.06333", "--again"]);
    expect(r4.lines[0]).toMatchObject({ outcome: "put" });
    expect(t.puts().length).toBe(1);
  } finally { t.stop(); }
});

test("run skips and names: no .entry.json, an entry something else wrote to, a text under 5000 though an earlier .txt is there; no agent is started for them", async () => {
  const t = await fresh();
  try {
    // No text run before: nothing is kept for the paper.
    t.answers([{ result: GOOD }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r.lines[0]).toEqual({ id: "arxiv:2603.06333", skipped: "no arxiv:2603.06333.entry.json: run text first" });
    expect([r.code, t.started().length, t.puts(), existsSync(join(t.papers, "arxiv:2603.06333.entry.json"))]).toEqual([0, 1, [], false]);
    await kept(t);
    const first = readFileSync(join(t.papers, "arxiv:2603.06333.txt"), "utf8");
    // arXiv answers a short page now: the .txt of the run before is still there, and is not what run reads.
    t.short.add("2603.06333");
    const r2 = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r2.lines[0]).toMatchObject({ id: "arxiv:2603.06333", route: "html", skipped: "a text of 25 characters, under 5000: a failed fetch" });
    expect([readFileSync(join(t.papers, "arxiv:2603.06333.txt"), "utf8") === first, t.started().length, t.puts()]).toEqual([true, 2, []]);
    // text, the same page (comment 2089 of the issue: the rule had no test).
    const r3 = await t.text(["--ids", "arxiv:2603.06333"]);
    expect(r3.lines[0]).toMatchObject({ kept: "before", skipped: "a text of 25 characters, under 5000: a failed fetch", chars: 25 });
    expect((r3.lines.at(-1) as any).html).toBe(0);
    t.short.clear();
    // The entry was written to by something else since it was kept, and has no summary.
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(ENTRIES.map((e) => (e.id === "arxiv:2603.06333" ? { ...e, text: "written to by something else" } : e))));
    const r4 = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(r4.lines[0].skipped).toContain("something else has written to it");
    expect([t.started().length, t.puts(), (r4.lines.at(-1) as any).skipped]).toEqual([3, [], ["arxiv:2603.06333"]]);
  } finally { t.stop(); }
});

test("an agent of a paper whose toolset is not Read alone: its answer is not used, the run stops, exit 3", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD, toolset: ["Read", "Bash"] }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect([r.code, t.puts(), existsSync(join(t.papers, "arxiv:2603.06333.summary.txt"))]).toEqual([3, [], false]);
    expect(r.lines[0]).toMatchObject({ outcome: "failed", why: 'the agent\'s toolset is ["Read","Bash"] and its mode default' });
    t.answers([{ result: GOOD, mode: "auto" }]);
    expect((await t.cmd("run", ["--ids", "arxiv:2603.06333"])).code).toBe(3);
    expect(t.puts()).toEqual([]);
  } finally { t.stop(); }
});

test("restore: the text as entered is put back from the kept file; refused with no .entry.json or a file that is not its hash; --dry puts nothing", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD }]);
    await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    expect(t.entry("arxiv:2603.06333").text).toContain("Summary by summarizer (opus)");
    const d = await t.cmd("restore", ["--ids", "arxiv:2603.06333", "--dry"]);
    expect([d.code, d.lines[0], t.puts().length]).toEqual([0, { id: "arxiv:2603.06333", dry: true, length: 21, sha256: sha("abstract of the first"), now: t.entry("arxiv:2603.06333").text.length }, 1]);
    // One with a file, one the Brain has and no file is kept for: the first is put, the second refused, exit 1.
    const r = await t.cmd("restore", ["--ids", "arxiv:2603.06333,arxiv:2308.10144"]);
    expect(r.code).toBe(1);
    expect(r.lines[0]).toMatchObject({ id: "arxiv:2603.06333", length: 21, sha256: sha("abstract of the first"), put: { changed: 1, vectors: 1 } });
    expect(r.lines[1]).toEqual({ id: "arxiv:2308.10144", refused: "no arxiv:2308.10144.entry.json: nothing to put back from" });
    expect(r.lines.at(-1)).toEqual({ restore: 2, put: 1, same: 0, refused: ["arxiv:2308.10144"] });
    expect(t.puts().slice(1)).toEqual([{ id: "arxiv:2603.06333", text: "abstract of the first", method: "paper-summarizer:restore" }]);
    expect(t.entry("arxiv:2603.06333")).toMatchObject({ text: "abstract of the first", tags: ["t", "x", "paper-summary"], changed: { method: "paper-summarizer:restore" } });
    // Already as entered: no put. A kept file whose text was changed: refused.
    expect((await t.cmd("restore", ["--ids", "arxiv:2603.06333"])).lines[0]).toMatchObject({ same: true });
    const f = join(t.papers, "arxiv:2603.06333.entry.json");
    writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), text: "edited on disk" }));
    const bad = await t.cmd("restore", ["--ids", "arxiv:2603.06333"]);
    expect([bad.code, bad.lines[0].refused, t.puts().length]).toEqual([1, "the text of the kept file is not the hash kept beside it", 2]);
  } finally { t.stop(); }
});

test("check: a summarized entry passes; not summarized, restored, refused twice, and a search that answers another first each fail it; --except names one", async () => {
  const t = await fresh();
  try {
    await kept(t, "arxiv:2603.06333,arxiv:2308.10144");
    t.answers([{ result: GOOD }]);
    await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    const one = await t.cmd("check", ["--ids", "arxiv:2603.06333"]);
    expect([one.code, one.lines]).toEqual([0, [{ id: "arxiv:2603.06333", state: "summarized" }, { entries: 1, summarized: 1, excepted: [], failing: [] }]]);
    // The semantic search was asked the first 300 characters of the first paragraph, one answer, with loop-knowledge.
    const asked = new URL("http://x" + t.calls().at(-1).path).searchParams;
    expect([asked.get("semantic"), asked.get("limit"), asked.get("kind"), asked.get("q"), t.calls().at(-1).as]).toEqual(["true", "1", "paper", parseSummary(GOOD).lead.slice(0, 300), "loop-knowledge"]);
    // The tag: one summarized, one not (ExpeL), one not kept, and arxiv:0000.00009 with a line and no put in the journal.
    const all = await t.cmd("check", ["--tag", "t"]);
    const by = Object.fromEntries(all.lines.slice(0, -1).map((l: any) => [l.id, l]));
    expect(all.code).toBe(1);
    expect(by["arxiv:2308.10144"]).toEqual({ id: "arxiv:2308.10144", state: "not summarized", fails: ["not summarized"] });
    expect(by["arxiv:0000.00009"]).toEqual({ id: "arxiv:0000.00009", state: "summarized", fails: ["the summary's line is not in its form: model, day, address, a SHA-256", "the six headings are not there in their order", "no put of it in the journal"] });
    expect(all.lines.at(-1)).toMatchObject({ entries: 4, summarized: 1, failing: ["arxiv:0000.00009", "arxiv:2308.10144", "nature:s1"] });
    // Refused twice: the journal says so and check names it; with --except and the issue it does not fail.
    const pdf = pdfText(PDF);
    t.answers([{ result: GOOD.replace("28.2%", "77.7%") }, { result: GOOD.replace("28.2%", "77.7%") }]);
    writeFileSync(join(t.fake, "kept.pdf"), readFileSync(PDF));
    expect(pdf.length).toBeGreaterThan(5000);
    await t.cmd("run", ["--ids", "arxiv:2308.10144"]);
    const ref = await t.cmd("check", ["--ids", "arxiv:2308.10144"]);
    expect([ref.code, ref.lines[0].state, ref.lines[0].fails[0].startsWith("refused twice: these numbers are not in the text")]).toEqual([1, "refused", true]);
    const exc = await t.cmd("check", ["--ids", "arxiv:2308.10144,arxiv:2603.06333", "--except", "arxiv:2308.10144=ps-refused-1"]);
    expect([exc.code, exc.lines[0].except, exc.lines.at(-1)]).toEqual([0, "ps-refused-1", { entries: 2, summarized: 1, excepted: ["arxiv:2308.10144"], failing: [] }]);
    // The search answers another entry first.
    writeFileSync(join(t.fake, "semantic-other"), "");
    const sem = await t.cmd("check", ["--ids", "arxiv:2603.06333"]);
    expect([sem.code, sem.lines[0].fails]).toEqual([1, ["the semantic search of its first 300 characters answers arxiv:other first"]]);
    // Restored: the tag stays and the line is gone.
    await t.cmd("restore", ["--ids", "arxiv:2603.06333"]);
    const res = await t.cmd("check", ["--ids", "arxiv:2603.06333"]);
    expect([res.code, res.lines[0].state, res.lines[0].fails]).toEqual([1, "restored", ["restored: the tag is there and the line is not (changed.method paper-summarizer:restore)"]]);
  } finally { t.stop(); }
});

// ---- sd-2-one-summarizer, task 2 of plan/cloud-brain-docs-summarised-for-search.md: one role for a paper and a doc (R9).
test("sd-2: judge is by kind: a paper by the six headings, a doc by the five; with no kind it is a paper's", () => {
  const five = P.DOC_HEADINGS.map((h: string) => `## ${h}\nx`).join("\n"), six = HEADINGS.map((h: string) => `## ${h}\nx`).join("\n");
  expect(P.DOC_HEADINGS).toEqual(["What it is for", "What it says", "Measured and decided", "Not done and not known", "Names"]);
  expect([P.headingsOf("paper"), P.headingsOf("doc"), P.headingsOf()]).toEqual([HEADINGS, P.DOC_HEADINGS, HEADINGS]);
  expect([judge(`lead\n\n${six}`, "T", "").refused, judge(`lead\n\n${six}`, "T", "", "paper").refused, judge(`lead\n\n${five}`, "T", "", "doc").refused]).toEqual([[], [], []]);
  // A doc's answer under a paper's headings, and a paper's under a doc's: each names the headings its kind lacks.
  expect(judge(`lead\n\n${six}`, "T", "", "doc").refused).toEqual(P.DOC_HEADINGS.slice(0, 4).map((h: string) => `the heading "## ${h}" is missing`));
  expect(judge(`lead\n\n${five}`, "T", "", "paper").refused).toEqual(HEADINGS.slice(0, 5).map((h: string) => `the heading "## ${h}" is missing`));
  const swapped = [P.DOC_HEADINGS[1], P.DOC_HEADINGS[0], ...P.DOC_HEADINGS.slice(2)].map((h: string) => `## ${h}\nx`).join("\n");
  expect(judge(`lead\n\n${swapped}`, "T", "", "doc").refused[0]).toStartWith("the headings are not the five in their order");
});

test("sd-2: an answer with a line before its first paragraph is refused, for either kind; a first paragraph over several lines with none empty is not", () => {
  const said = "there is an empty line before the first heading: the first character of the answer is the first character of the first paragraph, which is one paragraph with no line before it and no break in it";
  const six = HEADINGS.map((h: string) => `## ${h}\nx`).join("\n"), five = P.DOC_HEADINGS.map((h: string) => `## ${h}\nx`).join("\n");
  // As haiku wrote one in the docs' dry runs: its number is refused too, as before.
  const pre = "The brief and the whole of the 494-line document are read. Summary:\n\nThe doc is about locks.";
  expect(judge(`${pre}\n\n${five}`, "T", "The doc is about locks.", "doc").refused).toEqual([said, "these numbers are not in the text as you wrote them: 494"]);
  expect(judge(`Here is the summary.\n\nThe paper is about locks.\n\n${six}`, "T", "").refused).toEqual([said]);
  expect(judge(`The paper is about locks,\nand keys.\n\n${six}`, "T", "").refused).toEqual([]);
  expect(judge(`\n\nThe paper is about locks.\n\n\n${six}`, "T", "").refused).toEqual([]);
});

test("sd-2: a summary's line is written with the role's name, summarizer, and read in either name: lineOf, summarized, hasLine, lineAt", () => {
  const x = { model: "opus", day: "2026-10-12", address: "https://arxiv.org/html/1", sha256: "ab".repeat(32) };
  const now = summaryLine(x), was = now.replace("Summary by summarizer", "Summary by paper-summarizer");
  expect([P.ROLE, P.SUMMARY_LINE, P.SUMMARY_LINE_BEFORE]).toEqual(["summarizer", "Summary by summarizer", "Summary by paper-summarizer"]);
  expect(now).toBe(`Summary by summarizer (opus), 2026-10-12, of https://arxiv.org/html/1, sha256 of the text read ${"ab".repeat(32)}.`);
  for (const l of [now, was]) {
    const text = `a lead\n\n## Names\nx\n\n${l}\nAs entered before the summary:\nold`;
    expect([lineOf(text), P.summarized({ tags: [], text }), P.hasLine(text), P.lineAt(text)]).toEqual([x, true, true, text.indexOf("Summary by")]);
  }
  expect([lineOf("Summary by another (opus), d, of a, sha256 of the text read " + "ab".repeat(32) + "."), P.summarized({ tags: [], text: "no line" }), P.lineAt("no line")]).toEqual([null, false, -1]);
});

test("sd-2: check passes an entry whose line has the older name, as the 63 put before it have", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD }]);
    await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    const all = JSON.parse(readFileSync(join(t.fake, "entries.json"), "utf8"));
    writeFileSync(join(t.fake, "entries.json"), JSON.stringify(all.map((e: any) => (e.id === "arxiv:2603.06333" ? { ...e, text: e.text.replace("Summary by summarizer (", "Summary by paper-summarizer (") } : e))));
    expect(t.entry("arxiv:2603.06333").text).toContain("\nSummary by paper-summarizer (opus), ");
    const one = await t.cmd("check", ["--ids", "arxiv:2603.06333"]);
    expect([one.code, one.lines]).toEqual([0, [{ id: "arxiv:2603.06333", state: "summarized" }, { entries: 1, summarized: 1, excepted: [], failing: [] }]]);
    // And run skips it as summarized: no agent but the canary's.
    const n = t.started().length;
    expect((await t.cmd("run", ["--ids", "arxiv:2603.06333"])).lines[0]).toMatchObject({ skipped: "summarized" });
    expect(t.started().length - n).toBe(1);
  } finally { t.stop(); }
}, 120000);

test("sd-2: run --again --dry summarizes a paper that has a summary of this text, puts nothing and leaves the summary that was put on disk; --again alone and --dry alone skip it", async () => {
  const t = await fresh();
  try {
    await kept(t);
    t.answers([{ result: GOOD }]);
    await t.cmd("run", ["--ids", "arxiv:2603.06333"]);
    const put = readFileSync(join(t.papers, "arxiv:2603.06333.summary.txt"), "utf8"), entry = t.entry("arxiv:2603.06333").text;
    for (const flags of [["--again"], ["--dry"]]) expect((await t.cmd("run", ["--ids", "arxiv:2603.06333", ...flags])).lines[0]).toMatchObject({ skipped: "summarized" });
    const n = t.started().length;
    t.answers([{ result: GOOD.replace("SAHOO watches", "Again: SAHOO watches") }]);
    const r = await t.cmd("run", ["--ids", "arxiv:2603.06333", "--again", "--dry"]);
    expect(r.code).toBe(0);
    expect(r.lines[0]).toMatchObject({ id: "arxiv:2603.06333", outcome: "dry", refused: [[]] });
    // The canary's agent and the paper's, under the one role.
    expect(t.started().slice(n).map((a: any) => a.args[0])).toEqual(["summarizer", "summarizer"]);
    expect(t.started().at(-1).args[1]).toStartWith("read your brief, brain/roles/summarizer.md, then summarize a paper: ");
    expect([t.puts().length, t.entry("arxiv:2603.06333").text === entry, readFileSync(join(t.papers, "arxiv:2603.06333.summary.txt"), "utf8") === put]).toEqual([1, true, true]);
    expect(readFileSync(join(t.papers, "arxiv:2603.06333.dry.summary.txt"), "utf8")).toStartWith("Again: SAHOO watches");
    expect(t.journal().at(-1)).toMatchObject({ dry: true, id: "arxiv:2603.06333", outcome: "dry" });
  } finally { t.stop(); }
}, 120000);

test("sd-2: summarize, the one exported function: a doc's file is copied to a new directory, the agent is started as the role with the kind in its task line, and the answer judged by the five", async () => {
  const t = await fresh();
  try {
    const file = join(t.dir, "a-doc.md"), text = "A doc of 2 lines.\nIts second line.\n";
    writeFileSync(file, text);
    const five = P.DOC_HEADINGS.map((h: string) => `## ${h}\nx`).join("\n");
    const agent = P.agentRunner({ ...process.env, FAKE_DIR: t.fake, SUMMARIZER_AGENT: join(t.fake, "agent.mjs"), DRY: "1", READS: "/elsewhere", MODEL: "opus", TAB: "1" });
    t.answers([{ result: `The doc has 2 lines.\n\n${five}` }]);
    const ok = P.summarize({ kind: "doc", file, lines: 2, title: "A doc", model: "haiku", agent });
    expect(ok).toMatchObject({ outcome: "accepted", lead: "The doc has 2 lines.", sections: five, rounds: 1, usd: 0.25, refused: [[]], leadMax: 1493, model: "haiku", stop: false });
    const a = t.started().at(-1);
    expect(a.args).toEqual(["summarizer", `read your brief, brain/roles/summarizer.md, then summarize a doc: ${a.reads}/a-doc.md, 2 lines; the title is 5 characters, so the first paragraph is at most 1493 characters`]);
    expect([a.files, a.model, a.dry, a.tab, a.reads === "/elsewhere", existsSync(a.reads)]).toEqual([["a-doc.md"], "haiku", null, null, false, false]);
    // A paper's six under kind doc: refused, sent back once, refused again.
    const six = HEADINGS.map((h: string) => `## ${h}\nx`).join("\n");
    t.answers([{ result: `lead\n\n${six}` }, { result: `lead\n\n${six}` }]);
    const no = P.summarize({ kind: "doc", file, lines: 2, title: "A doc", model: "haiku", agent });
    expect([no.outcome, no.rounds, no.refused.map((r: string[]) => r.length), no.usd]).toEqual(["refused", 2, [4, 4], 0.5]);
    // A toolset that is not Read alone: failed, and the caller's run stops.
    t.answers([{ result: "x", toolset: ["Read", "Bash"] }]);
    expect(P.summarize({ kind: "paper", file, lines: 2, title: "A doc", model: "opus", agent })).toMatchObject({ outcome: "failed", stop: true, why: 'the agent\'s toolset is ["Read","Bash"] and its mode default' });
    expect(t.started().at(-1).args[1]).toStartWith("read your brief, brain/roles/summarizer.md, then summarize a paper: ");
  } finally { t.stop(); }
});
