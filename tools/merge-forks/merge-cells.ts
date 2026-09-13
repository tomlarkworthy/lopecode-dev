// Applies a merge plan to one module block of a notebook. Cells, imports and module defines are located
// with acorn (define-body.ts); only `replace` works on text, and each of its strings must occur once.
//   take         cell names whose const and $def line are replaced by the same-named cell of `from`;
//                the pid must match, so the cell keeps its identity
//   redefine     [{pid, fromPid}]: the host cell keeps its pid and name, and takes the const body and dep list
//                of the `from` cell with pid fromPid (a cell rewritten under a new pid in the fork)
//   add          [{pid, after}]: a cell of `from` inserted after the host (or previously added) pid
//   define       [{pid, name, deps, code, after}]: a cell written out in the plan
//   dropImports  import variable names removed from the define body
//   dropModules  module ids whose `main.define("module <id>")` is removed
//   repointImports [[from module id, to module id]]: every import from one module moved to another, and
//                the module define replaced; the target must not already be defined
//   rewrite      [{pid, deps, code}]: the host cell keeps its pid and name; its const becomes `code` (declaring
//                the cell's existing const name) and its dep list `deps`
//   dropCells    pids whose const and $def are removed; refused if a remaining cell lists the name as a dep
//   addModules   module ids given a `main.define("module <id>", …)` after the host's last module define
//   addImports   [{name, module, imported?}]: import variables written after the host's last import
//   replace      [[from, to]] exact text, applied after the structural edits
//   mains        [[from, to]] bootconf mains entries renamed
//
// run: bun tools/merge-forks/merge-cells.ts <plan.json> [--out <html>] [--dry-run]
//   plan.json: {notebook, module, from?: {notebook, module}, take?, redefine?, rewrite?, add?, define?, dropImports?, dropModules?, dropCells?, addModules?, addImports?, repointImports?, replace?, mains?}
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { blocks, blockContent, findSpan, guardedWrite } from "../lib/notebook-blocks.ts";
import { analyse } from "./define-body.ts";

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const plan = JSON.parse(readFileSync(args[0], "utf8"));
const out = opt("--out") ?? plan.notebook;
const prev = readFileSync(plan.notebook, "utf8");
const hostSrc = blockContent(prev, plan.module);
if (hostSrc == null) throw new Error(`${plan.notebook} has no block ${plan.module}`);
const h = analyse(hostSrc);
const fromSrc = plan.from ? blockContent(readFileSync(plan.from.notebook, "utf8"), plan.from.module) : null;
if (plan.from && fromSrc == null) throw new Error(`${plan.from.notebook} has no block ${plan.from.module}`);
const f = fromSrc ? analyse(fromSrc) : null;

const report: string[] = [];
type Edit = { start: number; end: number; text: string; order: number };
const edits: Edit[] = [];
let order = 0;
const edit = (start: number, end: number, text: string) => edits.push({ start, end, text, order: order++ });
const hostCell = (key: { name?: string; pid?: string }) => h.stmts.find((s) => s.kind === "cell" && (key.pid ? s.pid === key.pid : s.name === key.name));
const fromCell = (key: { name?: string; pid?: string }) => f?.stmts.find((s) => s.kind === "cell" && (key.pid ? s.pid === key.pid : s.name === key.name));
// the separator the exporter writes between define-body statements
const SEP = "  \n  ";
const constOf = (a: ReturnType<typeof analyse>, s: { fn?: string; pid?: string }) => a.consts.get(s.fn ?? s.pid!);
// a const renamed to `id`, found by acorn
const renamed = (constText: string, id: string) => {
  const decl = (acorn.parse(constText, { ecmaVersion: "latest", sourceType: "module" }) as any).body[0].declarations[0];
  return constText.slice(0, decl.id.start) + id + constText.slice(decl.id.end);
};
const depsOf = (cellText: string) => {
  const call = (acorn.parse(cellText, { ecmaVersion: "latest" }) as any).body[0].expression;
  return cellText.slice(call.arguments[2].start, call.arguments[2].end);
};

