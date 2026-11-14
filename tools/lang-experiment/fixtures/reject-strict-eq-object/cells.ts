export let xs = () => [1];
export let ys = () => [1];
export let same = (xs, ys) => xs === ys;
export let fine = (xs) => xs.length === 1;
export let loose = (xs, ys) => xs == ys || xs != ys;
