// checkSources of base/ against rule/ over the nested prototype's corpus (361 inputs, every spec reject case included):
// module errors and, per cell, status and every error's rule, line and message. Prints each input that differs.
// Run: bun verdicts.ts
import { corpus } from "../nested-ast/corpus.ts";
const A = await import("./base/lite/core.ts"), B = await import("./rule/lite/core.ts");
const lines = (r: any) => [...r.module.map((e: any) => `module [${e.rule}] L${e.line} ${e.msg}`), ...r.cells.flatMap((c: any) => [`${c.name} ${c.status}`, ...[...c.errors, ...c.unsupported].map((e: any) => `  ${c.name} [${e.rule}] L${e.line} ${e.msg}`)])];
let n = 0, differ = 0, total = 0;
for (const c of corpus()) {
  const run = (M: any) => { try { return lines(M.checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null })); } catch (e: any) { return [`throws ${e.message}`]; } };
  const a = run(A), b = run(B);
  n++; total += a.length;
  if (JSON.stringify(a) !== JSON.stringify(b)) { differ++; console.log(`${c.id}\n  base: ${JSON.stringify(a)}\n  rule: ${JSON.stringify(b)}`); }
}
console.log(`${n} inputs, ${total} verdict lines from base; ${differ} inputs differ`);
