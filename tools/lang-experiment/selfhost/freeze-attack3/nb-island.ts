// The notebook's own compile (lite/stdlib/runtime.ts compiler, the bundle the notebook uses), on the accepted program
// isl-map-fn-arg: the island result is read, the caller's argument written, the result read again.
const ss = await import("../../lite/stdlib/runtime.ts");
const src = "const x = () => [1];\nconst y = (x: number[]) => new Map([[\"g\", () => x.length]]);\nconst go = async (compile: Compile) => { const f = compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] }); const xs = [0]; const r = await f({ x: xs }); return r.y; };\n";
const c = ss.compiler(() => src);
const xs = [0];
const r: any = await c.for("go", {})({ inputs: ["x"], refs: [], outputs: ["y"] } as any)({ x: xs });
const g = r.y.get("g");
const before = g(), frozenMap = Object.isFrozen(r.y), frozenArg = Object.isFrozen(xs);
xs.push(1);
console.log(`notebook compile: g() ${before} -> ${g()}; result Map frozen ${frozenMap}; argument frozen ${frozenArg}`);
