// Horde shooter simulation as SoundScript cells. Every cell is a pure function of its parameters;
// typed arrays are made with mut(...), written locally, and frozen on return.
// gen.ts erases this file into proto/sim.gen.js, which the benchmark and the game run, so the code
// measured is the code checked.
//
// Units are tiles. An agent is 8 floats (S below): x, y, vx, vy, life, kind, hp, flash.
//   life > 0 alive; life <= 0 a respawn countdown in seconds; life held at HOLD while dormant.
//   kind 0 diamond (splits in two when killed), 1 chevron (fast, explodes on contact), 2 hexagon
//   (slow, takes 5 hits), 3 shard (what a diamond splits into).
//   flash: hit flash in [0, 1]; SPLIT (2) on the frame a diamond splits.
// Agents come in pairs (2k, 2k + 1) that share a kind. In a diamond pair the odd agent is a dormant
// twin that wakes as the second shard when its partner splits. A batch always starts at an even
// index, so a pair is never split between batches. Random numbers depend only on (seed, frame, global
// index), and every batch reads only last frame's data, so results do not depend on how agents are
// split into batches or which worker runs a batch.

type Params = {
  readonly seed: number;
  readonly dt: number;
  readonly cellsW: number;
  readonly cellsH: number;
  readonly cell: number;
  readonly braid: number;
  readonly accel: number;
  readonly sepR: number;
  readonly sepK: number;
  readonly sepCap: number;
  readonly hitR: number;
  readonly respawnMin: number;
  readonly respawnMax: number;
};
type Maze = { readonly w: number; readonly h: number; readonly walls: Uint8Array; readonly spawns: Float32Array };
type Bins = { readonly start: Int32Array; readonly list: Int32Array };
// last frame's live agents sorted by half-tile cell: start[c]..start[c+1] index pos (x, y pairs)
type Neigh = { readonly start: Int32Array; readonly pos: Float32Array };
type Stepped = { readonly agents: Float32Array; readonly hits: Int32Array };

