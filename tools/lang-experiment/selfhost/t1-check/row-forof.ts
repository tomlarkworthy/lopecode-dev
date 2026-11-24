const S = `type Item = { id: number };\nconst items = (): StateCell<Item[]> => state([{ id: 1 }, { id: 2 }]);\nconst remove = (items: State<Item[]>) => action((id: number) => items.update((xs) => xs.filter((x) => x.id !== id)));\n`;
export const srcs: [string, string][] = [
  ["map-state", S + `const view = (items: Item[], remove: Action<[number]>) => <div>{items.map((it) => <button onClick={action(() => remove(it.id))}>x</button>)}</div>;`],
  ["forof-state", S + `const view = (items: Item[], remove: Action<[number]>) => { const out: Elem[] = []; for (const it of items) out.push(<button onClick={action(() => remove(it.id))}>x</button>); return <div>{out}</div>; };`],
  ["forof-state-index", S + `const view = (items: Item[], remove: Action<[number]>) => { const out: Elem[] = []; for (let i = 0; i < items.length; i++) { const it = items[i]; if (it === undefined) continue; out.push(<button onClick={action(() => remove(it.id))}>x</button>); } return <div>{out}</div>; };`],
  ["forof-plain", `const remove = () => action((id: number) => {});\nconst view = (remove: Action<[number]>) => { const out: Elem[] = []; for (const id of [1, 2, 3]) out.push(<button onClick={action(() => remove(id))}>x</button>); return <div>{out}</div>; };`],
  ["while-state", S + `const view = (items: Item[], remove: Action<[number]>) => { const out: Elem[] = []; const first = items[0]; if (first !== undefined) { const id = first.id; out.push(<button onClick={action(() => remove(id))}>x</button>); } return <div>{out}</div>; };`],
];
