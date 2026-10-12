#!/usr/bin/env bun
// The checks of R1 and of the parent in plan/cloud-brain-record-names-token-not-agent.md ("How each requirement is known
// to be met"), made from the tracker's record: who wrote each event, set beside the `cost` lines.
//   bun tools/cloud-brain/token-checks.ts --token NAME [--after SEQ] [--until SEQ] [--json]
// Read from issue.sync with a token, through issue-as.sh, as issue-stats.ts reads it (ISSUE_AS names another one).
// --token is the caller's own token and has no default: with none nothing is sent, exit 2.
// --after is the spec's N, the event before the first round on the new tokens. With none it is the event before the
// first `start` by an `impl-` holder on an issue that is not one of the two `r6-check-` issues of ta-1b.
// --until reads the record as it was at that event, so a count written down with its event can be made again.
// --after and --until take a whole number, digits only. One that is given with anything else (abc, -5, 1.5, 1e3,
// another flag, nothing) is exit 2 with nothing read: `e.seq > NaN` is false for every event, so each check
// passed (issue token-checks-after-nan-reads-pass).
// When no event is after N (an N at or past the last event read), each pass says so on its line; the exit is not changed.
// A `cost` line is a `cost` event, or a comment whose key begins `cost` and whose body is `cost {json}` (the form of
// before cm-5-the-loop-writes-the-event). Its writer is its own `by.holder`.
// Not read here: `brain.ts agent-token list` (the live children; the parent's call) and both checks of R2.
// Exit 0 when r1.first, r1.third and parent pass, 1 when one does not, 2 when nothing was read. `checks` and `text` call nothing:
// tests/tools/token-checks.test.ts.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const arg = (n: string, d: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  return at < 0 ? d : process.argv[at].includes("=") ? process.argv[at].split("=")[1] : process.argv[at + 1] ?? d;
};
// The value of --n: undefined when it is not given, null when it is given and is not digits alone.
const whole = (n: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (at < 0) return undefined;
  const v = process.argv[at].includes("=") ? process.argv[at].slice(n.length + 3) : process.argv[at + 1] ?? "";
  return /^[0-9]+$/.test(v) ? Number(v) : null;
};

const OLD = ["issues-implementer-2", "issues-reviewer-2", "issues-overseer-1"];
const agentName = /^(orch|impl|rev|spec|over|dig|appr|out)-[0-9a-f]{6}$/;
const name = (e: any) => String(e.by?.holder || "").replace(/^secret:/, "");
const prefix = (n: string) => agentName.exec(n)?.[1] ?? "";

// A cost line of either form, or null.
const costLine = (e: any) => {
  if (e.type === "cost") return { seq: e.seq, writer: name(e), token: e.token, agent: e.agent, session: e.session };
  if (e.type !== "commented" || !String(e.key || "").startsWith("cost")) return null;
  try {
    const b = JSON.parse(String(e.body).replace(/^cost\s+/, ""));
    return { seq: e.seq, writer: name(e), token: b.token, agent: b.agent, session: b.session };
  } catch { return null; }
};

// Every key of `m` that has more than one value, with its values.
const many = (m: Map<string, Set<string>>) => [...m].filter(([, s]) => s.size > 1).map(([k, s]) => ({ name: k, beside: [...s].sort() }));
const put = (m: Map<string, Set<string>>, k: string, v: string) => (m.get(k) || m.set(k, new Set()).get(k)!).add(v);

