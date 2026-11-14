// State is a ref cell. Its value is a dependency like any other cell.
export function count(): RefCell<number> {
  return ref(0);
}

// A parameter typed Ref<number> receives the reference, not the value, and is not a dependency.
// Writes are legal only inside action(...).
export const increment = (count: Ref<number>) => action(() => count.update((c) => c + 1));
export const clear = (count: Ref<number>) => action(() => count.set(0));

// The view is a value: a tree of elements, rebuilt whenever count changes.
export const app = (count: number, increment: Action<[]>, clear: Action<[]>) => (
  <div>
    <button onClick={increment}>add one</button> <button onClick={clear} disabled={count === 0}>clear</button>{" "}
    <output>{count}</output>
  </div>
);
