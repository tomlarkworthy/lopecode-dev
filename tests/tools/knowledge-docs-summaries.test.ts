// knowledge-docs.ts and a long doc's summary: the entry's text with one, a kept summary carried over a put, when one is
// due, put --plain, summarize, status --check-summaries.
// Issue sd-2-one-summarizer, task 2 of plan/cloud-brain-docs-summarised-for-search.md (design pieces 2 and 3; R2, R3, R6, R8, R9).
//
//   bun test --timeout=30000 ./tests/tools/knowledge-docs-summaries.test.ts
//   KNOWLEDGE_DOCS_TS=/another/knowledge-docs.ts SUMMARIZE_PAPERS_TS=/another/summarize-papers.ts bun test …
// Every case makes a repository of its own in a temporary directory, with a copy of both tools, a fake brain.ts that
// keeps what it is put, and a stand-in for agent.sh (SUMMARIZER_AGENT) that answers from a list: no case calls a Brain
// or starts claude.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, realpathSync, symlinkSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";

const root = resolve(import.meta.dir, "../..");
const tool = process.env.KNOWLEDGE_DOCS_TS || join(root, "tools/cloud-brain/knowledge-docs.ts");
const papersTool = process.env.SUMMARIZE_PAPERS_TS || join(root, "tools/cloud-brain/summarize-papers.ts");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const modules = (() => { const p = Bun.resolveSync("cheerio", dirname(join(root, "tools/cloud-brain/summarize-papers.ts"))); return p.slice(0, p.lastIndexOf("/node_modules/") + "/node_modules".length); })();

// brain.ts curl as the tool meets it. knowledge.put is kept as the service keeps it: a field left out keeps its value,
// staleSince 0 clears it. FAKE_DIR/put-fails: knowledge.put answers 400.
const FAKE = `import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const a = process.argv.slice(2), dir = process.env.FAKE_DIR;
const at = a.find((x) => x.startsWith("@")), isStatic = a[1].includes(".static.");
const q = new URL("http://brain" + a[1]).searchParams;
const body = at && !isStatic ? JSON.parse(readFileSync(at.slice(1), "utf8")) : null;
const sent = at && isStatic ? { path: q.get("path"), public: q.get("public"), sha256: createHash("sha256").update(readFileSync(at.slice(1))).digest("hex") } : null;
appendFileSync(dir + "/calls.jsonl", JSON.stringify({ path: a[1], as: a[a.indexOf("--as") + 1], body, sent }) + "\\n");
const load = (f) => (existsSync(dir + "/" + f) ? JSON.parse(readFileSync(dir + "/" + f, "utf8")) : []);
if (a[1].includes("static.list")) console.log(JSON.stringify({ files: load("files.json") }));
else if (a[1].includes("static.put")) {
  const f = { path: sent.path, sha256: sent.sha256, public: sent.public === "true" };
  writeFileSync(dir + "/files.json", JSON.stringify([...load("files.json").filter((x) => x.path !== f.path), f]));
  console.log(JSON.stringify(f));
} else if (a[1].includes("knowledge.list")) console.log(JSON.stringify({ entries: load("entries.json") }));
else {
  if (existsSync(dir + "/put-fails")) { console.log(JSON.stringify({ error: "InvalidRequest", message: "refused by the rig" })); console.error(" [400]"); process.exit(0); }
  const all = load("entries.json");
  for (const e of body.entries) {
    const k = all.find((x) => x.id === e.id);
    const row = { ...(k || {}), ...e, staleSince: e.staleSince === undefined ? (k && k.staleSince) || null : e.staleSince || null };
    if (k) Object.assign(k, row); else all.push(row);
  }
  writeFileSync(dir + "/entries.json", JSON.stringify(all));
  console.log(JSON.stringify({ entered: 0, changed: body.entries.length, vectors: body.entries.length }));
}
console.error(" [200]");
`;

// agent.sh as the tools start it: each start is written down with the files of READS and the first line of the first.
// Asked for the canary it refuses (FAKE_DIR/canary-leaks: it answers the line). Else, after FAKE_DIR/on-agent.sh when
// there is one, the next of FAKE_DIR/answers.json.
const AGENT = `#!/usr/bin/env bun
import { appendFileSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const a = process.argv.slice(2), dir = process.env.FAKE_DIR, reads = process.env.READS;
const files = reads && existsSync(reads) ? readdirSync(reads) : [];
appendFileSync(dir + "/agent.jsonl", JSON.stringify({ args: a, reads, model: process.env.MODEL, dry: process.env.DRY ?? null, files, first: files.length ? readFileSync(reads + "/" + files[0], "utf8").split("\\n")[0] : null }) + "\\n");
if (process.env.DRY === "1") { console.log(["-p", "role: " + a[0] + "\\nscratch: " + reads + "\\ntask: " + a[1], "--model", process.env.MODEL, "--tools", "Read", "--add-dir", reads, "--permission-mode", "default"].join("\\n")); process.exit(0); }
const n = readFileSync(dir + "/agent.jsonl", "utf8").trim().split("\\n").length;
const line = (o) => console.log(JSON.stringify({ session: a[0] === "--resume" ? a[1] : "s-" + n, usd: 0.25, usage: {}, context: 1000, turns: 2, ms: 500, toolset: ["Read"], mode: "default", ...o }));
const m = /read (\\S+canary\\.txt) and answer/.exec(a[1] || "");
if (m) line(existsSync(dir + "/canary-leaks") ? { result: "It says: " + readFileSync(m[1], "utf8") } : { result: "I could not read it." });
else {
  if (existsSync(dir + "/on-agent.sh")) spawnSync("sh", [dir + "/on-agent.sh"], { stdio: "ignore" });
  const q = JSON.parse(readFileSync(dir + "/answers.json", "utf8")); const next = q.shift(); writeFileSync(dir + "/answers.json", JSON.stringify(q)); if (next) line(next); else process.exit(2);
}
`;

