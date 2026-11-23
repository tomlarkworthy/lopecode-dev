type Tree = { value: number; children: Tree[] };
const tree = (): Tree => ({
  value: 1,
  children: [
    { value: 2, children: [{ value: 4, children: [] }] },
    { value: 3, children: [] },
  ],
});
const sumTree = () => {
  const go = (t: Tree): number => t.value + t.children.reduce((s, c) => s + go(c), 0);
  return go;
};
const depth = () => {
  const d = (t: Tree): number => 1 + Math.max(0, ...t.children.map(d));
  return d;
};
const stats = (tree: Tree, sumTree: (t: Tree) => number, depth: (t: Tree) => number) => ({ sum: sumTree(tree), depth: depth(tree) });
const flatten = (tree: Tree) => {
  const out: number[] = [];
  const walk = (t: Tree): void => {
    out.push(t.value);
    for (const c of t.children) walk(c);
  };
  walk(tree);
  return out;
};
