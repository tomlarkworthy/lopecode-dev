type T = { k: "a" } | { k: "b"; n: number };
const p1 = () => {
  const out = mut(new Array<T>());
  out.push({ k: "a" });
  return freeze(out);
};
const p2 = () => {
  const out: Mut<T[]> = mut([]);
  out.push({ k: "a" });
  return freeze(out);
};
const p3 = () => {
  const s = mut(new Set<string>());
  s.add("x");
  return freeze(s).size;
};
const p4 = () => (t: T, depth: number = 0): string => (depth > 1 ? "x" : t.k);
const p5 = () => (t: T): T => {
  const g: T = t;
  return { ...g };
};
const p6 = () => (f: { k: "b"; n: number; m?: string }): { k: "b"; n: number; m?: string } => ({ ...f, n: 2 });
const p7 = () => (t: T): number => {
  if (t.k === "a") return 1;
  if (t.k === "b") return t.n;
  return 0;
};
const p8 = () => (tp: { readonly params?: readonly { readonly name: string | { readonly name: string } }[] } | null | undefined): string[] =>
  (tp?.params ?? []).map((x) => (typeof x.name === "string" ? x.name : x.name.name));
const p9 = () => {
  function f(t: T): T[] {
    return t.k === "a" ? [t] : [t, ...f({ k: "a" })];
  }
  return [{ k: "b", n: 1 }].flatMap(f);
};
