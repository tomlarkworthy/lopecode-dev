// uses: ast, astlib, types
// Sampled small units from core.ts, own.ts, capture.ts, facts.ts, island.ts, intrinsics.ts, complete.ts, and the
// sampled type declarations (each used by a value cell, since the runner lists no type cells).
// Neighbours not sampled are stub cells with their true signatures (marked "stub"); never counted.

// --- core.ts reservedName (full body)
export const reservedName = () => (name: string): boolean => /^\$\d+$/.test(name) || name === "viewof" || name === "mutable";

// --- own.ts iterIn (full body). Registry is a record of the functions iterIn calls (the closure port of the class).
export type Reg = { isAlias: (n: string) => boolean; expand: (t: Ty) => Ty };
export const iterIn = (show) => {
  function iterIn(t: Ty, reg: Reg, depth: number): string | null {
    if (depth > 12) return null;
    const inner = (ts: Ty[]): string | null => { for (const x of ts) { const w = iterIn(x, reg, depth + 1); if (w) return w; } return null; };
    switch (t.k) {
      case "tv": return `the type parameter ${show(t)}`;
      case "arr": return inner([t.el]);
      case "tup": return inner(t.els);
      case "union": return inner(t.ts);
      case "rec": return inner([...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])]);
      case "named":
        if (t.n === "Iterable" || t.n === "Generator") return show(t);
        if (t.n === "Action" || t.n === "State" || t.n === "Events") return null;
        return reg.isAlias(t.n) ? iterIn(reg.expand(t), reg, depth + 1) : inner(t.args);
      default: return null;
    }
  }
  return (t: Ty, reg: Reg, depth: number = 0): string | null => iterIn(t, reg, depth);
};

// --- capture.ts captureMessage (full body) and Capture
export type Capture = { node: Node; name: string; why: string; opaque?: boolean };
export const captureMessage = () => (c: Capture): string => c.opaque
  ? `${c.name} ${c.why}; an action may use from its cell only inputs that hold no state and the consts and functions made from them, so pass the value to the action when it is called`
  : c.why.startsWith("capability ")
  ? `${c.name} is a capability, so an action using it would make the stored state depend on something the calls do not record; take the value as an argument of the action`
  : `${c.name} depends on state (${c.why}), so an action using it would act on the value from the cell's last run; read the state cell inside the action with read(...), or pass the value to the action when it is called`;

// --- capture.ts bound (full body). Original: writes into the caller's Set `out` and returns it.
// As written: a Mut<Set<string>> parameter, recursion through a local function.
export const bound = () => {
  function bound(p: Node | null | undefined, out: Mut<Set<string>>): void {
    if (!p) return;
    switch (p.type) {
      case "Identifier": out.add(p.name); break;
      case "ObjectPattern": for (const q of p.properties) bound(q.type === "RestElement" ? q.argument : q.type === "Property" ? q.value : null, out); break;
      case "ArrayPattern": for (const q of p.elements) bound(q, out); break;
      case "RestElement": bound(p.argument, out); break;
      case "AssignmentPattern": bound(p.left, out); break;
      case "TSParameterProperty": bound(p.parameter, out); break;
    }
  }
  return (p: Node | null | undefined): Set<string> => { const out = mut(new Set<string>()); bound(p, out); return freeze(out); };
};
// --- capture.ts captures (full body). refs and declaredIn are stubs (not sampled); isActionCall inlined as a cell.
export const isActionCall = () => (n: Node): boolean => n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "action";
export const refs = () => (n: Node): Identifier[] => { throw new Error("stub"); };
export const declaredIn = () => (fn: Node): Set<string> => { throw new Error("stub"); };
export const captures = (kids, isFn, bound, refs, declaredIn, isActionCall) => (cellFn: Node, tainted: Map<string, string>): Capture[] => {
  if (cellFn.type !== "ArrowFunctionExpression" && cellFn.type !== "FunctionExpression" && cellFn.type !== "FunctionDeclaration") return [];
  const taint = mut(new Map(tainted));
  const locals: Mut<{ names: Set<string>; from: Node }[]> = mut([]);
  function walkLocals(n: Node): void {
    if (isActionCall(n)) return;
    if (n.type === "VariableDeclarator" && n.init) locals.push({ names: bound(n.id), from: n.init });
    if (n.type === "FunctionDeclaration" && n.id) locals.push({ names: new Set([n.id.name]), from: n.body });
    for (const k of kids(n)) walkLocals(k);
  }
  walkLocals(cellFn.body);
  const ls = freeze(locals);
  for (let changed = true; changed; ) {
    changed = false;
    for (const l of ls) {
      let all = true;
      for (const x of l.names) if (!taint.has(x)) all = false;
      if (all) continue;
      let hit: Identifier | undefined = undefined;
      for (const r of refs(l.from)) if (hit === undefined && taint.has(r.name)) hit = r;
      if (!hit) continue;
      for (const x of l.names) if (!taint.has(x)) { taint.set(x, `computed from ${hit.name}`); changed = true; }
    }
  }
  if (!taint.size) return [];
  const out: Mut<Capture[]> = mut([]);
  function walk(n: Node): void {
    if (n.type === "CallExpression" && isActionCall(n)) {
      const f = n.arguments[0];
      if (f && (f.type === "ArrowFunctionExpression" || f.type === "FunctionExpression")) {
        const own = declaredIn(f);
        const seen = mut(new Set<string>());
        for (const r of refs(f.body)) {
          const why = taint.get(r.name);
          if (why !== undefined && !own.has(r.name) && !seen.has(r.name)) { seen.add(r.name); out.push({ node: r, name: r.name, why }); }
        }
        for (const p of f.params) for (const r of refs(p)) { const why = taint.get(r.name); if (why !== undefined && !own.has(r.name)) out.push({ node: r, name: r.name, why }); }
      }
      return;
    }
    for (const k of kids(n)) walk(k);
  }
  walk(cellFn.body);
  return freeze(out);
};

