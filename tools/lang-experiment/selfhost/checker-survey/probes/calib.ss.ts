export type Pos = { line: number; column: number };
export type Ident = { type: "Identifier"; start: number; end: number; name: string };
export type Lit = { type: "Literal"; start: number; end: number; value: string | number | boolean | null };
export type Bin = { type: "BinaryExpression"; start: number; end: number; operator: string; left: Expr; right: Expr };
export type Call = { type: "CallExpression"; start: number; end: number; callee: Expr; arguments: Expr[] };
export type Expr = Ident | Lit | Bin | Call;

export const kidsOf = () => (n: Expr): Expr[] => {
  if (n.type === "BinaryExpression") return [n.left, n.right];
  if (n.type === "CallExpression") return [n.callee, ...n.arguments];
  return [];
};
export const switchKids = () => (n: Expr): Expr[] => {
  switch (n.type) {
    case "BinaryExpression": return [n.left, n.right];
    case "CallExpression": return [n.callee, ...n.arguments];
    default: return [];
  }
};
export const freeNames = (kidsOf) => (root: Expr): Set<string> => {
  const out = mut(new Set<string>());
  function go(n: Expr): void {
    if (n.type === "Identifier") out.add(n.name);
    for (const k of kidsOf(n)) go(k);
  }
  go(root);
  return freeze(out);
};
export const forEachPush = (kidsOf) => (root: Expr): string[] => {
  const out: Mut<string[]> = mut([]);
  kidsOf(root).forEach((k) => { if (k.type === "Identifier") out.push(k.name); });
  return freeze(out);
};
export const regexUse = () => (s: string): boolean => /^(Arrow|Function)/.test(s);
export const mapGroup = () => (xs: string[]): Map<string, number> => {
  const m = mut(new Map<string, number>());
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return freeze(m);
};
export const throwsErr = () => (x: number): number => { if (x < 0) throw new Error("neg"); return x; };
export const catcher = (throwsErr) => (x: number): number => { try { return throwsErr(x); } catch (e) { return 0; } };
export const dynKey = () => (o: { [k: string]: unknown }, k: string): unknown => o[k];
export const forIn = () => (o: { [k: string]: unknown }): string[] => { const out: Mut<string[]> = mut([]); for (const k in o) out.push(k); return freeze(out); };
export const objKeys = () => (o: object): string[] => Object.keys(o);
export const localType = () => (x: number): number => { type P = { a: number }; const p: P = { a: x }; return p.a; };
export const optChain = () => (x: { a?: { b?: number } }): number => x.a?.b ?? 0;
export const recordOfClosures = () => {
  const make = (base: number) => ({ add: (y: number): number => base + y, twice: (): number => base * 2 });
  return make;
};
export const letCounter = () => (xs: string[]): number => { let n = 0; for (const x of xs) if (x.length) n++; return n; };
export const nestedLetAssign = () => (xs: string[]): number => { let n = 0; const bump = () => { n++; }; for (const x of xs) bump(); return n; };
export const mutRecordField = () => (): { n: number } => { const r = mut({ n: 0 }); r.n = 3; return freeze(r); };
export const genericFn = () => <T>(xs: T[], f: (x: T) => boolean): T[] => xs.filter(f);
export const tupleRet = () => (x: number): [number, string] => [x, String(x)];
export const destructure = () => (p: { a: number; b: string }): string => { const { a, b } = p; return b + a; };
export const arrayIndex = () => (xs: string[]): string => xs[0] ?? "";
export const sliceStr = () => (s: string, a: number, b: number): string => s.slice(a, b);
export const whileLoop = () => (n: number): number => { let i = 0; while (i < n) i += 2; return i; };
export const unknownNarrow = () => (v: unknown): string => typeof v === "object" && v !== null && "type" in v && typeof v.type === "string" ? v.type : "";
