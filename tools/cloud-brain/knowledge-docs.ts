#!/usr/bin/env bun
// Enters knowledge/*.md and the Cloud Brain designs (plan/cloud-brain-*.md) into a Brain's knowledge base, one entry a doc (kind `doc`, id `doc:<name>`), so that
// knowledge.search?semantic=true finds the doc for a task. Nothing re-enters a changed doc: `status` says which
// entries are behind their file and for how long, `put` is the reindex.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --all | --stale | <name>…
// The file is not copied: the entry's url is the doc on GitHub (the repo is public) and sha256 is of the local file.
// A doc whose frontmatter scope has `in-notebook` is public (it already ships in the markdown-wiki notebook);
// one that is `local-development` only is the Brain's and private.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(dirname(new URL(import.meta.url).pathname), "..", "..");
if (!process.env.BRAIN_BASE) throw new Error("BRAIN_BASE");
const [cmd, ...args] = process.argv.slice(2);
const REPO = "https://github.com/tomlarkworthy/lopecode-dev/blob/main/", TEXT = 16000;
const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");

const tmp = join(mkdtempSync(join(tmpdir(), "kdocs-")), "body.json");
const call = (path: string, body?: any) => {
  if (body) writeFileSync(tmp, JSON.stringify(body));
  const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain." + path, "--owner", "-sS", "-m", "120",
    ...(body ? ["-X", "POST", "-H", "content-type: application/json", "--data-binary", "@" + tmp] : [])], { encoding: "utf8", env: process.env, maxBuffer: 1 << 26 });
  const m = /^([\s\S]*) \[(\d+)\]$/.exec((r.stdout || "").trim());
  if (!m || m[2] !== "200") throw new Error(`${path.split("?")[0]}: ${m ? m[2] + " " + m[1].slice(0, 200) : (r.stderr || "").slice(0, 200)}`);
  return JSON.parse(m[1]);
};

// plan/cloud-brain-*.md: the designs and the backlog. They have no frontmatter, so they are entered private.
const files = [...readdirSync(join(root, "knowledge")).filter((f) => f.endsWith(".md")).sort().map((f) => "knowledge/" + f),
  ...readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-.*\.md$/.test(f)).sort().map((f) => "plan/" + f)];
const docs = files.map((rel) => {
  const f = rel.split("/")[1];
  const raw = readFileSync(join(root, rel), "utf8"), name = f.slice(0, -3);
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(raw), head = fm ? fm[1] : "", body = fm ? raw.slice(fm[0].length) : raw;
  const h1 = /^# +(.+)$/m.exec(body);
  const topics = (/^topics: *(.+)$/m.exec(head) || [])[1] || "";
  // Topics first: the service embeds the first 1500 characters of title and text.
  const text = [topics && "Topics: " + topics, body.replace(/^# +.+\n/m, "").trim()].filter(Boolean).join("\n\n").slice(0, TEXT);
  return { name, id: "doc:" + name.toLowerCase(), public: /^scope:.*\bin-notebook\b/m.test(head), scoped: /^scope:/m.test(head),
    title: (h1 ? h1[1] : name).slice(0, 500), text, sha256: sha(readFileSync(join(root, rel))), rel };
});

const kept = () => {
  const out = new Map<string, any>();
  for (let cursor = ""; ; ) {
    const r = call(`knowledge.list?kind=doc&limit=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`);
    for (const e of r.entries) out.set(e.id, e);
    if (!(cursor = r.cursor) || !r.entries.length) return out;
  }
};

// When the file first differed from what the entry holds: the commit after the last one whose file has the
// entry's sha256. With no such commit, or an uncommitted change, the file's mtime.
const staleSince = (d: any, entrySha: string) => {
  const git = (...a: string[]) => spawnSync("git", ["-C", root, ...a], { encoding: "buffer", maxBuffer: 1 << 26 });
  const dirty = git("status", "--porcelain", "--", d.rel).stdout.toString().trim();
  const log = git("log", "--format=%H %ct", "--", d.rel).stdout.toString().trim().split("\n").filter(Boolean).map((l) => l.split(" "));
  let first: string[] | null = null;
  for (const [h, t] of log) {
    if (sha(git("show", `${h}:${d.rel}`).stdout) === entrySha) return first ? { at: Number(first[1]) * 1000, from: "commit " + first[0].slice(0, 8) } : { at: statSync(join(root, d.rel)).mtimeMs, from: "mtime, not committed" };
    first = [h, t];
  }
  return { at: statSync(join(root, d.rel)).mtimeMs, from: dirty ? "mtime, not committed" : "mtime, no commit has the entry's file" };
};

const age = (ms: number) => { const h = (Date.now() - ms) / 36e5; return h < 48 ? h.toFixed(1) + " h" : (h / 24).toFixed(1) + " d"; };
const state = (have: Map<string, any>) => docs.map((d) => {
  const e = have.get(d.id);
  return { ...d, entry: e, state: !e ? "missing" : e.sha256 === d.sha256 && !!e.public === d.public ? "fresh" : "stale" };
});

if (cmd === "status") {
  const have = kept(), rows = state(have);
  for (const r of rows) {
    const s = r.state === "stale" && r.entry.sha256 !== r.sha256 ? staleSince(r, r.entry.sha256) : null;
    console.log(r.state.padEnd(8), (r.public ? "public " : "private"), r.name, s ? `stale ${age(s.at)} (since ${new Date(s.at).toISOString().slice(0, 16)}Z, ${s.from})` : r.state === "stale" ? "visibility differs" : "");
  }
  const n = (s: string) => rows.filter((r) => r.state === s).length;
  const gone = [...have.keys()].filter((id) => !docs.some((d) => d.id === id));
  console.log(JSON.stringify({ docs: rows.length, fresh: n("fresh"), stale: n("stale"), missing: n("missing"), entriesWithNoFile: gone }));
} else if (cmd === "put") {
  const rows = state(kept());
  const pick = args.includes("--all") ? rows : args.includes("--stale") ? rows.filter((r) => r.state !== "fresh") : rows.filter((r) => args.includes(r.name));
  const unscoped = pick.filter((r) => !r.scoped).map((r) => r.name);
  if (unscoped.length) console.log("no scope in frontmatter, entered private:", unscoped.join(", "));
  if (!pick.length) { console.log("nothing to put"); process.exit(0); }
  let entered = 0, changed = 0, vectors = 0;
  const t0 = Date.now();
  for (let i = 0; i < pick.length; i += 25) {
    const r = call("knowledge.put", { entries: pick.slice(i, i + 25).map((d) => ({ id: d.id, kind: "doc", public: d.public, title: d.title, text: d.text, url: REPO + d.rel, source: "lopecode-dev", sha256: d.sha256, method: "knowledge-docs", tags: ["knowledge-doc"] })) });
    entered += r.entered; changed += r.changed; vectors += r.vectors ?? 0;
  }
  console.log(JSON.stringify({ put: pick.length, public: pick.filter((d) => d.public).length, private: pick.filter((d) => !d.public).length, entered, changed, vectors, ms: Date.now() - t0 }));
} else {
  console.error("usage: knowledge-docs.ts status | put --all | --stale | <name>…");
  process.exit(1);
}
