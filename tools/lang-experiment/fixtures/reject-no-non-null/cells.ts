let m = () => new Map<string, number>([["a", 1]]);
let g = (m) => m.get("a")! + 1;
