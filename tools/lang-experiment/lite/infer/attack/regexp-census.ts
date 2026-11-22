// bun lite/infer/attack/regexp-census.ts: an AST census (acorn + the TypeScript plugin) of regexps in the checked
// sources (corpus, examples, spec and tutorial sources and rows, every lite/**/*.ss.ts): each regexp literal by its
// flags and where it stands, each new RegExp by its flags argument, and each .test/.exec call by its receiver.
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import * as acorn from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";
import { specRejects } from "../../soundscript/spec-cases.ts";

const ROOT = new URL("../../..", import.meta.url).pathname;
const P = (acorn.Parser as any).extend(tsPlugin({ jsx: true }));
const srcs: [string, string][] = [];
for (const g of ["ports/*/cells.ts*", "fixtures/**/cells.ts*", "port-editor5/*/cells.ts*", "horde/**/cells.ts*", "lite/browser/cells.ts", "lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx", "lite/**/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts"])
  for (const f of new Glob(g).scanSync(ROOT)) if (!f.includes("/frozen/") && !f.includes("node_modules") && !f.includes(".scratch")) srcs.push([f, readFileSync(ROOT + f, "utf8")]);
for (const [i, c] of specRejects().entries()) srcs.push([`reject:${c.statement}#${i}`, c.source]);
const DIRECT_RECV = new Set(["test", "exec"]), DIRECT_ARG = new Set(["replace", "replaceAll", "match", "matchAll", "split", "search"]);
const out: Record<string, string[]> = { "g/y literal, direct receiver": [], "g/y literal, direct argument": [], "g/y literal, elsewhere": [], "plain literal, held": [], "new RegExp, flags not a g/y-free literal": [], "test/exec on a non-literal receiver": [], "parse failed": [] };
for (const [f, s] of srcs) {
  let ast: any;
  try { ast = P.parse(s, { ecmaVersion: "latest", sourceType: "module", locations: true }); } catch { out["parse failed"].push(f); continue; }
  const at = (n: any) => `${f}:${n.loc.start.line}`;
  (function walk(n: any, p: any, pp: any) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Literal" && n.regex) {
      const gy = /[gy]/.test(n.regex.flags);
      const recv = p?.type === "MemberExpression" && p.object === n && !p.computed && DIRECT_RECV.has(p.property.name) && pp?.type === "CallExpression" && pp.callee === p;
      const arg = p?.type === "CallExpression" && p.arguments.includes(n) && p.callee.type === "MemberExpression" && DIRECT_ARG.has(p.callee.property?.name);
      if (gy) out[recv ? "g/y literal, direct receiver" : arg ? "g/y literal, direct argument" : "g/y literal, elsewhere"].push(`${at(n)} /${n.regex.pattern}/${n.regex.flags}`);
      else if (!recv && !arg) out["plain literal, held"].push(`${at(n)} /${n.regex.pattern}/${n.regex.flags}`);
    }
    if (n.type === "NewExpression" && n.callee.type === "Identifier" && n.callee.name === "RegExp") {
      const fl = n.arguments[1];
      if (fl && !(fl.type === "Literal" && typeof fl.value === "string" && !/[gy]/.test(fl.value))) out["new RegExp, flags not a g/y-free literal"].push(at(n));
    }
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && !n.callee.computed && DIRECT_RECV.has(n.callee.property.name) && !(n.callee.object.type === "Literal" && n.callee.object.regex))
      out["test/exec on a non-literal receiver"].push(`${at(n)} ${s.slice(n.callee.object.start, n.callee.object.end).slice(0, 40)}.${n.callee.property.name}`);
    for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((x) => walk(x, n, p)); else if (v && typeof v === "object" && typeof v.type === "string") walk(v, n, p); }
  })(ast, null, null);
}
console.log(`${srcs.length} sources`);
for (const [k, v] of Object.entries(out)) { console.log(`${k}: ${v.length}`); for (const x of v.slice(0, 40)) console.log(`  ${x}`); }
