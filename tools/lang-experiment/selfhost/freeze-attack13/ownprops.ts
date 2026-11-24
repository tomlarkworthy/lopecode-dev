import * as P from "../../prelude.runtime.ts";
import * as ss from "../../lite/stdlib/runtime.ts";
const a = P.action(() => 1);
const m = P.memo((x: number) => x);
console.log("action", Object.getOwnPropertyNames(a), "memo", Object.getOwnPropertyNames(m));
console.log("fetch", Object.getOwnPropertyNames(globalThis.fetch), "bound", Object.getOwnPropertyNames(globalThis.fetch.bind(globalThis)));
console.log("random", Object.getOwnPropertyNames(Math.random));
try { const c = (ss as any).compiler(() => "const x = 1;"); console.log("compile", Object.getOwnPropertyNames(c)); } catch (e) { console.log("compile threw", (e as Error).message); }
console.log("fnproto", Object.getOwnPropertyNames(Function.prototype), Object.getOwnPropertySymbols(Function.prototype).map(String));
console.log("async", Object.getOwnPropertyNames(async function () {}), "gen", Object.getOwnPropertyNames(function* () {}), "agen", Object.getOwnPropertyNames(async function* () {}));
