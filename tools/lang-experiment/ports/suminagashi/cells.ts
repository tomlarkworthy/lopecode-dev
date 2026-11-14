// Port of @tomlarkworthy/suminagashi: the checked cells. See MAP.md for the cell-by-cell mapping.
// The 16 shader strings at the end of this file were extracted mechanically from the original.

type Fluid = { readonly name: string; readonly color: string | null; readonly pressure: number };
type Tool = "brush" | "blow" | "stylus";
type View = "lines" | "print" | "surface pressure";
type Pointer =
  | {
      readonly touch: number;
      readonly tool: Tool;
      readonly fluid: number;
      readonly x: number;
      readonly y: number;
      readonly down: boolean;
    }
  | undefined;
type Finished = false | { readonly at: number; readonly why: string };

type Color = readonly number[];
type Curve = { readonly color: Color; readonly outline: boolean; readonly n: number; readonly xy: Float32Array };
type Drop = { readonly x: number; readonly y: number; readonly radius: number; readonly color: Color; readonly outline?: boolean };
type Packed = { readonly packed: Float32Array; readonly n: number; readonly box: readonly [number, number, number, number] };
// The original is an object mutated in place. Here every method that changed it returns the next
// value. `lineage` is the same object in every value derived from one createContours call, so the
// shell can key GPU state by it.
type Contours = {
  readonly width: number;
  readonly height: number;
  readonly spacing: number;
  readonly version: number;
  readonly curves: readonly Curve[];
  readonly lineage: object;
  count(): number;
  birth(drop: Drop): Contours;
  advect(velocity: Float32Array, dt: number): Contours;
  resample(k?: number): Contours;
  pack(k: number): Packed;
  unpack(k: number, packed: Float32Array): Contours;
  area(k: number): number;
};

// ---- inputs (viewof) as refs; the widgets are *_view cells in shell.ts ----

export let tool = (): RefCell<Tool> => ref<Tool>("brush");
export let reset = (): RefCell<number> => ref(0);
export let view = (): RefCell<View> => ref<View>("lines");
export let params = (defaults): RefCell<typeof defaults> => ref(defaults);
export let height = (): RefCell<number> => ref(570);
export let cellSize = (): RefCell<number> => ref(1.5);
export let backgroundFilm = (): RefCell<number> => ref(0.1);
// The original toggle starts false and every test returns "not run" until it is switched on. The
// baseline forced it true; this harness has no per-run override, so the port starts it true.
export let runTests = (): RefCell<boolean> => ref(true);

// ---- mutables as refs; every write is an action ----

export let turn = (): RefCell<number> => ref(0);
export let finished = (): RefCell<Finished> => ref<Finished>(false);
export let pointer = (): RefCell<Pointer> => ref<Pointer>(undefined);

// canvas pointerdown: `if (tool === "brush") turn++; pointer = {...}`
export let pointerDown = (turn: Ref<number>, pointer: Ref<Pointer>) =>
  action((next: Pointer, rotate: boolean) => {
    if (rotate) turn.update((t) => t + 1);
    pointer.set(next);
  });
// canvas pointermove: `if (pointer && pointer.down) pointer = { ...pointer, x, y }`
export let pointerMove = (pointer: Ref<Pointer>) =>
  action((x: number, y: number) => pointer.update((p) => (p && p.down ? { ...p, x, y } : p)));
// canvas pointerup / pointercancel: `if (pointer) pointer = { ...pointer, down: false }`
export let pointerUp = (pointer: Ref<Pointer>) => action(() => pointer.update((p) => (p ? { ...p, down: false } : p)));
// tray: `finished = false; turn = 0` (an empty tray is a new picture)
export let resetPicture = (finished: Ref<Finished>, turn: Ref<number>) =>
  action(() => {
    finished.set(false);
    turn.set(0);
  });
// mainLoop: `finished = { at, why }`
export let finishPicture = (finished: Ref<Finished>) => action((at: number, why: string) => finished.set({ at, why }));

// ---- data ----

export let fluids = (): readonly Fluid[] => [
  // pressure: surface pressure held at the brush tip. Film leaves the brush
  // only while the surface around it is at a lower pressure.
  // The film is two textures of four channels, so eight fluids is the limit.
  { name: "sumi", color: "#1d1b26", pressure: 5 },
  { name: "indigo", color: "#2a4f9c", pressure: 5 },
  { name: "vermilion", color: "#d2452d", pressure: 5 },
  { name: "surfactant", color: null, pressure: 8 },
  { name: "viridian", color: "#2f8a5f", pressure: 5 },
  { name: "ochre", color: "#c8952e", pressure: 5 },
];

export let sequence = (fluids) => {
  // every ink is followed by the surfactant
  const clear = fluids.findIndex((fluid) => !fluid.color);
  return fluids.flatMap((fluid, i) => (fluid.color ? [i, clear] : []));
};

export let defaults = () => ({
  solvesPerSecond: 60,
  dt: 1,
  stiffness: 1, // share of a cell's excess film it is asked to shed per solve
  cycles: 2, // multigrid V-cycles per solve
  curl: 0.05,
  drag: 0.005,
  viscosity: 0.08,
  transportSteps: 4, // per solve, while nothing is touching the water
  touchTransportSteps: 16, // per solve during a touch: lifts the speed limit
  brushRadius: 6, // px
  brushLoad: 1, // multiplies every fluid's brush pressure
  brushFeed: 0.8, // share of the missing pressure the brush restores per solve
  strokeRadius: 40, // px, for blow
  inkStrength: 3.5,
  compress: true,
  finishAtMs: 28, // lines view: the picture is finished once a frame's work takes this long
  sharpness: 0.4, // how fast boundaries are re-sharpened, as a multiple of the water speed
  wash: 0, // 0: ink stirred below the grid beads up. 1: it is left as a pale wash
  autoDrops: true,
});

