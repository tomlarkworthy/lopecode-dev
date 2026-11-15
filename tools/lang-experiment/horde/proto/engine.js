// Main-thread half of the horde prototype: player, bullets, hits, score, and the three ways of running
// sim.stepBatch on a worker pool. Classic script (file:// cannot load module scripts or module workers).
// Defines makeEngine(opts) and hashAgents(chunks).
"use strict";

// The worker: the same hordeSim text the main thread runs, plus a message loop.
function hordeWorkerMain() {
  const sim = hordeSim();
  let flow = null, flowVersion = -1, shared = null;
  self.onmessage = (e) => {
    const m = e.data;
    if (m.init) { shared = m.init; return; }
    if (m.flow) { flow = m.flow; flowVersion = m.flowVersion; }
    const bins = { start: m.start, list: m.list };
    const out = [], transfer = [];
    if (m.sab) {
      const cur = m.cur, src = cur ? shared.b : shared.a, dst = cur ? shared.a : shared.b;
      const meta = new Int32Array(shared.meta);
      const fl = new Float32Array(shared.flow), crowd = new Float32Array(shared.crowd);
      const start = new Int32Array(shared.start), list = new Int32Array(shared.list, 0, meta[0]);
      const bullets = new Float32Array(shared.bullets, 0, meta[1] * 4);
      const player = new Float32Array(shared.player);
      for (const j of m.jobs) {
        const view = new Float32Array(src, j.base * 20, j.n * 5);
        const r = sim.stepBatch(view, j.base, m.frame, fl, crowd, { start, list }, bullets, player, sim.maze, sim.params);
        new Float32Array(dst, j.base * 20, j.n * 5).set(r.agents);
        out.push({ hits: r.hits });
      }
      self.postMessage({ id: m.id, out });
      return;
    }
    if (m.flowVersion !== flowVersion) throw new Error("flow not sent");
    for (const j of m.jobs) {
      const r = sim.stepBatch(j.agents, j.base, m.frame, flow, m.crowd, bins, m.bullets, m.player, sim.maze, sim.params);
      out.push(r);
      if (m.transfer) transfer.push(r.agents.buffer, r.hits.buffer);
    }
    self.postMessage({ id: m.id, out }, transfer);
  };
}

function makeWorkerUrl() {
  const src = hordeSim.toString() + "\n(" + hordeWorkerMain.toString() + ")();";
  return URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
}

// FNV-1a over the bits of every agent float, in global order.
function hashAgents(chunks) {
  let h = 0x811c9dc5;
  for (const c of chunks) {
    const u = new Uint32Array(c.buffer, c.byteOffset, c.length);
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; }
  }
  return h.toString(16).padStart(8, "0");
}

