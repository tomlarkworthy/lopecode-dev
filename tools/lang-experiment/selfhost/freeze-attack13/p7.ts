// the checker's verdict on each control's construct, one construct per row, no action call
export const srcs: [string, string][] = [
 ["catch", `const g = () => Promise.resolve(1).catch(() => 2);`],
 ["new-promise", `const g = () => new Promise((r) => r(1));`],
 ["queueMicrotask", `const g = () => { queueMicrotask(() => 1); return 1; };`],
 ["thenable-literal", `const g = async () => { const v = await { then: (r: (v: number) => void) => r(1) }; return 1; };`],
 ["then-spread", `const g = () => { const fs = [(x: number) => x]; return Promise.resolve(1).then(...fs); };`],
 ["then-bind", `const g = () => { const p = Promise.resolve(1); const t = p.then.bind(p); return 1; };`],
 ["memo-async", `const g = () => { const m = memo(async (n: number) => n); return 1; };`],
 ["agen-finally", `async function* g(x: number) { try { yield x; } finally { [x].push(1); } }`],
 ["obj-async-method", `const g = async () => { const o = { async m() { await null; return 1; } }; return o.m(); };`],
 ["fetch-then", `const g = (fetch: Fetch) => fetch("u").then((r) => r.status);`],
];
