export let a = () => ({ x: 1 });
export let b = ({ x }: { x: number }) => x;
export let c = (a = 1) => a;
export let d = (...xs: number[]) => xs.length;
