type Stack<T> = { readonly items: readonly T[] };
const stackOps = () => ({
  empty: <T>(): Stack<T> => ({ items: [] }),
  push: <T>(s: Stack<T>, x: T): Stack<T> => ({ items: [...s.items, x] }),
  pop: <T>(s: Stack<T>): [T | undefined, Stack<T>] => [s.items[s.items.length - 1], { items: s.items.slice(0, -1) }],
  peek: <T>(s: Stack<T>): T | undefined => s.items[s.items.length - 1],
});
const demo = (stackOps) => {
  let s = stackOps.empty();
  s = stackOps.push(s, 1);
  s = stackOps.push(s, 2);
  s = stackOps.push(s, 3);
  const [top, rest] = stackOps.pop(s);
  return { top, peek: stackOps.peek(rest), size: rest.items.length };
};
