#!/usr/bin/env bun
// waiting-deploys.ts [--json]                for the kernel, the core, the database and the deployer: whether
//                                            cloud-brain-dev/deploy/ has the module the Brain runs. Reads only, with no
//                                            token. One line a Worker:
//                                              brain-db: same
//                                              brain-core: differs. 2 differences (~coreApp +test_x). deploy/ is not what cb4 runs: bun sync.ts in cloud-brain-dev
//                                              brain-db: not synced. No deploy/@tomlarkworthy/brain-db.js: bun sync.ts in cloud-brain-dev
//                                            Exit 0 whatever differs. Exit 2: the Brain was not read; nothing is said of a
//                                            Worker then.
// waiting-deploys.ts --file <token>          the read, then the tracker, as that token: an open issue
//                                            `deploy-waits-<worker>` of a Worker that is `same` is closed, with what cb4
//                                            runs in the reason. Nothing else is written. The last line is
//                                            `deploys (<brain>): …`, what differs, what was written and what was left.
//                                            Exit 1: a write was refused.
// `lock.sh release land` runs the second after each landing (LOCK_TOKEN is the token).
//
// Since 2026-10-18 (i13610, i13611, i13614, i13615, i13618) these Workers have no seed in lopecode-dev, so there is no
// "seed of main" a deploy can be behind. Before, this tool compiled each seed of origin/main and opened
// `deploy-waits-<worker>` (needs-owner) for a Worker that ran an older one. Their modules are changed as patches in
// cloud-brain-dev; a passed, approved patch that waits for the owner's deploy is a done issue labelled
// `owner-deploy`, and cloud-brain-dev/waiting-deploys.ts lists those. The four modules in cloud-brain-dev/deploy/ are
// git-ignored, written by `bun sync.ts` from what the Brain runs, so a difference here is a deploy/ that is older than
// what runs or was edited by hand, not a deploy that waits: it is said, and no issue is opened for it.
//
// How it compares. Both texts are split into cells with the acorn extractor (lope-push-ws.js, parseVariableGroups): the
// module the Brain runs (getSource of the kernel for brain, brain-core and brain-db, and the deployer's
// infra.getModules for its own two modules, brain-deployer and cloudflare-iac; both reads are public) and
// cloud-brain-dev/deploy/@tomlarkworthy/<module>.js. Two modules are the same when every named cell has the same body
// (triage/cellwise.ts, sig: the tokens and the comments) and the same inputs, the cells with no name are the same set,
// and the imports are the same. Not compared: the files of a module (hono.js, atcute.js …).
//
// WAITING_DEPLOYS_BASE is the kernel's address (https://<BRAIN_BASE or cb4>.endpointservices.workers.dev with none);
// WAITING_DEPLOYS_MODULES=<file> is read in place of the Brain, `{ modules: [{ module, worker, hash, text }] }`;
// WAITING_DEPLOYS_DEPLOY=<dir> is read in place of cloud-brain-dev/deploy. Only the tests set them.
// tests/tools/waiting-deploys.test.ts.
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as acorn from "acorn";
import { parseVariableGroups } from "../lope-push-ws.js";
import { sig } from "../triage/cellwise.ts";

export const WORKERS = [
  { worker: "brain", what: "the kernel", modules: ["brain-kernel"] },
  { worker: "brain-core", what: "the core", modules: ["brain-core"] },
  { worker: "brain-db", what: "the database", modules: ["brain-db"] },
  { worker: "brain-deployer", what: "the deployer", modules: ["brain-deployer", "cloudflare-iac"] },
];
export const DEPLOY = resolve(import.meta.dir, "../../cloud-brain-dev/deploy");
export const deployedOf = (module: string, dir = DEPLOY) => join(dir, "@tomlarkworthy", module + ".js");
export const issueOf = (worker: string) => `deploy-waits-${worker}`;

export interface Row { worker: string; what: string; state: "same" | "differs" | "not synced"; runs: string; differ: string[]; missing: string[] }

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

