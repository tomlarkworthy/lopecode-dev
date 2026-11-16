// An undo stack: a state cell holding a list of actions. undo runs the top one and pops it.
const count = (): StateCell<number> => state(0);
const add = (count: State<number>) => action(() => count.update((c) => c + 1));
const sub = (count: State<number>) => action(() => count.update((c) => c - 1));
const noop = () => action(() => {});
const undos = (): StateCell<readonly Action<[]>[]> => state<readonly Action<[]>[]>([]);
// adding one pushes its inverse
const addOne = (add: Action<[]>, sub: Action<[]>, undos: State<readonly Action<[]>[]>) =>
  action(() => {
    add();
    undos.update((u) => [...u, sub]);
  });
const top = (undos: readonly Action<[]>[], noop: Action<[]>) => undos[undos.length - 1] ?? noop;
const undo = (top: Action<[]>, undos: State<readonly Action<[]>[]>) =>
  action(() => {
    top();
    undos.update((u) => u.slice(0, -1));
  });
const view = (addOne: Action<[]>, undo: Action<[]>, count: number, undos: readonly Action<[]>[]) => (
  <div>
    <button onClick={addOne}>add one</button> <button onClick={undo}>undo</button> <output>{count}</output> <output>{undos.length}</output>
  </div>
);
