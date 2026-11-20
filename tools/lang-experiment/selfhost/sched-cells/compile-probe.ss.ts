export const st = (init) => init;
export const ev = (): Ev => ({ t: "kick", hid: 0 });
export const out = (step, st, ev) => step(st, ev);
export const stepCompiled = (compile: Compile) => compile({ inputs: ["st", "ev"], refs: [], outputs: ["out"] });
export const stepAsOutput = (compile: Compile) => compile({ inputs: [], refs: [], outputs: ["step"] });
export const stepEvTyped = (stepCompiled) => (s: Sched, e: Ev) => stepCompiled({ st: s, ev: e });
