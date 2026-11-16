// suminagashi's widgets and canvas pointer handling as checked JSX cells (a proof, 2026-11-14).
// The widget state cells are copied from ports/suminagashi/cells.ts; turn, pointer, finished and reset are
// one state cell, canvasState, changed only by the pure `step`. `width` and
// `sequence` stand in for the port's cells of the same name. Everything here is checked; the DOM
// is made by lite/jsx/render.ts from the Elem values these cells return.

type Tool = "brush" | "blow" | "stylus";
type View = "lines" | "print" | "surface pressure";
type Pointer =
  | { readonly touch: number; readonly tool: Tool; readonly fluid: number; readonly x: number; readonly y: number; readonly down: boolean }
  | undefined;
type Finished = false | { readonly at: number; readonly why: string };
// Everything the pointer handlers read and write, in one state cell, so each event is one pure step.
type Canvas = { readonly turn: number; readonly pointer: Pointer; readonly finished: Finished; readonly resets: number };
type Ev =
  | { readonly kind: "down"; readonly d: PointerData; readonly tool: Tool }
  | { readonly kind: "move"; readonly d: PointerData }
  | { readonly kind: "up" }
  | { readonly kind: "empty" }
  | { readonly kind: "finish"; readonly at: number; readonly why: string };

// ---- state (from ports/suminagashi/cells.ts) ----
let tool = (): StateCell<Tool> => state<Tool>("brush");
let view = (): StateCell<View> => state<View>("lines");
let height = (): StateCell<number> => state(570);
let cellSize = (): StateCell<number> => state(1.5);
let backgroundFilm = (): StateCell<number> => state(0.1);
let runTests = (): StateCell<boolean> => state(true);
let canvasState = (): StateCell<Canvas> => state<Canvas>({ turn: 0, pointer: undefined, finished: false, resets: 0 });
// the port's turn, pointer, finished and reset, as parts of canvasState
let turn = (canvasState) => canvasState.turn;
let pointer = (canvasState) => canvasState.pointer;
let finished = (canvasState) => canvasState.finished;
let reset = (canvasState) => canvasState.resets;
let width = () => 640;
let sequence = () => [2, 0, 1];

// ---- components: plain checked functions from props to Elem ----
let Radio = () => (p: { readonly label: string; readonly options: readonly string[]; readonly selected: number; readonly onPick: Action<[number]> }): Elem => (
  <fieldset>
    <legend>{p.label}</legend>
    {p.options.map((o, i) => (
      <label>
        <input type="radio" checked={i === p.selected} onClick={action(() => p.onPick(i))} />
        {o}
      </label>
    ))}
  </fieldset>
);
let Range = () => (p: { readonly label: string; readonly min: number; readonly max: number; readonly step: number; readonly value: number; readonly onValue: Action<[number]> }): Elem => (
  <label>
    {p.label}
    <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onInput={action((s: string) => p.onValue(Number(s)))} />
    <output>{p.value}</output>
  </label>
);
let Toggle = () => (p: { readonly label: string; readonly value: boolean; readonly onValue: Action<[boolean]> }): Elem => (
  <label>
    <input type="checkbox" checked={p.value} onClick={action(() => p.onValue(!p.value))} />
    {p.label}
  </label>
);

// ---- setters: one action per widget ----
let TOOLS = (): readonly Tool[] => ["brush", "blow", "stylus"];
let VIEWS = (): readonly View[] => ["lines", "print", "surface pressure"];
let pickTool = (TOOLS, tool: State<Tool>) => action((i: number) => tool.set(TOOLS[i] ?? "brush"));
let pickView = (VIEWS, view: State<View>) => action((i: number) => view.set(VIEWS[i] ?? "lines"));
let setHeight = (height: State<number>) => action((v: number) => height.set(v));
let setCellSize = (cellSize: State<number>) => action((v: number) => cellSize.set(v));
let setBackgroundFilm = (backgroundFilm: State<number>) => action((v: number) => backgroundFilm.set(v));
let setRunTests = (runTests: State<boolean>) => action((v: boolean) => runTests.set(v));
let emptyTray = (canvasState: State<Canvas>, step) => action(() => canvasState.update((s) => step(s, { kind: "empty" })));

