type Load =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "done"; readonly rows: readonly string[] };

const load = (): StateCell<Load> => state<Load>({ kind: "loading" });

const finish = (load: State<Load>) => action(() => load.set({ kind: "done", rows: ["a", "b"] }));
const fail = (load: State<Load>) => action(() => load.set({ kind: "error", message: "timeout" }));

const statusView = (load: Load) => {
  if (load.kind === "loading") return <p>loading…</p>;
  if (load.kind === "error") return <p>{"failed: " + load.message}</p>;
  return <div>{load.rows.length === 0 ? <p>no rows</p> : load.rows.map((r) => <span key={r}>{r}</span>)}</div>;
};
