import { callN, toSrcs, type Cand } from "./h.ts";
const ITEMS = `type Item = { readonly id: number; readonly label: string };
const items = (): StateCell<readonly Item[]> => state<readonly Item[]>([{ id: 1, label: "a" }, { id: 2, label: "b" }, { id: 3, label: "c" }]);\n`;
const DATA = `type Item = { readonly id: number; readonly label: string };
const initialItems = () => (): readonly Item[] => [{ id: 1, label: "a" }, { id: 2, label: "b" }, { id: 3, label: "c" }];
const items = (initialItems: () => readonly Item[]): StateCell<readonly Item[]> => state<readonly Item[]>(initialItems());\n`;
const DATA2 = `type Item = { readonly id: number; readonly label: string };
const initialItems = (): readonly Item[] => [{ id: 1, label: "a" }, { id: 2, label: "b" }, { id: 3, label: "c" }];
const items = (initialItems: readonly Item[]): StateCell<readonly Item[]> => state<readonly Item[]>(initialItems);\n`;
export const cands: Cand[] = [
  { name: "reject-action-per-row-over-state", src: ITEMS + `const remove = (items: State<readonly Item[]>) => action((id: number) => items.update((xs) => xs.filter((x) => x.id !== id)));
const view = (items: readonly Item[], remove: Action<[number]>) => <div>{items.map((it) => <button key={it.id} onClick={action(() => remove(it.id))}>x</button>)}</div>;` },
  { name: "accept-input-onInput-row-id", src: ITEMS + `const remove = (items: State<readonly Item[]>) => action((id: string) => items.update((xs) => xs.filter((x) => String(x.id) !== id)));
const view = (items: readonly Item[], remove: Action<[string]>) => <div>{items.map((it) => <label key={it.id}>{it.label}<input type="checkbox" value={String(it.id)} onInput={remove} /></label>)}</div>;`,
    drive: callN((p) => p.value("remove"), 1, ["items"], ["2"]) },
  { name: "reject-actions-mapped-over-data-cell", src: DATA2 + `const removers = (initialItems: readonly Item[], items: State<readonly Item[]>) => initialItems.map((it) => ({ id: it.id, remove: action(() => items.update((xs) => xs.filter((x) => x.id !== it.id))) }));
const view = (items: readonly Item[], removers: readonly { readonly id: number; readonly remove: Action<[]> }[]) => <div>{items.map((it) => { const r = removers.find((x) => x.id === it.id); return r === undefined ? <span key={it.id}>{it.label}</span> : <button key={it.id} onClick={r.remove}>{it.label}</button>; })}</div>;`,
    drive: callN((p) => p.value("removers")?.[1]?.remove, 1, ["items"]) },
  { name: "reject-action-in-view-map-over-data", src: DATA2 + `const view = (initialItems: readonly Item[], items: State<readonly Item[]>) => <div>{initialItems.map((it) => <button key={it.id} onClick={action(() => items.update((xs) => xs.filter((x) => x.id !== it.id)))}>{it.label}</button>)}</div>;` },
  { name: "reject-action-factory-function", src: ITEMS + `const removeOf = (items: State<readonly Item[]>) => (id: number) => action(() => items.update((xs) => xs.filter((x) => x.id !== id)));
const view = (items: readonly Item[], removeOf: (id: number) => Action<[]>) => <div>{items.map((it) => <button key={it.id} onClick={removeOf(it.id)}>x</button>)}</div>;` },
  { name: "reject-map-index-slots", src: ITEMS + `const removeAt = (items: State<readonly Item[]>) => [0, 1, 2].map((i) => action(() => items.update((xs) => xs.filter((_, j) => j !== i))));
const view = (items: readonly Item[], removeAt: readonly Action<[]>[]) => <div>{items.map((it, i) => { const r = removeAt[i]; return r === undefined ? <span key={it.id}>{it.label}</span> : <button key={it.id} onClick={r}>{it.label}</button>; })}</div>;`,
    drive: callN((p) => p.value("removeAt")?.[0], 2, ["items"]) },
  { name: "reject-const-from-map-param", src: DATA2 + `const removers = (initialItems: readonly Item[], items: State<readonly Item[]>) => initialItems.map((it) => { const id = it.id; return action(() => items.update((xs) => xs.filter((x) => x.id !== id))); });` },
  { name: "accept-for-of-loop-over-data-cell", src: DATA2 + `type Row = { readonly id: number; readonly remove: Action<[]> };
const removers = (initialItems: readonly Item[], items: State<readonly Item[]>): readonly Row[] => {
  const out: Row[] = [];
  for (const it of initialItems) out.push({ id: it.id, remove: action(() => items.update((xs) => xs.filter((x) => x.id !== it.id))) });
  return out;
};
const view = (items: readonly Item[], removers: readonly Row[]) => <div>{items.map((it) => { const r = removers.find((x) => x.id === it.id); return r === undefined ? <span key={it.id}>{it.label}</span> : <button key={it.id} onClick={r.remove}>{it.label}</button>; })}</div>;`,
    drive: callN((p) => p.value("removers")?.[1]?.remove, 1, ["items"]) },
  { name: "reject-for-of-loop-over-state-value", src: ITEMS + `type Row = { readonly id: number; readonly remove: Action<[]> };
const remove = (items: State<readonly Item[]>) => action((id: number) => items.update((xs) => xs.filter((x) => x.id !== id)));
const removers = (items: readonly Item[], remove: Action<[number]>): readonly Row[] => {
  const out: Row[] = [];
  for (const it of items) out.push({ id: it.id, remove: action(() => remove(it.id)) });
  return out;
};` },
  { name: "accept-for-of-position-slots-over-state", src: ITEMS + `const removeAt = (items: State<readonly Item[]>): readonly Action<[]>[] => {
  const out: Action<[]>[] = [];
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) out.push(action(() => items.update((xs) => xs.toSpliced(i, 1))));
  return out;
};
const view = (items: readonly Item[], removeAt: readonly Action<[]>[]) => <div>{items.map((it, i) => { const r = removeAt[i]; return r === undefined ? <span key={it.id}>{it.label}</span> : <button key={it.id} onClick={r}>{it.label}</button>; })}</div>;`,
    drive: callN((p) => p.value("removeAt")?.[0], 2, ["items"]) },
  { name: "accept-inline-action-in-view", src: ITEMS + `const view = (items: State<readonly Item[]>) => <button onClick={action(() => items.update((xs) => xs.slice(1)))}>drop first</button>;` },
];
export const srcs = toSrcs(cands);
