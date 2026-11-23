type Load = { status: "loading" } | { status: "error"; message: string } | { status: "done"; rows: string[] };
const load = (): StateCell<Load> => state<Load>({ status: "loading" });
const finish = (load: State<Load>) => action(() => load.set({ status: "done", rows: ["a", "b"] }));
const fail = (load: State<Load>) => action(() => load.set({ status: "error", message: "timeout" }));
const statusView = (load: Load) => {
  if (load.status === "loading") return <p>loading…</p>;
  if (load.status === "error") return <p class="err">failed: {load.message}</p>;
  return (
    <div>
      {load.rows.length === 0 && <p>no rows</p>}
      {load.rows.map((r) => <span key={r}>{r}</span>)}
    </div>
  );
};
