const sortedNums = () => [1, 3, 5, 7, 9, 11, 13];
const bsearch = () => (xs: readonly number[], target: number): number => {
  let lo = 0;
  let hi = xs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] === target) return mid;
    if (xs[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
};
const found = (bsearch, sortedNums) => [bsearch(sortedNums, 7), bsearch(sortedNums, 8)];
