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
export type RegEdit = { at: number; depth: number; end: boolean; text: string; use: "closure" | "methods" | "out" | null };
export type RegNames = { closure: string; methods: string; out?: string };
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
  return names.out === undefined ? edits : [...edits, ...guardEdits(cellFn, names.out)];
}
// the promise members whose callback the run time calls later (x1)
const PROMISE_CBS = new Set(["then", "finally"]);
// x1 (2026-11-24): the async guard (freeze.ts guardAsync). Each async function's body declares ss_g (an expression body
// becomes an async arrow called at once); each await, and each yield of an async generator, leaves and resumes it; each
// argument of a call of a member named then or finally is bound. A depth of k + 0.5 sits between a node and its children, so an
// edit here encloses the edits fnRegEdits makes at the same position
function guardEdits(cellFn: N, o: string): RegEdit[] {
  const ed: RegEdit[] = [];
  const wrap = (a: N, depth: number, open: string, close: string) => ed.push({ at: a.start, depth, end: false, text: wrapOpen + open + wrapClose, use: "out" }, { at: a.end, depth, end: true, text: wrapOpen + close + wrapClose, use: null });
  const walk = (n: N, fn: N, depth: number): void => {
    const b = n.body;
    if (FNS.has(n.type) && n.async && b.type !== "BlockStatement") wrap(b, depth + 0.5, `(async () => { const ss_g = ${o}.enter(); try { return (`, `); } finally { ${o}.exit(ss_g); } })()`);
    else if (FNS.has(n.type) && n.async && b.body.length > 0)
      ed.push({ at: b.start + 1, depth: depth + 0.5, end: false, text: `${wrapOpen}const ss_g = ${o}.enter(); try {${wrapClose}`, use: "out" }, { at: b.end - 1, depth: depth + 0.5, end: true, text: `${wrapOpen}} finally { ${o}.exit(ss_g); }${wrapClose}`, use: null });
    if (n.type === "AwaitExpression") { wrap(n, depth, `${o}.back(ss_g, `, ")"); wrap(n.argument, depth + 0.5, `${o}.away(ss_g, `, ")"); }
    if (n.type === "YieldExpression" && fn.async) {
      if (n.argument) { wrap(n, depth, `${o}.resumed(ss_g, `, ")"); wrap(n.argument, depth + 0.5, `${o}.left(ss_g, ${o}.back(ss_g, await ${o}.away(ss_g, `, ")))"); }
      else wrap(n, depth, `${o}.resumed(ss_g, `, ` ${o}.left(ss_g, void 0))`);
    }
    const m = n.type === "CallExpression" && n.callee.type === "MemberExpression" ? n.callee : null;
    if (m && PROMISE_CBS.has(m.computed ? (m.property.type === "Literal" ? m.property.value : null) : m.property.name))
      for (const a of n.arguments) if (a.type !== "SpreadElement") wrap(a, depth + 0.5, `${o}.bind(`, ")");
    for (const k of kids(n)) walk(k, FNS.has(n.type) ? n : fn, depth + 1);
  };
  walk(cellFn, cellFn, 0);
  return ed;
}
// open part 6 (HO, S3.21): the TypeScript twin of tc-reg.ss.ts tcHoleSites and tcHoleEdit. Each index or length write
// whose mark from the check is not false (each one when the marks do not match the writes) becomes a call of freeze.ts
// holeWrites, the tokens it replaces kept in ss: comments. text is the parsed text, (typed); lex its tokenizer, comments its comments
export type Tok = { label: string; start: number; end: number };
export function holeEdits(cellFn: N, text: string, holes: readonly boolean[], o: string, lex: (s: string) => Tok[], comments: { start: number; end: number }[]): RegEdit[] {
  const sites: { n: N; t: N; depth: number }[] = [];
  const walk = (n: N, depth: number) => {
    const t = n.type === "AssignmentExpression" ? n.left : n.type === "UpdateExpression" ? n.argument : null;
    if (t && t.type === "MemberExpression" && (t.computed || (t.property.type === "Identifier" && t.property.name === "length"))) sites.push({ n, t, depth });
    for (const k of kids(n)) walk(k, depth + 1);
  };
  walk(cellFn, 0);
  sites.sort((a, b) => a.t.start - b.t.start);
  const toksIn = (a: number, b: number) => lex(text.slice(a, b)).map((k) => ({ label: k.label, start: k.start + a, end: k.end + a }));
  return sites.flatMap((s, i) => (sites.length === holes.length && holes[i] === false ? [] : holeEdit(text, comments, toksIn, s, o)));
}
function holeEdit(text: string, comments: { start: number; end: number }[], toksIn: (a: number, b: number) => Tok[], s: { n: N; t: N; depth: number }, o: string): RegEdit[] {
  const { n, t, depth: d } = s, add = (x: string) => (x === "" ? "" : wrapOpen + x + wrapClose), hide = "/*ss:";
  const len = !t.computed || (t.property.type === "Literal" && t.property.value === "length"), pre = n.type === "UpdateExpression" && n.prefix;
  const toks = toksIn(t.object.end, n.type === "AssignmentExpression" ? n.right.start : n.end), rb = toks.find((k) => k.label === "]" && k.start >= t.property.end);
  const lb = toks.find((k) => k.label === "[" || (len && k.label === ".")) ?? { start: -1, end: -1 };
  const opTok = toks.find((k) => k.start >= t.end && k.label !== ")");
  const opEnd = pre ? n.end : opTok && ["=", "_=", "++/--"].includes(opTok.label) ? opTok.end : -1, cut = len ? lb.start : rb?.start ?? -1;
  const ok = (a: number, b: number, n0: number) => a >= 0 && toksIn(a, b).length === n0 && !comments.some((c) => c.end > a && c.start < b);
  // open part 7: a parenthesized target, (xs[0]) = 2, has its parentheses kept in the ss: comments
  const lead = toksIn(n.start, t.start), opens = lead.filter((k) => k.label === "(").length;
  if (cut < 0 || opEnd < 0 || !ok(cut, opEnd, (len && t.computed ? 3 : len ? 2 : 1) + (pre ? 0 : 1) + opens) || lead.length !== opens + (pre ? 1 : 0))
    throw new Error("tc-gap: an index or length write with a comment among its tokens");
  const op = n.type === "AssignmentExpression" ? n.operator : "", up = n.type === "UpdateExpression" ? `, ${n.operator === "++" ? 1 : -1}, ${pre})` : "";
  const fn = op === "=" ? (len ? "putLen(" : "put(") : op !== "" ? `putOp(${o}.${len ? "lenAt" : "at"}(` : len ? "putLenUp(" : "putUp(";
  const mid = op === "=" ? ", " : op !== "" ? `), ${JSON.stringify(op.slice(0, -1))}, ` : "";
  const e = (at: number, end: boolean, txt: string, use: RegEdit["use"] = null): RegEdit => ({ at, depth: d, end, text: txt, use });
  const head = lead.length > 0 ? [e(n.start, false, hide), e(t.start, false, "*/" + add(`${o}.${fn}`), "out")] : [e(n.start, false, add(`${o}.${fn}`), "out")];
  const index = len ? [] : [e(lb.start, true, hide), e(lb.end, true, "*/" + add(", "))];
  return [...head, ...index, e(cut, true, add(mid) + hide), e(opEnd, true, "*/" + add(up)), ...(op === "" ? [] : [e(n.end, true, add(")"))])];
}
// text with the edits applied; positions are text's. At one position: ends (deepest first), then starts (outermost first)
export function applyRegEdits(text: string, edits: RegEdit[], offset = 0): string {
  const es = edits.toSorted((a, b) => a.at - b.at || (a.end === b.end ? (a.end ? b.depth - a.depth : a.depth - b.depth) : a.end ? -1 : 1));
  let out = "", at = 0;
  for (const e of es) { out += text.slice(at, e.at - offset) + e.text; at = e.at - offset; }
  return out + text.slice(at);
}
// the runtime cells the edits call, in the order closure, methods
export const regUses = (edits: RegEdit[]): ("closure" | "methods" | "out")[] => (["closure", "methods", "out"] as const).filter((u) => edits.some((e) => e.use === u));