// A doc of `lines` lines of text, each about 200 characters, under a frontmatter of 4 lines, a heading and two empty lines.
const TOP = "---\nscope: [local-development]\ntopics: long things\n---\n\n# A long doc\n\n";
const row = (i: number) => `Line ${i} of the doc. ` + "word ".repeat(36).trim();
const longDoc = (lines: number) => TOP + Array.from({ length: lines }, (_, i) => row(i + 1)).join("\n") + "\n";
const SHORT = "---\nscope: [local-development, in-notebook]\n---\n\n# Short\n\nA doc that fits.\n";
const DOC_HEADINGS = ["What it is for", "What it says", "Measured and decided", "Not done and not known", "Names"];
const SECTIONS = DOC_HEADINGS.map((h) => `## ${h}\nWhat the doc says under this.`).join("\n");
const LEAD = "A long doc of lines, for a reader who wants every line. It decides nothing and leaves nothing open.";
// "Line 200 of the doc" is in a doc of 200 lines; 99999 is in none.
const GOOD = `${LEAD} It ends at Line 200.\n\n${SECTIONS}`, BAD = `${LEAD} It has 99999 lines.\n\n${SECTIONS}`;
const FILE = "docs/lopecode-dev/knowledge/long.md";
// A case starts the tool 10 to 25 times, about a second each on an idle machine: with four suites beside it one case
// passed 30 s (the suite's limit for a test that names none) at a load of 7.
const T = 120000;

const fresh = (docs: Record<string, string> = { "knowledge/long.md": longDoc(200), "knowledge/short.md": SHORT }, when?: string) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-ksum-")));
  const repo = join(dir, "repo"), fake = join(dir, "fake");
  const run = (cwd: string, cmd: string[], env: Record<string, string | undefined> = {}) => {
    const p = Bun.spawnSync(cmd, { cwd, env: { ...process.env, BRAIN_BASE: "cbtest", BRAIN_STATE_DIR: undefined, FAKE_DIR: fake, SUMMARIZER_AGENT: join(fake, "agent.mjs"), DRY: undefined, TAB: undefined, READS: undefined, MODEL: undefined, ...env } });
    return { code: p.exitCode, out: p.stdout.toString().trim(), err: p.stderr.toString().trim() };
  };
  const git = (...a: string[]) => { const r = run(repo, ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...a]); if (r.code !== 0) throw new Error(`git ${a.join(" ")}: ${r.err}`); return r.out; };
  const write = (rel: string, text: string) => { mkdirSync(dirname(join(repo, rel)), { recursive: true }); writeFileSync(join(repo, rel), text); };
  // A commit of everything, pushed; `at` is its date (the clock a doc with no summary is due from).
  const push = (msg: string, at?: string) => {
    git("add", "-A");
    const r = run(repo, ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", msg], at ? { GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at } : {});
    if (r.code !== 0) throw new Error(r.err);
    git("push", "-q", "origin", "HEAD:main");
    return Number(git("log", "-1", "--format=%ct")) * 1000;
  };
  mkdirSync(fake); mkdirSync(repo);
  run(dir, ["git", "init", "-q", "--bare", "-b", "main", "origin.git"]);
  git("init", "-q", "-b", "main");
  git("remote", "add", "origin", join(dir, "origin.git"));
  for (const [f, t] of Object.entries(docs)) write(f, t);
  write("tools/cloud-brain/brain.ts", FAKE);
  write(".gitignore", "tools/cloud-brain/.emitted\nnode_modules\n");
  copyFileSync(tool, join(repo, "tools/cloud-brain/knowledge-docs.ts"));
  copyFileSync(papersTool, join(repo, "tools/cloud-brain/summarize-papers.ts"));
  push("first", when);
  symlinkSync(modules, join(repo, "node_modules"));
  writeFileSync(join(fake, "agent.mjs"), AGENT);
  chmodSync(join(fake, "agent.mjs"), 0o755);
  writeFileSync(join(fake, "answers.json"), "[]");
  const jsonl = (f: string) => (existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const state = join(repo, "tools/cloud-brain/.emitted/docs");
  const kdocs = (args: string[], env: Record<string, string | undefined> = {}) => {
    const r = run(repo, ["bun", join(repo, "tools/cloud-brain/knowledge-docs.ts"), ...args], env);
    const lines = r.out.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return l; } });
    return { ...r, lines, last: lines.at(-1) as any };
  };
  const calls = () => jsonl(join(fake, "calls.jsonl"));
  return { dir, repo, fake, state, git, write, push, kdocs, calls,
    puts: () => calls().filter((c: any) => c.path.includes("knowledge.put")).flatMap((c: any) => c.body.entries),
    entry: (id = "doc:long") => JSON.parse(readFileSync(join(fake, "entries.json"), "utf8")).find((e: any) => e.id === id),
    answers: (list: any[]) => writeFileSync(join(fake, "answers.json"), JSON.stringify(list)),
    agents: () => jsonl(join(fake, "agent.jsonl")), started: () => jsonl(join(fake, "agent.jsonl")).filter((l: any) => l.dry !== "1"),
    journal: () => jsonl(join(state, "journal.jsonl")),
    doc: (rel = "knowledge/long.md") => readFileSync(join(repo, rel), "utf8") };
};
// The repository with both docs entered as the tool enters them with no summary.
const entered = (docs?: Record<string, string>, when?: string) => { const t = fresh(docs, when); const r = t.kdocs(["put", "--all"]); if (r.code !== 0) throw new Error(r.out + r.err); return t; };
const summarized = (docs?: Record<string, string>) => { const t = entered(docs); t.answers([{ result: GOOD }]); const r = t.kdocs(["summarize", "long"]); if (r.code !== 0) throw new Error(r.out + r.err); return t; };
const day = () => new Date().toISOString().slice(0, 10);
const lineOfDoc = (hash: string, model = "haiku") => `Summary by summarizer (${model}), ${day()}, of lopecode-dev/knowledge/long.md as it was with sha256 ${hash}.`;
const secondLine = (doc: string) => `The whole doc is the file ${FILE} in this Brain's brain-static, ${doc.length} characters: static.get?path=${FILE}. Its start follows.`;

