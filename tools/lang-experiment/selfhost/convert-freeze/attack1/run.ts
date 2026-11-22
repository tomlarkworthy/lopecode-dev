// bun run.ts [--force] [--only s] [--set progs|controls]: each program through the prototype checker (lite/core.ts
// checkSources, switches from env), and an accepted one (every one with --force) run by observe2.ts.
import { checkSources } from "../proto/tree/lite/core.ts";
import { PROTO_LOG } from "../proto/tree/lite/browser/run.ts";
import { observeDeep } from "./observe2.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]!; };
const FORCE = process.argv.includes("--force"), ONLY = arg("--only"), SET = arg("--set") ?? "progs";
const LIST = arg("--list") ? new Set((await Bun.file(arg("--list")!).text()).split("\n").filter(Boolean)) : null;
const { progs } = await import(SET === "controls" ? "./controls.ts" : SET === "ergo" ? "./ergo.ts" : "./progs.ts");

const verdict = (src: string) => {
  try {
    const r = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as any);
    const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length || c.unsupported.length);
    const text = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]`), ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}] ${(e.msg ?? e.message ?? "").slice(0, 70)}`).join("")}`)].join(" ")}` : "ACCEPT";
    return { ok: !bad.length && !r.module.length && r.cells.length > 0, text };
  } catch (x) { return { ok: false, text: `CRASH ${(x as Error).message}` }; }
};

let n = 0, acc = 0, silentN = 0, runErr = 0;
const silentList: string[] = [];
for (const p of progs) {
  if (ONLY && !p.name.includes(ONLY)) continue;
  if (LIST && !LIST.has(p.name)) continue;
  n++;
  const v = verdict(p.src);
  if (v.ok) acc++;
  console.log(`== ${p.name} [${p.mech ?? "-"}]: ${v.text.slice(0, 300)}`);
  if (!v.ok && !FORCE) continue;
  try {
    const o = await observeDeep(p);
    if (process.env.SHOW_REWRITE) console.log(`   rewritten: ${PROTO_LOG.rewritten}`);
    for (const l of o.changed) console.log(`   CHANGED ${l}`);
    for (const e of o.errors) console.log(`   error ${e}`);
    for (const e of o.unhandled) console.log(`   unhandled ${e}`);
    console.log(`   tracked ${o.tracked} objects, ${o.calls} calls`);
    if (o.silent.length) { silentN++; silentList.push(`${p.name} [${p.mech ?? "-"}]${v.ok ? "" : " (checker rejected; forced)"}`); }
    if (o.errors.length || o.unhandled.length) runErr++;
  } catch (x) { console.log(`   run crash: ${(x as Error).message}`); runErr++; }
}
console.log(`-- ${SET}: ${n} programs, accepted ${acc}, silent ${silentN}, with a run-time error ${runErr}${FORCE ? " (forced)" : ""}`);
for (const s of silentList) console.log(`SILENT ${s}`);
process.exit(0);
