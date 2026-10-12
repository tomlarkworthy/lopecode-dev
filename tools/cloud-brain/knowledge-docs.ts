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
// The id is the file's name in lower case. A name that gives no id knowledge.put takes (a space, a
// character outside ASCII, anything but a-z 0-9 . _ : -), or a path static.put does not take (a `:`, over 200 characters), is `badname` in status and `badNames` in the last line, and is in no put (i1546).
// tests/tools/knowledge-docs.test.ts
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(new URL(import.meta.url).pathname), root = join(here, "..", "..");
const BASE = process.env.BRAIN_BASE;
if (!BASE) throw new Error("BRAIN_BASE");
const [cmd, ...args] = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const names = args.filter((a) => !a.startsWith("--"));
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

const tmp = join(mkdtempSync(join(tmpdir(), "kdocs-")), "body.json");
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
type Doc = { name: string; id: string; named: boolean; file: string; bytes: Uint8Array; public: boolean; scoped: boolean; title: string; text: string; cut: { mark: string; shown: number; of: number } | null; sha256: string; url: string; source: string; at: string; rev: string; path: string };
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
    title: (h1 ? h1[1] : name).slice(0, 500), text: m ? m.text : whole, cut: m && { mark: m.mark, shown: m.shown, of: whole.length }, sha256: sha(bytes), url: more.url, source: more.source, at: more.at, rev: more.rev, path: more.path };
};

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
const rowsOf = (have: Map<string, any>, files: Map<string, any>) => docs.map((d) => {
  const e = have.get(d.id), f = files.get(d.file);
  return { ...d, entry: e, unmarked: !!d.cut && !!e && !(typeof e.text === "string" && e.text.endsWith(d.cut.mark)),
    // The kept file is the doc's when it has the doc's bytes and visibility. A badname has none and is not counted.
    fileIs: !d.named ? "none" : !f ? "not kept" : f.sha256 === d.sha256 && !!f.public === d.public ? "right" : "differs",
    state: !d.named ? "badname" : !e ? "missing" : e.sha256 === d.sha256 && !!e.public === d.public && e.file === d.file ? "fresh" : "stale" };
});
const wrong = (rows: { fileIs: string }[]) => rows.filter((r) => r.fileIs === "not kept" || r.fileIs === "differs");
const badNames = docs.filter((d) => !d.named).map((d) => d.name);
const cutOf = (rows: { cut: Doc["cut"] }[]) => rows.filter((r) => r.cut).length;
const read = { ...(badNames.length ? { badNames } : {}), source: `${SRC}@${head.slice(0, 8)}`, ...(devLeft ? { cloudBrainDev: devLeft } : {}) };
const BAD = `its id is not one knowledge.put takes (${ID.source}, ${ID_MAX} characters at most), or its path not one static.put takes: not entered until the file has another name`;

if (cmd === "status") {
  const have = kept(), rows = rowsOf(have, keptFiles());
  for (const r of rows) {
    const s = r.state === "stale" && r.entry.sha256 !== r.sha256 ? staleSince(r, r.entry.sha256) : null;
    const why = r.state !== "stale" || s ? [] : [!!r.entry.public !== r.public ? "visibility differs" : "", r.entry.file !== r.file ? (r.entry.file ? `the entry names the file ${r.entry.file}` : "the entry names no file") : ""];
    const note = s ? `stale ${age(s.at)} (since ${new Date(s.at).toISOString().slice(0, 16)}Z, ${s.from})` : r.state === "badname" ? BAD : why.filter(Boolean).join(", ");
    console.log(r.state.padEnd(8), (r.public ? "public " : "private"), r.name, [note, r.cut ? `cut ${r.cut.shown} of ${r.cut.of}${r.unmarked ? ", unmarked" : ""}` : "", r.fileIs === "not kept" || r.fileIs === "differs" ? "file " + r.fileIs : ""].filter(Boolean).join("; "));
  }
  const n = (s: string) => rows.filter((r) => r.state === s).length;
  // Only an entry this tool entered: kind `doc` is also filled by other methods, whose entries have no file here.
  const gone = [...have.values()].filter((e) => e.method === "knowledge-docs" && !docs.some((d) => d.id === e.id) && !(devLeft && devIds.includes(e.id))).map((e) => e.id);
  console.log(JSON.stringify({ docs: rows.length, fresh: n("fresh"), stale: n("stale"), missing: n("missing"), cut: cutOf(rows), unmarked: rows.filter((r) => r.unmarked).length,
    files: rows.filter((r) => r.fileIs === "right").length, filesWrong: wrong(rows).map((r) => r.name), entriesWithNoFile: gone, ...read }));
  if (flag("--check") && n("stale") + n("missing") + badNames.length > 0) process.exit(1);
} else if (cmd === "put") {
  const rows = rowsOf(kept(), keptFiles()).filter((r) => r.named);
  const pick = flag("--all") ? rows : flag("--stale") ? rows.filter((r) => r.state !== "fresh" || r.unmarked || r.fileIs !== "right") : rows.filter((r) => names.includes(r.name));
  const left = badNames.length ? `not entered, ${BAD.replace("its id is", "the id is")}: ${badNames.join(", ")}` : "";
  const unscoped = pick.filter((r) => !r.scoped).map((r) => r.name);
  if (unscoped.length) console.log("no scope in frontmatter, entered private:", unscoped.join(", "));
  if (!pick.length) { console.log("nothing to put" + (left ? "; " + left : "")); process.exit(0); }
  let entered = 0, changed = 0, vectors = 0;
  const t0 = Date.now();
  for (let i = 0; i < pick.length; i += 25) {
    const batch = pick.slice(i, i + 25);
    // The file first: when the entry's put then fails, the entry has the older sha256, is stale, and the next put sends both.
    for (const d of batch) {
      const f = call(`static.put?path=${d.file}&public=${d.public}&tags=${FILE_TAG}`, undefined, d.bytes);
      if (f.sha256 !== d.sha256 || !!f.public !== d.public) throw new Error(`static.put: ${d.file} was kept with sha256 ${f.sha256} and public ${f.public}, not the doc's ${d.sha256} and ${d.public}`);
    }
    const r = call("knowledge.put", { entries: batch.map((d) => ({ id: d.id, kind: "doc", public: d.public, title: d.title, text: d.text, url: d.url, source: d.source, file: d.file, sha256: d.sha256, method: "knowledge-docs", tags: ["knowledge-doc"] })) });
    entered += r.entered; changed += r.changed; vectors += r.vectors ?? 0;
  }
  console.log(JSON.stringify({ put: pick.length, public: pick.filter((d) => d.public).length, private: pick.filter((d) => !d.public).length, cut: cutOf(pick), unmarked: pick.filter((r) => r.unmarked).length, filesWrong: wrong(pick).length, entered, changed, vectors, ms: Date.now() - t0, ...read }));
} else {
  console.error("usage: knowledge-docs.ts status [--check] | put --all | --stale | <name>…   [--owner] [--limit=SECONDS]");
  process.exit(1);
}
