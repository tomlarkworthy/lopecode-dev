#!/usr/bin/env bun
// The approver's tool: what an approver reads, the one `approve` move it may make for the owner, and what the owner and
// the overseer read of those moves afterwards. Task 1 of plan/cloud-brain-approver-persona.md (ap-1-approver-tool);
// tools/cloud-brain/records/ap-1-approver-tool.md. Until the owner installs a policy whose `approve` guard names a
// delegation, `approve` sends nothing (exit 3) and the rest reads only.
//
//   bun tools/cloud-brain/approver.ts brief
//   bun tools/cloud-brain/approver.ts facts <id> --token NAME
//   bun tools/cloud-brain/approver.ts approve <id> <verdict seq> --token NAME
//   bun tools/cloud-brain/approver.ts check --token NAME
//   bun tools/cloud-brain/approver.ts list [--since=<hours>] --token NAME
//   bun tools/cloud-brain/approver.ts trial --token NAME
//   bun tools/cloud-brain/approver.ts id [<issue>]
//
// --token is the caller's own token for the tracker (a name issue-as.sh keeps) and has no default: with none a command
// that reads exits 2 and nothing is sent. The record is read whole with it, issue.sync through issue-as.sh, and the
// policy with issue.policy. An issue the token does not read (the security workflow) is not in what is read, and so is
// never judged. --record FILE and --policy FILE read the two from files and call nothing: `approve` then prints the
// move it would send and sends none. --json prints what a command found as one line of JSON.
//
// brief    `git fetch origin main`, then .claude/skills/brain-maintenance/agents/approver.md as origin/main has it, and
//          a last line `brief <blob>`, the git blob hash of that text. A verdict ends with that line. Exit 1 when
//          origin/main has no such file.
// facts    The issue as the approver needs it: its state, the round (the count of its moves to `awaiting-approval`),
//          the key the verdict takes, the parent and that one's parent as they were when it was started, the passing
//          review, any guard added to it, and each ref of every submit it has, once, a `commit` with its files; one
//          the last submit does not name says which submit did. A file is marked `never` (a seed of the kernel, the core, the database or the deployer, cloudflare-iac, exporter-3,
//          robocoop-5, the channel server, the `lopecode` pointer), `rules` (rules.md, philosophy.md), `policy` (a
//          plan/cloud-brain-issues-policy-*.json, and brain-issues.ojs when the commit touches a policy cell of it,
//          named after the file), `tracker` (brain-issues.ojs when it touches none) or `approver` (the brief, this
//          tool, its test). A mark refuses nothing but `policy` and `approver`, which `approve` refuses (below).
//          The policy cells are JUDGE and ROUTES below, with what `policyCells` adds to them.
//          Of two of them a commit touches the policy parts or it does not touch the cell: issuesApp (the routes
//          install, rebuild and resign, what asks a guard, and what those name: `appParts`) and issuesLimits (the
//          entries a policy cell or such a part reads). The parts that differ are named in brackets after the cell.
// approve  Makes the `approve` move with the token loop-approver, or makes none and prints each reason. In this order:
//          the `approve` guard of the issue's workflow names no delegation: exit 3, nothing sent, before anything else
//          is judged. Then, every one of these or exit 1:
//          - the issue is at `awaiting-approval`;
//          - event <verdict seq> is a comment of the issue, keyed approver/<id>/verdict-<round>, written after the last
//            move to `awaiting-approval`, that begins `approver: approve`; no comment of the issue, of any round,
//            begins `approver: leave` (R4);
//          - its holder is `secret:appr-` and six hex digits, and neither that holder nor its delegation made a
//            `start`, `spec`, `submit` or `submit-spec` move or a review of the issue (R5);
//          - the policy's reason ends `approver brief <blob> tool <blob>`; the verdict ends `brief <blob>` with the
//            first; origin/main, fetched, has the brief and this tool at those two blobs; and the file that runs is
//            that tool (R7);
//          - the last `submit` or `submit-spec` of the issue has a `commit` ref; each `commit` ref of every submit the
//            issue has, of this round or one before a send-back, is a commit the checkout has; and none touches the
//            brief, this tool, tests/tools/approver.test.ts, a plan/cloud-brain-issues-policy-*.json or a policy
//            cell of brain-issues.ojs (R7; a commit that changes other cells of the seed alone is not refused, nor
//            one that changes issuesApp or issuesLimits in no policy part). A
//            submit of another issue, its parent's `submit-spec` among them, is not read for it;
//          - the verdict has a line `asked: <where> "<his words>"`, and each such line holds (R3, R6):
//            <where> a number: an event before the verdict, of the issue or of what was its parent or that one's
//            parent when the issue was first started (a part-of made later is not followed); not written by an `appr-`
//            holder or the guard's delegation, and no `approve` made by a delegation; the quotation is in its body,
//            reason or title letter for letter and is 20 characters or more. A shorter one is the whole text of an
//            event of his own (`via session`, a UUID for its key), and the line ends ` answers <seq>`, a comment before
//            it on the same issue.
//            <where> `philosophy.md` or `rules.md`: the quotation, 20 characters or more, is in the file as origin/main
//            has it (philosophy.md at the commit origin/main records for cloud-brain-dev).
//            <where> `plan/<file>.md`: that parent or its parent has an `approve` made `via session`; the `submit-spec`
//            before it names the file in its reason or by a commit ref that touches it; the quotation is in the file
//            at a commit that submit names. Any other <where> is refused.
//          The move's key is approver/<id>/approve-<round>, its reason the verdict's first 200 characters, a new line,
//          and `verdict <seq>, brief <blob>`. Exit 0: the tracker wrote it, or kept it before as this same actor's
//          (`sent before`). Exit 2: no loop-approver is kept (the
//          orchestrating session makes it, `brain.ts token loop-approver issue.move issue.comment`; the owner ends
//          every approval with `brain.ts token revoke loop-approver`, which also takes the kept value away), origin
//          was not fetched, or the tracker was not reached. Exit 4: the tracker refused the move, with its answer, or
//          keeps the move's key as an event another actor wrote, so no approve was made by this run (with --json
//          the line is the judgment and the tracker's `answer`; its `exit` is the judgment's, 0, and the run's is 4).
//          Not judged by the tool: whether the words ask for the change, and whether they are his (an event a token
//          wrote, and a sentence of rules.md that is the loop's reading, are found as his own are).
// check    Each `approve` the record has `via delegation:…`, judged again as it stood before the move, with the policy
//          then in force (the last `policy` event before it): everything `approve` asks but the three blobs of
//          origin/main and of the running file, which are of now. And: its reason names the verdict; its delegation is
//          the guard's; the verdict's token is the `token` of a `cost` event of role `approver` written by an `orch-`
//          holder. One line for each that fails, exit 1; exit 0 with none.
// list     One line for each such approve, newest first: the time, the id, `on your words of event N` (his own event),
//          `on the spec you approved`, `on your words in <file>` or `on words a session quoted at event N`, the
//          verdict's first sentence, and `reverted` when a `revert` or an `owner-reject` of the issue follows it.
//          --since=<hours> lists those of the last hours: a number above 0, as 24 or 0.5. Anything else given for it
//          (abc, 0, nothing) is exit 2 before the record is read; with no --since every one is listed.
// trial    The verdicts in the open: every comment keyed approver/<id>/verdict-<n> whose id does not begin `test-`,
//          counted as the spec's part 6 gives it, then each one's first line. A `leave` is counted by its line
//          `why: <reason>`: `no word of his`, `his to weigh` (the brief's since 2026-10-13), `more than the words`
//          (the brief's before), `not secure`, `could not tell`, `the approver's own files`, anything else `other`.
//          The verdicts of `test-` issues are one line of their own.
// id       Sends one comment with loop-approver, keyed approver/id, to <issue> (ap-4-policy-v3 with none) and prints
//          the `by.via` of the event that answers: the delegation's id, which the policy of task 4 names. A key another
//          delegation holds already (a loop-approver made before) answers no event: the next key, approver/id-2, is tried.
//
// The value of a token is read from a file and sent; it is in no output. ISSUE_AS names another issue-as.sh and
// ISSUE_AS_BASE another address for it and for the two sends; APPROVER_ROOT another checkout, and APPROVER_MAIN another
// ref than origin/main, which is then not fetched. Only the tests set them. `judge`, `facts`, `check`, `list` and
// `trial` take what was read and call nothing but git: tests/tools/approver.test.ts.
import { parse } from "acorn";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SKILL = ".claude/skills/brain-maintenance/";
export const BRIEF = SKILL + "agents/approver.md", TOOL = "tools/cloud-brain/approver.ts", TEST = "tests/tools/approver.test.ts";
const RULES = SKILL + "rules.md", SEED = "tools/cloud-brain/brain-issues.ojs", POLICY = /^plan\/cloud-brain-issues-policy-[^/]*\.json$/;
const PHILOSOPHY = ["philosophy.md", SKILL + "philosophy.md", "cloud-brain-dev/philosophy.md"];
const NEVER = /^tools\/cloud-brain\/(brain-kernel|brain-core|brain-db|brain-deployer|cloudflare-iac[^/]*)\.ojs$|exporter-3|robocoop-5|^lopecode-plugin(\/|$)|^lopecode$/;
const TOKEN = "loop-approver", MIN = 20;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Event = any;
export type Git = ReturnType<typeof gitOf>;

