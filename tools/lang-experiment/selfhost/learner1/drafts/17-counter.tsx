const count = (): StateCell<number> => state(0);

const increment = (count: State<number>) => action(() => count.update((c) => c + 1));
const decrement = (count: State<number>) => action(() => count.update((c) => Math.max(0, c - 1)));
const reset = (count: State<number>) => action(() => count.set(0));

const label = (count: number) => `${count} ${count === 1 ? "click" : "clicks"}`;

const app = (label: string, increment: Action<[]>, decrement: Action<[]>, reset: Action<[]>) => (
  <div>
    <button onClick={decrement}>-</button> <button onClick={increment}>+</button>{" "}
    <button onClick={reset}>reset</button> <output>{label}</output>
  </div>
);
