type Ev = { readonly kind: "add"; readonly by: number } | { readonly kind: "undo" };
type S = { readonly total: number; readonly history: readonly number[] };

// The reducer is a plain function cell, so it can be tested without any DOM.
const step = () => (s: S, e: Ev): S => {
  if (e.kind === "add") return { total: s.total + e.by, history: [...s.history, e.by] };
  const last = s.history[s.history.length - 1] ?? 0;
  return { total: s.total - last, history: s.history.slice(0, -1) };
};

const state = (): RefCell<S> => ref<S>({ total: 0, history: [] });
const total = (state) => state.total;
const history = (state) => state.history;

// Every write is state.update(s => step(s, event)): one function from old state to new state.
const add = (state: Ref<S>, step) => action((by: number) => state.update((s) => step(s, { kind: "add", by })));
const undo = (state: Ref<S>, step) => action(() => state.update((s) => step(s, { kind: "undo" })));
const add1 = (add: Action<[number]>) => action(() => add(1));
const add10 = (add: Action<[number]>) => action(() => add(10));

const app = (total: number, history: readonly number[], add1, add10, undo) => (
  <div>
    <button onClick={add1}>+1</button> <button onClick={add10}>+10</button>{" "}
    <button onClick={undo} disabled={history.length === 0}>undo</button>{" "}
    <output>total {total}, history [{history.join(", ")}]</output>
  </div>
);

const test_undo = (step) => {
  const s = step(step({ total: 0, history: [] }, { kind: "add", by: 3 }), { kind: "undo" });
  if (s.total !== 0 || s.history.length !== 0) throw new Error(`undo left ${s.total}`);
  return "ok";
};
