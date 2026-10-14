#!/usr/bin/env bun
// The tracker's policy walked as a state machine: every state a policy lets one issue reach, judged by the seed's own
// issueAllowed, and seven properties asked of what was reached. The seed is the tracker cb4 runs, as cloud-brain-dev/deploy/
// has it after `bun sync.ts`: brain-issues.ojs was deleted on 2026-10-14, behind what ran (the tracker is changed as a patch
// in cloud-brain-dev). Issue rk-1-policy-walk;
// plan/cloud-brain-rules-checked-and-stale-knowledge-seen.md, section 1; tools/cloud-brain/records/rk-1-policy-walk.md.
//
//   bun tools/cloud-brain/policy-walk.ts <policy.json> [--until <property>] [--json]
//   bun tools/cloud-brain/policy-walk.ts --default [--json]
//   bun tools/cloud-brain/policy-walk.ts --in-force --token <t>
//
// <policy.json>  A body of issue.install ({ key, reason, policy, migrate }) or a policy itself, by its path.
// --default      issuesDefaultPolicy of the tracker cb4 runs. Run and recorded by the writer of a change to that cell;
//                the suite walks the newest policy file alone (tests/tools/policy-walk.test.ts).
// --until        Ends the walk at the first edge that breaks <property>, one of major-done-is-his, major-stays,
//                no-own-review, moves-are-his-or-a-token, and prints that property alone. The others are not asked.
// --in-force     Reads issue.policy with <t>, a name issue-as.sh keeps, and prints whether its workflow hashes are those
//                issuePolicyAct gives the newest plan/cloud-brain-issues-policy-v<n>.json. No walk. `in force: v<n>`
//                when the reason in force is the file's too. Two files with one policy have the same hashes (v5, v6
//                and v7 do), so with another reason the line is `in force: the workflows of v<n>, under another
//                reason`: the walk of the file is a walk of what is in force, and the file itself is not installed.
//                `in force: not v<n>`, with the workflows that differ, when a hash is another.
// --json         What the cell answered, as one line of JSON, in the lines' place.
//
// It prints one line a property, `<name>: holds` or `<name>: fails`, with its count, and under a broken one the
// shortest path of acts from an open to what breaks it. The properties, and what the walk does not show (issue.narrow,
// the owner's own swap, holds and waits, links, a second level of parts), are in the spec's section 1.
// Exit 0: every property asked holds, or the workflows in force are the newest file's. Exit 1: one fails, with the paths,
// or a workflow in force is not the file's. Exit 2: nothing was asked, and stderr says why (the arguments, the cell was not compiled,
// the cell gave no answer, issue.policy was not read).
//
// The walk is the cell tests/tools/fixtures/policy-walk.ojs, compiled into the running module in place of its test cells
// (runningModule of tests/tools/needs.ts) and run by cloud-brain-dev/test.ts --with, in a directory of the temp directory
// that is removed at the end. Nothing is added to the module that runs, nothing is deployed, and but for --in-force no call leaves the machine. The states only the owner
// ends are listed in tests/tools/fixtures/policy-walk-his.json.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newest } from "./policy-pins.ts";

const ROOT = resolve(import.meta.dir, "../.."), DEV = join(ROOT, "cloud-brain-dev");
const CELL = "tests/tools/fixtures/policy-walk.ojs", HIS = "tests/tools/fixtures/policy-walk-his.json", NAME = "test_policy_walk";
export const UNTIL = ["major-done-is-his", "major-stays", "no-own-review", "moves-are-his-or-a-token"];
const KINDS = ["task", "security", "feedback", "project"], CAP = 400000, SECONDS = 240;

class Stop extends Error { constructor(public code: number, message: string) { super(message); } }

