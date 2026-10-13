#!/usr/bin/env bun
// waiting-deploys.ts [--json] [--depth N]    for the kernel, the core, the database and the deployer: whether the Brain
//                                            runs the seed of origin/main, and when it does not, the commits between and
//                                            the issue each is of. Reads only, with no token. One line a Worker:
//                                              brain-db: same
//                                              brain-core: waits. 2 cells differ (~coreApp +test_x). 1 commit: <issue id> <sha8> <day>
//                                            Exit 0 whatever waits. Exit 2: the Brain or git was not read; nothing is said
//                                            of a Worker then.
// waiting-deploys.ts --file <token>          the read, then the tracker, as that token: one issue a Worker,
//                                            `deploy-waits-<worker>`, labelled needs-owner, so that the owner meets it in
//                                            "For your attention" of his page. A Worker that waits and has no such issue:
//                                            it is opened, with a body that says what the issue is and where its list
//                                            is, and the list as a comment. One that is closed: opened again, with the
//                                            label. One that is open with another list, or whose last comment is not
//                                            this tool's: a comment with the list as it is now, so that the issue's last
//                                            comment is the list (the row "To answer" of the owner's page shows the body
//                                            and the last comment, and the tracker has no call that changes a body). A
//                                            Worker that does not wait and has an open one: it is closed, with what cb4
//                                            runs in the reason. Nothing else is written, and a label the owner took off
//                                            stays off until the issue is opened again. One at rejected, done or reverted
//                                            is left as it is and named with its state: the task workflow has no move
//                                            from there that a token may make. The last line is `deploys (<brain>): …`,
//                                            what waits, what was written and what was left. Exit 1: a write was refused.
// `lock.sh release land` runs the second after each landing (LOCK_TOKEN is the token), so a seed landed with no deploy
// (land.sh --seed-lands-undeployed) is on his page from that release, and is off it at the first release after his deploy.
//
// How it compares. A seed is compiled as build.ts compiles it (spec-notebook.ts) and split into cells with the acorn
// extractor (lope-push-ws.js, parseVariableGroups); so is the module the Brain runs: getSource of the kernel for brain,
// brain-core and brain-db, and the deployer's infra.getModules for its own two modules (brain-deployer, cloudflare-iac).
// Both reads are public. Two modules are the same when every named cell has the same body (triage/cellwise.ts, sig: the
// tokens and the comments) and the same inputs, the cells with no name are the same set, and the imports are the same.
// The text is not compared: the build of a seed and the text cb4 ran of it had other ids for the same cells (brain-static,
// 2026-10-13: `_spec_0_0` and `_brainstatic_anon_66b289a9de`).
// The commits between: the last N commits of origin/main to the Worker's seeds (N is --depth, 40), newest first, each
// compiled until one is the same as what runs. Those before it are the difference. An issue is the commit's subject up
// to its first colon. With no such commit in N the line says so and names the N commits.
// Not compared: the files of a module (hono.js, atcute.js …). And a change to cloudflare-iac is said of the deployer
// alone: its wrapper reaches the other three with `redistil --apply` after the deployer is installed.
//
// WAITING_DEPLOYS_BASE is the kernel's address (https://<BRAIN_BASE or cb4>.endpointservices.workers.dev with none);
// WAITING_DEPLOYS_MODULES=<file> is read in place of the Brain, `{ modules: [{ module, worker, hash, text }] }`;
// WAITING_DEPLOYS_REPO and WAITING_DEPLOYS_REF are the repository and the ref (the checkout this file is in, origin/main).
// Only the tests set them. Issue undeployed-seeds-not-shown-to-owner; tests/tools/waiting-deploys.test.ts.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as acorn from "acorn";
import { parseVariableGroups } from "../lope-push-ws.js";
import { sig } from "../triage/cellwise.ts";
import { compiler, moduleSource, splitSeed } from "../spec-notebook.ts";

