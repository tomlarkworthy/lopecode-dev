// bun selfhost/freeze-attack13/show-compiled.ts <file with srcs> [name]: each cell's compiled definition (drive-rt's compile path)
import * as T from "../../lite/toolchain/ss-toolchain.ts";
const { srcs } = await import(new URL(process.argv[2]!, `file://${process.cwd()}/`).pathname);
const only = process.argv[3];
for (const [n, src] of srcs as [string, string][]) {
  if (only && !n.includes(only)) continue;
  console.log(`=== ${n}`);
  const texts = [...T.splitCells(src, true)];
  const ctx = T.contextOf(texts, true, null);
  for (const t of texts) { try { for (const d of T.compileCell(t, true, ctx, (await import("../../lite/stdlib/runtime.ts")).declaredName(t))) console.log(`${d.name} [${d.inputs}] = ${d.definition}`); } catch (x) { console.log("compile threw", (x as Error).message); } }
}
