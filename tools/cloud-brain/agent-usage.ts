#!/usr/bin/env bun
// agent-usage.ts TRANSCRIPT [--last-run | --run N]                    what a run was billed, from its transcript
// agent-usage.ts --session S [--agent ID] [--last-run | --run N]      the same, found under ~/.claude*/projects
// One JSON line: { input, cacheWrite, cacheRead, output, requests, advisor: { calls, input, output } }, the sums
// over the requests of the run. A request is one message id; its last usage line is the whole of it. --last-run
// counts from the last prompt in the file, which for an agent that was sent a second round is that round alone;
// --run N counts the Nth prompt's run, from 1, up to the next prompt.
// The advisor's tokens are another model's and are not in the four sums. Exit 1: no transcript, or no request in it.
//
// A prompt is a row a person or the coordinator sent. Every `user` row is one kind (kindOf), by the first line
// of this table that fits it, and STARTS names the kinds that are prompts. Counts and the reason for each line:
// records/usage-local-command-starts-a-run.md.
//
//   kind              the row                                                              starts a run
//   tool-result       content has a tool_result block                                      no
//   compact-summary   isCompactSummary, whatever its origin                                no
//   tool-written      sourceToolUseID (a Skill call's text), whatever its origin           no
//   coordinator       origin.kind "coordinator", isMeta or not                             yes
//   human-mid-turn    origin.kind "human", isMeta: typed while a turn ran                  no
//   human             origin.kind "human": typed, queued, a slash command of a skill       yes
//   channel, peer, task-notification: origin.kind of that name                           no
//   origin-other      any other origin.kind                                                no
//   meta              isMeta, no origin: a skill's text, an image's note, the caveat       no
//                     before a local command, a scheduled task's prompt, "Continue from…"
//   interrupted       text begins "[Request interrupted"                                   no
//   shell-command     text begins <bash-input>: a `!` command, which the model answers     yes
//   local-command     text begins <command-name>, <local-command-std…> or <bash-std…>:     no
//                     /model, /compact, /exit and their output, a `!` command's output
//   plain             anything else with no origin: a subagent's first prompt, a prompt    yes
//                     of `claude -p`, a slash command of a skill (<command-message>)
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const STARTS = new Set(["coordinator", "human", "shell-command", "plain"]);
const ORIGINS = ["coordinator", "human", "channel", "peer", "task-notification"];

// The kind of a transcript row by the table above; null for a row that is no user message.
export function kindOf(o: any): string | null {
  const c = o?.type === "user" ? o.message?.content : undefined;
  if (typeof c !== "string" && !Array.isArray(c)) return null;
  if (Array.isArray(c) && c.some((x) => x?.type === "tool_result")) return "tool-result";
  if (o.isCompactSummary) return "compact-summary";
  if (o.sourceToolUseID) return "tool-written";
  if (o.origin) return o.origin.kind === "human" && o.isMeta ? "human-mid-turn" : ORIGINS.includes(o.origin.kind) ? o.origin.kind : "origin-other";
  if (o.isMeta) return "meta";
  const text = String(typeof c === "string" ? c : c.find((x) => x?.type === "text")?.text ?? "").trimStart();
  if (text.startsWith("[Request interrupted")) return "interrupted";
  if (text.startsWith("<bash-input>")) return "shell-command";
  if (/^<(command-name>|local-command-std|bash-std)/.test(text)) return "local-command";
  return "plain";
}

// run: undefined is the whole file, "last" the last prompt's run, N the Nth prompt's (null when there is no Nth).
export function usageOf(text: string, run?: boolean | "last" | number) {
  const rows = text.split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const prompts: number[] = [];
  rows.forEach((o, i) => { if (STARTS.has(kindOf(o) ?? "")) prompts.push(i); });
  const request = (o: any) => o.type === "assistant" && o.message?.id && o.message.usage;
  let from = 0, to = rows.length;
  if (run === true || run === "last") from = prompts.at(-1) ?? 0;
  else if (typeof run === "number") {
    if (!Number.isInteger(run) || run < 1 || run > prompts.length) return null;
    from = prompts[run - 1]; to = prompts[run] ?? rows.length;
  }
  const last = new Map<string, any>();
  for (const o of rows.slice(from, to)) if (request(o)) last.set(o.message.id, o.message.usage);
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
  const file = session ? find(session, agent) : a.find((x, i) => !x.startsWith("--") && !["--session", "--agent", "--run"].includes(a[i - 1]));
  if (!file || !existsSync(file) || !statSync(file).isFile()) { console.error("agent-usage.ts: no transcript" + (session ? " for session " + session + (agent ? " agent " + agent : "") : "; give a file or --session")); process.exit(1); }
  const n = a.includes("--run") ? opt("--run") ?? "" : undefined;
  const u = usageOf(readFileSync(file, "utf8"), n !== undefined ? (/^[0-9]+$/.test(n) ? Number(n) : NaN) : a.includes("--last-run") ? "last" : undefined);
  if (!u) { console.error("agent-usage.ts: no run " + n + " in " + file); process.exit(1); }
  if (!u.requests) { console.error("agent-usage.ts: no request in " + file); process.exit(1); }
  console.log(JSON.stringify(u));
}
