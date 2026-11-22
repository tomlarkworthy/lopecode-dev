import { observeProgram } from "../tree/lite/infer/attack/observe.ts";
import { PROTO_LOG } from "../tree/lite/browser/run.ts";
const W = "for (let i = 0; i < 300; i++) await null; ";
const srcs = [
`const a = () => { const m = [1]; const h = async () => { ${W} m.push(2); }; h(); return m; };`,
`const a = () => { const m = { x: 1 }; const g = () => m.x; const h = async () => { ${W} m.x = 2; }; h(); return g; };`,
`const a = () => { const m = [1]; const o = { m }; const h = async () => { ${W} m.push(2); }; h(); return o; };`,
];
for (const src of srcs) { const r = await observeProgram({ src }); console.log(PROTO_LOG.rewritten ?? "(no rewrite)"); console.log(r.silent, r.lines); }
process.exit(0);
