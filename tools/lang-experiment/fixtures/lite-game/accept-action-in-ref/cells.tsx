// A ref holding an action: the button runs whichever action the ref holds now.
export const count = (): RefCell<number> => ref(0);
export const inc = (count: Ref<number>) => action(() => count.update((c) => c + 1));
export const dec = (count: Ref<number>) => action(() => count.update((c) => c - 1));
export const current = (inc: Action<[]>): RefCell<Action<[]>> => ref(inc);
export const useDec = (current: Ref<Action<[]>>, dec: Action<[]>) => action(() => current.set(dec));
export const useInc = (current: Ref<Action<[]>>, inc: Action<[]>) => action(() => current.set(inc));
export const view = (current: Action<[]>, useDec: Action<[]>, useInc: Action<[]>, count: number) => (
  <div>
    <button onClick={current}>apply</button> <button onClick={useInc}>+</button> <button onClick={useDec}>-</button> <output>{count}</output>
  </div>
);