// absorbance of a saturated film: paper * exp(-absorb) is the fluid's colour.
// The original writes from a forEach callback; a Mut may not be captured, so it is a for loop.
export let absorbance = (fluids) => {
  const absorb = mut(new Float32Array(32));
  for (let i = 0; i < fluids.length; i++) {
    const fluid = fluids[i];
    if (!fluid.color) continue;
    const hex = fluid.color.replace("#", "");
    for (let k = 0; k < 3; k++) {
      const channel = parseInt(hex.slice(2 * k, 2 * k + 2), 16) / 255;
      absorb[4 * i + k] = -Math.log(Math.max(channel, 0.02));
    }
  }
  return freeze(absorb);
};

// ---- lines: drops as closed polylines carried by the water ----

export let createContours = () =>
  function createContours(width: number, height: number, { spacing = 1 }: { readonly spacing?: number } = {}): Contours {
    // Every drop is a closed polyline, in cells, vertex after vertex in x, y.
    // spacing scales every length the re-spacing works to, cells
    const W = width;
    const H = height;

    // the velocity texture is staggered: texel (i, j) holds u on its west
    // face and v on its south face. Walls carry no normal flow.
    // The original writes into one array closed over by sample; a Mut may not be captured, so the
    // caller owns it and passes it in.
    const sample = (out: Mut<number[]>, vel: Float32Array, x: number, y: number): void => {
      let fy = y - 0.5;
      let i0 = Math.floor(x);
      let j0 = Math.floor(fy);
      let tx = x - i0;
      let ty = fy - j0;
      let a = 4 * W * (j0 < 0 ? 0 : j0 > H - 1 ? H - 1 : j0);
      let b = 4 * W * (j0 + 1 < 0 ? 0 : j0 + 1 > H - 1 ? H - 1 : j0 + 1);
      const west = i0 <= 0 || i0 >= W;
      const east = i0 + 1 <= 0 || i0 + 1 >= W;
      out[0] =
        (1 - ty) * ((1 - tx) * (west ? 0 : vel[a + 4 * i0]) + tx * (east ? 0 : vel[a + 4 * i0 + 4])) +
        ty * ((1 - tx) * (west ? 0 : vel[b + 4 * i0]) + tx * (east ? 0 : vel[b + 4 * i0 + 4]));
      const fx = x - 0.5;
      i0 = Math.floor(fx);
      j0 = Math.floor(y);
      tx = fx - i0;
      ty = y - j0;
      a = 4 * (i0 < 0 ? 0 : i0 > W - 1 ? W - 1 : i0) + 1;
      b = 4 * (i0 + 1 < 0 ? 0 : i0 + 1 > W - 1 ? W - 1 : i0 + 1) + 1;
      const south = j0 <= 0 || j0 >= H;
      const north = j0 + 1 <= 0 || j0 + 1 >= H;
      out[1] =
        (1 - ty) * ((1 - tx) * (south ? 0 : vel[4 * W * j0 + a]) + tx * (south ? 0 : vel[4 * W * j0 + b])) +
        ty * ((1 - tx) * (north ? 0 : vel[4 * W * (j0 + 1) + a]) + tx * (north ? 0 : vel[4 * W * (j0 + 1) + b]));
    };

    // Vertices go where the curve bends. A segment is split where a Catmull-Rom
    // curve through its neighbours leaves the chord by more than `bend`, or when
    // it is longer than `longest`; a vertex is dropped when the curve is as
    // straight without it, or when it crowds the one before.
    // The original writes into the curve's spare buffer and swaps it with xy; here every call
    // allocates the output (4n floats, the capacity the original requires of its spare).
    const resampleCurve = (curve: Curve): Curve => {
      const { n, xy } = curve;
      const longest2 = 9 * spacing * spacing;
      const shortest2 = 0.09 * spacing * spacing;
      const bend = 0.08 * spacing;
      const bend2 = bend * bend;
      const to = mut(new Float32Array(4 * n));
      let m = 0;
      let lastX = 0;
      let lastY = 0;
      // the vertices before, at, after and two after the one being looked at
      let x0 = xy[2 * n - 2], y0 = xy[2 * n - 1];
      let x1 = xy[0], y1 = xy[1];
      let x2 = xy[2 % (2 * n)], y2 = xy[3 % (2 * n)];
      for (let i = 0; i < n; i++) {
        const d = i + 2 < n ? i + 2 : i + 2 - n;
        const x3 = xy[2 * d], y3 = xy[2 * d + 1];
        let keep = true;
        if (m && n - i + m > 8) {
          // how far this vertex stands off the line from the last kept to the next
          const ex = x2 - lastX, ey = y2 - lastY;
          const span2 = ex * ex + ey * ey;
          if (span2 < longest2) {
            const cross = ex * (y1 - lastY) - ey * (x1 - lastX);
            const off2 = (cross * cross) / (span2 + 1e-12);
            const gx = x1 - lastX, gy = y1 - lastY;
            keep = !(off2 < 0.25 * bend2 || (gx * gx + gy * gy < shortest2 && off2 < 16 * bend2));
          }
        }
        if (keep) {
          to[2 * m] = lastX = x1;
          to[2 * m + 1] = lastY = y1;
          m++;
        }
        // the Catmull-Rom midpoint stands off the chord by this much
        const mx = (x1 + x2 - x0 - x3) / 16;
        const my = (y1 + y2 - y0 - y3) / 16;
        const sx = x2 - x1, sy = y2 - y1;
        const length2 = sx * sx + sy * sy;
        if (length2 > longest2 || (length2 > 4 * shortest2 && mx * mx + my * my > bend2)) {
          to[2 * m] = lastX = (x1 + x2) / 2 + mx;
          to[2 * m + 1] = lastY = (y1 + y2) / 2 + my;
          m++;
        }
        x0 = x1; y0 = y1; x1 = x2; y1 = y2; x2 = x3; y2 = y3;
      }
      return { ...curve, n: m, xy: freeze(to) };
    };

    const make = (curves: readonly Curve[], version: number, lineage: object): Contours => ({
      width,
      height,
      curves,
      version,
      spacing,
      lineage,
      count: () => curves.reduce((sum, curve) => sum + curve.n, 0),
      // a new drop: a circle, painted over everything born before it
      birth: ({ x, y, radius, color, outline = true }) => {
        const n = Math.max(12, Math.ceil((2 * Math.PI * radius) / spacing));
        const xy = mut(new Float32Array(2 * n));
        for (let i = 0; i < n; i++) {
          xy[2 * i] = x + radius * Math.cos((2 * Math.PI * i) / n);
          xy[2 * i + 1] = y + radius * Math.sin((2 * Math.PI * i) / n);
        }
        return make([...curves, { color, outline, n, xy: freeze(xy) }], version + 1, lineage);
      },
      // Carry every vertex along for dt, on the CPU. velocity: what
      // tray.read("velocity") returns. The tray does the same on the GPU, in
      // contourAdvectShader; this one is what the tests compare that with.
      advect: (velocity, dt) => {
        const out = mut([0, 0]);
        const moved = mut<Curve[]>([]);
        for (const curve of curves) {
          const { n, xy } = curve;
          const next = mut(new Float32Array(2 * n));
          for (let i = 0; i < n; i++) {
            let x = xy[2 * i];
            let y = xy[2 * i + 1];
            sample(out, velocity, x, y);
            // no step longer than half a cell, where the water is fast
            const steps = Math.min(16, Math.ceil((Math.hypot(out[0], out[1]) * dt) / 0.5)) || 1;
            const h = dt / steps;
            for (let s = 0; s < steps; s++) {
              if (s) sample(out, velocity, x, y);
              sample(out, velocity, x + 0.5 * h * out[0], y + 0.5 * h * out[1]); // midpoint
              x = Math.min(Math.max(x + h * out[0], 0), W);
              y = Math.min(Math.max(y + h * out[1], 0), H);
            }
            next[2 * i] = x;
            next[2 * i + 1] = y;
          }
          moved.push({ ...curve, xy: freeze(next) });
        }
        return make(freeze(moved), version, lineage).resample();
      },
      // re-space curve k, or every curve
      resample: (k) =>
        make(k === undefined ? curves.map(resampleCurve) : curves.map((c, i) => (i === k ? resampleCurve(c) : c)), version + 1, lineage),
      // Curve k for the GPU: its vertices and its first vertex again, so that
      // any run of them is a triangle fan. box: [x0, y0, x1, y1]
      pack: (k) => {
        const { n, xy } = curves[k];
        const packed = mut(new Float32Array(2 * n + 2));
        packed.set(xy.subarray(0, 2 * n));
        packed[2 * n] = xy[0];
        packed[2 * n + 1] = xy[1];
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < n; i++) {
          const x = xy[2 * i], y = xy[2 * i + 1];
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        return { packed: freeze(packed), n, box: [x0, y0, x1, y1] };
      },
      // take curve k's vertices back from an array laid out by pack()
      unpack: (k, packed) => {
        const n = curves[k].n;
        const xy = mut(new Float32Array(2 * n));
        xy.set(packed.subarray(0, 2 * n));
        const taken = freeze(xy);
        return make(curves.map((c, i) => (i === k ? { ...c, xy: taken } : c)), version, lineage);
      },
      // signed area enclosed by curve number k, cells squared
      area: (k) => {
        const { n, xy } = curves[k];
        let sum = 0;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          sum += xy[2 * i] * xy[2 * j + 1] - xy[2 * j] * xy[2 * i + 1];
        }
        return sum / 2;
      },
    });

    return make([], 0, {});
  };