test("summarize <name>: the canary first, one agent that reads a new directory with the doc's text alone, and the entry put with loop-docs: summary, two lines, the doc's start, 16000", () => {
  const t = entered();
  const before = t.kdocs(["status"]);
  expect(before.last).toMatchObject({ docs: 2, cut: 1, unmarked: 0, long: 1, summarized: 0, behind: 0, due: ["long"], refused: [] });
  t.answers([{ result: GOOD }]);
  const n = t.calls().length, doc = t.doc(), r = t.kdocs(["summarize", "long"], { MODEL: "opus", DRY: "1" });
  expect(r.code).toBe(0);
  expect(r.lines[0]).toMatchObject({ name: "long", outcome: "put", lead: (LEAD + " It ends at Line 200.").length, leadMax: 1498 - "A long doc".length, sections: SECTIONS.length, length: 16000, refused: [[]], usd: 0.25, put: { changed: 1, vectors: 1 } });
  expect(r.last).toMatchObject({ picked: 1, put: 1, refused: 0, failed: 0, usd: 0.25 });
  // Three starts: the script's arguments with DRY=1, the canary with haiku and an empty directory, the doc with haiku.
  const [pre, canary, one] = t.agents();
  expect(t.agents().length).toBe(3);
  expect([pre.dry, pre.args[0], canary.args[0], canary.model, canary.files, one.model, one.dry]).toEqual(["1", "summarizer", "summarizer", "haiku", [], "haiku", null]);
  // The doc's agent: a directory outside the repository that held the one file, its frontmatter taken off, and is gone.
  const body = doc.slice(doc.indexOf("\n---\n") + 5);
  expect(one.args).toEqual(["summarizer", `read your brief, brain/roles/summarizer.md, then summarize a doc: ${one.reads}/long.md, ${body.split("\n").length - 1} lines; the title is 10 characters, so the first paragraph is at most 1488 characters`]);
  expect([one.files, one.first, one.reads.startsWith(t.repo), existsSync(one.reads)]).toEqual([["long.md"], "", false, false]);
  // The calls after the lists: the file, then the entry, each with loop-docs.
  const mine = t.calls().slice(n);
  expect(mine.map((c: any) => [/brain\.([a-z]+\.[a-z]+)/.exec(c.path)![1], c.as])).toEqual([["knowledge.list", "loop-docs"], ["static.list", "loop-docs"], ["static.put", "loop-docs"], ["knowledge.put", "loop-docs"]]);
  const e = t.puts().at(-1);
  expect(e).toMatchObject({ id: "doc:long", kind: "doc", public: false, title: "A long doc", file: FILE, sha256: sha(doc), method: "knowledge-docs", staleSince: 0 });
  const top = `${LEAD} It ends at Line 200.\n\n${SECTIONS}\n\n${lineOfDoc(sha(doc))}\n${secondLine(doc)}\n\nTopics: long things\n\n${row(1)}\n${row(2)}\n`;
  expect([e.text.length, e.text.startsWith(top)]).toEqual([16000, true]);
  // The journal: the canary's line, then the doc's.
  expect(t.journal()).toMatchObject([{ canary: "refused", toolset: ["Read"], mode: "default" }, { name: "long", id: "doc:long", outcome: "put", model: "haiku", session: "s-3", rounds: 1, usd: 0.25, sha256: sha(doc), length: 16000, put: { vectors: 1 } }]);
  // After it: summarized, no longer cut or due, and the docs step puts nothing.
  const after = t.kdocs(["status"]);
  expect(after.last).toMatchObject({ fresh: 2, cut: 0, unmarked: 0, long: 1, summarized: 1, behind: 0, due: [] });
  expect(after.out).toContain(`long summary by haiku of ${day()}`);
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  const chk = t.kdocs(["status", "--check-summaries", "long"]);
  expect([chk.code, chk.lines[0], chk.last.failing]).toEqual([0, { name: "long", state: "summarized" }, []]);
}, T);

