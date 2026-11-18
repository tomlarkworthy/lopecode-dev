// The SoundScript half of the Part 4 slice: pick a cell, see its source, save an edit back.
// Outside (Observable JavaScript) cells it reads: cell_list, cell_source, save_result (data);
// viewof draft (the CodeMirror wrapper, a view) and viewof save_request (a view) taken as State.
type CellRow = { pid: string; name: string };
type CellSource = { pid: string; source: string };
type SaveRequest = { pid: string; source: string; seq: number };
type SaveResult = { seq: number; ok: boolean; message: string };

const selected = () => state("");
const seq = () => state(0);
const select = (selected: State<string>) => action((pid: string) => selected.set(pid));
const save = (selected: State<string>, seq: State<number>, draft: State<string>, save_request: State<SaveRequest>) =>
  action(() => {
    const n = read(seq) + 1;
    seq.set(n);
    save_request.set({ pid: read(selected), source: read(draft), seq: n });
  });
const status = (seq: number, save_result: SaveResult) =>
  save_result.seq !== seq ? "saving" : save_result.ok ? "saved" : `not saved: ${save_result.message}`;
const picker = (cell_list: CellRow[], selected: string, select) => (
  <fieldset>
    <legend>cells</legend>
    {cell_list.map((c) => (
      <label key={c.pid}>
        <input type="radio" name="cell" value={c.pid} checked={c.pid === selected} onInput={select} />
        {c.name}
      </label>
    ))}
  </fieldset>
);
const header = (cell_source: CellSource, status: string, save) => (
  <div class="e5-header">
    <span>{cell_source.pid}</span>
    <button onClick={save}>save</button>
    <output>{status}</output>
  </div>
);
// the per-row action a button list would need instead of a radio input
const pickerButtons = (cell_list: CellRow[], selected: State<string>) => (
  <div>{cell_list.map((c) => <button key={c.pid} onClick={action(() => selected.set(c.pid))}>{c.name}</button>)}</div>
);
// the editor's own text box, were it JSX
const box = (cell_source: CellSource) => <div><textarea value={cell_source.source} /></div>;