// ---- tests (the GPU ones are in shell.ts) ----

export let test_lines_keep_their_area = (runTests, createContours) => {
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  // a rigid quarter turn about the centre of a 96 cell tray, on the CPU
  const size = 96;
  const turn = Math.PI / 2 / 200;
  const field = mut(new Float32Array(size * size * 4));
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      field[4 * (j * size + i)] = -turn * (j + 0.5 - size / 2); // u, west face
      field[4 * (j * size + i) + 1] = turn * (i + 0.5 - size / 2); // v, south face
    }
  const velocity = freeze(field);
  let contours = createContours(size, size);
  contours = contours.birth({ x: 64, y: 48, radius: 12, color: [0, 0, 0] });
  const before = contours.area(0);
  for (let n = 0; n < 200; n++) contours = contours.advect(velocity, 1);
  const { n, xy } = contours.curves[0];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += xy[2 * i] / n;
    y += xy[2 * i + 1] / n;
  }
  const change = contours.area(0) / before - 1;
  const miss = Math.hypot(x - 48, y - 64);
  if (!(Math.abs(change) < 0.002)) throw new Error(`area changed by ${change}`);
  if (!(miss < 0.05)) throw new Error(`the circle ended ${miss} cells from (48, 64)`);
  return `a quarter turn changed the area by ${change.toExponential(1)} and left the centre ${miss.toExponential(1)} cells off, on ${n} vertices`;
};

// ---- shaders (extracted verbatim) ----

