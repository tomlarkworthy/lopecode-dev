// Programs that break a rule of the specification but pass check: the stated limits of the approximations.
// fixtures.ts asserts check ACCEPTS this file; if a rule is tightened, move the line to a reject fixture
// and update the README table.
let o = () => ({ a: 1, xs: [1, 2] });
// mutating-method: dispatch through a function value, not a method call on the receiver
let s2 = (o) => { Array.prototype.push.call(o.xs, 3); return 1; };
// immutability: Object.defineProperty is not on the list of RULES.md (2026-11-14)
let s3 = (o) => { Object.defineProperty(o, "a", { value: 9 }); return 1; };
// mut-escape: a method whose result aliases the Mut buffer
let s4 = () => { const out = mut(new Float32Array(4)); return out.subarray(0); };
// member-write: a write through a Mut root reaches a value that is not owned
let s6 = (o) => { const out = mut({ src: o }); out.src.a = 7; return 1; };
// let-capture: a parameter (not a let) reassigned from a closure
let s7 = (o) => { const f = () => { o = { a: 0, xs: [] }; }; f(); return 1; };
let frames = function* () { const b = mut(new Float32Array(2)); yield borrow(b); };
// borrowed-escape: a method whose result aliases the borrowed buffer
let s8 = (frames) => frames.subarray(0);
// borrowed-await: a use textually before the await, executed after it on the next iteration
let s9 = async (frames) => { let t = 0; for (let i = 0; i < 2; i++) { t += frames[0]; await Promise.resolve(); } return t; };
// mut-after-freeze: a write textually before freeze, executed after it on the next iteration
let s10 = () => { const out = mut([0]); let r: number[] = []; for (let i = 0; i < 2; i++) { out[0] = i; if (i === 0) r = freeze(out); } return r; };
let c = (): RefCell<number> => ref(0);
let a = (c: Ref<number>) => action(() => c.set(1));
// action-pass: an Action inside a record passed to a parameter not typed Action
let s11 = (a) => { const call = (box: { a: () => void }) => box; return call({ a }); };
// mutating-method: receiver typed by a type parameter
let s12 = (o) => { const g = <T extends number[]>(xs: T) => xs.push(1); return g(o.xs); };
// ref-write: the Ref widened to a structural type loses its brand (run.ts still throws at run time)
let w1 = (c: Ref<number>) => { const r: { set(v: number): void } = c; r.set(1); return 1; };
// action-call: the Action widened to () => void (run.ts still throws at run time)
let w2 = (a) => { const f: () => void = a; f(); return 1; };
// borrowed-escape: the Borrowed widened to its plain type, then returned
let w3 = (frames) => { const p: Float32Array = frames; return p; };
