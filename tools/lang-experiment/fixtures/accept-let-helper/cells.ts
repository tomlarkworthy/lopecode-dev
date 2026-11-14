// Recursive-descent parser: local helpers share the cursor `let i` (allowed in v1: none escapes).
type Tree = number | readonly Tree[];

export let parse = () => (src: string): Tree => {
  let i = 0;
  const peek = () => src[i];
  const expect = (c: string) => {
    if (src[i] !== c) throw new Error(`expected ${c} at ${i}`);
    i++;
  };
  function value(): Tree {
    return peek() === "[" ? list() : num();
  }
  function num(): number {
    const start = i;
    while (i < src.length && src[i] >= "0" && src[i] <= "9") i++;
    if (start === i) throw new Error(`number expected at ${i}`);
    return parseInt(src.slice(start, i), 10);
  }
  function list(): Tree[] {
    expect("[");
    let items: Tree[] = [];
    while (peek() !== "]") {
      items = [...items, value()];
      if (peek() === ",") i += 1;
    }
    expect("]");
    return items;
  }
  const t = value();
  if (i !== src.length) throw new Error(`trailing input at ${i}`);
  return t;
};
export let tree = (parse) => parse("[1,[2,30],[]]");
export let test_tree = (tree) => {
  if (!equals(tree, [1, [2, 30], []])) throw new Error(JSON.stringify(tree));
  return "ok";
};
