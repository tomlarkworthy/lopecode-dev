// knowledge-docs.ts enters the docs of origin/main into a Brain's knowledge base with the token loop-docs.
// Issue bd-1-knowledge-docs-as-loop-docs, task 1 of plan/cloud-brain-brain-docs-entered-by-hand.md (R2, R3, R4, R5, R6).
//
//   bun test ./tests/tools/knowledge-docs.test.ts
//   KNOWLEDGE_DOCS_TS=/path/to/another/knowledge-docs.ts bun test …
// Every case makes a repository of its own in a temporary directory, with a copy of the tool at
// tools/cloud-brain/knowledge-docs.ts and a fake brain.ts beside it, so no case calls a Brain.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";

const root = resolve(import.meta.dir, "../..");
const tool = process.env.KNOWLEDGE_DOCS_TS || join(root, "tools/cloud-brain/knowledge-docs.ts");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// brain.ts curl as the tool meets it: the body on stdout, the status last on stderr; a name with no token
// kept is answered on stdout with exit 1 before any call is sent.
const FAKE = `import { appendFileSync, existsSync, readFileSync } from "node:fs";
const a = process.argv.slice(2), dir = process.env.FAKE_DIR;
const at = a.find((x) => x.startsWith("@"));
const body = at ? JSON.parse(readFileSync(at.slice(1), "utf8")) : null;
appendFileSync(dir + "/calls.jsonl", JSON.stringify({ args: a, body, state: process.env.BRAIN_STATE_DIR ?? null }) + "\\n");
const as = a.indexOf("--as");
if (as >= 0 && existsSync(dir + "/no-token")) {
  console.log('no token "' + a[as + 1] + '" is kept; make one with: token ' + a[as + 1] + " <method…>, or for an agent's tracker calls: agent-token <role>");
  process.exit(1);
}
if (a[1].includes("knowledge.list")) console.log(JSON.stringify({ entries: JSON.parse(readFileSync(dir + "/entries.json", "utf8")) }));
else console.log(JSON.stringify({ entered: body.entries.length, changed: 0, vectors: 0 }));
console.error(" [200]");
`;

const A = "---\nscope: [local-development, in-notebook]\ntopics: alpha; beta\n---\n\n# Doc A\n\nThe text of a.\n";
const B = "---\nscope: [local-development]\n---\n\n# Doc B\n\nThe text of b.\n";
const P = "# A design\n\nThe text of the design.\n";
const DEV = { "AGENTS.md": "# For an agent\n\nagents, first\n", "README.md": "# cloud-brain-dev\n\nreadme, first\n", "philosophy.md": "# What it is for\n\nthe seven, first\n" };
const DEV_URL = "https://brain.example/git/cloud-brain-dev.git";

