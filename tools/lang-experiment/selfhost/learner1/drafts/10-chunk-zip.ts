const chunk = () => <T>(xs: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

const zip = () => <A, B>(xs: readonly A[], ys: readonly B[]): [A, B][] => {
  const out: [A, B][] = [];
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === undefined || y === undefined) continue;
    out.push([x, y]);
  }
  return out;
};

const chunks = (chunk) => chunk([1, 2, 3, 4, 5], 2);

const pairs = (zip) => zip(["a", "b"], [1, 2]);
