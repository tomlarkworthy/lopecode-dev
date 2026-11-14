// suminagashi's widgets and canvas pointer handling as checked JSX cells (a proof, 2026-11-14).
// The widget refs are copied from ports/suminagashi/cells.ts; turn, pointer, finished and reset are
// one ref, canvasState, changed only by the pure `step`. `width` and
// `sequence` stand in for the port's cells of the same name. Everything here is checked; the DOM
// is made by lite/jsx/render.ts from the Elem values these cells return.

type Tool = "brush" | "blow" | "stylus";
type View = "lines" | "print" | "surface pressure";
type Pointer =
  | { readonly touch: number; readonly tool: Tool; readonly fluid: number; readonly x: number; readonly y: number; readonly down: boolean }
  | undefined;
type Finished = false | { readonly at: number; readonly why: string };
// Everything the pointer handlers read and write, in one ref, so each event is one pure step.
type Canvas = { readonly turn: number; readonly pointer: Pointer; readonly finished: Finished; readonly resets: number };
type Ev =
  | { readonly kind: "down"; readonly d: PointerData; readonly tool: Tool }
  | { readonly kind: "move"; readonly d: PointerData }
  | { readonly kind: "up" }
  | { readonly kind: "empty" }
  | { readonly kind: "finish"; readonly at: number; readonly why: string };

// ---- state (from ports/suminagashi/cells.ts) ----
export let tool = (): RefCell<Tool> => ref<Tool>("brush");
export let view = (): RefCell<View> => ref<View>("lines");
export let height = (): RefCell<number> => ref(570);
export let cellSize = (): RefCell<number> => ref(1.5);
export let backgroundFilm = (): RefCell<number> => ref(0.1);
export let runTests = (): RefCell<boolean> => ref(true);
export let canvasState = (): RefCell<Canvas> => ref<Canvas>({ turn: 0, pointer: undefined, finished: false, resets: 0 });
// the port's turn, pointer, finished and reset, as parts of canvasState
export let turn = (canvasState) => canvasState.turn;
export let pointer = (canvasState) => canvasState.pointer;
export let finished = (canvasState) => canvasState.finished;
export let reset = (canvasState) => canvasState.resets;
export let width = () => 640;
export let sequence = () => [2, 0, 1];

