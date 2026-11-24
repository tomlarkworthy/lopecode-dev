// freeze-attack13, out of scope (callback arity, not an x1 rule): a callback with an optional parameter past the
// intrinsic's declared ones (intrinsics.ts omits the third array argument on purpose) gets the run time's extra argument
import { tyRow, callRow, isNum, isStr, strs, nums, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const CS = `const c = (): StateCell<string> => state("");\nconst g = (c: string) => c;\n`;
// E: an optional parameter past the intrinsic's declared callback parameters
const E = (name: string, body: string, ok: (v: unknown) => boolean) => R.push(tyRow(`v-extra-${name}`, `const g = () => ${body};`, ok));
E("map-str", `[5].map((x: number, i?: number, s?: string) => s ?? "none")`, strs);
E("map-num", `[5].map((x: number, i?: number, s?: number) => (s ?? 0) + 1)`, nums);
E("map-req-i", `[5].map((x: number, i: number, s?: number) => (s ?? 0) + i)`, nums);
E("filter", `{ const out = [5].filter((x: number, i?: number, s?: number) => (s ?? 0) + 1 === 1); return out.length; }`, isNum);
E("filter-str", `{ let t = ""; [5].filter((x: number, i?: number, s?: string) => { t = s ?? "n"; return true; }); return t; }`, isStr);
E("reduce", `[5].reduce((acc: number, x: number, i?: number, s?: number) => acc + (s ?? 0), 0)`, isNum);
E("reduce-str", `[5].reduce((acc: string, x: number, i?: number, s?: string) => s ?? acc, "")`, isStr);
E("foreach", `{ let t = 0; [5].forEach((x: number, i?: number, s?: number) => { t = t + (s ?? 0); }); return t; }`, isNum);
E("find", `{ let t = ""; [5].find((x: number, i?: number, s?: string) => { t = s ?? "n"; return false; }); return t; }`, isStr);
E("findIndex", `{ let t = ""; [5].findIndex((x: number, i?: number, s?: string) => { t = s ?? "n"; return false; }); return t; }`, isStr);
E("findLast", `{ let t = ""; [5].findLast((x: number, i?: number, s?: string) => { t = s ?? "n"; return false; }); return t; }`, isStr);
E("some", `{ let t = ""; [5].some((x: number, i?: number, s?: string) => { t = s ?? "n"; return false; }); return t; }`, isStr);
E("every", `{ let t = ""; [5].every((x: number, i?: number, s?: string) => { t = s ?? "n"; return true; }); return t; }`, isStr);
E("flatMap", `[5].flatMap((x: number, i?: number, s?: string) => [s ?? "n"])`, strs);
E("map-forEach", `{ let t = ""; new Map([["k", 1]]).forEach((v: number, k: string, m?: string) => { t = m ?? "n"; }); return t; }`, isStr);
E("set-forEach", `{ let t = ""; new Set([1]).forEach((v: number, k?: string) => { t = k ?? "n"; }); return t; }`, isStr);
E("set-forEach3", `{ let t = ""; new Set([1]).forEach((v: number, k?: number, s?: string) => { t = s ?? "n"; }); return t; }`, isStr);
E("u8-forEach", `{ let t = ""; new Uint8Array([7]).forEach((v: number, i: number, a?: string) => { t = a ?? "n"; }); return t; }`, isStr);
E("map-fn-type", `{ const f = (x: number, i?: number, s?: string) => s ?? "none"; return [5].map(f); }`, strs);
E("map-elem-type", `[[1, 2]].map((x: readonly number[], i?: number, s?: readonly string[]) => (s ?? ["n"])[0] ?? "z")`, strs);
// held: intrinsics that pass no extra argument
E("from-held", `Array.from([5], (x: number, i?: number, s?: string) => s ?? "none")`, strs);
E("sort-held", `[2, 1].toSorted((x: number, y: number, z?: string) => (z ?? "").length + x - y)`, nums);
E("then-held", `Promise.resolve(1).then((x: number, y?: string) => y ?? "none")`, isStr);
E("memo-held", `memo((x: number, y?: string) => y ?? "none")(1)`, isStr);
R.push(callRow("v-extra-update-held", `${CS}const b = (c: State<string>) => action(() => c.update((x: string, y?: string) => y ?? "none"));`, "b", [], isStr));
// Mut alias through the omitted array argument: a readonly local written through the callback's third parameter
const Y = (name: string, body: string) => R.push({ name: `v-extra-${name}`, src: `const g = () => { const c: readonly number[] = [3, 1, 2]; const before = c[0] ?? -1; ${body}; return [before, c[0] ?? -1]; };`, show: ["g"],
  drive: (p: any) => { const v = p.value("g"); return Array.isArray(v) && v[0] !== v[1] ? `DIFF readonly c changed: ${JSON.stringify(v)}` : `same: ${JSON.stringify(v)} ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 120)}`; } });
Y("mut-alias-forEach", `c.forEach((x: number, i: number, a?: Mut<number[]>) => { if (a !== undefined) a[0] = 9; })`);
Y("mut-alias-map", `c.map((x: number, i: number, a?: Mut<number[]>) => { if (a !== undefined) a.push(9); return x; })`);
Y("mut-alias-reduce", `c.reduce((s: number, x: number, i: number, a?: Mut<number[]>) => { if (a !== undefined) a[0] = 9; return s; }, 0)`);
Y("mut-alias-sort", `c.toSorted((x: number, y: number) => x - y)`);
R.push({ name: "v-extra-ctl-mut-alias", ctl: true, src: `const g = () => { const c: readonly number[] = [3, 1, 2]; const before = c[0] ?? -1; (c as Mut<number[]>)[0] = 9; return [before, c[0] ?? -1]; };`, show: ["g"],
  drive: (p: any) => { const v = p.value("g"); return Array.isArray(v) && v[0] !== v[1] ? `DIFF readonly c changed: ${JSON.stringify(v)}` : `same: ${JSON.stringify(v)} ${p.status("g")}`; } });
R.push(tyRow("v-extra-ctl-map", `const g = () => [5].map((x: number): string => x);`, strs, true));
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);