// Reads that fail loudly. Strict indexing types a[i] as number | undefined; these helpers narrow it
// and throw on an out-of-range index. Every read in this file goes through one of them.
// One helper per array type, each its own function: a single helper over the union
// Float32Array | Int32Array | Uint8Array is accepted by lite too, but sees all three element kinds
// at one load and cost 40-90% of the step (horde/README.md, strict indexing). lite does not accept
// a union of Mut types, ArrayLike<T> or an index signature, so a Mut array a cell is still filling
// needs the Mut helper of its type.
// The throw lives in its own function: with the throw and its message inline, V8 does not inline
// the helper into the loops that call it, and the step cost 35% more (README, strict indexing).
type Oob = (i: number, n: number) => number;
export const oob = (): Oob => (i: number, n: number): number => {
  throw new RangeError("index " + i + " out of " + n);
};
type AtF = (a: Float32Array, i: number) => number;
type AtI = (a: Int32Array, i: number) => number;
type AtU8 = (a: Uint8Array, i: number) => number;
type AtM<T> = (a: Mut<T>, i: number) => number;
export const atF = (oob: Oob): AtF => (a: Float32Array, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
export const atI = (oob: Oob): AtI => (a: Int32Array, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
export const atU8 = (oob: Oob): AtU8 => (a: Uint8Array, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
export const atMF = (oob: Oob): AtM<Float32Array> => (a: Mut<Float32Array>, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
export const atMI = (oob: Oob): AtM<Int32Array> => (a: Mut<Int32Array>, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};
export const atMU8 = (oob: Oob): AtM<Uint8Array> => (a: Mut<Uint8Array>, i: number): number => {
  const v = a[i];
  if (v === undefined) return oob(i, a.length);
  return v;
};

export const S = () => 8;
export const HOLD = () => -0.5;

export const params = (): Params => ({
  seed: 1234567,
  dt: 1 / 60,
  cellsW: 40,
  cellsH: 25,
  cell: 4,
  braid: 0.22,
  accel: 5,
  sepR: 0.36,
  sepK: 12,
  sepCap: 14,
  hitR: 0.42,
  respawnMin: 0.6,
  respawnMax: 3,
});

// xorshift32 step; Math.imul is not an intrinsic, so the hashes below use shifts and xors only.
export const xs32 = () => (s: number): number => {
  let x = s >>> 0;
  x = (x ^ (x << 13)) >>> 0;
  x = (x ^ (x >>> 17)) >>> 0;
  x = (x ^ (x << 5)) >>> 0;
  return x;
};
// A uniform number in [0, 1) from (seed, frame, agent, stream), the same on every thread.
export const hash01 = (xs32: (s: number) => number) => (seed: number, frame: number, agent: number, k: number): number => {
  let h = xs32((seed ^ 0x9e3779b9) >>> 0);
  h = xs32((h ^ frame) >>> 0);
  h = xs32((h ^ agent) >>> 0);
  h = xs32((h ^ (k * 0x85ebca6b)) >>> 0);
  h = xs32((h ^ 0x27d4eb2f) >>> 0);
  return h / 4294967296;
};

// A braided maze (recursive backtracker, then a fraction of the remaining walls knocked out, then an
// open room in the middle), as tiles: 1 wall, 0 floor. Corridors are cell - 1 tiles wide.
export const maze = (atMI: AtM<Int32Array>, atMU8: AtM<Uint8Array>, params: Params, xs32: (s: number) => number): Maze => {
  const cw = params.cellsW, ch = params.cellsH, c = params.cell;
  const w = cw * c + 1, h = ch * c + 1;
  const walls = mut(new Uint8Array(w * h));
  walls.fill(1);
  const seen = mut(new Uint8Array(cw * ch));
  const stack = mut(new Int32Array(cw * ch));
  let s = params.seed >>> 0 || 1;
  let top = 0;
  stack[0] = 0;
  seen[0] = 1;
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++)
    for (let ty = 1; ty < c; ty++) for (let tx = 1; tx < c; tx++) walls[(cy * c + ty) * w + cx * c + tx] = 0;
  while (top >= 0) {
    const cur = atMI(stack, top);
    const cx = cur % cw, cy = Math.floor(cur / cw);
    let options = 0;
    let pick = -1;
    for (let d = 0; d < 4; d++) {
      const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || atMU8(seen, ny * cw + nx) === 1) continue;
      options++;
      s = xs32(s);
      if (s % options === 0) pick = d;
    }
    if (pick < 0) { top--; continue; }
    const nx = cx + (pick === 0 ? 1 : pick === 1 ? -1 : 0), ny = cy + (pick === 2 ? 1 : pick === 3 ? -1 : 0);
    // knock out the wall between cur and next: tiles 1..c-1 along the shared edge
    for (let k = 1; k < c; k++) {
      const tx = pick === 0 ? cx * c + c : pick === 1 ? cx * c : cx * c + k;
      const ty = pick === 2 ? cy * c + c : pick === 3 ? cy * c : cy * c + k;
      walls[ty * w + tx] = 0;
    }
    seen[ny * cw + nx] = 1;
    top++;
    stack[top] = ny * cw + nx;
  }
  // braid: open some interior walls so the maze has loops, as a pacman board does
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) for (let d = 0; d < 2; d++) {
    if ((d === 0 && cx === cw - 1) || (d === 1 && cy === ch - 1)) continue;
    s = xs32(s);
    if (s / 4294967296 >= params.braid) continue;
    for (let k = 1; k < c; k++) {
      const tx = d === 0 ? cx * c + c : cx * c + k;
      const ty = d === 0 ? cy * c + k : cy * c + c;
      walls[ty * w + tx] = 0;
    }
  }
  // the pillars left at wall crossings inside the central 4x3 cells go, giving an open room
  const rx0 = Math.floor(cw / 2) - 2, ry0 = Math.floor(ch / 2) - 1;
  for (let ty = ry0 * c + 1; ty < (ry0 + 3) * c; ty++) for (let tx = rx0 * c + 1; tx < (rx0 + 4) * c; tx++) walls[ty * w + tx] = 0;
  // spawn points: the centres of the cells on the border
  const ns = 2 * (cw + ch) - 4;
  const spawns = mut(new Float32Array(ns * 2));
  let k = 0;
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    if (cx !== 0 && cy !== 0 && cx !== cw - 1 && cy !== ch - 1) continue;
    spawns[k * 2] = cx * c + c / 2 + 0.5;
    spawns[k * 2 + 1] = cy * c + c / 2 + 0.5;
    k++;
  }
  return { w, h, walls: freeze(walls), spawns: freeze(spawns) };
};