// ---- components: plain checked functions from props to Elem ----
export let Radio = () => (p: { readonly label: string; readonly options: readonly string[]; readonly selected: number; readonly onPick: Action<[number]> }): Elem => (
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
export let Range = () => (p: { readonly label: string; readonly min: number; readonly max: number; readonly step: number; readonly value: number; readonly onValue: Action<[number]> }): Elem => (
  <label>
    {p.label}
    <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onInput={action((s: string) => p.onValue(Number(s)))} />
    <output>{p.value}</output>
  </label>
);
export let Toggle = () => (p: { readonly label: string; readonly value: boolean; readonly onValue: Action<[boolean]> }): Elem => (
  <label>
    <input type="checkbox" checked={p.value} onClick={action(() => p.onValue(!p.value))} />
    {p.label}
  </label>
);

// ---- setters: one action per widget ----
export let TOOLS = (): readonly Tool[] => ["brush", "blow", "stylus"];
export let VIEWS = (): readonly View[] => ["lines", "print", "surface pressure"];
export let pickTool = (TOOLS, tool: Ref<Tool>) => action((i: number) => tool.set(TOOLS[i] ?? "brush"));
export let pickView = (VIEWS, view: Ref<View>) => action((i: number) => view.set(VIEWS[i] ?? "lines"));
export let setHeight = (height: Ref<number>) => action((v: number) => height.set(v));
export let setCellSize = (cellSize: Ref<number>) => action((v: number) => cellSize.set(v));
export let setBackgroundFilm = (backgroundFilm: Ref<number>) => action((v: number) => backgroundFilm.set(v));
export let setRunTests = (runTests: Ref<boolean>) => action((v: boolean) => runTests.set(v));
export let emptyTray = (canvasState: Ref<Canvas>, step) => action(() => canvasState.update((s) => step(s, { kind: "empty" })));

// ---- the eight *_view cells of ports/suminagashi/shell.ts, minus params_view ----
export let tool_view = (Radio, TOOLS, tool, pickTool) => <Radio label="tool" options={TOOLS} selected={TOOLS.indexOf(tool)} onPick={pickTool} />;
export let view_view = (Radio, VIEWS, view, pickView) => <Radio label="view" options={VIEWS} selected={VIEWS.indexOf(view)} onPick={pickView} />;
export let height_view = (Range, height, setHeight) => <Range label="height" min={100} max={1000} step={1} value={height} onValue={setHeight} />;
export let cellSize_view = (Range, cellSize, setCellSize) => <Range label="grid cell size (px)" min={1} max={4} step={0.25} value={cellSize} onValue={setCellSize} />;
export let backgroundFilm_view = (Range, backgroundFilm, setBackgroundFilm) => (
  <Range label="film already on the water" min={0.02} max={1} step={0.01} value={backgroundFilm} onValue={setBackgroundFilm} />
);
export let runTests_view = (Toggle, runTests, setRunTests) => <Toggle label="run the tests" value={runTests} onValue={setRunTests} />;
export let reset_view = (emptyTray) => <button onClick={emptyTray}>empty the tray</button>;

// ---- pointer handling: one pure step per event ----
// The step gets the committed state when the runtime applies it, so events that arrive before a
// recompute still see each other's writes. The 2 s guard reads the event's own timestamp, so the
// step needs no clock. `tool` is a separate widget ref; the handler depends on its value.
export let step = (sequence) => (s: Canvas, e: Ev): Canvas => {
  if (e.kind === "empty") return { turn: 0, pointer: undefined, finished: false, resets: s.resets + 1 };
  if (e.kind === "finish") return { ...s, finished: { at: e.at, why: e.why } };
  if (e.kind === "up") return s.pointer ? { ...s, pointer: { ...s.pointer, down: false } } : s;
  if (e.kind === "move") return s.pointer && s.pointer.down ? { ...s, pointer: { ...s.pointer, x: e.d.x, y: e.d.y } } : s;
  if (s.finished) return e.d.t - s.finished.at > 2000 ? { turn: 0, pointer: undefined, finished: false, resets: s.resets + 1 } : s;
  const turn = e.tool === "brush" ? s.turn + 1 : s.turn;
  const fluid = sequence[(turn - 1 + sequence.length) % sequence.length] ?? 0;
  return { ...s, turn, pointer: { touch: e.d.t, tool: e.tool, fluid, x: e.d.x, y: e.d.y, down: true } };
};
export let pointerDown = (tool, step, canvasState: Ref<Canvas>) =>
  action((d: PointerData) => canvasState.update((s) => step(s, { kind: "down", d, tool })));
export let pointerMove = (step, canvasState: Ref<Canvas>) => action((d: PointerData) => canvasState.update((s) => step(s, { kind: "move", d })));
export let pointerUp = (step, canvasState: Ref<Canvas>) => action((d: PointerData) => canvasState.update((s) => step(s, { kind: "up" })));
// mainLoop's `finished = { at, why }` (the loop is not part of this fixture)
export let finishPicture = (step, canvasState: Ref<Canvas>) =>
  action((at: number, why: string) => canvasState.update((s) => step(s, { kind: "finish", at, why })));
export let canvas_view = (width, height, pointerDown, pointerMove, pointerUp) => (
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

export let app = (tool_view, view_view, height_view, cellSize_view, backgroundFilm_view, runTests_view, reset_view, canvas_view) => (
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
export let s0 = (): Canvas => ({ turn: 0, pointer: undefined, finished: false, resets: 0 });
export let test_two_downs_take_two_turns = (step, s0) => {
  const d = { x: 1, y: 2, t: 10, id: 1, buttons: 1 };
  const s = step(step(s0, { kind: "down", d, tool: "brush" }), { kind: "down", d, tool: "brush" });
  if (s.turn !== 2) throw new Error(`turn ${s.turn}`);
  return s.turn;
};
export let test_finished_waits_two_seconds = (step, s0) => {
  const done = step(s0, { kind: "finish", at: 1000, why: "test" });
  const early = step(done, { kind: "down", d: { x: 0, y: 0, t: 2500, id: 1, buttons: 1 }, tool: "brush" });
  const late = step(done, { kind: "down", d: { x: 0, y: 0, t: 3500, id: 1, buttons: 1 }, tool: "brush" });
  if (!early.finished || early.resets !== 0) throw new Error("emptied before 2 s");
  if (late.finished || late.resets !== 1) throw new Error("not emptied after 2 s");
  return "ok";
};

// An element is a value, so a checked test can read it without a DOM.
export let test_canvas_is_a_canvas = (canvas_view) => {
  if (canvas_view.tag !== "canvas") throw new Error(`expected a canvas, got ${canvas_view.tag}`);
  return canvas_view.tag;
};
