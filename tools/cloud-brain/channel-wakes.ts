#!/usr/bin/env bun
// channel-wakes.ts TRANSCRIPT [--match TEXT]              what the tabs paired with a session cost it
// channel-wakes.ts --session S [--match TEXT]             the same, found under ~/.claude*/projects
// Reads a session's transcript and counts the rows a channel server sent it (origin.kind "channel": connected,
// variable_update, cell_change, disconnected of a paired tab) and the requests the session made in answer.
// One JSON line: { rows, byType, notebooks, matched, first, last, answers: { requests, input, cacheWrite,
// cacheRead, output } }. `notebooks` is how many different addresses the rows name, without the fragment.
// --match TEXT: `matched` is the rows whose text has TEXT (a worktree's path, a file's name); null without it.
// `answers` is every request whose prompt was a channel row: the nearest row before it that is not a tool's
// result. A row that arrived while a turn ran is in `rows` and starts no request of its own, so `answers.requests`
// is the turns the rows cost and is not `rows`. Exit 1: no transcript.
// Record: records/writers-qa-tabs-wake-the-orchestrator.md.
import { readFileSync, existsSync, statSync } from "node:fs";
import { kindOf, find } from "./agent-usage.ts";

export function wakesOf(text: string, match?: string) {
  const rows = text.split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const byType: Record<string, number> = {}, notebooks = new Set<string>(), last = new Map<string, any>();
  let n = 0, matched = 0, first: string | null = null, end: string | null = null, prompt: string | null = null;
  for (const o of rows) {
    const kind = kindOf(o);
    if (kind === "channel") {
      const c = o.message.content, body = typeof c === "string" ? c : c.map((x: any) => x?.text ?? "").join("");
      const type = /<channel[^>]*\stype="([^"]*)"/.exec(body)?.[1] ?? "other";
      byType[type] = (byType[type] || 0) + 1;
      const nb = /<channel[^>]*\snotebook="([^"#]*)/.exec(body)?.[1];
      if (nb) notebooks.add(nb);
      if (match && body.includes(match)) matched++;
      n++; first ??= o.timestamp ?? null; end = o.timestamp ?? end;
    }
    if (kind && kind !== "tool-result") prompt = kind;
    if (prompt === "channel" && o.type === "assistant" && o.message?.id && o.message.usage) last.set(o.message.id, o.message.usage);
  }
  const answers = { requests: last.size, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  for (const u of last.values()) {
    answers.input += u.input_tokens || 0; answers.cacheWrite += u.cache_creation_input_tokens || 0;
    answers.cacheRead += u.cache_read_input_tokens || 0; answers.output += u.output_tokens || 0;
  }
  return { rows: n, byType, notebooks: notebooks.size, matched: match ? matched : null, first, last: end, answers };
}

if (import.meta.main) {
  const a = process.argv.slice(2);
  const opt = (name: string) => (a.includes(name) ? a[a.indexOf(name) + 1] : undefined);
  const session = opt("--session");
  const file = session ? find(session) : a.find((x, i) => !x.startsWith("--") && !["--session", "--match"].includes(a[i - 1]));
  if (!file || !existsSync(file) || !statSync(file).isFile()) { console.error("channel-wakes.ts: no transcript" + (session ? " for session " + session : "; give a file or --session")); process.exit(1); }
  console.log(JSON.stringify(wakesOf(readFileSync(file, "utf8"), opt("--match"))));
}