// opts: { n, mode: "main" | "copy" | "transfer" | "sab", workers, bot: true, input }
function makeEngine(opts) {
  const sim = hordeSim(), M = sim.maze, P = sim.params;
  const N = opts.n, mode = opts.mode || "main";
  const litePool = mode === "lite" ? LITE.pagePool() : null;
  const W = mode === "main" ? 1 : mode === "lite" ? litePool.size : opts.workers;
  const per = Math.ceil(N / W);
  const ranges = Array.from({ length: W }, (_, i) => ({ base: i * per, n: Math.max(0, Math.min(per, N - i * per)) })).filter((r) => r.n > 0);
  let chunks = ranges.map((r) => sim.initial(r.n, r.base));
  const player = new Float32Array([48.5, 30.5]);
  const MAXB = 4096;
  let bullets = new Float32Array(0); // x, y, vx, vy
  let bulletAge = new Float32Array(0);
  let frame = 0, score = 0, flowVersion = 0, flowTile = -1, flow = null, sentFlow = new Array(W).fill(-1);
  const events = []; // { x, y, frame } for each kill this frame, read by the renderer
  let aim = 0, lastCrowd = null;

  // pools
  let workers = [], pending = new Map(), nextId = 0, sab = null;
  if (mode !== "main" && mode !== "lite") {
    const url = makeWorkerUrl();
    workers = ranges.map(() => new Worker(url));
    for (const w of workers) w.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); p(e.data.out); };
    if (mode === "sab") {
      if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedArrayBuffer unavailable (needs cross-origin isolation)");
      sab = {
        a: new SharedArrayBuffer(N * 20), b: new SharedArrayBuffer(N * 20),
        flow: new SharedArrayBuffer(M.w * M.h * 12), crowd: new SharedArrayBuffer(M.w * M.h * 12),
        start: new SharedArrayBuffer((M.w * M.h + 1) * 4), list: new SharedArrayBuffer(MAXB * 4),
        bullets: new SharedArrayBuffer(MAXB * 16), player: new SharedArrayBuffer(8), meta: new SharedArrayBuffer(8),
      };
      const A = new Float32Array(sab.a);
      chunks.forEach((c, i) => A.set(c, ranges[i].base * 5));
      sab.cur = 0;
      chunks = [A];
      for (const w of workers) w.postMessage({ init: sab });
    }
  }
  const call = (w, msg, transfer) => new Promise((res) => { const id = nextId++; msg.id = id; pending.set(id, res); w.postMessage(msg, transfer || []); });

  // player: the bot walks a figure of eight in the central room and sprays bullets; input overrides
  function movePlayer() {
    const t = frame / 60;
    if (opts.input && opts.input.active) {
      const k = opts.input;
      const sp = 9 * P.dt;
      let nx = player[0] + k.mx * sp, ny = player[1] + k.my * sp;
      if (M.walls[Math.floor(player[1]) * M.w + Math.floor(nx + Math.sign(k.mx) * 0.3)] === 0) player[0] = nx;
      if (M.walls[Math.floor(ny + Math.sign(k.my) * 0.3) * M.w + Math.floor(player[0])] === 0) player[1] = ny;
      aim = k.aim;
      return k.fire;
    }
    player[0] = 48.5 + 5.5 * Math.sin(t * 0.7);
    player[1] = 30.5 + 3.5 * Math.sin(t * 1.4);
    aim = t * 2.3;
    return opts.bot !== false;
  }
  function moveBullets(fire) {
    const n0 = bullets.length / 4;
    const add = fire ? 3 : 0;
    const nb = new Float32Array(Math.min(MAXB, n0 + add) * 4), na = new Float32Array(nb.length / 4);
    let k = 0;
    for (let b = 0; b < n0; b++) {
      if (bulletAge[b] < 0) continue; // spent on a hit
      const x = bullets[b * 4] + bullets[b * 4 + 2] * P.dt, y = bullets[b * 4 + 1] + bullets[b * 4 + 3] * P.dt;
      const age = bulletAge[b] + P.dt;
      if (age > 1.4 || M.walls[Math.floor(y) * M.w + Math.floor(x)] === 1) { if (events.length < 512) events.push({ x, y, kind: 1 }); continue; }
      if (k >= nb.length / 4) break;
      nb[k * 4] = x; nb[k * 4 + 1] = y; nb[k * 4 + 2] = bullets[b * 4 + 2]; nb[k * 4 + 3] = bullets[b * 4 + 3]; na[k] = age; k++;
    }
    for (let i = 0; i < add && k < nb.length / 4; i++) {
      const a = aim + (i - 1) * 0.09;
      nb[k * 4] = player[0] + Math.cos(a) * 0.7; nb[k * 4 + 1] = player[1] + Math.sin(a) * 0.7; nb[k * 4 + 2] = Math.cos(a) * 26; nb[k * 4 + 3] = Math.sin(a) * 26; na[k] = 0; k++;
    }
    bullets = nb.slice(0, k * 4); bulletAge = na.slice(0, k);
  }

  const stats = { serial: 0, post: 0, round: 0, total: 0 };
  async function step() {
    const t0 = performance.now();
    events.length = 0;
    const fire = movePlayer();
    moveBullets(fire);
    const tile = Math.floor(player[1]) * M.w + Math.floor(player[0]);
    if (tile !== flowTile) { flow = sim.flowOf(M, player); flowTile = tile; flowVersion++; }
    const crowd = sim.gridOf(M, chunks);
    lastCrowd = crowd;
    const bins = sim.binsOf(M, bullets);
    const t1 = performance.now();
    let results, t2;
    if (mode === "main") {
      results = [sim.stepBatch(chunks[0], 0, frame, flow, crowd, bins, bullets, player, M, P)];
      t2 = performance.now();
    } else if (mode === "sab") {
      new Float32Array(sab.flow).set(flow); new Float32Array(sab.crowd).set(crowd);
      new Int32Array(sab.start).set(bins.start); new Int32Array(sab.list).set(bins.list);
      new Float32Array(sab.bullets).set(bullets); new Float32Array(sab.player).set(player);
      const meta = new Int32Array(sab.meta); meta[0] = bins.list.length; meta[1] = bullets.length / 4;
      const ps = ranges.map((r, i) => call(workers[i], { sab: true, cur: sab.cur, frame, jobs: [r] }));
      t2 = performance.now();
      const outs = await Promise.all(ps);
      sab.cur ^= 1;
      chunks = [new Float32Array(sab.cur ? sab.b : sab.a)];
      results = outs.map((o) => o[0]);
    } else if (mode === "lite") {
      const owner = { dead: false };
      const ps = ranges.map((r, i) => litePool.run({ ...LITE_JOB, values: { maze: M, params: P, batch: chunks[i], base: r.base, frame, flow, crowd, binned: bins, bullets, player } }, owner));
      t2 = performance.now();
      const outs = await Promise.all(ps);
      results = outs.map((o) => ({ agents: o.nextAgents, hits: o.hits }));
      chunks = results.map((r) => r.agents);
    } else {
      const transfer = mode === "transfer";
      const ps = ranges.map((r, i) => {
        const msg = { frame, crowd, start: bins.start, list: bins.list, bullets, player, flowVersion, transfer, jobs: [{ base: r.base, agents: chunks[i] }] };
        if (sentFlow[i] !== flowVersion) { msg.flow = flow; sentFlow[i] = flowVersion; }
        return call(workers[i], msg, transfer ? [chunks[i].buffer] : []);
      });
      t2 = performance.now();
      const outs = await Promise.all(ps);
      results = outs.map((o) => o[0]);
      chunks = results.map((r) => r.agents);
    }
    if (mode === "main") chunks = [results[0].agents];
    const t3 = performance.now();
    // hits: each bullet is spent once, in global agent order; every agent that hit something died
    for (const r of results) for (let i = 0; i < r.hits.length; i += 2) {
      const id = r.hits[i], b = r.hits[i + 1];
      if (bulletAge[b] >= 0) bulletAge[b] = -1;
      score++;
      if (events.length < 512) {
        const c = locate(id);
        events.push({ x: c.arr[c.off], y: c.arr[c.off + 1], kind: 0, id });
      }
    }
    frame++;
    const t4 = performance.now();
    stats.serial = t1 - t0 + (t4 - t3); stats.post = t2 - t1; stats.round = t3 - t1; stats.total = t4 - t0;
    return stats;
  }
  function locate(id) {
    if (mode === "sab" || mode === "main") return { arr: chunks[0], off: id * 5 };
    const i = Math.floor(id / per);
    return { arr: chunks[i], off: (id - i * per) * 5 };
  }
  function close() { for (const w of workers) w.terminate(); }
  return {
    sim, maze: M, step, close, stats, events,
    poolSize: mode === "main" ? 0 : ranges.length,
    get chunks() { return chunks; }, get ranges() { return mode === "sab" ? [{ base: 0, n: N }] : ranges; },
    get flow() { return flow; }, get crowd() { return lastCrowd; },
    get bullets() { return bullets; }, get player() { return player; }, get frame() { return frame; }, get score() { return score; }, get aim() { return aim; },
    hash: () => hashAgents(chunks) + ":" + hashAgents([bullets]),
  };
}