export function checks(all: any[], opt: { after?: number; until?: number } = {}) {
  const events = opt.until != null ? all.filter((e) => e.seq <= opt.until!) : all;
  const firstStart = events.find((e) => e.type === "moved" && e.move === "start" && prefix(name(e)) === "impl" && !String(e.id).startsWith("r6-check-"));
  const after = opt.after ?? (firstStart ? firstStart.seq - 1 : 0);
  const since = events.filter((e) => e.seq > after);

  const old = OLD.map((token) => {
    const mine = since.filter((e) => name(e) === token), keys: Record<string, number> = {};
    for (const e of mine) { const k = String(e.key || "").split(/[/-]/)[0]; keys[k] = (keys[k] || 0) + 1; }
    return { token, events: mine.length, first: mine[0]?.seq ?? null, last: mine.at(-1)?.seq ?? null, keys };
  });

  const lines = events.map(costLine).filter(Boolean) as NonNullable<ReturnType<typeof costLine>>[];
  const byToken = new Map<string, Set<string>>(), byAgent = new Map<string, Set<string>>();
  for (const l of lines) if (l.token && l.agent) { put(byToken, l.token, l.agent); put(byAgent, l.agent, l.token); }
  const tokens = (orchOnly: boolean) => new Set(lines.filter((l) => l.token && (!orchOnly || prefix(l.writer) === "orch")).map((l) => l.token));
  const ofOrch = tokens(true), ofAny = tokens(false);

  const holders = new Map<string, { name: string; events: number; first: number; last: number }>();
  for (const e of since) {
    const n = name(e);
    if (!prefix(n)) continue;
    const h = holders.get(n) || holders.set(n, { name: n, events: 0, first: e.seq, last: e.seq }).get(n)!;
    h.events++; h.last = e.seq;
  }
  const of = (...p: string[]) => [...holders.values()].filter((h) => p.includes(prefix(h.name)));
  const five = of("impl", "rev", "spec", "over", "dig");
  const noLine = five.filter((h) => !ofOrch.has(h.name));
  const firstToken: Record<string, number> = {};
  for (const l of lines) if (l.token && prefix(l.token) && !(prefix(l.token) in firstToken)) firstToken[prefix(l.token)] = l.seq;
  const parent = since.filter((e) => name(e) === "loop-agents").length;
  const out = of("out");

  return {
    read: events.length, last: events.at(-1)?.seq ?? 0, after, afterN: since.length, firstStart: firstStart ? { seq: firstStart.seq, id: firstStart.id, by: name(firstStart) } : null,
    r1: {
      first: {
        pass: !many(byToken).length && old.every((o) => !o.events),
        pairs: [...byToken].length, tokenBesideTwoAgents: many(byToken), agentBesideTwoTokens: many(byAgent),
        tokenWithNoAgent: new Set(lines.filter((l) => l.token && !l.agent).map((l) => l.token)).size, old,
      },
      second: { pass: out.length ? true : null, out },
      third: {
        pass: !noLine.length, holders: five.length, withLine: five.length - noLine.length,
        // A holder whose last event is before the first cost line that names a token of its role could be on no line.
        noLine: noLine.map((h) => ({ ...h, anyWriter: ofAny.has(h.name), before: !(prefix(h.name) in firstToken) ? "no line names a token of this role" : h.last < firstToken[prefix(h.name)] ? `its last event is before ${firstToken[prefix(h.name)]}, the first line that names one` : "" })),
        firstToken, costLines: lines.length, withToken: lines.filter((l) => l.token).length, writers: count(lines.filter((l) => l.token).map((l) => prefix(l.writer) || l.writer)),
        orch: of("orch").map((h) => ({ ...h, costLines: lines.filter((l) => l.writer === h.name).length, sessions: count(lines.filter((l) => l.writer === h.name && l.agent).map((l) => l.session || "none")) })),
      },
    },
    parent: { pass: parent === 0, events: parent, inAll: events.filter((e) => name(e) === "loop-agents").length },
  };
}
const count = (l: string[]) => l.reduce((m: Record<string, number>, k) => ((m[k] = (m[k] || 0) + 1), m), {});
type Checks = ReturnType<typeof checks>;

export const passed = (c: Checks) => c.r1.first.pass && c.r1.third.pass && c.parent.pass;
const verdict = (p: boolean | null) => (p === null ? "not seen" : p ? "pass" : "FAIL");

