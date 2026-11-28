// bun lite/soundscript/memo-store.ts (from tools/lang-experiment): the stored memo of the built notebook (incr2).
// 1. builds the notebook with no stored memo to .scratch/memo/pass.html; 2. opens it, checks every module that holds
// SoundScript cells (ss_check) and reads each cell's entry off its compiled definition; 3. writes memo-store.json
// ({stamp, modules: {name: JSON with Maps and Sets tagged}}); 4. builds the notebook again, which attaches it.
// Extra arguments go to both builds (for example --out).
import { chromium } from "../../../../node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const HERE = import.meta.dir, PASS = join(HERE, ".scratch/memo/pass.html");
const rest = process.argv.slice(2);
const build = (args: string[]) => {
  const p = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--force", ...args], { stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error(`build ${args.join(" ")} exited ${p.exitCode}`);
};
mkdirSync(join(HERE, ".scratch/memo"), { recursive: true });
build(["--no-memo", "--out", PASS, ...rest.filter((a, i) => a !== "--out" && rest[i - 1] !== "--out")]);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + PASS);
const out = await page.evaluate(async () => {
  const until = async (f: () => unknown) => { while (!f()) await new Promise((x) => setTimeout(x, 50)); };
  const W = window as any;
  await until(() => W.__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-spec"));
  const rt = W.__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
  const cellsOf = await core.value("ss_moduleCells"), nameOf = await core.value("ss_moduleName"), check = await core.value("ss_check"), stampOf = await core.value("ss_memoStamp");
  const ENTRY = Symbol.for("soundscript.incr.entry");
  const enc = (_k: string, v: unknown) => (v instanceof Map ? { $map: [...v] } : v instanceof Set ? { $set: [...v] } : v);
  const modules: Record<string, string> = {}, counts: string[] = [];
  for (const m of new Set([...rt._variables].map((v: any) => v._module))) {
    const cells = cellsOf(m);
    // a module with no name of its own (ss_instance's test copies) is named anew on each load: nothing to store
    if (!cells.length || nameOf(m).startsWith("~")) continue;
    check(m);
    const got = cells.flatMap((c: any) => { const e = c.definition?.[ENTRY]; return e?.name === c.key ? [[c.key, e.entry]] : []; });
    modules[nameOf(m)] = JSON.stringify(got, enc);
    counts.push(`${nameOf(m)} ${got.length} of ${cells.length} cells`);
  }
  return { stamp: stampOf(), modules, counts };
});
await browser.close();
const text = JSON.stringify({ stamp: out.stamp, modules: out.modules });
writeFileSync(join(HERE, "memo-store.json"), text);
console.log(`memo-store.json: stamp ${out.stamp}, ${text.length} bytes, gzip ${Bun.gzipSync(text, { level: 9 }).length}\n  ${out.counts.join("\n  ")}`);
build(rest);