// The flow field: breadth-first distance from the player's tile over floor tiles (4-connected),
// then per tile a unit direction toward the lowest of its 8 neighbours (diagonals only when both
// sides are open). Three floats per tile: distance, dx, dy. Walls and unreachable tiles have
// distance 1e9 and direction 0.
export const flowOf = (atF: AtF, atU8: AtU8, atMF: AtM<Float32Array>, atMI: AtM<Int32Array>) => (maze: Maze, player: Float32Array): Float32Array => {
  const w = maze.w, h = maze.h, walls = maze.walls;
  const dist = mut(new Float32Array(w * h));
  dist.fill(1e9);
  const queue = mut(new Int32Array(w * h));
  const px = Math.max(1, Math.min(w - 2, Math.floor(atF(player, 0))));
  const py = Math.max(1, Math.min(h - 2, Math.floor(atF(player, 1))));
  let head = 0, tail = 0;
  if (atU8(walls, py * w + px) === 0) { dist[py * w + px] = 0; queue[tail] = py * w + px; tail++; }
  while (head < tail) {
    const i = atMI(queue, head);
    head++;
    const d = atMF(dist, i) + 1;
    const n0 = i + 1, n1 = i - 1, n2 = i + w, n3 = i - w;
    if (atU8(walls, n0) === 0 && atMF(dist, n0) > d) { dist[n0] = d; queue[tail] = n0; tail++; }
    if (atU8(walls, n1) === 0 && atMF(dist, n1) > d) { dist[n1] = d; queue[tail] = n1; tail++; }
    if (atU8(walls, n2) === 0 && atMF(dist, n2) > d) { dist[n2] = d; queue[tail] = n2; tail++; }
    if (atU8(walls, n3) === 0 && atMF(dist, n3) > d) { dist[n3] = d; queue[tail] = n3; tail++; }
  }
  const out = mut(new Float32Array(w * h * 3));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    out[i * 3] = atMF(dist, i);
    if (atU8(walls, i) === 1 || atMF(dist, i) >= 1e9) continue;
    let best = atMF(dist, i), bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;
      const j = i + oy * w + ox;
      if (atU8(walls, j) === 1) continue;
      if (ox !== 0 && oy !== 0 && (atU8(walls, i + ox) === 1 || atU8(walls, i + oy * w) === 1)) continue;
      const len = ox !== 0 && oy !== 0 ? 1.4142 : 1;
      const v = atMF(dist, j) + (len - 1) * 0.5;
      if (v < best) { best = v; bx = ox / len; by = oy / len; }
    }
    out[i * 3 + 1] = bx;
    out[i * 3 + 2] = by;
  }
  return freeze(out);
};

// The coarse grid from last frame's agents: per tile, count and summed velocity of the live agents
// in it. Only the renderer reads it (the floor's heat); batches do not, to keep what each worker
// is sent small.
export const gridOf = (atF: AtF, atMF: AtM<Float32Array>, S: number) => (maze: Maze, agents: readonly Float32Array[]): Float32Array => {
  const w = maze.w, h = maze.h;
  const g = mut(new Float32Array(w * h * 3));
  for (const a of agents) {
    for (let i = 0; i < a.length; i += S) {
      if (atF(a, i + 4) <= 0) continue;
      const t = (Math.floor(atF(a, i + 1)) * w + Math.floor(atF(a, i))) * 3;
      g[t] = atMF(g, t) + (1);
      g[t + 1] = atMF(g, t + 1) + (atF(a, i + 2));
      g[t + 2] = atMF(g, t + 2) + (atF(a, i + 3));
    }
  }
  return freeze(g);
};

// The spatial hash for separation: live agents counting-sorted into half-tile cells, in global index
// order within a cell, so the neighbour order does not depend on batching.
export const neighOf = (atF: AtF, atMI: AtM<Int32Array>, S: number) => (maze: Maze, agents: readonly Float32Array[]): Neigh => {
  const hw = maze.w * 2, cells = hw * maze.h * 2;
  const start = mut(new Int32Array(cells + 1));
  let live = 0;
  for (const a of agents) for (let i = 0; i < a.length; i += S) {
    if (atF(a, i + 4) <= 0) continue;
    start[Math.floor(atF(a, i + 1) * 2) * hw + Math.floor(atF(a, i) * 2) + 1] = atMI(start, Math.floor(atF(a, i + 1) * 2) * hw + Math.floor(atF(a, i) * 2) + 1) + (1);
    live++;
  }
  for (let c = 0; c < cells; c++) start[c + 1] = atMI(start, c + 1) + (atMI(start, c));
  const fill = mut(new Int32Array(cells));
  const pos = mut(new Float32Array(live * 2));
  for (const a of agents) for (let i = 0; i < a.length; i += S) {
    if (atF(a, i + 4) <= 0) continue;
    const c = Math.floor(atF(a, i + 1) * 2) * hw + Math.floor(atF(a, i) * 2);
    const k = atMI(start, c) + atMI(fill, c);
    pos[k * 2] = atF(a, i);
    pos[k * 2 + 1] = atF(a, i + 1);
    fill[c] = atMI(fill, c) + (1);
  }
  return { start: freeze(start), pos: freeze(pos) };
};

