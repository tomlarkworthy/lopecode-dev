const _t00 = function _1(md){return(
md`# Liquid timer

The desk toy: a sealed tube of oil with a heavier green liquid in it. Turn it over and the green drips through a nozzle, falls in drops onto a paddle wheel, spins it, pools on the next shelf and drips again, until it has all run to the bottom. Then you turn it over again.

Press **flip**, or drag the tube round with the pointer. On a phone the tube follows the phone: tilt it, and turn it over to restart.`
)};
const _t01 = function _stage(DOM,width,geometry)
{
  const G = geometry;
  const S = Math.min((width * 0.9) / G.width, 720 / G.height);
  const pad = 0.12 * S;
  const w = Math.round(G.width * S + 2 * pad);
  const h = Math.round(G.height * S + 2 * pad);
  const dpr = devicePixelRatio;
  const back = DOM.canvas(w * dpr, h * dpr);
  const glass = DOM.canvas(w * dpr, h * dpr);
  for (const c of [back, glass]) {
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.style.position = "absolute";
    c.style.left = "0";
    c.style.top = "0";
  }
  const tube = document.createElement("div");
  tube.style.cssText = `position: relative; width: ${w}px; height: ${h}px; touch-action: none; user-select: none; transform-origin: 50% 50%;`;
  const gloss = document.createElement("div");
  gloss.style.cssText = `position: absolute; left: ${pad}px; top: ${pad}px; width: ${G.width * S}px; height: ${G.height * S}px; pointer-events: none;
    background: linear-gradient(90deg, rgba(255,255,255,0) 6%, rgba(255,255,255,0.45) 11%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.2) 90%, rgba(255,255,255,0) 96%);`;
  tube.append(back, glass, gloss);
  const root = document.createElement("div");
  root.style.cssText = `position: relative; width: ${w}px; height: ${h}px; margin: 0 auto;`;
  root.append(tube);
  return Object.assign(root, { tube, back, glass, S, pad, dpr, w, h });
};
const _t02 = function _controls(html)
{
  const flip = html`<button>flip</button>`;
  const tilt = html`<button>use the phone's tilt</button>`;
  // only iOS asks; elsewhere the sensor is listened to from the start
  tilt.hidden = !(window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === "function");
  tilt.onclick = () => window.DeviceMotionEvent.requestPermission().then((r) => { if (r === "granted") tilt.remove(); });
  return html`<div style="display: flex; gap: 0.5em; justify-content: center; margin: 0.5em 0">${flip}${tilt}</div>`;
};
const _m_gravity = function _m_gravity(md){return(
md`## Turning it over

The tube is drawn in its own frame and rotated with a CSS transform; gravity is rotated the other way into the tube's frame, so the liquid is always simulated upright and the flip is a 0.7 s ease of the display angle through a half turn, during which the liquid is thrown about as it would be. Dragging sets the angle from the pointer's bearing about the tube's centre.

On a phone the gravity vector comes from \`devicemotion\`'s \`accelerationIncludingGravity\`, which for a device at rest points *up*, +9.8 along the axis that faces away from the ground, so it is negated. Held flat, the vector is short and the liquid barely moves, as the real toy would. The display angle still applies on top, so **flip** works there too. Read in portrait only; the screen's own rotation is not applied. Not tried on iOS, which is said to report the vector with the opposite sign and needs the button that appears there to grant the sensor.`
)};
const _t03 = function _control(stage,controls,invalidation)
{
  const control = { angle: 0, from: 0, to: 0, at: -1e9, flipMs: 700, sensor: null };
  const centre = () => {
    const r = stage.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  let grab = null;
  stage.tube.addEventListener("pointerdown", (e) => {
    stage.tube.setPointerCapture(e.pointerId);
    const [cx, cy] = centre();
    grab = Math.atan2(e.clientY - cy, e.clientX - cx) - control.angle;
    control.to = control.angle;
    control.at = -1e9;
  });
  stage.tube.addEventListener("pointermove", (e) => {
    if (grab === null) return;
    const [cx, cy] = centre();
    control.angle = control.to = Math.atan2(e.clientY - cy, e.clientX - cx) - grab;
  });
  const release = () => (grab = null);
  stage.tube.addEventListener("pointerup", release);
  stage.tube.addEventListener("pointercancel", release);
  controls.querySelector("button").onclick = () => {
    control.from = control.angle;
    control.to = Math.round(control.angle / Math.PI) * Math.PI + Math.PI;
    control.at = performance.now();
  };
  // DeviceMotion: acceleration including gravity is +9.8 along the axis that points UP
  const motion = (e) => {
    const a = e.accelerationIncludingGravity;
    if (a && a.x !== null) control.sensor = { x: a.x, y: a.y, t: performance.now() };
  };
  addEventListener("devicemotion", motion);
  invalidation.then(() => removeEventListener("devicemotion", motion));
  return control;
};
const _m_settings = function _m_settings(md){return(
md`## Settings

Gravity, drag and the nozzle set the pace; stiffness, cohesion and rest density set how liquid it is; the wheel's inertia and drag set how readily a drop spins it. \`particles\` and **restart** rebuild the liquid in the top chamber.`
)};
const _t04 = function _viewof_particles(Inputs){return(
Inputs.range([1000, 12000], { value: 4000, step: 250, label: "particles" })
)};
const _t05 = (G, _) => G.input(_);
const _t06 = function _viewof_reset(Inputs){return(
Inputs.button("restart")
)};
const _t07 = (G, _) => G.input(_);
const _t08 = function _download(stage,renderer,html)
{
  const button = html`<button>download png</button>`;
  button.onclick = () => {
    const c = document.createElement("canvas");
    c.width = stage.back.width;
    c.height = stage.back.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(stage.back, 0, 0);
    if (renderer.repaint) renderer.repaint(); // WebGL keeps its pixels only for the task that drew them
    ctx.drawImage(stage.glass, 0, 0);
    c.toBlob((blob) => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const link = html`<a download="liquid-timer-${stamp}.png" href=${URL.createObjectURL(blob)}>`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  };
  return button;
};
const _m_liquid = function _m_liquid(md){return(
md`## The liquid

Only the green liquid is simulated; the oil it falls through is a drag on every particle. The particles follow Clavet, Beaudoin and Poulin, [Particle-based viscoelastic fluid simulation](https://doi.org/10.1145/1073368.1073400) (2005): each step, pairs closing on each other are slowed (viscosity), positions advance, then every particle measures the density around it and pushes its neighbours apart in proportion to the excess over a rest density, plus a short-range *near* pressure that never lets two particles coincide. Below rest density the first term pulls neighbours in, which is where the drops come from: a thread of liquid leaving a nozzle necks and breaks into beads without any surface tension term.

Too much near pressure makes the liquid granular. Measured 2026-09-19 with 1500 particles and 40 s of dripping, the top pool's surface stayed 0.030 units uneven (two particle layers) at cohesion 600, 0.018 at 300 and 0.011 at 150; a heap that would not level had been the symptom. 150 is the default and the drops still form.`
)};
const _t09 = function _geometry()
{
  const width = 1, height = 5;
  const thickness = 0.06, channel = 0.14, wall = 0.03, spoutLength = 0.12;
  // three plates, a pool chamber at each end, a wheel chamber between each pair.
  // Every plate has a spout pointing down at x = 0.3 and one pointing up at
  // x = 0.7: the whole tube maps onto itself under (x, y) -> (1 - x, 5 - y),
  // so a flip lands in the mirror of the start.
  const plates = [1.1, 2.5, 3.9].map((y) => {
    const spouts = [{ x: 0.3, dir: -1 }, { x: 0.7, dir: 1 }];
    const y0 = y - thickness / 2, y1 = y + thickness / 2;
    const solids = [];
    let x0 = 0;
    for (const s of spouts) {
      solids.push([x0, s.x - channel / 2, y0, y1]);
      x0 = s.x + channel / 2;
      // the spout's two walls, reaching into the next chamber
      const ya = s.dir > 0 ? y1 : y0 - spoutLength, yb = s.dir > 0 ? y1 + spoutLength : y0;
      solids.push([s.x - channel / 2 - wall, s.x - channel / 2, ya, yb]);
      solids.push([s.x + channel / 2, s.x + channel / 2 + wall, ya, yb]);
    }
    solids.push([x0, width, y0, y1]);
    // where the plug acts: the channel through the plate and its spout
    const channels = spouts.map((s) => [s.x - channel / 2, s.x + channel / 2, s.dir > 0 ? y0 : y0 - spoutLength, s.dir > 0 ? y1 + spoutLength : y1, s.dir]);
    return { y, thickness, spouts, solids, channels, top: y1, bottom: y0, spoutLength };
  });
  return {
    width, height, plates,
    wheels: [{ x: 0.5, y: 3.2 }, { x: 0.5, y: 1.8 }].map((w) => ({ ...w, radius: 0.4, hub: 0.06, spokes: 6, width: 0.02 }))
  };
};
const _t10 = function _createLiquid(geometry)
{
  const G = geometry;
  const W = G.width, H = G.height;
  const solids = G.plates.flatMap((p) => p.solids);
  const channels = G.plates.flatMap((p) => p.channels);
  const inBox = (x, y, [x0, x1, y0, y1], m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  // the same boxes flat, for the per-particle loops
  const flat = (boxes) => Float64Array.from(boxes.flat());
  const solidsFlat = flat(solids), channelsFlat = flat(channels.map((c) => c.slice(0, 4)));
  const channelDir = Float64Array.from(channels.map((c) => c[4]));
  const channelPlate = Int32Array.from(G.plates.flatMap((p, k) => p.channels.map(() => k)));
  const solidSpan = [Math.min(...solids.map((b) => b[2])), Math.max(...solids.map((b) => b[3]))];
  // n is the count the tube would hold if it were all liquid; the solids take a few
  return function createLiquid(n, heavyAbove = true) {
    const s = Math.sqrt((W * H) / n); // particle spacing at rest
    const h = 2.2 * s; // interaction radius
    const rp = 0.5 * s; // collision radius
    // a hexagonal lattice over the whole tube; the heavy liquid fills one pool chamber
    const pts = [];
    const cols = Math.floor((W - 2 * rp) / s);
    for (let row = 0; ; row++) {
      const y = rp + (row + 0.5) * s * 0.87;
      if (y > H - rp) break;
      for (let col = 0; col < cols; col++) {
        const x = rp + (col + 0.5 + 0.5 * (row % 2)) * s;
        if (x > W - rp) continue;
        if (solids.some((b) => inBox(x, y, b, rp))) continue;
        if (G.wheels.some((w) => Math.hypot(x - w.x, y - w.y) < w.hub + rp)) continue;
        pts.push([x, y, (heavyAbove ? y > G.plates[2].y : y < G.plates[0].y) ? 0 : 1]);
      }
    }
    n = pts.length;
    const x = new Float32Array(n), y = new Float32Array(n), kind = new Uint8Array(n);
    pts.forEach(([px, py, k], i) => { x[i] = px; y[i] = py; kind[i] = k; });
    const vx = new Float32Array(n), vy = new Float32Array(n);
    const px = new Float32Array(n), py = new Float32Array(n);
    const wheels = G.wheels.map((w) => ({ ...w, theta: 0, omega: 0, torque: 0 }));

    // neighbour grid, cells of h, rebuilt every step by counting sort
    const gw = Math.ceil(W / h) + 1, gh = Math.ceil(H / h) + 1;
    const cellStart = new Int32Array(gw * gh + 1);
    const cellOf = new Int32Array(n);
    const order = new Int32Array(n);
    const buildGrid = () => {
      cellStart.fill(0);
      for (let i = 0; i < n; i++) {
        const c = Math.min(gw - 1, Math.max(0, (x[i] / h) | 0)) + gw * Math.min(gh - 1, Math.max(0, (y[i] / h) | 0));
        cellOf[i] = c;
        cellStart[c + 1]++;
      }
      for (let c = 0; c < gw * gh; c++) cellStart[c + 1] += cellStart[c];
      const fill = cellStart.slice(0, gw * gh);
      for (let i = 0; i < n; i++) order[fill[cellOf[i]]++] = i;
    };
    // the neighbour cells of particle i, as [start, end) ranges into order
    const ranges = new Int32Array(18);
    const neighbours = (i) => {
      const cx = cellOf[i] % gw, cy = (cellOf[i] / gw) | 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = cy + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = cx + dx;
          if (xx < 0 || xx >= gw) continue;
          const c = xx + gw * yy;
          ranges[k++] = cellStart[c];
          ranges[k++] = cellStart[c + 1];
        }
      }
      return k;
    };

    // the channel particle i is in, or -1
    const inChannel = (i) => {
      const xi = x[i], yi = y[i];
      for (let b = 0; b < channelsFlat.length; b += 4)
        if (xi > channelsFlat[b] - rp && xi < channelsFlat[b + 1] + rp && yi > channelsFlat[b + 2] - rp && yi < channelsFlat[b + 3] + rp) return b / 4;
      return -1;
    };
    // depth of heavy liquid standing on each plate: what drives its spouts
    const depth = new Float64Array(G.plates.length);
    const cellArea = 0.866 * s * s;
    const measureDepths = () => {
      depth.fill(0);
      for (let i = 0; i < n; i++) {
        if (kind[i] !== 0) continue;
        for (let k = G.plates.length - 1; k >= 0; k--) if (y[i] > G.plates[k].top) { depth[k] += cellArea / W; break; }
      }
    };
    // push i out of every solid box it overlaps, along its least penetration
    const boxes = (i) => {
      if (y[i] < solidSpan[0] - rp || y[i] > solidSpan[1] + rp) return;
      for (let b = 0; b < solidsFlat.length; b += 4) {
        const x0 = solidsFlat[b], x1 = solidsFlat[b + 1], y0 = solidsFlat[b + 2], y1 = solidsFlat[b + 3];
        const l = x[i] - x0 + rp, r = x1 - x[i] + rp, bb = y[i] - y0 + rp, t = y1 - y[i] + rp;
        if (l <= 0 || r <= 0 || bb <= 0 || t <= 0) continue;
        const m = Math.min(l, r, bb, t);
        if (m === l) x[i] = x0 - rp;
        else if (m === r) x[i] = x1 + rp;
        else if (m === bb) y[i] = y0 - rp;
        else y[i] = y1 + rp;
      }
    };
    // Distance from particle i to the nearest solid, and the direction away from
    // it in (nrmX, nrmY). A particle that close sees only part of a full
    // neighbourhood; the wall stands in for the rest, or the liquid reads as
    // sparse there, pulls itself together and coats every wall.
    let nrmX = 0, nrmY = 0, nearestIsWheel = false;
    const nearestSolid = (i) => {
      nearestIsWheel = false;
      const xi = x[i], yi = y[i];
      let d = xi; nrmX = 1; nrmY = 0;
      if (W - xi < d) { d = W - xi; nrmX = -1; nrmY = 0; }
      if (yi < d) { d = yi; nrmX = 0; nrmY = 1; }
      if (H - yi < d) { d = H - yi; nrmX = 0; nrmY = -1; }
      if (yi > solidSpan[0] - h && yi < solidSpan[1] + h)
        for (let b = 0; b < solidsFlat.length; b += 4) {
          const dx = xi < solidsFlat[b] ? xi - solidsFlat[b] : xi > solidsFlat[b + 1] ? xi - solidsFlat[b + 1] : 0;
          const dy = yi < solidsFlat[b + 2] ? yi - solidsFlat[b + 2] : yi > solidsFlat[b + 3] ? yi - solidsFlat[b + 3] : 0;
          const e = Math.sqrt(dx * dx + dy * dy);
          if (e < d && e > 0) { d = e; nrmX = dx / e; nrmY = dy / e; }
        }
      for (const w of wheels) {
        const qx = xi - w.x, qy = yi - w.y;
        const r = Math.sqrt(qx * qx + qy * qy);
        if (r > w.radius + w.width + h) continue;
        if (r - w.hub < d && r > 0) { d = r - w.hub; nrmX = qx / r; nrmY = qy / r; nearestIsWheel = true; }
        for (let k = 0; k < w.spokes; k++) {
          const a = w.theta + (2 * Math.PI * k) / w.spokes;
          const ux = Math.cos(a), uy = Math.sin(a);
          const t = Math.min(w.radius, Math.max(0, qx * ux + qy * uy));
          const nx = qx - t * ux, ny = qy - t * uy;
          const nd = Math.sqrt(nx * nx + ny * ny);
          const e = nd - w.width;
          if (e < d && nd > 0) { d = e; nrmX = nx / nd; nrmY = ny / nd; nearestIsWheel = true; }
        }
      }
      return d;
    };
    // share of a disc of radius h that lies beyond a wall at distance d
    const beyond = (d) => {
      if (d >= h) return 0;
      const t = Math.max(0, d) / h;
      return (Math.acos(t) - t * Math.sqrt(1 - t * t)) / Math.PI;
    };
    const collide = (i, dt, mass) => {
      x[i] = Math.min(W - rp, Math.max(rp, x[i]));
      y[i] = Math.min(H - rp, Math.max(rp, y[i]));
      boxes(i);
      for (const w of wheels) {
        const dx = x[i] - w.x, dy = y[i] - w.y;
        const d2 = dx * dx + dy * dy;
        const reach = w.radius + w.width + rp;
        if (d2 > reach * reach) continue;
        const bx = x[i], by = y[i];
        const d = Math.sqrt(d2);
        if (d < w.hub + rp) {
          const k = (w.hub + rp) / (d || 1e-9);
          x[i] = w.x + dx * k;
          y[i] = w.y + dy * k;
        }
        for (let k = 0; k < w.spokes; k++) {
          const a = w.theta + (2 * Math.PI * k) / w.spokes;
          const ux = Math.cos(a), uy = Math.sin(a);
          const qx = x[i] - w.x, qy = y[i] - w.y;
          const t = Math.min(w.radius, Math.max(0, qx * ux + qy * uy));
          const nx = qx - t * ux, ny = qy - t * uy;
          const nd = Math.sqrt(nx * nx + ny * ny);
          const gap = w.width + rp;
          if (nd >= gap) continue;
          // a particle on the spoke's line is pushed off to the side it is turning from
          const f = nd > 1e-9 ? (gap - nd) / nd : 0;
          x[i] += nd > 1e-9 ? nx * f : -uy * gap;
          y[i] += nd > 1e-9 ? ny * f : ux * gap;
        }
        // the liquid's momentum change is the wheel's, the other way round
        const ix = x[i] - bx, iy = y[i] - by;
        if (ix !== 0 || iy !== 0) w.torque -= (mass * ((bx - w.x) * iy - (by - w.y) * ix)) / dt;
      }
    };

    const liquid = {
      n, s, h, rp, x, y, vx, vy, kind, wheels, depth,
      // one time step: gravity g (a vector in tube units per s^2), parameters p
      step(dt, gx, gy, p) {
        const { drag, nozzle, pump, stiffness, tensile, cohesion, restDensity, interfaceTension, wallTension, lightMass, viscosity, thickening, wheelInertia, wheelDrag } = p;
        const invMass = [1, 1 / lightMass];
        for (const w of wheels) {
          w.omega *= Math.exp(-wheelDrag * dt);
          w.theta += w.omega * dt;
          w.torque = 0;
        }
        measureDepths();
        const f = 1 / (1 + drag * dt);
        for (let i = 0; i < n; i++) {
          vx[i] = (vx[i] + gx * dt) * f;
          vy[i] = (vy[i] + gy * dt) * f;
          // A spout is one way: whatever is in it is carried along it. The heavy
          // liquid goes down the down spouts, the light up the up spouts, and
          // either that strays into the other is returned. Stands in for the
          // surface tension and shape that make the real spouts one way.
          const c = inChannel(i);
          if (c >= 0) {
            // along the tube's own up, whichever way gravity points. The rate is
            // the same for every plate, like a spout that drips one drop at a time,
            // once a little liquid stands on it.
            const prime = Math.min(1, depth[channelPlate[c]] / 0.05);
            vy[i] += pump * prime * channelDir[c] * dt;
          }
        }
        buildGrid();
        // viscosity: pairs closing on each other are slowed (Clavet 2005)
        for (let i = 0; i < n; i++) {
          const k = neighbours(i);
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j <= i) continue;
            const rx = x[j] - x[i], ry = y[j] - y[i];
            const d = Math.sqrt(rx * rx + ry * ry);
            if (d >= h || d < 1e-9) continue;
            const q = d / h;
            const u = ((vx[i] - vx[j]) * rx + (vy[i] - vy[j]) * ry) / d;
            if (u <= 0) continue;
            const I = (0.5 * dt * (1 - q) * (viscosity * u + thickening * u * u)) / d;
            vx[i] -= I * rx; vy[i] -= I * ry;
            vx[j] += I * rx; vy[j] += I * ry;
          }
        }
        for (let i = 0; i < n; i++) {
          px[i] = x[i]; py[i] = y[i];
          x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        }
        // Double density relaxation: pressure from density, and a near pressure
        // that keeps particles apart and, below rest density, pulls them together.
        // The push is a force: the lighter liquid moves further for it, which is
        // its buoyancy. Across the interface an extra push keeps the two apart.
        const dt2 = dt * dt;
        for (let i = 0; i < n; i++) {
          const k = neighbours(i);
          let rho = 0, near = 0;
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j === i) continue;
            const rx = x[j] - x[i], ry = y[j] - y[i];
            const d = Math.sqrt(rx * rx + ry * ry);
            if (d >= h) continue;
            const q = 1 - d / h;
            rho += q * q;
            near += q * q * q;
          }
          // below rest density the pressure pulls neighbours in, but only so hard: a neck can break
          const wall = nearestSolid(i) - rp;
          rho += restDensity * beyond(wall);
          const P = Math.max(stiffness * (rho - restDensity), -tensile), Pn = cohesion * near;
          const mi = invMass[kind[i]];
          let dx = 0, dy = 0;
          // the tube's walls are wetted by the light liquid: they push the heavy one off
          // like it does (not the wheels: a push with no reaction would turn them)
          if (kind[i] === 0 && wall < h && !nearestIsWheel) {
            const D = dt2 * wallTension * (1 - Math.max(0, wall) / h) * mi;
            dx += D * nrmX; dy += D * nrmY;
          }
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j === i) continue;
            const rx = x[j] - x[i], ry = y[j] - y[i];
            const d = Math.sqrt(rx * rx + ry * ry);
            if (d >= h || d < 1e-9) continue;
            const q = 1 - d / h;
            const D = (0.5 * dt2 * (P * q + Pn * q * q + (kind[j] !== kind[i] ? interfaceTension * q : 0))) / d;
            const mj = invMass[kind[j]];
            x[j] += D * rx * mj; y[j] += D * ry * mj;
            dx -= D * rx * mi; dy -= D * ry * mi;
          }
          x[i] += dx; y[i] += dy;
        }
        for (let i = 0; i < n; i++) {
          // a spout is also a porous plug: inside one, only a share of the step's motion survives
          if (nozzle < 1 && inChannel(i) >= 0) {
            x[i] = px[i] + (x[i] - px[i]) * nozzle;
            y[i] = py[i] + (y[i] - py[i]) * nozzle;
          }
          collide(i, dt, 1 / invMass[kind[i]]);
          vx[i] = (x[i] - px[i]) / dt;
          vy[i] = (y[i] - py[i]) / dt;
        }
        for (const w of wheels) w.omega += w.torque / wheelInertia;
      },
      // share of the heavy liquid below y
      below(yy) {
        let c = 0, all = 0;
        for (let i = 0; i < n; i++) if (kind[i] === 0) { all++; if (y[i] < yy) c++; }
        return c / all;
      }
    };
    return liquid;
  };
};
const _t11 = function _liquid(createLiquid,particles,reset)
{
  void reset; // the button rebuilds it
  return createLiquid(particles);
};
const _m_nozzle = function _m_nozzle(md){return(
md`### The nozzle

The real toy meters itself: green can only go down through the nozzle as fast as oil comes up through it, so it drips. The oil is not simulated here, so the nozzle is a porous plug instead: a particle inside a hole keeps only the \`nozzle\` share of the motion it would have made that step. That is Darcy's law, flow in proportion to the pressure pushing it, and it gives the pool a dripping rate that rises with its depth.

Measured 2026-09-19, 1500 particles, one nozzle a plate: at \`nozzle\` 0.7 the top chamber was empty after 120 s and the bottom chamber full after 180 s. With two nozzles a plate at 0.3 the same took over 240 s. Below about 0.4, with the stiffness at 200, the liquid emerging from a hole hung under the plate as one blob that never detached; stiffness 100 lets it go.`
)};
const _m_wheels = function _m_wheels(md){return(
md`### The wheels

A wheel is a hub and six spokes, each a thick line segment, turning about a fixed axle with an angular velocity, an inertia and a drag from the oil. Every particle that ends a step inside a spoke is pushed out; that push is the liquid's change of momentum, so the wheel receives the opposite impulse, and its moment about the axle is what turns the wheel. A drop resting in the cup between two spokes therefore turns the wheel until it spills, and a spoke sweeping into liquid is slowed by it.

Where the drops land decides whether the wheel spins or rocks. The first geometry had two nozzles in every plate and the wheel between them: the top wheel's angle went +2.1, +0.1, −2.7, −5.1, −6.7, −7.4 rad over 60 s, a drop on each side of the hub in turn. Now each end plate has one nozzle, dripping near a spoke tip of the wheel below, and the middle plate one in the centre, which lands part way along a spoke of the lower wheel. Same run, 120 s: top wheel 56 rad, bottom wheel 107 rad, no reversals. The tube maps onto itself under a half turn, so a flip lands in the mirror of the starting geometry.`
)};
const _t12 = function _viewof_params(Inputs,defaults,html)
{
  const range = (key, extent, step, label) =>
    Inputs.range(extent, { value: defaults[key], step, label, width: 340 });
  return Inputs.form(
    {
      gravity: range("gravity", [0, 4], 0.05, "gravity"),
      drag: range("drag", [0, 20], 0.1, "oil drag"),
      nozzle: range("nozzle", [0.01, 1], 0.01, "spout flow"),
      pump: range("pump", [0, 20], 0.5, "spout drive"),
      stiffness: range("stiffness", [0, 1000], 10, "stiffness"),
      tensile: range("tensile", [0, 200], 1, "tensile strength"),
      cohesion: range("cohesion", [0, 3000], 10, "cohesion"),
      restDensity: range("restDensity", [0.5, 5], 0.05, "rest density"),
      interfaceTension: range("interfaceTension", [0, 500], 5, "interface tension"),
      wallTension: range("wallTension", [0, 500], 5, "wall tension"),
      lightMass: range("lightMass", [0.2, 1], 0.01, "light liquid's mass"),
      viscosity: range("viscosity", [0, 50], 0.5, "viscosity"),
      thickening: range("thickening", [0, 50], 0.5, "viscosity, quadratic"),
      wheelInertia: range("wheelInertia", [0.2, 50], 0.2, "wheel inertia"),
      wheelDrag: range("wheelDrag", [0, 10], 0.1, "wheel drag"),
      dt: range("dt", [1 / 480, 1 / 60], 1 / 960, "time step (s)"),
      maxSteps: range("maxSteps", [1, 16], 1, "steps a frame, at most")
    },
    {
      template: (inputs) => html`<div class="timer-params" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 0 1.5em">
        <style>
          .timer-params > form { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; --label-width: 140px; }
          .timer-params > form > div { min-width: 0; }
          .timer-params > form input[type="number"] { width: 5.5em; flex: none; }
          .timer-params > form input[type="range"] { min-width: 0; flex: 1 1 0; width: 0; }
        </style>
        ${Object.values(inputs)}
      </div>`
    }
  );
};
const _t13 = (G, _) => G.input(_);
const _t14 = function _defaults(){return(
{
  gravity: 2,
  drag: 0.5,
  nozzle: 1,
  pump: 4,
  stiffness: 100,
  tensile: 20,
  cohesion: 150,
  restDensity: 2,
  interfaceTension: 50,
  wallTension: 50,
  lightMass: 0.6,
  viscosity: 4,
  thickening: 2,
  wheelInertia: 10,
  wheelDrag: 1,
  dt: 1 / 240,
  maxSteps: 8
}
)};
const _m_display = function _m_display(md){return(
md`## Drawing it

Two canvases. The lower one is 2D: cap, base, the purple panels behind the wheel chambers, the plates with their holes, and the wheels at their current angle. The upper one is WebGL2: every particle is splatted as a \`(1 − r²)²\` kernel four spacings wide into a half-resolution 16 bit density field, and a full-screen pass draws the field above a threshold as the liquid, shaded by the field's gradient: darker where it thins at an edge, a highlight where the slope faces the light. The union of round kernels is what makes separate drops merge into one outline as they touch.`
)};
const _t15 = function _ctx(stage,invalidation)
{
  const gl = stage.glass.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) throw new Error("This notebook needs WebGL2");
  invalidation.then(() => {
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  });
  // the density field wants more than 8 bits; half float where the GPU renders to it
  const half = gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float");
  return { gl, format: half ? { internal: gl.R16F, scale: 1 } : { internal: gl.R8, scale: 1 / 8 } };
};
const _t16 = function _splatShader(){return(
{
  vertex: `#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec2 aPosition;
uniform vec2 uSize;
uniform float uPoint;
void main () {
  gl_Position = vec4(aPosition / uSize * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uPoint;
}`,
  fragment: `#version 300 es
precision highp float;
precision highp int;
uniform float uScale;
out vec4 outColor;
void main () {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float w = max(0.0, 1.0 - dot(d, d));
  outColor = vec4(w * w * uScale, 0.0, 0.0, 1.0);
}`
}
)};
const _t17 = function _shadeShader(){return(
{
  vertex: `#version 300 es
precision highp float;
precision highp int;
out vec2 vUv;
void main () {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`,
  fragment: `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform vec2 uTexel;
uniform float uScale;
uniform float uThreshold;
uniform vec3 uColor;
in vec2 vUv;
out vec4 outColor;
float field (vec2 uv) { return texture(uField, uv).r / uScale; }
void main () {
  float f = field(vUv);
  float fx = field(vUv + vec2(uTexel.x, 0.0)) - field(vUv - vec2(uTexel.x, 0.0));
  float fy = field(vUv + vec2(0.0, uTexel.y)) - field(vUv - vec2(0.0, uTexel.y));
  float w = max(fwidth(f), 1e-4);
  float cover = smoothstep(-w, w, f - uThreshold);
  if (cover <= 0.0) discard;
  vec3 n = normalize(vec3(fx, fy, 0.6));
  vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
  float diffuse = 0.7 + 0.3 * max(0.0, dot(n, L));
  float spec = pow(max(0.0, dot(reflect(-L, n), vec3(0.0, 0.0, 1.0))), 30.0);
  float rim = 1.0 - smoothstep(uThreshold, uThreshold + 0.6, f);
  vec3 col = uColor * diffuse * mix(1.0, 0.45, rim) + 0.5 * spec;
  float alpha = cover * mix(0.85, 0.95, rim);
  outColor = vec4(col * alpha, alpha);
}`
}
)};
const _t18 = function _renderer(ctx,stage,geometry,splatShader,shadeShader,invalidation)
{
  const { gl, format } = ctx;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const link = ({ vertex, fragment }) => {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  };
  const locate = (program, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
  const splat = link(splatShader);
  const splatAt = locate(splat, ["uSize", "uPoint", "uScale"]);
  const shade = link(shadeShader);
  const shadeAt = locate(shade, ["uField", "uTexel", "uScale", "uThreshold", "uColor"]);

  // the density field, at half the canvas resolution, over the tube only
  const G = geometry;
  const fw = Math.ceil((G.width * stage.S * stage.dpr) / 2), fh = Math.ceil((G.height * stage.S * stage.dpr) / 2);
  const field = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, field);
  gl.texStorage2D(gl.TEXTURE_2D, 1, format.internal, fw, fh);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("density field is not renderable");
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const empty = gl.createVertexArray();
  invalidation.then(() => {
    gl.deleteTexture(field); gl.deleteFramebuffer(fbo); gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao); gl.deleteVertexArray(empty);
    gl.deleteProgram(splat); gl.deleteProgram(shade);
  });

  let xy = new Float32Array(0);
  let capacity = 0;
  const px = stage.S * stage.dpr; // canvas pixels per tube unit
  return {
    // draw the liquid: kernel radius and threshold in tube units
    draw(liquid, { color = [0.35, 0.8, 0.15], kernel, threshold = 0.45 }) {
      // only the heavy liquid is drawn; the light one is clear, and shows as the holes in it
      if (xy.length < 2 * liquid.n) xy = new Float32Array(2 * liquid.n);
      let n = 0;
      for (let i = 0; i < liquid.n; i++) if (liquid.kind[i] === 0) { xy[2 * n] = liquid.x[i]; xy[2 * n + 1] = liquid.y[i]; n++; }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (capacity < n) { gl.bufferData(gl.ARRAY_BUFFER, 8 * n, gl.DYNAMIC_DRAW); capacity = n; }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, xy, 0, 2 * n);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, fw, fh);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(splat);
      gl.uniform2f(splatAt.uSize, G.width, G.height);
      gl.uniform1f(splatAt.uPoint, kernel * px);
      gl.uniform1f(splatAt.uScale, format.scale);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.bindVertexArray(null);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(stage.pad * stage.dpr, stage.pad * stage.dpr, G.width * px, G.height * px);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(shade);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, field);
      gl.uniform1i(shadeAt.uField, 0);
      gl.uniform2f(shadeAt.uTexel, 1 / fw, 1 / fh);
      gl.uniform1f(shadeAt.uScale, format.scale);
      gl.uniform1f(shadeAt.uThreshold, threshold);
      gl.uniform3fv(shadeAt.uColor, color);
      gl.bindVertexArray(empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
  };
};
const _t19 = function _overlay(stage,geometry)
{
  const G = geometry;
  const c = stage.back.getContext("2d");
  const k = stage.S * stage.dpr;
  return {
    // the tube, its plates and its wheels, in tube coordinates with y up
    draw(liquid) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, stage.back.width, stage.back.height);
      c.setTransform(k, 0, 0, -k, stage.pad * stage.dpr, (stage.pad + G.height * stage.S) * stage.dpr);
      // cap and base, then the glass
      c.fillStyle = "#e6e4de";
      c.fillRect(-0.06, G.height + 0.015, G.width + 0.12, 0.09);
      c.fillRect(-0.06, -0.105, G.width + 0.12, 0.09);
      c.fillStyle = "#f3f1ea";
      c.fillRect(0, 0, G.width, G.height);
      for (const w of G.wheels) {
        c.fillStyle = "rgba(96, 60, 150, 0.35)";
        c.fillRect(0, w.y - 0.5 + 0.03, G.width, 1 - 0.06);
      }
      // plates and their spouts
      c.fillStyle = "#d9d7d0";
      for (const p of G.plates) for (const [x0, x1, y0, y1] of p.solids) c.fillRect(x0, y0, x1 - x0, y1 - y0);
      // wheels
      for (const w of liquid.wheels) {
        c.strokeStyle = "#d4c33a";
        c.lineCap = "round";
        c.lineWidth = 2 * w.width + 0.012;
        c.beginPath();
        for (let s = 0; s < w.spokes; s++) {
          const a = w.theta + (2 * Math.PI * s) / w.spokes;
          c.moveTo(w.x, w.y);
          c.lineTo(w.x + w.radius * Math.cos(a), w.y + w.radius * Math.sin(a));
        }
        c.stroke();
        c.beginPath();
        c.arc(w.x, w.y, w.hub, 0, 2 * Math.PI);
        c.fillStyle = "#e9dd6a";
        c.fill();
        c.lineWidth = 0.012;
        c.stroke();
        c.beginPath();
        c.arc(w.x, w.y, w.hub * 0.4, 0, 2 * Math.PI);
        c.fillStyle = "#fffbe0";
        c.fill();
      }
      // frame
      c.lineWidth = 0.03;
      c.strokeStyle = "#8d949c";
      c.strokeRect(-0.015, -0.015, G.width + 0.03, G.height + 0.03);
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
  };
};
const _t20 = function _mainLoop(liquid,renderer,overlay,control,stage,params,invalidation)
{
  let last = performance.now();
  let owed = 0;
  let frame;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  const loop = (now) => {
    frame = requestAnimationFrame(loop);
    const t = (now - control.at) / control.flipMs;
    if (t >= 0 && t < 1) control.angle = control.from + (control.to - control.from) * ease(t);
    else if (t >= 1) control.angle = control.to;
    stage.tube.style.transform = `rotate(${control.angle}rad)`;
    // gravity on screen (y up), then into the tube's frame
    let sx = 0, sy = -1;
    const s = control.sensor;
    if (s && now - s.t < 500) {
      sx = -s.x / 9.81; sy = -s.y / 9.81;
      const m = Math.hypot(sx, sy);
      if (m > 1) { sx /= m; sy /= m; }
    }
    const ca = Math.cos(control.angle), sa = Math.sin(control.angle);
    const gx = (ca * sx - sa * sy) * params.gravity;
    const gy = (sa * sx + ca * sy) * params.gravity;

    owed += Math.min(now - last, 100) / 1000;
    last = now;
    let steps = 0;
    while (owed >= params.dt && steps < params.maxSteps) {
      liquid.step(params.dt, gx, gy, params);
      owed -= params.dt;
      steps++;
    }
    if (steps === params.maxSteps) owed = 0; // a slow frame does not owe time
    overlay.draw(liquid);
    renderer.draw(liquid, { kernel: 4 * liquid.s, threshold: 0.6 });
  };
  renderer.repaint = () => {
    overlay.draw(liquid);
    renderer.draw(liquid, { kernel: 4 * liquid.s, threshold: 0.6 });
  };
  frame = requestAnimationFrame(loop);
  invalidation.then(() => cancelAnimationFrame(frame));
  return liquid;
};
const _m_tests = function _m_tests(md){return(
md`## Tests

Off by default: each runs seconds of simulation on the CPU.`
)};
const _t21 = function _viewof_runTests(Inputs){return(
Inputs.toggle({ label: "run the tests", value: false })
)};
const _t22 = (G, _) => G.input(_);
const _t23 = function _test_the_liquid_stays_in_the_tube(runTests,createLiquid,defaults,geometry)
{
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const liquid = createLiquid(600);
  for (let k = 0; k < 2400; k++) liquid.step(defaults.dt, 0, -defaults.gravity, defaults);
  let bad = 0;
  for (let i = 0; i < liquid.n; i++) {
    const x = liquid.x[i], y = liquid.y[i];
    if (!(x >= 0 && x <= geometry.width && y >= 0 && y <= geometry.height)) bad++;
  }
  if (bad) throw new Error(`${bad} particles left the tube or went NaN`);
  return `600 particles, 2400 steps, all inside`;
};
const _t24 = function _test_a_wheel_turns_when_it_drips(runTests,createLiquid,defaults)
{
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const liquid = createLiquid(1500);
  const steps = Math.round(30 / defaults.dt);
  for (let k = 0; k < steps; k++) liquid.step(defaults.dt, 0, -defaults.gravity, defaults);
  const turned = Math.abs(liquid.wheels[0].theta);
  if (!(turned > 1)) throw new Error(`the top wheel turned ${turned.toFixed(2)} rad in 30 s`);
  return `the top wheel turned ${turned.toFixed(1)} rad in 30 s`;
};
const _t25 = function _test_the_liquid_drains(runTests,createLiquid,defaults,geometry)
{
  if (!runTests) return "not run: switch on *run the tests* under the Tests heading";
  const liquid = createLiquid(1000);
  const steps = Math.round(120 / defaults.dt);
  for (let k = 0; k < steps; k++) liquid.step(defaults.dt, 0, -defaults.gravity, defaults);
  const below = liquid.below(geometry.plates[1].y);
  if (!(below > 0.5)) throw new Error(`only ${(100 * below).toFixed(0)}% of the liquid is past the middle plate after 120 s`);
  return `${(100 * below).toFixed(0)}% of the liquid is past the middle plate after 120 s`;
};
const _t99 = function _footer(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_t00", null, ["md"], _t00);
  $def("_t01", "stage", ["DOM","width","geometry"], _t01);
  $def("_t02", "controls", ["html"], _t02);
  $def("_t08", "download", ["stage","renderer","html"], _t08);
  $def("_m_settings", null, ["md"], _m_settings);
  $def("_t04", "viewof particles", ["Inputs"], _t04);
  $def("_t05", "particles", ["Generators","viewof particles"], _t05);
  $def("_t06", "viewof reset", ["Inputs"], _t06);
  $def("_t07", "reset", ["Generators","viewof reset"], _t07);
  $def("_t12", "viewof params", ["Inputs","defaults","html"], _t12);
  $def("_t13", "params", ["Generators","viewof params"], _t13);
  $def("_m_liquid", null, ["md"], _m_liquid);
  $def("_t09", "geometry", [], _t09);
  $def("_t10", "createLiquid", ["geometry"], _t10);
  $def("_t11", "liquid", ["createLiquid","particles","reset"], _t11);
  $def("_m_nozzle", null, ["md"], _m_nozzle);
  $def("_m_wheels", null, ["md"], _m_wheels);
  $def("_m_gravity", null, ["md"], _m_gravity);
  $def("_t03", "control", ["stage","controls","invalidation"], _t03);
  $def("_m_display", null, ["md"], _m_display);
  $def("_t15", "ctx", ["stage","invalidation"], _t15);
  $def("_t16", "splatShader", [], _t16);
  $def("_t17", "shadeShader", [], _t17);
  $def("_t18", "renderer", ["ctx","stage","geometry","splatShader","shadeShader","invalidation"], _t18);
  $def("_t19", "overlay", ["stage","geometry"], _t19);
  $def("_t20", "mainLoop", ["liquid","renderer","overlay","control","stage","params","invalidation"], _t20);
  $def("_t14", "defaults", [], _t14);
  $def("_m_tests", null, ["md"], _m_tests);
  $def("_t21", "viewof runTests", ["Inputs"], _t21);
  $def("_t22", "runTests", ["Generators","viewof runTests"], _t22);
  $def("_t23", "test_the_liquid_stays_in_the_tube", ["runTests","createLiquid","defaults","geometry"], _t23);
  $def("_t24", "test_a_wheel_turns_when_it_drips", ["runTests","createLiquid","defaults"], _t24);
  $def("_t25", "test_the_liquid_drains", ["runTests","createLiquid","defaults","geometry"], _t25);
  $def("_t99", null, ["footer"], _t99);
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));
  return main;
}