export const WORKERS = [
  { worker: "brain", what: "the kernel", modules: ["brain-kernel"] },
  { worker: "brain-core", what: "the core", modules: ["brain-core"] },
  { worker: "brain-db", what: "the database", modules: ["brain-db"] },
  { worker: "brain-deployer", what: "the deployer", modules: ["brain-deployer", "cloudflare-iac"] },
];
export const seedOf = (module: string) => `tools/cloud-brain/${module}.ojs`;
export const issueOf = (worker: string) => `deploy-waits-${worker}`;

export interface Commit { sha: string; day: string; id: string | null; subject: string }
export interface Row { worker: string; what: string; state: "same" | "waits"; runs: string; differ: string[]; commits: Commit[]; base: string | null; depth: number }
type Compile = Parameters<typeof moduleSource>[1];

// A module as its cells: a named cell by its name, the others as a sorted list, and the imports.
export function cellsOf(src: string) {
  const { groups, preformatted } = parseVariableGroups(src, acorn);
  const named = new Map<string, string>(), anon: string[] = [];
  for (const group of groups ?? []) for (const v of group ?? []) {
    const cell = sig(String(v._definition).trim()) + "\u0004" + (v._inputs ?? []).join(",");
    if (v._name) named.set(v._name, cell); else anon.push(cell);
  }
  return { named, anon: anon.sort(), imports: (preformatted ?? []).map((s: unknown) => String(s).replace(/\s+/g, " ").trim()).sort() };
}

// What differs between main's module and the one that runs: `~name` a cell both have, `+name` one main alone has,
// `-name` one that runs alone, then the two that have no name to give.
export function differ(main: string, runs: string): string[] {
  const a = cellsOf(main), b = cellsOf(runs), out: string[] = [];
  for (const [name, cell] of a.named) { const other = b.named.get(name); if (other === undefined) out.push("+" + name); else if (other !== cell) out.push("~" + name); }
  for (const name of b.named.keys()) if (!a.named.has(name)) out.push("-" + name);
  if (a.anon.join("\u0005") !== b.anon.join("\u0005")) out.push("a cell with no name");
  if (a.imports.join("\u0005") !== b.imports.join("\u0005")) out.push("the imports");
  return out;
}

const git = (repo: string, ...args: string[]) => {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`git ${args.slice(0, 2).join(" ")}: ${String(r.stderr).trim().split("\n")[0]}`);
  return r.stdout;
};

// One Worker. `live` has the text that runs of each of its modules, by the module's short name.
export function readWorker(w: (typeof WORKERS)[number], live: Record<string, { hash: string; text: string }>, o: { repo: string; ref: string; depth: number; compile: Compile }): Row {
  const paths = w.modules.map(seedOf);
  const built = new Map<string, string>();
  const at = (sha: string, module: string) => {
    const key = sha + ":" + module;
    if (!built.has(key)) built.set(key, moduleSource(splitSeed(git(o.repo, "show", `${sha}:${seedOf(module)}`)), o.compile));
    return built.get(key)!;
  };
  const against = (sha: string) => w.modules.flatMap((m) => differ(at(sha, m), live[m].text));
  const row: Row = { worker: w.worker, what: w.what, state: "same", runs: live[w.modules[0]].hash, differ: against(o.ref), commits: [], base: null, depth: o.depth };
  if (!row.differ.length) return row;
  row.state = "waits";
  const log = git(o.repo, "log", "--format=%H%x09%cs%x09%s", "-n", String(o.depth), o.ref, "--", ...paths).split("\n").filter(Boolean).map((l) => l.split("\t"));
  for (const [sha, day, ...rest] of log) {
    let same = false;
    // A commit whose seed does not compile, or that has not every seed yet, is not what runs.
    try { same = !against(sha).length; } catch {}
    if (same) { row.base = sha; break; }
    const subject = rest.join("\t"), id = /^([a-z0-9][a-z0-9.-]*): /.exec(subject);
    row.commits.push({ sha, day, id: id ? id[1] : null, subject: id ? subject.slice(id[0].length) : subject });
  }
  return row;
}

