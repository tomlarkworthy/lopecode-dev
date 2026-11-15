// An undo stack: a ref holding a list of actions. undo runs the top one and pops it.
const count = (): RefCell<number> => ref(0);
const add = (count: Ref<number>) => action(() => count.update((c) => c + 1));
const sub = (count: Ref<number>) => action(() => count.update((c) => c - 1));
const noop = () => action(() => {});
const undos = (): RefCell<readonly Action<[]>[]> => ref<readonly Action<[]>[]>([]);
// adding one pushes its inverse
const addOne = (add: Action<[]>, sub: Action<[]>, undos: Ref<readonly Action<[]>[]>) =>
  action(() => {
    add();
    undos.update((u) => [...u, sub]);
  });
const top = (undos: readonly Action<[]>[], noop: Action<[]>) => undos[undos.length - 1] ?? noop;
const undo = (top: Action<[]>, undos: Ref<readonly Action<[]>[]>) =>
  action(() => {
    top();
    undos.update((u) => u.slice(0, -1));
  });
const view = (addOne: Action<[]>, undo: Action<[]>, count: number, undos: readonly Action<[]>[]) => (
  <div>
    <button onClick={addOne}>add one</button> <button onClick={undo}>undo</button> <output>{count}</output> <output>{undos.length}</output>
  </div>
);
