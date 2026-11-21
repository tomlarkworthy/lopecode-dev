// prelude.runtime.ts makeRandom: the closure over the generator state
export const makeRandom = (randomStep) => (seed: number) => { let a = seed; return (): number => { const s = randomStep(a); a = s.a; return s.value; }; };
export const randomStep = () => (a: number): { readonly a: number; readonly value: number } => ({ a: a + 1, value: a });
