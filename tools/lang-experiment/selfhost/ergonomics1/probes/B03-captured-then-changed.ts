const bag = () => {
  const items = [1];
  return { size: () => items.length, add: (n: number) => items.push(n) };
};
const before = (bag: { size: () => number; add: (n: number) => number }) => bag.size();
const after = (bag: { size: () => number; add: (n: number) => number }) => {
  bag.add(5);
  return bag.size();
};