test("a put of a changed doc keeps the summary and its line, with the second line and the start made anew; due only over a tenth of the lines, then staleSince", () => {
  const t = summarized();
  const was = t.doc(), kept = t.entry().text, head = kept.slice(0, kept.indexOf(lineOfDoc(sha(was))) + lineOfDoc(sha(was)).length);
  // 207 lines; 23 more are a tenth of 230 and not over it.
  expect(was.split("\n").length - 1).toBe(207);
  const more = (k: number) => was + Array.from({ length: k }, (_, i) => `Added ${i + 1}. ` + "more ".repeat(30).trim()).join("\n") + "\n";
  t.write("knowledge/long.md", more(23));
  t.push("23 lines more");
  const st = t.kdocs(["status"]);
  expect(st.last).toMatchObject({ fresh: 1, stale: 1, cut: 0, unmarked: 0, summarized: 1, behind: 1, due: [] });
  expect(st.out).toContain(`long stale`);
  expect(st.out).toContain(`summary by haiku of ${day()}, behind`);
  const p = t.kdocs(["put", "--stale"]);
  expect(p.last).toMatchObject({ put: 1, cut: 0, unmarked: 0, summarized: 1 });
  const e = t.puts().at(-1);
  expect(e).toMatchObject({ id: "doc:long", sha256: sha(more(23)), staleSince: 0 });
  expect([e.text.length, e.text.startsWith(`${head}\n${secondLine(more(23))}\n\nTopics: long things\n\n${row(1)}\n`), e.text.split("Summary by summarizer").length]).toEqual([16000, true, 2]);
  // The entry is fresh again and its summary still behind; nothing is put for that.
  expect(t.kdocs(["status"]).last).toMatchObject({ fresh: 2, summarized: 1, behind: 1, due: [] });
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  // One line more: 24 of 231, over a tenth. Due since that commit, which is the entry's staleSince.
  t.write("knowledge/long.md", more(24));
  const at = t.push("24 lines more");
  expect(t.kdocs(["status"]).last).toMatchObject({ stale: 1, summarized: 1, behind: 1, due: ["long"], refused: [] });
  expect(t.kdocs(["put", "--stale"]).last).toMatchObject({ put: 1, summarized: 1 });
  expect(t.puts().at(-1)).toMatchObject({ sha256: sha(more(24)), staleSince: at });
  expect(t.puts().at(-1).text.startsWith(head + "\n")).toBe(true);
  expect(t.entry().staleSince).toBe(at);
  // Due for under 24 hours: said, not failing. A summary written again clears it.
  const chk = t.kdocs(["status", "--check-summaries"]);
  expect([chk.code, chk.lines[0].state, typeof chk.lines[0].due, chk.last]).toMatchObject([0, "behind", "string", { checked: 1, failing: [] }]);
  t.answers([{ result: GOOD }]);
  expect(t.kdocs(["summarize", "--due"]).last).toMatchObject({ picked: 1, put: 1 });
  expect([t.entry().staleSince, t.entry().text.includes(lineOfDoc(sha(more(24))))]).toEqual([null, true]);
  expect(t.kdocs(["status"]).last).toMatchObject({ summarized: 1, behind: 0, due: [] });
}, T);

test("a summary of a version no commit has is due; a doc that shrinks to fit is entered whole with staleSince 0 and no summary", () => {
  const t = summarized();
  const e = t.entry();
  writeFileSync(join(t.fake, "entries.json"), JSON.stringify([{ ...e, text: e.text.replace(/with sha256 [0-9a-f]{64}/, "with sha256 " + "0".repeat(64)) }, t.entry("doc:short")]));
  expect(t.kdocs(["status"]).last).toMatchObject({ summarized: 1, behind: 1, due: ["long"] });
  const small = TOP + row(1) + "\n";
  t.write("knowledge/long.md", small);
  t.push("shrunk");
  expect(t.kdocs(["status"]).last).toMatchObject({ stale: 1, long: 0, summarized: 0, cut: 0, due: [] });
  expect(t.kdocs(["put", "--stale"]).last).toMatchObject({ put: 1, cut: 0, summarized: 0 });
  expect(t.puts().at(-1)).toMatchObject({ id: "doc:long", text: "Topics: long things\n\n" + row(1), staleSince: 0 });
  // A short doc whose entry had neither is put as before sd-2, with no staleSince in the put.
  t.write("knowledge/short.md", SHORT + "\nMore.\n");
  t.push("short changed");
  t.kdocs(["put", "--stale"]);
  expect("staleSince" in t.puts().at(-1)).toBe(false);
}, T);

