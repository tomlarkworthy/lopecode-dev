// freeze-attack14 class 3 from SoundScript code: the forms S4.11 and S4.12 say the checker does not see, a generator
// that yields then writes through another name, nested async functions writing after an await, memo arguments. Each
// row must be rejected or throw; silent when a value given to a holder changes (the runners' CHANGED lines, or the
// reader of the state seeing length 2)
import { tyRow, callRow, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const S = `const s = (): StateCell<readonly number[]> => state([]);\nconst g = (s: readonly number[]) => s.length;\n`;
const A = (name: string, body: string, ctl = false) => R.push(callRow(`m-${name}`, `${S}const b = (s: State<readonly number[]>) => action(() => { ${body} });`, "b", [], (v) => v === 1 || v === 0, "g", ctl));
A("st-alias", `const st = s.set; const xs = [1]; st(xs); xs.push(2);`);
A("destructure-set", `const { set } = s; const xs = [1]; set(xs); xs.push(2);`);
A("computed-set", `const xs = [1]; s["set"](xs); xs.push(2);`);
A("name-after", `const xs = [1]; s.set(xs); const ys = xs; ys.push(2);`);
A("helper-result", `const xs = [1]; const get = () => xs; s.set(xs); get().push(2);`);
A("callback-many", `const xs = [1]; [1, 2].forEach((i) => { if (i === 1) s.set(xs); else xs.push(2); });`);
A("update-alias", `const xs = [1]; s.update(() => xs); const ys = xs; ys.push(2);`);
A("record-field", `const xs = [1]; const o = { xs }; s.set(xs); o.xs.push(2);`);
A("spread-holder", `const xs = [1]; const h = { ...s }; s.set(xs); xs.push(2);`);
A("array-holder", `const xs = [1]; const hs = [s]; hs[0]?.set(xs); xs.push(2);`);
R.push(callRow("m-action-arg", `${S}const keep = (s: State<readonly number[]>) => action((v: readonly number[]) => s.set(v));\nconst b = (keep: Action<[readonly number[]]>) => action(() => { const xs = [1]; keep(xs); const ys = xs; ys.push(2); });`, "b", [], (v) => v === 1 || v === 0));
R.push(callRow("m-action-arg-helper", `${S}const keep = (s: State<readonly number[]>) => action((v: readonly number[]) => s.set(v));\nconst b = (keep: Action<[readonly number[]]>) => action(() => { const xs = [1]; const get = () => xs; keep(xs); get().push(2); });`, "b", [], (v) => v === 1 || v === 0));
const T = (name: string, src: string) => R.push(tyRow(`m-${name}`, src, () => true));
T("gen-alias-after", `const g = function* () { const xs = [1]; const ys = xs; yield xs; ys.push(2); yield 0; };`);
T("gen-helper-after", `const g = function* () { const xs = [1]; const get = () => xs; yield xs; get().push(2); yield 0; };`);
T("gen-record-after", `const g = function* () { const xs = [1]; const o = { xs }; yield xs; o.xs.push(2); yield 0; };`);
T("gen-name-after", `const g = function* () { const xs = [1]; yield xs; const ys = xs; ys.push(2); yield 0; };`);
T("gen-in-record", `const g = function* () { const xs = [1]; const o = { xs }; yield o; const ys = o.xs; yield 0; };`);
T("async-nested-after", `const g = async (): Promise<number> => { const h = async (): Promise<readonly number[]> => { const xs = [1]; const p = Promise.resolve(xs); await null; xs.push(2); return p; }; return (await h()).length; };`);
T("async-nested-alias", `const g = async (): Promise<number> => { const h = async (): Promise<readonly number[]> => { const xs = [1]; const ys = xs; await null; ys.push(2); return xs; }; return (await h()).length; };`);
T("async-cell-memo", `const g = async (): Promise<number> => { const m = memo((a: readonly number[]) => a.length); const xs = [1]; const r = m(xs); await null; const ys = xs; ys.push(2); return r; };`);
T("memo-name-after", `const g = (): number => { const m = memo((a: readonly number[]) => a.length); const xs = [1]; const r = m(xs); const ys = xs; ys.push(2); return r + m(xs); };`);
T("async-gen-alias", `const g = async function* () { const xs = [1]; const ys = xs; yield xs; await null; ys.push(2); yield 0; };`);
T("returned-fn-alias", `const g = (): (() => number) => { const xs = [1]; const c: readonly number[] = xs; const f = () => c.length; return f; };`);
// controls (checker skipped): the write after the hand-over, directly
A("ctl-direct", `s.set([1, 2]);`, true);
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