// Bullets (x, y, vx, vy) binned by tile: start[t]..start[t+1] index list.
export const binsOf = (atF: AtF, atMI: AtM<Int32Array>) => (maze: Maze, bullets: Float32Array): Bins => {
  const n = bullets.length / 4, cells = maze.w * maze.h;
  const start = mut(new Int32Array(cells + 1));
  const list = mut(new Int32Array(n));
  const tileOf = mut(new Int32Array(n));
  for (let b = 0; b < n; b++) {
    const t = Math.floor(atF(bullets, b * 4 + 1)) * maze.w + Math.floor(atF(bullets, b * 4));
    tileOf[b] = t >= 0 && t < cells ? t : -1;
    if (atMI(tileOf, b) >= 0) start[atMI(tileOf, b) + 1] = atMI(start, atMI(tileOf, b) + 1) + (1);
  }
  for (let t = 0; t < cells; t++) start[t + 1] = atMI(start, t + 1) + (atMI(start, t));
  const fill = mut(new Int32Array(cells));
  for (let b = 0; b < n; b++) {
    const t = atMI(tileOf, b);
    if (t < 0) continue;
    list[atMI(start, t) + atMI(fill, t)] = b;
    fill[t] = atMI(fill, t) + (1);
  }
  return { start: freeze(start), list: freeze(list) };
};

// The kind a pair of agents is: 40% chevrons, 35% diamonds, 25% hexagons.
export const kindOf = (hash01: (seed: number, frame: number, agent: number, k: number) => number) => (seed: number, id: number): number => {
  const r = hash01(seed, 0, id >> 1, 11);
  return r < 0.4 ? 1 : r < 0.75 ? 0 : 2;
};

// Island inputs: placeholder cells, replaced by the arguments of the compiled function.
export const batch = (): Float32Array => new Float32Array(0);
export const base = () => 0;
export const frame = () => 0;
export const player = (): Float32Array => new Float32Array([80.5, 50.5]);
export const bullets = (): Float32Array => new Float32Array(0);
// x, y, radius, strength of this frame's shockwave; strength 0 when there is none
export const shock = (): Float32Array => new Float32Array(4);
// agents with a global index below active take part; the rest stay dormant
export const active = () => 0;
export const agents = (): readonly Float32Array[] => [];
// Per-frame inputs computed on the calling thread.
export const flow = (flowOf: (maze: Maze, player: Float32Array) => Float32Array, maze: Maze, player: Float32Array) => flowOf(maze, player);
export const crowd = (gridOf: (maze: Maze, agents: readonly Float32Array[]) => Float32Array, maze: Maze, agents: readonly Float32Array[]) => gridOf(maze, agents);
export const neigh = (neighOf: (maze: Maze, agents: readonly Float32Array[]) => Neigh, maze: Maze, agents: readonly Float32Array[]) => neighOf(maze, agents);
export const binned = (binsOf: (maze: Maze, bullets: Float32Array) => Bins, maze: Maze, bullets: Float32Array) => binsOf(maze, bullets);

