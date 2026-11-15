// Main-thread half of the horde game: player, weapons, bullets, waves, health, score, and the ways of
// running sim.stepBatch: on the main thread, or on a worker pool with copied, transferred or shared
// (SharedArrayBuffer) data, or through SoundScript's own pool. Classic script (file:// cannot load
// module scripts or module workers). Defines makeEngine(opts) and hashAgents(chunks).
"use strict";

// The worker: the same hordeSim text the main thread runs, plus a message loop.
function hordeWorkerMain() {
  const sim = hordeSim();
  let flow = null, flowVersion = -1, shared = null;
  self.onmessage = (e) => {
    const m = e.data;
    if (m.init) { shared = m.init; return; }
    if (m.flow) { flow = m.flow; flowVersion = m.flowVersion; }
    const out = [], transfer = [], S = sim.S;
    if (m.sab) {
      const src = m.cur ? shared.b : shared.a, dst = m.cur ? shared.a : shared.b;
      const meta = new Int32Array(shared.meta);
      const fl = new Float32Array(shared.flow);
      const neigh = { start: new Int32Array(shared.nstart), pos: new Float32Array(shared.npos, 0, meta[2] * 2) };
      const bins = { start: new Int32Array(shared.start), list: new Int32Array(shared.list, 0, meta[0]) };
      const bullets = new Float32Array(shared.bullets, 0, meta[1] * 4);
      const player = new Float32Array(shared.player), shock = new Float32Array(shared.shock);
      for (const j of m.jobs) {
        const view = new Float32Array(src, j.base * S * 4, j.n * S);
        const r = sim.stepBatch(view, j.base, m.frame, fl, neigh, bins, bullets, player, shock, m.active, sim.maze, sim.params);
        new Float32Array(dst, j.base * S * 4, j.n * S).set(r.agents);
        out.push({ hits: r.hits });
      }
      self.postMessage({ id: m.id, out });
      return;
    }
    if (m.flowVersion !== flowVersion) throw new Error("flow not sent");
    for (const j of m.jobs) {
      const r = sim.stepBatch(j.agents, j.base, m.frame, flow, m.neigh, m.bins, m.bullets, m.player, m.shock, m.active, sim.maze, sim.params);
      out.push(r);
      if (m.transfer) transfer.push(r.agents.buffer, r.hits.buffer);
    }
    self.postMessage({ id: m.id, out }, transfer);
  };
}