// The policy cells of brain-issues.ojs (part 4 of the spec): the cells that hold the policy or judge a guard, each
// with why. A cell that one of JUDGE names, however far, is a policy cell too: what the judge calls is part of it.
export const JUDGE: Record<string, string> = {
  issuesDefaultPolicy: "the guards of a Brain that has installed no policy",
  issueAllowed: "may this caller do this act: each guard is asked here",
  issueReplay: "should this event have been refused: what issue.verify?guards=true asks",
  issuePolicyAct: "a policy checked, as the act that installs it",
  issueApply: "the view a guard is asked of: the policy an event installs, and an issue's by, reviews and added guards",
  issueAct: "a request's body as the act that is judged",
  issueEvent: "an allowed act as its event: the policy, and the guard added to an issue, that issueApply then keeps"
};
// These two are not followed: issuesApp names nearly every cell of the seed, and issues_service names issuesApp.
export const ROUTES: Record<string, string> = {
  issuesApp: "the routes install, rebuild and resign, each for the owner present, and the refusal on a guard's answer",
  issues_service: "who may call each method of the tracker: the rule the core asks before any guard is"
};
// A seed as its cells. A cell's name is read after its leading comment lines; prose (md`…` with no ${ in it) has none
// and is left out; code with no name that is read (an import, prose that runs an expression) is `loose`.
function cellsOf(text: string) {
  const cells = new Map<string, string>(), count = new Map<string, number>(), loose: string[] = [];
  for (const chunk of text.split(/^\/\/ %%.*$/m).map((s) => s.trim()).filter(Boolean)) {
    const code = chunk.replace(/^(?:[ \t]*(?:\/\/.*)?\n)*/, "");
    const name = (/^(?:(?:viewof|mutable)\s+)?([A-Za-z_$][\w$]*)\s*=(?![=>])/.exec(code) || /^(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/.exec(code))?.[1];
    if (!name) { if (!/^md`/.test(code) || code.includes("${")) loose.push(chunk); continue; }
    cells.set(name, cells.has(name) ? cells.get(name) + "\n// %%\n" + chunk : chunk);
    count.set(name, (count.get(name) || 0) + 1);
  }
  return { cells, count, loose: loose.sort().join("\n// %%\n") };
}
// ---- Two policy cells are read by their parts (issue approver-policy-mark-takes-every-route; the owner's C, comment
// 6384 there: the mark takes the install, rebuild and resign routes, the refusal on a guard's answer and the limits a
// judge reads, "and where the tool cannot cut the cell into those parts it marks the whole cell as now").
type Node = any;
const tree = (src: string): Node | null => { try { return parse(src, { ecmaVersion: "latest" }); } catch { return null; } };
const codeOf = (chunk: string) => chunk.replace(/^(?:[ \t]*(?:\/\/.*)?\n)*/, "");
// What stands after `name =` in a cell; null for a cell written as a function.
const valueOf = (chunk: string) => { const code = codeOf(chunk), m = /^(?:(?:viewof|mutable)\s+)?[A-Za-z_$][\w$]*\s*=(?![=>])/.exec(code); return m ? code.slice(m[0].length) : null; };
// Every node under `root`, with the nodes above it (nearest last) and the field of its parent it stands in.
function walk(root: Node, fn: (n: Node, up: Node[], key: string) => void, up: Node[] = [], key = "") {
  fn(root, up, key);
  up.push(root);
  for (const k in root) {
    if (k === "type" || k === "start" || k === "end") continue;
    for (const c of Array.isArray(root[k]) ? root[k] : [root[k]]) if (c && typeof c.type === "string") walk(c, fn, up, k);
  }
  up.pop();
}
// A name that is read as a name: not the `b` of `a.b`, and not the key of `{ b: 1 }`.
const isRef = (n: Node, parent: Node | undefined, key: string) =>
  n.type === "Identifier" && !(parent && key === "property" && parent.type === "MemberExpression" && !parent.computed) && !(parent && key === "key" && parent.type === "Property" && !parent.computed && !parent.shorthand);
const refsOf = (n: Node) => { const out = new Set<string>(); walk(n, (x, up, key) => { if (isRef(x, up.at(-1), key)) out.add(x.name); }); return out; };
// The entries of issuesLimits that the nodes `within` read, of a cell parsed as `root`: `issuesLimits.x`, `L.x` where
// the cell has `L = issuesLimits` (a declaration or a default), and `{ x } = issuesLimits`. null where one cannot be
// told: the limits passed on whole, spread, or read by a key that is computed.
function limitReads(root: Node, within: Node[] = [root]): Set<string> | null {
  const alias = new Set(["issuesLimits"]), keys = new Set<string>();
  const pairOf = (n: Node | undefined) => (n?.type === "VariableDeclarator" ? [n.id, n.init] : n?.type === "AssignmentPattern" ? [n.left, n.right] : null);
  const named = (pair: Node[] | null) => !!pair && pair[0]?.type === "Identifier" && pair[1]?.type === "Identifier" && pair[1].name === "issuesLimits";
  walk(root, (n) => { const pair = pairOf(n); if (named(pair)) alias.add(pair![0].name); });
  let lost = false;
  for (const w of within) walk(w, (n, up, key) => {
    const p = up.at(-1), pair = pairOf(p);
    if (!isRef(n, p, key) || !alias.has(n.name)) return;
    if (p?.type === "MemberExpression" && key === "object") {
      if (!p.computed) keys.add(p.property.name);
      else if (p.property.type === "Literal" && typeof p.property.value === "string") keys.add(p.property.value);
      else lost = true;
    } else if (named(pair)) return;
    else if (pair && pair[1] === n && pair[0].type === "ObjectPattern" && pair[0].properties.every((q: Node) => q.type === "Property" && !q.computed && q.key.type === "Identifier")) for (const q of pair[0].properties) keys.add(q.key.name);
    else lost = true;
  });
  return lost ? null : keys;
}
// The entries of issuesLimits a cell reads; null where the cell is not parsed or one cannot be told.
function cellLimitReads(chunk: string): Set<string> | null {
  const v = valueOf(chunk), root = v == null ? tree(codeOf(chunk)) : tree(`(async function*(){return (\n${v}\n)})`) || tree(`(async function*()${v}\n)`);
  return root ? limitReads(root) : null;
}
// issuesLimits as its entries, each the text of its value; null when it is not one object of plain keys, each once.
function limitEntries(chunk: string | undefined): Map<string, string> | null {
  const v = chunk == null ? null : valueOf(chunk), src = `(\n${v}\n)`, ast = v == null ? null : tree(src), o = ast?.body.length === 1 ? ast.body[0].expression : null, out = new Map<string, string>();
  if (o?.type !== "ObjectExpression") return null;
  for (const q of o.properties) {
    const k = q.type === "Property" && !q.computed && !q.method && q.kind === "init" ? (q.key.type === "Identifier" ? q.key.name : typeof q.key.value === "string" ? q.key.value : null) : null;
    if (k == null || out.has(k)) return null;
    out.set(k, src.slice(q.value.start, q.value.end));
  }
  return out;
}
// The routes of issuesApp that are the owner's, and what asks a guard: the seven of JUDGE and the cell that says
// whether the caller is present.
const OWNER_ROUTES = ["install", "rebuild", "resign"], GUARDS = [...Object.keys(JUDGE), "issueCaller"];
const isFn = (n: Node) => n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" || n.type === "FunctionDeclaration";
// issuesApp cut into its policy parts, each a name with its text, and the limits those parts read. The cell is a block:
// its statements are declarations (`const judge = …`, a part a name), routes (`app.get(NS + "name", …)` or `app.post`)
// and whatever else. The policy parts:
//   - the routes install, rebuild and resign;
//   - `judge`, where a guard's answer is turned into the refusal, and each declaration that names a guard or such a
//     declaration, however far (`write` names `judge`, `append` names `write`, `shownEvent` names `shown`);
//   - each statement that is no declaration and no route (the loop that makes the write routes, `return app`, an
//     `app.use`);
//   - in what is left, the other routes among it, each statement that names a guard or such a declaration: it is
//     taken as the statement it is of the innermost function with a body in braces, in the order they stand;
//   - each declaration that one of the parts above names, however far (`load`, `refuse`, `run`, `L`).
// So a route that is none of the three is a part only by the statements in it that ask a guard, and a new route by
// those it has. null where the cell is not cut: it is not one block that parses, a declaration is not of one name, a
// name or a route stands twice, `judge` or one of the three routes is not there as a POST, or one is there otherwise.
export function appParts(chunk: string | undefined): { parts: Map<string, string>; limits: Set<string> | null } | null {
  const v = chunk == null ? null : valueOf(chunk), src = `(async function*()${v}\n)`, ast = v == null ? null : tree(src), fn = ast?.body.length === 1 ? ast.body[0].expression : null;
  if (fn?.type !== "FunctionExpression") return null;
  const text = (n: Node) => src.slice(n.start, n.end);
  const units: { kind: "local" | "route" | "other"; name: string; key: string; node: Node }[] = [];
  for (const st of fn.body.body) {
    if (st.type === "VariableDeclaration") {
      for (const d of st.declarations) { if (d.id.type !== "Identifier") return null; units.push({ kind: "local", name: d.id.name, key: d.id.name, node: d }); }
      continue;
    }
    const call = st.type === "ExpressionStatement" && st.expression.type === "CallExpression" ? st.expression : null, to = call?.callee, path = call?.arguments[0];
    const route = to?.type === "MemberExpression" && !to.computed && to.object.type === "Identifier" && to.object.name === "app" && ["get", "post"].includes(to.property.name) &&
      path?.type === "BinaryExpression" && path.operator === "+" && path.left.type === "Identifier" && path.left.name === "NS" && path.right.type === "Literal" && typeof path.right.value === "string";
    units.push(route ? { kind: "route", name: path.right.value, key: `${to.property.name} ${path.right.value}`, node: st } : { kind: "other", name: "", key: "", node: st });
  }
  const keyed = units.filter((u) => u.kind !== "other"), byKey = new Map(keyed.map((u) => [u.key, u]));
  if (byKey.size !== keyed.length || !byKey.has("judge") || byKey.get("judge")!.kind !== "local") return null;
  if (OWNER_ROUTES.some((r) => !byKey.has("post " + r)) || keyed.some((u) => u.kind === "route" && OWNER_ROUTES.includes(u.name) && u.key !== "post " + u.name)) return null;
  const locals = new Map(units.filter((u) => u.kind === "local").map((u) => [u.name, u])), refs = new Map(units.map((u) => [u, refsOf(u.node)]));
  const names = new Set([...GUARDS, "judge"]), policy = new Set(units.filter((u) => u.kind === "other" || u.key === "judge" || (u.kind === "route" && OWNER_ROUTES.includes(u.name))));
  for (let grew = true; grew; ) {
    grew = false;
    for (const u of locals.values()) if (!policy.has(u) && [...refs.get(u)!].some((n) => names.has(n))) { names.add(u.name); policy.add(u); grew = true; }
  }
  const asks: Node[] = [];
  for (const u of units) if (!policy.has(u)) walk(u.node, (n, up, key) => {
    if (!isRef(n, up.at(-1), key) || !names.has(n.name)) return;
    const path = [...up, n];
    let st = u.node;
    for (let j = path.length - 3; j >= 0; j--) if (isFn(path[j]) && path[j].body === path[j + 1] && path[j + 1].type === "BlockStatement") { st = path[j + 2]; break; }
    if (!asks.includes(st)) asks.push(st);
  });
  const nodes = [...[...policy].map((u) => u.node), ...asks];
  for (let i = 0; i < nodes.length; i++) for (const n of refsOf(nodes[i])) { const u = locals.get(n); if (u && !policy.has(u)) { policy.add(u); nodes.push(u.node); } }
  const parts = new Map<string, string>();
  for (const u of keyed) if (policy.has(u)) parts.set(u.kind === "route" ? `the route ${u.name}` : u.name, text(u.node));
  parts.set("a statement that is no declaration and no route", units.filter((u) => u.kind === "other").map((u) => text(u.node)).join("\n"));
  parts.set("a statement that asks a guard", asks.map(text).join("\n"));
  return { parts, limits: limitReads(fn, nodes) };
}

// The policy cells that differ between two texts of the seed, by name; [] when none does. Where it cannot tell, it
// names one: a side that is not read (the file added or deleted, a commit with no parent), a cell of JUDGE or ROUTES
// that a side does not have once (a rename leaves the tool not knowing the judge), and code with no name.
// The walk takes every word of a policy cell that is a cell's name, whatever stands before it: `x.name` too, since
// `...name(by)` has a dot before it as well (review 5470). It does not see a cell that writes into a policy cell.
// Two cells are named with the parts that differ, `issuesApp (the route install, judge)` and `issuesLimits (key)`,
// and are not named when none of their policy parts does: issuesApp by `appParts`, and issuesLimits by the entries
// that a policy cell or a policy part of issuesApp reads. Either is named whole, as every other cell is, where it is
// not cut on both sides: `issuesApp`, `issuesLimits`.
export function policyCells(before: string | null, after: string | null): string[] {
  if (before == null || after == null) return ["the whole file (it is not read on one side of the commit)"];
  const a = cellsOf(before), b = cellsOf(after), policy = new Set([...Object.keys(JUDGE), ...Object.keys(ROUTES)]), out: string[] = [];
  for (const side of [a, b]) {
    for (const seen = new Set(Object.keys(JUDGE)), queue = [...seen]; queue.length; ) {
      for (const word of (side.cells.get(queue.pop()!) || "").match(/(?<![\w$])[A-Za-z_$][\w$]*/g) || []) if (side.cells.has(word) && !seen.has(word)) { seen.add(word); policy.add(word); queue.push(word); }
    }
  }
  const app = [a, b].map((side) => appParts(side.cells.get("issuesApp")));
  // The entries a side's policy reads, or null: its policy cells but the two that are cut, and the app's policy parts.
  const read = (side: ReturnType<typeof cellsOf>, cut: ReturnType<typeof appParts>) => {
    const keys = new Set<string>(cut?.limits || []);
    if (!cut?.limits) return null;
    for (const name of policy) {
      const chunk = name === "issuesApp" || name === "issuesLimits" ? undefined : side.cells.get(name), got = chunk == null ? new Set<string>() : cellLimitReads(chunk);
      if (!got) return null;
      for (const k of got) keys.add(k);
    }
    return keys;
  };
  for (const name of policy) {
    const known = name in JUDGE || name in ROUTES, once = a.count.get(name) === 1 && b.count.get(name) === 1, differs = a.cells.get(name) !== b.cells.get(name);
    if (known && !once) out.push(`${name} (not there once on each side of the commit)`);
    else if (!differs) continue;
    else if (name === "issuesApp" && app[0] && app[1]) {
      const parts = [...new Set([...app[0].parts.keys(), ...app[1].parts.keys()])].filter((k) => app[0]!.parts.get(k) !== app[1]!.parts.get(k));
      if (parts.length) out.push(`${name} (${parts.join(", ")})`);
    } else if (name === "issuesLimits") {
      const was = limitEntries(a.cells.get(name)), is = limitEntries(b.cells.get(name)), ra = read(a, app[0]), rb = read(b, app[1]);
      const keys = was && is && ra && rb ? [...new Set([...ra, ...rb])].filter((k) => was.get(k) !== is.get(k)) : null;
      if (!keys) out.push(name);
      else if (keys.length) out.push(`${name} (${keys.join(", ")})`);
    } else out.push(name);
  }
  if (a.loose !== b.loose) out.push("a cell with no name (an import, or prose with ${ in it)");
  return out;
}
// The policy cells of the seed that a commit of lopecode-dev touches, against each of its parents.
export function seedTouch(git: Git, sha: string): string[] {
  const parents = git.parents(sha);
  if (!parents?.length) return policyCells(null, null);
  return [...new Set(parents.flatMap((p) => policyCells(git.text(p, SEED), git.text(sha, SEED))))];
}

// The marks of a file, and whether it is one of the approver's own (part 4 of the spec). `cells` is what seedTouch
// answers for the seed in a commit; with none given the seed is taken whole, as it was until 2026-10-13.
export const own = (f: string, cells?: string[]) => f === BRIEF || f === TOOL || f === TEST || POLICY.test(f) || (f === SEED && (!cells || cells.length > 0));
export const marks = (f: string, cells?: string[]) => [
  ...(NEVER.test(f) ? ["never"] : []),
  ...(f === RULES || PHILOSOPHY.includes(f) ? ["rules"] : []),
  ...(POLICY.test(f) || (f === SEED && own(f, cells)) ? ["policy"] : f === SEED ? ["tracker"] : []),
  ...(f === BRIEF || f === TOOL || f === TEST ? ["approver"] : [])
];

// What is read of git: `main` is origin/main; a ref of another repository (`cloud-brain-dev@<sha>`) is read in the
// directory of that name. Every answer is null when git has none.
export function gitOf(root: string, main = "origin/main", self = "") {
  const run = (dir: string, ...a: string[]) => { try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { return null; } };
  const dirOf = (repo: string) => (!repo || repo === "lopecode-dev" ? root : join(root, repo));
  return {
    main,
    // As worktree.sh fetches: no submodule is read (in a worktree they are links, and git stops on one), and twice,
    // since another agent's fetch may hold the ref for a moment.
    fetch: () => { const m = /^([^/]+)\/(.+)$/.exec(main), once = () => !!m && run(root, "fetch", "-q", "--no-recurse-submodules", m[1], m[2]) !== null; return once() || once(); },
    blob: (path: string) => run(root, "rev-parse", "--verify", "-q", `${main}:${path}`)?.trim() || null,
    text: (rev: string, path: string) => run(root, "show", `${rev}:${path}`),
    parents: (sha: string) => run(root, "rev-list", "--parents", "-n", "1", sha + "^{commit}")?.trim().split(/\s+/).slice(1) ?? null,
    files: (repo: string, sha: string) => {
      const dir = dirOf(repo), pre = dir === root ? "" : repo + "/";
      if (!existsSync(dir) || run(dir, "cat-file", "-e", sha + "^{commit}") === null) return null;
      const out = run(dir, "diff-tree", "--no-commit-id", "--name-only", "-r", "-m", "--root", sha);
      return out === null ? null : [...new Set(out.split("\n").filter(Boolean))].map((f) => pre + f);
    },
    philosophy: () => { const at = run(root, "rev-parse", "--verify", "-q", `${main}:cloud-brain-dev`)?.trim(); return at && existsSync(join(root, "cloud-brain-dev")) ? run(join(root, "cloud-brain-dev"), "show", `${at}:philosophy.md`) : null; },
    self: () => (self ? run(root, "hash-object", self)?.trim() || null : null)
  };
}

// The policy in force, from issue.policy or from a `policy` event of the record: its reason, and each workflow by its hash.
export function policyOf(p: any): { seq: number; reason: string; workflows: Record<string, any> } {
  if (p?.type === "policy") return { seq: p.seq, reason: p.reason || "", workflows: Object.fromEntries(Object.entries(p.hashes || {}).map(([name, hash]) => [hash, p.policy?.workflows?.[name]])) };
  return { seq: p?.policy?.seq ?? 0, reason: p?.policy?.reason || "", workflows: p?.workflows || {} };
}
const delegationOf = (guard: string) => /caller\.actor == "(delegation:[0-9a-f]+)"/.exec(guard || "")?.[1] || "";
const pinsOf = (reason: string) => { const m = /approver brief ([0-9a-f]{40}) tool ([0-9a-f]{40})\s*$/.exec(reason || ""); return m ? { brief: m[1], tool: m[2] } : null; };

const holder = (e: Event) => String(e?.by?.holder || ""), via = (e: Event) => String(e?.by?.via || "");
const texts = (e: Event) => [e.body, e.reason, e.title].filter((t) => typeof t === "string") as string[];
const isMove = (e: Event, ...names: string[]) => e.type === "moved" && names.includes(e.move);
const leaves = (e: Event) => e.type === "commented" && String(e.body || "").startsWith("approver: leave");
const verdictKey = /^approver\/(.+)\/verdict-(\d+)$/;
// The first sentence of a verdict: its first line after the head.
const sentence = (body: string) => body.replace(/^approver: (approve|leave)[.:,]?\s*/, "").split("\n")[0].trim().slice(0, 200);
const stamp = (ms: number) => { const d = new Date(ms), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

// An issue as the events before `before` leave it. `rounds` is the count of its moves to awaiting-approval.
// `workflow` is the one its last event leaves it on: of a swap, the one the swap names.
export function issueAt(record: Event[], id: string, before = Infinity) {
  const i = { seen: false, state: "", workflow: "", parent: null as string | null, rounds: 0, toApproval: 0, extra: [] as { n: number; move: string; guard: string }[] };
  for (const e of record) {
    if (e.id !== id || e.seq >= before || e.hidden) continue;
    i.seen = true;
    if (e.workflow) i.workflow = e.workflow;
    if (e.type === "opened") { i.state = e.state || "open"; i.parent = e.parent || null; }
    if (e.type === "moved") { i.state = e.to; if (e.to === "awaiting-approval") { i.rounds++; i.toApproval = e.seq; } }
    // A swap's own `workflow` is the one the issue leaves; `to` has where it is from then (the migrate of an install).
    if (e.type === "swapped" && e.to?.state) i.state = e.to.state;
    if (e.type === "swapped" && e.to?.workflow) i.workflow = e.to.workflow;
    if (e.type === "linked" && e.rel === "part-of") i.parent = e.remove ? null : e.to;
    if (e.type === "narrowed") i.extra = e.remove != null ? i.extra.filter((x) => x.n !== e.remove) : [...i.extra, { n: e.seq, move: e.move, guard: e.guard }];
  }
  return i;
}
// The parent and that one's parent as they were when the issue was first started (its first `start` or `spec` move).
function family(record: Event[], id: string) {
  const started = record.find((e) => e.id === id && isMove(e, "start", "spec"))?.seq ?? Infinity;
  const parent = issueAt(record, id, started).parent, grand = parent ? issueAt(record, parent, started).parent : null;
  return [parent, grand].filter(Boolean) as string[];
}
const commitRef = (value: string) => { const m = /^(?:([a-z][a-z0-9-]*)[@ ])?([0-9a-f]{7,40})$/.exec(String(value).trim()); return m ? { repo: m[1] || "", sha: m[2] } : null; };
const submits = (record: Event[], id: string, before = Infinity) => record.filter((e) => e.id === id && e.seq < before && isMove(e, "submit", "submit-spec"));
// Each ref of every submit of the issue, once, in the order first named; `submit` is the last submit that names it.
// A later round's submit names the commits of that round alone, so the last submit does not have them all.
function submitted(record: Event[], id: string, before = Infinity) {
  const refs = new Map<string, { kind: string; value: string; submit: number }>();
  for (const e of submits(record, id, before)) for (const r of e.refs || []) refs.set(`${r.kind} ${r.value}`, { kind: String(r.kind), value: String(r.value), submit: e.seq });
  return [...refs.values()];
}

type Asked = { where: string; quote: string; kind: 1 | 2 | 3 | 4; said: string };
// One `asked:` line of a verdict, held against the record and the files: what it rests on, or why it does not hold.
export function asked(record: Event[], git: Git, line: string, { id, verdict, delegation }: { id: string; verdict: number; delegation: string }): Asked | { why: string } {
  const m = /^asked: (\S+) "(.*)"(?: answers (\d+))?\s*$/.exec(line);
  if (!m) return { why: `not read as asked: <where> "<his words>": ${line.slice(0, 80)}` };
  const [, where, quote, answers] = m, long = [...quote].length >= MIN, kin = family(record, id);
  if (/^\d+$/.test(where)) {
    const e = record.find((x) => x.seq === Number(where));
    if (!e || e.hidden) return { why: `event ${where} is not in the record read` };
    if (e.seq >= verdict) return { why: `event ${where} is not before the verdict` };
    if (e.id !== id && !kin.includes(e.id)) return { why: `event ${where} is of ${e.id}: not the issue, nor its parent or that one's parent when it was started` };
    if (/^secret:appr-/.test(holder(e))) return { why: `event ${where} was written by an approver (${holder(e).slice(7)}), which is no word of his (R6)` };
    if ((delegation && via(e) === delegation) || (isMove(e, "approve") && via(e).startsWith("delegation:"))) return { why: `event ${where} was made by the approver's delegation, which is no word of his (R6)` };
    const his = via(e) === "session" && uuid.test(e.key || "");
    if (long) {
      if (!texts(e).some((t) => t.includes(quote))) return { why: `the quotation is not in event ${where}, letter for letter` };
    } else {
      if (!his || !texts(e).some((t) => t.trim() === quote)) return { why: `a quotation of fewer than ${MIN} characters is the whole text of an event of his own, and event ${where} is not that` };
      const a = record.find((x) => x.seq === Number(answers));
      if (!a || a.type !== "commented" || a.id !== e.id || a.seq >= e.seq) return { why: `a quotation of fewer than ${MIN} characters names the comment it answered, before it on the same issue (\` answers <seq>\`)` };
    }
    return { where, quote, kind: his ? 1 : 4, said: his ? `on your words of event ${where}` : `on words a session quoted at event ${where}` };
  }
  if (!long) return { why: `a quotation of fewer than ${MIN} characters is the whole text of an event of his own, not of a file` };
  if (where === "rules.md" || where === RULES || PHILOSOPHY.includes(where)) {
    const text = PHILOSOPHY.includes(where) ? git.philosophy() : git.text(git.main, RULES);
    if (text == null) return { why: `${where} could not be read at ${git.main}` };
    return text.includes(quote) ? { where, quote, kind: 3, said: `on your words in ${where.split("/").at(-1)}` } : { why: `the quotation is not in ${where} at ${git.main}, letter for letter` };
  }
  if (/^plan\/[^/]+\.md$/.test(where)) {
    const whys: string[] = [];
    for (const project of kin) {
      const approve = record.filter((e) => e.id === project && e.seq < verdict && isMove(e, "approve")).at(-1);
      if (!approve) continue;
      if (via(approve) !== "session") { whys.push(`the spec of ${project} was approved ${via(approve) || "by no session"} (event ${approve.seq}), not via session (R6)`); continue; }
      const submit = record.filter((e) => e.id === project && e.seq < approve.seq && isMove(e, "submit-spec")).at(-1);
      const commits = (submit?.refs || []).filter((r: any) => r.kind === "commit").map((r: any) => commitRef(r.value)).filter((c: any) => c && !c.repo || c?.repo === "lopecode-dev");
      if (!submit || !(String(submit.reason || "").includes(where) || commits.some((c: any) => git.files("", c.sha)?.includes(where)))) { whys.push(`${where} is not the spec the submit-spec of ${project} before its approve names`); continue; }
      if (commits.some((c: any) => git.text(c.sha, where)?.includes(quote))) return { where, quote, kind: 2, said: "on the spec you approved" };
      whys.push(`the quotation is not in ${where} at the commit the submit-spec of ${project} names (event ${submit.seq}), letter for letter`);
    }
    return { why: whys[0] || `${where}: neither the issue's parent nor that one's parent has an approved spec` };
  }
  return { why: `${where} is not an event, philosophy.md, rules.md or the spec of the issue's project` };
}

// Whether `approve` may be sent for a verdict, and the move. `before` and `live: false` are check's: the issue as it
// stood before an approve that was made, without the blobs of now.
export function judge(record: Event[], policyRead: any, git: Git, { id, verdict, before = Infinity, live = true }: { id: string; verdict: number; before?: number; live?: boolean }) {
  const policy = policyOf(policyRead), i = issueAt(record, id, before), why: string[] = [], no = (exit: number, ...w: string[]) => ({ exit, why: w, delegation: "", asked: [] as Asked[], send: null });
  if (!i.seen) return no(1, `no issue ${id} is in the record read`);
  const move = (policy.workflows[i.workflow]?.moves || []).find((m: any) => m.name === "approve"), delegation = delegationOf(move?.guard);
  if (!delegation) return no(3, `the approve guard of the policy in force (event ${policy.seq}) names no delegation (${move?.guard ?? "no approve move"}): nothing is sent until the owner installs one that does`);
  if (i.state !== "awaiting-approval") why.push(`the issue is at ${i.state}, not awaiting-approval`);
  const mine = record.filter((e) => e.id === id && e.seq < before && !e.hidden), v = mine.find((e) => e.seq === verdict);
  if (!v || v.type !== "commented") return { ...no(1, ...why, `event ${verdict} is not a comment of ${id}`), delegation };
  const body = String(v.body || "");
  if (v.key !== `approver/${id}/verdict-${i.rounds}`) why.push(`the verdict's key is ${v.key}, not approver/${id}/verdict-${i.rounds}`);
  if (v.seq < i.toApproval) why.push(`the verdict (event ${v.seq}) is from before the last move to awaiting-approval (event ${i.toApproval})`);
  if (!body.startsWith("approver: approve")) why.push(`the verdict does not begin \`approver: approve\``);
  const left = mine.filter(leaves).map((e) => e.seq);
  if (left.length) why.push(`the issue was left to the owner (\`approver: leave\`, event ${left.join(", ")}): he approves it or nobody does (R4)`);
  if (!/^secret:appr-[0-9a-f]{6}$/.test(holder(v))) why.push(`the verdict's holder is ${holder(v) || "no token"}, not an appr- token (R5)`);
  const role = mine.find((e) => (isMove(e, "start", "spec", "submit", "submit-spec") || e.type === "reviewed") && ((holder(e) && holder(e) === holder(v)) || (via(e).startsWith("delegation:") && via(e) === via(v))));
  if (role) why.push(`the verdict's holder made the ${role.type === "reviewed" ? "review" : role.move} of event ${role.seq} (R5)`);
  const pins = pinsOf(policy.reason), blob = /brief ([0-9a-f]{40})\s*$/.exec(body)?.[1] || "";
  if (!pins) why.push(`the reason of the policy in force (event ${policy.seq}) does not end \`approver brief <blob> tool <blob>\` (R7)`);
  else {
    if (blob !== pins.brief) why.push(`the verdict ends ${blob ? "brief " + blob : "with no `brief <blob>`"}, and the policy names the brief ${pins.brief} (R7)`);
    if (live && git.blob(BRIEF) !== pins.brief) why.push(`${BRIEF} at ${git.main} is ${git.blob(BRIEF) ?? "absent"}, and the policy names ${pins.brief} (R7)`);
    if (live && git.blob(TOOL) !== pins.tool) why.push(`${TOOL} at ${git.main} is ${git.blob(TOOL) ?? "absent"}, and the policy names ${pins.tool} (R7)`);
    if (live && git.self() !== pins.tool) why.push(`the tool that runs is ${git.self() ?? "not hashed"}, and the policy names ${pins.tool} (R7)`);
  }
  const last = submits(record, id, before).at(-1)?.seq ?? 0, refs = submitted(record, id, before).filter((r) => r.kind === "commit");
  if (!refs.length) why.push(`the issue has no submit with a commit ref to read`);
  else if (!refs.some((r) => r.submit === last)) why.push(`the last submit of the issue (event ${last}) has no commit ref to read`);
  for (const r of refs) {
    const c = commitRef(r.value), files = c ? git.files(c.repo, c.sha) : null;
    if (!files) { why.push(`the ref ${r.value} is not a commit the checkout has`); continue; }
    for (const f of files) {
      const cells = f === SEED ? seedTouch(git, c!.sha) : undefined;
      if (own(f, cells)) why.push(`the ref ${r.value} touches ${f}${cells ? `, its policy cells (${cells.join(", ")})` : ""}: the approver does not approve a change to itself (R7)`);
    }
  }
  const lines = body.split("\n").filter((l) => l.startsWith("asked: ")), found: Asked[] = [];
  if (!lines.length) why.push(`the verdict has no line \`asked: <where> "<his words>"\` (R3)`);
  for (const l of lines) { const a = asked(record, git, l, { id, verdict: v.seq, delegation }); "why" in a ? why.push(a.why + " (R3)") : found.push(a); }
  if (why.length) return { exit: 1, why, delegation, asked: found, send: null };
  return { exit: 0, why, delegation, asked: found, send: { key: `approver/${id}/approve-${i.rounds}`, id, to: move.to as string, reason: `${body.slice(0, 200)}\nverdict ${v.seq}, brief ${blob}`, refs: [] } };
}

// What an approver reads of an issue before it judges.
export function facts(record: Event[], git: Git, id: string) {
  const i = issueAt(record, id), mine = record.filter((e) => e.id === id && !e.hidden), submit = submits(record, id).at(-1);
  const refs = submitted(record, id).map((r) => {
    const c = r.kind === "commit" ? commitRef(r.value) : null, files = c ? git.files(c.repo, c.sha) : null;
    return { ...r, files: files ? files.map((file) => { const cells = file === SEED ? seedTouch(git, c!.sha) : undefined; return { file, marks: marks(file, cells), ...(cells ? { cells } : {}) }; }) : null };
  });
  return {
    id, seen: i.seen, state: i.state, round: i.rounds, verdictKey: `approver/${id}/verdict-${i.rounds}`, family: family(record, id),
    submit: submit?.seq ?? 0, review: mine.filter((e) => e.type === "reviewed" && e.verdict === "pass").at(-1)?.seq ?? 0,
    verdicts: mine.filter((e) => verdictKey.test(e.key || "")).map((e) => e.seq), left: mine.filter(leaves).map((e) => e.seq), extra: i.extra, refs
  };
}
export function factsText(f: ReturnType<typeof facts>) {
  if (!f.seen) return [`no issue ${f.id} is in the record read`];
  const lines = [`${f.id}: at ${f.state}, round ${f.round}; the verdict's key is ${f.verdictKey}`,
    `parent and its parent when it was started: ${f.family.join(", ") || "none"}`,
    `last submit: event ${f.submit || "none"}; passing review: event ${f.review || "none"}; verdicts: ${f.verdicts.join(", ") || "none"}${f.left.length ? `; left to the owner at ${f.left.join(", ")}` : ""}`,
    ...f.extra.map((x) => `guard added to ${x.move} (event ${x.n}): ${x.guard}`)];
  for (const r of f.refs) {
    lines.push(`${r.kind} ${r.value}${r.kind !== "commit" ? "" : r.files ? `: ${r.files.length} file${r.files.length === 1 ? "" : "s"}` : ": not a commit the checkout has"}${r.submit === f.submit ? "" : ` (of the submit of event ${r.submit}, not of the last)`}`);
    for (const x of r.files || []) lines.push(`  ${x.marks.length ? ("[" + x.marks.join(",") + "]").padEnd(10) : "".padEnd(10)} ${x.file}${x.cells ? (x.cells.length ? `: ${x.cells.join(", ")}` : ": no policy cell") : ""}`);
  }
  return lines;
}

const byDelegation = (record: Event[]) => record.filter((e) => !e.hidden && isMove(e, "approve") && via(e).startsWith("delegation:"));
const named = (e: Event) => Number(/verdict (\d+), brief [0-9a-f]{40}\s*$/.exec(String(e.reason || ""))?.[1] || 0);

// Each approve made by a delegation that does not stand as `approve` would have sent it.
export function check(record: Event[], git: Git) {
  const policies = record.filter((e) => e.type === "policy"), failed: { seq: number; id: string; why: string[] }[] = [];
  const costs = new Set(record.filter((e) => e.type === "cost" && e.role === "approver" && /^secret:orch-/.test(holder(e))).map((e) => e.token));
  for (const e of byDelegation(record)) {
    const policy = policies.filter((p) => p.seq < e.seq).at(-1), verdict = named(e), why: string[] = [];
    if (!verdict) why.push("its reason names no verdict");
    const j = judge(record, policy, git, { id: e.id, verdict, before: e.seq, live: false });
    if (verdict || j.exit === 3) why.push(...j.why);
    if (j.delegation && j.delegation !== via(e)) why.push(`it was made ${via(e)}, and the guard named ${j.delegation}`);
    const v = record.find((x) => x.seq === verdict), token = holder(v).replace(/^secret:/, "");
    if (v && !costs.has(token)) why.push(`the verdict's token ${token || "(none)"} is the token of no cost event of role approver written by an orch- holder`);
    if (why.length) failed.push({ seq: e.seq, id: e.id, why });
  }
  return { approves: byDelegation(record).length, failed };
}

// The approves made for the owner, newest first, each as one line he reads.
export function list(record: Event[], git: Git, { since = 0 }: { since?: number } = {}) {
  return byDelegation(record).filter((e) => e.at >= since).reverse().map((e) => {
    const v = record.find((x) => x.seq === named(e)), line = String(v?.body || "").split("\n").find((l) => l.startsWith("asked: "));
    const a = v && line ? asked(record, git, line, { id: e.id, verdict: v.seq, delegation: via(e) }) : { why: "no asked: line is read" };
    const reverted = record.some((x) => x.id === e.id && x.seq > e.seq && isMove(x, "revert", "owner-reject"));
    return { seq: e.seq, id: e.id, at: e.at, verdict: v?.seq ?? 0, on: "why" in a ? `on no words the tool finds (${a.why})` : a.said, sentence: v ? sentence(String(v.body || "")) : "", reverted };
  });
}
export const listText = (rows: ReturnType<typeof list>) => rows.map((r) => `${stamp(r.at)}  ${r.id}  ${r.on}${r.reverted ? "  reverted" : ""}  ${r.sentence}`);

// The verdicts written in the open, counted as part 6 of the spec gives it.
export function trial(record: Event[], git: Git) {
  const all = record.filter((e) => !e.hidden && e.type === "commented" && verdictKey.test(e.key || "")), made = all.filter((e) => /^test-/.test(e.id)), open = all.filter((e) => !/^test-/.test(e.id));
  const is = (e: Event, word: string) => String(e.body || "").startsWith("approver: " + word), approve = open.filter((e) => is(e, "approve")), leave = open.filter((e) => is(e, "leave"));
  const after = (e: Event, ...moves: string[]) => record.some((x) => x.id === e.id && x.seq > e.seq && via(x) === "session" && isMove(x, ...moves));
  const undone = approve.filter((e) => after(e, "send-back", "owner-reject", "revert")), approved = approve.filter((e) => !undone.includes(e) && after(e, "approve"));
  const kinds = [0, 0, 0, 0, 0];
  for (const e of approve) {
    const line = String(e.body).split("\n").find((l) => l.startsWith("asked: ")), a = line ? asked(record, git, line, { id: e.id, verdict: e.seq, delegation: "" }) : { why: "" };
    kinds["why" in a ? 0 : a.kind]++;
  }
  const whys = { "no word of his": 0, "his to weigh": 0, "more than the words": 0, "not secure": 0, "could not tell": 0, "the approver's own files": 0, other: 0 } as Record<string, number>;
  for (const e of leave) { const w = /^why: (.*)$/m.exec(String(e.body))?.[1].trim() || ""; whys[w in whys ? w : "other"]++; }
  return {
    verdicts: open.length, approve: approve.length, leave: leave.length, neither: open.length - approve.length - leave.length,
    approved: approved.length, undone: undone.length, waiting: approve.length - approved.length - undone.length,
    kinds: { event: kinds[1], spec: kinds[2], file: kinds[3], quoted: kinds[4], none: kinds[0] }, whys,
    made: { verdicts: made.length, approve: made.filter((e) => is(e, "approve")).length, leave: made.filter((e) => is(e, "leave")).length },
    lines: open.map((e) => `${e.seq}  ${e.id}  ${String(e.body || "").split("\n")[0].slice(0, 200)}`)
  };
}
export function trialText(t: ReturnType<typeof trial>) {
  return [
    `verdicts ${t.verdicts}   approve ${t.approve}   leave ${t.leave}${t.neither ? `   neither ${t.neither}` : ""}`,
    `of approve:   he approved ${t.approved}   he sent back, rejected or reverted ${t.undone}   still waiting ${t.waiting}`,
    `of approve:   on an event of his ${t.kinds.event}   on a spec he approved ${t.kinds.spec}   on his words in a file ${t.kinds.file}   on words a session quoted ${t.kinds.quoted}${t.kinds.none ? `   on no words the tool finds ${t.kinds.none}` : ""}`,
    `of leave:     no word of his ${t.whys["no word of his"]}   his to weigh ${t.whys["his to weigh"]}   more than the words ${t.whys["more than the words"]}   not secure ${t.whys["not secure"]}   could not tell ${t.whys["could not tell"]}   the approver's own files ${t.whys["the approver's own files"]}   other ${t.whys.other}`,
    `made issues (test-): verdicts ${t.made.verdicts}   approve ${t.made.approve}   leave ${t.made.leave}`,
    ...t.lines
  ];
}

if (import.meta.main) {
  const argv = process.argv.slice(2), flags = ["token", "since", "record", "policy"];
  const arg = (n: string, d = "") => { const at = argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`)); return at < 0 ? d : argv[at].includes("=") ? argv[at].slice(argv[at].indexOf("=") + 1) : argv[at + 1] ?? d; };
  const words = argv.filter((a, n) => !a.startsWith("--") && !flags.some((f) => argv[n - 1] === `--${f}`)), [cmd, ...rest] = words, json = argv.includes("--json");
  const here = dirname(import.meta.path), root = process.env.APPROVER_ROOT ? resolve(process.env.APPROVER_ROOT) : resolve(here, "../..");
  const git = gitOf(root, process.env.APPROVER_MAIN || "origin/main", import.meta.path), fetched = () => !!process.env.APPROVER_MAIN || git.fetch();
  const stop = (code: number, ...lines: string[]): never => { for (const l of lines) console.error(l); process.exit(code); };
  const usage = "approver.ts brief | facts <id> | approve <id> <verdict seq> | check | list [--since=<hours>] | trial | id [<issue>]   (--token NAME for all but brief and id; the header of the file says what each does)";
  const token = arg("token"), files = { record: arg("record"), policy: arg("policy") };
  const as = process.env.ISSUE_AS || join(here, "issue-as.sh");
  const ask = (path: string) => {
    if (!token || token.startsWith("--")) stop(2, "approver.ts: no --token; nothing was sent", "  " + usage, "  NAME is your own token, the one your prompt names (a name issue-as.sh keeps)");
    try { return JSON.parse(execFileSync(as, [token, path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 })); }
    catch (e: any) { return stop(2, `approver.ts: ${path.split("?")[0]} was not read with ${token}: ${String(e?.stderr || e?.message || e).trim().split("\n").at(-1)}`); }
  };
  const record = (): Event[] => {
    if (files.record) return JSON.parse(readFileSync(files.record, "utf8"));
    const events: Event[] = [];
    for (let after = 0; ; ) {
      const page = ask(`sync?after=${after}&limit=500`).events || [];
      events.push(...page);
      if (page.length < 500) return events;
      after = page.at(-1).seq;
    }
  };
  // The state directory as issue-as.sh finds it: a worktree has no token of its own.
  const stateDir = () => {
    if (process.env.BRAIN_STATE_DIR) return resolve(process.env.BRAIN_STATE_DIR);
    try { return join(dirname(execFileSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()), "tools/cloud-brain/.emitted"); }
    catch { return join(here, ".emitted"); }
  };
  const send = async (method: string, body: any) => {
    const file = join(stateDir(), "cb4-tokens.json"), kept = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    const value = Object.hasOwn(kept, TOKEN) && typeof kept[TOKEN] === "string" ? kept[TOKEN] : "";
    if (!value) stop(2, `approver.ts: no token ${TOKEN} is kept; nothing was sent. The orchestrating session makes it, from the main checkout: brain.ts token ${TOKEN} issue.move issue.comment`);
    try {
      const r = await fetch(`${process.env.ISSUE_AS_BASE || "https://cb4.endpointservices.workers.dev"}/xrpc/com.lopecode.brain.issue.${method}`, { method: "POST", headers: { authorization: "Bearer " + value, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      return { status: r.status, body: await r.json().catch(() => null) as any };
    } catch (e: any) { return stop(2, `approver.ts: the tracker was not reached (${String(e?.message || e).replaceAll(value, "…")}); whether ${body.key} was written is not known: read the issue`); }
  };
  const out = (found: any, lines: string[]) => { if (json) console.log(JSON.stringify(found)); else if (lines.length) console.log(lines.join("\n")); };

  if (cmd === "brief") {
    if (!fetched()) stop(2, `approver.ts: ${git.main} was not fetched; nothing is printed`);
    const blob = git.blob(BRIEF), text = blob ? git.text(git.main, BRIEF) : null;
    if (!blob || text == null) stop(1, `approver.ts: ${git.main} has no ${BRIEF}`);
    process.stdout.write(text + (text!.endsWith("\n") ? "" : "\n") + `brief ${blob}\n`);
  } else if (cmd === "facts" && rest[0]) {
    const f = facts(record(), git, rest[0]);
    out(f, factsText(f));
    if (!f.seen) process.exit(1);
  } else if (cmd === "approve" && rest[0] && /^\d+$/.test(rest[1] || "")) {
    const id = rest[0], policy = files.policy ? JSON.parse(readFileSync(files.policy, "utf8")) : ask("policy");
    const guards = Object.values(policyOf(policy).workflows).map((w: any) => (w?.moves || []).find((m: any) => m.name === "approve")?.guard).filter(Boolean);
    // Before the record is read: until the install no guard names a delegation, and no run needs more than this.
    if (!guards.some(delegationOf)) stop(3, `approver.ts: no approve guard of the policy in force (event ${policyOf(policy).seq}) names a delegation; nothing was sent. The verdict comment stands as the run's result`);
    if (!fetched()) stop(2, `approver.ts: ${git.main} was not fetched; nothing was sent`);
    const j = judge(record(), policy, git, { id, verdict: Number(rest[1]) });
    if (j.exit) { if (json) console.log(JSON.stringify(j)); stop(j.exit, `approver.ts: no move was sent for ${id}`, ...j.why.map((w) => "  " + w)); }
    if (files.record || files.policy) { out(j, [`not sent (read from a file): ${JSON.stringify(j.send)}`]); process.exit(0); }
    const r = await send("move", j.send);
    if (r.status !== 200 || !r.body?.seq) stop(4, `approver.ts: the tracker refused the move: ${r.status} ${JSON.stringify(r.body)}`);
    // A key kept before answers its event to the actor that wrote it, and to anyone else the place alone.
    if (r.body.duplicate && !r.body.event) { if (json) console.log(JSON.stringify({ ...j, answer: r.body })); stop(4, `approver.ts: no approve was made for ${id}: the key ${j.send!.key} is kept already as event ${r.body.seq}, which another actor wrote. Read the issue`); }
    out({ ...j, answer: r.body }, [`approved ${id}: event ${r.body.seq}${r.body.duplicate ? " (sent before; nothing new was written)" : ""}, to ${j.send!.to}, ${j.asked.map((a) => a.said).join("; ")}`]);
  } else if (cmd === "check") {
    const c = check(record(), git);
    out(c, [...c.failed.flatMap((f) => [`approve ${f.seq} of ${f.id}:`, ...f.why.map((w) => "  " + w)]), `${c.approves} approves by a delegation, ${c.failed.length} that do not stand`]);
    if (c.failed.length) process.exit(1);
  } else if (cmd === "list") {
    const given = argv.some((a) => a === "--since" || a.startsWith("--since=")), raw = arg("since"), hours = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : 0;
    if (given && !(hours > 0 && Number.isFinite(hours * 3600e3))) stop(2, `approver.ts: the hours of --since were not read (${JSON.stringify(raw)}); nothing was listed`, "  --since=<hours> takes a number above 0, as 24 or 0.5; with no --since every approve is listed");
    const rows = list(record(), git, { since: given ? Date.now() - hours * 3600e3 : 0 });
    out(rows, listText(rows));
  } else if (cmd === "trial") {
    const t = trial(record(), git);
    out(t, trialText(t));
  } else if (cmd === "id") {
    const issue = rest[0] || "ap-4-policy-v3";
    for (let n = 1; n <= 20; n++) {
      const key = n === 1 ? "approver/id" : `approver/id-${n}`;
      const r = await send("comment", { key, id: issue, body: `approver.ts id: sent with ${TOKEN}, so that the id of its delegation is read from this event's by.via (plan/cloud-brain-approver-persona.md, part 1).` });
      if (r.status !== 200) stop(4, `approver.ts: the tracker refused the comment: ${r.status} ${JSON.stringify(r.body)}`);
      const id = r.body?.event?.by?.via;
      if (id) { console.log(id); process.exit(0); }
    }
    stop(1, "approver.ts: twenty keys from approver/id are each held by another delegation; no id was read");
  } else stop(2, usage);
}
