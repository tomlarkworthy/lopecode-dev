type Todo = { readonly id: number; readonly text: string; readonly done: boolean };

const todos = (): StateCell<readonly Todo[]> => state<readonly Todo[]>([]);
const nextId = (): StateCell<number> => state(1);

const addTodo = (todos: State<readonly Todo[]>, nextId: State<number>) =>
  action((text: string) => {
    const id = read(nextId);
    nextId.set(id + 1);
    todos.update((ts) => [...ts, { id, text, done: false }]);
  });

const toggleTodo = (todos: State<readonly Todo[]>) =>
  action((id: number) => todos.update((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))));

const removeTodo = (todos: State<readonly Todo[]>) =>
  action((id: number) => todos.update((ts) => ts.filter((t) => t.id !== id)));

const remaining = (todos: readonly Todo[]) => todos.filter((t) => !t.done).length;
