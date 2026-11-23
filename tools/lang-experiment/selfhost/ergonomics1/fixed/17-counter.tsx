const count = (): StateCell<number> => state(0);
const inc = (count: State<number>) => action(() => count.update((c) => c + 1));
const dec = (count: State<number>) => action(() => count.update((c) => Math.max(0, c - 1)));
const reset = (count: State<number>) => action(() => count.set(0));
const label = (count: number) => (count === 1 ? "1 click" : `${count} clicks`);
const app = (label: string, inc: Action<[]>, dec: Action<[]>, reset: Action<[]>) => (
  <div>
    <button onClick={dec}>-</button> <output>{label}</output> <button onClick={inc}>+</button>
    <button onClick={reset}>reset</button>
  </div>
);
