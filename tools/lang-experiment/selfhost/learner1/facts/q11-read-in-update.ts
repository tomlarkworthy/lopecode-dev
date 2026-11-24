import { callN, toSrcs, type Cand } from "./h.ts";
const T = `type Todo = { readonly id: number; readonly text: string };
const todos = (): StateCell<readonly Todo[]> => state<readonly Todo[]>([]);
const nextId = (): StateCell<number> => state(1);
const draft = (): StateCell<string> => state("milk");\n`;
export const cands: Cand[] = [
  { name: "accept-read-value-used-in-update", src: T + `const add = (todos: State<readonly Todo[]>, nextId: State<number>, draft: State<string>) => action(() => {
  const id = read(nextId);
  const text = read(draft);
  if (text === "") return;
  todos.update((xs) => [...xs, { id, text }]);
  nextId.set(id + 1);
});`, drive: callN((p) => p.value("add"), 3, ["todos", "nextId"]) },
  { name: "reject-value-param-used-in-update", src: T + `const add = (todos: State<readonly Todo[]>, nextId: number) => action(() => todos.update((xs) => [...xs, { id: nextId, text: "x" }]));` },
  { name: "accept-read-sees-earlier-write-same-call", src: T + `const twice = (nextId: State<number>, todos: State<readonly Todo[]>) => action(() => {
  nextId.update((n) => n + 1);
  const id = read(nextId);
  todos.update((xs) => [...xs, { id, text: "t" }]);
});`, drive: callN((p) => p.value("twice"), 1, ["todos", "nextId"]) },
];
export const srcs = toSrcs(cands);
