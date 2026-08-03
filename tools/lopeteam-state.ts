#!/usr/bin/env bun
// lopeteam durable state: backlog.json + lessons.md + progress.md per notebook slug.
// State lives in .claude/lopeteam/<slug>/ (central, keyed by slug). On-disk only.
//
// Commands:
//   init        <slug>
//   add         <slug> --axis A --title T [--files a,b] [--value 1-5] [--evidence E]
//   list        <slug> [--status open|accepted|rejected|parked|done] [--axis A] [--json]
//   set         <slug> <id> --status S [--note N] [--attempts N]
//   lesson      <slug> --text T
//   lessons     <slug>
//   round       <slug> --accepted N [--note N]   # logs a round, advances/ resets the dry counter
//   dry         <slug>                            # prints empty-round streak + whether dry (>= N)
//   summary     <slug>
//
// Dry rule: a run is "dry" after N consecutive rounds with 0 accepted improvements
// (backlog-empty rounds count as 0-accepted). Default N=2; override with --threshold on `dry`.

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const baseDir = (slug: string) => join(ROOT, ".claude", "lopeteam", slug);

type Item = {
  id: string;
  axis: string;
  title: string;
  files: string[];
  value: number; // 1 (low) .. 5 (high)
  evidence: string;
  status: "open" | "accepted" | "rejected" | "parked" | "done";
  attempts: number;
  note: string;
  created: string; // round index when added, as string
};
type Backlog = { slug: string; nextId: number; rounds: number; emptyStreak: number; items: Item[] };

function load(slug: string): Backlog {
  const f = join(baseDir(slug), "backlog.json");
  if (!existsSync(f)) return { slug, nextId: 1, rounds: 0, emptyStreak: 0, items: [] };
  return JSON.parse(readFileSync(f, "utf8"));
}
function save(b: Backlog) {
  const dir = baseDir(b.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "backlog.json"), JSON.stringify(b, null, 2) + "\n");
}
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const [cmd, slug, ...rest] = process.argv.slice(2);
if (!cmd || !slug) {
  console.error("usage: lopeteam-state.ts <cmd> <slug> [...]  (cmds: init add list set lesson lessons round dry summary)");
  process.exit(1);
}

switch (cmd) {
  case "init": {
    const b = load(slug);
    save(b);
    const dir = baseDir(slug);
    for (const [name, seed] of [
      ["lessons.md", `# Lessons learned — ${slug}\n\nKnown-failing edits, gotchas, and dead ends. Critics read this to avoid re-proposing; appliers read it to avoid re-attempting.\n`],
      ["progress.md", `# Progress log — ${slug}\n\nOne entry per round. Newest at the bottom.\n`],
    ] as const) {
      const p = join(dir, name);
      if (!existsSync(p)) writeFileSync(p, seed);
    }
    console.log(`initialized ${dir}`);
    break;
  }
  case "add": {
    const b = load(slug);
    const axis = flag("axis") ?? "code";
    const title = flag("title") ?? "(untitled)";
    const files = (flag("files") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    // dedupe: same axis + normalized title, still live (not rejected/done)
    const dup = b.items.find(
      (it) => it.axis === axis && norm(it.title) === norm(title) && !["rejected", "done"].includes(it.status),
    );
    if (dup) {
      console.log(`dup ${dup.id} (already ${dup.status})`);
      break;
    }
    const item: Item = {
      id: `B${b.nextId++}`,
      axis,
      title,
      files,
      value: Number(flag("value") ?? 3),
      evidence: flag("evidence") ?? "",
      status: "open",
      attempts: 0,
      note: "",
      created: String(b.rounds),
    };
    b.items.push(item);
    save(b);
    console.log(`added ${item.id}`);
    break;
  }
  case "list": {
    const b = load(slug);
    const st = flag("status");
    const ax = flag("axis");
    let items = b.items.filter((it) => (!st || it.status === st) && (!ax || it.axis === ax));
    // open items sorted by value desc so the orchestrator picks the highest-value first
    items = items.sort((a, z) => z.value - a.value);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify(items, null, 2));
    } else if (items.length === 0) {
      console.log("(none)");
    } else {
      for (const it of items)
        console.log(`${it.id} [${it.axis} v${it.value} ${it.status} a${it.attempts}] ${it.title}${it.files.length ? `  {${it.files.join(",")}}` : ""}`);
    }
    break;
  }
  case "set": {
    const b = load(slug);
    const id = rest[0];
    const it = b.items.find((x) => x.id === id);
    if (!it) { console.error(`no item ${id}`); process.exit(1); }
    const status = flag("status");
    if (status) it.status = status as Item["status"];
    const note = flag("note");
    if (note !== undefined) it.note = note;
    const attempts = flag("attempts");
    if (attempts !== undefined) it.attempts = Number(attempts);
    save(b);
    console.log(`${it.id} -> ${it.status}`);
    break;
  }
  case "lesson": {
    const text = flag("text");
    if (!text) { console.error("--text required"); process.exit(1); }
    mkdirSync(baseDir(slug), { recursive: true });
    appendFileSync(join(baseDir(slug), "lessons.md"), `\n- ${text}\n`);
    console.log("logged lesson");
    break;
  }
  case "lessons": {
    const f = join(baseDir(slug), "lessons.md");
    console.log(existsSync(f) ? readFileSync(f, "utf8") : "(no lessons file; run init)");
    break;
  }
  case "round": {
    const b = load(slug);
    b.rounds += 1;
    const accepted = Number(flag("accepted") ?? 0);
    b.emptyStreak = accepted > 0 ? 0 : b.emptyStreak + 1;
    save(b);
    const note = flag("note") ?? "";
    appendFileSync(
      join(baseDir(slug), "progress.md"),
      `\n## Round ${b.rounds}\n- accepted: ${accepted}\n- emptyStreak: ${b.emptyStreak}\n${note ? `- note: ${note}\n` : ""}`,
    );
    console.log(`round ${b.rounds} logged (accepted=${accepted}, emptyStreak=${b.emptyStreak})`);
    break;
  }
  case "dry": {
    const b = load(slug);
    const threshold = Number(flag("threshold") ?? 2);
    const openCount = b.items.filter((it) => it.status === "open").length;
    const isDry = b.emptyStreak >= threshold;
    console.log(JSON.stringify({ rounds: b.rounds, emptyStreak: b.emptyStreak, threshold, openItems: openCount, dry: isDry }));
    process.exit(isDry ? 0 : 2); // exit 0 == dry (stop), 2 == keep going (scriptable)
  }
  case "summary": {
    const b = load(slug);
    const by: Record<string, Record<string, number>> = {};
    for (const it of b.items) {
      by[it.axis] ??= {};
      by[it.axis][it.status] = (by[it.axis][it.status] ?? 0) + 1;
    }
    console.log(`slug=${slug} rounds=${b.rounds} emptyStreak=${b.emptyStreak} items=${b.items.length}`);
    console.log(JSON.stringify(by, null, 2));
    break;
  }
  default:
    console.error(`unknown cmd: ${cmd}`);
    process.exit(1);
}