export async function liveModules(): Promise<Record<string, { hash: string; text: string }>> {
  const out: Record<string, { hash: string; text: string }> = {};
  const short = (module: string) => module.replace(/^@tomlarkworthy\//, "");
  if (process.env.WAITING_DEPLOYS_MODULES) {
    for (const m of JSON.parse(readFileSync(process.env.WAITING_DEPLOYS_MODULES, "utf8")).modules) out[short(m.module)] = { hash: String(m.hash), text: m.text };
  } else {
    const kernel = (process.env.WAITING_DEPLOYS_BASE || `https://${process.env.BRAIN_BASE || "cb4"}.endpointservices.workers.dev`).replace(/\/$/, "");
    const X = "/xrpc/com.lopecode.brain.", read = async (url: string) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`${url.replace(/^https:\/\/[^/]+/, "")} answered ${r.status}`);
      return r.json();
    };
    const [listed, ...sources] = await Promise.all([
      read(kernel.replace(/^(https?:\/\/[^/.:]+)/, "$1-deployer") + X + "infra.getModules"),
      ...WORKERS.filter((w) => w.worker !== "brain-deployer").map((w) => read(kernel + X + "getSource?worker=" + w.worker)),
    ]);
    for (const m of listed.modules) if (m.worker === "brain-deployer") out[short(m.module)] = { hash: String(m.hash), text: m.text };
    for (const s of sources) out[short(s.module)] = { hash: String(s.hash), text: s.text };
  }
  for (const w of WORKERS) for (const m of w.modules) if (!out[m] || typeof out[m].text !== "string") throw new Error(`the Brain did not answer the module ${m} of ${w.worker}`);
  return out;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
// The ids of a row's commits, the oldest first, each once; then the commits that name none.
export function issuesOf(row: Row): { id: string | null; commits: Commit[] }[] {
  const out: { id: string | null; commits: Commit[] }[] = [];
  for (const c of [...row.commits].reverse()) {
    const have = c.id ? out.find((x) => x.id === c.id) : null;
    if (have) have.commits.push(c); else out.push({ id: c.id, commits: [c] });
  }
  return out;
}

export function line(row: Row): string {
  if (row.state === "same") return `${row.worker}: same`;
  const cells = row.differ.slice(0, 6).join(" ") + (row.differ.length > 6 ? ` and ${row.differ.length - 6} more` : "");
  const commits = issuesOf(row).map((x) => `${x.id ?? "no issue named"} ${x.commits.map((c) => c.sha.slice(0, 8)).join(" ")} ${x.commits[x.commits.length - 1].day}`).join("; ");
  const found = row.base ? "" : ` No commit of the last ${row.depth} to its seed is what runs (${row.runs.slice(0, 12)}): these are those ${row.depth}, or all there are.`;
  return `${row.worker}: waits. ${plural(row.differ.length, "difference")} (${cells}). ${plural(row.commits.length, "commit")}: ${commits}.${found}`;
}

// What the owner reads in his page: rules.md, "What the owner is asked to decide". `titles` has what the tracker
// answered of each issue: its title and its state.
const seeds = (row: Row) => ((WORKERS.find((x) => x.worker === row.worker)?.modules.length ?? 1) > 1 ? "its seeds" : "its seed");
export function ask(row: Row, titles: Record<string, { title: string; state: string } | null>): string {
  const items = issuesOf(row).map((x) => {
    const t = x.id ? titles[x.id] : null;
    if (x.id && t) return `- \`${x.id}\` (${t.state}): ${t.title}`;
    return x.commits.map((c) => `- a commit of ${c.day} that names no issue of the tracker: ${c.id ? c.id + ": " : ""}${c.subject}`).join("\n");
  });
  const unsure = row.base ? "" : ` cb4 runs a seed that is none of the last ${row.depth} of \`main\`'s, so the list may hold more than waits.`;
  return [
    `${row.what[0].toUpperCase()}${row.what.slice(1)} (\`${row.worker}\`) on cb4 is behind \`main\`: ${plural(items.length, "change")} to ${seeds(row)} landed with no deploy, which is yours. None is live on cb4 until you deploy ${row.what}.${unsure}`,
    "",
    ...items,
    "",
    `Nothing to choose: one deploy of ${row.what} from \`main\` carries them all, and one that is not \`done\` has not passed its review yet.`,
    `What to run is in the record of an issue that was landed for your deploy, under "For the owner: the deploy". The loop closes this issue once cb4 runs the seed of \`main\`.`,
  ].join("\n");
}