// One batch, one frame. A live agent follows the flow field (bilinear over tile centres), is pushed
// apart from up to sepCap neighbours within sepR (last frame's positions, 3x3 half-tile cells)
// and slides along walls. Bullets in its 3x3 tiles and the
// shockwave damage it; touching the player pushes it back (a chevron explodes instead).
// hits holds triples (agent, cause, killed): cause is a bullet index, -1 contact, -2 shockwave.
export const stepBatch = (atF: AtF, atI: AtI, atU8: AtU8, hash01: (seed: number, frame: number, agent: number, k: number) => number, kindOf: (seed: number, id: number) => number, S: number, HOLD: number) => (
  batch: Float32Array, base: number, frame: number, field: Float32Array, neigh: Neigh, binned: Bins,
  bullets: Float32Array, player: Float32Array, shock: Float32Array, active: number, maze: Maze, params: Params,
): Stepped => {
  const w = maze.w, walls = maze.walls, dt = params.dt, hw = w * 2;
  const n = batch.length / S;
  const out = mut(new Float32Array(batch.length));
  // every hit is recorded: a fixed cap would make the result depend on how agents are batched
  const hits = mut<number[]>([]);
  const sepR = params.sepR, sepCap = params.sepCap, r2 = sepR * sepR;
  // this frame's player and shockwave, read once
  const plx = atF(player, 0), ply = atF(player, 1);
  const shx = atF(shock, 0), shy = atF(shock, 1), shr = atF(shock, 2), shs = atF(shock, 3);
  for (let a = 0; a < n; a++) {
    const o = a * S, id = base + a;
    const pairKind = kindOf(params.seed, id);
    const twin = pairKind === 0 && id % 2 === 1;
    let x = atF(batch, o), y = atF(batch, o + 1), vx = atF(batch, o + 2), vy = atF(batch, o + 3), life = atF(batch, o + 4);
    let kind = atF(batch, o + 5), hp = atF(batch, o + 6), flash = Math.max(0, Math.min(1, atF(batch, o + 7)) - dt * 4);
    if (life <= 0) {
      if (twin) {
        // a dormant twin wakes when its partner split last frame
        const p = o - S;
        if (atF(batch, p + 7) >= 2) {
          x = atF(batch, p); y = atF(batch, p + 1); vx = -atF(batch, p + 2); vy = -atF(batch, p + 3);
          life = 1; kind = 3; hp = 1; flash = 1;
        } else life = HOLD;
      } else if (id >= active) life = Math.min(life, HOLD);
      else {
        life += dt;
        if (life > 0) {
          const k = Math.floor(hash01(params.seed, frame, id, 0) * (maze.spawns.length / 2));
          x = atF(maze.spawns, k * 2) + (hash01(params.seed, frame, id, 1) - 0.5) * 2;
          y = atF(maze.spawns, k * 2 + 1) + (hash01(params.seed, frame, id, 2) - 0.5) * 2;
          vx = 0; vy = 0; life = 1;
          kind = pairKind;
          hp = kind === 2 ? 5 : 1;
          flash = 0;
        }
      }
      out[o] = x; out[o + 1] = y; out[o + 2] = vx; out[o + 3] = vy; out[o + 4] = life;
      out[o + 5] = kind; out[o + 6] = hp; out[o + 7] = flash;
      continue;
    }
    const speed = kind === 1 ? 5.2 : kind === 0 ? 3.0 : kind === 2 ? 1.8 : 4.4;
    // flow direction, bilinear over the four nearest tile centres
    const fx = x - 0.5, fy = y - 0.5;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const ax = fx - ix, ay = fy - iy;
    const i00 = (iy * w + ix) * 3, i10 = i00 + 3, i01 = i00 + w * 3, i11 = i01 + 3;
    let dx = (atF(field, i00 + 1) * (1 - ax) + atF(field, i10 + 1) * ax) * (1 - ay) + (atF(field, i01 + 1) * (1 - ax) + atF(field, i11 + 1) * ax) * ay;
    let dy = (atF(field, i00 + 2) * (1 - ax) + atF(field, i10 + 2) * ax) * (1 - ay) + (atF(field, i01 + 2) * (1 - ax) + atF(field, i11 + 2) * ax) * ay;
    const tx = Math.floor(x), ty = Math.floor(y), ti = ty * w + tx;
    if (atF(field, ti * 3) <= 1) { dx = plx - x; dy = ply - y; }
    const dl = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    // per-agent weave so the horde does not move in lockstep
    const wob = hash01(params.seed, frame >> 5, id, 3) - 0.5;
    const desx = (dx / dl - (dy / dl) * wob * 0.5) * speed, desy = (dy / dl + (dx / dl) * wob * 0.5) * speed;
    // separation: short-range repulsion from last frame's neighbours
    let sx = 0, sy = 0, seen = 0;
    const cx = Math.floor(x * 2), cy = Math.floor(y * 2);
    // the three cells of a row are adjacent in the counting sort, so one range covers each row
    for (let oy = -1; oy <= 1 && seen < sepCap; oy++) {
      const c = (cy + oy) * hw + cx;
      const j1 = atI(neigh.start, c + 2);
      for (let j = atI(neigh.start, c - 1); j < j1 && seen < sepCap; j++) {
        const ex = x - atF(neigh.pos, j * 2), ey = y - atF(neigh.pos, j * 2 + 1);
        const d2 = ex * ex + ey * ey;
        if (d2 >= r2) continue;
        if (d2 === 0) continue; // itself
        const d = Math.sqrt(d2);
        // overlap in tiles, along the line between the two
        const f = sepR - d;
        sx += (ex / d) * f;
        sy += (ey / d) * f;
        seen++;
      }
    }
    vx += ((desx - vx) * params.accel + sx * params.sepK) * dt;
    vy += ((desy - vy) * params.accel + sy * params.sepK) * dt;
    // and a direct position correction of half the summed overlap (each side of a pair moves half),
    // at most 0.12 tiles a frame, so a crowd packs instead of stacking
    const sl = Math.sqrt(sx * sx + sy * sy), corr = Math.min(0.12, sl * 0.5) / (sl + 1e-6);
    const cxp = sx * corr, cyp = sy * corr;
    // the shockwave: an outward kick, and 2 damage inside half its radius
    let shocked = false;
    if (shs > 0) {
      const qx = x - shx, qy = y - shy, qd = Math.sqrt(qx * qx + qy * qy) + 1e-6;
      if (qd < shr) {
        const f = (1 - qd / shr) * shs;
        vx += (qx / qd) * f;
        vy += (qy / qd) * f;
        shocked = qd < shr * 0.5;
      }
    }
    const sp = Math.sqrt(vx * vx + vy * vy), cap = shocked ? 30 : speed * 1.6;
    if (sp > cap) { vx = (vx / sp) * cap; vy = (vy / sp) * cap; }
    // walls: move one axis at a time, keeping a 0.2 tile margin
    const nx = x + vx * dt + cxp;
    const wx = Math.floor(nx + (nx > x ? 0.2 : -0.2));
    if (atU8(walls, ty * w + wx) === 1) vx *= -0.3; else x = nx;
    const ny = y + vy * dt + cyp;
    const wy = Math.floor(ny + (ny > y ? 0.2 : -0.2));
    if (atU8(walls, wy * w + Math.floor(x)) === 1) vy *= -0.3; else y = ny;
    // damage: bullets in the 3x3 tiles around, the shockwave, the player
    const hr = kind === 2 ? params.hitR * 1.4 : kind === 3 ? params.hitR * 0.8 : params.hitR;
    let cause = 0, damage = 0;
    for (let oy = -1; oy <= 1 && damage === 0; oy++) {
      const t = ti + oy * w;
      const j1 = atI(binned.start, t + 2);
      for (let j = atI(binned.start, t - 1); j < j1; j++) {
        const b = atI(binned.list, j);
        const ex = atF(bullets, b * 4) - x, ey = atF(bullets, b * 4 + 1) - y;
        if (ex * ex + ey * ey < hr * hr) { damage = 1; cause = b; break; }
      }
    }
    if (damage === 0 && shocked) { damage = 2; cause = -2; }
    const px = x - plx, py = y - ply, pd2 = px * px + py * py;
    if (damage === 0 && pd2 < 0.36) {
      cause = -1;
      if (kind === 1) damage = 99;
      else {
        const pd = Math.sqrt(pd2) + 1e-6;
        vx = (px / pd) * 8; vy = (py / pd) * 8;
        hits.push(id, -1, 0);
      }
    }
    if (damage > 0) {
      hp -= damage;
      flash = 1;
      const killed = hp <= 0;
      hits.push(id, cause, killed ? 1 : 0);
      if (killed && kind === 0) {
        // a diamond splits: it becomes the first shard now, its twin the second next frame
        kind = 3; hp = 1; flash = 2;
        const kx = -vy, ky = vx, kl = Math.sqrt(kx * kx + ky * ky) + 1e-6;
        vx = (kx / kl) * 6; vy = (ky / kl) * 6;
      } else if (killed) {
        life = -(params.respawnMin + hash01(params.seed, frame, id, 5) * (params.respawnMax - params.respawnMin));
      }
    }
    out[o] = x; out[o + 1] = y; out[o + 2] = vx; out[o + 3] = vy; out[o + 4] = life;
    out[o + 5] = kind; out[o + 6] = hp; out[o + 7] = flash;
  }
  return { agents: freeze(out), hits: Int32Array.from(freeze(hits)) };
};
type StepFn = (batch: Float32Array, base: number, frame: number, field: Float32Array, neigh: Neigh, binned: Bins,
  bullets: Float32Array, player: Float32Array, shock: Float32Array, active: number, maze: Maze, params: Params) => Stepped;
