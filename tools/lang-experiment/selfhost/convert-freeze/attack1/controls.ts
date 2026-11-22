// Observer controls: each changes a delivered value through one channel the observer claims to see. Run with the
// checker skipped (--force) and conversion off (ctl mode); every one must be reported CHANGED.
const W = "for (let i = 0; i < 300; i++) await null; ";
const L = (body: string) => `const h = async () => { ${W}${body} }; h();`;
const A = (name: string, src: string) => ({ name, src, mech: "control" });
export const progs = [
  A("ctl-direct", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return xs; };`),
  A("ctl-consumer-holds", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return xs; };\nconst c = (a: number[]) => ({ held: a });`),
  A("ctl-promise-settled", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return { p: (async () => { await null; return xs; })() }; };`),
  A("ctl-promise-value", `const a = async () => { const xs = [1]; ${L("xs.push(2);")} return xs; };`),
  A("ctl-promise-reject", `const a = () => { const e = { m: [1] }; ${L("e.m.push(2);")} const p = (async () => { await null; throw e; })(); p.catch(() => {}); return { p }; };`),
  A("ctl-fn-again", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return () => xs.length; };`),
  A("ctl-fn-in-data", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return { f: () => xs.length }; };`),
  A("ctl-gen-prev-yield", `const a = function* () { const xs = [1]; yield xs; xs.push(2); yield [0]; };`),
  A("ctl-iterator-value", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return { it: (function* () { yield xs; })() }; };`),
  A("ctl-map", `const a = () => { const m = new Map<string, number>(); ${L("m.set('k', 1);")} return m; };`),
  A("ctl-set", `const a = () => { const s = new Set<number>(); ${L("s.add(1);")} return s; };`),
  A("ctl-url", `const a = () => { const u = new URL("http://x/"); ${L("(u as any).hash = 'z';")} return u; };`),
  A("ctl-typed-array", `const a = () => { const b = new Float32Array(2); ${L("b[0] = 1;")} return b; };`),
  A("ctl-date", `const a = () => { const d = new Date(0); ${L("d.setTime(5);")} return d; };`),
  A("ctl-regexp", `const a = () => { const re = /a/g; ${L("re.test('aa');")} return re; };`),
  A("ctl-error", `const a = () => { const e = new Error("x"); ${L("(e as any).message = 'y';")} return e; };`),
  A("ctl-getter", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return { get n() { return xs.length; } }; };`),
  A("ctl-promise-fn", `const a = () => { const xs = [1]; ${L("xs.push(2);")} return Promise.resolve(() => xs.length); };`),
];