export let vertexShader = () =>
  `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export let velocityShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uVelocity;
uniform sampler2D uForce;
uniform ivec2 uSize;
uniform float uDt;
uniform float uDrag;
uniform float uViscosity;
uniform float uCurl;
uniform vec2 uStrokeFrom;
uniform vec2 uStrokeTo;
uniform vec2 uStrokeVelocity;
uniform float uStrokeRadius;
uniform float uStrokeStrength;
out vec4 outColor;

// Staggered grid: texel (i, j) holds u on the west face of cell (i, j)
// and v on its south face. Faces on a wall carry no flow.
vec2 vel (ivec2 c) {
  vec2 w = texelFetch(uVelocity, clamp(c, ivec2(0), uSize - 1), 0).xy;
  if (c.x <= 0 || c.x >= uSize.x) w.x = 0.0;
  if (c.y <= 0 || c.y >= uSize.y) w.y = 0.0;
  return w;
}
float sampleU (vec2 p) {
  vec2 q = p - vec2(0.0, 0.5);
  ivec2 i = ivec2(floor(q));
  vec2 f = q - vec2(i);
  return mix(mix(vel(i).x, vel(i + ivec2(1, 0)).x, f.x),
             mix(vel(i + ivec2(0, 1)).x, vel(i + ivec2(1, 1)).x, f.x), f.y);
}
float sampleV (vec2 p) {
  vec2 q = p - vec2(0.5, 0.0);
  ivec2 i = ivec2(floor(q));
  vec2 f = q - vec2(i);
  return mix(mix(vel(i).y, vel(i + ivec2(1, 0)).y, f.x),
             mix(vel(i + ivec2(0, 1)).y, vel(i + ivec2(1, 1)).y, f.x), f.y);
}
vec2 force (ivec2 k) {
  return texelFetch(uForce, clamp(k, ivec2(0), uSize - 1), 0).xy;
}
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 E = ivec2(1, 0);
  ivec2 N = ivec2(0, 1);
  vec2 w = vel(c);

  // inertia of the water: semi-Lagrangian self advection
  vec2 pu = vec2(c) + vec2(0.0, 0.5);
  vec2 pv = vec2(c) + vec2(0.5, 0.0);
  float u = sampleU(pu - uDt * vec2(w.x, sampleV(pu)));
  float v = sampleV(pv - uDt * vec2(sampleU(pv), w.y));

  // vorticity confinement, averaged from the two corners each face joins
  vec2 confine = 0.5 * vec2(force(c).x + force(c + N).x, force(c).y + force(c + E).y);

  // around the advected value, so the update stays an average of neighbours
  vec2 laplacian = vel(c + E) + vel(c - E) + vel(c + N) + vel(c - N) - 4.0 * vec2(u, v);

  vec2 next = vec2(u, v) + uDt * (uCurl * confine + uViscosity * laplacian);
  next /= 1.0 + uDt * uDrag; // drag from the still water below, implicit

  // a stroke: water near the path the pointer took moves with the pointer
  vec2 along = uStrokeTo - uStrokeFrom;
  vec2 rel = gl_FragCoord.xy - uStrokeFrom;
  float h = clamp(dot(rel, along) / max(dot(along, along), 1e-6), 0.0, 1.0);
  vec2 d = rel - h * along;
  float grip = uStrokeStrength * exp(-dot(d, d) / (uStrokeRadius * uStrokeRadius));
  next = mix(next, uStrokeVelocity, grip);
  if (c.x == 0) next.x = 0.0;
  if (c.y == 0) next.y = 0.0;
  outColor = vec4(next, 0.0, 1.0);
}`;

export let transportShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uVelocity;
uniform sampler2D uFilm;  // fluids 0 to 3
uniform sampler2D uFilmB; // fluids 4 to 7
uniform ivec2 uSize;
uniform float uDt;
uniform float uCompress; // 0: first order upwind fractions and no sharpening
uniform float uSharpness; // sharpening speed, as a multiple of the water speed
uniform float uWidth; // boundary half width, cells
uniform float uWash; // 1: blurred regions are left blurred, 0: they are un-mixed
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

struct Film { vec4 a; vec4 b; };

