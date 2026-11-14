// Differential check and bench: original suminagashi cell functions vs this port.
// Run from tools/lang-experiment: bun ports/suminagashi/differential.ts [--reps 200]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment";
const P = await import(`${LE}/prelude.runtime.ts`);
Object.assign(globalThis, { mut: P.mut, freeze: P.freeze, ref: P.ref, action: P.action, equals: P.equals, borrow: P.borrow, snapshot: P.snapshot });
const src = readFileSync("/Users/tom.larkworthy/dev/lopecode-dev/modules/@tomlarkworthy/suminagashi.js", "utf8");
const body = src.slice(0, src.indexOf("export default function define"));
const ids = [...body.matchAll(/^const (_\w+) = /gm)].map((m) => m[1]);
const ORIG = join(mkdtempSync(join(tmpdir(), "sumi-")), "orig.mjs");
writeFileSync(ORIG, body + `\nexport { ${ids.join(", ")} };\n`);
const O: Record<string, any> = await import(ORIG);
// original cell function by its function name (_createContours, _fluids, ...)
const byFn: Record<string, any> = {};
for (const id of ids) byFn[O[id].name] = O[id];
const C: Record<string, any> = await import(`${LE}/ports/suminagashi/cells.ts`);
const S: Record<string, any> = await import(`${LE}/ports/suminagashi/shell.ts`);

const args = process.argv.slice(2);
const REPS = Number(args[args.indexOf("--reps") + 1] || 200) || 200;

// seeded PRNG (mulberry32)
let seed = 20261114;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a: number, b: number) => a + (b - a) * rnd();

