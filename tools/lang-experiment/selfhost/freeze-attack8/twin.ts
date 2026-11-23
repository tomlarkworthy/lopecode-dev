// bun twin.ts: lite/fnreg.ts (acorn tree; link.ts and the frozen toolchain) on the gap forms, to compare with tc-reg
import * as acorn from "acorn";
import { fnRegEdits, applyRegEdits } from "../../lite/fnreg.ts";
const cases: [string, string][] = [
  ["bigint-key", "() => { const xs = [0]; const c = xs; const o = { 1n() { return c.length; } }; return o; }"],
  ["i-capture", "() => { const xs = [0]; const i = xs; const f = () => i.length; return { f }; }"],
  ["shadow", "() => { const ss_closure = (f, t) => f; const xs = [0]; const c = xs; const f = () => c.length; return { f }; }"],
  ["switch-case-decl", "() => { const xs = [0]; const c = xs; let F = () => 0; switch (c.length) { case 1: F = h; break; case 2: function h() { return c.length; } } return { F }; }"],
];
for (const [n, src] of cases) {
  const t = `(${src})`;
  const ast: any = acorn.parse(t, { ecmaVersion: "latest" });
  const fn = ast.body[0].expression;
  console.log(`${n}: ${applyRegEdits(t, fnRegEdits(fn, { closure: "ss_closure", methods: "ss_methods" }))}`);
}
