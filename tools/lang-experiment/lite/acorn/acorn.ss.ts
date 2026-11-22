// Typed acorn trees for checked cells. The parser is the shell cell acornParse (acorn-shell.ts), taken as a function
// from another language (S9.1, S11.3 to S11.11): each call's result is checked against Parse and handed over as a
// deep-frozen copy. Checked with acorn-types.ss.ts and acorn-kids.ss.ts in front, which gen.ts generates. Under bun,
// index.ts links these cells; in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.

// a parse of text (TSX when jsx): the tree, or acorn's error as a value
export const parseTree = (acornParse: (text: string, jsx: boolean) => Parse) => (text: string, jsx: boolean): Parse => acornParse(text, jsx);

// the position each line starts at
export const lineStarts = () => (src: string): number[] => {
  const out: Mut<number[]> = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) out.push(i + 1);
  return out;
};
// the line (from 1) of position pos, given the line starts
export const lineIn = () => (starts: number[], pos: number): number => {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if ((starts[m] ?? 0) <= pos) lo = m; else hi = m - 1;
  }
  return lo + 1;
};
// parse.ts line: the line of a position in src
export const lineAt = (lineStarts, lineIn) => (src: string): ((pos: number) => number) => {
  const starts = lineStarts(src);
  return (pos: number) => lineIn(starts, pos);
};
// parse.ts leading: the comments separated from start (and from each other) only by whitespace
export const leadingComments = () => (ast: Ast, start: number): AstComment[] => {
  const out: Mut<AstComment[]> = [];
  let at = start;
  for (let i = ast.comments.length - 1; i >= 0; i--) {
    const c = ast.comments[i];
    if (!c || c.end > at) continue;
    if (ast.src.slice(c.end, at).trim() !== "") break;
    out.unshift(c);
    at = c.start;
  }
  return out;
};
// the node type as acorn names it (an Other node keeps it in kind)
export const nodeKind = () => (n: AstNode): string => (n.type === "Other" ? n.kind : n.type);
export type FnNode = ArrowFunctionExpression | FunctionExpression | FunctionDeclaration;
// parse.ts isFn
export const isFnNode = () => (n: AstNode | null): boolean =>
  n !== null && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration");
// the keys of type positions, which parse.ts kids leaves out
export const TYPE_FIELDS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
// parse.ts kids: the children outside type positions, in source order
export const kidsOf = (childrenOf, TYPE_FIELDS) => (n: AstNode): AstNode[] =>
  childrenOf(n).filter((k) => !TYPE_FIELDS.has(k.key)).map((k) => k.node).toSorted((a, b) => a.start - b.start);
// every node of the tree, at its nid
export const byNid = (childrenOf) => (ast: Ast): (AstNode | null)[] => {
  const out: Mut<(AstNode | null)[]> = Array.from({ length: ast.count }, () => null);
  const todo: Mut<AstNode[]> = [ast.program];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    out[n.nid] = n;
    for (const k of childrenOf(n)) todo.push(k.node);
  }
  return out;
};
// the nid of each node's parent, at its nid (-1 for the program); a tree cannot hold its parent, as a value that
// contains itself does not cross
export const parentNids = (childrenOf) => (ast: Ast): number[] => {
  const out: Mut<number[]> = Array.from({ length: ast.count }, () => -1);
  const todo: Mut<AstNode[]> = [ast.program];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    for (const k of childrenOf(n)) { out[k.node.nid] = n.nid; todo.push(k.node); }
  }
  return out;
};
// the nids are a pre-order numbering: every nid below count occurs once, and each node's subtree holds exactly the nids
// from its own to its own + its size - 1. The boundary checks the shape, not this
export const preorder = (childrenOf) => (ast: Ast): boolean => {
  const seen: Mut<boolean[]> = Array.from({ length: ast.count }, () => false);
  // the size of n's subtree when it holds the nids n.nid .. n.nid + size - 1, each once; -1 when it does not
  const size = (n: AstNode): number => {
    if (n.nid < 0 || n.nid >= ast.count || seen[n.nid]) return -1;
    seen[n.nid] = true;
    let s = 1, hi = n.nid;
    for (const k of childrenOf(n)) {
      const c = k.node.nid > n.nid ? size(k.node) : -1;
      if (c < 0) return -1;
      s += c;
      hi = Math.max(hi, k.node.nid + c - 1);
    }
    return hi === n.nid + s - 1 ? s : -1;
  };
  return size(ast.program) === ast.count;
};
