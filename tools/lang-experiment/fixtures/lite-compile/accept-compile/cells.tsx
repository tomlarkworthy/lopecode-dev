// The island: ordinary cells. Here on the main thread they compute one row (y0 = 0, y1 = 1).
const width = () => 640;
const height = () => 420;
const maxIter = (): RefCell<number> => ref(600);
const y0 = () => 0;
const y1 = () => 1;

// Escape-time Mandelbrot for rows y0 up to y1, four bytes (RGBA) per pixel. The smooth
// iteration count goes through a cosine palette, dark indigo far out through steel blue to gold near the set; points that never escape are black.
const rows = (width: number, height: number, maxIter: number, y0: number, y1: number) => {
  const out = mut(new Uint8ClampedArray((y1 - y0) * width * 4));
  for (let y = y0; y < y1; y++) {
    const ci = (y - height / 2) * (3.5 / width);
    for (let x = 0; x < width; x++) {
      const cr = (x / width) * 3.5 - 2.5;
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
  return freeze(out);
};

// compile turns the island into an ordinary async function. inputs become its argument, refs are
// read from the graph whenever they change (a new function each time), outputs are its result.
const inPool = (compile: Compile, pool: Pool) =>
  compile({ inputs: ["y0", "y1"], refs: ["width", "height", "maxIter"], outputs: ["rows"], options: { runtime: pool } });
// The same island, run on the main thread, for comparison.
const onMain = (compile: Compile) =>
  compile({ inputs: ["y0", "y1"], refs: ["width", "height", "maxIter"], outputs: ["rows"] });

// Four bands of rows per worker; the pool runs the calls in parallel.
const poolSize = (pool: Pool) => pool.size;
const bands = (height: number, poolSize: number) => {
  const n = poolSize * 4;
  return Array.from({ length: n }, (_, i) => ({ y0: Math.floor((i * height) / n), y1: Math.floor(((i + 1) * height) / n) }));
};

const image = async (inPool, bands, width: number, height: number) => {
  const parts = await Promise.all(bands.map((b) => inPool(b)));
  const out = mut(new Uint8ClampedArray(width * height * 4));
  let at = 0;
  for (const p of parts) {
    out.set(p.rows, at);
    at += p.rows.length;
  }
  return freeze(out);
};

const setMaxIter = (maxIter: Ref<number>) => action((s: string) => maxIter.set(Number(s)));
const app = (maxIter: number, setMaxIter: Action<[string]>) => (
  <label>
    iterations <input type="range" min={50} max={3000} step={50} value={maxIter} onInput={setMaxIter} /> <output>{maxIter}</output>
  </label>
);
