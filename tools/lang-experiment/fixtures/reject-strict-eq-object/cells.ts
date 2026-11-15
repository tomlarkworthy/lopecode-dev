let xs = () => [1];
let ys = () => [1];
let same = (xs, ys) => xs === ys;
let fine = (xs) => xs.length === 1;
let loose = (xs, ys) => xs == ys || xs != ys;
