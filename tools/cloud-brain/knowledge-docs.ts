#!/usr/bin/env bun
// Enters knowledge/*.md, the Cloud Brain designs (plan/cloud-brain-*.md), the post mortems of the issue loop
// (tools/cloud-brain/post-mortems/*.md) and three files of cloud-brain-dev (AGENTS.md,
// README.md, philosophy.md) into a Brain's knowledge base, one entry a doc (kind `doc`, id `doc:<name>`), so that
// knowledge.search?semantic=true finds the doc for a task. `status` says which entries are behind their file and for
// how long, `put` enters them. What enters a changed doc: `lock.sh release land`, the last command of a landing, runs
// `put --stale --limit=30` with the lock gone and prints the last line as `docs (<brain>): …`
// (plan/cloud-brain-brain-docs-entered-by-hand.md). A commit pushed with no landing, and a push of cloud-brain-dev
// alone, are not entered until the next landing of anyone.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status [--check]      --check: exit 1 when a doc is stale, missing or badname
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --all | --stale | <name>…
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --plain <name>…         a long doc as it is put with no summary: the way an entry is put back
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize --due [--usd-max N] [--model M] [--dry]   one agent a due doc, one after another
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize <name>… [--again] [--dry]                 the named docs, due or not
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts summarize <name>… --first-paragraph                 the entry holds the summary's first paragraph and none of its sections
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check-summaries [<name>…] [--except name=issue,…]   reads only; exit 1 on a failing doc
//   … --owner            call with the owner's session, for the owner's own use; an agent does not
//   … --limit=SECONDS    the time one call may take (120)
// The source is origin/main of this repository, read with git: an edit on disk and a commit not pushed are not seen,
// by status or by put. The three files of cloud-brain-dev are read at the commit origin/main records for the
// submodule; when its checkout lacks that commit they are left as they are and the last line says so (cloudBrainDev).
// A call is made with the token loop-docs (knowledge.put, knowledge.list, static.put, static.list), kept in the main
// checkout's .emitted/, so the tool runs from a worktree. With no such token it prints the command the owner makes it
// with and exits 2; so too with one that does not name a method it calls (the token of before sd-1-doc-files).
// The whole of a doc is a file the Brain keeps (sd-1-doc-files, task 1 of plan/cloud-brain-docs-summarised-for-search.md).
// A put of a doc is two calls, the file first:
//   static.put?path=docs/<source>/<path>&public=<true|false>&tags=knowledge-doc     the file's bytes, as git has them
//   knowledge.put { …, file: "docs/<source>/<path>", sha256 }                        25 entries a call, after their files
// <source>/<path> is lopecode-dev/<the path in this repository> or cloud-brain-dev/<FILE>.md. `public` is the entry's own
// and is sent on every put: with `tags` given a put replaces the file's labels, so one that left it out would make a
// public doc's file private. When a file's put fails no entry of its 25 is put, and those docs are stale at the next put.
// An entry is fresh when it has the file's sha256, the same `public` and that `file`. The entry's url is still the doc
// on GitHub's main. `status` also reads static.list?prefix=docs/: a doc's line ends `file not kept` or `file differs`
// when the kept file has not the doc's sha256 and `public`, and the last line has `files`, the docs whose file is right,
// and `filesWrong`, the names of the others. `put --stale` puts such a doc too, fresh or not, and the last line of put
// has `filesWrong`, their count among the docs it put: a copy of this tool from before this change puts a changed doc's
// entry and no file. Nothing is deleted: a doc removed from the repository keeps its entry and its file.
// A doc whose frontmatter scope has `in-notebook` is public (it already ships in the markdown-wiki notebook);
// one that is `local-development` only is the Brain's and private. The three of cloud-brain-dev are private.
// An entry's text is TEXT characters at most (the service refuses more). A longer one is cut by this tool, and its last
// line then says so: `[the first N of M characters of this entry's text. The whole is the file <file> in this Brain's
// brain-static: static.get?path=<file>]`, with `, and /static/<file> at the Brain's address` before the bracket when the
// doc is public, and the text and that line TEXT characters together. N and M count the text this tool makes (the
// topics first, the heading taken out), not the file. Until sd-1-doc-files the line named the file's address on
// raw.githubusercontent.com, and for a file of cloud-brain-dev its repository; an entry that ends with such a line is
// unmarked. A doc's line of status ends with `cut N of M`, and `, unmarked` when the
// entry kept does not end with that line. The last line of status and of put has `cut`, the docs whose text was cut;
// that of status also `unmarked`, and that of put the unmarked among the docs it put (a changed cut doc is one too,
// its entry ending with the line of the older text). An entry is fresh by its file's
// hash, so a change to the line here, and a put by a copy of this tool from before the line (a release from a worktree
// behind a3e883dc), leave a fresh entry with no line (ac-4-docs-tool-marks-a-cut). `put --stale` puts an unmarked doc
// as it does a stale or missing one, so the next release of anyone enters it with the line; an entry that
// knowledge.list answers with no text is among them (knowledge-docs-put-stale-skips-unmarked).
// A long doc's summary (sd-2-one-summarizer, task 2 of plan/cloud-brain-docs-summarised-for-search.md; design pieces 2 and 3).
// The entry of a doc over TEXT may hold a summary of the whole doc, written by the role `summarizer` (the papers' role,
// made to take a doc; its brief is brain/roles/summarizer.md). Its text is then, TEXT characters in all:
//   <the first paragraph, 1498 less the title's length at most: the service embeds the title and the first 1500 characters>
//   <five sections under ## headings, 5000 at most: What it is for, What it says, Measured and decided, Not done and not known, Names>
//   Summary by summarizer (<model>), <day>, of <source>/<path> as it was with sha256 <the file the agent read>.
//   The whole doc is the file <file> in this Brain's brain-static, <the file's characters>: static.get?path=<file>[, and /static/<file> at the Brain's address]. Its start follows.
//   <the text this tool makes of the doc, from its start, cut so the whole is TEXT>
// `put` keeps a summary it did not write: for a long doc whose kept entry has the line "Summary by summarizer …", it
// puts the kept text to the end of that line, the second line and the doc's start as they are now, and the new file's
// sha256. Such an entry is neither cut nor unmarked: `cut` counts the long docs with no summary and `unmarked` those of
// them whose entry does not end with the cut's line. A long doc whose entry knowledge.list answers with no text may hold
// a summary: `put --stale` leaves it and names it (`noText`), and a put by name enters it cut. A doc that shrinks to
// TEXT or under is entered whole and its put sends staleSince: 0.
// A summary is due (`due` in the last line of status, by name) for a long doc with no summary, since its file's last
// commit; and for one whose summary's line names another sha256 than the file's when the lines added and deleted since
// that version (git diff --numstat) are over a tenth of the file's lines, since the first commit that took it over, or
// when no commit has that version. A put of a doc that is due and has a summary sends that time as staleSince, and 0
// when it is not due, so knowledge.list?stale=true&kind=doc answers the docs whose summary is due again. The last line
// of status also has `long`, `summarized`, `behind` (summarized, of another version of the file) and `refused` (due,
// and refused twice at this file by a run that was not --dry, with no put at that file since).
// summarize: nothing is fetched; the docs are origin/main's. Before the first doc, the canary of summarize-papers.ts
// (exit 3 unless a haiku agent with an empty directory fails to read a line beside the token files); with no doc to run,
// no agent is started. For a doc: its file with the frontmatter taken off and no line over 1500 characters is written
// to a new directory outside the checkout, and `summarize` of summarize-papers.ts runs one agent of the role on it
// (kind "doc", model haiku unless --model): judged, sent back once, as a paper's. Accepted, the file is read again from
// origin/main and the doc is put as put does, file then entry, with staleSince: 0; when origin/main moved meanwhile
// the line names the version read and the start and sha256 are the newer file's. Refused twice, nothing is put, and no
// agent is started for that doc at that file again without --again (a refusal of a --dry run holds a --dry run alone); the answer is <state>/docs/<name>.refused.txt, and
// a first answer that was sent back is <name>.first-answer.txt. --dry writes <state>/docs/<name>.summary.txt and
// puts nothing. One line a doc to <state>/docs/journal.jsonl (name, outcome put | dry | refused | failed, model,
// session, usd, context, ms, the lengths, what each round refused, the put's answer), after the canary's.
// summarize --first-paragraph (sd-3b-first-paragraph-alone): the same agent, brief and judge, and the entry holds the
// first paragraph, the summary's line, the second line and the doc's start: the five sections are in no part of it,
// so the entry keeps about 5,000 characters more of the doc's own text. The journal's line has firstParagraph: true.
// put --stale and the docs that wait for a summarizer (sd-4-the-rest-and-the-release-line, design piece 4): before its last
// line it prints `summaries due: <name>, <name>…` (8 names, then `and N more`) when a long doc is due and `summarize --due`
// would start an agent for it: not one refused twice at this file, and not one a summarizer is running on. `lock.sh
// release land` prints it as `summaries due (<brain>): …` with the command to run, which has --first-paragraph: the form
// the owner chose for the long docs (comment 6005 of that issue). No other put prints the line.
// While an agent reads a doc, <state>/docs/<name>.running holds the time: a summarize that finds one under ten minutes
// old skips the doc, and so does put --stale, which names it (`running`) and leaves it for the next put, since it read
// the kept text before a summary that lands in between. <state> is one machine's.
// status --check-summaries: the long docs, or the named ones. It fails a doc whose entry has the line and not a first
// paragraph within its limit, the five headings in order or no heading (--first-paragraph), a next line that names the entry's own file and a text of
// TEXT at most; a doc whose summary has been due for over 24 hours; and one refused twice at this file and not put at it since. One line of
// JSON a doc and a last line { checked, summarized, excepted, failing }. status --check is as it was.
// summarize-papers.ts is loaded by summarize and --check-summaries alone: status and put, which a release runs, load no
// other file of the repository.
// tests/tools/knowledge-docs-summaries.test.ts
// The id is the file's name in lower case. A name that gives no id knowledge.put takes (a space, a
// character outside ASCII, anything but a-z 0-9 . _ : -), or a path static.put does not take (a `:`, over 200 characters), is `badname` in status and `badNames` in the last line, and is in no put (i1546).
// tests/tools/knowledge-docs.test.ts
import { writeFileSync, mkdtempSync, mkdirSync, existsSync, readFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(new URL(import.meta.url).pathname), root = join(here, "..", "..");
const BASE = process.env.BRAIN_BASE;
if (!BASE) throw new Error("BRAIN_BASE");
const [cmd, ...args] = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
// --name VALUE or --name=VALUE; the value of the first form is no doc's name.
const VALUED = ["--except", "--usd-max", "--model"];
const opt = (f: string) => { const eq = args.find((a) => a.startsWith(f + "=")), i = args.indexOf(f); return eq ? eq.slice(f.length + 1) : i >= 0 ? args[i + 1] : undefined; };
const names = args.filter((a, i) => !a.startsWith("--") && !VALUED.includes(args[i - 1]));
const limit = (args.find((a) => /^--limit=\d+$/.test(a)) || "--limit=120").slice(8);
const REPO = "https://github.com/tomlarkworthy/lopecode-dev/blob/main/", TEXT = 16000, SRC = "origin/main", TOKEN = "loop-docs", METHODS = "knowledge.put knowledge.list static.put static.list";
// Where a doc's file is kept in brain-static: FILES<source>/<path>. 53 docs had a file there, put on 2026-10-10,
// which their entries named; the spec's `knowledge-docs/` would have been a second place (records/sd-1-doc-files.md).
const FILES = "docs/", FILE_TAG = "knowledge-doc";
const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
const git = (at: string, ...a: string[]) => spawnSync("git", ["-C", at, ...a], { encoding: "buffer", maxBuffer: 1 << 26 });
const line = (at: string, ...a: string[]) => { const r = git(at, ...a); return r.status === 0 ? r.stdout.toString().trim() : ""; };

// The main checkout's state, also when the copy that runs is a worktree's own (as lock.sh finds it).
const common = line(here, "rev-parse", "--path-format=absolute", "--git-common-dir");
const state = process.env.BRAIN_STATE_DIR || (common ? join(dirname(common), "tools/cloud-brain/.emitted") : "");
const who = flag("--owner") ? ["--owner"] : ["--as", TOKEN];

const tmpDir = mkdtempSync(join(tmpdir(), "kdocs-")), tmp = join(tmpDir, "body.json");
// Removed at every end of the process, a process.exit and an error thrown among them (28,603 of them were in the
// system's temporary directory on 2026-10-13: only `end` of summarize removed it; issue tmpdir-entries-slow-every-bun-start).
process.on("exit", () => rmSync(tmpDir, { recursive: true, force: true }));
// body: JSON for the service. file: a file's bytes, sent as they are.
const call = (path: string, body?: any, file?: Uint8Array) => {
  if (file) writeFileSync(tmp, file);
  else if (body) writeFileSync(tmp, JSON.stringify(body));
  const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain." + path, ...who, "-sS", "-m", limit,
    ...(file || body ? ["-X", "POST", "-H", "content-type: " + (file ? "text/markdown" : "application/json"), "--data-binary", "@" + tmp] : [])],
    { encoding: "utf8", env: { ...process.env, ...(state ? { BRAIN_STATE_DIR: state } : {}) }, maxBuffer: 1 << 26 });
  // brain.ts curl: the body on stdout, the status last on stderr. A name with no token kept is answered on stdout, before any call.
  const st = /\[(\d+)\]\s*$/.exec(r.stderr || ""), text = (r.stdout || "").trim();
  if (text.startsWith(`no token "${TOKEN}" is kept`)) {
    console.error(`no token "${TOKEN}" is kept. The owner makes it once: BRAIN_BASE=${BASE} bun tools/cloud-brain/brain.ts token ${TOKEN} ${METHODS}`);
    process.exit(2);
  }
  // The token of before sd-1-doc-files names the two knowledge methods only. brain.ts token refuses a name that is kept.
  if (st && st[1] === "403" && !flag("--owner") && /does not name/.test(text)) {
    console.error(`the token "${TOKEN}" does not name ${path.split("?")[0]}. It is made again with the owner's session: BRAIN_BASE=${BASE} bun tools/cloud-brain/brain.ts token revoke ${TOKEN}, then BRAIN_BASE=${BASE} bun tools/cloud-brain/brain.ts token ${TOKEN} ${METHODS}`);
    process.exit(2);
  }
  if (!st || st[1] !== "200") throw new Error(`${path.split("?")[0]}: ${st ? st[1] + " " + text.slice(0, 200) : (r.stderr || "").slice(0, 200)}`);
  return JSON.parse(text);
};

