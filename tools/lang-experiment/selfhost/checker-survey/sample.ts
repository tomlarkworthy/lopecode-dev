// The sample, fixed before any port was written: per file a quota, drawn with a seeded generator within size bins
// (code lines <= 8, 9-30, > 30) of the value units; type declarations as their own stratum; the three functions
// over 100 code lines (ownership, actionEscapes, checkSources) taken with certainty, as named inner units.
// Run: bun selfhost/checker-survey/sample.ts   (writes out/sample.json)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { inventory, stratum } from "./inventory.ts";

let seed = 20261121;
const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
const units = inventory().filter((d) => d.kind !== "import" && (stratum(d) === "core" || stratum(d) === "borderline"));
const GIANTS = new Set(["lite/own.ts:ownership", "lite/own.ts:actionEscapes", "lite/core.ts:checkSources"]);
const QUOTA: Record<string, number> = {
  "lite/infer.ts": 14, "lite/registry.ts": 6, "lite/core.ts": 3, "lite/own.ts": 1, "lite/capture.ts": 3, "lite/complete.ts": 3,
  "lite/intrinsics.ts": 1, "lite/parse.ts": 3, "lite/facts.ts": 2, "lite/island.ts": 2, "lite/link.ts": 1,
  "lite/toolchain/ss-toolchain.ts": 7, "lite/toolchain/comment-types.ts": 2, "lite/jsx/lower.ts": 1,
  "lite/browser/erase.ts": 1, "lite/toolchain/module-js.ts": 1, "lite/boundary.ts": 1,
};
const bin = (c: number) => (c <= 8 ? "s" : c <= 30 ? "m" : "l");
const picked: { file: string; name: string; why: string }[] = [];
for (const [file, q] of Object.entries(QUOTA)) {
  const pool = units.filter((u) => u.file === file && u.kind !== "type" && !GIANTS.has(`${u.file}:${u.name}`));
  // allocate the quota over bins in proportion to the bin's code lines, at least 1 for a non-empty bin while quota lasts
  const bins = ["s", "m", "l"].map((b) => ({ b, us: pool.filter((u) => bin(u.code) === b) })).filter((x) => x.us.length);
  const lines = bins.map((x) => x.us.reduce((s, u) => s + u.code, 0));
  const tot = lines.reduce((a, b) => a + b, 0);
  const want = bins.map((x, i) => Math.min(x.us.length, Math.max(1, Math.round((q * lines[i]!) / tot))));
  while (want.reduce((a, b) => a + b, 0) > q) { const i = want.indexOf(Math.max(...want)); want[i]!--; }
  bins.forEach((x, i) => {
    const us = [...x.us];
    for (let k = 0; k < want[i]! && us.length; k++) picked.push({ file, name: us.splice(Math.floor(rand() * us.length), 1)[0]!.name, why: `random, bin ${x.b}` });
  });
}
// types: 6 drawn from the non-ported type declarations
const types = units.filter((u) => u.kind === "type");
for (let k = 0; k < 6; k++) { const u = types.splice(Math.floor(rand() * types.length), 1)[0]!; picked.push({ file: u.file, name: u.name, why: "random, type" }); }
// giants, certain: named inner units chosen to cover each one's styles (a predicate helper, a walker, the flow loop's
// helper, a recursive explainer, a topological sort, a type-to-shape translator)
for (const [file, name] of [
  ["lite/own.ts", "ownership>position"], ["lite/own.ts", "ownership>fresh"], ["lite/own.ts", "ownership>helper"],
  ["lite/own.ts", "actionEscapes>methodValue"], ["lite/own.ts", "actionEscapes>chain"],
  ["lite/core.ts", "checkSources>visit"], ["lite/core.ts", "checkSources>uncloneable"], ["lite/core.ts", "checkSources>compileType"],
]) picked.push({ file: file!, name: name!, why: "giant, inner unit" });
writeFileSync(join(import.meta.dir, "out/sample.json"), JSON.stringify(picked, null, 1));
for (const p of picked) console.log(`${p.file}\t${p.name}\t${p.why}`);
console.log(picked.length, "units");