test("put --plain <name>: a summarized doc as it is put with no summary, cut, its last line the cut's; due again; --plain with no name puts nothing", () => {
  const t = summarized();
  const cut = t.puts()[0];
  expect(cut.id).toBe("doc:long");
  expect(t.kdocs(["put", "--plain"]).code).toBe(1);
  expect(t.kdocs(["put", "--plain", "--all"]).code).toBe(1);
  const n = t.puts().length, p = t.kdocs(["put", "--plain", "long"]);
  expect(p.last).toMatchObject({ put: 1, cut: 1, summarized: 0, plain: true });
  expect(t.puts().length).toBe(n + 1);
  expect(t.puts().at(-1)).toMatchObject({ text: cut.text, staleSince: 0 });
  expect([cut.text.includes("Summary by summarizer"), cut.text.endsWith(`The whole is the file ${FILE} in this Brain's brain-static: static.get?path=${FILE}]`)]).toEqual([false, true]);
  expect(t.kdocs(["status"]).last).toMatchObject({ cut: 1, unmarked: 0, summarized: 0, due: ["long"] });
}, T);

test("the docs step leaves a doc with a .running file under ten minutes old and names it; an older file does not hold it; summarize skips such a doc and starts no agent", () => {
  const t = summarized();
  t.write("knowledge/long.md", t.doc() + row(201) + "\n");
  t.write("knowledge/short.md", SHORT + "\nMore.\n");
  t.push("both changed");
  writeFileSync(join(t.state, "long.running"), String(Date.now() - 9 * 60000));
  const p = t.kdocs(["put", "--stale"]);
  expect(p.last).toMatchObject({ put: 1, running: ["long"] });
  expect(t.puts().at(-1).id).toBe("doc:short");
  const alone = t.kdocs(["put", "--stale"]);
  expect([alone.code, alone.out]).toEqual([0, "nothing to put; left for the next put, a summarizer is running on them: long"]);
  const started = t.started().length;
  t.answers([{ result: GOOD }]);
  const s = t.kdocs(["summarize", "long"]);
  expect([s.code, s.lines[0], s.last.picked, t.started().length - started]).toEqual([0, { name: "long", skipped: "a summarizer is running on it" }, 0, 0]);
  // A put by name is by hand and is not held.
  expect(t.kdocs(["put", "long"]).last).toMatchObject({ put: 1, summarized: 1 });
  t.write("knowledge/long.md", t.doc() + row(202) + "\n");
  t.push("changed again");
  writeFileSync(join(t.state, "long.running"), String(Date.now() - 11 * 60000));
  expect(t.kdocs(["put", "--stale"]).last).toMatchObject({ put: 1, summarized: 1 });
}, T);

test("summarize --dry: the summary to a file and nothing put; refused once, the same agent is sent the list; refused twice dry holds a later --dry and not a run that puts", () => {
  const t = entered();
  const n = t.calls().length;
  t.answers([{ result: BAD }, { result: GOOD }]);
  const r = t.kdocs(["summarize", "long", "--dry"]);
  expect(r.code).toBe(0);
  expect(r.lines[0]).toMatchObject({ name: "long", outcome: "dry", length: 16000, refused: [["these numbers are not in the text as you wrote them: 99999"], []], usd: 0.5 });
  expect(r.last).toMatchObject({ dry: true, picked: 1, put: 0, dry_written: 1 });
  expect(t.calls().slice(n).map((c: any) => /brain\.([a-z]+\.[a-z]+)/.exec(c.path)![1])).toEqual(["knowledge.list", "static.list"]);
  const [first, second] = t.started().slice(1);
  expect(second.args.slice(0, 2)).toEqual(["--resume", "s-3"]);
  expect([second.reads, second.files]).toEqual([first.reads, ["long.md"]]);
  const whole = readFileSync(join(t.state, "long.summary.txt"), "utf8");
  expect([whole.length, whole.includes(lineOfDoc(sha(t.doc()))), whole.includes(secondLine(t.doc()))]).toEqual([16000, true, true]);
  expect(t.journal()).toMatchObject([{ dry: true, canary: "refused" }, { dry: true, name: "long", outcome: "dry", rounds: 2, usd: 0.5 }]);
  // The first answer, which was sent back, is kept beside the summary.
  expect(readFileSync(join(t.state, "long.first-answer.txt"), "utf8")).toBe(BAD);
  // Refused twice, dry: a second --due --dry starts no agent for it, the canary's neither; status does not list it
  // under refused, and a run that puts is not held.
  t.answers([{ result: BAD }, { result: BAD }, { result: GOOD }]);
  expect(t.kdocs(["summarize", "long", "--dry"]).lines[0]).toMatchObject({ outcome: "refused" });
  const started = t.agents().length, held = t.kdocs(["summarize", "--due", "--dry"]);
  expect([held.code, held.last.picked, held.last.refusedBefore, t.agents().length - started]).toEqual([0, 0, ["long"], 0]);
  expect(t.kdocs(["summarize", "long", "--dry"]).lines[0]).toEqual({ name: "long", skipped: "refused-before" });
  expect(t.kdocs(["status"]).last).toMatchObject({ due: ["long"], refused: [] });
  expect(t.puts().length).toBe(2);
  expect(t.kdocs(["summarize", "--due"]).lines[0]).toMatchObject({ name: "long", outcome: "put" });
  expect(t.puts().length).toBe(3);
}, T);