const head = line(root, "rev-parse", SRC);
if (!head) throw new Error(`no ${SRC} in ${root}`);
// What knowledge.put takes as an id (brain-knowledge.ojs, knowledgePatterns.id and knowledgeLimits.id, read 2026-10-11). One id
// outside it has the whole call refused 400, so a doc with such a name is named and left out of the put.
const ID = /^[a-z0-9][a-z0-9._:-]*$/, ID_MAX = 100;
// What static.put takes as a path, and knowledge.put as an entry's file (brain-static.ojs, "A path is segments of"; knowledgeLimits.file).
const PATH = /^[A-Za-z0-9@._-]+(\/[A-Za-z0-9@._-]+)*$/, PATH_MAX = 200;
// A text over TEXT, cut so that it and its last line are TEXT characters. The line holds its own first number, so the
// longest part that fits is looked for from above.
const marked = (whole: string, where: string) => {
  const mark = (n: number) => `\n\n[the first ${n} of ${whole.length} characters of this entry's text. The whole is ${where}]`;
  let n = TEXT - mark(0).length;
  while (n > 0 && n + mark(n).length > TEXT) n--;
  return { text: whole.slice(0, n) + mark(n), mark: mark(n), shown: n };
};
// text and cut: the entry's text with no summary, cut when long. whole: the text this tool makes, uncut. body: the file
// with its frontmatter taken off, which a summarizer reads. chars and lines are the file's.
type Doc = { name: string; id: string; named: boolean; file: string; bytes: Uint8Array; public: boolean; scoped: boolean; title: string; text: string; cut: { mark: string; shown: number; of: number } | null; sha256: string; url: string; source: string; at: string; rev: string; path: string;
  whole: string; long: boolean; body: string; chars: number; lines: number };
