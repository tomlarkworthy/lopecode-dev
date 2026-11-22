// The one unchecked cell of completion: cpLezerAt(text, pos, tsx) parses text with the TSX (or TypeScript) grammar of
// @tomlarkworthy/codemirror-6-v2, the parser the editor colours cells with, which gives a tree for text that does not
// parse. It returns plain data: from the top node down to the last non-empty node that starts before pos, each with its
// children, innermost first; an error node is named "⚠". The last four trees are kept, by text. complete.ts hands it
// to the cp cells as the host's treeAt. Trusted for: the tree being Lezer's.
import { codemirror } from "./cp-lezer-bun.ts";
import type { CpLzNode, CpLzSpan } from "./cp-types.ss.ts";

export const cpLezerAt = (() => {
  const trees = new Map<string, any>();
  const span = (n: any): CpLzSpan => ({ name: n.name, from: n.from, to: n.to });
  return (text: string, pos: number, tsx: boolean): CpLzNode[] => {
    const key = (tsx ? "x" : "t") + text;
    let tree = trees.get(key);
    if (tree === undefined) {
      if (trees.size >= 4) trees.delete(trees.keys().next().value);
      tree = ((tsx ? codemirror.tsxLanguage : codemirror.typescriptLanguage) as any).parser.parse(text);
      trees.set(key, tree);
    }
    const out: CpLzNode[] = [];
    for (let n: any = tree.topNode; n; ) {
      const kids: CpLzSpan[] = [];
      let next: any = null;
      for (let c = n.firstChild; c; c = c.nextSibling) { kids.push(span(c)); if (c.from < pos && c.to > c.from) next = c; }
      out.push({ ...span(n), kids });
      n = next;
    }
    return out.reverse();
  };
})();