test("refused twice: nothing is put, status lists the doc under refused, a later --due starts no agent (the canary's neither) until --again; --check-summaries fails it unless --except names it", () => {
  const t = entered();
  const text = t.entry().text;
  t.answers([{ result: BAD }, { result: BAD }]);
  const r = t.kdocs(["summarize", "--due"]);
  expect(r.code).toBe(0);
  expect(r.lines[0]).toMatchObject({ name: "long", outcome: "refused", refused: [["these numbers are not in the text as you wrote them: 99999"], ["these numbers are not in the text as you wrote them: 99999"]], usd: 0.5 });
  expect(r.last).toMatchObject({ picked: 1, put: 0, refused: 1 });
  expect([t.puts().length, t.entry().text === text, existsSync(join(t.state, "long.refused.txt"))]).toEqual([2, true, true]);
  expect(t.journal().at(-1)).toMatchObject({ name: "long", outcome: "refused", sha256: sha(t.doc()), numbers: ["99999"] });
  expect(t.kdocs(["status"]).last).toMatchObject({ due: ["long"], refused: ["long"] });
  const started = t.agents().length;
  t.answers([{ result: GOOD }]);
  const again = t.kdocs(["summarize", "--due"]);
  expect([again.code, again.lines.length, again.last.picked, again.last.refusedBefore, t.agents().length - started]).toEqual([0, 1, 0, ["long"], 0]);
  expect(t.kdocs(["summarize", "long"]).lines[0]).toEqual({ name: "long", skipped: "refused-before" });
  const chk = t.kdocs(["status", "--check-summaries"]);
  expect([chk.code, chk.lines[0].fails, chk.last.failing]).toEqual([1, ["refused twice at this file (the journal)"], ["long"]]);
  const exc = t.kdocs(["status", "--check-summaries", "--except", "long=fb-refused-1"]);
  expect([exc.code, exc.lines[0].except, exc.last.excepted, exc.last.failing]).toEqual([0, "fb-refused-1", ["long"], []]);
  // The file changes: the refusal was of another file. --again: the same file once more.
  const more = t.kdocs(["summarize", "long", "--again", "--model", "opus"]);
  expect([more.lines[0].outcome, t.started().at(-1).model, t.entry().text.includes(lineOfDoc(sha(t.doc()), "opus"))]).toEqual(["put", "opus", true]);
  // Put at the file it was refused at: the refusal is over (sd-4-the-rest-and-the-release-line; --check-summaries failed such a doc on cb4).
  const after = t.kdocs(["status", "--check-summaries"]);
  expect([after.code, after.lines[0], after.last.failing, t.kdocs(["status"]).last.refused]).toEqual([0, { name: "long", state: "summarized" }, [], []]);
}, T);

test("summarize: the file is read again before the put: when origin/main moved while the agent read, the line names the version read and the start and sha256 are the newer file's", () => {
  const t = entered();
  const was = t.doc(), now = was.replace(row(1), "Line 1, written again while the agent read.");
  writeFileSync(join(t.dir, "now.md"), now);
  writeFileSync(join(t.fake, "on-agent.sh"), `cd ${t.repo} && cp ${join(t.dir, "now.md")} knowledge/long.md && git -c user.name=t -c user.email=t@example.com -c commit.gpgsign=false commit -q -am moved && git push -q origin HEAD:main\n`);
  t.answers([{ result: GOOD }]);
  const r = t.kdocs(["summarize", "long"]);
  expect(r.lines[0]).toMatchObject({ outcome: "put" });
  const e = t.puts().at(-1);
  expect(e.sha256).toBe(sha(now));
  expect(e.text).toContain(`${lineOfDoc(sha(was))}\n${secondLine(now)}\n\nTopics: long things\n\nLine 1, written again while the agent read.\n${row(2)}`);
  expect(t.calls().filter((c: any) => c.path.includes("static.put")).at(-1).sent.sha256).toBe(sha(now));
  expect(t.journal().at(-1)).toMatchObject({ outcome: "put", sha256: sha(was), putSha256: sha(now) });
  // The entry is fresh by the newer file, and its summary behind by one line of 207: not due.
  expect(t.kdocs(["status"]).last).toMatchObject({ fresh: 2, summarized: 1, behind: 1, due: [] });
}, T);

