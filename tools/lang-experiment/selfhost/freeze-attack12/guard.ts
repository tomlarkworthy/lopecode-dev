// freeze-attack12 target 3: the compiled run-time guard. Each row calls the Action a while a cell computes. Rows with an
// accepted call path use the Object.fromEntries toString hook (hooks.ts: the checker accepts it); rows named g-ctl-*
// call a directly and run with the checker skipped. A kept function only converts when given 7, so the harness, which
// calls kept functions with no arguments, does not trigger it
import { ACT, sRow, type Cand } from "./lib12.ts";
const R: Cand[] = [];
const O = `const o = Object.fromEntries([["toString", a]]);`;
// the same record under an annotation, so it is not a Mut local (S4.1) and a closure or a later step may read it
const OR = `const o: { readonly [s: string]: Action<[]> } = Object.fromEntries([["toString", a]]);`;
const H = (name: string, src: string) => R.push(sRow(`g-${name}`, ACT + src));
const C = (name: string, src: string) => R.push(sRow(`g-ctl-${name}`, ACT + src, true));
// accepted paths (the hook)
H("sync-body", `const g = (a: Action<[]>) => { ${O} return \`\${o}\`; };`);
H("async-before-await", `const g = async (a: Action<[]>) => { ${O} const s = \`\${o}\`; await null; return s; };`);
H("async-after-await", `const g = async (a: Action<[]>) => { ${O} await null; return \`\${o}\`; };`);
H("async-after-await-loop", `const g = async (a: Action<[]>) => { ${O} for (let i = 0; i < 2; i++) await null; return \`\${o}\`; };`);
H("async-await-promise", `const g = async (a: Action<[]>) => { ${O} await Promise.resolve(1); return \`\${o}\`; };`);
H("then-callback", `const g = (a: Action<[]>) => { ${O} return Promise.resolve(1).then(() => \`\${o}\`); };`);
H("then-callback-async", `const g = async (a: Action<[]>) => { ${O} return Promise.resolve(1).then(() => \`\${o}\`); };`);
H("gen-first", `function* g(a: Action<[]>) { ${O} yield \`\${o}\`; }`);
H("gen-between", `function* g(a: Action<[]>) { ${O} yield 1; yield \`\${o}\`; }`);
H("agen-first", `async function* g(a: Action<[]>) { ${O} yield \`\${o}\`; }`);
H("agen-after-await", `async function* g(a: Action<[]>) { ${O} await null; yield \`\${o}\`; }`);
H("agen-between", `async function* g(a: Action<[]>) { ${O} yield 1; yield \`\${o}\`; }`);
H("map-callback", `const g = (a: Action<[]>) => { ${O} return [1].map(() => \`\${o}\`); };`);
H("helper", `const g = (a: Action<[]>) => { ${O} const f = () => \`\${o}\`; return f(); };`);
H("kept-sync-caller", `const k = (a: Action<[]>) => { ${O} return (x: number) => (x === 7 ? \`\${o}\` : ""); };\nconst g = (k: (x: number) => string) => k(7);`);
H("kept-async-caller", `const k = (a: Action<[]>) => { ${O} return (x: number) => (x === 7 ? \`\${o}\` : ""); };\nconst g = async (k: (x: number) => string) => { await null; return k(7); };`);
H("kept-record-sync", `const k = (a: Action<[]>) => ({ o: Object.fromEntries([["toString", a]]) });\nconst g = (k: { readonly o: { readonly [s: string]: Action<[]> } }) => \`\${k.o}\`;`);
H("kept-record-async", `const k = (a: Action<[]>) => ({ o: Object.fromEntries([["toString", a]]) });\nconst g = async (k: { readonly o: { readonly [s: string]: Action<[]> } }) => { await null; return \`\${k.o}\`; };`);
H("cell-value-record-sync", `const k = (a: Action<[]>) => Object.fromEntries([["toString", a]]);\nconst g = (k: { readonly [s: string]: Action<[]> }) => \`\${k}\`;`);
H("cell-value-record-async", `const k = (a: Action<[]>) => Object.fromEntries([["toString", a]]);\nconst g = async (k: { readonly [s: string]: Action<[]> }) => { await null; return \`\${k}\`; };`);
H("invalidation", `const g = (a: Action<[]>, invalidation: Invalidation) => { ${O} invalidation.then(() => \`\${o}\`); return 1; };`);
H("component", `const g = (a: Action<[]>) => { ${O} const B = (p: { readonly s: string }) => <span>{\`\${o}\`}{p.s}</span>; return <B s="x" />; };`);
H("component-child", `const g = (a: Action<[]>) => { ${O} return <span>{\`\${o}\`}</span>; };`);
H("events-gen", `function* g(a: Action<[]>) { ${O} yield 1; yield \`\${o}\`.length; }\nconst l = (g: Events<number>, d: Action<[number]>) => on(g, d);\nconst d = () => action((n: number) => {});`);
H("ro-then-callback", `const g = (a: Action<[]>) => { ${OR} return Promise.resolve(1).then(() => \`\${o}\`); };`);
H("ro-then-callback-async", `const g = async (a: Action<[]>) => { ${OR} return Promise.resolve(1).then(() => \`\${o}\`); };`);
H("ro-gen-between", `function* g(a: Action<[]>) { ${OR} yield 1; yield \`\${o}\`; }`);
H("ro-agen-after-await", `async function* g(a: Action<[]>) { ${OR} await null; yield \`\${o}\`; }`);
H("ro-agen-between", `async function* g(a: Action<[]>) { ${OR} yield 1; yield \`\${o}\`; }`);
H("ro-kept-sync-caller", `const k = (a: Action<[]>) => { ${OR} return (x: number) => (x === 7 ? \`\${o}\` : ""); };\nconst g = (k: (x: number) => string) => k(7);`);
H("ro-kept-async-caller", `const k = (a: Action<[]>) => { ${OR} return (x: number) => (x === 7 ? \`\${o}\` : ""); };\nconst g = async (k: (x: number) => string) => { await null; return k(7); };`);
H("ro-kept-then-caller", `const k = (a: Action<[]>) => { ${OR} return (x: number) => (x === 7 ? \`\${o}\` : ""); };\nconst g = (k: (x: number) => string) => Promise.resolve(7).then(k);`);
H("ro-events-gen", `function* g(a: Action<[]>) { ${OR} yield 1; yield \`\${o}\`.length; }\nconst l = (g: Events<number>, d: Action<[number]>) => on(g, d);\nconst d = () => action((n: number) => {});`);
H("ro-memo", `const g = (a: Action<[]>) => { ${OR} const m = memo((x: number) => \`\${o}\` + x); return m(1); };`);
H("ro-memo-param", `const g = (a: Action<[]>) => { ${OR} const m = memo((r: { readonly [s: string]: Action<[]> }) => \`\${r}\`); return m(o); };`);
H("ro-sort-cb", `const g = async (a: Action<[]>) => { ${OR} await null; return [2, 1].toSorted((x, y) => \`\${o}\`.length + x - y); };`);
H("ro-kept-in-state", `const s = (a: Action<[]>) => state({ o: Object.fromEntries([["toString", a]]) });\nconst g = async (s: { readonly o: { readonly [k: string]: Action<[]> } }) => { await null; return \`\${s.o}\`; };`);
// controls: a called directly, checker skipped
C("sync", `const g = (a: Action<[]>) => { a(); return 1; };`);
C("async-after-await", `const g = async (a: Action<[]>) => { await null; a(); return 1; };`);
C("then-callback", `const g = (a: Action<[]>) => Promise.resolve(1).then(() => { a(); return 1; });`);
C("gen-between", `function* g(a: Action<[]>) { yield 1; a(); yield 2; }`);
C("agen-after-await", `async function* g(a: Action<[]>) { await null; a(); yield 1; }`);
C("agen-between", `async function* g(a: Action<[]>) { yield 1; a(); yield 2; }`);
C("kept-async-caller", `const k = (a: Action<[]>) => (x: number) => { if (x === 7) a(); return 1; };\nconst g = async (k: (x: number) => number) => { await null; return k(7); };`);
C("kept-sync-caller", `const k = (a: Action<[]>) => (x: number) => { if (x === 7) a(); return 1; };\nconst g = (k: (x: number) => number) => k(7);`);
C("invalidation", `const g = (a: Action<[]>, invalidation: Invalidation) => { invalidation.then(() => a()); return 1; };`);
C("component", `const g = (a: Action<[]>) => { const B = (p: { readonly s: string }) => { a(); return <span>{p.s}</span>; }; return <B s="x" />; };`);
C("memo", `const g = (a: Action<[]>) => { const m = memo((x: number) => { a(); return x; }); return m(1); };`);
C("memo-async", `const g = async (a: Action<[]>) => { const m = memo((x: number) => { a(); return x; }); await null; return m(1); };`);
C("state-write-after-await", `const g = async (c: State<number>) => { await null; c.set(1); return 1; };`);
C("state-write-sync", `const g = (c: State<number>) => { c.set(1); return 1; };`);
C("map-callback", `const g = (a: Action<[]>) => [1].map(() => { a(); return 1; });`);
C("set-callback", `const s = (): StateCell<number> => state(0);\nconst g = (s: State<number>) => [1].map(s.set);`);
C("set-callback-async", `const s = (): StateCell<number> => state(0);\nconst g = async (s: State<number>) => { await null; return [1].map(s.set); };`);
export const cands = R;
