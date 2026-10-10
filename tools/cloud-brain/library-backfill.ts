#!/usr/bin/env bun
// Puts the notebooks of lopecode/notebooks (public) then lopebooks/notebooks (private) into a Brain's library,
// through `brain.ts curl`. Resumable: a file whose sha256 is already in the log as ok is skipped.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/library-backfill.ts [--plan] [--limit N] [--only public|private]
import { readdirSync, readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const base = process.env.BRAIN_BASE || "";
if (!base) throw new Error("BRAIN_BASE");
const args = process.argv.slice(2), flag = (n: string) => args.includes(n), opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const logPath = join(root, "tools/cloud-brain/.emitted", base + "-library-backfill.jsonl");
mkdirSync(dirname(logPath), { recursive: true });
const done = new Map<string, any>();
if (existsSync(logPath)) for (const l of readFileSync(logPath, "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); if (r.status === 200) done.set(r.name + ":" + r.sha256, r); }

const MAX = 50 * 1024 * 1024, NAME = /^[A-Za-z0-9@._-]{1,80}$/;
// The library already calls this notebook `cloud-brain`.
const rename: Record<string, string> = { "@tomlarkworthy_cloud-brain": "cloud-brain" };
const read = (dir: string, open: boolean) => readdirSync(join(root, dir)).filter((f) => f.endsWith(".html")).sort().map((f) => {
  const path = join(root, dir, f), bytes = readFileSync(path);
  const stem = f.slice(0, -5);
  return { path, dir, stem, name: rename[stem] || stem, open, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), notebook: bytes.includes('id="bootconf.json"') };
});
const pub = read("lopecode/notebooks", true), priv = read("lopebooks/notebooks", false);
const taken = new Map(pub.map((p) => [p.name, p]));
const plan: any[] = [], skipped: any[] = [];
for (const n of [...pub, ...priv]) {
  if (!n.notebook) skipped.push({ ...n, why: "no bootconf.json block" });
  else if (n.size > MAX) skipped.push({ ...n, why: `${n.size} bytes, over ${MAX}` });
  else if (!n.open && taken.has(n.name)) {
    // Published keeps the name. The staging copy is skipped when it is the same file, else kept beside it.
    if (taken.get(n.name)!.sha256 === n.sha256) skipped.push({ ...n, why: "the same file as the published one" });
    else plan.push({ ...n, name: n.name + ".staging" });
  } else plan.push(n);
}
for (const p of plan) if (!NAME.test(p.name)) { skipped.push({ ...p, why: "name" }); }
// A module's card is written by the last public put that has it, so a notebook that modules/canonical.json names as
// the home of more modules goes later. A heuristic: two homes that embed each other's module cannot both be last.
const homes = new Map<string, number>();
for (const where of Object.values(JSON.parse(readFileSync(join(root, "modules/canonical.json"), "utf8"))) as any[]) for (const p of Object.values(where || {})) if (typeof p === "string") homes.set(p, (homes.get(p) || 0) + 1);
const rank = (p: any) => homes.get(p.dir + "/" + p.stem + ".html") || 0;
const todo = plan.filter((p) => NAME.test(p.name)).filter((p) => !opt("--only") || (opt("--only") === "public") === p.open)
  .sort((a, b) => Number(b.open) - Number(a.open) || rank(a) - rank(b) || a.name.localeCompare(b.name));
const bytes = (l: any[]) => l.reduce((a, p) => a + p.size, 0);
console.log(JSON.stringify({ public: todo.filter((p) => p.open).length, private: todo.filter((p) => !p.open).length, bytes: bytes(todo), staging: todo.filter((p) => p.name.endsWith(".staging")).length, alreadyDone: todo.filter((p) => done.has(p.name + ":" + p.sha256)).length, skipped: skipped.map((s) => [s.dir.split("/")[0], s.stem.slice(0, 60), s.why]) }, null, 1));
if (flag("--plan")) process.exit(0);

let left = Number(opt("--limit") || Infinity);
for (const p of todo) {
  if (done.has(p.name + ":" + p.sha256)) continue;
  if (left-- <= 0) break;
  const t0 = Date.now();
  const proc = Bun.spawn(["bun", join(root, "tools/cloud-brain/brain.ts"), "curl", `/xrpc/com.lopecode.brain.library.put?name=${encodeURIComponent(p.name)}&public=${p.open}`, "--owner", "-S", "--retry", "2", "-m", "300", "-X", "POST", "-H", "content-type: text/html", "--data-binary", "@" + p.path], { stdout: "pipe", stderr: "pipe", env: process.env });
  const out = (await new Response(proc.stdout).text()).trim(), err = (await new Response(proc.stderr).text()).trim().slice(0, 200);
  await proc.exited;
  const m = /^([\s\S]*) \[(\d+)\]$/.exec(out) || [null, out, "0"];
  let body: any = null; try { body = JSON.parse(m[1]!); } catch { body = { raw: String(m[1]).slice(0, 300) }; }
  const row = { at: new Date().toISOString(), name: p.name, from: p.dir.split("/")[0], open: p.open, size: p.size, sha256: p.sha256, status: Number(m[2]), ms: Date.now() - t0, cards: body.cards, error: body.error, message: body.message || err || body.raw };
  appendFileSync(logPath, JSON.stringify(row) + "\n");
  console.log(row.at.slice(11, 19), row.status, String(row.ms).padStart(6), String(row.cards ?? "-").padStart(4), p.open ? "public " : "private", p.name, row.error || "");
}
