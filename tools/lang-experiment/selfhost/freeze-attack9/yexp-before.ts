// bun yexp-before.ts <depth> <before|after>: the boundary form of yexp2 (a parameter naming a cell in another language,
// annotated P<P<...>>) checked by the tree before e1 or the live one: is the exponential shape derivation older than cast?
const d = Number(process.argv[2]), which = process.argv[3] ?? "before";
const { checkSources } = await import(which === "before" ? "../../lite/soundscript/.scratch/e1/before/tools/lang-experiment/lite/core.ts" : "../../lite/core.ts");
const t = "P<".repeat(d) + "number" + ">".repeat(d);
const src = `type P<T> = { readonly a: T; readonly b: T };\nconst h = (x: ${t}) => 1;`;
const t0 = performance.now();
const r: any = checkSources({ cells: src, tsx: true, outside: [{ name: "x" }], foreign: null } as any);
console.log(`${which} boundary depth ${d}: ${r.cells.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]`).join("")}`).join(" ")} (${Math.round(performance.now() - t0)} ms)`);
process.exit(0);