test("--usd-max stops before the next doc; a put that is refused stops the run; the canary's stop is exit 3 with no doc read; a short doc and an unknown name start no agent", () => {
  const two = { "knowledge/long.md": longDoc(200), "knowledge/longer.md": longDoc(200).replace("# A long doc", "# A longer doc"), "knowledge/short.md": SHORT };
  const t = entered(two);
  expect(t.kdocs(["summarize", "--due", "--usd-max", "lots"]).code).toBe(2);
  expect(t.kdocs(["summarize"]).code).toBe(1);
  t.answers([{ result: GOOD }, { result: GOOD }]);
  const r = t.kdocs(["summarize", "--due", "--usd-max", "0.25"]);
  expect([r.code, r.lines.slice(0, -1).map((l: any) => [l.name, l.outcome]), r.last.stopped]).toEqual([1, [["long", "put"]], "--usd-max 0.25: the agents of this run have cost $0.25; longer and the docs after it were not started"]);
  writeFileSync(join(t.fake, "put-fails"), "");
  const f = t.kdocs(["summarize", "--due"]);
  expect([f.code, f.lines[0].outcome, f.lines[0].why.startsWith("knowledge.put: 400"), t.journal().at(-1).outcome]).toEqual([1, "failed", true, "failed"]);
  const s = t.kdocs(["summarize", "short", "nothing-of-that-name"]);
  expect([s.code, s.lines[0], s.last.unknown, s.last.picked]).toEqual([1, { name: "short", skipped: "16 characters: it fits an entry and is entered whole" }, ["nothing-of-that-name"], 0]);
  const leak = entered();
  writeFileSync(join(leak.fake, "canary-leaks"), "");
  leak.answers([{ result: GOOD }]);
  const c = leak.kdocs(["summarize", "long"]);
  expect([c.code, c.last.stopped, leak.started().length, leak.puts().length, leak.journal()[0].canary]).toEqual([3, 'the canary: read (toolset ["Read"], mode default). No doc was read and nothing was put.', 1, 2, "read"]);
  expect(c.out + readFileSync(join(leak.state, "journal.jsonl"), "utf8")).not.toContain(readFileSync(join(leak.repo, "tools/cloud-brain/.emitted/canary.txt"), "utf8").trim());
}, T);

test("summarize --first-paragraph: the entry holds the first paragraph, the line, the second line and the doc's start, and no section; the judge still reads the sections; a put keeps it and --check-summaries passes it", () => {
  const t = entered();
  // The first answer has a number the doc does not: it is refused as without the flag, and the second is put.
  t.answers([{ result: BAD }, { result: GOOD }]);
  const doc = t.doc(), r = t.kdocs(["summarize", "long", "--first-paragraph"]);
  expect(r.code).toBe(0);
  const top = `${LEAD} It ends at Line 200.\n\n${lineOfDoc(sha(doc))}\n${secondLine(doc)}\n\nTopics: long things\n\n${row(1)}\n${row(2)}\n`;
  expect(r.lines[0]).toMatchObject({ name: "long", outcome: "put", lead: (LEAD + " It ends at Line 200.").length, sections: SECTIONS.length, length: 16000, put: { changed: 1, vectors: 1 } });
  expect(r.lines[0].refused[0].length).toBe(1);
  expect(r.lines[0].refused[1]).toEqual([]);
  const e = t.puts().at(-1);
  expect([e.text.length, e.text.startsWith(top), e.text.includes("## "), e.staleSince]).toEqual([16000, true, false, 0]);
  // The entry keeps more of the doc's own text than one with the sections does, by the sections and the empty line after them.
  const plainStart = e.text.slice(top.indexOf("Topics: long things"));
  const withSections = summarized().puts().at(-1).text;
  expect(plainStart.length - withSections.slice(withSections.indexOf("Topics: long things")).length).toBe(SECTIONS.length + 2);
  // The journal's line of the doc says which form was put; the canary's does not.
  const j = t.journal();
  expect([j.length, "firstParagraph" in j[0], j[1].firstParagraph, j[1].outcome]).toEqual([2, false, true, "put"]);
  // Summarized, not cut, not due; the form passes the check; the docs step has nothing to put.
  expect(t.kdocs(["status"]).last).toMatchObject({ cut: 0, unmarked: 0, long: 1, summarized: 1, behind: 0, due: [] });
  const chk = t.kdocs(["status", "--check-summaries", "long"]);
  expect([chk.code, chk.lines[0], chk.last.failing]).toEqual([0, { name: "long", state: "summarized" }, []]);
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  // A put by name keeps the first paragraph and its line, as it keeps a whole summary.
  expect(t.kdocs(["put", "long"]).last).toMatchObject({ put: 1, cut: 0, summarized: 1 });
  expect(t.puts().at(-1).text).toBe(e.text);
  // put --plain is the way back: the text of before any summary.
  const before = entered().entry().text;
  expect(t.kdocs(["put", "--plain", "long"]).last).toMatchObject({ put: 1, cut: 1, summarized: 0, plain: true });
  expect(t.puts().at(-1).text).toBe(before);
  // Some of the five headings and not all is still not a form.
  const part = e.text.replace(`\n\n${lineOfDoc(sha(doc))}`, `\n\n## Names\nA name.\n\n${lineOfDoc(sha(doc))}`);
  writeFileSync(join(t.fake, "entries.json"), JSON.stringify([{ ...e, text: part }, t.entry("doc:short")]));
  const f = t.kdocs(["status", "--check-summaries", "long"]);
  expect([f.code, f.lines[0].fails.includes("the five headings are not there in their order")]).toEqual([1, true]);
}, T);