const fresh = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-kdocs-")));
  const repo = join(dir, "repo"), fake = join(dir, "fake");
  const run = (cwd: string, cmd: string[], env: Record<string, string | undefined> = {}) => {
    const p = Bun.spawnSync(cmd, { cwd, env: { ...process.env, BRAIN_BASE: "cbtest", BRAIN_STATE_DIR: undefined, FAKE_DIR: fake, ...env } });
    return { code: p.exitCode, out: p.stdout.toString().trim(), err: p.stderr.toString().trim() };
  };
  const git = (cwd: string, ...a: string[]) => {
    const r = run(cwd, ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "-c", "protocol.file.allow=always", ...a]);
    if (r.code !== 0) throw new Error(`git ${a.join(" ")}: ${r.err}`);
    return r.out;
  };
  const write = (rel: string, text: string, base = repo) => { mkdirSync(dirname(join(base, rel)), { recursive: true }); writeFileSync(join(base, rel), text); };
  mkdirSync(fake);
  // The repository cloud-brain-dev, and a clone of it where the submodule's checkout is.
  const sub = join(dir, "sub");
  mkdirSync(sub);
  git(sub, "init", "-q", "-b", "main");
  for (const [f, t] of Object.entries(DEV)) write(f, t, sub);
  git(sub, "add", "-A");
  git(sub, "commit", "-q", "-m", "first");
  const subSha = git(sub, "rev-parse", "HEAD");
  git(dir, "init", "-q", "--bare", "-b", "main", "origin.git");
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  git(repo, "clone", "-q", sub, "cloud-brain-dev");
  write("knowledge/a.md", A);
  write("knowledge/b.md", B);
  write("plan/cloud-brain-design.md", P);
  write("plan/another-plan.md", "# Not a doc of the Brain\n");
  write(".gitmodules", `[submodule "cloud-brain-dev"]\n\tpath = cloud-brain-dev\n\turl = ${DEV_URL}\n`);
  write("tools/cloud-brain/brain.ts", FAKE);
  write(".gitignore", "tools/cloud-brain/.emitted\n");
  mkdirSync(join(repo, "tools/cloud-brain"), { recursive: true });
  copyFileSync(tool, join(repo, "tools/cloud-brain/knowledge-docs.ts"));
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "first");
  git(repo, "remote", "add", "origin", join(dir, "origin.git"));
  git(repo, "push", "-q", "-u", "origin", "main");
  const entry = (name: string, text: string, more: any = {}) => ({ id: "doc:" + name, kind: "doc", public: false, sha256: sha(text), method: "knowledge-docs", ...more });
  const all = () => [entry("a", A, { public: true }), entry("b", B), entry("cloud-brain-design", P),
    entry("cloud-brain-dev-agents", DEV["AGENTS.md"]), entry("cloud-brain-dev-readme", DEV["README.md"]), entry("cloud-brain-dev-philosophy", DEV["philosophy.md"])];
  const keep = (entries: any[]) => writeFileSync(join(fake, "entries.json"), JSON.stringify(entries));
  keep(all());
  const kdocs = (args: string[], env: Record<string, string | undefined> = {}, at = repo) => run(at, ["bun", join(at, "tools/cloud-brain/knowledge-docs.ts"), ...args], env);
  const calls = () => (existsSync(join(fake, "calls.jsonl")) ? readFileSync(join(fake, "calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  const puts = () => calls().filter((c) => c.args[1].includes("knowledge.put")).flatMap((c) => c.body.entries);
  const summary = (out: string) => JSON.parse(out.split("\n").at(-1)!);
  return { dir, repo, sub, subSha, fake, git, write, all, entry, keep, kdocs, calls, puts, summary };
};

test("every doc of origin/main is read: knowledge/*.md, plan/cloud-brain-*.md and the three files of cloud-brain-dev (no post mortem here: the directory is absent)", () => {
  const t = fresh();
  const r = t.kdocs(["status"]);
  expect(r.code).toBe(0);
  expect(t.summary(r.out)).toMatchObject({ docs: 6, fresh: 6, stale: 0, missing: 0, entriesWithNoFile: [] });
  expect(r.out).not.toContain("another-plan");
});

test("R2: a call is made with --as loop-docs and never --owner; the argument --owner makes it the owner's", () => {
  const t = fresh();
  t.keep([]);
  expect(t.kdocs(["put", "--stale"]).code).toBe(0);
  const mine = t.calls();
  expect(mine.length).toBe(2);
  for (const c of mine) {
    expect(c.args[c.args.indexOf("--as") + 1]).toBe("loop-docs");
    expect(c.args).not.toContain("--owner");
  }
  expect(t.puts().map((e: any) => e.id).sort()).toEqual(t.all().map((e) => e.id).sort());
  const before = mine.length;
  expect(t.kdocs(["status", "--owner"]).code).toBe(0);
  const his = t.calls().slice(before);
  expect(his.length).toBe(1);
  expect(his[0].args).toContain("--owner");
  expect(his[0].args).not.toContain("--as");
});

test("R2: with no token loop-docs kept it prints the owner's command, exits 2 and does not call as the owner", () => {
  const t = fresh();
  writeFileSync(join(t.fake, "no-token"), "");
  for (const args of [["status"], ["status", "--check"], ["put", "--stale"]]) {
    const r = t.kdocs(args);
    expect(r.code).toBe(2);
    expect(r.out + "\n" + r.err).toContain("BRAIN_BASE=cbtest bun tools/cloud-brain/brain.ts token loop-docs knowledge.put knowledge.list");
  }
  expect(t.calls().length).toBe(3);
  for (const c of t.calls()) expect(c.args).not.toContain("--owner");
});

test("the state is the main checkout's, also from a worktree; a BRAIN_STATE_DIR the caller set is kept", () => {
  const t = fresh();
  expect(t.kdocs(["status"]).code).toBe(0);
  expect(t.calls().at(-1).state).toBe(join(t.repo, "tools/cloud-brain/.emitted"));
  const wt = join(t.dir, "wt");
  t.git(t.repo, "worktree", "add", "-q", wt, "-b", "side");
  // No cloud-brain-dev in a plain worktree: its three docs are left as they are, and the others are read.
  const r = t.kdocs(["status"], {}, wt);
  expect(r.code).toBe(0);
  expect(t.calls().at(-1).state).toBe(join(t.repo, "tools/cloud-brain/.emitted"));
  expect(t.kdocs(["status"], { BRAIN_STATE_DIR: "/somewhere/else" }).code).toBe(0);
  expect(t.calls().at(-1).state).toBe("/somewhere/else");
});

test("R3: an edit on disk and a commit not pushed are not seen: status reads fresh and put --stale sends nothing", () => {
  const t = fresh();
  t.write("knowledge/a.md", A + "\nAn open edit of another session.\n");
  t.write("knowledge/new-on-disk.md", "# New\n");
  t.write("knowledge/b.md", B + "\nCommitted, not pushed.\n");
  t.git(t.repo, "add", "knowledge/b.md");
  t.git(t.repo, "commit", "-q", "-m", "not pushed");
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(0);
  expect(t.summary(s.out)).toMatchObject({ docs: 6, fresh: 6, stale: 0, missing: 0 });
  const p = t.kdocs(["put", "--stale"]);
  expect(p.code).toBe(0);
  expect(t.puts()).toEqual([]);
  // --all sends the pushed text and its hash, not the file on disk.
  expect(t.kdocs(["put", "--all"]).code).toBe(0);
  const a = t.puts().find((e: any) => e.id === "doc:a");
  expect(a.sha256).toBe(sha(A));
  expect(a.text).not.toContain("open edit");
  expect(a.public).toBe(true);
  expect(t.puts().find((e: any) => e.id === "doc:b").sha256).toBe(sha(B));
});

test("R5: status --check exits 1 for a pushed change with an old entry, and for a doc with no entry; status alone exits 0", () => {
  const t = fresh();
  const changed = B + "\nPushed.\n";
  t.write("knowledge/b.md", changed);
  t.git(t.repo, "add", "knowledge/b.md");
  t.git(t.repo, "commit", "-q", "-m", "pushed");
  t.git(t.repo, "push", "-q", "origin", "main");
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(1);
  expect(t.summary(s.out)).toMatchObject({ docs: 6, fresh: 5, stale: 1, missing: 0 });
  expect(s.out).toMatch(/stale\s+private b stale .*commit [0-9a-f]{8}/);
  expect(t.kdocs(["status"]).code).toBe(0);
  expect(t.kdocs(["put", "--stale"]).code).toBe(0);
  expect(t.puts().map((e: any) => [e.id, e.sha256])).toEqual([["doc:b", sha(changed)]]);
  t.keep(t.all().filter((e) => e.id !== "doc:b").concat([t.entry("b", changed)]));
  expect(t.kdocs(["status", "--check"]).code).toBe(0);
  t.keep(t.all().filter((e) => e.id !== "doc:a"));
  const m = t.kdocs(["status", "--check"]);
  expect(m.code).toBe(1);
  expect(t.summary(m.out)).toMatchObject({ missing: 1 });
});

test("R4: an entry with no file is named only when this tool entered it", () => {
  const t = fresh();
  t.keep([...t.all(), t.entry("research-x", "x", { method: "research:x" }), t.entry("a-doc-since-deleted", "y")]);
  const r = t.kdocs(["status", "--check"]);
  expect(r.code).toBe(0);
  expect(t.summary(r.out).entriesWithNoFile).toEqual(["doc:a-doc-since-deleted"]);
});

test("R6: the three files are read at the commit origin/main records for cloud-brain-dev, private, with the repository's address", () => {
  const t = fresh();
  // The submodule's checkout moves on; lopecode-dev's pointer does not.
  t.write("philosophy.md", DEV["philosophy.md"] + "\nnot yet recorded by lopecode-dev\n", join(t.repo, "cloud-brain-dev"));
  t.git(join(t.repo, "cloud-brain-dev"), "commit", "-q", "-am", "ahead");
  expect(t.summary(t.kdocs(["status", "--check"]).out)).toMatchObject({ docs: 6, fresh: 6 });
  t.keep([]);
  expect(t.kdocs(["put", "--stale"]).code).toBe(0);
  const ph = t.puts().find((e: any) => e.id === "doc:cloud-brain-dev-philosophy");
  expect(ph).toMatchObject({ kind: "doc", public: false, sha256: sha(DEV["philosophy.md"]), url: DEV_URL, title: "What it is for", method: "knowledge-docs" });
  expect(ph.text).toBe("the seven, first");
  expect(t.puts().find((e: any) => e.id === "doc:cloud-brain-dev-agents").sha256).toBe(sha(DEV["AGENTS.md"]));
  expect(t.puts().find((e: any) => e.id === "doc:cloud-brain-dev-readme").sha256).toBe(sha(DEV["README.md"]));
});

test("R6: when the submodule's checkout lacks the recorded commit the three are left as they are, and the line says so", () => {
  const t = fresh();
  // origin/main records a commit of cloud-brain-dev that the checkout beside it has not fetched.
  t.write("README.md", DEV["README.md"] + "\nsecond\n", t.sub);
  t.git(t.sub, "commit", "-q", "-am", "second");
  const second = t.git(t.sub, "rev-parse", "HEAD");
  t.git(t.repo, "update-index", "--cacheinfo", `160000,${second},cloud-brain-dev`);
  t.git(t.repo, "commit", "-q", "-m", "pointer moved");
  t.git(t.repo, "push", "-q", "origin", "main");
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(0);
  const j = t.summary(s.out);
  expect(j).toMatchObject({ docs: 3, fresh: 3, stale: 0, missing: 0, entriesWithNoFile: [] });
  expect(j.cloudBrainDev).toContain(second.slice(0, 8));
  expect(j.cloudBrainDev).toContain("left as they are");
  expect(t.kdocs(["put", "--all"]).code).toBe(0);
  expect(t.puts().map((e: any) => e.id).sort()).toEqual(["doc:a", "doc:b", "doc:cloud-brain-design"]);
});

// ac-4-docs-tool-marks-a-cut, task 4 of plan/cloud-brain-answers-cut-and-not-said.md (R1). Until it the tool sent the
// first 16,000 characters of a longer text with no sign that there were more.
const RAW = "https://raw.githubusercontent.com/tomlarkworthy/lopecode-dev/main/";
const LINE = /\n\n\[the first (\d+) of (\d+) characters of this entry's text\. The whole is ([^\n]+)\]$/;
const pushed = (t: ReturnType<typeof fresh>, files: Record<string, string>) => {
  for (const [f, text] of Object.entries(files)) { t.write(f, text); t.git(t.repo, "add", f); }
  t.git(t.repo, "commit", "-q", "-m", "docs");
  t.git(t.repo, "push", "-q", "origin", "main");
};

// pm-1-file-and-search, task 1 of plan/cloud-brain-post-mortems-declared-and-kept.md (R4, design part 4). Until it the
// directory was not listed, and a doc's name was the second part of its path with three characters cut: `cloud-br` here.
test("pm-1: a file of tools/cloud-brain/post-mortems/ is a doc named by its file, private; a file below it, one that is no .md and a record are not", () => {
  const t = fresh();
  const PM = "tools/cloud-brain/post-mortems/", pm = "# Post mortem: a second role where one exists (`pm-x`)\n\nThe text of the post mortem.\n";
  pushed(t, { [PM + "pm-x.md"]: pm, [PM + "pm-y.md"]: pm.replace("pm-x", "pm-y"), [PM + "evidence/pm-x-long.md"]: "# Below\n", [PM + "notes.txt"]: "no doc\n",
    "tools/cloud-brain/records/pm-x.md": "# A record\n", "tools/cloud-brain/running.md": "# A guide beside the directory\n" });
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(1);
  expect(t.summary(s.out)).toMatchObject({ docs: 8, fresh: 6, stale: 0, missing: 2, entriesWithNoFile: [] });
  const rows = s.out.split("\n").slice(0, -1).map((l) => l.trim().split(/\s+/).slice(0, 3).join(" "));
  expect(rows.filter((l) => !l.startsWith("fresh"))).toEqual(["missing private pm-x", "missing private pm-y"]);
  // The docs that were taken before keep their names: a, b and the design are still fresh by the entries of those ids.
  expect(rows).toContain("fresh public a");
  expect(rows).toContain("fresh private cloud-brain-design");
  expect(s.out).not.toContain("cloud-br ");
  const p = t.kdocs(["put", "--stale"]);
  expect(p.code).toBe(0);
  expect(p.out).toContain("no scope in frontmatter, entered private: pm-x, pm-y");
  expect(t.summary(p.out)).toMatchObject({ put: 2, public: 0, private: 2, cut: 0 });
  const x = t.puts().find((e: any) => e.id === "doc:pm-x");
  expect(x).toMatchObject({ kind: "doc", public: false, title: "Post mortem: a second role where one exists (`pm-x`)", text: "The text of the post mortem.",
    sha256: sha(pm), url: "https://github.com/tomlarkworthy/lopecode-dev/blob/main/" + PM + "pm-x.md", source: "lopecode-dev", method: "knowledge-docs" });
  expect(t.puts().map((e: any) => e.id).sort()).toEqual(["doc:pm-x", "doc:pm-y"]);
  // By name, as any doc; and with the entries kept nothing is behind.
  expect(t.summary(t.kdocs(["put", "pm-y"]).out)).toMatchObject({ put: 1 });
  t.keep([...t.all(), t.entry("pm-x", pm), t.entry("pm-y", pm.replace("pm-x", "pm-y"))]);
  const s2 = t.kdocs(["status", "--check"]);
  expect(s2.code).toBe(0);
  expect(t.summary(s2.out)).toMatchObject({ docs: 8, fresh: 8, missing: 0 });
});

test("pm-1: a post mortem over 16,000 characters is cut with the line that names its file", () => {
  const t = fresh();
  const p = "tools/cloud-brain/post-mortems/pm-long.md";
  pushed(t, { [p]: "# Post mortem: long\n\n" + "q".repeat(16001) + "\n" });
  expect(t.kdocs(["put", "pm-long"]).code).toBe(0);
  const m = LINE.exec(t.puts()[0].text)!;
  expect([t.puts()[0].id, t.puts()[0].text.length, m[2], m[3]]).toEqual(["doc:pm-long", 16000, "16001", `the file ${p}: ${RAW}${p}`]);
});

test("ac-4: a text of 16,001 characters is put as 16,000 that end with the line; one of 16,000 is put as it is", () => {
  const t = fresh();
  const over = "# Over\n\n" + "y".repeat(16001) + "\n", at = "# At\n\n" + "z".repeat(16000) + "\n";
  pushed(t, { "knowledge/over.md": over, "knowledge/at.md": at });
  expect(t.kdocs(["put", "over", "at"]).code).toBe(0);
  const sent = t.puts(), o = sent.find((e: any) => e.id === "doc:over"), a = sent.find((e: any) => e.id === "doc:at");
  expect(a.text).toBe("z".repeat(16000));
  expect(o.text.length).toBe(16000);
  const m = LINE.exec(o.text)!;
  expect(m).not.toBeNull();
  expect([m[2], m[3]]).toEqual(["16001", `the file knowledge/over.md: ${RAW}knowledge/over.md`]);
  // The first number is what stands before the line, and that part is the start of the whole.
  expect(Number(m[1])).toBe(16000 - m[0].length);
  expect(o.text.slice(0, Number(m[1]))).toBe("y".repeat(Number(m[1])));
  expect(o.sha256).toBe(sha(over));
});

test("ac-4: the two numbers are of the text the tool makes, topics first and the heading out, also when the whole has six digits", () => {
  const t = fresh();
  const body = "The start. " + "w".repeat(120000) + " THE-END-OF-THE-FILE";
  const long = "---\nscope: [local-development]\ntopics: one; two\n---\n\n# Long\n\n" + body + "\n";
  pushed(t, { "knowledge/long.md": long });
  expect(t.kdocs(["put", "long"]).code).toBe(0);
  const sent = t.puts();
  expect(sent.length).toBe(1);
  const whole = "Topics: one; two\n\n" + body, m = LINE.exec(sent[0].text)!;
  expect(sent[0].text.length).toBe(16000);
  expect(sent[0].text).not.toContain("THE-END");
  expect(Number(m[2])).toBe(whole.length);
  expect(sent[0].text.slice(0, Number(m[1])) + m[0]).toBe(sent[0].text);
  expect(sent[0].text.slice(0, Number(m[1]))).toBe(whole.slice(0, Number(m[1])));
  expect(sent[0].sha256).toBe(sha(long));
});

test("ac-4: a cut file of cloud-brain-dev names the file and its repository, since no address gives it", () => {
  const t = fresh();
  const ph = "# What it is for\n\n" + "p".repeat(17000) + "\n";
  t.write("philosophy.md", ph, t.sub);
  t.git(t.sub, "commit", "-q", "-am", "long");
  t.git(join(t.repo, "cloud-brain-dev"), "pull", "-q");
  t.git(t.repo, "update-index", "--cacheinfo", `160000,${t.git(t.sub, "rev-parse", "HEAD")},cloud-brain-dev`);
  t.git(t.repo, "commit", "-q", "-m", "pointer moved");
  t.git(t.repo, "push", "-q", "origin", "main");
  expect(t.kdocs(["put", "cloud-brain-dev-philosophy"]).code).toBe(0);
  const sent = t.puts();
  expect(sent.map((e: any) => e.id)).toEqual(["doc:cloud-brain-dev-philosophy"]);
  const m = LINE.exec(sent[0].text)!;
  expect([sent[0].text.length, m[2], m[3]]).toEqual([16000, "17000", `the file philosophy.md of the repository ${DEV_URL}`]);
});

test("ac-4: status and put count the cut docs, and status counts and names those whose entry does not end with the line", () => {
  const t = fresh();
  const over = "# Over\n\n" + "y".repeat(16001) + "\n", more = "# More\n\n" + "v".repeat(30000) + "\n";
  pushed(t, { "knowledge/over.md": over, "knowledge/more.md": more });
  // As cb4 was before this task: each entry holds the first 16,000 characters and no line.
  t.keep([...t.all(), t.entry("over", over, { text: "y".repeat(16000) }), t.entry("more", more, { text: "v".repeat(16000) })]);
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(0);
  expect(t.summary(s.out)).toMatchObject({ docs: 8, fresh: 8, stale: 0, missing: 0, cut: 2, unmarked: 2 });
  const row = (out: string, name: string) => out.split("\n").find((l) => l.split(/\s+/)[2] === name)!;
  expect(row(s.out, "over")).toMatch(/^fresh\s+private over cut \d+ of 16001, unmarked$/);
  expect(row(s.out, "more")).toMatch(/^fresh\s+private more cut \d+ of 30000, unmarked$/);
  expect(row(s.out, "a")).not.toContain("cut");
  // The put by name sends them (so does put --stale, since knowledge-docs-put-stale-skips-unmarked: the case below).
  const p = t.kdocs(["put", "over", "a"]);
  expect(t.summary(p.out)).toMatchObject({ put: 2, cut: 1 });
  const sent = t.puts().find((e: any) => e.id === "doc:over");
  t.keep([...t.all(), t.entry("over", over, { text: sent.text }), t.entry("more", more, { text: "v".repeat(16000) })]);
  const s2 = t.kdocs(["status"]);
  expect(t.summary(s2.out)).toMatchObject({ cut: 2, unmarked: 1 });
  expect(row(s2.out, "over")).toMatch(/^fresh\s+private over cut \d+ of 16001$/);
  // An entry answered with no text is not known to end with the line; a cut doc with no entry is missing, not unmarked.
  t.keep([...t.all(), t.entry("over", over)]);
  expect(t.summary(t.kdocs(["status"]).out)).toMatchObject({ missing: 1, cut: 2, unmarked: 1 });
  // With no doc over the limit both are 0.
  const none = fresh();
  expect(none.summary(none.kdocs(["status"]).out)).toMatchObject({ cut: 0, unmarked: 0 });
  none.keep([]);
  expect(none.summary(none.kdocs(["put", "--all"]).out)).toMatchObject({ put: 6, cut: 0 });
});

// knowledge-docs-put-stale-skips-unmarked. Until it `put --stale` picked by the file's hash and `public` alone, so a cut
// entry that an older copy of the tool had entered with no line stayed so until its file changed or a put by name.
// Two cut docs pushed, and their entries as this tool puts them (read from a put --all, which is then forgotten by index).
const twoCut = () => {
  const t = fresh();
  const over = "# Over\n\n" + "y".repeat(16001) + "\n", more = "# More\n\n" + "v".repeat(30000) + "\n";
  pushed(t, { "knowledge/over.md": over, "knowledge/more.md": more });
  const bare = { over: t.entry("over", over, { text: "y".repeat(16000) }), more: t.entry("more", more, { text: "v".repeat(16000) }) };
  return { t, over, more, bare, ids: (from = 0) => t.puts().slice(from).map((e: any) => e.id).sort() };
};

test("put --stale also puts a fresh doc whose entry is unmarked, and its last line counts them", () => {
  const { t, over, more, bare, ids } = twoCut();
  // Both entries hold the first 16,000 characters and no line; the six short docs are fresh.
  t.keep([...t.all(), bare.over, bare.more]);
  const p = t.kdocs(["put", "--stale"]);
  expect(p.code).toBe(0);
  expect(t.summary(p.out)).toMatchObject({ put: 2, cut: 2, unmarked: 2 });
  expect(ids()).toEqual(["doc:more", "doc:over"]);
  for (const e of t.puts()) expect([e.text.length, LINE.test(e.text)]).toEqual([16000, true]);
  // With what was put as the entries nothing is unmarked, and the next put --stale sends nothing.
  const sent = (id: string) => t.puts().find((e: any) => e.id === id).text;
  t.keep([...t.all(), t.entry("over", over, { text: sent("doc:over") }), t.entry("more", more, { text: sent("doc:more") })]);
  expect(t.summary(t.kdocs(["status"]).out)).toMatchObject({ fresh: 8, cut: 2, unmarked: 0 });
  expect(t.kdocs(["put", "--stale"]).out).toBe("nothing to put");
  expect(t.puts().length).toBe(2);
});

test("put --stale: an entry with another line, with no text or with a text that is no string is put; a missing cut doc is not counted unmarked", () => {
  const { t, over, more, bare, ids } = twoCut();
  expect(t.summary(t.kdocs(["put", "over", "more"]).out)).toMatchObject({ put: 2, cut: 2, unmarked: 0 });
  const sent = (id: string) => t.puts().find((e: any) => e.id === id).text;
  const marked = [...t.all(), t.entry("over", over, { text: sent("doc:over") }), t.entry("more", more, { text: sent("doc:more") })];
  // An entry that ends with another line (the numbers of an older text), one answered with no text, and one whose
  // text is no string are unmarked to status, and are put.
  const other = sent("doc:over").replace(/of 16001 characters/, "of 16002 characters");
  expect(other).not.toBe(sent("doc:over"));
  for (const more1 of [{ text: other }, {}, { text: 7 }]) {
    const n = t.puts().length;
    t.keep([...marked.filter((e) => e.id !== "doc:over"), t.entry("over", over, more1)]);
    expect(t.summary(t.kdocs(["put", "--stale"]).out)).toMatchObject({ put: 1, cut: 1, unmarked: 1 });
    expect(ids(n)).toEqual(["doc:over"]);
  }
  // A cut doc with no entry is missing: put, and not counted unmarked.
  const n = t.puts().length;
  t.keep(marked.filter((e) => e.id !== "doc:more"));
  expect(t.summary(t.kdocs(["put", "--stale"]).out)).toMatchObject({ put: 1, cut: 1, unmarked: 0 });
  expect(ids(n)).toEqual(["doc:more"]);
});

test("put --stale puts a stale short doc beside an unmarked one; put <name> and put --all pick as before and count the same way", () => {
  const { t, over, bare, ids } = twoCut();
  // more is unmarked, b is stale, over has no entry yet for the first put.
  t.keep([...t.all().filter((e) => e.id !== "doc:b"), t.entry("b", "an older b"), bare.more, bare.over]);
  expect(t.summary(t.kdocs(["put", "a"]).out)).toMatchObject({ put: 1, cut: 0, unmarked: 0 });
  expect(t.summary(t.kdocs(["put", "over"]).out)).toMatchObject({ put: 1, cut: 1, unmarked: 1 });
  const marked = t.entry("over", over, { text: t.puts()[1].text });
  t.keep([...t.all().filter((e) => e.id !== "doc:b"), t.entry("b", "an older b"), bare.more, marked]);
  let n = t.puts().length;
  expect(t.summary(t.kdocs(["put", "--stale"]).out)).toMatchObject({ put: 2, cut: 1, unmarked: 1 });
  expect(ids(n)).toEqual(["doc:b", "doc:more"]);
  n = t.puts().length;
  expect(t.summary(t.kdocs(["put", "--all"]).out)).toMatchObject({ put: 8, cut: 2, unmarked: 1 });
  expect(t.puts().length).toBe(n + 8);
});

test("a cut doc whose file changed is stale, its entry ends with the line of the older text, and put counts it unmarked too", () => {
  const t = fresh();
  const over = "# Over\n\n" + "y".repeat(16001) + "\n";
  pushed(t, { "knowledge/over.md": over });
  expect(t.summary(t.kdocs(["put", "over"]).out)).toMatchObject({ put: 1, cut: 1, unmarked: 0 });
  const first = t.puts()[0];
  pushed(t, { "knowledge/over.md": over + "one more line\n" });
  t.keep([...t.all(), t.entry("over", over, { text: first.text })]);
  expect(t.summary(t.kdocs(["status"]).out)).toMatchObject({ fresh: 6, stale: 1, cut: 1, unmarked: 1 });
  expect(t.summary(t.kdocs(["put", "--stale"]).out)).toMatchObject({ put: 1, cut: 1, unmarked: 1 });
  expect(t.puts().slice(1).map((e: any) => e.id)).toEqual(["doc:over"]);
  expect(t.puts()[1].text).not.toBe(first.text);
});

test("--limit=SECONDS is the time one call may take", () => {
  const t = fresh();
  expect(t.kdocs(["status", "--limit=30"]).code).toBe(0);
  const a = t.calls().at(-1).args;
  expect(a[a.indexOf("-m") + 1]).toBe("30");
});

// i1546: git writes a path with a character outside ASCII as "knowledge/caf\303\251.md" unless asked with -z,
// and the doc then matched no pattern: no line in status, no put, nothing for --check to count.
test("i1546: a doc whose name gives no id the service takes is listed as badname, fails --check and is left out of every put", () => {
  const t = fresh();
  t.write("knowledge/café.md", "# Café\n\nThe text.\n");
  t.write("knowledge/Upper Case.md", "# Upper\n\nThe text.\n");
  t.write("knowledge/MixedCase.md", "# Mixed\n\nThe text.\n");
  t.git(t.repo, "add", "knowledge");
  t.git(t.repo, "commit", "-q", "-m", "three names");
  t.git(t.repo, "push", "-q", "origin", "main");
  const nfc = (x: string) => x.normalize("NFC");
  const s = t.kdocs(["status", "--check"]);
  expect(s.code).toBe(1);
  const j = t.summary(s.out);
  expect(j).toMatchObject({ docs: 9, fresh: 6, stale: 0, missing: 1 });
  expect(j.badNames.map(nfc).sort()).toEqual(["Upper Case", "café"]);
  const lines = nfc(s.out).split("\n");
  expect(lines.filter((l) => l.startsWith("badname")).length).toBe(2);
  expect(lines.find((l) => l.includes("café"))).toMatch(/^badname\s+private café its id is not one knowledge\.put takes/);
  expect(lines.find((l) => l.includes("MixedCase"))).toMatch(/^missing/);
  // The put goes on without them: the doc that can be entered is, under its name in lower case.
  const p = t.kdocs(["put", "--stale"]);
  expect(p.code).toBe(0);
  expect(t.puts().map((e: any) => e.id)).toEqual(["doc:mixedcase"]);
  expect(t.summary(p.out).badNames.map(nfc).sort()).toEqual(["Upper Case", "café"]);
  expect(t.kdocs(["put", "--all"]).code).toBe(0);
  expect(t.kdocs(["put", "café", "Upper Case"]).code).toBe(0);
  for (const e of t.puts()) expect(e.id).toMatch(/^[a-z0-9][a-z0-9._:-]*$/);
  // With nothing else behind, the one line a landing prints still names them.
  t.keep([...t.all(), t.entry("mixedcase", "# Mixed\n\nThe text.\n")]);
  const n = t.kdocs(["put", "--stale"]);
  expect(n.code).toBe(0);
  expect(nfc(n.out)).toMatch(/^nothing to put; not entered, .*: .*café/);
  expect(n.out.split("\n").length).toBe(1);
});
