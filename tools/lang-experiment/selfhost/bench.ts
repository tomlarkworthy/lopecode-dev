// Prints the median time of checkSources on fixed inputs: the tutorial module's SoundScript cells (selected as
// build.ts selects them from tutorial.ojs, no outside cells) and the specification's spec*.ts files, one check each.
// A measurement, not a test. Run: bun selfhost/bench.ts [runs]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitCells, declaredName } from "../lite/toolchain/ss-toolchain.ts";
import { checkSources } from "../lite/core.ts";

const SS = join(dirname(fileURLToPath(import.meta.url)), "../lite/soundscript");
const EXAMPLES = join(SS, "../notebook/examples");
const blocks = readFileSync(join(SS, "tutorial.ojs"), "utf8").split(/^\/\/ %%.*$/m).map((s) => s.trim()).filter(Boolean);
const tutorial: string[] = [];
for (const b of blocks) {
  const m = /^\/\/ss: (\S+)((?: -\S+)*)$/.exec(b);
  if (!m) continue;
  const file = m[1].startsWith("./") ? join(SS, m[1]) : join(EXAMPLES, m[1]);
  const skip = new Set(m[2].split(" -").filter(Boolean));
  tutorial.push(...splitCells(readFileSync(file, "utf8"), file.endsWith("x")).filter((t) => !skip.has(declaredName(t) ?? "")));
}
const spec = ["spec.ts", "spec-2.ts", "spec-3.ts", "spec-4.ts", "spec-5.ts", "spec-6.tsx", "spec-7.ts", "spec-9.ts", "spec-10.ts", "spec-11.ts"].map((f) => readFileSync(join(SS, f), "utf8"));
const inputs: [string, () => unknown][] = [
  [`tutorial module (${tutorial.length} cells)`, () => checkSources({ cells: tutorial.join("\n\n"), tsx: true })],
  [`spec*.ts (${spec.length} files, one check each)`, () => spec.forEach((s) => checkSources({ cells: s, tsx: true }))],
];
const runs = Number(process.argv.slice(2).find((a, i, xs) => /^\d+$/.test(a) && xs[i - 1] !== "--lite") ?? 201);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const [label, f] of inputs) {
  for (let i = 0; i < 20; i++) f();
  const ms: number[] = [];
  for (let i = 0; i < runs; i++) { const t0 = performance.now(); f(); ms.push(performance.now() - t0); }
  console.log(`${label}: median ${median(ms).toFixed(2)} ms of ${runs} (min ${Math.min(...ms).toFixed(2)}, max ${Math.max(...ms).toFixed(2)})`);
}