let hordeWorkerUrl = null;
function makeWorkerUrl() {
  if (hordeWorkerUrl) return hordeWorkerUrl;
  const src = hordeSim.toString() + "\n(" + hordeWorkerMain.toString() + ")();";
  return (hordeWorkerUrl = URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
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

// opts: { n, mode: "main" | "copy" | "transfer" | "sab" | "lite", workers, input, bot, god, fullWave }
function makeEngine(opts) {
  const sim = hordeSim(), M = sim.maze, P = sim.params, S = sim.S;
  const N = opts.n;
  const MAXB = 4096;
  const START = [80.5, 50.5];
  const g = {}; // game state, reset by restart()
  let mode, W, per, ranges, chunks, workers = [], pending = new Map(), nextId = 0, sab = null, litePool = null, sentFlow = [];
  const events = []; // kills and impacts this frame, read by the renderer

  function restart() {
    Object.assign(g, {
      frame: 0, score: 0, health: 100, wave: opts.startWave || 1, waveStart: 0, over: false, paused: false,
      player: new Float32Array(START), aim: 0, bullets: new Float32Array(0), bulletAge: new Float32Array(0),
      charge: 0, cooldown: 0, shock: new Float32Array(4), shockFired: null, hurt: 0, kills: 0,
      flow: null, flowTile: -1, flowVersion: (g.flowVersion || 0) + 1, crowd: null, neigh: null,
    });
    const all = sim.initial(N, 0);
    if (ranges) chunks = splitAll(all);
    sentFlow = sentFlow.map(() => -1);
    if (sab) { new Float32Array(sab.a).set(all); sab.cur = 0; chunks = [new Float32Array(sab.a)]; }
    return all;
  }
  function splitAll(all) { return ranges.map((r) => all.slice(r.base * S, (r.base + r.n) * S)); }
  function joinAll() {
    if (chunks.length === 1 && chunks[0].length === N * S) return chunks[0].slice();
    const all = new Float32Array(N * S);
    ranges.forEach((r, i) => all.set(chunks[i], r.base * S));
    return all;
  }
  // (re)build the pool around the current agents; batch sizes are rounded to even so pairs stay together
  function configure(m, w) {
    const all = chunks ? joinAll() : restart();
    for (const x of workers) x.terminate();
    workers = []; pending = new Map(); sab = null;
    mode = m;
    if (mode === "lite") litePool = litePool || LITE.pagePool();
    W = mode === "main" ? 1 : mode === "lite" ? litePool.size : Math.max(1, w);
    per = Math.ceil(N / W / 2) * 2;
    ranges = Array.from({ length: W }, (_, i) => ({ base: i * per, n: Math.max(0, Math.min(per, N - i * per)) })).filter((r) => r.n > 0);
    chunks = splitAll(all);
    sentFlow = ranges.map(() => -1);
    if (mode === "copy" || mode === "transfer" || mode === "sab") {
      const url = makeWorkerUrl();
      workers = ranges.map(() => new Worker(url));
      for (const x of workers) x.onmessage = (e) => { const p = pending.get(e.data.id); pending.delete(e.data.id); p(e.data.out); };
    }
    if (mode === "sab") {
      if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedArrayBuffer unavailable (needs cross-origin isolation)");
      const cells = M.w * 2 * M.h * 2;
      sab = {
        a: new SharedArrayBuffer(N * S * 4), b: new SharedArrayBuffer(N * S * 4),
        flow: new SharedArrayBuffer(M.w * M.h * 12), nstart: new SharedArrayBuffer((cells + 1) * 4), npos: new SharedArrayBuffer(N * 8),
        start: new SharedArrayBuffer((M.w * M.h + 1) * 4), list: new SharedArrayBuffer(MAXB * 4),
        bullets: new SharedArrayBuffer(MAXB * 16), player: new SharedArrayBuffer(8), shock: new SharedArrayBuffer(16), meta: new SharedArrayBuffer(12),
      };
      new Float32Array(sab.a).set(all);
      sab.cur = 0;
      chunks = [new Float32Array(sab.a)];
      for (const x of workers) x.postMessage({ init: sab });
    }
  }
  const call = (w, msg, transfer) => new Promise((res) => { const id = nextId++; msg.id = id; pending.set(id, res); w.postMessage(msg, transfer || []); });

  const activeFor = (wave) => Math.min(N, Math.ceil((N * 0.1 * Math.pow(1.5, wave - 1)) / 2) * 2);
  const WAVE_SECONDS = 20;

  // the bot circles the central room, sprays at the densest tile in range, fires a shockwave every 5 s
  function botInput() {
    const t = g.frame / 60, pl = g.player;
    const k = { mx: 0, my: 0, aim: g.aim, fire: true, charge: false };
    const tx = 80.5 + 6 * Math.sin(t * 0.5), ty = 50.5 + 3.5 * Math.sin(t * 1.0);
    k.mx = Math.max(-1, Math.min(1, (tx - pl[0]) * 0.8)); k.my = Math.max(-1, Math.min(1, (ty - pl[1]) * 0.8));
    if (g.crowd) {
      let best = 0, bx = 0, by = 0;
      const px = Math.floor(pl[0]), py = Math.floor(pl[1]);
      for (let y = py - 12; y <= py + 12; y += 2) for (let x = px - 12; x <= px + 12; x += 2) {
        if (x < 0 || y < 0 || x >= M.w || y >= M.h) continue;
        const c = g.crowd[(y * M.w + x) * 3] / (1 + Math.hypot(x - px, y - py) * 0.3);
        if (c > best) { best = c; bx = x + 0.5; by = y + 0.5; }
      }
      if (best > 0) { const want = Math.atan2(by - pl[1], bx - pl[0]); k.aim = g.aim + Math.atan2(Math.sin(want - g.aim), Math.cos(want - g.aim)) * 0.15; }
    }
    k.charge = (g.frame % 300) > 240;
    return k;
  }

  function movePlayer(k) {
    const sp = 9 * P.dt, pl = g.player;
    const l = Math.hypot(k.mx, k.my) || 1;
    const nx = pl[0] + (k.mx / l) * sp, ny = pl[1] + (k.my / l) * sp;
    const ok = (x, y) => M.walls[Math.floor(y) * M.w + Math.floor(x)] === 0;
    const r = 0.3;
    if (ok(nx + Math.sign(k.mx) * r, pl[1] - r) && ok(nx + Math.sign(k.mx) * r, pl[1] + r)) pl[0] = nx;
    if (ok(pl[0] - r, ny + Math.sign(k.my) * r) && ok(pl[0] + r, ny + Math.sign(k.my) * r)) pl[1] = ny;
    g.aim = k.aim;
  }
  function moveBullets(fire) {
    const n0 = g.bullets.length / 4, add = fire && g.frame % 2 === 0 ? 7 : 0;
    const nb = new Float32Array(Math.min(MAXB, n0 + add) * 4), na = new Float32Array(nb.length / 4);
    let k = 0;
    const B = g.bullets;
    for (let b = 0; b < n0; b++) {
      if (g.bulletAge[b] < 0) continue; // spent on a hit
      const x = B[b * 4] + B[b * 4 + 2] * P.dt, y = B[b * 4 + 1] + B[b * 4 + 3] * P.dt;
      const age = g.bulletAge[b] + P.dt;
      if (age > 1.1 || M.walls[Math.floor(y) * M.w + Math.floor(x)] === 1) { if (events.length < 1024) events.push({ x, y, kind: -1, killed: 0 }); continue; }
      if (k >= nb.length / 4) break;
      nb[k * 4] = x; nb[k * 4 + 1] = y; nb[k * 4 + 2] = B[b * 4 + 2]; nb[k * 4 + 3] = B[b * 4 + 3]; na[k] = age; k++;
    }
    // spread shot: seven bullets over 0.5 rad
    for (let i = 0; i < add && k < nb.length / 4; i++) {
      const a = g.aim + (i - 3) * 0.08;
      nb[k * 4] = g.player[0] + Math.cos(a) * 0.6; nb[k * 4 + 1] = g.player[1] + Math.sin(a) * 0.6; nb[k * 4 + 2] = Math.cos(a) * 28; nb[k * 4 + 3] = Math.sin(a) * 28; na[k] = 0; k++;
    }
    g.bullets = nb.slice(0, k * 4); g.bulletAge = na.slice(0, k);
  }
  // hold to charge (up to 1 s), release to fire: radius 6..16 tiles; 3 s cooldown
  function weapons(k) {
    g.shock = new Float32Array(4);
    g.shockFired = null;
    g.cooldown = Math.max(0, g.cooldown - P.dt);
    if (k.charge && g.cooldown === 0) g.charge = Math.min(1, g.charge + P.dt);
    else if (g.charge > 0) {
      const r = 6 + 10 * g.charge, s = 30 + 30 * g.charge;
      g.shock = new Float32Array([g.player[0], g.player[1], r, s]);
      g.shockFired = { x: g.player[0], y: g.player[1], r, s: g.charge };
      g.charge = 0; g.cooldown = 3;
    }
  }

  const stats = { serial: 0, post: 0, round: 0, total: 0, active: 0 };
  let stepping = false;
  async function step() {
    stepping = true;
    try { return await stepInner(); } finally { stepping = false; }
  }
  async function stepInner() {
    const t0 = performance.now();
    events.length = 0;
    if (g.over || g.paused) { stats.serial = stats.post = stats.round = stats.total = 0; return stats; }
    const k = opts.input && opts.input.active ? opts.input : opts.bot ? botInput() : { mx: 0, my: 0, aim: g.aim, fire: false, charge: false };
    movePlayer(k);
    weapons(k);
    moveBullets(k.fire);
    if (g.frame - g.waveStart >= WAVE_SECONDS * 60 && !opts.fullWave) { g.wave++; g.waveStart = g.frame; }
    const active = opts.fullWave ? N : activeFor(g.wave);
    const tile = Math.floor(g.player[1]) * M.w + Math.floor(g.player[0]);
    if (tile !== g.flowTile) { g.flow = sim.flowOf(M, g.player); g.flowTile = tile; g.flowVersion++; }
    const flow = g.flow, player = g.player, bullets = g.bullets, shock = g.shock, frame = g.frame;
    if (opts.renderer !== false) g.crowd = sim.gridOf(M, chunks);
    const neigh = sim.neighOf(M, chunks);
    g.neigh = neigh;
    const bins = sim.binsOf(M, bullets);
    const t1 = performance.now();
    let results, t2;
    if (mode === "main") {
      results = [sim.stepBatch(chunks[0], 0, frame, flow, neigh, bins, bullets, player, shock, active, M, P)];
      t2 = performance.now();
      chunks = [results[0].agents];
    } else if (mode === "sab") {
      new Float32Array(sab.flow).set(flow);
      new Int32Array(sab.nstart).set(neigh.start); new Float32Array(sab.npos).set(neigh.pos);
      new Int32Array(sab.start).set(bins.start); new Int32Array(sab.list).set(bins.list);
      new Float32Array(sab.bullets).set(bullets); new Float32Array(sab.player).set(player); new Float32Array(sab.shock).set(shock);
      const meta = new Int32Array(sab.meta); meta[0] = bins.list.length; meta[1] = bullets.length / 4; meta[2] = neigh.pos.length / 2;
      const ps = ranges.map((r, i) => call(workers[i], { sab: true, cur: sab.cur, frame, active, jobs: [r] }));
      t2 = performance.now();
      const outs = await Promise.all(ps);
      sab.cur ^= 1;
      chunks = [new Float32Array(sab.cur ? sab.b : sab.a)];
      results = outs.map((o) => o[0]);
    } else if (mode === "lite") {
      const owner = { dead: false };
      const ps = ranges.map((r, i) => litePool.run({ ...LITE_JOB, values: { maze: M, params: P, batch: chunks[i], base: r.base, frame, flow, neigh, binned: bins, bullets, player, shock, active } }, owner));
      t2 = performance.now();
      const outs = await Promise.all(ps);
      results = outs.map((o) => ({ agents: o.nextAgents, hits: o.hits }));
      chunks = results.map((r) => r.agents);
    } else {
      const transfer = mode === "transfer";
      const ps = ranges.map((r, i) => {
        const msg = { frame, neigh, bins, bullets, player, shock, active, flowVersion: g.flowVersion, transfer, jobs: [{ base: r.base, agents: chunks[i] }] };
        if (sentFlow[i] !== g.flowVersion) { msg.flow = flow; sentFlow[i] = g.flowVersion; }
        return call(workers[i], msg, transfer ? [chunks[i].buffer] : []);
      });
      t2 = performance.now();
      const outs = await Promise.all(ps);
      results = outs.map((o) => o[0]);
      chunks = results.map((r) => r.agents);
    }
    const t3 = performance.now();
    // hits: (agent, cause, killed). Each bullet is spent once; contact costs health; kills score.
    let contacts = 0, blasts = 0;
    for (const r of results) for (let i = 0; i < r.hits.length; i += 3) {
      const id = r.hits[i], cause = r.hits[i + 1], killed = r.hits[i + 2];
      if (cause >= 0 && g.bulletAge[cause] >= 0) g.bulletAge[cause] = -1;
      if (cause === -1) { if (killed) blasts++; else contacts++; }
      if (killed) {
        g.score += cause === -1 ? 0 : 10;
        g.kills++;
        if (events.length < 1024) { const c = locate(id); events.push({ x: c.arr[c.off], y: c.arr[c.off + 1], kind: c.arr[c.off + 5], killed: 1, cause }); }
      }
    }
    if (!opts.god) g.health = Math.max(0, Math.min(100, g.health - contacts * 0.25 - blasts * 3 + P.dt * 1.5));
    g.hurt = Math.min(1, Math.max(0, g.hurt - P.dt * 3) + (contacts + blasts > 0 ? 0.5 : 0));
    if (g.health <= 0) g.over = true;
    g.frame++;
    const t4 = performance.now();
    stats.serial = t1 - t0 + (t4 - t3); stats.post = t2 - t1; stats.round = t3 - t1; stats.total = t4 - t0; stats.active = active;
    return stats;
  }
  function locate(id) {
    if (mode === "sab" || mode === "main") return { arr: chunks[0], off: id * S };
    const i = Math.floor(id / per);
    return { arr: chunks[i], off: (id - i * per) * S };
  }
  function close() { for (const w of workers) w.terminate(); workers = []; }

  configure(opts.mode || "main", opts.workers || 1);
  return {
    sim, maze: M, S, N, step, close, stats, events, configure, restart,
    get mode() { return mode; }, get stepping() { return stepping; }, get poolSize() { return mode === "main" ? 0 : ranges.length; },
    get chunks() { return chunks; }, get ranges() { return mode === "sab" ? [{ base: 0, n: N }] : ranges; },
    get flow() { return g.flow; }, get crowd() { return g.crowd; },
    get bullets() { return g.bullets; }, get player() { return g.player; }, get frame() { return g.frame; },
    get score() { return g.score; }, get kills() { return g.kills; }, get aim() { return g.aim; }, get health() { return g.health; },
    get wave() { return g.wave; }, get waveLeft() { return WAVE_SECONDS - (g.frame - g.waveStart) / 60; }, get over() { return g.over; },
    get paused() { return g.paused; }, set paused(v) { g.paused = v; }, get charge() { return g.charge; }, get cooldown() { return g.cooldown; },
    get shockFired() { return g.shockFired; }, get hurt() { return g.hurt; }, get active() { return opts.fullWave ? N : activeFor(g.wave); },
    hash: () => hashAgents(mode === "sab" ? chunks : chunks) + ":" + hashAgents([g.bullets]),
  };
}
