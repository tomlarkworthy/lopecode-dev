const xs = () => [3, 1, 2];
const smallest = (xs: number[]) => {
  xs.sort((a, b) => a - b);
  return xs[0];
};
const first = (xs: number[]) => xs[0];
