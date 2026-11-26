// The island: ordinary cells. Here on the main thread they compute one row (y0 = 0, y1 = 1).
const width = () => 640;
const height = () => 420;
const maxIter = (): StateCell<number> => state(600);
const y0 = () => 0;
const y1 = () => 1;

// The view: the point of the plane at the centre of the picture, and the width of the plane that the picture shows.
type View = { readonly cx: number; readonly cy: number; readonly span: number };
const home = () => (): View => ({ cx: -0.75, cy: 0, span: 3.5 });
const view = (home: () => View): StateCell<View> => state<View>(home());

// Escape-time Mandelbrot for rows y0 up to y1, four bytes (RGBA) per pixel. The smooth
// iteration count goes through a cosine palette, dark indigo far out through steel blue to gold near the set; points that never escape are black.
const rows = (width: number, height: number, maxIter: number, view: View, y0: number, y1: number) => {
  const out = new Uint8ClampedArray((y1 - y0) * width * 4);
  const scale = view.span / width;
  for (let y = y0; y < y1; y++) {
    const ci = view.cy + (y - height / 2) * scale;
    for (let x = 0; x < width; x++) {
      const cr = view.cx + (x - width / 2) * scale;
      let zr = 0, zi = 0, i = 0;
      while (i < maxIter && zr * zr + zi * zi < 256) {
        const t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        i++;
      }
      const at = ((y - y0) * width + x) * 4;
      out[at + 3] = 255;
      if (i < maxIter) {
        const nu = i + 1 - Math.log2(Math.log2(zr * zr + zi * zi) / 2);
        const t = Math.sqrt(nu / 64);
        out[at] = 255 * (0.5 + 0.45 * Math.cos(6.2832 * (t + 0.2)));
        out[at + 1] = 255 * (0.45 + 0.38 * Math.cos(6.2832 * (t + 0.3)));
        out[at + 2] = 255 * (0.4 + 0.25 * Math.cos(6.2832 * (t + 0.5)));
      }
    }
  }
  return out;
};

// compile turns the island into an ordinary async function. inputs become its argument, refs are
// read from the graph whenever they change (a new function each time), outputs are its result.
const inPool = (compile: Compile, pool: Pool) =>
  compile({ inputs: ["y0", "y1"], refs: ["width", "height", "maxIter", "view"], outputs: ["rows"], options: { runtime: pool } });
// The same island, run on the main thread, for comparison.
const onMain = (compile: Compile) =>
  compile({ inputs: ["y0", "y1"], refs: ["width", "height", "maxIter", "view"], outputs: ["rows"] });

// Four bands of rows per worker; the pool runs the calls in parallel.
const poolSize = (pool: Pool) => pool.size;
const bands = (height: number, poolSize: number) => {
  const n = poolSize * 4;
  return Array.from({ length: n }, (_, i) => ({ y0: Math.floor((i * height) / n), y1: Math.floor(((i + 1) * height) / n) }));
};

const image = async (inPool, bands, width: number, height: number) => {
  const parts = await Promise.all(bands.map((b) => inPool(b)));
  const out = new Uint8ClampedArray(width * height * 4);
  let at = 0;
  for (const p of parts) {
    out.set(p.rows, at);
    at += p.rows.length;
  }
  return out;
};

const setMaxIter = (maxIter: State<number>) => action((s: string) => maxIter.set(Number(s)));

// A click on the picture zooms in two times; the point clicked becomes the centre. x and y are canvas pixels.
const zoomIn = (view: State<View>, width: number, height: number) =>
  action((p: PointerData) => view.update((v) => ({ cx: v.cx + (p.x - width / 2) * (v.span / width), cy: v.cy + (p.y - height / 2) * (v.span / width), span: v.span / 2 })));
const zoomOut = (view: State<View>) => action(() => view.update((v) => ({ ...v, span: v.span * 2 })));
const reset = (view: State<View>, home: () => View) => action(() => view.set(home()));

// The picture is drawn by the page; this transparent canvas lies on it and takes the clicks.
const clicks = (width: number, height: number, zoomIn: Action<[PointerData]>) => (
  <canvas width={width} height={height} style="position:absolute;left:0;top:0;width:100%;height:100%;cursor:zoom-in" onPointerDown={zoomIn} />
);
const app = (maxIter: number, view: View, setMaxIter: Action<[string]>, zoomOut: Action<[]>, reset: Action<[]>) => (
  <div>
    <label>
      iterations <input type="range" min={50} max={3000} step={50} value={maxIter} onInput={setMaxIter} /> <output>{maxIter}</output>
    </label>{" "}
    <button onClick={zoomOut}>zoom out</button> <button onClick={reset}>reset</button>{" "}
    <output>{`zoom ${3.5 / view.span}×, centre ${view.cx.toFixed(8)} ${view.cy < 0 ? "−" : "+"} ${Math.abs(view.cy).toFixed(8)}i`}</output>
  </div>
);
