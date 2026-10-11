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

test("every doc of origin/main is read: knowledge/*.md, plan/cloud-brain-*.md and the three files of cloud-brain-dev", () => {
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

test("R6: a file over 16,000 characters is sent as its first 16,000, with the hash of the whole file", () => {
  const t = fresh();
  const long = "# Long\n\n" + "x".repeat(16000) + "THE-END-OF-THE-FILE\n";
  t.write("knowledge/long.md", long);
  t.git(t.repo, "add", "knowledge/long.md");
  t.git(t.repo, "commit", "-q", "-m", "long");
  t.git(t.repo, "push", "-q", "origin", "main");
  expect(t.kdocs(["put", "long"]).code).toBe(0);
  const sent = t.puts();
  expect(sent.length).toBe(1);
  expect(sent[0].text.length).toBe(16000);
  expect(sent[0].text).not.toContain("THE-END");
  expect(sent[0].sha256).toBe(sha(long));
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