const doc = (name: string, bytes: Uint8Array, more: { at: string; rev: string; path: string; url: string; source: string; private?: boolean }): Doc => {
  const raw = Buffer.from(bytes).toString("utf8");
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(raw), top = fm ? fm[1] : "", body = fm ? raw.slice(fm[0].length) : raw;
  const h1 = /^# +(.+)$/m.exec(body);
  const topics = (/^topics: *(.+)$/m.exec(top) || [])[1] || "";
  // Topics first: the service embeds the first 1500 characters of title and text.
  const whole = [topics && "Topics: " + topics, body.replace(/^# +.+\n/m, "").trim()].filter(Boolean).join("\n\n");
  const open = !more.private && /^scope:.*\bin-notebook\b/m.test(top), file = `${FILES}${more.source}/${more.path}`;
  const m = whole.length > TEXT ? marked(whole, `the file ${file} in this Brain's brain-static: static.get?path=${file}` + (open ? `, and /static/${file} at the Brain's address` : "")) : null;
  const id = "doc:" + name.toLowerCase();
  return { name, id, named: ID.test(id) && id.length <= ID_MAX && PATH.test(file) && file.length <= PATH_MAX, file, bytes, public: open, scoped: !!more.private || /^scope:/m.test(top),
    title: (h1 ? h1[1] : name).slice(0, 500), text: m ? m.text : whole, cut: m && { mark: m.mark, shown: m.shown, of: whole.length }, sha256: sha(bytes), url: more.url, source: more.source, at: more.at, rev: more.rev, path: more.path,
    whole, long: !!m, body, chars: raw.length, lines: raw.split("\n").length - (raw.endsWith("\n") ? 1 : 0) };
};

// ---- A long doc's entry with a summary (sd-2-one-summarizer; design piece 2 of plan/cloud-brain-docs-summarised-for-search.md):
//   <first paragraph>\n\n<sections>\n\n<LINE>\n<the second line>\n\n<the doc's start, cut so the whole is TEXT>
// The head, to the end of LINE, is the summarizer's and is carried over a put as it is kept; the rest is made anew.
const SUMMARY = "Summary by summarizer";
const LINE = /^Summary by summarizer \(([^)]*)\), (\S+), of (\S+) as it was with sha256 ([0-9a-f]{64})\.$/m;
const summaryOf = (text: unknown) => {
  const m = typeof text === "string" ? LINE.exec(text) : null;
  return m ? { head: (text as string).slice(0, m.index + m[0].length), at: m.index, model: m[1], day: m[2], path: m[3], sha256: m[4] } : null;
};
const headOf = (x: { lead: string; sections: string; model: string; day: string; path: string; sha256: string }) =>
  `${x.lead}\n\n${x.sections ? x.sections + "\n\n" : ""}${SUMMARY} (${x.model}), ${x.day}, of ${x.path} as it was with sha256 ${x.sha256}.`;
const second = (d: Doc) => `The whole doc is the file ${d.file} in this Brain's brain-static, ${d.chars} characters: static.get?path=${d.file}${d.public ? `, and /static/${d.file} at the Brain's address` : ""}. Its start follows.`;
const withSummary = (d: Doc, head: string) => { const top = `${head}\n${second(d)}\n\n`; return top + d.whole.slice(0, Math.max(0, TEXT - top.length)); };

// plan/cloud-brain-*.md: the designs and the backlog. They have no frontmatter, so they are entered private.
// tools/cloud-brain/post-mortems/*.md: one file a post mortem, private the same way. A doc's name is its file's
// name, the last part of the path (pm-1-file-and-search; until it the second part, which here is `cloud-br`).
// -z: without it git writes a path that has a character outside ASCII in quotes and escapes, and the doc matches no pattern (i1546).
const PM = "tools/cloud-brain/post-mortems/";
const listed = git(root, "ls-tree", "-r", "-z", "--name-only", SRC, "knowledge/", "plan/", PM);
const docs: Doc[] = (listed.status === 0 ? listed.stdout.toString("utf8") : "").split("\0")
  .filter((p) => /^knowledge\/[^/]+\.md$/.test(p) || /^plan\/cloud-brain-[^/]*\.md$/.test(p) || /^tools\/cloud-brain\/post-mortems\/[^/]+\.md$/.test(p))
  .map((p) => doc(p.split("/").at(-1)!.slice(0, -3), git(root, "show", `${SRC}:${p}`).stdout, { at: root, rev: SRC, path: p, url: REPO + p, source: "lopecode-dev" }));

// The three files of cloud-brain-dev, at the commit origin/main records: a landing fetches nothing of that repository.
const DEV = "cloud-brain-dev", DEV_FILES: [string, string][] = [["AGENTS.md", "agents"], ["README.md", "readme"], ["philosophy.md", "philosophy"]];
const devIds = DEV_FILES.map(([, n]) => `doc:${DEV}-${n}`);
const pin = (/^160000 commit ([0-9a-f]+)\t/.exec(line(root, "ls-tree", SRC, DEV)) || [])[1];
let devLeft = "";
if (!pin) devLeft = `${SRC} records no ${DEV}; its three docs are left as they are`;
else if (git(join(root, DEV), "cat-file", "-e", pin + "^{commit}").status !== 0) devLeft = `the checkout of ${DEV} lacks commit ${pin.slice(0, 8)}, which ${SRC} records; its three docs are left as they are`;
else {
  const url = line(root, "config", "--blob", `${SRC}:.gitmodules`, `submodule.${DEV}.url`);
  for (const [f, n] of DEV_FILES) {
    const r = git(join(root, DEV), "show", `${pin}:${f}`);
    if (r.status === 0) docs.push(doc(`${DEV}-${n}`, r.stdout, { at: join(root, DEV), rev: pin, path: f, url, source: DEV, private: true }));
  }
}

const kept = () => {
  const out = new Map<string, any>();
  for (let cursor = ""; ; ) {
    const r = call(`knowledge.list?kind=doc&limit=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    for (const e of r.entries) out.set(e.id, e);
    if (!(cursor = r.cursor) || !r.entries.length) return out;
  }
};

// The files kept under FILES, by path.
const keptFiles = () => new Map<string, any>(call(`static.list?prefix=${FILES}`).files.map((f: any) => [f.path, f]));

// When the file first differed from what the entry holds: the commit after the last one whose file has the
// entry's sha256. With no such commit, the last commit of the file.
const staleSince = (d: Doc, entrySha: string) => {
  const log = line(d.at, "log", "--format=%H %ct", d.rev, "--", d.path).split("\n").filter(Boolean).map((l) => l.split(" "));
  let first: string[] | null = null;
  for (const [h, t] of log) {
    if (first && sha(git(d.at, "show", `${h}:${d.path}`).stdout) === entrySha) return { at: Number(first[1]) * 1000, from: "commit " + first[0].slice(0, 8) };
    first = [h, t];
  }
  return log.length ? { at: Number(log[0][1]) * 1000, from: `commit ${log[0][0].slice(0, 8)}, no commit has the entry's file` } : null;
};

const age = (ms: number) => { const h = (Date.now() - ms) / 36e5; return h < 48 ? h.toFixed(1) + " h" : (h / 24).toFixed(1) + " d"; };
// summary: the kept entry's, of a long doc. noText: a long doc whose kept entry was answered with no text, so that
// nothing says whether it holds a summary. unmarked: a long doc with no summary whose entry does not end with the cut's line.
const rowsOf = (have: Map<string, any>, files: Map<string, any>) => docs.map((d) => {
  const e = have.get(d.id), f = files.get(d.file), noText = d.long && !!e && typeof e.text !== "string", summary = d.long && e ? summaryOf(e.text) : null;
  return { ...d, entry: e, summary, noText, unmarked: d.long && !!e && !noText && !summary && !e.text.endsWith(d.cut!.mark),
    // The kept file is the doc's when it has the doc's bytes and visibility. A badname has none and is not counted.
    fileIs: !d.named ? "none" : !f ? "not kept" : f.sha256 === d.sha256 && !!f.public === d.public ? "right" : "differs",
    state: !d.named ? "badname" : !e ? "missing" : e.sha256 === d.sha256 && !!e.public === d.public && e.file === d.file ? "fresh" : "stale" };
});
type Row = ReturnType<typeof rowsOf>[number];

// ---- When a summary is due. The state of the summarizer's runs is <state>/docs: journal.jsonl, <name>.running.
const stateDocs = state ? join(state, "docs") : "";
const journalFile = stateDocs ? join(stateDocs, "journal.jsonl") : "";
const journal = (): any[] => (journalFile && existsSync(journalFile) ? readFileSync(journalFile, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : []);
// Refused twice for this file: no agent is started for it again without --again. A refusal of a --dry run holds a
// later --dry run and no other: it is not in `refused` of status, and a run that puts is not held by it.
// A put at this file after the refusal (--again) ends it: until sd-4-the-rest-and-the-release-line it did not, and
// --check-summaries failed cloud-brain-brain-docs-entered-by-hand on cb4 with its summary put (2026-10-13, 09:10 CEST).
const refusedAt = (lines: any[], r: { name: string; sha256: string }, dry = false) =>
  lines.filter((l) => l.name === r.name && l.sha256 === r.sha256 && (l.outcome === "refused" || l.outcome === "put") && (dry || !l.dry)).at(-1)?.outcome === "refused";
const RUNNING_MS = 10 * 60000;
const DUE_SHOWN = 8;
const runningFile = (name: string) => join(stateDocs, name + ".running");
const running = (name: string) => { try { return !!stateDocs && Date.now() - Number(readFileSync(runningFile(name), "utf8")) < RUNNING_MS; } catch { return false; } };
// null when no summary is due. `since` is the clock --check-summaries counts 24 hours from; `stale` is the entry's staleSince
// (0 for a doc that never had a summary: knowledge.list?stale=true answers the docs whose summary is due again).
//   no summary: due since the file's last commit;
//   a summary of another version of the file: due when the lines added and deleted since that version (git diff --numstat)
//   are over a tenth of the file's lines, since the first commit that took it over; and when no commit has that version.
const dueOf = (r: Row): { since: number; stale: number; why: string } | null => {
  if (!r.long || !r.named || r.noText) return null;
  const log = line(r.at, "log", "--format=%H %ct", r.rev, "--", r.path).split("\n").filter(Boolean).map((l) => l.split(" "));
  const last = log.length ? Number(log[0][1]) * 1000 : 0;
  if (!r.summary) return { since: last, stale: 0, why: "no summary" };
  if (r.summary.sha256 === r.sha256) return null;
  const i = log.findIndex(([h]) => sha(git(r.at, "show", `${h}:${r.path}`).stdout) === r.summary!.sha256);
  if (i < 0) return { since: last, stale: last, why: "no commit has the version summarized" };
  for (let k = i - 1; k >= 0; k--) {
    const [a, d] = line(r.at, "diff", "--numstat", log[i][0], log[k][0], "--", r.path).split("\t").map(Number), n = (a || 0) + (d || 0);
    if (n > r.lines / 10) return { since: Number(log[k][1]) * 1000, stale: Number(log[k][1]) * 1000, why: `${n} lines added and deleted since the version summarized, over a tenth of ${r.lines} (commit ${log[k][0].slice(0, 8)})` };
  }
  return null;
};
const wrong = (rows: { fileIs: string }[]) => rows.filter((r) => r.fileIs === "not kept" || r.fileIs === "differs");
const badNames = docs.filter((d) => !d.named).map((d) => d.name);
const cutOf = (rows: { long: boolean; summary: unknown }[]) => rows.filter((r) => r.long && !r.summary).length;
const read = { ...(badNames.length ? { badNames } : {}), source: `${SRC}@${head.slice(0, 8)}`, ...(devLeft ? { cloudBrainDev: devLeft } : {}) };
const BAD = `its id is not one knowledge.put takes (${ID.source}, ${ID_MAX} characters at most), or its path not one static.put takes: not entered until the file has another name`;

// The entry of a put. A long doc whose entry has a summary keeps it: the head as kept, the second line and the doc's
// start as they are now, staleSince the time its summary came due (0: not due). plain: a long doc as it was put before
// summaries, cut, whatever the entry holds. A doc that fits is entered whole, and a summary or a staleSince it had is dropped.
const entryOf = (r: Row, plain = false) => {
  const base = { id: r.id, kind: "doc", public: r.public, title: r.title, url: r.url, source: r.source, file: r.file, sha256: r.sha256, method: "knowledge-docs", tags: ["knowledge-doc"] };
  if (!r.long) return { ...base, text: r.whole, ...(r.entry && (r.entry.staleSince || summaryOf(r.entry.text)) ? { staleSince: 0 } : {}) };
  if (plain) return { ...base, text: r.text, staleSince: 0 };
  if (r.summary) return { ...base, text: withSummary(r, r.summary.head), staleSince: dueOf(r)?.stale ?? 0 };
  return { ...base, text: r.text };
};
// 25 entries a call, after their files. The file first: when the entry's put then fails, the entry has the older sha256, is stale, and the next put sends both.
const send = (batch: { d: Doc; entry: Record<string, any> }[]) => {
  let entered = 0, changed = 0, vectors = 0;
  for (let i = 0; i < batch.length; i += 25) {
    const part = batch.slice(i, i + 25);
    for (const { d } of part) {
      const f = call(`static.put?path=${d.file}&public=${d.public}&tags=${FILE_TAG}`, undefined, d.bytes);
      if (f.sha256 !== d.sha256 || !!f.public !== d.public) throw new Error(`static.put: ${d.file} was kept with sha256 ${f.sha256} and public ${f.public}, not the doc's ${d.sha256} and ${d.public}`);
    }
    const r = call("knowledge.put", { entries: part.map((x) => x.entry) });
    entered += r.entered; changed += r.changed; vectors += r.vectors ?? 0;
  }
  return { entered, changed, vectors };
};

if (cmd === "status" && flag("--check-summaries")) {
  // Reads only. The long docs, or the named ones. A doc fails when its entry has a summary that is not in its form, when
  // its summary has been due for over 24 hours, and when the journal has it refused at this file; --except name=issue names one that may.
  const { leadMax, DOC_HEADINGS } = await import("./summarize-papers.ts");
  const except = Object.fromEntries((opt("--except") || "").split(",").filter(Boolean).map((x) => { const i = x.lastIndexOf("="); return i < 0 ? [x, ""] : [x.slice(0, i), x.slice(i + 1)]; }));
  const lines = journal(), all = rowsOf(kept(), keptFiles()), out: any[] = [];
  const unknown = names.filter((n) => !all.some((r) => r.name === n));
  for (const r of names.length ? all.filter((r) => names.includes(r.name)) : all.filter((r) => r.long)) {
    const fails: string[] = [], due = dueOf(r), e = r.entry;
    if (r.summary) {
      const lead = e.text.split("\n\n")[0], max = leadMax(e.title ?? r.title), found = e.text.slice(0, r.summary.at).split("\n").filter((l: string) => /^##\s/.test(l)).map((l: string) => l.replace(/^##\s+/, "").trim());
      if (lead.length > max) fails.push(`the first paragraph is ${lead.length} characters, over ${max}`);
      // No heading: the first paragraph alone (summarize --first-paragraph).
      if (found.length && found.join("|") !== DOC_HEADINGS.join("|")) fails.push("the five headings are not there in their order");
      if (!e.text.slice(r.summary.head.length).startsWith(`\nThe whole doc is the file ${e.file} in `)) fails.push(`the line after the summary's does not name the entry's file ${e.file}`);
      if (e.text.length > TEXT) fails.push(`the text is ${e.text.length} characters, over ${TEXT}`);
    }
    if (due && Date.now() - due.since > 24 * 36e5) fails.push(`a summary has been due for ${age(due.since)}: ${due.why}`);
    if (refusedAt(lines, r)) fails.push("refused twice at this file (the journal)");
    const row = { name: r.name, state: !r.long ? "short" : r.noText ? "no text" : r.summary ? (r.summary.sha256 === r.sha256 ? "summarized" : "behind") : "no summary", ...(due ? { due: age(due.since) } : {}),
      ...(fails.length ? { fails } : {}), ...(fails.length && r.name in except ? { except: except[r.name] } : {}) };
    out.push(row);
    console.log(JSON.stringify(row));
  }
  const failing = out.filter((r) => r.fails && !("except" in r)).map((r) => r.name);
  console.log(JSON.stringify({ checked: out.length, summarized: out.filter((r) => (r.state === "summarized" || r.state === "behind") && !r.fails).length, excepted: out.filter((r) => "except" in r).map((r) => r.name), failing, ...(unknown.length ? { unknown } : {}), ...read }));
  process.exit(failing.length || unknown.length ? 1 : 0);
} else if (cmd === "status") {
  const have = kept(), rows = rowsOf(have, keptFiles()), lines = journal();
  const dues = new Map(rows.map((r) => [r.name, dueOf(r)] as const));
  for (const r of rows) {
    const s = r.state === "stale" && r.entry.sha256 !== r.sha256 ? staleSince(r, r.entry.sha256) : null;
    const why = r.state !== "stale" || s ? [] : [!!r.entry.public !== r.public ? "visibility differs" : "", r.entry.file !== r.file ? (r.entry.file ? `the entry names the file ${r.entry.file}` : "the entry names no file") : ""];
    const note = s ? `stale ${age(s.at)} (since ${new Date(s.at).toISOString().slice(0, 16)}Z, ${s.from})` : r.state === "badname" ? BAD : why.filter(Boolean).join(", ");
    const sum = r.summary ? `summary by ${r.summary.model} of ${r.summary.day}${r.summary.sha256 === r.sha256 ? "" : ", behind"}` : r.noText ? "long, the entry was answered with no text" : r.long ? `cut ${r.cut!.shown} of ${r.cut!.of}${r.unmarked ? ", unmarked" : ""}` : "";
    console.log(r.state.padEnd(8), (r.public ? "public " : "private"), r.name, [note, sum, r.fileIs === "not kept" || r.fileIs === "differs" ? "file " + r.fileIs : ""].filter(Boolean).join("; "));
  }
  const n = (s: string) => rows.filter((r) => r.state === s).length;
  // Only an entry this tool entered: kind `doc` is also filled by other methods, whose entries have no file here.
  const gone = [...have.values()].filter((e) => e.method === "knowledge-docs" && !docs.some((d) => d.id === e.id) && !(devLeft && devIds.includes(e.id))).map((e) => e.id);
  const noText = rows.filter((r) => r.noText).map((r) => r.name);
  console.log(JSON.stringify({ docs: rows.length, fresh: n("fresh"), stale: n("stale"), missing: n("missing"), cut: cutOf(rows), unmarked: rows.filter((r) => r.unmarked).length,
    long: rows.filter((r) => r.long).length, summarized: rows.filter((r) => r.summary).length, behind: rows.filter((r) => r.summary && r.summary.sha256 !== r.sha256).length,
    due: rows.filter((r) => dues.get(r.name)).map((r) => r.name), refused: rows.filter((r) => dues.get(r.name) && refusedAt(lines, r)).map((r) => r.name), ...(noText.length ? { noText } : {}),
    files: rows.filter((r) => r.fileIs === "right").length, filesWrong: wrong(rows).map((r) => r.name), entriesWithNoFile: gone, ...read }));
  if (flag("--check") && n("stale") + n("missing") + badNames.length > 0) process.exit(1);
} else if (cmd === "put") {
  const rows = rowsOf(kept(), keptFiles()).filter((r) => r.named), plain = flag("--plain");
  if (plain && (!names.length || flag("--all") || flag("--stale"))) { console.error("put --plain <name>…: the named docs, each as it is put with no summary"); process.exit(1); }
  const picked = flag("--all") ? rows : flag("--stale") ? rows.filter((r) => r.state !== "fresh" || r.unmarked || r.fileIs !== "right") : rows.filter((r) => names.includes(r.name));
  // Left as they are by the docs step (--stale), and named: a long doc whose entry was answered with no text (nothing says
  // whether it holds a summary; a put by name enters it cut), and a doc a summarizer is running on (its summary would
  // land between this read and this put).
  const noText = flag("--stale") ? rows.filter((r) => r.noText) : [], busy = flag("--stale") ? picked.filter((r) => !r.noText && running(r.name)) : [];
  const pick = picked.filter((r) => !noText.includes(r) && !busy.includes(r));
  const left = [badNames.length ? `not entered, ${BAD.replace("its id is", "the id is")}: ${badNames.join(", ")}` : "",
    noText.length ? `left as they are, long and the entry answered with no text (put <name> enters one cut): ${noText.map((r) => r.name).join(", ")}` : "",
    busy.length ? `left for the next put, a summarizer is running on them: ${busy.map((r) => r.name).join(", ")}` : ""].filter(Boolean).join("; ");
  const unscoped = pick.filter((r) => !r.scoped).map((r) => r.name);
  if (unscoped.length) console.log("no scope in frontmatter, entered private:", unscoped.join(", "));
  // The docs step says which docs wait for a summarizer, in a line before its last (design piece 4): those `summarize --due`
  // would start an agent for, so not one refused twice at this file or with a summarizer running. DUE_SHOWN names, then a count.
  const dueLine = () => {
    if (!flag("--stale")) return;
    const lines = journal(), due = rows.filter((r) => dueOf(r) && !refusedAt(lines, r) && !running(r.name)).map((r) => r.name);
    if (due.length) console.log("summaries due: " + due.slice(0, DUE_SHOWN).join(", ") + (due.length > DUE_SHOWN ? `, and ${due.length - DUE_SHOWN} more` : ""));
  };
  if (!pick.length) { dueLine(); console.log("nothing to put" + (left ? "; " + left : "")); process.exit(0); }
  const t0 = Date.now(), keeps = (r: Row) => !plain && !!r.summary;
  const { entered, changed, vectors } = send(pick.map((r) => ({ d: r, entry: entryOf(r, plain) })));
  dueLine();
  console.log(JSON.stringify({ put: pick.length, public: pick.filter((d) => d.public).length, private: pick.filter((d) => !d.public).length, cut: pick.filter((r) => r.long && !keeps(r)).length, unmarked: pick.filter((r) => r.unmarked).length,
    summarized: pick.filter(keeps).length, ...(plain ? { plain: true } : {}), ...(noText.length ? { noText: noText.map((r) => r.name) } : {}), ...(busy.length ? { running: busy.map((r) => r.name) } : {}),
    filesWrong: wrong(pick).length, entered, changed, vectors, ms: Date.now() - t0, ...read }));
} else if (cmd === "summarize") {
  // One agent a doc, one after another (design piece 3). --due: the docs whose summary is due and that the journal has
  // not as refused at this file; names: those docs, due or not. --again: also one refused twice at this file.
  // --dry: the summary to <state>/docs/<name>.summary.txt and nothing put. --model (haiku). --usd-max N.
  // --first-paragraph: the sections the agent wrote are judged and left out of the entry.
  const { agentRunner, canary, summarize, wrap } = await import("./summarize-papers.ts");
  const dry = flag("--dry"), again = flag("--again"), firstOnly = flag("--first-paragraph"), model = opt("--model") || "haiku", usdMax = opt("--usd-max") === undefined ? Infinity : Number(opt("--usd-max"));
  if (!(usdMax >= 0)) { console.error("--usd-max N: a number of dollars, 0 or more"); process.exit(2); }
  if (!flag("--due") === !names.length) { console.error("summarize --due | <name>…   [--again] [--dry] [--first-paragraph] [--model M] [--usd-max N]"); process.exit(1); }
  if (!stateDocs) throw new Error("no state directory: not in a git checkout and no BRAIN_STATE_DIR");
  mkdirSync(stateDocs, { recursive: true });
  const before = journal(), all = rowsOf(kept(), keptFiles()).filter((r) => r.named);
  const note = (row: Record<string, any>) => appendFileSync(journalFile, JSON.stringify({ at: Date.now(), ...(dry ? { dry: true } : {}), ...(firstOnly && !("canary" in row) ? { firstParagraph: true } : {}), ...row }) + "\n");
  const rows: any[] = [], todo: Row[] = [];
  const say = (row: Record<string, any>) => { rows.push(row); console.log(JSON.stringify(row)); };
  const end = (code: number, last: Record<string, any>) => { rmSync(tmpDir, { recursive: true, force: true }); console.log(JSON.stringify(last)); process.exit(code); };
  const unknown = names.filter((n) => !all.some((r) => r.name === n));
  for (const r of names.length ? all.filter((r) => names.includes(r.name)) : all.filter((r) => dueOf(r))) {
    const skipped = !r.long ? `${r.whole.length} characters: it fits an entry and is entered whole` : r.noText ? "the entry was answered with no text" : running(r.name) ? "a summarizer is running on it" : !again && refusedAt(before, r, dry) ? "refused-before" : "";
    // --due leaves a doc refused before unsaid; a named one is said.
    if (!skipped) todo.push(r); else if (names.length || skipped !== "refused-before") say({ name: r.name, skipped }); else rows.push({ name: r.name, skipped });
  }
  let stopped = "", code = 0;
  const spent = () => Math.round(rows.reduce((a, r) => a + (r.usd || 0), 0) * 1e6) / 1e6;
  const last = () => ({ docs: stateDocs, ...(dry ? { dry: true } : {}), picked: todo.length, put: rows.filter((r) => r.outcome === "put").length, dry_written: rows.filter((r) => r.outcome === "dry").length, refused: rows.filter((r) => r.outcome === "refused").length,
    failed: rows.filter((r) => r.outcome === "failed").length, refusedBefore: rows.filter((r) => r.skipped === "refused-before").map((r) => r.name), skipped: rows.filter((r) => r.skipped && r.skipped !== "refused-before").map((r) => r.name),
    usd: spent(), ...(unknown.length ? { unknown } : {}), ...(stopped ? { stopped } : {}), ...read });
  // No doc to run: no agent is started, the canary's neither.
  if (!todo.length) end(unknown.length ? 1 : 0, last());
  const agent = agentRunner();
  const c = canary(agent, state);
  if (c.row) note(c.row);
  if (c.stopped) { stopped = c.row ? `${c.stopped}. No doc was read and nothing was put.` : c.stopped; end(3, last()); }
  for (const r of todo) {
    if (spent() >= usdMax) { stopped = `--usd-max ${usdMax}: the agents of this run have cost $${spent()}; ${r.name} and the docs after it were not started`; break; }
    // What the agent reads: the file as git has it, its frontmatter taken off, no line over 1500 characters.
    const text = r.body.split("\n").flatMap((l: string) => (l.length > 1500 ? wrap(l) : [l])).join("\n"), file = join(tmpDir, r.name + ".md");
    writeFileSync(file, text);
    writeFileSync(runningFile(r.name), String(Date.now()));
    let got: ReturnType<typeof summarize>;
    try { got = summarize({ kind: "doc", file, lines: text.split("\n").length - (text.endsWith("\n") ? 1 : 0), title: r.title, model, agent }); } finally { rmSync(runningFile(r.name), { force: true }); }
    const { outcome, why, stop, result, answers, lead, sections, numbers: not, refused, ...ran } = got;
    // A first answer that was refused is kept, whatever the second was: what it was refused for is read from it.
    if (answers.length > 1) writeFileSync(join(stateDocs, r.name + ".first-answer.txt"), answers[0]);
    const base = { name: r.name, id: r.id, ...ran, chars: text.length, sha256: r.sha256, lead: lead.length, sections: sections.length, refused };
    if (outcome === "failed") {
      note({ ...base, outcome, why });
      say({ name: r.name, outcome, why, usd: ran.usd });
      if (stop) { stopped = why; code = 3; break; }
      code = code || 1;
      continue;
    }
    if (outcome === "refused") {
      note({ ...base, outcome, numbers: not });
      writeFileSync(join(stateDocs, r.name + ".refused.txt"), result!);
      say({ name: r.name, outcome, lead: lead.length, leadMax: ran.leadMax, sections: sections.length, refused, usd: ran.usd });
      continue;
    }
    // The file is read again: when origin/main has moved on, the summary's line names the version it was made from, and the start and the sha256 are the newer file's.
    const bytes = git(r.at, "show", `${r.rev}:${r.path}`);
    if (bytes.status !== 0) { note({ ...base, outcome: "failed", why: "the file is no longer there" }); say({ name: r.name, outcome: "failed", why: "the file is no longer there", usd: ran.usd }); code = code || 1; continue; }
    const now = doc(r.name, bytes.stdout, { at: r.at, rev: r.rev, path: r.path, url: r.url, source: r.source, private: r.source === DEV });
    const head = headOf({ lead, sections: firstOnly ? "" : sections, model, day: new Date().toISOString().slice(0, 10), path: `${r.source}/${r.path}`, sha256: r.sha256 });
    const whole = now.long ? withSummary(now, head) : now.whole;
    if (dry) {
      writeFileSync(join(stateDocs, r.name + ".summary.txt"), whole);
      note({ ...base, length: whole.length, outcome: "dry" });
      say({ name: r.name, outcome: "dry", lead: lead.length, leadMax: ran.leadMax, sections: sections.length, length: whole.length, refused, usd: ran.usd });
      continue;
    }
    let put: any, bad = "";
    try { put = send([{ d: now, entry: { ...entryOf({ ...r, ...now, summary: null } as Row), text: whole, staleSince: 0 } }]); } catch (x: any) { bad = String(x?.message || x).slice(0, 300); }
    note({ ...base, length: whole.length, outcome: bad ? "failed" : "put", put: put ?? null, ...(now.sha256 !== r.sha256 ? { putSha256: now.sha256 } : {}), ...(bad ? { why: bad } : {}) });
    say({ name: r.name, outcome: bad ? "failed" : "put", lead: lead.length, leadMax: ran.leadMax, sections: sections.length, length: whole.length, refused, usd: ran.usd, put: put ?? null, ...(bad ? { why: bad } : {}) });
    if (bad) { stopped = `${bad}: ${r.name} was not put and the docs after it were not started`; break; }
  }
  end(code || (stopped || unknown.length ? 1 : 0), last());
} else {
  console.error("usage: knowledge-docs.ts status [--check] | status --check-summaries [<name>…] [--except name=issue,…] | put --all | --stale | <name>… | --plain <name>… | summarize --due | <name>… [--again] [--dry] [--first-paragraph] [--model M] [--usd-max N]   [--owner] [--limit=SECONDS]");
  process.exit(1);
}
