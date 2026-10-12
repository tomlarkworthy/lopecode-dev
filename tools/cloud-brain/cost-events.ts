#!/usr/bin/env bun
// The runs the loop wrote as `cost {…}` comments, entered again as `cost` events (issue.cost), each once.
//   bun tools/cloud-brain/cost-events.ts --token NAME [--check MODULE.js] [--post]
// Task 4 of plan/cloud-brain-run-cost-is-part-of-the-issue-model.md, "The runs already there (R6)"; issue
// cm-4-enter-the-runs-again; tools/cloud-brain/records/cm-4-enter-the-runs-again.md.
// Read from issue.sync with a token, through issue-as.sh (run it from the main checkout: a worktree has no tokens).
// --token is the caller's own token and has no default: with none the tool exits 2 and nothing is sent.
// With no --post it reads only. It prints one line of JSON for each call it would make, one line for each comment it
// leaves out with why, and a last line of counts that ends `<n> to enter`. Exit 1 when a comment is left out.
// --check MODULE.js gives each body to `issueAct` of that module, the tracker's own shape check, and prints what it
// refuses: MODULE.js is a built @tomlarkworthy/brain-issues, as cloud-brain-dev/deploy/ has what cb4 runs after sync.ts.
// A refused body is exit 1, and with --post nothing is then sent.
// --post sends them in the order of the comments, and stops at the first answer that is not a new event (a key the
// tracker kept already is such an answer). What was sent before the stop stays; the tool run again goes on from there.
//
// What a call is made from:
//   the comment `cost {…}`: role, round, outcome, seconds, tools, event, token, usd as they are; `tokens` as `context`;
//     `how` is light when `light`, resumed when `resumed`, else fresh; `backfilled` when it is true;
//   `usage` from the line, else from the comment `cost-usage {"of":<its seq>,…}` of the same issue (the last such, when
//     two name one comment); `agent` and `session` from the line, else from that comment; a null of the three texts is left out;
//   `of` is the cost comment's seq. The `how` and the `backfilled` of a cost-usage comment are not carried.
//   The key is cost/<id>/<role>/<round>, and cost/<id>/<role>/<round>/<n> for the n-th comment of one issue, role and
//   round from the second: the tracker takes it as a correction, and the last stands.
// A comment is entered already when a `cost` event of its issue has its seq as `of`. It is passed over, and counted
// apart, when a `cost` event of its issue, role and round has no `of` or a later one: that run was written again
// after the comment, and entering the comment would put the older figures in its place.
// Left out, each with a line: a body that does not parse, a required field that is missing, a field this list does not
// name, `light` and `resumed` both. An event hidden to the token is not read.
// ISSUE_AS_SH names another issue-as.sh: the test's, and the main checkout's when the tool is run from a worktree.
// `plan`, `checked` and `post` take what was read and a sender and call nothing: tests/tools/cost-events.test.ts.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

const arg = (n: string, d: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  return at < 0 ? d : process.argv[at].includes("=") ? process.argv[at].split("=")[1] : process.argv[at + 1] ?? d;
};

const REQUIRED = ["role", "round", "tokens", "seconds", "outcome"], AS_THEY_ARE = ["tools", "event", "token", "usd"];
const KNOWN = [...REQUIRED, ...AS_THEY_ARE, "agent", "session", "usage", "light", "resumed", "backfilled"];

type Call = { key: string; id: string; [field: string]: any };
type Left = { seq: number; id: string; why: string };

// The JSON after a prefix, or null when the body is not that kind of comment; `undefined` when it does not parse.
const told = (e: any, prefix: string) => {
  if (e.type !== "commented" || e.hidden || !String(e.body || "").startsWith(prefix + " {")) return null;
  try { const v = JSON.parse(e.body.slice(prefix.length + 1)); return v && typeof v === "object" && !Array.isArray(v) ? v : undefined; }
  catch { return undefined; }
};

export function plan(record: any[]) {
  const usages = new Map<string, any>(), events = record.filter((e) => e.type === "cost" && !e.hidden);
  for (const e of record) { const u = told(e, "cost-usage"); if (u && Number.isInteger(u.of)) usages.set(`${e.id} ${u.of}`, u); }
  const send: Call[] = [], left: Left[] = [], passed: { seq: number; id: string; by: number }[] = [], nth: Record<string, number> = {};
  let comments = 0, entered = 0;
  for (const e of record) {
    const c = told(e, "cost");
    if (c === null) continue;
    comments++;
    const out = (why: string) => left.push({ seq: e.seq, id: e.id, why });
    if (c === undefined) { out("the body does not parse"); continue; }
    const missing = REQUIRED.filter((k) => c[k] == null), unknown = Object.keys(c).filter((k) => !KNOWN.includes(k));
    if (missing.length) { out(`no ${missing.join(", ")}`); continue; }
    const n = (nth[`${e.id} ${c.role} ${c.round}`] = (nth[`${e.id} ${c.role} ${c.round}`] || 0) + 1);
    if (unknown.length) { out(`a field this tool does not carry: ${unknown.join(", ")}`); continue; }
    if (c.light && c.resumed) { out("light and resumed both"); continue; }
    if (events.some((x) => x.id === e.id && x.of === e.seq)) { entered++; continue; }
    const later = events.find((x) => x.id === e.id && x.role === c.role && x.round === c.round && (x.of == null || x.of > e.seq));
    if (later) { passed.push({ seq: e.seq, id: e.id, by: later.seq }); continue; }
    const u = usages.get(`${e.id} ${e.seq}`) || {}, usage = c.usage ?? u.usage, agent = c.agent ?? u.agent, session = c.session ?? u.session;
    send.push({
      key: `cost/${e.id}/${c.role}/${c.round}${n > 1 ? `/${n}` : ""}`, id: e.id, role: c.role, round: c.round,
      how: c.light ? "light" : c.resumed ? "resumed" : "fresh", outcome: c.outcome, seconds: c.seconds, context: c.tokens,
      ...Object.fromEntries(AS_THEY_ARE.filter((k) => c[k] != null).map((k) => [k, c[k]])), of: e.seq,
      ...(agent != null ? { agent } : {}), ...(session != null ? { session } : {}), ...(usage != null ? { usage } : {}),
      ...(c.backfilled === true ? { backfilled: true } : {})
    });
  }
  return { comments, entered, passed, left, send };
}

