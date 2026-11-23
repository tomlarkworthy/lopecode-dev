type Todo = { id: number; text: string; done: boolean };
const todos = (): StateCell<Todo[]> => state<Todo[]>([]);
const nextId = (): StateCell<number> => state(1);
const addTodo = (todos: State<Todo[]>, nextId: State<number>) =>
  action((text: string) => {
    const id = read(nextId);
    todos.update((ts) => [...ts, { id, text, done: false }]);
    nextId.set(id + 1);
  });
const toggleTodo = (todos: State<Todo[]>) =>
  action((id: number) => todos.update((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))));
const removeTodo = (todos: State<Todo[]>) => action((id: number) => todos.update((ts) => ts.filter((t) => t.id !== id)));
const remaining = (todos: Todo[]) => todos.filter((t) => !t.done).length;