// The body an issue is opened with. It is never written again, so it has nothing that changes: the list is a comment.
// Written for the owner, as `ask` is: no hash and no path.
export function opening(row: Row): string {
  return [
    `A deploy of ${row.what} (\`${row.worker}\`) waits for you: cb4 runs an older seed of it than \`main\` has, and that deploy is yours.`,
    "",
    `What waits is listed in the last comment of this issue (its key begins \`deploys/${row.worker}/list-\`). The loop writes the list there again when it changes, and when another comment stands after it. This text is as it was at the opening.`,
    "",
    `The loop closes this issue once cb4 runs the seed of \`main\`.`,
  ].join("\n");
}

// The states an issue is left at, whatever waits: the task workflow has `reopen` from closed and from rejected alone,
// and the policy refuses a token the reopen of an issue the owner rejected.
export const LEFT = ["rejected", "done", "reverted"];

// `what` is how the last line names a comment: the list of an opening, a list that is another, the same list said again.
export interface Write { call: "open" | "move" | "comment" | "label"; body: Record<string, unknown>; what?: "list said" | "list changed" | "list said again" }
// The writes of one Worker, from its row and what the tracker answered of its issue (null: there is none).
// A key is `deploys/<worker>/<what>-<seq of the issue's last event>`, with no role and no token in it: the releases of
// two agents that read the same state send the same key, and the second writes nothing.
export function plan(row: Row, got: { issue: any; events: any[] } | null, text: string): Write[] {
  const id = issueOf(row.worker), key = (what: string) => `deploys/${row.worker}/${what}-${got ? got.issue.seq : 0}`;
  const closed = !!got && (got.issue.closed || got.issue.state === "closed" || LEFT.includes(got.issue.state));
  if (row.state === "same") {
    if (!got || closed) return [];
    return [{ call: "move", body: { key: key("close"), id, to: "closed", reason: `cb4 runs the seed of main for ${row.what} (${row.worker}, ${row.runs.slice(0, 12)}): no deploy of it waits.` } }];
  }
  // His reject stands, and no move leads from done or reverted to open: no call that would be refused at each release.
  if (got && LEFT.includes(got.issue.state)) return [];
  const list = (what: Write["what"]): Write => ({ call: "comment", body: { key: key("list"), id, body: text }, what });
  if (!got) return [{ call: "open", body: { key: key("open"), id, kind: "task", about: "issue-loop", labels: ["needs-owner"], title: `A deploy waits for you: ${row.what} (${row.worker}) on cb4 is behind main`, body: opening(row) } }, list("list said")];
  const comments = got.events.filter((e) => e.type === "commented"), mine = (e: any) => String(e.key).startsWith(`deploys/${row.worker}/`);
  const ours = comments.filter(mine);
  // An issue opened before the list was a comment has its first list as its body.
  const last = ours.length ? ours[ours.length - 1].body : got.issue.body;
  // Said again when it is another, and when a comment that is not the tool's stands after it.
  const said: Write[] = last !== text ? [list("list changed")] : comments.length && !mine(comments[comments.length - 1]) ? [list("list said again")] : [];
  if (!closed) return said;
  return [
    { call: "move", body: { key: key("reopen"), id, to: "open", reason: `${row.what[0].toUpperCase()}${row.what.slice(1)} (${row.worker}) on cb4 is behind main again: ${plural(row.commits.length, "commit")} to its seed.` } },
    ...((got.issue.labels || []).includes("needs-owner") ? [] : [{ call: "label" as const, body: { key: key("label"), id, add: ["needs-owner"] } }]),
    ...said,
  ];
}

