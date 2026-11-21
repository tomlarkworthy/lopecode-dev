// uses: ast
// lite/parse.ts TS and parse (sampled).
// parse: the parser itself is acorn (a JavaScript library); a cell can only take it. Reduced probe: the cell takes
// acorn's Parser as a parameter named for an outside cell. Its type: a function from source to Program.
export type AcornParse = (src: string, opts: { jsx: boolean }) => { program: Program; comments: Comment[] };
export const acornParse = (): AcornParse => (src: string, opts: { jsx: boolean }): { program: Program; comments: Comment[] } => { throw new Error("stub: the outside acorn cell"); };
export const parse = (acornParse) => (src: string, opts: { jsx?: boolean } = {}): Parsed => {
  const r = acornParse(src, { jsx: !!opts.jsx });
  const starts: Mut<number[]> = mut([0]);
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  const lineStarts = freeze(starts);
  const line = (pos: number): number => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if ((lineStarts[m] ?? 0) <= pos) lo = m; else hi = m - 1; }
    return lo + 1;
  };
  const leading = (n: Node): Comment[] => {
    const out: Mut<Comment[]> = mut([]);
    let at = n.start;
    for (let i = r.comments.length - 1; i >= 0; i--) {
      const c = r.comments[i];
      if (c === undefined || c.end > at) continue;
      if (src.slice(c.end, at).trim() !== "") break;
      out.unshift(c);
      at = c.start;
    }
    return freeze(out);
  };
  return { program: r.program, comments: r.comments, src, leading, line };
};