vec2 vel (ivec2 c) {
  vec2 w = texelFetch(uVelocity, clamp(c, ivec2(0), uSize - 1), 0).xy;
  if (c.x <= 0 || c.x >= uSize.x) w.x = 0.0;
  if (c.y <= 0 || c.y >= uSize.y) w.y = 0.0;
  return w;
}
Film film (ivec2 c) {
  c = clamp(c, ivec2(0), uSize - 1);
  return Film(texelFetch(uFilm, c, 0), texelFetch(uFilmB, c, 0));
}
float total (Film f) { return dot(f.a + f.b, vec4(1.0)); }
Film fraction (Film f) {
  float g = total(f);
  float k = g > 1e-9 ? 1.0 / g : 0.0;
  return Film(k * f.a, k * f.b);
}
// Courant number of everything leaving cell c
float outflow (ivec2 c) {
  vec2 a = vel(c);
  float uE = vel(c + ivec2(1, 0)).x;
  float vN = vel(c + ivec2(0, 1)).y;
  return uDt * (max(-a.x, 0.0) + max(uE, 0.0) + max(-a.y, 0.0) + max(vN, 0.0));
}
float cellSpeed (ivec2 c) {
  vec2 a = vel(c);
  return length(0.5 * vec2(a.x + vel(c + ivec2(1, 0)).x, a.y + vel(c + ivec2(0, 1)).y));
}
// ULTIMATE-QUICKEST (Leonard 1991) face value of four fractions: third order
// and bounded. It does not sharpen, and has no favourite direction.
vec4 quickest (vec4 pU, vec4 pD, vec4 pA, float cD) {
  vec4 along = pA - pU;
  vec4 ok = step(vec4(1e-6), abs(along));
  vec4 n = (pD - pU) / mix(vec4(1.0), along, ok);
  vec4 inside = ok * step(vec4(0.0), n) * step(n, vec4(1.0));
  vec4 q = min((8.0 * cD * n + (1.0 - cD) * (6.0 * n + 3.0)) / 8.0, min(vec4(1.0), n / cD));
  return mix(pD, pU + mix(n, q, inside) * along, ok);
}
// Sharpening (Olsson & Kreiss 2005) of four fractions at the face between L
// and R: push each fluid up its own gradient, along the boundary normal,
// against a little diffusion. The two balance at a boundary uWidth cells wide
// whichever way it faces. a and b are the transverse neighbours, LL and RR the
// next cells along the face normal.
vec4 sharpening (vec4 pL, vec4 pR, vec4 pLa, vec4 pLb, vec4 pRa, vec4 pRb, vec4 pLL, vec4 pRR) {
  vec4 gn = pR - pL;
  vec4 gt = 0.25 * (pLa - pLb + pRa - pRb);
  // The direction comes from a wider difference. Across a band too thin to
  // resolve the two sides cancel, and sharpening is switched off there.
  vec4 wide = (pRR - pLL) / 3.0;
  vec4 steep = wide * wide + gt * gt;
  vec4 normal = wide / sqrt(steep + 1e-8);
  vec4 resolved = steep / (steep + 0.01);
  // uWash: only a real boundary is sharpened, nearly pure fluid close by on
  // one side and nearly none of it on the other. A blurred region has neither.
  vec4 most = max(max(max(pL, pR), max(pLa, pLb)), max(max(pRa, pRb), max(pLL, pRR)));
  vec4 least = min(min(min(pL, pR), min(pLa, pLb)), min(min(pRa, pRb), min(pLL, pRR)));
  resolved *= mix(vec4(1.0), smoothstep(0.45, 0.8, most) * smoothstep(0.45, 0.8, 1.0 - least), uWash);
  vec4 pf = 0.5 * (pL + pR);
  return resolved * (pf * (1.0 - pf) * normal - uWidth * gn);
}
// Film carried per unit time through the face between lo and lo + dir.
Film faceFlux (ivec2 lo, ivec2 dir, float w) {
  ivec2 hi = lo + dir;
  Film flux = Film(vec4(0.0), vec4(0.0));
  if (any(lessThan(lo, ivec2(0))) || any(greaterThanEqual(hi, uSize))) return flux;
  ivec2 t = dir.yx; // transverse
  Film fL = film(lo);
  Film fR = film(hi);
  Film pL = fraction(fL);
  Film pR = fraction(fR);

  if (w != 0.0) {
    ivec2 D = w > 0.0 ? lo : hi;    // donor cell
    ivec2 s = w > 0.0 ? dir : -dir; // downstream
    Film fU = film(D - s);
    Film fD = fL; Film fA = fR; Film pD = pL; Film pA = pR;
    if (w < 0.0) { fD = fR; fA = fL; pD = pR; pA = pL; }
    float cf = abs(w) * uDt;
    float cD = clamp(outflow(D), max(cf, 1e-4), 1.0);

    // how much film: van Leer limited second order upwind
    float gD = total(fD);
    float down = total(fA) - gD;
    float up = gD - total(fU);
    float r = abs(down) > 1e-9 ? up / down : 0.0;
    float psi = (r + abs(r)) / (1.0 + abs(r));
    float g = gD + 0.5 * psi * (1.0 - cf) * down;

    // which fluid
    Film pU = fraction(fU);
    Film p = Film(quickest(pU.a, pD.a, pA.a, cD), quickest(pU.b, pD.b, pA.b, cD));
    float ps = total(p);
    if (ps > 1e-9) { p.a /= ps; p.b /= ps; } else p = pD;
    flux = Film(w * g * mix(pD.a, p.a, uCompress), w * g * mix(pD.b, p.b, uCompress));
  }

  // inside one fluid there is nothing to sharpen, and most faces are inside one
  vec4 ma = 0.5 * (pL.a + pR.a);
  vec4 mb = 0.5 * (pL.b + pR.b);
  if (uCompress == 0.0 || dot(ma * (1.0 - ma) + mb * (1.0 - mb), vec4(1.0)) < 1e-6) return flux;
  Film pLa = fraction(film(lo + t));
  Film pLb = fraction(film(lo - t));
  Film pRa = fraction(film(hi + t));
  Film pRb = fraction(film(hi - t));
  Film pLL = fraction(film(lo - dir));
  Film pRR = fraction(film(hi + dir));
  float speed = 0.5 * (cellSpeed(lo) + cellSpeed(hi)) + 0.02;
  float rate = uCompress * min(uSharpness * speed, 0.2 / uDt) * 0.5 * (total(fL) + total(fR));
  Film sharpen = Film(
    rate * sharpening(pL.a, pR.a, pLa.a, pLb.a, pRa.a, pRb.a, pLL.a, pRR.a),
    rate * sharpening(pL.b, pR.b, pLa.b, pLb.b, pRa.b, pRb.b, pLL.b, pRR.b));
  // fluids trade places, the film total is untouched
  float net = total(sharpen);
  flux.a += sharpen.a - 0.5 * (pL.a + pR.a) * net;
  flux.b += sharpen.b - 0.5 * (pL.b + pR.b) * net;
  return flux;
}
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 E = ivec2(1, 0);
  ivec2 N = ivec2(0, 1);
  vec2 w = vel(c);
  Film f = film(c);
  Film e = faceFlux(c, E, vel(c + E).x);
  Film wst = faceFlux(c - E, E, w.x);
  Film n = faceFlux(c, N, vel(c + N).y);
  Film s = faceFlux(c - N, N, w.y);
  outA = max(f.a - uDt * (e.a - wst.a + n.a - s.a), vec4(0.0));
  outB = max(f.b - uDt * (e.b - wst.b + n.b - s.b), vec4(0.0));
}`;

export let brushShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uFilm;
uniform sampler2D uFilmB;
uniform vec2 uPoint;
uniform float uRadius;
uniform vec4 uFluid;    // one-hot over both textures: which fluid is on the brush
uniform vec4 uFluidB;
uniform float uPressure; // surface pressure held at the brush tip
uniform float uRate;
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;
void main () {
  vec4 a = texelFetch(uFilm, ivec2(gl_FragCoord.xy), 0);
  vec4 b = texelFetch(uFilmB, ivec2(gl_FragCoord.xy), 0);
  float g = dot(a + b, vec4(1.0));
  float d = length(gl_FragCoord.xy - uPoint) / uRadius;
  // the tip displaces whatever film was under it
  float under = smoothstep(1.0, 0.6, d);
  // and feeds film only while the surface is below the brush pressure
  float feed = uRate * exp(-d * d) * max(uPressure - g, 0.0);
  outA = mix(a, uFluid * g, under) + uFluid * feed;
  outB = mix(b, uFluidB * g, under) + uFluidB * feed;
}`;