for (const name of plan.take ?? []) {
  const hc = hostCell({ name }), fc = fromCell({ name });
  if (!hc || !fc) throw new Error(`take ${name}: host ${!!hc}, from ${!!fc}`);
  if (hc.pid !== fc.pid) throw new Error(`take ${name}: pid ${hc.pid} in host, ${fc.pid} in from`);
  if ((hc.fn ?? hc.pid) !== (fc.fn ?? fc.pid)) throw new Error(`take ${name}: const ${hc.fn} in host, ${fc.fn} in from`);
  const hconst = constOf(h, hc)!, fconst = constOf(f!, fc)!;
  if (hconst.text === fconst.text && hc.text === fc.text) { report.push(`take ${name}: already equal`); continue; }
  edit(hconst.start, hconst.end, fconst.text);
  edit(hc.start, hc.end, fc.text);
  report.push(`take ${name} (${hc.pid})`);
}

// the host cell keeps its pid and name; its const body and dep list come from the `from` cell
for (const { pid, fromPid } of plan.redefine ?? []) {
  const hc = hostCell({ pid }), fc = fromCell({ pid: fromPid });
  if (!hc || !fc) throw new Error(`redefine ${pid}: host ${!!hc}, from ${fromPid} ${!!fc}`);
  const hconst = constOf(h, hc)!, hfn = hc.fn ?? pid;
  edit(hconst.start, hconst.end, renamed(constOf(f!, fc)!.text, hfn));
  edit(hc.start, hc.end, `$def(${JSON.stringify(pid)}, ${JSON.stringify(hc.name ?? null)}, ${depsOf(fc.text)}, ${hfn});`);
  report.push(`redefine ${hc.name ?? "(anonymous)"} (${pid}) from ${fromPid}`);
}

for (const { pid, deps, code } of plan.rewrite ?? []) {
  const hc = hostCell({ pid });
  if (!hc) throw new Error(`rewrite ${pid}: not a host cell`);
  const hfn = hc.fn ?? pid;
  const parsed = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any;
  if (parsed.body.length !== 1 || parsed.body[0].declarations?.[0]?.id?.name !== hfn) throw new Error(`rewrite ${pid}: code must be one \`const ${hfn} = …\``);
  const hconst = constOf(h, hc)!;
  edit(hconst.start, hconst.end, code);
  edit(hc.start, hc.end, `$def(${JSON.stringify(pid)}, ${JSON.stringify(hc.name ?? null)}, ${JSON.stringify(deps)}, ${hfn});`);
  report.push(`rewrite ${hc.name ?? "(anonymous)"} (${pid})`);
}

const added = new Map<string, { constAt: number; cellAt: number }>();
const anchor = (pid: string) => {
  if (added.has(pid)) return added.get(pid)!;
  if ((plan.dropCells ?? []).includes(pid)) throw new Error(`anchor ${pid} is dropped`);
  const hc = hostCell({ pid });
  if (!hc) throw new Error(`anchor ${pid} is neither a host cell nor an added one`);
  return { constAt: constOf(h, hc)!.end, cellAt: hc.end };
};
const insert = (pid: string, name: string | null, constText: string, cellText: string, after: string) => {
  if (hostCell({ pid }) || h.consts.has(pid)) throw new Error(`host already has pid ${pid}`);
  if (name && hostCell({ name })) throw new Error(`host already has a cell named ${name}`);
  if (name && h.stmts.some((s) => s.kind === "import" && s.name === name && !(plan.dropImports ?? []).includes(name))) throw new Error(`host imports ${name}; drop the import first`);
  const at = anchor(after);
  edit(at.constAt, at.constAt, "\n" + constText);
  edit(at.cellAt, at.cellAt, SEP + cellText);
  added.set(pid, at);
  report.push(`add ${name ?? "(anonymous)"} (${pid}) after ${after}`);
};
for (const { pid, after } of plan.add ?? []) {
  const fc = fromCell({ pid });
  if (!fc) throw new Error(`add ${pid}: not a cell of from`);
  // renamed to the pid, the const name an export writes
  insert(pid, fc.name ?? null, renamed(constOf(f!, fc)!.text, pid), `$def(${JSON.stringify(pid)}, ${JSON.stringify(fc.name ?? null)}, ${depsOf(fc.text)}, ${pid});`, after);
}
for (const { pid, name, deps, code, after } of plan.define ?? []) {
  const parsed = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any;
  if (parsed.body.length !== 1 || parsed.body[0].declarations?.[0]?.id?.name !== pid) throw new Error(`define ${pid}: code must be one \`const ${pid} = …\``);
  insert(pid, name, code, `$def(${JSON.stringify(pid)}, ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`, after);
}

