const _t10 = function _createLiquid(geometry)
{
  const G = geometry;
  const W = G.width, H = G.height;
  const solids = G.plates.flatMap((p) => p.solids);
  const channels = G.plates.flatMap((p) => p.channels);
  const inBox = (x, y, [x0, x1, y0, y1], m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  const flat = (boxes) => Float64Array.from(boxes.flat());
  const solidsFlat = flat(solids);
  // each liquid sees the other liquid's spouts as solid: their length keeps a
  // shallow pool out of the wrong one, and this keeps a deep one out too
  const closed = [flat(channels.filter((c) => c[4] > 0).map((c) => c.slice(0, 4))), flat(channels.filter((c) => c[4] < 0).map((c) => c.slice(0, 4)))];
  const channelsFlat = flat(channels.map((c) => c.slice(0, 4)));
  const solidSpan = [Math.min(...solids.map((b) => b[2])), Math.max(...solids.map((b) => b[3]))];
  // n particles of each liquid; a chamber is filled to `fill` of its area
  return function createLiquid(n, fill = 0.55) {
    const chamber = G.plates[0].bottom;
    const s = Math.sqrt((fill * W * chamber) / n); // particle spacing at rest
    const h = 2.2 * s; // interaction radius
    const rp = 0.5 * s; // collision radius
    // the heavy liquid on the top plate, the light one under the bottom plate:
    // each starts where the other will finish
    const pts = [];
    const cols = Math.floor((W - 2 * rp) / s);
    for (let kind = 0; kind < 2; kind++) {
      const from = kind === 0 ? G.plates[2].top + rp : G.plates[0].bottom - rp;
      const dir = kind === 0 ? 1 : -1;
      for (let i = 0, row = 0; i < n; row++) {
        for (let col = 0; col < cols && i < n; col++, i++) {
          pts.push([rp + (col + 0.5 + 0.5 * (row % 2)) * s, from + dir * (row + 0.5) * s * 0.87, kind]);
        }
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

    const inChannel = (i) => {
      const xi = x[i], yi = y[i];
      for (let b = 0; b < channelsFlat.length; b += 4)
        if (xi > channelsFlat[b] - rp && xi < channelsFlat[b + 1] + rp && yi > channelsFlat[b + 2] - rp && yi < channelsFlat[b + 3] + rp) return true;
      return false;
    };
    // push i out of every box it overlaps, along its least penetration
    const boxes = (i, list) => {
      for (let b = 0; b < list.length; b += 4) {
        const x0 = list[b], x1 = list[b + 1], y0 = list[b + 2], y1 = list[b + 3];
        const l = x[i] - x0 + rp, r = x1 - x[i] + rp, bb = y[i] - y0 + rp, t = y1 - y[i] + rp;
        if (l <= 0 || r <= 0 || bb <= 0 || t <= 0) continue;
        const m = Math.min(l, r, bb, t);
        if (m === l) x[i] = x0 - rp;
        else if (m === r) x[i] = x1 + rp;
        else if (m === bb) y[i] = y0 - rp;
        else y[i] = y1 + rp;
      }
    };
    // Distance from particle i to the nearest solid. A particle that close sees
    // only part of a full neighbourhood; the wall stands in for the rest, or the
    // liquid reads as sparse there, pulls itself together and coats every wall.
    const nearestSolid = (i) => {
      const xi = x[i], yi = y[i];
      let d = Math.min(xi, W - xi, yi, H - yi);
      if (yi > solidSpan[0] - h && yi < solidSpan[1] + h) {
        for (const list of [solidsFlat, closed[kind[i]]])
          for (let b = 0; b < list.length; b += 4) {
            const dx = Math.max(list[b] - xi, 0, xi - list[b + 1]);
            const dy = Math.max(list[b + 2] - yi, 0, yi - list[b + 3]);
            const e = Math.sqrt(dx * dx + dy * dy);
            if (e < d) d = e;
          }
      }
      for (const w of wheels) {
        const qx = xi - w.x, qy = yi - w.y;
        const r = Math.sqrt(qx * qx + qy * qy);
        if (r > w.radius + w.width + h) continue;
        if (r - w.hub < d) d = r - w.hub;
        for (let k = 0; k < w.spokes; k++) {
          const a = w.theta + (2 * Math.PI * k) / w.spokes;
          const ux = Math.cos(a), uy = Math.sin(a);
          const t = Math.min(w.radius, Math.max(0, qx * ux + qy * uy));
          const nx = qx - t * ux, ny = qy - t * uy;
          const e = Math.sqrt(nx * nx + ny * ny) - w.width;
          if (e < d) d = e;
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
    const collide = (i, dt) => {
      x[i] = Math.min(W - rp, Math.max(rp, x[i]));
      y[i] = Math.min(H - rp, Math.max(rp, y[i]));
      if (y[i] > solidSpan[0] - rp && y[i] < solidSpan[1] + rp) {
        boxes(i, solidsFlat);
        boxes(i, closed[kind[i]]);
      }
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
        if (ix !== 0 || iy !== 0) w.torque -= ((bx - w.x) * iy - (by - w.y) * ix) / dt;
      }
    };

    const liquid = {
      n, s, h, rp, x, y, vx, vy, kind, wheels,
      // one time step: gravity g (a vector in tube units per s^2), parameters p
      step(dt, gx, gy, p) {
        const { drag, nozzle, stiffness, tensile, cohesion, restDensity, buoyancy, viscosity, thickening, wheelInertia, wheelDrag } = p;
        // the light liquid falls up, by its buoyancy; the two never touch
        const gk = [1, -buoyancy];
        for (const w of wheels) {
          w.omega *= Math.exp(-wheelDrag * dt);
          w.theta += w.omega * dt;
          w.torque = 0;
        }
        const f = 1 / (1 + drag * dt);
        for (let i = 0; i < n; i++) {
          vx[i] = (vx[i] + gx * gk[kind[i]] * dt) * f;
          vy[i] = (vy[i] + gy * gk[kind[i]] * dt) * f;
        }
        buildGrid();
        // viscosity: pairs closing on each other are slowed (Clavet 2005)
        for (let i = 0; i < n; i++) {
          const k = neighbours(i);
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j <= i || kind[j] !== kind[i]) continue;
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
        // double density relaxation: pressure from density, and a near pressure
        // that keeps particles apart and, below rest density, pulls them together
        const dt2 = dt * dt;
        for (let i = 0; i < n; i++) {
          const k = neighbours(i);
          let rho = 0, near = 0;
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j === i || kind[j] !== kind[i]) continue;
            const rx = x[j] - x[i], ry = y[j] - y[i];
            const d = Math.sqrt(rx * rx + ry * ry);
            if (d >= h) continue;
            const q = 1 - d / h;
            rho += q * q;
            near += q * q * q;
          }
          rho += restDensity * beyond(nearestSolid(i) - rp);
          // below rest density the pressure pulls neighbours in, but only so hard: a neck can break
          const P = Math.max(stiffness * (rho - restDensity), -tensile), Pn = cohesion * near;
          let dx = 0, dy = 0;
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j === i || kind[j] !== kind[i]) continue;
            const rx = x[j] - x[i], ry = y[j] - y[i];
            const d = Math.sqrt(rx * rx + ry * ry);
            if (d >= h || d < 1e-9) continue;
            const q = 1 - d / h;
            const D = (0.5 * dt2 * (P * q + Pn * q * q)) / d;
            x[j] += D * rx; y[j] += D * ry;
            dx -= D * rx; dy -= D * ry;
          }
          x[i] += dx; y[i] += dy;
        }
        for (let i = 0; i < n; i++) {
          // a spout is a porous plug: inside one, only a share of the step's motion survives
          if (nozzle < 1 && inChannel(i)) {
            x[i] = px[i] + (x[i] - px[i]) * nozzle;
            y[i] = py[i] + (y[i] - py[i]) * nozzle;
          }
          collide(i, dt);
          vx[i] = (x[i] - px[i]) / dt;
          vy[i] = (y[i] - py[i]) / dt;
        }
        for (const w of wheels) w.omega += w.torque / wheelInertia;
      },
      // share of one liquid (0 heavy, 1 light) below y
      below(yy, which = 0) {
        let c = 0, all = 0;
        for (let i = 0; i < n; i++) if (kind[i] === which) { all++; if (y[i] < yy) c++; }
        return c / all;
      }
    };
    return liquid;
  };
};