// The cell's answer for `data`: the running module with the cell compiled in, then one run of cloud-brain-dev/test.ts.
async function ask(data: Record<string, unknown>): Promise<any> {
  for (const p of [join(DEV, "test.ts"), join(DEV, "deploy/services.json"), join(DEV, "deploy/@tomlarkworthy/brain-issues.js")]) if (!existsSync(p)) throw new Stop(2, `no ${p}: tools/cloud-brain/worktree.sh makes a worktree that has it, and (cd cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev) writes deploy/`);
  const dir = mkdtempSync(join(tmpdir(), "policy-walk-"));
  try {
    let built: string;
    // The toolchain notebook, loaded with no browser, prints some 35,000 lines with console.* while it compiles: not shown.
    const said = { ...console };
    try {
      for (const k of ["log", "info", "warn", "error", "debug"] as const) (console as any)[k] = () => {};
      const { runningModule } = await import(resolve(ROOT, "tests/tools/needs.ts"));
      built = await runningModule("brain-issues", { name: "brain-issues-policy-walk", cell: readFileSync(join(ROOT, CELL), "utf8").replace('"__DATA__"', () => JSON.stringify(data)) }, dir);
    } catch (e: any) { throw new Stop(2, `the cell was not compiled into the running module: ${e?.message ?? e}`); } finally { Object.assign(console, said); }
    const report = join(dir, "report.json");
    const r = spawnSync("bun", ["test.ts", "brain-x-issues", "--with", built, "--whole", "--seconds", String(SECONDS), "--report", report], { cwd: DEV, encoding: "utf8", maxBuffer: 1 << 28 });
    let test: any;
    try { test = JSON.parse(readFileSync(report, "utf8").trim().split("\n").at(-1)!).tests.find((t: any) => t.name === NAME); } catch { throw new Stop(2, `cloud-brain-dev/test.ts gave no report (exit ${r.status}): ${(r.stdout + r.stderr).slice(-1500)}`); }
    if (!test || test.state !== "passed") throw new Stop(2, `the cell ${NAME} gave no answer: ${test ? `${test.state}: ${test.error}` : "it did not run"}`);
    return JSON.parse(test.value);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const policyOf = (path: string) => {
  let file: any;
  try { file = JSON.parse(readFileSync(resolve(path), "utf8")); } catch (e: any) { throw new Stop(2, `${path} was not read as JSON: ${e?.message ?? e}`); }
  const policy = file?.policy ?? file;
  if (!policy || typeof policy !== "object" || !policy.workflows) throw new Stop(2, `${path} has no policy: neither it nor its \`policy\` has \`workflows\``);
  return { file, policy };
};

// The lines of a walk, and whether every property asked holds.
export function lines(of: string, a: any): { text: string[]; holds: boolean } {
  const text = [`${of}: ${a.states} states, ${a.edges} acts allowed, ${a.tried} acts tried, ${a.left} states left unvisited, ${(a.ms / 1000).toFixed(1)} s in the cell${a.until ? `; stopped at the first edge that breaks ${a.until}, and no other property was asked` : ""}`];
  for (const p of a.properties) {
    const more = [p.names?.length ? p.names.join(" ") : "", p.states?.length ? p.states.join(", ") : "", p.listed?.length ? `the owner's, as listed: ${p.listed.join(", ")}` : "", p.listedAndEnded?.length ? `listed and ended by the loop here: ${p.listedAndEnded.join(", ")}` : ""].filter(Boolean);
    text.push(`${p.name}: ${p.holds ? "holds" : "fails"}: ${p.count} ${p.what}${p.asked.length ? ` (asked of ${p.asked.join(", ")})` : " (asked of no workflow: none has the names it reads)"}${more.length ? ": " + more.join("; ") : ""}`);
    for (const path of p.paths) text.push(`  path: ${path.join(" > ")}`);
  }
  // A walk that --until stopped is not whole and is not meant to be; one the cap stopped is said, and holds nothing.
  const cut = a.left > 0 && !(a.until && !a.properties[0].holds);
  if (cut) text.push(`not whole: ${a.left} states were left unvisited at the cap of ${CAP}, so no property is held`);
  return { text, holds: !cut && a.properties.every((p: any) => p.holds) };
}

async function main(argv: string[]): Promise<number> {
  const flag = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const usage = "policy-walk.ts <policy.json> [--until <property>] [--json] | --default [--json] | --in-force --token <t>";
  const until = flag("--until"), json = argv.includes("--json");
  if (argv.includes("--until") && !UNTIL.includes(until ?? "")) throw new Stop(2, `--until takes one of ${UNTIL.join(", ")}`);
  const his = JSON.parse(readFileSync(join(ROOT, HIS), "utf8"));

  if (argv.includes("--in-force")) {
    const token = flag("--token");
    if (!token || token.startsWith("--")) throw new Stop(2, `no --token; nothing was sent\n  ${usage}`);
    const path = newest(ROOT);
    if (!path) throw new Stop(2, "no plan/cloud-brain-issues-policy-v<n>.json in this checkout");
    const { file, policy } = policyOf(join(ROOT, path)), v = "v" + /-v(\d+)\.json$/.exec(path)![1];
    const r = spawnSync(process.env.ISSUE_AS || join(import.meta.dir, "issue-as.sh"), [token, "policy"], { encoding: "utf8" });
    let read: any;
    try { read = JSON.parse(r.stdout); } catch { read = null; }
    if (r.status !== 0 || !read?.policy?.names) throw new Stop(2, `issue.policy was not read with ${token} (exit ${r.status}): ${(r.stderr || r.stdout || "").trim().slice(-300)}`);
    const { hashes } = await ask({ policy, hashes: true }), names = read.policy.names;
    const differ = [...new Set([...Object.keys(hashes), ...Object.keys(names)])].sort().filter((n) => hashes[n] !== names[n]);
    if (differ.length) {
      console.log(`in force: not ${v}. Of the policy of event ${read.policy.seq}, ${differ.map((n) => (n in names ? (n in hashes ? `${n} differs` : `${n} is not in ${path}`) : `${n} is not in force`)).join(", ")}; ${Object.keys(hashes).length - differ.filter((n) => n in hashes).length} of the ${Object.keys(hashes).length} workflow hashes of ${path} are in force`);
      return 1;
    }
    const whole = read.policy.reason === file.reason;
    console.log(whole ? `in force: ${v}` : `in force: the workflows of ${v}, under another reason`);
    console.log(`  the ${Object.keys(hashes).length} workflow hashes of the policy of event ${read.policy.seq} are those of ${path}; the reason in force is ${whole ? "the file's" : "not the file's: the install was of another file with these workflows, and what reads the reason (approver.ts, its two blobs) reads that file's"}`);
    return 0;
  }

  const first = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--until" && argv[i - 1] !== "--token");
  if (argv.includes("--default") === !!first) throw new Stop(2, usage);
  const policy = first ? policyOf(first).policy : null;
  const a = await ask({ policy, kinds: KINDS, cap: CAP, until: until ?? "", his: his[first ? "file" : "default"], hashes: false });
  const { text, holds } = lines(first ?? "issuesDefaultPolicy of the tracker cb4 runs (cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js)", a);
  console.log(json ? JSON.stringify(a) : text.join("\n"));
  return holds ? 0 : 1;
}

// The compiler keeps the process: it is ended here.
if (import.meta.main) main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`policy-walk.ts: ${e?.message ?? e}`); process.exit(e instanceof Stop ? e.code : 2); });