export let displayShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uFilm;
uniform sampler2D uFilmB;
uniform ivec2 uSize;
uniform mat4 uAbsorb; // column i: rgb absorbance of fluid i
uniform mat4 uAbsorbB; // and of fluid 4 + i
uniform vec3 uPaper;
uniform float uEdge;
uniform float uStrength;
uniform int uView;
in vec2 vUv;
out vec4 outColor;
// Cubic B-spline through the 4x4 cells around the pixel. Bilinear between
// cells draws a bead two cells across as a square; this draws it round.
vec4 smoothed (sampler2D source, ivec2 i, vec2 t) {
  vec2 t2 = t * t;
  vec2 t3 = t2 * t;
  // the four weights along each axis, as vectors: an array here (vec2[4])
  // fails to compile on an Android phone, S0032 "no default precision"
  vec2 w0 = (1.0 - 3.0 * t + 3.0 * t2 - t3) / 6.0;
  vec2 w1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
  vec2 w3 = t3 / 6.0;
  vec4 wx = vec4(w0.x, w1.x, w2.x, w3.x);
  vec4 wy = vec4(w0.y, w1.y, w2.y, w3.y);
  vec4 sum = vec4(0.0);
  for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++)
    sum += wx[x] * wy[y] * texelFetch(source, clamp(i + ivec2(x - 1, y - 1), ivec2(0), uSize - 1), 0);
  return sum;
}
void main () {
  vec2 q = vUv * vec2(uSize) - 0.5;
  ivec2 i = ivec2(floor(q));
  vec2 t = q - vec2(i);
  vec4 f = smoothed(uFilm, i, t);
  vec4 fB = smoothed(uFilmB, i, t);
  float g = dot(f + fB, vec4(1.0));
  if (uView == 1) {
    outColor = vec4(vec3(1.0 - exp(-0.7 * g)), 1.0);
    return;
  }
  // the boundary is a ramp about two cells wide; draw it at its midpoint
  vec4 p = g > 1e-9 ? f / g : vec4(0.0);
  vec4 pB = g > 1e-9 ? fB / g : vec4(0.0);
  vec4 s = smoothstep(0.5 - uEdge, 0.5 + uEdge, p);
  vec4 sB = smoothstep(0.5 - uEdge, 0.5 + uEdge, pB);
  float ss = dot(s + sB, vec4(1.0));
  s = ss > 1e-4 ? s / ss : p;
  sB = ss > 1e-4 ? sB / ss : pB;
  // a thick film saturates at the fluid's own colour, it never goes darker
  vec3 density = (1.0 - exp(-uStrength * g)) * (uAbsorb * s + uAbsorbB * sB).rgb;
  outColor = vec4(uPaper * exp(-density), 1.0);
}`;

export let contourVertexShader = () =>
  `#version 300 es