// What the tracker's own shape check refuses of the calls: `act` is issueAct of a built brain-issues.
export const checked = (send: Call[], act: (type: string, body: any) => any) =>
  send.flatMap((b) => { try { act("cost", b); return []; } catch (e: any) { return [{ key: b.key, of: b.of, why: String(e?.message || e) }]; } });

// Sends in order. `sender` answers what the tracker answered, parsed, or throws. Stops at the first that is not a new event.
export function post(send: Call[], sender: (body: Call) => any) {
  let sent = 0;
  for (const b of send) {
    let a: any;
    try { a = sender(b); } catch (e: any) { a = { message: String(e?.message || e).split("\n")[0] }; }
    if (!Number.isInteger(a?.seq) || a.duplicate) return { sent, stopped: { key: b.key, of: b.of, why: a?.duplicate ? `the tracker kept the key already, at event ${a.seq}` : String(a?.message || a?.error || JSON.stringify(a)) } };
    sent++;
  }
  return { sent, stopped: null };
}

export const summary = (p: ReturnType<typeof plan>) =>
  `${p.comments} cost comments: ${p.entered} entered already, ${p.passed.length} passed over for a later cost event, ${p.left.length} left out; ` +
  `of those to enter, ${p.send.filter((b) => b.usage).length} with a usage, ${p.send.filter((b) => b.usd != null).length} with a usd, ` +
  `${["fresh", "resumed", "light"].map((h) => `${p.send.filter((b) => b.how === h).length} ${h}`).join(", ")}; ${p.send.length} to enter`;

if (import.meta.main) {
  const token = arg("token", ""), as = process.env.ISSUE_AS_SH || join(dirname(import.meta.path), "issue-as.sh"), module = arg("check", "");
  if (!token || token.startsWith("--")) {
    console.error("cost-events.ts: no --token; nothing was sent\n  bun tools/cloud-brain/cost-events.ts --token NAME [--check MODULE.js] [--post]\n  NAME is your own token, the one your prompt names (a name issue-as.sh keeps)");
    process.exit(2);
  }
  const call = (...a: string[]) => JSON.parse(execFileSync(as, [token, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const record: any[] = [];
  for (let after = 0; ; ) {
    const page = call(`sync?after=${after}&limit=500`).events || [];
    record.push(...page);
    if (page.length < 500) break;
    after = page.at(-1).seq;
  }
  const p = plan(record), sending = process.argv.includes("--post");
  if (!sending) for (const b of p.send) console.log(JSON.stringify(b));
  for (const l of p.left) console.log(`left out: comment ${l.seq} of ${l.id}: ${l.why}`);
  for (const l of p.passed) console.log(`passed over: comment ${l.seq} of ${l.id}: cost event ${l.by} stands for that run`);
  let refused: ReturnType<typeof checked> = [];
  if (module) {
    const { importNotebookModule } = await import("../notebook-import.ts");
    // issueAct names checkedRule, an import of another module, for a policy alone.
    const m = await importNotebookModule(resolve(module), { overrides: { checkedRule: () => { throw new Error("no rule is checked here"); } } });
    refused = checked(p.send, await m.value("issueAct"));
    for (const r of refused) console.log(`refused by issueAct: ${r.key}, comment ${r.of}: ${r.why}`);
    console.log(`checked with issueAct of ${module}: ${p.send.length - refused.length} taken, ${refused.length} refused`);
  }
  console.log(`at event ${record.at(-1)?.seq ?? 0}, ${record.filter((e) => e.hidden).length} events hidden to ${token}; ${summary(p)}`);
  if (!sending || refused.length) process.exit(p.left.length || refused.length ? 1 : 0);
  const r = post(p.send, (b) => call("cost", JSON.stringify(b)));
  if (r.stopped) console.log(`stopped at ${r.stopped.key}, comment ${r.stopped.of}: ${r.stopped.why}`);
  console.log(`posted ${r.sent} of ${p.send.length}`);
  process.exit(r.stopped || p.left.length ? 1 : 0);
}