// --- facts.ts preludeCalls (full body); freeUses is a stub (not sampled)
export const freeUses = () => (fn: Node, name: string, pick: (n: Node, parent: Node | null) => boolean): Set<Node> => { throw new Error("stub"); };
export const preludeCalls = (freeUses) => (fn: Node, name: string): Set<Node> =>
  freeUses(fn, name, (n, p) => n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === name);
// --- facts.ts cellsOf (full body); parse (the SoundScript port, p_parse) and factsOf are stubs here
export type IslandSpec = { inputs: string[]; refs: string[]; outputs: string[] };
export type CellInfo = { name: string; span?: [number, number]; params: { name: string; refTyped: boolean; eventsTyped: boolean }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
export const parse = () => (src: string): Parsed => { throw new Error("stub"); };
export const factsOf = () => (name: string, fn: Node, stmt?: Node): CellInfo => { throw new Error("stub"); };
export const cellsOf = (parse, factsOf) => (src: string): CellInfo[] => {
  const out: Mut<CellInfo[]> = mut([]);
  for (const st of parse(src).program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d?.type === "FunctionDeclaration") { if (d.id) out.push(factsOf(d.id.name, d, st)); }
    else if (d?.type === "VariableDeclaration")
      for (const x of d.declarations)
        if (x.id.type === "Identifier" && x.init && (x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression")) out.push(factsOf(x.id.name, x.init, st));
  }
  return freeze(out);
};

// --- intrinsics.ts PRELUDE_FNS, CAPABILITIES; island.ts ISLAND_CAPABILITIES and island (full bodies)
export const PRELUDE_FNS = () => new Set(["state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "read"]);
export const CAPABILITIES = (): Record<string, string> => ({ now: "Clock", random: "Random", fetch: "Fetch", log: "Log", invalidation: "Invalidation", compile: "Compile", pool: "Pool" });
export const ISLAND_CAPABILITIES = (CAPABILITIES) => new Set(Object.keys(CAPABILITIES));
export type IslandCell = { name: string; params: string[]; refCell?: boolean };
export type Island = { order: string[]; problems: { name: string; msg: string }[] };
export const island = (ISLAND_CAPABILITIES) => (cells: IslandCell[], spec: IslandSpec): Island => {
  const by = new Map(cells.map((c): [string, IslandCell] => [c.name, c]));
  const problems: Mut<{ name: string; msg: string }[]> = mut([]);
  const cut = new Set([...spec.inputs, ...spec.refs]);
  for (const n of [...spec.inputs, ...spec.refs, ...spec.outputs]) if (!by.has(n)) problems.push({ name: n, msg: `no cell ${n}` });
  for (const n of spec.outputs) if (cut.has(n)) problems.push({ name: n, msg: `${n} is both an output and an input or ref` });
  const order: Mut<string[]> = mut([]);
  const seen = mut(new Set<string>());
  function visit(n: string, from: string): void {
    if (cut.has(n) || seen.has(n)) return;
    seen.add(n);
    const c = by.get(n);
    if (!c) {
      problems.push({ name: from, msg: ISLAND_CAPABILITIES.has(n) ? `island cell ${from} takes the capability ${n}` : `island cell ${from} takes ${n}, which is not a cell` });
      return;
    }
    if (c.refCell) problems.push({ name: n, msg: `${n} is a state cell; list it in refs` });
    for (const p of c.params) visit(p, n);
    order.push(n);
  }
  for (const o of spec.outputs) if (by.has(o) && !cut.has(o)) visit(o, o);
  return { order: freeze(order), problems: freeze(problems) };
};

// --- complete.ts PH and typeAt (full bodies)
export const PH = () => "__ss_complete__";
export const typeAt = () => (before: string): boolean => {
  const head = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:(?:const|let)\s+[\w$]+\s*=\s*(?:async\s+)?(?:function\*?\s*[\w$]*\s*)?|(?:async\s+)?function\*?\s+[\w$]+\s*)\(/.exec(before);
  if (!head) return false;
  const h = head[0];
  if (h === undefined) return false;
  const inside = before.slice(h.length);
  let depth = 0, seg = "";
  for (let i = 0; i < inside.length; i++) {
    const c = inside.charAt(i);
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c) && !(c === ">" && inside.charAt(i - 1) === "=")) {
      if (depth === 0) return c === ")" && /^\s*:[^={]*$/.test(inside.slice(i + 1));
      depth--;
    }
    if (depth === 0 && c === ",") { seg = ""; continue; }
    seg += c;
  }
  return /^\s*[\w$]+\s*\??\s*:/.test(seg);
};

// --- sampled type declarations, each used by a value cell
export type Variable = { name: string; inputs: string[]; definition: string };
export type Completion = { label: string; type: string; detail?: string; apply?: string };
export type Completions = { from: number; to: number; options: Completion[]; mode: "member" | "name" | "param" | "type" | "jsx" | "none" };
export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
export type Outside = { name: string; view?: boolean };
export type Rule = { node: Node; rule: string; msg: string };
export type Context = { generators: ReadonlySet<string>; events: ReadonlySet<string>; accepted: ReadonlySet<string> | null; facts?: ReadonlyMap<string, CellInfo> | null; why?: ReadonlyMap<string, string[]> | null; inputs?: Record<string, string>; module?: string | null };
export const useTypes = () => (v: Variable, c: Completions, o: Origin, x: Outside, r: Rule, k: Context): string => v.name + c.mode + o + x.name + r.rule + String(k.generators.size);