const removeStmt = (s: { start: number; end: number }) => {
  const prevStmt = h.stmts.filter((x) => x.end <= s.start).at(-1);
  edit(prevStmt ? prevStmt.end : s.start, s.end, "");
};
for (const name of plan.dropImports ?? []) {
  const s = h.stmts.find((x) => x.kind === "import" && x.name === name);
  if (!s) throw new Error(`dropImports ${name}: not an import of the host`);
  removeStmt(s);
  report.push(`drop import ${name} (${s.module})`);
}
for (const id of plan.dropModules ?? []) {
  const s = h.stmts.find((x) => x.kind === "module" && x.name === `module ${id}`);
  if (!s) throw new Error(`dropModules ${id}: not defined by the host`);
  const users = h.stmts.filter((x) => x.kind === "import" && x.module === `module ${id}` && !(plan.dropImports ?? []).includes(x.name!));
  if (users.length) throw new Error(`dropModules ${id}: still imported by ${users.map((u) => u.name).join(", ")}`);
  removeStmt(s);
  report.push(`drop module define ${id}`);
}
const droppedNames = new Set<string>();
for (const pid of plan.dropCells ?? []) {
  const hc = hostCell({ pid });
  if (!hc) throw new Error(`dropCells ${pid}: not a host cell`);
  const fn = hc.fn ?? pid;
  if (h.stmts.some((s) => s !== hc && s.kind === "cell" && (s.fn ?? s.pid) === fn)) throw new Error(`dropCells ${pid}: const ${fn} is shared`);
  const c = constOf(h, hc)!;
  if (hostSrc[c.end] !== "\n") throw new Error(`dropCells ${pid}: const not followed by a newline`);
  edit(c.start, c.end + 1, "");
  removeStmt(hc);
  if (hc.name) droppedNames.add(hc.name);
  report.push(`drop cell ${hc.name ?? "(anonymous)"} (${pid})`);
}
const lastOf = (kind: "module" | "import") => h.stmts.filter((s) => s.kind === kind).at(-1);
for (const id of plan.addModules ?? []) {
  if (h.stmts.some((s) => s.kind === "module" && s.name === `module ${id}`)) throw new Error(`addModules ${id}: already defined`);
  const at = lastOf("module");
  if (!at) throw new Error(`addModules ${id}: host has no module define to follow`);
  edit(at.end, at.end, SEP + `main.define(${JSON.stringify(`module ${id}`)}, async () => runtime.module((await import(${JSON.stringify(`/${id}.js?v=4`)})).default));`);
  report.push(`add module define ${id}`);
}
for (const { name, module, imported = name } of plan.addImports ?? []) {
  const at = lastOf("import");
  if (!at) throw new Error(`addImports ${name}: host has no import to follow`);
  const args = imported === name ? JSON.stringify(name) : `${JSON.stringify(imported)}, ${JSON.stringify(name)}`;
  edit(at.end, at.end, SEP + `main.define(${JSON.stringify(name)}, [${JSON.stringify(`module ${module}`)}, "@variable"], (_, v) => v.import(${args}, _));`);
  report.push(`add import ${imported === name ? name : `${imported} as ${name}`} from ${module}`);
}

let merged = hostSrc;
for (const e of edits.sort((a, b) => b.start - a.start || b.order - a.order)) merged = merged.slice(0, e.start) + e.text + merged.slice(e.end);

