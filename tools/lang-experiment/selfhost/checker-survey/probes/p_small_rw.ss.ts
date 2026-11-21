// uses: ast, types
// Local rewrites of sampled units whose original form p_small.ss.ts shows rejected.
export type IslandSpec = { inputs: string[]; refs: string[]; outputs: string[] };
export type CellInfo = { name: string; span?: [number, number]; params: { name: string; refTyped: boolean; eventsTyped: boolean }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
export const parse = () => (src: string): Parsed => { throw new Error("stub"); };
export const factsOf = () => (name: string, fn: Node, stmt?: Node): CellInfo => { throw new Error("stub"); };
// cellsOf: `d?.type === …` does not narrow d; `d && d.type === …` does
export const cellsOf = (parse, factsOf) => (src: string): CellInfo[] => {
  const out: Mut<CellInfo[]> = mut([]);
  for (const st of parse(src).program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d && d.type === "FunctionDeclaration") { if (d.id) out.push(factsOf(d.id.name, d, st)); }
    else if (d && d.type === "VariableDeclaration")
      for (const x of d.declarations)
        if (x.id.type === "Identifier" && x.init && (x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression")) out.push(factsOf(x.id.name, x.init, st));
  }
  return freeze(out);
};
// typeAt: a RegExpMatchArray cannot be indexed; the head is removed with replace (the pattern is anchored at ^)
export const typeAt = () => (before: string): boolean => {
  const HEAD = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:(?:const|let)\s+[\w$]+\s*=\s*(?:async\s+)?(?:function\*?\s*[\w$]*\s*)?|(?:async\s+)?function\*?\s+[\w$]+\s*)\(/;
  if (!HEAD.test(before)) return false;
  const inside = before.replace(HEAD, "");
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
// Context with Set/Map for ReadonlySet/ReadonlyMap (every SoundScript value is read-only unless Mut)
export type Context = { generators: Set<string>; events: Set<string>; accepted: Set<string> | null; facts?: Map<string, CellInfo> | null; why?: Map<string, string[]> | null; inputs?: Record<string, string>; module?: string | null };
export const useContext = () => (k: Context): number => k.generators.size;
