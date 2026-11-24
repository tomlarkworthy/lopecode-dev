const L = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst w = (a: Action<[]>) => action(() => a);\nconst s = (): StateCell<readonly (() => void)[]> => state([]);\nconst put = (w: Action<[]>, s: State<readonly (() => void)[]>) => action(() => { const f = w() ?? (() => {}); s.set([f]); });\n`;
const CALL = `const f = s[0]; if (f !== undefined) f();`;
const SP = `s: readonly (() => void)[]`;
export const srcs: [string, string][] = [
 ["then-template", L + "const g = (" + SP + ") => Promise.resolve(1)[`then`](() => { " + CALL + " return 1; });"],
 ["then-const-key", L + `const g = (${SP}) => { const k = "then"; return Promise.resolve(1)[k](() => { ${CALL} return 1; }); };`],
 ["then-concat-key", L + `const g = (${SP}) => Promise.resolve(1)["th" + "en"](() => { ${CALL} return 1; });`],
 ["then-optional", L + `const g = (${SP}) => Promise.resolve(1)?.then(() => { ${CALL} return 1; });`],
 ["then-paren", L + `const g = (${SP}) => (Promise.resolve(1).then)(() => { ${CALL} return 1; });`],
 ["state-init", L + `const g = (${SP}): StateCell<number> => { ${CALL} return state(0); };`],
 ["state-init-then", L + `const g = (${SP}): StateCell<number> => { Promise.resolve(1).then(() => { ${CALL} }); return state(0); };`],
 ["events-body", L + `function* t(${SP}) { ${CALL} yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`],
 ["events-then", L + `function* t(${SP}) { Promise.resolve(1).then(() => { ${CALL} }); yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`],
 ["listener-body", L + `function* t() { yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>, ${SP}) => { ${CALL} return on(t, d); };`],
 ["listener-then", L + `function* t() { yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>, ${SP}) => { Promise.resolve(1).then(() => { ${CALL} }); return on(t, d); };`],
 ["union-call", `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst g = (a: Action<[]>) => { const u: Action<[]> | (() => number) = a; return u(); };`],
 ["union-call-narrow", `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst g = (a: Action<[]>) => { const u: Action<[]> | (() => number) = a; return typeof u === "function" ? 1 : 0; };`],
 ["union-store", `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst g = (a: Action<[]>): readonly (Action<[]> | (() => number))[] => [a];\nconst h = (g: readonly (Action<[]> | (() => number))[]) => { const f = g[0]; return f === undefined ? 0 : f(); };`],
 ["catch-only", `const g = async () => { const p: Promise<number> = Promise.resolve(1); return p.catch(() => 2); };`],
 ["finally-only", `const g = async () => Promise.resolve(1).finally(() => 2);`],
];
