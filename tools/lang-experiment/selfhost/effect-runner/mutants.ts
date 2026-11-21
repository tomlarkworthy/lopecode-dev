// Controls: runners that each break one clause of runner.ts's contract. RUNNER_MUTANT=<name> selects one
// (runner-select.ts); each differential must tell it from the shipped shell.
import type { Performers, Run, Runner, Stepped, Tagged } from "./runner.ts";

type Table<Ev, Fx> = Record<string, (e: Fx, run: Run<Ev>) => Ev | void>;
type Make = <S, Ev extends object & { readonly fx?: never }, Fx extends Tagged>(step: (s: S, ev: Ev) => Stepped<S, Fx>, initial: S, perform: Performers<Fx, Ev>) => Runner<S, Ev>;

// fifo: a queue, so an effect's follow-up runs after the effects after it
const fifo: Make = (step, initial, perform) => {
  let state = initial;
  const table = perform as unknown as Table<any, any>;
  const feed = (first: any): unknown => {
    let answered: unknown;
    const run = { feed, answer: (v: unknown) => void (answered = v) };
    const work: any[] = [first];
    while (work.length) {
      const x = work.shift();
      if ("fx" in x) { const next = table[x.fx]!(x, run); if (next !== undefined) work.push(next); continue; }
      const r = step(state, x);
      state = r.state;
      work.push(...r.effects);
    }
    return answered;
  };
  return { feed, state: () => state };
};
// shared: one work stack for every feed, so a feed from inside a performer is only pushed, and runs later
const shared: Make = (step, initial, perform) => {
  let state = initial, running = false, answered: unknown;
  const table = perform as unknown as Table<any, any>;
  const work: any[] = [];
  const run = { feed: (ev: any) => feed(ev), answer: (v: unknown) => void (answered = v) };
  const feed = (first: any): unknown => {
    work.push(first);
    if (running) return undefined;
    running = true; answered = undefined;
    try {
      while (work.length) {
        const x = work.pop();
        if ("fx" in x) { const next = table[x.fx]!(x, run); if (next !== undefined) work.push(next); continue; }
        const r = step(state, x);
        state = r.state;
        for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]);
      }
    } finally { running = false; work.length = 0; }
    return answered;
  };
  return { feed, state: () => state };
};
// swallow: a performer's throw is reported and the work goes on
const swallow: Make = (step, initial, perform) => {
  let state = initial;
  const table = perform as unknown as Table<any, any>;
  const feed = (first: any): unknown => {
    let answered: unknown;
    const run = { feed, answer: (v: unknown) => void (answered = v) };
    const work: any[] = [first];
    while (work.length) {
      const x = work.pop();
      if ("fx" in x) { let next; try { next = table[x.fx]!(x, run); } catch (err) { console.error("swallowed:", err); } if (next !== undefined) work.push(next); continue; }
      const r = step(state, x);
      state = r.state;
      for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]);
    }
    return answered;
  };
  return { feed, state: () => state };
};
// late: the state is replaced after the step's effects ran, so a re-entrant feed's state is overwritten
const late: Make = (step, initial, perform) => {
  let state = initial;
  const table = perform as unknown as Table<any, any>;
  const feed = (first: any): unknown => {
    let answered: unknown;
    const run = { feed, answer: (v: unknown) => void (answered = v) };
    const one = (x: any): void => {
      if ("fx" in x) { const next = table[x.fx]!(x, run); if (next !== undefined) one(next); return; }
      const r = step(state, x);
      for (const e of r.effects) one(e);
      state = r.state;
    };
    one(first);
    return answered;
  };
  return { feed, state: () => state };
};
export const MUTANTS: Record<string, Make> = { fifo, shared, swallow, late };
