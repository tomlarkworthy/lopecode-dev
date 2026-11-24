const sortedNums = () => [1, 3, 5, 7, 9, 11, 13];

const search = () => (xs: readonly number[], target: number): number => {
  let lo = 0;
  let hi = xs.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = xs[mid];
    if (v === undefined) return -1;
    if (v === target) return mid;
    if (v < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
};

const found = (sortedNums: readonly number[], search) => [search(sortedNums, 7), search(sortedNums, 8)];