// repointing rewrites string literals found by acorn in the statements that name the module
for (const [fromId, toId] of plan.repointImports ?? []) {
  const m = analyse(merged);
  if (m.stmts.some((s) => s.kind === "module" && s.name === `module ${toId}`)) throw new Error(`repointImports: host already defines module ${toId}`);
  const targets = m.stmts.filter((s) => (s.kind === "module" && s.name === `module ${fromId}`) || (s.kind === "import" && s.module === `module ${fromId}`));
  if (!targets.length) throw new Error(`repointImports: nothing refers to module ${fromId}`);
  const literalEdits: { start: number; end: number; text: string }[] = [];
  for (const s of targets) {
    const ast = acorn.parse(s.text, { ecmaVersion: "latest" }) as any;
    const visit = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (n.type === "Literal" && typeof n.value === "string" && n.value.includes(fromId)) {
        const value = n.value === `module ${fromId}` ? `module ${toId}` : n.value === `/${fromId}.js?v=4` ? `/${toId}.js?v=4` : null;
        if (value == null) throw new Error(`repointImports: unexpected literal ${n.raw} in ${s.text}`);
        literalEdits.push({ start: s.start + n.start, end: s.start + n.end, text: JSON.stringify(value) });
      }
      for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === "object" && v.type) visit(v); }
    };
    visit(ast);
  }
  for (const e of literalEdits.sort((a, b) => b.start - a.start)) merged = merged.slice(0, e.start) + e.text + merged.slice(e.end);
  report.push(`repoint ${targets.length} statement(s) from ${fromId} to ${toId}`);
}

for (const [from, to] of plan.replace ?? []) {
  const n = merged.split(from).length - 1;
  if (n !== 1) throw new Error(`replace: ${JSON.stringify(from.slice(0, 80))} occurs ${n} times`);
  merged = merged.replace(from, () => to);
  report.push(`replace ${JSON.stringify(from.slice(0, 60))}`);
}

const final = analyse(merged);
const pids = final.stmts.filter((s) => s.kind === "cell").map((s) => s.pid!);
const names = final.stmts.filter((s) => (s.kind === "cell" || s.kind === "import") && s.name).map((s) => s.name!);
const dup = (xs: string[]) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];
if (dup(pids).length) throw new Error(`duplicate pids ${dup(pids)}`);
if (dup(names).length) throw new Error(`duplicate names ${dup(names)}`);
const noConst = final.stmts.filter((s) => s.kind === "cell" && !constOf(final, s)).map((s) => s.pid);
if (noConst.length) throw new Error(`$def without a const: ${noConst}`);
if (droppedNames.size) {
  const users = final.stmts.filter((s) => s.kind === "cell").flatMap((s) => {
    const deps = (acorn.parse(s.text, { ecmaVersion: "latest" }) as any).body[0].expression.arguments[2].elements.map((e: any) => e.value);
    return deps.filter((d: string) => droppedNames.has(d) && !names.includes(d)).map((d: string) => `${s.name ?? s.pid} -> ${d}`);
  });
  if (users.length) throw new Error(`dropCells: still depended on: ${users.join(", ")}`);
}
for (const { name, module } of plan.addImports ?? []) {
  if (!final.stmts.some((s) => s.kind === "import" && s.name === name && s.module === `module ${module}`)) throw new Error(`addImports ${name}: not read back as an import of ${module}`);
  if (!final.stmts.some((s) => s.kind === "module" && s.name === `module ${module}`)) throw new Error(`addImports ${name}: module ${module} is not defined`);
}

let html = prev;
const block = blocks(html).find((b) => b.id === plan.module)!;
const raw = html.slice(block.start, block.end);
html = html.slice(0, block.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + merged + "\n</script>" + html.slice(block.end);
if (plan.mains?.length) {
  const conf = findSpan(html, "bootconf.json")!;
  const bootconf = JSON.parse(blockContent(html, "bootconf.json")!);
  for (const [from, to] of plan.mains) {
    const i = bootconf.mains.indexOf(from);
    if (i < 0) throw new Error(`mains has no ${from}`);
    bootconf.mains[i] = to;
  }
  const confRaw = html.slice(conf.start, conf.end);
  html = html.slice(0, conf.start) + confRaw.slice(0, confRaw.indexOf(">") + 1) + "\n" + JSON.stringify(bootconf, null, 2) + "\n</script>" + html.slice(conf.end);
  report.push(`mains ${JSON.stringify(bootconf.mains)}`);
}
console.log(report.join("\n"));
if (args.includes("--dry-run")) process.exit(0);
guardedWrite(out, prev, html, "", "merge-cells");
console.log(`wrote ${out}`);
