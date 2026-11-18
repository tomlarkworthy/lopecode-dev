// prints the compiled variables of a few cells
const ss = await import("../lite/stdlib/runtime.ts");
const T = await import("../lite/toolchain/ss-toolchain.ts");
const src = process.argv[2] ?? `const double = () => (n: number): number => n * 2;
const count = (): StateCell<number> => state(0);
const inc = (count: State<number>) => action(() => count.update((c) => c + 1));`;
const outside = JSON.parse(process.argv[3] ?? "[]");
const texts = T.splitCells(src, true);
const chk = ss.checkCells(texts, true, outside).result;
console.log(JSON.stringify(chk.cells.map((c: any) => [c.name, c.status, c.errors]), null, 0));
const ctx = T.contextFromCheck(chk);
for (const t of texts) for (const d of T.compileCell(t, true, ctx)) console.log(d.name, d.inputs, "\n", d.definition, "\n");
