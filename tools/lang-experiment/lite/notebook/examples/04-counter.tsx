// State is a ref cell. Its value is a dependency like any other cell.
export function count(): RefCell<number> {
  return ref(0);
}

// A parameter typed Ref<number> receives the reference, not the value, and is not a dependency.
// Writes are legal only inside action(...).
export const increment = (count: Ref<number>) => action(() => count.update((c) => c + 1));
export const clear = (count: Ref<number>) => action(() => count.set(0));

// An action reads state with read(...): save stores the count as it is when save is called.
export const saved = (): RefCell<number> => ref(0);
export const save = (count: Ref<number>, saved: Ref<number>) => action(() => saved.set(read(count)));

// The view is a value: a tree of elements, rebuilt whenever count or saved changes.
export const app = (count: number, saved: number, increment: Action<[]>, clear: Action<[]>, save: Action<[]>) => (
  <div>
    <button onClick={increment}>add one</button> <button onClick={clear} disabled={count === 0}>clear</button>{" "}
    <output>{count}</output> <button onClick={save}>save</button> <span>saved {saved}</span>
  </div>
);
