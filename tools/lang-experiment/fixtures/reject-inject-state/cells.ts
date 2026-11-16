let a = () => 1;
let b = (a: State<number>) => action(() => a.set(2));
let e = (now: State<number>) => 1;
let g = (lib: State<number>) => 1;
