// A state cell holding an action: the button runs whichever action it holds now.
const count = (): StateCell<number> => state(0);
const inc = (count: State<number>) => action(() => count.update((c) => c + 1));
const dec = (count: State<number>) => action(() => count.update((c) => c - 1));
const current = (inc: Action<[]>): StateCell<Action<[]>> => state(inc);
const useDec = (current: State<Action<[]>>, dec: Action<[]>) => action(() => current.set(dec));
const useInc = (current: State<Action<[]>>, inc: Action<[]>) => action(() => current.set(inc));
const view = (current: Action<[]>, useDec: Action<[]>, useInc: Action<[]>, count: number) => (
  <div>
    <button onClick={current}>apply</button> <button onClick={useInc}>+</button> <button onClick={useDec}>-</button> <output>{count}</output>
  </div>
);
