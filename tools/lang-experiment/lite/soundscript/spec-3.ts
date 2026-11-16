type S3Tree = number | readonly S3Tree[];

const s3_parse = () => (src: string): S3Tree => {
  let i = 0;
  const peek = () => src.charAt(i);
  const expect = (c: string) => {
    if (src.charAt(i) !== c) throw new Error(`expected ${c} at ${i}`);
    i++;
  };
  function value(): S3Tree {
    return peek() === "[" ? list() : num();
  }
  function num(): number {
    const start = i;
    while (i < src.length && src.charAt(i) >= "0" && src.charAt(i) <= "9") i++;
    if (start === i) throw new Error(`number expected at ${i}`);
    return parseInt(src.slice(start, i), 10);
  }
  function list(): S3Tree[] {
    expect("[");
    let items: S3Tree[] = [];
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

const s3_tree = (s3_parse) => s3_parse("[1,[2,30],[]]");

const s3_point = () => ({ x: 1, y: 2 });

const s3_moved = (s3_point) => ({ ...s3_point, x: s3_point.x + 1 });

const s3_sorted = () => [3, 1, 2].toSorted((a, b) => a - b);

const s3_same = (s3_moved) => [equals(s3_moved, { x: 2, y: 2 }), equals(s3_moved, { x: 2, y: 3 })];

const s3_steps = () => {
  let n = 0;
  for (let i = 0; i < 4; i++) n += i;
  try {
    if (n > 5) throw new RangeError("big");
  } catch (e) {
    n = -n;
  }
  return n;
};
