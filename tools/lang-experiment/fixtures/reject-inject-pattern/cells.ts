let a = () => ({ x: 1 });
let b = ({ x }: { x: number }) => x;
let c = (a = 1) => a;
let d = (...xs: number[]) => xs.length;