layout(location = 0) in vec2 aPosition; // cells
uniform vec2 uSize;
uniform vec4 uBox; // the curve's bounding box
uniform int uCover; // 1: draw the bounding box instead of the vertices
void main () {
  vec2 p = aPosition;
  if (uCover == 1) p = vec2((gl_VertexID & 1) == 0 ? uBox.x : uBox.z, (gl_VertexID & 2) == 0 ? uBox.y : uBox.w);
  gl_Position = vec4(p / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

export let contourFragmentShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
uniform vec3 uColor;
out vec4 outColor;
void main () {
  outColor = vec4(uColor, 1.0);
}`;

export let contourAdvectShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
layout(location = 0) in vec2 aPosition; // cells
uniform sampler2D uVelocity;
uniform ivec2 uSize;
uniform float uDt;
out vec2 vPosition; // captured by transform feedback, nothing is drawn

// The velocity texture is staggered: texel (i, j) holds u on its west face
// and v on its south face. Walls carry no normal flow.
float U (ivec2 c) {
  if (c.x <= 0 || c.x >= uSize.x) return 0.0;
  return texelFetch(uVelocity, ivec2(c.x, clamp(c.y, 0, uSize.y - 1)), 0).x;
}
float V (ivec2 c) {
  if (c.y <= 0 || c.y >= uSize.y) return 0.0;
  return texelFetch(uVelocity, ivec2(clamp(c.x, 0, uSize.x - 1), c.y), 0).y;
}
vec2 water (vec2 p) {
  vec2 q = p - vec2(0.0, 0.5);
  ivec2 i = ivec2(floor(q));
  vec2 t = q - vec2(i);
  float u = mix(mix(U(i), U(i + ivec2(1, 0)), t.x), mix(U(i + ivec2(0, 1)), U(i + ivec2(1, 1)), t.x), t.y);
  q = p - vec2(0.5, 0.0);
  i = ivec2(floor(q));
  t = q - vec2(i);
  float v = mix(mix(V(i), V(i + ivec2(1, 0)), t.x), mix(V(i + ivec2(0, 1)), V(i + ivec2(1, 1)), t.x), t.y);
  return vec2(u, v);
}
void main () {
  vec2 p = aPosition;
  vec2 w = water(p);
  // no step longer than half a cell, where the water is fast
  int steps = clamp(int(ceil(length(w) * uDt / 0.5)), 1, 16);
  float h = uDt / float(steps);
  for (int s = 0; s < 16; s++) {
    if (s >= steps) break;
    if (s > 0) w = water(p);
    w = water(p + 0.5 * h * w); // midpoint
    p = clamp(p + h * w, vec2(0.0), vec2(uSize));
  }
  vPosition = p;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`;

export let confinementShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uVelocity;
uniform ivec2 uSize;
out vec4 outColor;
vec2 vel (ivec2 c) {
  vec2 w = texelFetch(uVelocity, clamp(c, ivec2(0), uSize - 1), 0).xy;
  if (c.x <= 0 || c.x >= uSize.x) w.x = 0.0;
  if (c.y <= 0 || c.y >= uSize.y) w.y = 0.0;
  return w;
}
// vorticity at the south west corner of cell k
float curl (ivec2 k) {
  vec2 w = vel(k);
  return (w.y - vel(k - ivec2(1, 0)).y) - (w.x - vel(k - ivec2(0, 1)).x);
}
void main () {
  ivec2 k = ivec2(gl_FragCoord.xy);
  float w = curl(k);
  vec2 n = vec2(abs(curl(k + ivec2(1, 0))) - abs(curl(k - ivec2(1, 0))),
                abs(curl(k + ivec2(0, 1))) - abs(curl(k - ivec2(0, 1))));
  n /= length(n) + 1e-5;
  // Only a real eddy is fed. In a straight or radial flow the curl is grid
  // noise, small next to the speed, and feeding it crinkles every ring.
  float real = smoothstep(0.05, 0.2, abs(w) / (length(vel(k)) + 1e-3));
  // push around each vortex in the direction it already turns
  outColor = vec4(real * w * vec2(n.y, -n.x), 0.0, 1.0);
}`;

export let reduceShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uSource;
uniform sampler2D uSourceB;
uniform ivec2 uSourceSize;
uniform int uFilm; // 1: add up all eight fluids of a film
out vec4 outColor;
void main () {
  // the sum of an 8x8 block; repeated until one texel holds the total
  ivec2 base = 8 * ivec2(gl_FragCoord.xy);
  float sum = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    ivec2 c = base + ivec2(x, y);
    if (c.x >= uSourceSize.x || c.y >= uSourceSize.y) continue;
    vec4 f = texelFetch(uSource, c, 0);
    sum += uFilm == 1 ? dot(f + texelFetch(uSourceB, c, 0), vec4(1.0)) : f.x;
  }
  outColor = vec4(sum, 0.0, 0.0, 1.0);
}`;

export let divergenceShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uVelocity;
uniform sampler2D uFilm;
uniform sampler2D uFilmB;
uniform sampler2D uTotal;
uniform ivec2 uSize;
uniform float uStiffness;
out vec4 outColor;
vec2 vel (ivec2 c) {
  vec2 w = texelFetch(uVelocity, clamp(c, ivec2(0), uSize - 1), 0).xy;
  if (c.x <= 0 || c.x >= uSize.x) w.x = 0.0;
  if (c.y <= 0 || c.y >= uSize.y) w.y = 0.0;
  return w;
}
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 w = vel(c);
  float divergence = vel(c + ivec2(1, 0)).x - w.x + vel(c + ivec2(0, 1)).y - w.y;
  // a cell holding more film than the tray average has to expand
  float film = dot(texelFetch(uFilm, c, 0) + texelFetch(uFilmB, c, 0), vec4(1.0));
  float mean = texelFetch(uTotal, ivec2(0), 0).x / (float(uSize.x) * float(uSize.y));
  // bounded, so one solve never asks a cell to shed more than it holds
  float wanted = uStiffness * (film - mean) / max(max(film, mean), 1e-6);
  outColor = vec4(divergence - wanted, 0.0, 0.0, 1.0);
}`;

export let shiftShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uSource;
uniform sampler2D uTotal;
uniform ivec2 uSize;
out vec4 outColor;
void main () {
  // Take the mean out. With walls all round, pressure is only defined up to
  // a constant and the equation only has a solution if its right hand side
  // sums to zero. Left in, the constant grows every solve until float32 has
  // no digits left for the part that matters.
  float mean = texelFetch(uTotal, ivec2(0), 0).x / (float(uSize.x) * float(uSize.y));
  outColor = vec4(texelFetch(uSource, ivec2(gl_FragCoord.xy), 0).x - mean, 0.0, 0.0, 1.0);
}`;

export let pressureShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uPressure;
uniform sampler2D uRhs;
uniform ivec2 uSize;
uniform vec2 uLast; // width of the last column and row, in cells
uniform float uH2; // cell width squared on this level
out vec4 outColor;
float p (ivec2 c) {
  return texelFetch(uPressure, clamp(c, ivec2(0), uSize - 1), 0).x; // walls mirror
}
vec2 width (ivec2 c) {
  return mix(vec2(1.0), uLast, equal(c, uSize - 1));
}
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float rhs = texelFetch(uRhs, c, 0).x;
  // finite volume: flow across each face over the distance between centres
  vec2 w = width(c);
  vec2 wE = width(c + ivec2(1, 0)), wW = width(c - ivec2(1, 0));
  vec2 wN = width(c + ivec2(0, 1)), wS = width(c - ivec2(0, 1));
  float tE = w.y / (0.5 * (w.x + wE.x)), tW = w.y / (0.5 * (w.x + wW.x));
  float tN = w.x / (0.5 * (w.y + wN.y)), tS = w.x / (0.5 * (w.y + wS.y));
  float jacobi = (tE * p(c + ivec2(1, 0)) + tW * p(c - ivec2(1, 0)) +
                  tN * p(c + ivec2(0, 1)) + tS * p(c - ivec2(0, 1)) - uH2 * rhs * w.x * w.y) / (tE + tW + tN + tS);
  // damped: plain Jacobi leaves the checkerboard error untouched
  outColor = vec4(mix(p(c), jacobi, 0.8), 0.0, 0.0, 1.0);
}`;

export let restrictShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uPressure;
uniform sampler2D uRhs;
uniform ivec2 uSize; // of the fine level
uniform vec2 uLast; // width of its last column and row, in cells
uniform float uH2;
out vec4 outColor;
float p (ivec2 c) {
  return texelFetch(uPressure, clamp(c, ivec2(0), uSize - 1), 0).x;
}
vec2 width (ivec2 c) {
  return mix(vec2(1.0), uLast, equal(c, uSize - 1));
}
void main () {
  // what the fine level still gets wrong, averaged by area onto the coarse cell
  ivec2 base = 2 * ivec2(gl_FragCoord.xy);
  float sum = 0.0;
  float area = 0.0;
  for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
    ivec2 c = base + ivec2(x, y);
    if (c.x >= uSize.x || c.y >= uSize.y) continue;
    vec2 w = width(c);
    vec2 wE = width(c + ivec2(1, 0)), wW = width(c - ivec2(1, 0));
    vec2 wN = width(c + ivec2(0, 1)), wS = width(c - ivec2(0, 1));
    float flow = w.y * (p(c + ivec2(1, 0)) - p(c)) / (0.5 * (w.x + wE.x)) +
                 w.y * (p(c - ivec2(1, 0)) - p(c)) / (0.5 * (w.x + wW.x)) +
                 w.x * (p(c + ivec2(0, 1)) - p(c)) / (0.5 * (w.y + wN.y)) +
                 w.x * (p(c - ivec2(0, 1)) - p(c)) / (0.5 * (w.y + wS.y));
    float laplacian = flow / (uH2 * w.x * w.y);
    sum += (texelFetch(uRhs, c, 0).x - laplacian) * w.x * w.y;
    area += w.x * w.y;
  }
  outColor = vec4(sum / max(area, 1e-6), 0.0, 0.0, 1.0);
}`;

