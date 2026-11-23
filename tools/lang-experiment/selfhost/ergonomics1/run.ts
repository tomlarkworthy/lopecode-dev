// bun run.ts [--manifest manifest.ts] [--id NN] [--check-only] <file.ts|file.tsx>...
// Checks each program with checkSources (tsx only for .tsx), prints every diagnostic in full, and for an accepted
// program runs it with runCells (checker verdicts passed, deterministic caps, a frame queue) and its manifest drive.
import { checkSources } from "../../lite/core.ts";
import { runCells } from "../../lite/browser/run.ts";
import { scheduler } from "../../lite/browser/cells.ts";
import { basename } from "node:path";
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]!; args.splice(i, 2); return v; };
const manifestPath = opt("--manifest") ?? "./manifest.ts";
const forcedId = opt("--id");
const force = args.includes("--force"); if (force) args.splice(args.indexOf("--force"), 1);
const checkOnly = args.includes("--check-only"); if (checkOnly) args.splice(args.indexOf("--check-only"), 1);
const { M } = await import(new URL(manifestPath, `file://${import.meta.dir}/`).pathname);
const frames: (() => void)[] = [];
scheduler.frame = (f) => void frames.push(f);
const late: string[] = [];
process.on("unhandledRejection", (e: any) => late.push("unhandledRejection " + String(e?.message ?? e).slice(0, 200)));
const origErr = console.error, origWarn = console.warn;
const consoleLines: string[] = [];
console.error = (...a: unknown[]) => consoleLines.push("console.error " + a.map(String).join(" ").slice(0, 300));
console.warn = (...a: unknown[]) => consoleLines.push("console.warn " + a.map(String).join(" ").slice(0, 300));
const ROUTES: Record<string, [number, unknown]> = {
  "https://example.test/repos.json": [200, [{ name: "a", stars: 5, language: "ts" }, { name: "b", stars: 9, language: "go" }, { name: "c", stars: 1, language: "ts" }]],
  "https://example.test/price/A": [200, { sku: "A", price: 3 }],
  "https://example.test/price/B": [200, { sku: "B", price: 1 }],
  "https://example.test/price/C": [200, { sku: "C", price: 2 }],
  "https://example.test/users/1": [200, { name: "ann" }],
  "https://example.test/users/2": [200, { name: "bob" }],
  "https://example.test/a.json": [200, { n: 1 }],
  "https://example.test/b.json": [200, { n: 2 }],
};
const fakeFetch = (async (url: string) => { const r = ROUTES[String(url)]; return r ? new Response(JSON.stringify(r[1]), { status: r[0], headers: { "content-type": "application/json" } }) : new Response("not found", { status: 404 }); }) as any;
let clockT = 1000;
const caps = { now: () => () => (clockT += 16), random: () => { let s = 0.25; return () => (s = (s * 9301 + 0.49297) % 1); }, fetch: fakeFetch };
const kids = (e: any): unknown[] => (e && typeof e === "object" && "children" in e ? (e.children as unknown[]) : Array.isArray(e) ? e : []);
const text = (e: unknown): string => e === null || e === undefined || typeof e === "boolean" ? "" : typeof e === "string" || typeof e === "number" ? String(e) : Array.isArray(e) ? e.map(text).join("") : kids(e).map(text).join("");
const find = (e: unknown, f: (x: any) => boolean, out: any[] = []): any[] => { if (e && typeof e === "object") { if (!Array.isArray(e) && "tag" in (e as any) && f(e)) out.push(e); for (const k of kids(e)) find(k, f, out); } return out; };
const out: any[] = [];
for (const file of args) {
  const id = forcedId ?? basename(file).slice(0, 2);
  const src = await Bun.file(file).text();
  const tsx = file.endsWith(".tsx");
  const m = M[id];
  console.log(`== ${file} [${id}${m ? " " + m.cat : ""}]`);
  let r: any;
  try { r = checkSources({ cells: src, tsx, outside: [], foreign: null } as any); } catch (x) { console.log(`   CHECKER CRASH ${(x as Error).stack?.slice(0, 400)}`); out.push({ file, id, crash: String(x) }); continue; }
  const cells = r.cells.map((c: any) => ({ name: c.name, status: c.status, errors: c.errors.map((e: any) => ({ rule: e.rule, line: e.line, msg: e.msg })), unsupported: c.unsupported.map((e: any) => e.msg ?? String(e)), blockedBy: c.blockedBy }));
  for (const e of r.module) console.log(`   module [${e.rule}] line ${e.line}: ${e.msg}`);
  for (const c of cells) {
    if (c.status === "ok") continue;
    console.log(`   ${c.name}: ${c.status}${c.blockedBy?.length ? " by " + c.blockedBy.join(",") : ""}`);
    for (const e of c.errors) console.log(`      [${e.rule}] line ${e.line}: ${e.msg}`);
    for (const u of c.unsupported) console.log(`      {unsupported} ${u}`);
  }
  const accepted = r.module.length === 0 && cells.length > 0 && cells.every((c: any) => c.status === "ok");
  const rec: any = { file, id, accepted, module: r.module, cells: cells.filter((c: any) => c.status !== "ok") };
  console.log(`   VERDICT ${accepted ? "ACCEPT" : "REJECT"} (${cells.filter((c: any) => c.status === "ok").length}/${cells.length} cells ok)`);
  if ((accepted || force) && !checkOnly) {
    if (force && !accepted) { console.log("   FORCED RUN (checker verdict overridden to ok)"); r = { ...r, cells: r.cells.map((c: any) => ({ ...c, status: "ok", errors: [] })) }; }
    late.length = 0; consoleLines.length = 0; frames.length = 0;
    let prog: any;
    try { prog = runCells(src, { tsx, checked: r, caps }); } catch (x) { console.log(`   RUN CRASH ${(x as Error).message}`); rec.run = "crash " + (x as Error).message; out.push(rec); continue; }
    const pump = async (n = 12) => { for (let i = 0; i < n; i++) { const fs = frames.splice(0); for (const f of fs) f(); await prog.settle(300); } };
    try {
      await prog.settle(1500);
      await pump(2);
      const ctx = { p: prog, v: (n: string) => prog.value(n), pump, text, find,
        act: async (n: string, ...a: unknown[]) => { const f = prog.value(n); if (typeof f !== "function") return `${n} is not callable (${prog.status(n)} ${prog.error(n) ?? ""})`; try { f(...a); } catch (e) { return `${n} threw ${(e as Error).message}`; } await prog.settle(400); return null; } };
      const [pass, note] = m ? await m.drive(ctx) : [false, "no manifest entry"];
      rec.pass = pass; rec.note = note;
      console.log(`   RUN ${pass ? "PASS" : "FAIL"} ${note}`);
      for (const x of prog.recs.values()) if (x.status === "rejected") { console.log(`   cell error ${x.name}: ${String(x.error?.message ?? x.error).slice(0, 250)}`); (rec.cellErrors ??= []).push(`${x.name}: ${String(x.error?.message ?? x.error).slice(0, 250)}`); }
      for (const l of prog.logs ?? []) console.log(`   log ${l}`);
    } catch (x) { console.log(`   DRIVE CRASH ${(x as Error).message}`); rec.pass = false; rec.note = "drive crash " + (x as Error).message; }
    finally { await new Promise((res) => setTimeout(res, 20)); prog.dispose(); }
    for (const l of [...late, ...consoleLines]) console.log(`   ${l}`);
    rec.late = [...late, ...consoleLines];
  }
  out.push(rec);
}
const jsonOut = opt("--json");
if (process.env.ERG_JSON) await Bun.write(process.env.ERG_JSON, JSON.stringify(out, null, 1));
console.error = origErr; console.warn = origWarn;
process.exit(0);
