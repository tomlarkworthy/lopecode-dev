// bun demo-runtime.ts: what mut and freeze do at run time for a group. The cell text is checked by proto/, erased by
// base/lite/browser/erase.ts and called with the prelude's own mut, freeze, equals and snapshot (base/prelude.runtime.ts).
import { erase } from "./base/lite/browser/erase.ts";
import * as P from "./base/prelude.runtime.ts";
import { checkSources } from "./proto/lite/core.ts";
const cell = `const a = () => {
  const ctx = mut({ types: mut(new Map<string, number>()), xs: mut([1]), n: 0 });
  ctx.types.set("a", 1);
  ctx.xs.push(2);
  ctx.n = 3;
  return freeze(ctx);
};`;
const r = checkSources({ cells: cell, tsx: true });
console.log("proto verdict:", r.cells.map((c) => `${c.name} ${c.status}`).join(", "));
const js = erase(cell);
console.log("erased:", JSON.stringify(js));
const seen: unknown[] = [];
const spy = { mut: (v: unknown) => { seen.push(["mut", v]); return P.mut(v); }, freeze: (v: unknown) => { seen.push(["freeze", v]); return P.freeze(v); } };
const a = new Function("mut", "freeze", `${js.replace(/^export /m, "")}; return a;`)(spy.mut, spy.freeze);
const out = a();
const made = (seen.find((s: any) => s[0] === "mut" && s[1] && typeof s[1] === "object" && "types" in s[1]) as any)[1];
console.log("calls:", seen.map((s: any) => s[0]).join(" "));
console.log("freeze(ctx) === ctx:", out === made, "| Object.isFrozen(out):", Object.isFrozen(out), "| Object.isFrozen(out.types):", Object.isFrozen(out.types));
console.log("value:", JSON.stringify({ types: [...out.types], xs: out.xs, n: out.n }));
console.log("equals(out, same shape):", P.equals(out, { types: new Map([["a", 1]]), xs: [1, 2], n: 3 }), "| snapshot copies:", P.snapshot(out).types !== out.types);
// a plain Mut for comparison: freeze returns its argument there too
const m = P.mut([1]);
console.log("plain: freeze(m) === m:", P.freeze(m) === m, "| Object.isFrozen:", Object.isFrozen(P.freeze(m)));