export const stepped = (stepBatch: StepFn, batch: Float32Array, base: number, frame: number, flow: Float32Array, neigh: Neigh,
  binned: Bins, bullets: Float32Array, player: Float32Array, shock: Float32Array, active: number, maze: Maze, params: Params) =>
  stepBatch(batch, base, frame, flow, neigh, binned, bullets, player, shock, active, maze, params);
export const nextAgents = (stepped: Stepped) => stepped.agents;
export const hits = (stepped: Stepped) => stepped.hits;

// Agents to start with: all dormant at spawn points with staggered countdowns; those below active
// count down and arrive over the first seconds.
export const initial = (atF: AtF, maze: Maze, params: Params, hash01: (seed: number, frame: number, agent: number, k: number) => number, S: number) => (n: number, from: number): Float32Array => {
  const out = mut(new Float32Array(n * S));
  for (let a = 0; a < n; a++) {
    const id = from + a;
    const k = Math.floor(hash01(params.seed, 0, id, 6) * (maze.spawns.length / 2));
    out[a * S] = atF(maze.spawns, k * 2) + (hash01(params.seed, 0, id, 7) - 0.5) * 2.6;
    out[a * S + 1] = atF(maze.spawns, k * 2 + 1) + (hash01(params.seed, 0, id, 8) - 0.5) * 2.6;
    out[a * S + 4] = -hash01(params.seed, 0, id, 9) * 4;
  }
  return freeze(out);
};