// ---- the eight *_view cells of ports/suminagashi/shell.ts, minus params_view ----
let tool_view = (Radio, TOOLS, tool, pickTool) => <Radio label="tool" options={TOOLS} selected={TOOLS.indexOf(tool)} onPick={pickTool} />;
let view_view = (Radio, VIEWS, view, pickView) => <Radio label="view" options={VIEWS} selected={VIEWS.indexOf(view)} onPick={pickView} />;
let height_view = (Range, height, setHeight) => <Range label="height" min={100} max={1000} step={1} value={height} onValue={setHeight} />;
let cellSize_view = (Range, cellSize, setCellSize) => <Range label="grid cell size (px)" min={1} max={4} step={0.25} value={cellSize} onValue={setCellSize} />;
let backgroundFilm_view = (Range, backgroundFilm, setBackgroundFilm) => (
  <Range label="film already on the water" min={0.02} max={1} step={0.01} value={backgroundFilm} onValue={setBackgroundFilm} />
);
let runTests_view = (Toggle, runTests, setRunTests) => <Toggle label="run the tests" value={runTests} onValue={setRunTests} />;
let reset_view = (emptyTray) => <button onClick={emptyTray}>empty the tray</button>;

// ---- pointer handling: one pure step per event ----
// The step gets the committed state when the runtime applies it, so events that arrive before a
// recompute still see each other's writes. The 2 s guard reads the event's own timestamp, so the
// step needs no clock. `tool` is a separate widget state cell; the handler reads it when it is called.
let step = (sequence) => (s: Canvas, e: Ev): Canvas => {
  if (e.kind === "empty") return { turn: 0, pointer: undefined, finished: false, resets: s.resets + 1 };
  if (e.kind === "finish") return { ...s, finished: { at: e.at, why: e.why } };
  if (e.kind === "up") return s.pointer ? { ...s, pointer: { ...s.pointer, down: false } } : s;
  if (e.kind === "move") return s.pointer && s.pointer.down ? { ...s, pointer: { ...s.pointer, x: e.d.x, y: e.d.y } } : s;
  if (s.finished) return e.d.t - s.finished.at > 2000 ? { turn: 0, pointer: undefined, finished: false, resets: s.resets + 1 } : s;
  const turn = e.tool === "brush" ? s.turn + 1 : s.turn;
  const fluid = sequence[(turn - 1 + sequence.length) % sequence.length] ?? 0;
  return { ...s, turn, pointer: { touch: e.d.t, tool: e.tool, fluid, x: e.d.x, y: e.d.y, down: true } };
};
let pointerDown = (tool: State<Tool>, step, canvasState: State<Canvas>) =>
  action((d: PointerData) => canvasState.update((s) => step(s, { kind: "down", d, tool: read(tool) })));
let pointerMove = (step, canvasState: State<Canvas>) => action((d: PointerData) => canvasState.update((s) => step(s, { kind: "move", d })));
let pointerUp = (step, canvasState: State<Canvas>) => action((d: PointerData) => canvasState.update((s) => step(s, { kind: "up" })));
// mainLoop's `finished = { at, why }` (the loop is not part of this fixture)
let finishPicture = (step, canvasState: State<Canvas>) =>
  action((at: number, why: string) => canvasState.update((s) => step(s, { kind: "finish", at, why })));
let canvas_view = (width, height, pointerDown, pointerMove, pointerUp) => (
  <canvas
    width={width}
    height={height}
    style={`border: solid; width: ${width}px; height: ${height}px; touch-action: none`}
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerUp}
    onPointerCancel={pointerUp}
  />
);

let app = (tool_view, view_view, height_view, cellSize_view, backgroundFilm_view, runTests_view, reset_view, canvas_view) => (
  <div>
    {tool_view}
    {view_view}
    {reset_view}
    {canvas_view}
    {height_view}
    {cellSize_view}
    {backgroundFilm_view}
    {runTests_view}
  </div>
);

// The step is a pure function, so the event logic is tested without a DOM or a runtime.
let s0 = (): Canvas => ({ turn: 0, pointer: undefined, finished: false, resets: 0 });
let test_two_downs_take_two_turns = (step, s0) => {
  const d = { x: 1, y: 2, t: 10, id: 1, buttons: 1 };
  const s = step(step(s0, { kind: "down", d, tool: "brush" }), { kind: "down", d, tool: "brush" });
  if (s.turn !== 2) throw new Error(`turn ${s.turn}`);
  return s.turn;
};
let test_finished_waits_two_seconds = (step, s0) => {
  const done = step(s0, { kind: "finish", at: 1000, why: "test" });
  const early = step(done, { kind: "down", d: { x: 0, y: 0, t: 2500, id: 1, buttons: 1 }, tool: "brush" });
  const late = step(done, { kind: "down", d: { x: 0, y: 0, t: 3500, id: 1, buttons: 1 }, tool: "brush" });
  if (!early.finished || early.resets !== 0) throw new Error("emptied before 2 s");
  if (late.finished || late.resets !== 1) throw new Error("not emptied after 2 s");
  return "ok";
};

// An element is a value, so a checked test can read it without a DOM.
let test_canvas_is_a_canvas = (canvas_view) => {
  if (canvas_view.tag !== "canvas") throw new Error(`expected a canvas, got ${canvas_view.tag}`);
  return canvas_view.tag;
};