export function text(c: Checks) {
  const f = c.r1.first, t = c.r1.third, l: string[] = [];
  // A pass that no event after N was read for.
  const none = c.afterN ? "" : "no event is after N", word = (p: boolean | null) => verdict(p) + (p && none ? ` (${none})` : "");
  l.push(`read ${c.read} events to ${c.last}; N = ${c.after}${none && `; ${none}`}${c.firstStart ? ` (the first start by an impl- token on an issue is ${c.firstStart.seq}, ${c.firstStart.id}, ${c.firstStart.by})` : ""}`);
  l.push(`R1, first check: ${word(f.pass)}`);
  l.push(`  ${f.pairs} tokens beside an agent in a cost line; beside two agents: ${f.tokenBesideTwoAgents.length}; agents beside two tokens: ${f.agentBesideTwoTokens.length}; tokens on a line with no agent: ${f.tokenWithNoAgent}`);
  for (const m of [...f.tokenBesideTwoAgents, ...f.agentBesideTwoTokens]) l.push(`    ${m.name}: ${m.beside.join(" ")}`);
  for (const o of f.old) l.push(`  ${o.token}: ${o.events} events after N${o.events ? `, ${o.first} to ${o.last}, keys ${JSON.stringify(o.keys)}` : ""}`);
  l.push(`R1, second check: ${word(c.r1.second.pass)}; ${c.r1.second.out.length} holders that start out-`);
  for (const h of c.r1.second.out) l.push(`  ${h.name}: ${h.events} events, ${h.first} to ${h.last}`);
  l.push(`R1, third check: ${word(t.pass)}, of what the record has (the live children are agent-token list's)`);
  l.push(`  ${t.holders} holders after N that start impl-, rev-, spec-, over- or dig-; ${t.withLine} are the token of a cost line an orch- token wrote; ${t.noLine.length} are not`);
  for (const h of t.noLine) l.push(`    ${h.name}: ${h.events} events, ${h.first} to ${h.last}${h.anyWriter ? "; on a line another writer wrote" : ""}${h.before ? `; ${h.before}` : ""}`);
  l.push(`  cost lines: ${t.costLines}, ${t.withToken} with a token, by the writer's role ${JSON.stringify(t.writers)}; the first that names a token of a role ${JSON.stringify(t.firstToken)}`);
  for (const h of t.orch) l.push(`  ${h.name}: ${h.events} events, ${h.first} to ${h.last}; wrote ${h.costLines} cost lines; the session of those with an agent ${JSON.stringify(h.sessions)}`);
  l.push(`the parent: ${word(c.parent.pass)}; secret:loop-agents wrote ${c.parent.events} events after N, ${c.parent.inAll} in all`);
  return l;
}

if (import.meta.main) {
  const token = arg("token", ""), as = process.env.ISSUE_AS || join(dirname(import.meta.path), "issue-as.sh");
  if (!token || token.startsWith("--")) {
    console.error("token-checks.ts: no --token; nothing was sent\n  bun tools/cloud-brain/token-checks.ts --token NAME [--after SEQ] [--until SEQ] [--json]\n  NAME is your own token, the one your prompt names (a name issue-as.sh keeps)");
    process.exit(2);
  }
  const opt = { after: whole("after"), until: whole("until") };
  for (const [n, v] of Object.entries(opt)) if (v === null) {
    console.error(`token-checks.ts: --${n} is not a whole number; nothing was read\n  --${n} SEQ is the seq of an event of the record, digits only: --${n} 2666`);
    process.exit(2);
  }
  const events: any[] = [];
  for (let after = 0; ; ) {
    const page = JSON.parse(execFileSync(as, [token, `sync?after=${after}&limit=500`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).events || [];
    events.push(...page);
    if (page.length < 500) break;
    after = page.at(-1).seq;
  }
  const c = checks(events, { after: opt.after ?? undefined, until: opt.until ?? undefined });
  console.log(process.argv.includes("--json") ? JSON.stringify(c) : text(c).join("\n"));
  process.exit(passed(c) ? 0 : 1);
}
