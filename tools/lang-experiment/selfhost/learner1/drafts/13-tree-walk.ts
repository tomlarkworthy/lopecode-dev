type Tree = { readonly value: number; readonly children: readonly Tree[] };

const tree = (): Tree => ({
  value: 1,
  children: [
    { value: 2, children: [{ value: 4, children: [] }] },
    { value: 3, children: [] },
  ],
});

const stats = (tree: Tree) => {
  const sum = (t: Tree): number => t.value + t.children.reduce((acc, c) => acc + sum(c), 0);
  const depth = (t: Tree): number => 1 + Math.max(0, ...t.children.map((c) => depth(c)));
  return { sum: sum(tree), depth: depth(tree) };
};

const flatten = (tree: Tree) => {
  const pre = (t: Tree): number[] => [t.value, ...t.children.flatMap((c) => pre(c))];
  return pre(tree);
};
