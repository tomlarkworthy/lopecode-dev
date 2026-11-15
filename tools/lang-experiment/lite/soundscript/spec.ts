const s1_arrow = () => 1;

let s1_let = (s1_arrow: number) => s1_arrow + 1;

function s1_declared(s1_let: number) { return s1_let * 2; }

function* s1_generator() { yield 1; }

async function s1_async() { return 4; }

export const s1_exported = (s1_declared: number) => s1_declared + 1;

type S1Pair = { a: number; b: number };

const s1_typed = (): S1Pair => ({ a: 1, b: 2 });