export let prolongShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uPressure;
uniform sampler2D uCoarse;
out vec4 outColor;
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  // Bilinear between coarse cell centres. Copying the coarse value into its
  // four cells left steps in the pressure, and lines drawn through the water
  // show every one of them.
  ivec2 top = textureSize(uCoarse, 0) - 1;
  ivec2 C = min(c / 2, top); // an odd level's last row or column has no coarse cell of its own
  ivec2 D = clamp(C + (c % 2) * 2 - 1, ivec2(0), top); // the nearer neighbour
  float correction =
    0.5625 * texelFetch(uCoarse, C, 0).x +
    0.1875 * (texelFetch(uCoarse, ivec2(D.x, C.y), 0).x + texelFetch(uCoarse, ivec2(C.x, D.y), 0).x) +
    0.0625 * texelFetch(uCoarse, D, 0).x;
  outColor = vec4(texelFetch(uPressure, c, 0).x + correction, 0.0, 0.0, 1.0);
}`;

export let projectShader = () =>
  `#version 300 es
precision highp float;
precision highp int; // mediump int is 16 bits on Mali: 208 * 380 cells overflows it
precision highp sampler2D;
uniform sampler2D uVelocity;
uniform sampler2D uPressure;
uniform ivec2 uSize;
uniform float uMaxSpeed;
out vec4 outColor;
float p (ivec2 c) {
  return texelFetch(uPressure, clamp(c, ivec2(0), uSize - 1), 0).x;
}
vec2 projected (ivec2 c) {
  if (c.x >= uSize.x || c.y >= uSize.y) return vec2(0.0);
  vec2 w = texelFetch(uVelocity, max(c, ivec2(0)), 0).xy;
  w -= vec2(p(c) - p(c - ivec2(1, 0)), p(c) - p(c - ivec2(0, 1)));
  if (c.x <= 0) w.x = 0.0;
  if (c.y <= 0) w.y = 0.0;
  return w;
}
void main () {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 E = ivec2(1, 0);
  ivec2 N = ivec2(0, 1);
  vec2 w = projected(c);
  // The transport step needs a Courant limit. Limit the speed, not each
  // component, or a fast drop spreads as a square.
  float vAtU = 0.25 * (w.y + projected(c - E).y + projected(c + N).y + projected(c - E + N).y);
  float uAtV = 0.25 * (w.x + projected(c - N).x + projected(c + E).x + projected(c + E - N).x);
  w.x *= min(1.0, uMaxSpeed / (length(vec2(w.x, vAtU)) + 1e-9));
  w.y *= min(1.0, uMaxSpeed / (length(vec2(uAtV, w.y)) + 1e-9));
  outColor = vec4(w, 0.0, 1.0);
}`;
