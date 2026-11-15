// Horde shooter simulation as SoundScript cells. Every cell is a pure function of its parameters;
// typed arrays are made with mut(...), written locally, and frozen on return.
// gen.ts erases this file into proto/sim.gen.js, which the benchmark and the renderer run, so the
// code measured is the code checked.
//
// Units are tiles. An agent is 5 floats: x, y, vx, vy, life (life > 0 alive; life <= 0 a respawn
// countdown in seconds). A batch is a Float32Array of 5 * n floats; `base` is the global index of its
// first agent, which is all that random numbers depend on, so results do not depend on how agents
// are split into batches or which worker runs a batch.

type Params = {
  readonly seed: number;
  readonly dt: number;
  readonly cellsW: number;
  readonly cellsH: number;
  readonly cell: number;
  readonly braid: number;
  readonly accel: number;
  readonly press: number;
  readonly align: number;
  readonly hitR: number;
  readonly respawnMin: number;
  readonly respawnMax: number;
};
type Maze = { readonly w: number; readonly h: number; readonly walls: Uint8Array; readonly spawns: Float32Array };
type Bins = { readonly start: Int32Array; readonly list: Int32Array };
type Stepped = { readonly agents: Float32Array; readonly hits: Int32Array };

export const params = (): Params => ({
  seed: 1234567,
  dt: 1 / 60,
  cellsW: 24,
  cellsH: 15,
  cell: 4,
  braid: 0.22,
  accel: 5,
  press: 0.9,
  align: 1.2,
  hitR: 0.45,
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
export const maze = (params: Params, xs32: (s: number) => number): Maze => {
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
    const cur = stack[top];
    const cx = cur % cw, cy = Math.floor(cur / cw);
    let options = 0;
    let pick = -1;
    for (let d = 0; d < 4; d++) {
      const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || seen[ny * cw + nx] === 1) continue;
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
export const flowOf = () => (maze: Maze, player: Float32Array): Float32Array => {
  const w = maze.w, h = maze.h, walls = maze.walls;
  const dist = mut(new Float32Array(w * h));
  dist.fill(1e9);
  const queue = mut(new Int32Array(w * h));
  const px = Math.max(1, Math.min(w - 2, Math.floor(player[0])));
  const py = Math.max(1, Math.min(h - 2, Math.floor(player[1])));
  let head = 0, tail = 0;
  if (walls[py * w + px] === 0) { dist[py * w + px] = 0; queue[tail] = py * w + px; tail++; }
  while (head < tail) {
    const i = queue[head];
    head++;
    const d = dist[i] + 1;
    const n0 = i + 1, n1 = i - 1, n2 = i + w, n3 = i - w;
    if (walls[n0] === 0 && dist[n0] > d) { dist[n0] = d; queue[tail] = n0; tail++; }
    if (walls[n1] === 0 && dist[n1] > d) { dist[n1] = d; queue[tail] = n1; tail++; }
    if (walls[n2] === 0 && dist[n2] > d) { dist[n2] = d; queue[tail] = n2; tail++; }
    if (walls[n3] === 0 && dist[n3] > d) { dist[n3] = d; queue[tail] = n3; tail++; }
  }
  const out = mut(new Float32Array(w * h * 3));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    out[i * 3] = dist[i];
    if (walls[i] === 1 || dist[i] >= 1e9) continue;
    let best = dist[i], bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;
      const j = i + oy * w + ox;
      if (walls[j] === 1) continue;
      if (ox !== 0 && oy !== 0 && (walls[i + ox] === 1 || walls[i + oy * w] === 1)) continue;
      const len = ox !== 0 && oy !== 0 ? 1.4142 : 1;
      const v = dist[j] + (len - 1) * 0.5;
      if (v < best) { best = v; bx = ox / len; by = oy / len; }
    }
    out[i * 3 + 1] = bx;
    out[i * 3 + 2] = by;
  }
  return freeze(out);
};

// The coarse neighbour grid from last frame's agents: per tile, count and summed velocity of the
// live agents in it. Batches read only these aggregates, never other agents' arrays.
export const gridOf = () => (maze: Maze, agents: readonly Float32Array[]): Float32Array => {
  const w = maze.w, h = maze.h;
  const g = mut(new Float32Array(w * h * 3));
  for (const a of agents) {
    for (let i = 0; i < a.length; i += 5) {
      if (a[i + 4] <= 0) continue;
      const t = (Math.floor(a[i + 1]) * w + Math.floor(a[i])) * 3;
      g[t] += 1;
      g[t + 1] += a[i + 2];
      g[t + 2] += a[i + 3];
    }
  }
  return freeze(g);
};

// Bullets (x, y, vx, vy) binned by tile: start[t]..start[t+1] index list.
export const binsOf = () => (maze: Maze, bullets: Float32Array): Bins => {
  const n = bullets.length / 4, cells = maze.w * maze.h;
  const start = mut(new Int32Array(cells + 1));
  const list = mut(new Int32Array(n));
  const tileOf = mut(new Int32Array(n));
  for (let b = 0; b < n; b++) {
    const t = Math.floor(bullets[b * 4 + 1]) * maze.w + Math.floor(bullets[b * 4]);
    tileOf[b] = t >= 0 && t < cells ? t : -1;
    if (tileOf[b] >= 0) start[tileOf[b] + 1] += 1;
  }
  for (let t = 0; t < cells; t++) start[t + 1] += start[t];
  const fill = mut(new Int32Array(cells));
  for (let b = 0; b < n; b++) {
    const t = tileOf[b];
    if (t < 0) continue;
    list[start[t] + fill[t]] = b;
    fill[t] += 1;
  }
  return { start: freeze(start), list: freeze(list) };
};

// Island inputs: placeholder cells, replaced by the arguments of the compiled function.
export const batch = (): Float32Array => new Float32Array(0);
export const base = () => 0;
export const frame = () => 0;
export const player = (): Float32Array => new Float32Array([48.5, 30.5]);
export const bullets = (): Float32Array => new Float32Array(0);
export const agents = (): readonly Float32Array[] => [];
// Per-frame inputs computed on the calling thread.
export const flow = (flowOf: (maze: Maze, player: Float32Array) => Float32Array, maze: Maze, player: Float32Array) => flowOf(maze, player);
export const crowd = (gridOf: (maze: Maze, agents: readonly Float32Array[]) => Float32Array, maze: Maze, agents: readonly Float32Array[]) => gridOf(maze, agents);
export const binned = (binsOf: (maze: Maze, bullets: Float32Array) => Bins, maze: Maze, bullets: Float32Array) => binsOf(maze, bullets);

// One batch, one frame. Steering: follow the flow field (bilinear over tile centres), push down the
// crowd density gradient, match the tile's mean velocity, slide along walls. A live agent within hitR
// of a bullet in its 3x3 tiles dies and records (global index, bullet index); a dead one counts down
// and respawns at a seeded spawn point.
export const stepBatch = (hash01: (seed: number, frame: number, agent: number, k: number) => number) => (
  batch: Float32Array, base: number, frame: number, field: Float32Array, crowd: Float32Array, binned: Bins,
  bullets: Float32Array, player: Float32Array, maze: Maze, params: Params,
): Stepped => {
  const w = maze.w, walls = maze.walls, dt = params.dt;
  const n = batch.length / 5;
  const out = mut(new Float32Array(batch.length));
  // every hit is recorded: a fixed cap would make the result depend on how agents are batched
  const hits = mut<number[]>([]);
  const density = (tx: number, ty: number): number => crowd[(ty * w + tx) * 3];
  for (let a = 0; a < n; a++) {
    const o = a * 5, id = base + a;
    let x = batch[o], y = batch[o + 1], vx = batch[o + 2], vy = batch[o + 3], life = batch[o + 4];
    if (life <= 0) {
      life += dt;
      if (life > 0) {
        const k = Math.floor(hash01(params.seed, frame, id, 0) * (maze.spawns.length / 2));
        x = maze.spawns[k * 2] + (hash01(params.seed, frame, id, 1) - 0.5) * 2;
        y = maze.spawns[k * 2 + 1] + (hash01(params.seed, frame, id, 2) - 0.5) * 2;
        vx = 0;
        vy = 0;
        life = 1;
      }
      out[o] = x; out[o + 1] = y; out[o + 2] = vx; out[o + 3] = vy; out[o + 4] = life;
      continue;
    }
    const kind = id % 3;
    const speed = kind === 0 ? 3.2 : kind === 1 ? 4.6 : 2.4;
    // flow direction, bilinear over the four nearest tile centres
    const fx = x - 0.5, fy = y - 0.5;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const ax = fx - ix, ay = fy - iy;
    const i00 = (iy * w + ix) * 3, i10 = i00 + 3, i01 = i00 + w * 3, i11 = i01 + 3;
    let dx = (field[i00 + 1] * (1 - ax) + field[i10 + 1] * ax) * (1 - ay) + (field[i01 + 1] * (1 - ax) + field[i11 + 1] * ax) * ay;
    let dy = (field[i00 + 2] * (1 - ax) + field[i10 + 2] * ax) * (1 - ay) + (field[i01 + 2] * (1 - ax) + field[i11 + 2] * ax) * ay;
    const tx = Math.floor(x), ty = Math.floor(y), ti = ty * w + tx;
    if (field[ti * 3] <= 1) { dx = player[0] - x; dy = player[1] - y; }
    const dl = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    // jitter per agent so the horde does not move in lockstep
    const wob = hash01(params.seed, frame >> 4, id, 3) - 0.5;
    const desx = (dx / dl - (dy / dl) * wob * 0.6) * speed, desy = (dy / dl + (dx / dl) * wob * 0.6) * speed;
    // crowd pressure: density difference across neighbouring tiles
    const c0 = density(tx, ty);
    const gx = density(tx + 1, ty) - density(tx - 1, ty);
    const gy = density(tx, ty + 1) - density(tx, ty - 1);
    const sub = hash01(params.seed, frame, id, 4) - 0.5;
    const px = -gx * params.press + (x - tx - 0.5) * c0 * 0.6 + sub * c0 * 0.2;
    const py = -gy * params.press + (y - ty - 0.5) * c0 * 0.6 - sub * c0 * 0.2;
    // alignment with the tile's mean velocity
    const mvx = c0 > 0 ? crowd[ti * 3 + 1] / c0 : vx, mvy = c0 > 0 ? crowd[ti * 3 + 2] / c0 : vy;
    vx += ((desx - vx) * params.accel + (mvx - vx) * params.align + px) * dt;
    vy += ((desy - vy) * params.accel + (mvy - vy) * params.align + py) * dt;
    const sp = Math.sqrt(vx * vx + vy * vy), cap = speed * 1.6;
    if (sp > cap) { vx = (vx / sp) * cap; vy = (vy / sp) * cap; }
    // walls: move one axis at a time, keeping a 0.2 tile margin
    const nx = x + vx * dt;
    const sx = Math.floor(nx + (vx > 0 ? 0.2 : -0.2));
    if (walls[ty * w + sx] === 1) vx *= -0.3; else x = nx;
    const ny = y + vy * dt;
    const sy = Math.floor(ny + (vy > 0 ? 0.2 : -0.2));
    if (walls[sy * w + Math.floor(x)] === 1) vy *= -0.3; else y = ny;
    // bullets in the 3x3 tiles around
    for (let oy = -1; oy <= 1 && life > 0; oy++) for (let ox = -1; ox <= 1 && life > 0; ox++) {
      const t = ti + oy * w + ox;
      for (let j = binned.start[t]; j < binned.start[t + 1]; j++) {
        const b = binned.list[j];
        const ex = bullets[b * 4] - x, ey = bullets[b * 4 + 1] - y;
        if (ex * ex + ey * ey < params.hitR * params.hitR) {
          life = -(params.respawnMin + hash01(params.seed, frame, id, 5) * (params.respawnMax - params.respawnMin));
          hits.push(id, b);
          break;
        }
      }
    }
    out[o] = x; out[o + 1] = y; out[o + 2] = vx; out[o + 3] = vy; out[o + 4] = life;
  }
  return { agents: freeze(out), hits: Int32Array.from(freeze(hits)) };
};
export const stepped = (stepBatch: (batch: Float32Array, base: number, frame: number, field: Float32Array, crowd: Float32Array, binned: Bins, bullets: Float32Array, player: Float32Array, maze: Maze, params: Params) => Stepped,
  batch: Float32Array, base: number, frame: number, flow: Float32Array, crowd: Float32Array, binned: Bins, bullets: Float32Array, player: Float32Array, maze: Maze, params: Params) =>
  stepBatch(batch, base, frame, flow, crowd, binned, bullets, player, maze, params);
export const nextAgents = (stepped: Stepped) => stepped.agents;
export const hits = (stepped: Stepped) => stepped.hits;

// Agents to start with: n agents at spawn points, alive, staggered so they do not arrive at once.
export const initial = (maze: Maze, params: Params, hash01: (seed: number, frame: number, agent: number, k: number) => number) => (n: number, from: number): Float32Array => {
  const out = mut(new Float32Array(n * 5));
  for (let a = 0; a < n; a++) {
    const id = from + a;
    const k = Math.floor(hash01(params.seed, 0, id, 6) * (maze.spawns.length / 2));
    out[a * 5] = maze.spawns[k * 2] + (hash01(params.seed, 0, id, 7) - 0.5) * 2.6;
    out[a * 5 + 1] = maze.spawns[k * 2 + 1] + (hash01(params.seed, 0, id, 8) - 0.5) * 2.6;
    out[a * 5 + 4] = -hash01(params.seed, 0, id, 9) * 4;
  }
  return freeze(out);
};

// The batch update as a function on the worker pool. The flow field, crowd grid and bullet bins are
// computed on the calling thread and passed in as inputs; maze and params are refs. The function
// cells (xs32, hash01, stepBatch) are computed inside the island, since a function cannot be sent.
export const batchOnPool = (compile: Compile, pool: Pool) =>
  compile({
    inputs: ["batch", "base", "frame", "flow", "crowd", "binned", "bullets", "player"],
    refs: ["maze", "params"],
    outputs: ["nextAgents", "hits"],
    options: { runtime: pool },
  });

// Replay: two runs from the same seed give bit-identical agents, split into batches two ways.
export const test_batches_do_not_matter = (maze: Maze, params: Params, initial: (n: number, from: number) => Float32Array, flowOf, gridOf, binsOf, stepBatch) => {
  const run = (size: number) => {
    let parts = Array.from({ length: 2048 / size }, (_, i) => initial(size, i * size));
    const pl = new Float32Array([48.5, 30.5]);
    const none = new Float32Array(0);
    for (let f = 0; f < 120; f++) {
      const fl = flowOf(maze, pl);
      const g = gridOf(maze, parts);
      const bn = binsOf(maze, none);
      parts = parts.map((p, i) => stepBatch(p, i * size, f, fl, g, bn, none, pl, maze, params).agents);
    }
    return parts;
  };
  const a = run(256), b = run(1024);
  for (let i = 0; i < 2048; i++) {
    const pa = a[Math.floor(i / 256)], pb = b[Math.floor(i / 1024)];
    const oa = (i % 256) * 5, ob = (i % 1024) * 5;
    for (let k = 0; k < 5; k++) if (!Object.is(pa[oa + k], pb[ob + k])) throw new Error(`agent ${i} field ${k} differs`);
  }
  return "2048 agents, 120 frames: batches of 256 and 1024 agree bit for bit";
};