let n = 0;
let bad = 0;
const diffs: string[] = [];
const same = (label: string, a: unknown, b: unknown) => {
  n++;
  const why = differ(a, b);
  if (why) {
    bad++;
    if (diffs.length < 20) diffs.push(`DIFF ${label}: ${why}`);
  }
};
function differ(a: any, b: any, path = ""): string | null {
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    if (!ArrayBuffer.isView(a) || !ArrayBuffer.isView(b)) return `${path} typed array vs ${typeof b}`;
    const x = a as unknown as ArrayLike<number>, y = b as unknown as ArrayLike<number>;
    if (a.constructor !== b.constructor) return `${path} ${a.constructor.name} vs ${b.constructor.name}`;
    if (x.length !== y.length) return `${path} length ${x.length} vs ${y.length}`;
    for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) return `${path}[${i}] ${x[i]} vs ${y[i]}`;
    return null;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path} length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = differ(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join() !== kb.join()) return `${path} keys ${ka} vs ${kb}`;
    for (const k of ka) {
      const d = differ(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return Object.is(a, b) ? null : `${path} ${String(a).slice(0, 80)} vs ${String(b).slice(0, 80)}`;
}

// ---- data cells and strings ----
const counts: Record<string, number> = {};
const tally = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
for (const name of ["vertexShader", "velocityShader", "transportShader", "brushShader", "displayShader", "contourVertexShader",
  "contourFragmentShader", "contourAdvectShader", "confinementShader", "reduceShader", "divergenceShader", "shiftShader",
  "pressureShader", "restrictShader", "prolongShader", "projectShader", "fluids", "defaults"]) {
  same(name, byFn[`_${name}`](), C[name]());
  tally("data/shader cells");
}
const md = (strings: TemplateStringsArray, ...vals: unknown[]) => String.raw(strings, ...vals);
for (const name of Object.keys(S).filter((k) => k === "_1" || k.startsWith("_m_"))) {
  same(`prose ${name}`, byFn[name](md), S[name](md));
  tally("prose cells (raw text)");
}

// ---- sequence and absorbance on generated fluid lists ----
const hex = () => "#" + Array.from({ length: 6 }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
const fluidLists = [byFn._fluids()];
for (let t = 0; t < 300; t++) {
  const k = 1 + Math.floor(rnd() * 8);
  fluidLists.push(Array.from({ length: k }, (_, i) => ({ name: `f${i}`, color: rnd() < 0.25 ? null : hex(), pressure: between(1, 9) })));
}
for (const fl of fluidLists) {
  same("sequence", byFn._sequence(fl), C.sequence(fl));
  same("absorbance", byFn._absorbance(fl), C.absorbance(fl));
  tally("sequence + absorbance inputs");
}

// ---- createContours: random operation sequences, full state compared after every step ----
const oCreate = byFn._createContours();
const pCreate = C.createContours();
const field = (W: number, H: number, kind: number) => {
  const v = new Float32Array(W * H * 4);
  const a = between(-0.02, 0.02), r = between(-0.05, 0.05), noise = kind === 2 ? between(0, 1.5) : 0, scale = kind === 1 ? 6 : 1;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const dx = i + 0.5 - W / 2, dy = j + 0.5 - H / 2;
      v[4 * (j * W + i)] = scale * (-a * dy + r * dx) + noise * (rnd() - 0.5);
      v[4 * (j * W + i) + 1] = scale * (a * dx + r * dy) + noise * (rnd() - 0.5);
      v[4 * (j * W + i) + 2] = rnd();
      v[4 * (j * W + i) + 3] = rnd();
    }
  return v;
};
const state = (c: any) => ({
  width: c.width,
  height: c.height,
  spacing: c.spacing,
  version: c.version,
  count: c.count(),
  curves: c.curves.map((cv: any) => ({ color: cv.color, outline: cv.outline, n: cv.n, xy: cv.xy.subarray(0, 2 * cv.n) })),
  areas: c.curves.map((_: unknown, k: number) => c.area(k)),
  packs: c.curves.map((_: unknown, k: number) => c.pack(k)),
});
let steps = 0;
for (let run = 0; run < 60; run++) {
  const W = 8 + Math.floor(rnd() * 120), H = 8 + Math.floor(rnd() * 120);
  const opts = run % 4 === 0 ? undefined : { spacing: [0.5, 1, 2, 3][run % 4] };
  const o = oCreate(W, H, opts);
  let p = pCreate(W, H, opts);
  const v = field(W, H, run % 3);
  same(`run ${run} create`, state(o), state(p));
  for (let s = 0; s < 40; s++) {
    const r = rnd();
    let label: string;
    if (r < 0.2 || !o.curves.length) {
      const drop = { x: between(-5, W + 5), y: between(-5, H + 5), radius: between(0.3, Math.min(W, H) / 3), color: [rnd(), rnd(), rnd()], ...(rnd() < 0.5 ? { outline: rnd() < 0.5 } : {}) };
      o.birth(drop);
      p = p.birth(drop);
      label = "birth";
    } else if (r < 0.75) {
      const dt = between(0.1, 4);
      o.advect(v, dt);
      p = p.advect(v, dt);
      label = `advect dt=${dt.toFixed(2)}`;
    } else if (r < 0.85) {
      const k = rnd() < 0.3 ? undefined : Math.floor(rnd() * o.curves.length);
      o.resample(k);
      p = p.resample(k);
      label = `resample ${k}`;
    } else {
      const k = Math.floor(rnd() * o.curves.length);
      const packedO = o.pack(k).packed, packedP = p.pack(k).packed;
      same(`run ${run} step ${s} pack ${k}`, packedO, packedP);
      const moved = packedO.map((x: number) => x + between(-0.7, 0.7));
      o.unpack(k, moved);
      p = p.unpack(k, moved.slice());
      label = `unpack ${k}`;
    }
    same(`run ${run} step ${s} ${label}`, state(o), state(p));
    steps++;
  }
}
tally("contours operation steps");
counts["contours operation steps"] = steps;

// ---- the test cell ----
same("test_lines_keep_their_area", byFn._test_lines_keep_their_area(true, oCreate), C.test_lines_keep_their_area(true, pCreate));
tally("test cells");

console.log(Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join("\n"));
for (const d of diffs) console.log(d);
console.log(`${n} comparisons, ${bad} differ`);

// ---- bench: one advect (which resamples every curve) on a realistic tray ----
// Untimed setup: drops on a 300x200 tray in a swirl, carried some solves (60 drops 120 solves; 800 drops 20 solves), built the same way on both
// sides (the comparisons above show the two agree step for step). The original mutates in place, so
// its state is restored from a snapshot, untimed, before every timed call; the port's input is reused.
const W = 300, H = 200;
seed = 7;
const vBench = (() => {
  const v = new Float32Array(W * H * 4);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const dx = i + 0.5 - W / 2, dy = j + 0.5 - H / 2, r2 = dx * dx + dy * dy;
      const swirl = 0.6 * Math.exp(-r2 / 4000);
      v[4 * (j * W + i)] = -swirl * dy / 30 + 0.1 * Math.sin(j / 9);
      v[4 * (j * W + i) + 1] = swirl * dx / 30 + 0.1 * Math.cos(i / 11);
    }
  return v;
})();
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const benchAdvect = (drops: number, rMax: number, pre: number) => {
  const o = oCreate(W, H);
  let p = pCreate(W, H);
  for (let k = 0; k < drops; k++) {
    const drop = { x: between(20, W - 20), y: between(20, H - 20), radius: between(6, rMax), color: [0, 0, 0] };
    o.birth(drop);
    p = p.birth(drop);
  }
  for (let s = 0; s < pre; s++) {
    o.advect(vBench, 1);
    p = p.advect(vBench, 1);
  }
  const snap = o.curves.map((c: any) => ({ ...c, xy: c.xy.slice(), spare: c.spare.slice() }));
  const restore = () => o.curves.splice(0, o.curves.length, ...snap.map((c: any) => ({ ...c, xy: c.xy.slice(), spare: c.spare.slice() })));
  const tO: number[] = [], tP: number[] = [];
  let outP: any;
  for (let r = 0; r < REPS; r++) {
    // alternate which side goes first so neither always runs on a warm cache
    for (const side of r % 2 ? [1, 0] : [0, 1]) {
      if (side === 0) {
        restore();
        const t0 = performance.now();
        o.advect(vBench, 1);
        tO.push(performance.now() - t0);
      } else {
        const t0 = performance.now();
        outP = p.advect(vBench, 1);
        tP.push(performance.now() - t0);
      }
    }
  }
  const { version: _vo, ...so } = state(o);
  const { version: _vp, ...sp } = state(outP);
  same(`bench output ${drops} drops (version excluded: the restore does not rewind the original's private counter)`, so, sp);
  console.log(`bench advect: ${p.curves.length} curves, ${p.count()} vertices in, ${outP.count()} out, ${REPS} reps`);
  console.log(`  original median ${median(tO).toFixed(3)} ms, port median ${median(tP).toFixed(3)} ms, ratio ${(median(tP) / median(tO)).toFixed(2)}`);
};
benchAdvect(60, 30, 120);
benchAdvect(800, 30, 20);
// the whole CPU test cell (200 advects of one curve), as a second, smaller sample
const tTo: number[] = [], tTp: number[] = [];
for (let r = 0; r < REPS; r++) {
  let t0 = performance.now();
  byFn._test_lines_keep_their_area(true, oCreate);
  tTo.push(performance.now() - t0);
  t0 = performance.now();
  C.test_lines_keep_their_area(true, pCreate);
  tTp.push(performance.now() - t0);
}
console.log(`bench test_lines_keep_their_area: original median ${median(tTo).toFixed(3)} ms, port median ${median(tTp).toFixed(3)} ms, ratio ${(median(tTp) / median(tTo)).toFixed(2)}`);
for (const d of diffs) console.log(d);
console.log(`bench output check: ${bad === 0 ? "ok" : "DIFFERS"}`);
