const SPN = "const xs = [0]; const i: readonly number[] = xs; const F = () => i.length;";
const R = (inner: string, pre = "") => `const put = () => { ${SPN} ${pre} ${inner} return { f: F }; };\nconst w = (put: { readonly f: () => number }) => put.f();`;
const SPIN = "for (let n = 0; n < 300; n++) await null;";
export const srcs: [string, string][] = [
  ["iife-direct", R(`(async () => { ${SPIN} xs.push(1); })();`)],
  ["iife-alias-after", R(`(async () => { ${SPIN} const ys = xs; ys.push(1); })();`)],
  ["iife-getter", R(`(async () => { ${SPIN} get().push(1); })();`, "const get = () => xs;")],
  ["iife-helper-write", R(`(async () => { ${SPIN} wr(); })();`, "const wr = () => { xs.push(1); };")],
  ["iife-cb", R(`(async () => { ${SPIN} [0].forEach(() => { xs.push(1); }); })();`)],
  ["iife-mut-param", R(`(async (ys: Mut<number[]>) => { ${SPIN} ys.push(1); })(xs);`)],
  ["named-async-mut-param", R(`const run = async (ys: Mut<number[]>) => { ${SPIN} ys.push(1); }; run(xs);`)],
  ["named-async-mut-param-decl", R(`async function run(ys: Mut<number[]>) { ${SPIN} ys.push(1); } run(xs);`)],
  ["mut-param-sync-then", R(`const run = (ys: Mut<number[]>) => { Promise.resolve(0).then(() => { ys.push(1); }); }; run(xs);`)],
  ["then-cb", R(`Promise.resolve(0).then(() => { xs.push(1); });`)],
  ["mut-param-async-alias", R(`const run = async (ys: Mut<number[]>) => { ${SPIN} const zs = ys; zs.push(1); }; run(xs);`)],
  ["async-gen-helper", R(`const run = async function* (ys: Mut<number[]>) { yield 0; ys.push(1); }; run(xs).next();`)],
  ["await-in-async-cell", `const put = async () => { ${SPN} const out = { f: F }; ${SPIN} xs.push(1); return out; };`],
];