// The batch update as a function on the worker pool. The flow field, spatial hash and
// bullet bins are computed on the calling thread and passed in as inputs; maze and params are refs.
// The function cells are computed inside the island, since a function cannot be sent.
export const batchOnPool = (compile: Compile, pool: Pool) =>
  compile({
    inputs: ["batch", "base", "frame", "flow", "neigh", "binned", "bullets", "player", "shock", "active"],
    refs: ["maze", "params"],
    outputs: ["nextAgents", "hits"],
    options: { runtime: pool },
  });

// Replay: two runs from the same seed give bit-identical agents, split into batches two ways, with
// bullets and a shockwave so that hits, splits and respawns are exercised.
export const test_batches_do_not_matter = (maze: Maze, params: Params, initial: (n: number, from: number) => Float32Array, flowOf, neighOf, binsOf, stepBatch, S: number, atF: AtF) => {
  const run = (size: number): Float32Array => {
    let parts = Array.from({ length: 2048 / size }, (_, i) => initial(size, i * size));
    const pl = new Float32Array([80.5, 50.5]);
    const fl = flowOf(maze, pl);
    for (let f = 0; f < 240; f++) {
      const nb = neighOf(maze, parts);
      const bl = new Float32Array(Array.from({ length: 64 * 4 }, (_, i) => (i % 4 === 0 ? 70 + (i / 4) * 0.4 : i % 4 === 1 ? 50.5 : 0)));
      const bn = binsOf(maze, bl);
      const sh = new Float32Array([80.5, 50.5, 8, f % 60 === 0 ? 20 : 0]);
      parts = parts.map((p, i) => stepBatch(p, i * size, f, fl, nb, bn, bl, pl, sh, 2048, maze, params).agents);
    }
    const all = mut(new Float32Array(2048 * S));
    for (let i = 0; i < parts.length; i++) {
      const p = parts.at(i);
      if (p === undefined) throw new RangeError("part " + i);
      all.set(p, i * size * S);
    }
    return freeze(all);
  };
  const a = run(256), b = run(1024);
  for (let i = 0; i < a.length; i++) if (!Object.is(atF(a, i), atF(b, i))) throw new Error(`agent ${Math.floor(i / S)} field ${i % S} differs`);
  return "2048 agents, 240 frames with bullets and shockwaves: batches of 256 and 1024 agree bit for bit";
};
