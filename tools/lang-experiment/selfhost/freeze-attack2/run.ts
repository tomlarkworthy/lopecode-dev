// bun run.ts <batch.ts> [--only s] [--compiled]: each candidate through the live checker (run-sets verdictOf) and,
// when accepted, through observe.ts (runCells: the compiled cells' text with registrations, events pumped).
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { observeProgram } from "../../lite/infer/attack/observe.ts";
import { rewriteSS } from "../../lite/infer/attack/strip-calls.ts";
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]!; };
const ONLY = arg("--only"), COMPILED = process.argv.includes("--compiled");
let n = 0, acc = 0, sil = 0;
const silent: string[] = [];
for (const f of process.argv.slice(2).filter((x) => x.endsWith(".ts"))) {
  const { attacks } = await import(new URL(f, `file://${process.cwd()}/`).pathname);
  for (const p of attacks) {
    if (ONLY && !p.name.includes(ONLY)) continue;
    n++;
    const src = rewriteSS(p.src, true, p.name)?.out ?? p.src;
    const v = verdictOf(src, null, false);
    console.log(`== ${f}:${p.name}: ${v.text.slice(0, 220)}`);
    if (COMPILED) for (const c of compileModule(src, true)) console.log(`   compiled ${c.name}: ${c.definition.slice(0, 900)}`);
    if (!v.ok) continue;
    acc++;
    try {
      const r = await observeProgram({ ...p, src });
      for (const l of r.lines) console.log(`   ${l}`);
      if (r.silent.length) { sil++; silent.push(`${f}:${p.name}`); }
    } catch (x) { console.log(`   run crash: ${(x as Error).message}`); }
  }
}
console.log(`-- ${n} candidates, accepted ${acc}, silent ${sil}`);
for (const s of silent) console.log(`SILENT ${s}`);
process.exit(0);