test("status --check-summaries: a doc with no summary fails once it has been due for over 24 hours, from its file's last commit; a summary not in its form fails; with names only those are read", () => {
  const old = new Date(Date.now() - 3 * 864e5).toISOString();
  const t = entered(undefined, old);
  const chk = t.kdocs(["status", "--check-summaries"]);
  expect([chk.code, chk.lines[0].state, chk.lines[0].fails.length, chk.lines[0].fails[0].startsWith("a summary has been due for 3.0 d: no summary"), chk.last.failing]).toEqual([1, "no summary", 1, true, ["long"]]);
  const named = t.kdocs(["status", "--check-summaries", "short"]);
  expect([named.code, named.lines.slice(0, -1), named.last.checked]).toEqual([0, [{ name: "short", state: "short" }], 1]);
  expect(t.kdocs(["status", "--check-summaries", "no-such"]).code).toBe(1);
  // --check alone is as before: a due summary does not fail it.
  expect(t.kdocs(["status", "--check"]).code).toBe(0);
  t.answers([{ result: GOOD }]);
  expect(t.kdocs(["summarize", "long"]).code).toBe(0);
  expect(t.kdocs(["status", "--check-summaries"]).code).toBe(0);
  // An entry whose summary lost a heading, names another file after its line, and has a first paragraph over the limit.
  const e = t.entry(), bad = "x".repeat(1489) + e.text.slice(e.text.indexOf("\n\n")).replace("## Names\n", "").replace(`the file ${FILE} in`, "the file docs/elsewhere.md in");
  writeFileSync(join(t.fake, "entries.json"), JSON.stringify([{ ...e, text: bad }, t.entry("doc:short")]));
  const f = t.kdocs(["status", "--check-summaries", "long"]);
  expect(bad.length).toBeGreaterThan(16000);
  expect([f.code, f.lines[0].fails]).toEqual([1, ["the first paragraph is 1489 characters, over 1488", "the five headings are not there in their order", `the line after the summary's does not name the entry's file ${FILE}`, `the text is ${bad.length} characters, over 16000`]]);
}, T);

// The line the docs step is given for `summaries due (<brain>): …` of lock.sh (sd-4-the-rest-and-the-release-line; design piece 4).
test("put --stale names the docs that wait for a summarizer in a line before its last: with a put and with none; not one refused twice or running, not a summarized or a short doc; 8 names then a count; no other put", () => {
  const t = entered();
  const DUE = "summaries due: long";
  // Nothing to put: the line, then the last line as it was.
  const idle = t.kdocs(["put", "--stale"]);
  expect([idle.code, idle.out]).toEqual([0, DUE + "\nnothing to put"]);
  // A put of another doc: the line is before the JSON, which has no `due`.
  t.write("knowledge/short.md", SHORT + "\nMore.\n");
  t.push("the short one changed");
  const p = t.kdocs(["put", "--stale"]);
  expect(p.lines.slice(-2)).toMatchObject([DUE, { put: 1, cut: 0 }]);
  expect("due" in p.last).toBe(false);
  // By name, --all and --plain: no line.
  for (const args of [["put", "long"], ["put", "--all"], ["put", "--plain", "long"]]) expect(t.kdocs(args).out).not.toContain("summaries due");
  // A summarizer is running on it: left out, and named again when the file is over ten minutes old.
  mkdirSync(t.state, { recursive: true });
  writeFileSync(join(t.state, "long.running"), String(Date.now() - 9 * 60000));
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  writeFileSync(join(t.state, "long.running"), String(Date.now() - 11 * 60000));
  expect(t.kdocs(["put", "--stale"]).out).toBe(DUE + "\nnothing to put");
  // Refused twice at this file: `summarize --due` starts no agent for it, so the line does not ask for one.
  t.answers([{ result: BAD }, { result: BAD }]);
  expect(t.kdocs(["summarize", "--due", "--first-paragraph"]).last).toMatchObject({ refused: 1 });
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  expect(t.kdocs(["status"]).last).toMatchObject({ due: ["long"], refused: ["long"] });
  // Summarized, by the command the line gives: no line. Changed by over a tenth of its lines: the line again, with the put that keeps the paragraph.
  t.answers([{ result: GOOD }]);
  expect(t.kdocs(["summarize", "--due", "--first-paragraph", "--again"]).last).toMatchObject({ put: 1 });
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  t.write("knowledge/long.md", t.doc() + Array.from({ length: 30 }, (_, i) => row(300 + i)).join("\n") + "\n");
  t.push("30 lines more");
  const behind = t.kdocs(["put", "--stale"]);
  expect(behind.lines.slice(-2)).toMatchObject([DUE, { put: 1, summarized: 1 }]);
}, T);

test("put --stale: nine docs due are 8 names and `and 1 more`, in the order of the docs; a new long doc is entered cut and named in the same run", () => {
  const names = Array.from({ length: 9 }, (_, i) => `l${i + 1}`);
  const t = fresh(Object.fromEntries(names.map((n) => [`knowledge/${n}.md`, longDoc(200)])));
  const first = t.kdocs(["put", "--stale"]);
  expect(first.lines.slice(-2)).toMatchObject([`summaries due: ${names.slice(0, 8).join(", ")}, and 1 more`, { put: 9, cut: 9 }]);
  expect(t.kdocs(["put", "--stale"]).out).toBe(`summaries due: ${names.slice(0, 8).join(", ")}, and 1 more\nnothing to put`);
}, T);