if (import.meta.main) {
  const argv = process.argv.slice(2), arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const token = arg("--file"), depth = Number(arg("--depth") ?? 40), brain = process.env.BRAIN_BASE || "cb4";
  const known = new Set(["--json", "--depth", "--file"]);
  if (argv.some((a, i) => a.startsWith("--") ? !known.has(a) : !["--depth", "--file"].includes(argv[i - 1])) || (argv.includes("--file") && !token) || !(Number.isInteger(depth) && depth > 0)) {
    console.error("waiting-deploys.ts [--json] [--depth N] | waiting-deploys.ts --file <token>");
    process.exit(2);
  }
  const here = import.meta.dir, repo = process.env.WAITING_DEPLOYS_REPO || resolve(here, "../.."), ref = process.env.WAITING_DEPLOYS_REF || "origin/main";
  let rows: Row[];
  try {
    const live = await liveModules();
    const { compile, dispose } = await compiler();
    try { rows = WORKERS.map((w) => readWorker(w, live, { repo, ref, depth, compile })); } finally { dispose(); }
  } catch (e: any) {
    console.error(`error: ${String(e?.message ?? e).split("\n")[0]}`);
    process.exit(2);
  }
  if (argv.includes("--json")) console.log(JSON.stringify(rows.map((r) => ({ ...r, issues: issuesOf(r).map((x) => x.id) }))));
  else for (const r of rows) console.log(line(r));
  if (!token) process.exit(0);

  const tmp = mkdtempSync(join(tmpdir(), "waiting-deploys-"));
  const as = (method: string, body?: unknown) => {
    const args = [token, method];
    if (body !== undefined) { writeFileSync(join(tmp, "body.json"), JSON.stringify(body)); args.push("@" + join(tmp, "body.json")); }
    // The text is made here from titles and commit days: issue-as.sh's check of a time ahead of the clock is for a text an agent wrote.
    const r = spawnSync(join(here, "issue-as.sh"), args, { encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, ISSUE_AS_TIME_AHEAD: "1" } });
    const status = Number((/\[(\d+)\]/.exec(String(r.stderr)) || [])[1] ?? 0);
    let json: any = null;
    try { json = JSON.parse(r.stdout); } catch {}
    return { status, json, why: status ? `[${status}] ${String(r.stdout).slice(0, 200)}` : String(r.stderr).trim().split("\n")[0] };
  };
  const wrote: string[] = [], refused: string[] = [], left: string[] = [];
  try {
    for (const row of rows) {
      const got = as(`get?id=${issueOf(row.worker)}`);
      if (got.status !== 200 && got.status !== 404) { refused.push(`${issueOf(row.worker)} not read ${got.why}`); continue; }
      if (row.state === "waits" && got.status === 200 && LEFT.includes(got.json.issue.state)) left.push(`${issueOf(row.worker)} left as it is (${got.json.issue.state})`);
      const titles: Record<string, { title: string; state: string } | null> = {};
      if (row.state === "waits") for (const x of issuesOf(row)) if (x.id) {
        const t = as(`get?id=${x.id}`);
        titles[x.id] = t.status === 200 ? { title: t.json.issue.title, state: t.json.issue.state } : null;
      }
      for (const w of plan(row, got.status === 200 ? got.json : null, row.state === "waits" ? ask(row, titles) : "")) {
        const what = w.call === "move" ? (w.body.to === "closed" ? "closed" : "opened again") : w.call === "open" ? "opened" : w.call === "label" ? "labelled" : w.what ?? "list changed";
        const r = as(w.call, w.body);
        if (r.status === 200) wrote.push(`${issueOf(row.worker)} ${what}`); else refused.push(`${issueOf(row.worker)} not ${what} ${r.why}`);
      }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const waits = rows.filter((r) => r.state === "waits").map((r) => r.worker);
  console.log(`deploys (${brain}): ${waits.length ? waits.join(", ") + " behind main, the deploy is the owner's" : "the four run the seed of main"}; ${wrote.length ? wrote.join(", ") : "nothing written"}${left.length ? "; " + left.join(", ") : ""}${refused.length ? "; " + refused.join(", ") : ""}`);
  process.exit(refused.length ? 1 : 0);
}
