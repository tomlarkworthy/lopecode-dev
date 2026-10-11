#!/usr/bin/env bun
// agent-usage.ts TRANSCRIPT [--last-run]                    what a run was billed, from its transcript
// agent-usage.ts --session S [--agent ID] [--last-run]      the same, found under ~/.claude*/projects
// One JSON line: { input, cacheWrite, cacheRead, output, requests, advisor: { calls, input, output } }, the sums
// over the requests of the run. A request is one message id; its last usage line is the whole of it. --last-run
// counts from the last prompt in the file, which for an agent that was sent a second round is that round alone.
// The advisor's tokens are another model's and are not in the four sums. Exit 1: no transcript, or no request in it.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function usageOf(text: string, lastRun = false) {
  const rows = text.split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  let from = 0;
  if (lastRun) rows.forEach((o, i) => {
    const c = o.type === "user" && o.message?.content;
    if (typeof c === "string" || (Array.isArray(c) && !c.some((x) => x.type === "tool_result"))) from = i;
  });
  const last = new Map<string, any>();
  for (const o of rows.slice(from)) if (o.type === "assistant" && o.message?.id && o.message.usage) last.set(o.message.id, o.message.usage);
  const sum = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, requests: last.size, advisor: { calls: 0, input: 0, output: 0 } };
  for (const u of last.values()) {
    const its = Array.isArray(u.iterations) && u.iterations.length ? u.iterations : [{ ...u, type: "message" }];
    for (const it of its) {
      if (it.type === "message") {
        sum.input += it.input_tokens || 0; sum.cacheWrite += it.cache_creation_input_tokens || 0;
        sum.cacheRead += it.cache_read_input_tokens || 0; sum.output += it.output_tokens || 0;
      } else {
        sum.advisor.calls++;
        sum.advisor.input += (it.input_tokens || 0) + (it.cache_creation_input_tokens || 0) + (it.cache_read_input_tokens || 0);
        sum.advisor.output += it.output_tokens || 0;
      }
    }
  }
  return sum;
}

export function find(session: string, agent?: string, home = homedir()) {
  for (const d of readdirSync(home).filter((n) => n.startsWith(".claude"))) {
    const projects = join(home, d, "projects");
    if (!existsSync(projects)) continue;
    for (const p of readdirSync(projects)) {
      const f = agent ? join(projects, p, session, "subagents", `agent-${agent}.jsonl`) : join(projects, p, session + ".jsonl");
      if (existsSync(f)) return f;
    }
  }
}

if (import.meta.main) {
  const a = process.argv.slice(2);
  const opt = (n: string) => (a.includes(n) ? a[a.indexOf(n) + 1] : undefined);
  const session = opt("--session"), agent = opt("--agent");
  const file = session ? find(session, agent) : a.find((x, i) => !x.startsWith("--") && !["--session", "--agent"].includes(a[i - 1]));
  if (!file || !existsSync(file)) { console.error("agent-usage.ts: no transcript" + (session ? " for session " + session + (agent ? " agent " + agent : "") : "; give a file or --session")); process.exit(1); }
  const u = usageOf(readFileSync(file, "utf8"), a.includes("--last-run"));
  if (!u.requests) { console.error("agent-usage.ts: no request in " + file); process.exit(1); }
  console.log(JSON.stringify(u));
}
