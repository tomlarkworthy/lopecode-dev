// prototype's own probes of the rules not implemented (C: hidden callback argument), as run-sets programs
const W = "for (let i = 0; i < 300; i++) await null; ";
const A = (name: string, src: string) => ({ name, src });
export const attacks = [
  A("c-rest-fn", `const a = () => { const xs = [1]; const f = (...args: unknown[]): unknown => args[2]; const ys = xs.map(f); const h = async () => { ${W}xs.push(2); }; h(); return () => JSON.stringify(ys); };`),
  A("c-opt-fn", `const a = () => { const xs = [1]; const f = (v: number, i: number, arr?: number[]): number[] => arr ?? []; const ys = xs.map(f); const r = ys[0] ?? []; const h = async () => { ${W}xs.push(2); }; h(); return () => r.length; };`),
  A("c-opt-promise", `const a = () => { const xs = [1]; const f = (v: number, i: number, arr?: number[]): number[] => arr ?? []; const r = xs.map(f)[0] ?? []; const h = async () => { ${W}xs.push(2); }; h(); return { p: Promise.resolve(r) }; };`),
  A("c-foreach-set", `const a = () => { const s = new Set<number>([1]); const out: unknown[] = []; s.forEach((...args: unknown[]) => { out.push(args[2]); }); const r = out[0]; const h = async () => { ${W}s.add(2); }; h(); return () => JSON.stringify([...(r as Set<number>)]); };`),
];
