const chunk = () => <T>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};
const zip = () => <A, B>(as: A[], bs: B[]): [A, B | undefined][] => {
  const copy = [...bs];
  return as.map((a, i) => [a, copy[i]]);
};
const chunks = (chunk) => chunk([1, 2, 3, 4, 5], 2);
const pairs = (zip) => zip(["a", "b"], [1, 2]);