// One Worker. `live` has the text that runs of each of its modules, by the module's short name.
export function readWorker(w: (typeof WORKERS)[number], live: Record<string, { hash: string; text: string }>, dir = DEPLOY): Row {
  const row: Row = { worker: w.worker, what: w.what, state: "same", runs: live[w.modules[0]].hash, differ: [], missing: [] };
  for (const m of w.modules) {
    const file = deployedOf(m, dir);
    if (!existsSync(file)) { row.missing.push(m); continue; }
    row.differ.push(...differ(readFileSync(file, "utf8"), live[m].text));
  }
  row.state = row.missing.length ? "not synced" : row.differ.length ? "differs" : "same";
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

export function line(row: Row): string {
  if (row.state === "same") return `${row.worker}: same`;
  if (row.state === "not synced") return `${row.worker}: not synced. No ${row.missing.map((m) => `deploy/@tomlarkworthy/${m}.js`).join(", ")}: bun sync.ts in cloud-brain-dev`;
  const cells = row.differ.slice(0, 6).join(" ") + (row.differ.length > 6 ? ` and ${row.differ.length - 6} more` : "");
  return `${row.worker}: differs. ${plural(row.differ.length, "difference")} (${cells}). deploy/ is not what cb4 runs (${row.runs.slice(0, 12)}): bun sync.ts in cloud-brain-dev`;
}

// The states an issue is left at: the task workflow has no move from them that a token may make.
export const LEFT = ["rejected", "done", "reverted"];

export interface Write { call: "move"; body: Record<string, unknown> }
// The writes of one Worker, from its row and what the tracker answered of its issue (null: there is none). An issue
// `deploy-waits-<worker>` was opened by this tool while the four had seeds; one still open is closed once deploy/ and
// what runs agree. A key is `deploys/<worker>/close-<seq of the issue's last event>`, with no role and no token in it:
// the releases of two agents that read the same state send the same key, and the second writes nothing.
export function plan(row: Row, got: { issue: any; events?: any[] } | null): Write[] {
  if (row.state !== "same" || !got) return [];
  const closed = got.issue.closed || got.issue.state === "closed" || LEFT.includes(got.issue.state);
  if (closed) return [];
  return [{ call: "move", body: { key: `deploys/${row.worker}/close-${got.issue.seq}`, id: issueOf(row.worker), to: "closed", reason: `cb4 runs what cloud-brain-dev/deploy has for ${row.what} (${row.worker}, ${row.runs.slice(0, 12)}); a deploy that waits for the owner is a done issue labelled owner-deploy (cloud-brain-dev/waiting-deploys.ts).` } }];
}

if (import.meta.main) {
  const argv = process.argv.slice(2), arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const token = arg("--file"), brain = process.env.BRAIN_BASE || "cb4";
  const known = new Set(["--json", "--file"]);
  if (argv.some((a, i) => a.startsWith("--") ? !known.has(a) : argv[i - 1] !== "--file") || (argv.includes("--file") && !token)) {
    console.error("waiting-deploys.ts [--json] | waiting-deploys.ts --file <token>");
    process.exit(2);
  }
  const here = import.meta.dir, dir = process.env.WAITING_DEPLOYS_DEPLOY || DEPLOY;
  let rows: Row[];
  try {
    const live = await liveModules();
    rows = WORKERS.map((w) => readWorker(w, live, dir));
  } catch (e: any) {
    console.error(`error: ${String(e?.message ?? e).split("\n")[0]}`);
    process.exit(2);
  }
  if (argv.includes("--json")) console.log(JSON.stringify(rows));
  else for (const r of rows) console.log(line(r));
  if (!token) process.exit(0);

  const tmp = mkdtempSync(join(tmpdir(), "waiting-deploys-"));
  const as = (method: string, body?: unknown) => {
    const args = [token, method];
    if (body !== undefined) { writeFileSync(join(tmp, "body.json"), JSON.stringify(body)); args.push("@" + join(tmp, "body.json")); }
    const r = spawnSync(join(here, "issue-as.sh"), args, { encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, ISSUE_AS_TIME_AHEAD: "1" } });
    const status = Number((/\[(\d+)\]/.exec(String(r.stderr)) || [])[1] ?? 0);
    let json: any = null;
    try { json = JSON.parse(r.stdout); } catch {}
    return { status, json, why: status ? `[${status}] ${String(r.stdout).slice(0, 200)}` : String(r.stderr).trim().split("\n")[0] };
  };
  const wrote: string[] = [], refused: string[] = [];
  try {
    for (const row of rows) {
      if (row.state !== "same") continue;
      const got = as(`get?id=${issueOf(row.worker)}`);
      if (got.status !== 200 && got.status !== 404) { refused.push(`${issueOf(row.worker)} not read ${got.why}`); continue; }
      for (const w of plan(row, got.status === 200 ? got.json : null)) {
        const r = as(w.call, w.body);
        if (r.status === 200) wrote.push(`${issueOf(row.worker)} closed`); else refused.push(`${issueOf(row.worker)} not closed ${r.why}`);
      }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const off = rows.filter((r) => r.state !== "same").map((r) => `${r.worker} ${r.state}`);
  console.log(`deploys (${brain}): ${off.length ? off.join(", ") + " (deploy/ against what runs; a deploy for the owner is labelled owner-deploy)" : "deploy/ has what the four run"}; ${wrote.length ? wrote.join(", ") : "nothing written"}${refused.length ? "; " + refused.join(", ") : ""}`);
  process.exit(refused.length ? 1 : 0);
}
