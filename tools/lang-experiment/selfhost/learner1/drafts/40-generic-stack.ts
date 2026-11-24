type Stack<T> = { readonly items: readonly T[] };

const empty = () => <T>(): Stack<T> => ({ items: [] });
const push = () => <T>(s: Stack<T>, x: T): Stack<T> => ({ items: [...s.items, x] });
const pop = () => <T>(s: Stack<T>): readonly [T | undefined, Stack<T>] => [s.items.at(-1), { items: s.items.slice(0, -1) }];
const peek = () => <T>(s: Stack<T>): T | undefined => s.items.at(-1);

const demo = (empty, push, pop, peek) => {
  const s = push(push(push(empty<number>(), 1), 2), 3);
  const [top, rest] = pop(s);
  return { top, peek: peek(rest), size: rest.items.length };
};
