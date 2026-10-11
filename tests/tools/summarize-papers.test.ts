// summarize-papers.ts text: a paper's text as a file, and each entry kept as entered.
// Issue ps-1-paper-text, task 1 of plan/cloud-brain-paper-summarizer-persona.md (R8; design piece 3).
//
//   bun test ./tests/tools/summarize-papers.test.ts
//   SUMMARIZE_PAPERS_TS=/path/to/another/summarize-papers.ts bun test …
// The cases that run the tool make a repository of their own in a temporary directory, with a copy of the tool at
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
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, realpathSync, symlinkSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";

const root = resolve(import.meta.dir, "../..");
const tool = process.env.SUMMARIZE_PAPERS_TS || join(root, "tools/cloud-brain/summarize-papers.ts");
const { htmlText, pdfText, pdfParagraphs, wrap, keepEntry, stateDir, numbers, compareTexts, WIDTH } = await import(tool);
const FIX = join(import.meta.dir, "fixtures/summarize-papers");
const HTML = join(FIX, "arxiv-2603.06333v1.html"), PDF = join(FIX, "arxiv-2308.10144v3-page2.pdf");
const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
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
  const dir = mkdtempSync(join(tmpdir(), "bm-papers-keep-"));
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
  console.log(JSON.stringify({ entries: all.filter((e) => tag ? e.tags.includes(tag) : e.id === q) }));
} else if (a[1].includes("static.get")) copyFileSync(dir + "/kept.pdf", a[a.indexOf("-o") + 1]);
console.error(" [200]");
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
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-papers-")));
  const repo = join(dir, "repo"), fake = join(dir, "fake");
  const run = async (cwd: string, cmd: string[], env: Record<string, string | undefined> = {}) => {
    const p = Bun.spawn(cmd, { cwd, env: { ...process.env, BRAIN_BASE: "cbtest", BRAIN_STATE_DIR: undefined, FAKE_DIR: fake, ...env }, stdout: "pipe", stderr: "pipe" });
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
  copyFileSync(PDF, join(fake, "kept.pdf"));
  // arXiv: the HTML fixture for one id, 404 for another, and what `status` says for the rest.
  const asked: string[] = [];
  let status = 404;
  const server = Bun.serve({ port: 0, fetch(req) {
    const id = new URL(req.url).pathname.slice("/html/".length);
    asked.push(id);
    return id === "2603.06333" ? new Response(Bun.file(HTML), { headers: { "content-type": "text/html; charset=utf-8" } }) : new Response("no", { status: id === "2308.10144" ? 404 : status });
  } });
  const text = (args: string[], env: Record<string, string | undefined> = {}, at = repo, cmd = ["text", "--delay=0"]) =>
    run(join(at, "tools/cloud-brain"), ["bun", join(at, "tools/cloud-brain/summarize-papers.ts"), ...cmd, ...args], { ARXIV_HTML: `http://127.0.0.1:${server.port}/html/`, ...env });
  const calls = () => (existsSync(join(fake, "calls.jsonl")) ? readFileSync(join(fake, "calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { dir, repo, fake, git, text, calls, asked, papers: join(repo, "tools/cloud-brain/.emitted/papers"), stop: () => server.stop(true), setStatus: (n: number) => { status = n; } };
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
