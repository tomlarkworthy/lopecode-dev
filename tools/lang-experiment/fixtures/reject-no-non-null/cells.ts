export let m = () => new Map<string, number>([["a", 1]]);
export let g = (m) => m.get("a")! + 1;
