const chunk = () => <T>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};
const zip = () => <A, B>(as: A[], bs: B[]): [A, B][] => {
  const out: [A, B][] = [];
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    const a = as[i];
    const b = bs[i];
    if (a !== undefined && b !== undefined) out.push([a, b]);
  }
  return out;
};
const chunks = (chunk) => chunk([1, 2, 3, 4, 5], 2);
const pairs = (zip) => zip(["a", "b"], [1, 2]);
