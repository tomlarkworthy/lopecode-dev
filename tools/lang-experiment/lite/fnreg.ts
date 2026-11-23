// Closure registration (2026-11-22, cause A), over an acorn tree: for each function a cell's function makes, the locals
// of the cell it captures, so freeze.ts deepFreeze can freeze what a published function reaches. Edits to the cell
// function's text, each bracketed by /*ss+*/ ... /*ss-*/ so decompile drops them:
//   a function expression or arrow F          -> ss_closure(F, (ss_i) => ss_i < 0 ? 2 : ss_i === 0 ? a : b)
//   a function declaration h                  -> ss_closure(h, ...); at the start of its block
//   an object literal with methods            -> ss_methods({...}, "m", (ss_i) => ..., ...)
// A function capturing nothing is not registered. The cell function's own parameters are not captures (other cells'
// values, frozen at their own boundary, and capabilities) unless the cell assigns one. The TypeScript twin of the
// cells' tcFnRegs (lite/toolchain/tc-reg.ss.ts); link.ts and the frozen toolchain use this one. Unchecked.
type N = any;
export type RegEdit = { at: number; depth: number; end: boolean; text: string; use: "closure" | "methods" | null };
export type RegNames = { closure: string; methods: string };
const FNS = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);
const isNode = (x: unknown): x is N => !!x && typeof (x as N).type === "string";
const kids = (n: N): N[] => {
  const out: N[] = [];
  for (const k in n) if (k !== "loc" && k !== "range") { const v = n[k]; if (Array.isArray(v)) { for (const x of v) if (isNode(x)) out.push(x); } else if (isNode(v)) out.push(v); }
  return out;
};
const patNames = (p: N, out: string[] = []): string[] => {
  if (!p) return out;
  if (p.type === "Identifier") out.push(p.name);
  else if (p.type === "ObjectPattern") for (const q of p.properties) patNames(q.type === "RestElement" ? q.argument : q.value, out);
  else if (p.type === "ArrayPattern") for (const q of p.elements) patNames(q, out);
  else if (p.type === "AssignmentPattern") patNames(p.left, out);
  else if (p.type === "RestElement") patNames(p.argument, out);
  return out;
};
// names a list of statements declares at its own level (let, const, function; var anywhere below but not in a function)
const levelNames = (body: N[], vars: boolean): string[] => {
  const out: string[] = [];
  const varsIn = (n: N) => { if (!isNode(n) || FNS.has(n.type)) return; if (n.type === "VariableDeclaration" && n.kind === "var") for (const d of n.declarations) patNames(d.id, out); for (const k of kids(n)) varsIn(k); };
  for (const s of body) {
    if (s.type === "VariableDeclaration" && s.kind !== "var") for (const d of s.declarations) patNames(d.id, out);
    else if (s.type === "FunctionDeclaration" && s.id) out.push(s.id.name);
    if (vars) varsIn(s);
  }
  return out;
};
// the free names of a node: references no binding inside it declares
const freeIn = (root: N): Set<string> => {
  const free = new Set<string>();
  const pat = (p: N, b: Set<string>) => {
    if (!p || p.type === "Identifier") return;
    if (p.type === "ObjectPattern") for (const q of p.properties) { if (q.type === "RestElement") pat(q.argument, b); else { if (q.computed) ex(q.key, b); pat(q.value, b); } }
    else if (p.type === "ArrayPattern") for (const q of p.elements) pat(q, b);
    else if (p.type === "AssignmentPattern") { pat(p.left, b); ex(p.right, b); }
    else if (p.type === "RestElement") pat(p.argument, b);
    else ex(p, b);
  };
  const ex = (n: N, b: Set<string>): void => {
    if (!isNode(n)) return;
    switch (n.type) {
      case "Identifier": if (!b.has(n.name)) free.add(n.name); return;
      case "MemberExpression": ex(n.object, b); if (n.computed) ex(n.property, b); return;
      case "Property": if (n.computed) ex(n.key, b); ex(n.value, b); return;
      case "LabeledStatement": ex(n.body, b); return;
      case "BreakStatement": case "ContinueStatement": case "MetaProperty": case "ThisExpression": case "Super": return;
      case "ArrowFunctionExpression": case "FunctionExpression": case "FunctionDeclaration": {
        const pb = new Set([...b, ...n.params.flatMap((p: N) => patNames(p)), ...(n.id && n.type !== "FunctionDeclaration" ? [n.id.name] : [])]);
        for (const p of n.params) pat(p, pb);
        if (n.body.type !== "BlockStatement") { ex(n.body, pb); return; }
        const bb = new Set([...pb, ...levelNames(n.body.body, true)]);
        for (const s of n.body.body) ex(s, bb);
        return;
      }
      case "BlockStatement": case "StaticBlock": { const bb = new Set([...b, ...levelNames(n.body, false)]); for (const s of n.body) ex(s, bb); return; }
      case "SwitchStatement": { ex(n.discriminant, b); const bb = new Set([...b, ...levelNames(n.cases.flatMap((c: N) => c.consequent), false)]); for (const c of n.cases) { ex(c.test, bb); for (const s of c.consequent) ex(s, bb); } return; }
      case "ForStatement": case "ForInStatement": case "ForOfStatement": {
        const head = n.type === "ForStatement" ? n.init : n.left;
        const bb = new Set([...b, ...(head && head.type === "VariableDeclaration" && head.kind !== "var" ? head.declarations.flatMap((d: N) => patNames(d.id)) : [])]);
        for (const k of kids(n)) ex(k, bb);
        return;
      }
      case "CatchClause": { const bb = new Set([...b, ...patNames(n.param)]); if (n.param) pat(n.param, bb); ex(n.body, bb); return; }
      case "VariableDeclarator": pat(n.id, b); ex(n.init, b); return;
      case "AssignmentExpression": if (n.left.type === "Identifier") ex(n.left, b); else pat(n.left, b); ex(n.right, b); return;
      default: for (const k of kids(n)) ex(k, b);
    }
  };
  ex(root, new Set());
  return free;
};
// (ss_i) => the i-th capture's current value; ss_i < 0: the count. e1 (2026-11-23): the parameter was i, which a
// capture named i read instead of itself; ss_i is a reserved name (messages.ss.ts emittedName), so no capture has it
const thunk = (cs: string[]): string => `(ss_i) => ss_i < 0 ? ${cs.length} : ${cs.slice(0, -1).map((c, i) => `ss_i === ${i} ? ${c} : `).join("")}${cs[cs.length - 1]}`;
// a method's key as the object literal makes it: a BigInt literal's value is a bigint, String of which is the key
const keyOf = (k: N): string => (k.type === "Identifier" ? k.name : String(k.value));
const wrapOpen = "/*ss+*/", wrapClose = "/*ss-*/";
// the edits for one cell function (an arrow or function expression node)
export function fnRegEdits(cellFn: N, names: RegNames): RegEdit[] {
  const locals = new Set<string>(), assigned = new Set<string>();
  const own = new Set(cellFn.params.flatMap((p: N) => patNames(p)));
  const all: { n: N; parent: N; depth: number }[] = [];
  const walk = (n: N, parent: N, depth: number) => {
    all.push({ n, parent, depth });
    if (FNS.has(n.type) && n !== cellFn) { for (const p of n.params) for (const x of patNames(p)) locals.add(x); if (n.id) locals.add(n.id.name); }
    if (n.type === "VariableDeclarator") for (const x of patNames(n.id)) locals.add(x);
    if (n.type === "CatchClause") for (const x of patNames(n.param)) locals.add(x);
    if ((n.type === "AssignmentExpression" || n.type === "UpdateExpression") && (n.left ?? n.argument)?.type === "Identifier") assigned.add((n.left ?? n.argument).name);
    for (const k of kids(n)) walk(k, n, depth + 1);
  };
  walk(cellFn, null, 0);
  for (const p of own) if (assigned.has(p as string)) locals.add(p as string);
  const edits: RegEdit[] = [];
  const capsOf = (f: N): string[] => [...freeIn(f)].filter((x) => locals.has(x)).sort();
  for (const { n, parent, depth } of all) {
    if (n === cellFn) continue;
    if (n.type === "ObjectExpression") {
      const ms = n.properties.filter((p: N) => p.type === "Property" && p.method && !p.computed).map((p: N) => ({ key: keyOf(p.key), cs: capsOf(p.value), start: p.value.start }));
      const reg = ms.filter((m: { cs: string[] }) => m.cs.length > 0);
      if (!reg.length) continue;
      edits.push({ at: n.start, depth, end: false, text: `${wrapOpen}${names.methods}(${wrapClose}`, use: "methods" });
      edits.push({ at: n.end, depth, end: true, text: `${wrapOpen}, ${reg.map((m: { key: string; cs: string[] }) => `${JSON.stringify(m.key)}, ${thunk(m.cs)}`).join(", ")})${wrapClose}`, use: null });
      continue;
    }
    // a method is registered with its object; a getter, a setter and a class member are not SoundScript (unsupported)
    if (!FNS.has(n.type) || (parent && ((parent.type === "Property" && (parent.method || parent.kind !== "init") && parent.value === n) || parent.type === "MethodDefinition"))) continue;
    const cs = capsOf(n);
    if (!cs.length) continue;
    // a declaration is registered at the start of its block (it is hoisted): a capture declared after that may be in its dead zone
    const at = n.type === "FunctionDeclaration" && parent.type === "BlockStatement" ? parent.start + 1 : n.start;
    if (n.type === "FunctionDeclaration") {
      edits.push({ at, depth: parent.type === "BlockStatement" ? depth : depth - 1, end: false, text: `${wrapOpen}${names.closure}(${n.id.name}, ${thunk(cs)});${wrapClose}`, use: "closure" });
    } else {
      edits.push({ at: n.start, depth, end: false, text: `${wrapOpen}${names.closure}(${wrapClose}`, use: "closure" });
      edits.push({ at: n.end, depth, end: true, text: `${wrapOpen}, ${thunk(cs)})${wrapClose}`, use: null });
    }
  }
  return edits;
}
// text with the edits applied; positions are text's. At one position: ends (deepest first), then starts (outermost first)
export function applyRegEdits(text: string, edits: RegEdit[], offset = 0): string {
  const es = edits.toSorted((a, b) => a.at - b.at || (a.end === b.end ? (a.end ? b.depth - a.depth : a.depth - b.depth) : a.end ? -1 : 1));
  let out = "", at = 0;
  for (const e of es) { out += text.slice(at, e.at - offset) + e.text; at = e.at - offset; }
  return out + text.slice(at);
}
// the runtime cells the edits call, in the order closure, methods
export const regUses = (edits: RegEdit[]): ("closure" | "methods")[] => (["closure", "methods"] as const).filter((u) => edits.some((e) => e.use === u));
