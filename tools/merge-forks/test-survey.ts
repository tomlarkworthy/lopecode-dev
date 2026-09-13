// Which modules carry in-notebook tests, and how dynamic they are. One copy per module: the declared canonical, else the first found.
// run: bun tools/merge-forks/test-survey.ts   (columns: test_ cells, tests depending on ui-testing, tests that touch the DOM, tests gated by *_tests_enabled, module in its notebook's mains, embedding notebooks)
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { readFileSync, readdirSync } from "node:fs";
import { blocks } from "../lib/notebook-blocks.ts";
const canon = JSON.parse(readFileSync("modules/canonical.json", "utf8"));
const decl = canon.modules ?? canon;
const DOM = new Set(["dispatchEvent", "click", "focus", "querySelector", "querySelectorAll"]);
const EVENTS = new Set(["Event", "KeyboardEvent", "PointerEvent", "MouseEvent", "InputEvent", "DragEvent", "DataTransfer"]);
type Row = { id: string; nb: string; tests: number; ui: number; dom: number; gated: number; uiNames: string; inMains: boolean; copies: number };
const copies = new Map<string, number>();
const chosen = new Map<string, { nb: string; content: string; mains: string[] }>();
for (const dir of ["lopecode/notebooks", "lopebooks/notebooks"]) for (const f of readdirSync(dir)) if (f.endsWith(".html")) {
  const path = `${dir}/${f}`; const html = readFileSync(path, "utf8"); const bs = blocks(html);
  let mains: string[] = [];
  try { mains = JSON.parse(bs.filter((b) => b.id === "bootconf.json").at(-1)!.content).mains ?? []; } catch {}
  for (const b of bs) {
    if (!b.attrs.includes("application/javascript") || b.attrs.includes("data-encoding") || !b.id.startsWith("@")) continue;
    copies.set(b.id, (copies.get(b.id) ?? 0) + 1);
    const canonPaths = decl[b.id] ? Object.values(decl[b.id]).filter((p) => typeof p === "string") : [];
    const prev = chosen.get(b.id);
    const isCanon = canonPaths.includes(path);
    if (!prev || (isCanon && !(decl[b.id] && Object.values(decl[b.id]).includes(prev.nb)))) chosen.set(b.id, { nb: path, content: b.content, mains });
  }
}
const rows: Row[] = [];
for (const [id, { nb, content, mains }] of chosen) {
  let ast: any; try { ast = acorn.parse(content, { ecmaVersion: "latest", sourceType: "module" }); } catch { continue; }
  const defs = new Map<string, any>();
  for (const st of ast.body) if (st.type === "VariableDeclaration") for (const d of st.declarations) if (d.init) defs.set(d.id.name, d.init);
  const def = ast.body.find((s: any) => s.type === "ExportDefaultDeclaration"); if (!def) continue;
  const uiLocals = new Set<string>(); const tests: { deps: string[]; fn: any }[] = [];
  for (const s of def.declaration.body.body) {
    const c = s.expression; if (c?.type !== "CallExpression") continue; const a = c.arguments;
    if (c.callee.name === "$def" && a[1].type === "Literal" && String(a[1].value).startsWith("test_")) tests.push({ deps: a[2].elements.map((e: any) => e.value), fn: defs.get(a[3].name) });
    if (c.callee.property?.name === "define" && a.length === 3 && a[1].elements?.[0]?.value === "module @tomlarkworthy/ui-testing") uiLocals.add(a[0].value);
  }
  if (!tests.length) continue;
  let ui = 0, dom = 0, gated = 0;
  for (const t of tests) {
    if (t.deps.some((d) => uiLocals.has(d))) ui++;
    if (t.deps.some((d) => /_tests_enabled$/.test(d))) gated++;
    let hit = false;
    if (t.fn) walk.full(t.fn, (n: any) => {
      if (n.type === "MemberExpression" && n.property?.type === "Identifier" && DOM.has(n.property.name)) hit = true;
      if (n.type === "NewExpression" && n.callee.type === "Identifier" && EVENTS.has(n.callee.name)) hit = true;
    });
    if (hit) dom++;
  }
  rows.push({ id, nb: nb.replace("/notebooks/", ":"), tests: tests.length, ui, dom, gated, uiNames: [...uiLocals].join(","), inMains: mains.includes(id), copies: copies.get(id)! });
}
rows.sort((a, b) => b.ui - a.ui || b.dom - a.dom || b.tests - a.tests);
console.log(`${rows.length} modules with test_ cells; ${rows.filter((r) => r.ui).length} use ui-testing; ${rows.filter((r) => r.dom).length} drive the DOM`);
console.log("module".padEnd(48), "tests ui  dom gated main copies  notebook");
for (const r of rows) console.log(r.id.padEnd(48), String(r.tests).padStart(5), String(r.ui).padStart(3), String(r.dom).padStart(4), String(r.gated).padStart(5), (r.inMains ? "  y " : "  - "), String(r.copies).padStart(5), " ", r.nb);
