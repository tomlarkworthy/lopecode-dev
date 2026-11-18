// Compiles CORPUS as one module, as lite/stdlib/runtime.test.ts load does. Exports the variables, each with its cell label.
import { CORPUS as C0, EXTRA, OUTSIDE } from "./corpus.ts";
const CORPUS = [...C0, ...EXTRA];
const ss = await import("../lite/stdlib/runtime.ts");
const T = await import("../lite/toolchain/ss-toolchain.ts");
export type V = { label: string; text: string; name: string; inputs: string[]; definition: string };
export function compileCorpus() {
  const texts = CORPUS.map((c) => c[1]);
  const checked = ss.checkCells(texts, true, OUTSIDE).result;
  const ctx = T.contextFromCheck(checked);
  const seen = new Map<string, number>();
  const out: V[] = [];
  CORPUS.forEach(([label, text]) => {
    const d = ss.declaredName(text);
    const k = d ? (seen.get(d) ?? 0) + 1 : 0; if (d) seen.set(d, k);
    const hint = k > 1 ? `${d} (${k})` : null;
    for (const v of T.compileCell(text, true, ctx, hint)) out.push({ label, text, ...v });
  });
  return { vars: out, verdicts: checked.cells.map((c: any) => `${c.name}:${c.status}`) };
}
if (import.meta.main) {
  const { vars, verdicts } = compileCorpus();
  console.log(verdicts.join(" "));
  for (const v of vars) console.log(`--- [${v.label}] ${v.name} ${JSON.stringify(v.inputs)}\n${v.definition}`);
}
