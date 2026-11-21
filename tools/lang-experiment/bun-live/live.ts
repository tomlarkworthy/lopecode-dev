#!/usr/bin/env bun
// Boots the SoundScript notebook in bun once and keeps it; each `check` applies the source edits since the last one as
// variable redefinitions and reports what recomputed. See README.md.
//   bun tools/lang-experiment/bun-live/live.ts [--root dir] [--notebook f.html] [--filter s] [--serve] [--socket path]
//       [--no-watch] [--no-initial] [--poll ms] [--timeout ms] [--dump out.json]
import { existsSync, mkdirSync, rmSync, watch, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Live, type Line } from "./engine.ts";
import { DEFAULT_NOTEBOOK, REPO, SCRATCH } from "./root.ts";

const argv = process.argv.slice(2);
const opt = { root: REPO, notebook: DEFAULT_NOTEBOOK, filter: null as string | null, serve: false, socket: join(SCRATCH, "live.sock"), watch: true, initial: true, poll: 100, timeout: 30000, dump: null as string | null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--root") opt.root = resolve(argv[++i]);
  else if (a === "--notebook") opt.notebook = resolve(argv[++i]);
  else if (a === "--filter") opt.filter = argv[++i];
  else if (a === "--serve") opt.serve = true;
  else if (a === "--socket") opt.socket = resolve(argv[++i]);
  else if (a === "--no-watch") opt.watch = false;
  else if (a === "--no-initial") opt.initial = false;
  else if (a === "--poll") opt.poll = Number(argv[++i]);
  else if (a === "--timeout") opt.timeout = Number(argv[++i]);
  else if (a === "--dump") opt.dump = resolve(argv[++i]);
  else { console.error(`unknown argument ${a}`); process.exit(2); }
}
const say = (s: string) => process.stdout.write(s + "\n");
// the notebook's console output is not this tool's
for (const k of ["log", "info", "warn", "error", "debug", "trace"] as const) (console as any)[k] = () => {};
process.on("unhandledRejection", () => {});
mkdirSync(SCRATCH, { recursive: true });

const live = new Live({ root: opt.root, notebook: opt.notebook, poll: opt.poll, timeout: opt.timeout, filter: opt.filter });
await live.start();
if (opt.dump) {
  writeFileSync(opt.dump, JSON.stringify({ bootMs: live.bootMs, ...(await live.dump()) }, null, 1));
  live.dispose();
  process.exit(0);
}
say(`booted ${opt.notebook} in ${(live.bootMs / 1000).toFixed(2)} s`);
if (opt.initial) for (const l of await live.check(true)) say(l.text);

let unasked: Line[] | null = null;
async function run(line: string): Promise<Line[]> {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  switch (cmd) {
    case "check": {
      // a save the watcher already applied is reported to the next `check`, so its exit code covers it
      const ls = await live.check();
      if (unasked && ls.length === 1 && ls[0].text.startsWith("nothing changed")) { const u = unasked; unasked = null; return u; }
      unasked = null;
      // with nothing new, tests that still fail keep the exit code at 1
      if (ls.length === 1 && ls[0].text.startsWith("nothing changed")) return [...ls, ...(await live.tests(live.filter)).filter((l) => l.bad)];
      return ls;
    }
    case "tests": await live.busy; return live.tests(rest[0] ?? live.filter);
    case "verdict": await live.busy; return rest[0] ? live.verdictOf(rest[0]) : [{ kind: "error", text: "verdict <cell>", bad: true }];
    case "status": return live.status();
    case "js": return [{ kind: "js", text: String(await new Function("live", `return (async () => (${rest.join(" ")}))()`)(live)) }];
    case "dump": await live.busy; return [{ kind: "dump", text: JSON.stringify(await live.dump()) }];
    case "quit": setImmediate(() => { live.dispose(); if (opt.serve) rmSync(opt.socket, { force: true }); process.exit(0); }); return [{ kind: "quit", text: "bye" }];
    case "": return [];
    default: return [{ kind: "error", text: `unknown command ${cmd}; check, tests [filter], verdict <cell>, status, quit`, bad: true }];
  }
}
const guarded = (line: string) => run(line).catch((e) => [{ kind: "error", text: `error: ${e?.stack ?? e}`, bad: true }] as Line[]);

// a socket write takes what fits; the rest goes on drain
const flush = (sock: any) => {
  if (!sock.pending) return;
  const n = sock.write(sock.pending);
  sock.pending = n < sock.pending.length ? sock.pending.subarray(n) : null;
  if (!sock.pending) sock.end();
};
if (opt.serve) {
  rmSync(opt.socket, { force: true });
  Bun.listen({
    unix: opt.socket,
    socket: {
      data(sock, data) {
        guarded(data.toString()).then((lines) => {
          (sock as any).pending = Buffer.from(lines.map((l) => l.text).join("\n") + (lines.length ? "\n" : "") + `__exit ${lines.some((l) => l.bad) ? 1 : 0}\n`);
          flush(sock);
        });
      },
      drain: (sock) => flush(sock),
    },
  });
  say(`serving on ${opt.socket}`);
}
if (opt.watch) {
  // saves are coalesced into one check: a save during a check marks it to run again when it ends
  let queued = false;
  const kick = () => {
    if (queued) return;
    queued = true;
    live.busy.then(() => setTimeout(() => { queued = false; live.check().then((ls) => { if (ls.length > 1 || !ls[0]?.text.startsWith("nothing")) { ls.forEach((l) => say(l.text)); unasked = ls; } }); }, 30));
  };
  for (const dir of [live.lite, join(opt.root, "tools/lang-experiment")]) {
    if (!existsSync(dir)) continue;
    watch(dir, { recursive: dir === live.lite }, (_e, f) => { if (f && /\.(tsx?|ojs|js)$/.test(String(f)) && !String(f).includes(".scratch")) kick(); });
  }
}
say("ready");
createInterface({ input: process.stdin }).on("line", (l) => guarded(l).then((lines) => lines.forEach((x) => say(x.text))));
