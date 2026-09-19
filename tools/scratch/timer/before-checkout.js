const _t00 = function _1(md){return(
md`# Liquid timer

The desk toy: a sealed tube of oil with a heavier green liquid in it. Turn it over and the green drips through a nozzle, falls in drops onto a paddle wheel, spins it, pools on the next shelf and drips again, until it has all run to the bottom. Then you turn it over again.

Press **flip**, or drag the tube round with the pointer. On a phone the tube follows the phone: tilt it, and turn it over to restart.`
)};
const _t01 = function _stage(DOM,width,geometry)
{
  const G = geometry;
  const S = Math.min((width * 0.9) / G.width, 640 / G.height);
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
const _t02 = function _controls(stage,html)
{
  const flip = html`<button>flip</button>`;
  const tilt = html`<button>use the phone's tilt</button>`;
  // only iOS asks; elsewhere the sensor is listened to from the start
  tilt.hidden = !(window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function");
  tilt.onclick = () => DeviceMotionEvent.requestPermission().then((r) => { if (r === "granted") tilt.remove(); });
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
Inputs.range([200, 4000], { value: 1500, step: 100, label: "particles" })
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
const _t09 = function _geometry(){return(
{
  width: 1,
  height: 3.2,
  // three plates, a pool chamber at each end, a wheel chamber between each pair;
  // the whole thing maps onto itself under (x, y) -> (1 - x, 3.2 - y), so a flip restarts it
  plates: [
    { y: 0.6, holes: [0.64] },
    { y: 1.6, holes: [0.5] },
    { y: 2.6, holes: [0.36] }
  ].map((p) => ({ ...p, thickness: 0.06, holeWidth: 0.07 })),
  // each wheel is off centre, so the nozzle above it drips onto one side
  wheels: [{ x: 0.65, y: 2.1 }, { x: 0.35, y: 1.1 }].map((w) => ({ ...w, radius: 0.3, hub: 0.05, spokes: 6, width: 0.02 }))
}
)};
const _t10 = function _createLiquid(geometry)
{
  const G = geometry;
  const W = G.width, H = G.height;
  return function createLiquid(n, fill = 0.55) {
    const chamber = G.plates[0].y - G.plates[0].thickness / 2;
    const s = Math.sqrt((fill * W * chamber) / n); // particle spacing at rest
    const h = 2.2 * s; // interaction radius
    const rp = 0.5 * s; // collision radius
    const x = new Float32Array(n), y = new Float32Array(n);
    const vx = new Float32Array(n), vy = new Float32Array(n);
    const px = new Float32Array(n), py = new Float32Array(n);
    // start in the top chamber, hexagonal rows from the top plate up
    const cols = Math.floor((W - 2 * rp) / s);
    const top = G.plates[2];
    for (let i = 0, row = 0; i < n; row++) {
      for (let col = 0; col < cols && i < n; col++, i++) {
        x[i] = rp + (col + 0.5 + 0.5 * (row % 2)) * s;
        y[i] = top.y + top.thickness / 2 + rp + (row + 0.5) * s * 0.87;
      }
    }
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

    const inHole = (i) => {
      for (const p of G.plates) {
        if (Math.abs(y[i] - p.y) > p.thickness / 2) continue;
        for (const hx of p.holes) if (Math.abs(x[i] - hx) < p.holeWidth / 2 + rp) return true;
      }
      return false;
    };

    // push i out of the box [x0,x1]x[y0,y1] along its least penetration
    const box = (i, x0, x1, y0, y1) => {
      const l = x[i] - x0 + rp, r = x1 - x[i] + rp, b = y[i] - y0 + rp, t = y1 - y[i] + rp;
      if (l <= 0 || r <= 0 || b <= 0 || t <= 0) return;
      const m = Math.min(l, r, b, t);
      if (m === l) x[i] = x0 - rp;
      else if (m === r) x[i] = x1 + rp;
      else if (m === b) y[i] = y0 - rp;
      else y[i] = y1 + rp;
    };
    const collide = (i, dt) => {
      x[i] = Math.min(W - rp, Math.max(rp, x[i]));
      y[i] = Math.min(H - rp, Math.max(rp, y[i]));
      for (const p of G.plates) {
        const y0 = p.y - p.thickness / 2, y1 = p.y + p.thickness / 2;
        if (y[i] < y0 - rp || y[i] > y1 + rp) continue;
        let x0 = 0;
        for (const hx of p.holes) {
          box(i, x0, hx - p.holeWidth / 2, y0, y1);
          x0 = hx + p.holeWidth / 2;
        }
        box(i, x0, W, y0, y1);
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
          const ox = nd > 1e-9 ? nx * f : -uy * gap;
          const oy = nd > 1e-9 ? ny * f : ux * gap;
          x[i] += ox;
          y[i] += oy;
        }
        // the liquid's momentum change is the wheel's, the other way round
        const ix = x[i] - bx, iy = y[i] - by;
        if (ix !== 0 || iy !== 0) w.torque -= ((bx - w.x) * iy - (by - w.y) * ix) / dt;
      }
    };

    const liquid = {
      n, s, h, rp, x, y, vx, vy, wheels,
      // one time step: gravity g (a vector in tube units per s^2), parameters p
      step(dt, gx, gy, p) {
        const { drag, nozzle, stiffness, cohesion, restDensity, viscosity, thickening, wheelInertia, wheelDrag } = p;
        for (const w of wheels) {
          w.omega *= Math.exp(-wheelDrag * dt);
          w.theta += w.omega * dt;
          w.torque = 0;
        }
        const f = 1 / (1 + drag * dt);
        for (let i = 0; i < n; i++) {
          vx[i] = (vx[i] + gx * dt) * f;
          vy[i] = (vy[i] + gy * dt) * f;
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
        // double density relaxation: pressure from density, and a near pressure
        // that keeps particles apart and, below rest density, pulls them together
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
          const P = stiffness * (rho - restDensity), Pn = cohesion * near;
          let dx = 0, dy = 0;
          for (let r = 0; r < k; r += 2) for (let o = ranges[r]; o < ranges[r + 1]; o++) {
            const j = order[o];
            if (j === i) continue;
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
          // a nozzle is a porous plug: inside one, only a share of the step's motion survives
          if (nozzle < 1 && inHole(i)) {
            x[i] = px[i] + (x[i] - px[i]) * nozzle;
            y[i] = py[i] + (y[i] - py[i]) * nozzle;
          }
          collide(i, dt);
          vx[i] = (x[i] - px[i]) / dt;
          vy[i] = (y[i] - py[i]) / dt;
        }
        for (const w of wheels) w.omega += w.torque / wheelInertia;
      },
      // how much of the liquid is below y
      below(yy) {
        let c = 0;
        for (let i = 0; i < n; i++) if (y[i] < yy) c++;
        return c / n;
      }
    };
    return liquid;
  };
};
const _t11 = function _liquid(createLiquid,particles,reset){return(
createLiquid(particles)
)};
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
      nozzle: range("nozzle", [0.01, 1], 0.01, "nozzle flow"),
      stiffness: range("stiffness", [0, 1000], 10, "stiffness"),
      cohesion: range("cohesion", [0, 3000], 10, "cohesion"),
      restDensity: range("restDensity", [0.5, 5], 0.05, "rest density"),
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
  drag: 3,
  nozzle: 0.7,
  stiffness: 100,
  cohesion: 150,
  restDensity: 2,
  viscosity: 4,
  thickening: 2,
  wheelInertia: 1,
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
      const n = liquid.n;
      if (xy.length < 2 * n) xy = new Float32Array(2 * n);
      for (let i = 0; i < n; i++) { xy[2 * i] = liquid.x[i]; xy[2 * i + 1] = liquid.y[i]; }
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
      // plates
      for (const p of G.plates) {
        c.fillStyle = "#d9d7d0";
        let x0 = 0;
        for (const hx of p.holes) {
          c.fillRect(x0, p.y - p.thickness / 2, hx - p.holeWidth / 2 - x0, p.thickness);
          x0 = hx + p.holeWidth / 2;
        }
        c.fillRect(x0, p.y - p.thickness / 2, G.width - x0, p.thickness);
      }
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
  $def("_t02", "controls", ["stage","html"], _t02);
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
