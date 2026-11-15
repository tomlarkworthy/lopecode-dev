// WebGPU renderer for the horde prototype. Classic script; defines makeRenderer(canvas, engine, opts).
// No textures or model files: every shape is a signed distance function in a fragment shader.
// Passes: floor grid (warped) + walls -> hdr; enemies, bullets, particles, ship -> trail (decayed each
// frame, so moving things leave streaks); trail added to hdr; bloom chain; final (tonemap, chromatic
// aberration, vignette, grain) -> canvas.
"use strict";

const HORDE_WGSL_COMMON = /* wgsl */ `
struct U {
  viewProj: mat4x4f,
  screen: vec4f,      // w, h, time, shake
  player: vec4f,      // x, y, aim, flowPulse
  arena: vec4f,       // w, h, warpCount, density scale
  warps: array<vec4f, 48>, // x, y, age, strength
};
@group(0) @binding(0) var<uniform> u: U;
fn toWorld(p: vec2f, z: f32) -> vec4f { return vec4f(p.x, -p.y, z, 1.0); }
fn project(p: vec2f, z: f32) -> vec4f { return u.viewProj * toWorld(p, z); }
// displacement of the floor at p: expanding ripples from explosions plus a dent under the player
fn warpAt(p: vec2f) -> vec3f {
  var d = vec3f(0.0);
  let n = i32(u.arena.z);
  for (var i = 0; i < n; i++) {
    let w = u.warps[i];
    let v = p - w.xy;
    let r = length(v) + 1e-4;
    let front = w.z * 16.0;
    let ring = exp(-pow((r - front) * 0.55, 2.0)) * exp(-w.z * 2.2) * w.w;
    let bowl = exp(-r * r * 0.08) * exp(-w.z * 4.0) * w.w;
    d += vec3f(v / r * ring * 0.9, -ring * 0.8 - bowl * 1.2);
  }
  let pv = p - u.player.xy;
  let pr = length(pv) + 1e-4;
  d += vec3f(pv / pr * exp(-pr * 0.6) * 0.35, -exp(-pr * pr * 0.12) * 0.9);
  return d;
}
`;

const HORDE_WGSL_FLOOR = HORDE_WGSL_COMMON + /* wgsl */ `
@group(0) @binding(1) var<storage, read> flowBuf: array<f32>;
@group(0) @binding(2) var<storage, read> crowdBuf: array<f32>;
@group(0) @binding(3) var<storage, read> wallBuf: array<u32>;
struct VO { @builtin(position) pos: vec4f, @location(0) w: vec2f, @location(1) lift: f32 };
@vertex fn vs(@location(0) p: vec2f) -> VO {
  let d = warpAt(p);
  var o: VO;
  o.pos = project(p + d.xy, d.z);
  o.w = p;
  o.lift = length(d);
  return o;
}
fn tileAt(p: vec2f) -> i32 { let t = vec2i(floor(p)); return t.y * i32(u.arena.x) + t.x; }
fn gridLine(c: vec2f, period: f32, width: f32) -> f32 {
  let g = abs(fract(c / period + 0.5) - 0.5) * period;
  let fw = fwidth(c);
  let l = 1.0 - smoothstep(vec2f(0.0), fw * 1.5 + width, g);
  return max(l.x, l.y);
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let t = tileAt(i.w);
  let wall = wallBuf[t];
  let dist = flowBuf[t * 3];
  let crowd = crowdBuf[t * 3];
  let fine = gridLine(i.w, 1.0, 0.0);
  let major = gridLine(i.w, 4.0, 0.02);
  var col = vec3f(0.006, 0.004, 0.016);
  let base = vec3f(0.10, 0.12, 0.5);
  col += base * fine * 0.08 + vec3f(0.3, 0.2, 0.9) * major * 0.16;
  // the warp lights the grid where it bends
  col += vec3f(0.6, 0.3, 1.2) * (fine + major) * min(i.lift, 1.5) * 1.2;
  if (wall == 0u && dist < 1e8) {
    // a sonar pulse running out from the player along the flow field's distance
    let ph = fract(dist * 0.03 - u.screen.z * 0.35);
    let pulse = exp(-ph * 40.0) + exp(-(1.0 - ph) * 200.0);
    col += vec3f(0.1, 0.45, 0.9) * pulse * (0.25 + 0.75 * fine) * 0.5 * exp(-dist * 0.012);
    // the crowd warms the floor under it
    let heat = 1.0 - exp(-crowd * u.arena.w);
    col += vec3f(0.5, 0.05, 0.25) * heat * 0.22;
  } else if (wall == 1u) {
    col = vec3f(0.004, 0.006, 0.02) + vec3f(0.05, 0.08, 0.3) * fine * 0.25;
  }
  return vec4f(col, 1.0);
}
`;

// segments: (ax, ay, bx, by), drawn as camera-independent quads around the segment, at height z
const HORDE_WGSL_WALLS = HORDE_WGSL_COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) len: f32, @location(2) layer: f32 };
const R = 0.7;
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32, @location(0) seg: vec4f) -> VO {
  let corner = array<vec2f, 6>(vec2f(0, -1), vec2f(1, -1), vec2f(1, 1), vec2f(0, -1), vec2f(1, 1), vec2f(0, 1))[vi];
  let layer = f32(ii & 1u);
  let a = seg.xy; let b = seg.zw;
  let dir = normalize(b - a); let nrm = vec2f(-dir.y, dir.x);
  let len = length(b - a);
  let along = -R + corner.x * (len + 2.0 * R);
  let p = a + dir * along + nrm * corner.y * R;
  let z = layer * 0.75;
  let d = warpAt(p) * 0.6;
  var o: VO;
  o.pos = project(p + d.xy, z + d.z);
  o.q = vec2f(along, corner.y * R);
  o.len = len;
  o.layer = layer;
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let x = clamp(i.q.x, 0.0, i.len);
  let d = length(vec2f(i.q.x - x, i.q.y));
  let core = exp(-d * d * 900.0);
  let glow = exp(-d * 7.0) * 0.22 + exp(-d * 2.5) * 0.06;
  let flick = 0.92 + 0.08 * sin(u.screen.z * 3.0 + i.q.x * 0.3);
  let tint = select(vec3f(0.15, 0.35, 1.6), vec3f(0.25, 0.7, 2.4), i.layer > 0.5);
  return vec4f(tint * (core * 2.6 + glow * 1.3) * flick, 0.0);
}
`;

// agents straight from the simulation's buffer: x, y, vx, vy, life
const HORDE_WGSL_ENEMY = HORDE_WGSL_COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) @interpolate(flat) kind: u32, @location(2) heat: f32, @location(3) spin: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) id: u32, @location(0) pv: vec4f, @location(1) life: f32) -> VO {
  let corner = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1))[vi];
  let kind = id % 3u;
  let size = select(select(0.22, 0.2, kind == 1u), 0.28, kind == 2u) * 1.9;
  var o: VO;
  let alive = life > 0.0;
  let v = pv.zw;
  let sp = length(v);
  let dir = select(vec2f(1, 0), v / sp, sp > 1e-3);
  // kind 1 points along its velocity; the others spin
  let spin = select(u.screen.z * (1.5 + f32(id % 7u) * 0.3) + f32(id), atan2(dir.y, dir.x), kind == 1u);
  let cs = vec2f(cos(spin), sin(spin));
  let c = corner * size;
  let p = pv.xy + vec2f(c.x * cs.x - c.y * cs.y, c.x * cs.y + c.y * cs.x);
  let d = warpAt(pv.xy);
  o.pos = select(vec4f(0, 0, -2, 1), project(p + d.xy, 0.18 + d.z), alive);
  o.q = corner * 1.9;
  o.kind = kind;
  o.heat = clamp(sp * 0.18, 0.0, 1.0);
  o.spin = spin;
  return o;
}
fn sdBox(p: vec2f, b: vec2f) -> f32 { let d = abs(p) - b; return length(max(d, vec2f(0))) + min(max(d.x, d.y), 0.0); }
fn sdTri(p0: vec2f) -> f32 {
  // a chevron pointing +x
  var p = vec2f(p0.x, abs(p0.y));
  let a = vec2f(0.95, 0.0); let b = vec2f(-0.75, 0.75); let c = vec2f(-0.35, 0.0);
  let e = b - a; let w = p - a;
  let h = clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
  let d1 = length(w - e * h);
  let e2 = c - b; let w2 = p - b;
  let h2 = clamp(dot(w2, e2) / dot(e2, e2), 0.0, 1.0);
  let d2 = length(w2 - e2 * h2);
  return min(d1, d2);
}
fn sdHex(p0: vec2f, r: f32) -> f32 {
  let k = vec3f(-0.866025404, 0.5, 0.577350269);
  var p = abs(p0);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2f(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let p = i.q;
  var d: f32; var col: vec3f;
  if (i.kind == 0u) {
    d = abs(sdBox(p, vec2f(0.62)) ) - 0.05;
    let inner = abs(sdBox(p, vec2f(0.22))) - 0.04;
    d = min(d, inner);
    col = mix(vec3f(1.6, 0.15, 1.0), vec3f(2.4, 0.5, 1.6), i.heat);
  } else if (i.kind == 1u) {
    d = sdTri(p) - 0.06;
    col = mix(vec3f(1.8, 0.7, 0.08), vec3f(2.6, 1.6, 0.4), i.heat);
  } else {
    d = abs(sdHex(p, 0.7)) - 0.06;
    let spokes = abs(p.x * 0.0 + length(p) - 0.28) - 0.05;
    d = min(d, spokes);
    col = mix(vec3f(0.15, 1.6, 0.5), vec3f(0.5, 2.4, 1.2), i.heat);
  }
  let aa = fwidth(p.x) * 1.2;
  let core = 1.0 - smoothstep(0.0, aa, d);
  let glow = exp(-max(d, 0.0) * 5.0) * 0.12;
  return vec4f(col * (core * 0.9 + glow), 0.0);
}
`;

// sparks: bullets, particles, the ship. 12 floats: x, y, z, dirx, diry, size, length, shape, r, g, b, a
const HORDE_WGSL_SPARK = HORDE_WGSL_COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) col: vec4f, @location(2) @interpolate(flat) shape: u32, @location(3) len: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f) -> VO {
  let corner = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1))[vi];
  let pos = a.xyz; let dir = vec2f(a.w, b.x); let size = b.y; let len = b.z;
  let nrm = vec2f(-dir.y, dir.x);
  let ext = vec2f(size + len, size) * 2.2;
  let local = corner * ext;
  let p = pos.xy + dir * local.x + nrm * local.y;
  let d = warpAt(pos.xy);
  var o: VO;
  o.pos = project(p + d.xy, pos.z + d.z);
  o.q = local / size;
  o.col = c;
  o.shape = u32(b.w);
  o.len = len / size;
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  var d: f32;
  let p = i.q;
  if (i.shape == 0u) {
    let x = clamp(p.x, -i.len, i.len * 0.2);
    d = length(vec2f(p.x - x, p.y)) - 0.35;
  } else if (i.shape == 1u) {
    d = abs(length(p) - 0.9) - 0.07;
  } else {
    var q = vec2f(p.x, abs(p.y));
    let e = vec2f(-1.6, 1.0) - vec2f(1.1, 0.0);
    let w = q - vec2f(1.1, 0.0);
    let h = clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    let e2 = vec2f(-0.8, 0.0) - vec2f(-1.6, 1.0);
    let w2 = q - vec2f(-1.6, 1.0);
    let h2 = clamp(dot(w2, e2) / dot(e2, e2), 0.0, 1.0);
    d = min(length(w - e * h), length(w2 - e2 * h2)) - 0.09;
  }
  let aa = fwidth(p.x) * 1.2;
  let core = 1.0 - smoothstep(0.0, aa, d);
  let glow = exp(-max(d, 0.0) * 3.0) * 0.2;
  return vec4f(i.col.rgb * (core * 1.4 + glow) * i.col.a, 0.0);
}
`;

const HORDE_WGSL_FULL = /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  let p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3))[vi];
  var o: VO; o.pos = vec4f(p, 0, 1); o.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); return o;
}
`;
const HORDE_WGSL_FADE = HORDE_WGSL_FULL + `@fragment fn fs() -> @location(0) vec4f { return vec4f(0); }`;
const HORDE_WGSL_COPY = HORDE_WGSL_FULL + `
@group(0) @binding(0) var src: texture_2d<f32>; @group(0) @binding(1) var smp: sampler;
@fragment fn fs(i: VO) -> @location(0) vec4f { return vec4f(textureSample(src, smp, i.uv).rgb, 0.0); }`;
const HORDE_WGSL_DOWN = HORDE_WGSL_FULL + `
@group(0) @binding(0) var src: texture_2d<f32>; @group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var<uniform> prm: vec4f; // texel x, texel y, threshold, first
fn s(uv: vec2f) -> vec3f { return textureSample(src, smp, uv).rgb; }
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let t = prm.xy; let uv = i.uv;
  let a = s(uv + t * vec2f(-2, -2)); let b = s(uv + t * vec2f(0, -2)); let c = s(uv + t * vec2f(2, -2));
  let d = s(uv + t * vec2f(-2, 0)); let e = s(uv); let f = s(uv + t * vec2f(2, 0));
  let g = s(uv + t * vec2f(-2, 2)); let h = s(uv + t * vec2f(0, 2)); let k = s(uv + t * vec2f(2, 2));
  let j = s(uv + t * vec2f(-1, -1)); let l = s(uv + t * vec2f(1, -1)); let m = s(uv + t * vec2f(-1, 1)); let n = s(uv + t * vec2f(1, 1));
  var col = e * 0.125 + (a + c + g + k) * 0.03125 + (b + d + f + h) * 0.0625 + (j + l + m + n) * 0.125;
  if (prm.w > 0.5) {
    let br = max(col.r, max(col.g, col.b));
    let soft = clamp(br - prm.z * 0.5, 0.0, prm.z) ; let w = max(soft * soft / (4.0 * prm.z + 1e-4), br - prm.z) / max(br, 1e-4);
    col = min(col * w, vec3f(40.0));
  }
  return vec4f(col, 1.0);
}`;
const HORDE_WGSL_UP = HORDE_WGSL_FULL + `
@group(0) @binding(0) var src: texture_2d<f32>; @group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var<uniform> prm: vec4f;
fn s(uv: vec2f) -> vec3f { return textureSample(src, smp, uv).rgb; }
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let t = prm.xy; let uv = i.uv;
  var col = s(uv) * 4.0;
  col += (s(uv + vec2f(t.x, 0)) + s(uv - vec2f(t.x, 0)) + s(uv + vec2f(0, t.y)) + s(uv - vec2f(0, t.y))) * 2.0;
  col += s(uv + t) + s(uv - t) + s(uv + vec2f(t.x, -t.y)) + s(uv + vec2f(-t.x, t.y));
  return vec4f(col / 16.0 * prm.z, 1.0);
}`;
const HORDE_WGSL_FINAL = HORDE_WGSL_FULL + `
@group(0) @binding(0) var hdr: texture_2d<f32>; @group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var bloom: texture_2d<f32>;
@group(0) @binding(3) var<uniform> prm: vec4f; // time, bloom strength, aberration, exposure
fn aces(x: vec3f) -> vec3f { let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0), vec3f(1)); }
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453); }
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let off = i.uv - 0.5;
  let ca = off * dot(off, off) * prm.z;
  let r = textureSample(hdr, smp, i.uv + ca).r + textureSample(bloom, smp, i.uv + ca * 1.6).r * prm.y;
  let g = textureSample(hdr, smp, i.uv).g + textureSample(bloom, smp, i.uv).g * prm.y;
  let b = textureSample(hdr, smp, i.uv - ca).b + textureSample(bloom, smp, i.uv - ca * 1.6).b * prm.y;
  var col = aces(vec3f(r, g, b) * prm.w);
  let vig = 1.0 - smoothstep(0.35, 0.95, length(off * vec2f(1.0, 0.85)));
  col *= mix(0.55, 1.0, vig);
  col += (hash(i.uv * 1000.0 + prm.x) - 0.5) * 0.018;
  col = pow(col, vec3f(1.0 / 1.05));
  return vec4f(col, 1.0);
}`;

function hordeMat4() {
  const persp = (fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, far * nf, -1, 0, 0, far * near * nf, 0];
  };
  const lookAt = (e, c, up) => {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  };
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  return { persp, lookAt, mul };
}

// wall outlines: tile edges between wall and floor, merged into runs
function hordeWallSegments(M) {
  const segs = [];
  const wall = (x, y) => x < 0 || y < 0 || x >= M.w || y >= M.h || M.walls[y * M.w + x] === 1;
  for (let side = 0; side < 2; side++) for (let y = 0; y <= M.h; y++) {
    let run = -1;
    for (let x = 0; x <= M.w; x++) {
      const edge = x < M.w && (side === 0 ? wall(x, y) && !wall(x, y - 1) && y > 0 : wall(x, y - 1) && !wall(x, y) && y < M.h);
      if (edge && run < 0) run = x;
      if (!edge && run >= 0) { segs.push(run, y, x, y); run = -1; }
    }
  }
  for (let side = 0; side < 2; side++) for (let x = 0; x <= M.w; x++) {
    let run = -1;
    for (let y = 0; y <= M.h; y++) {
      const edge = y < M.h && (side === 0 ? wall(x, y) && !wall(x - 1, y) && x > 0 : wall(x - 1, y) && !wall(x, y) && x < M.w);
      if (edge && run < 0) run = y;
      if (!edge && run >= 0) { segs.push(x, run, x, y); run = -1; }
    }
  }
  return new Float32Array(segs);
}

async function makeRenderer(canvas, engine, opts = {}) {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("no WebGPU adapter");
  const hasTs = adapter.features.has("timestamp-query");
  const device = await adapter.requestDevice({ requiredFeatures: hasTs ? ["timestamp-query"] : [] });
  const ctx = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });
  const M = engine.maze, N = opts.n;
  const W = canvas.width, H = canvas.height;
  const HDR = "rgba16float";
  const tex = (w, h) => device.createTexture({ size: [w, h], format: HDR, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
  const hdr = tex(W, H), trail = tex(W, H);
  const levels = [];
  for (let i = 1, w = W >> 1, h = H >> 1; i <= 6 && w > 4; i++, w >>= 1, h >>= 1) levels.push({ tex: tex(w, h), w, h });
  const smp = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });

  const ubuf = device.createBuffer({ size: 64 + 16 * 3 + 48 * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const tiles = M.w * M.h;
  const flowBuf = device.createBuffer({ size: tiles * 12, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const crowdBuf = device.createBuffer({ size: tiles * 12, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const wallBuf = device.createBuffer({ size: tiles * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(wallBuf, 0, Uint32Array.from(M.walls));

  // floor mesh: 3 vertices per tile per axis
  const GX = M.w * 3, GY = M.h * 3;
  const fv = new Float32Array((GX + 1) * (GY + 1) * 2);
  for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) { const i = (y * (GX + 1) + x) * 2; fv[i] = (x / GX) * M.w; fv[i + 1] = (y / GY) * M.h; }
  const fi = new Uint32Array(GX * GY * 6);
  for (let y = 0, k = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const a = y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1; fi.set([a, b, d, a, d, c], k); k += 6; }
  const floorV = device.createBuffer({ size: fv.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const floorI = device.createBuffer({ size: fi.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(floorV, 0, fv); device.queue.writeBuffer(floorI, 0, fi);
  const segs1 = hordeWallSegments(M);
  // each segment twice, consecutively: instance i draws layer i & 1 (floor line, top line)
  const segs = new Float32Array(segs1.length * 2);
  for (let i = 0; i < segs1.length / 4; i++) { segs.set(segs1.subarray(i * 4, i * 4 + 4), i * 8); segs.set(segs1.subarray(i * 4, i * 4 + 4), i * 8 + 4); }
  const segBuf = device.createBuffer({ size: segs.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(segBuf, 0, segs);
  const agentBuf = device.createBuffer({ size: Math.max(20, N * 20), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const MAXS = 65536;
  const sparkData = new Float32Array(MAXS * 12);
  const sparkBuf = device.createBuffer({ size: sparkData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

  const mod = (code) => device.createShaderModule({ code });
  const additive = { color: { srcFactor: "one", dstFactor: "one", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one", operation: "add" } };
  const pipe = (code, buffers, target, blend, topology) => {
    const m = mod(code);
    return device.createRenderPipeline({ layout: "auto", vertex: { module: m, entryPoint: "vs", buffers }, fragment: { module: m, entryPoint: "fs", targets: [{ format: target, blend }] }, primitive: { topology: topology || "triangle-list" } });
  };
  const pFloor = pipe(HORDE_WGSL_FLOOR, [{ arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] }], HDR);
  const pWalls = pipe(HORDE_WGSL_WALLS, [{ arrayStride: 16, stepMode: "instance", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }] }], HDR, additive);
  const maxBlend = { color: { srcFactor: "one", dstFactor: "one", operation: "max" }, alpha: { srcFactor: "one", dstFactor: "one", operation: "max" } };
  const pEnemy = pipe(HORDE_WGSL_ENEMY, [{ arrayStride: 20, stepMode: "instance", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }, { shaderLocation: 1, offset: 16, format: "float32" }] }], HDR, maxBlend);
  const pSpark = pipe(HORDE_WGSL_SPARK, [{ arrayStride: 48, stepMode: "instance", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }, { shaderLocation: 1, offset: 16, format: "float32x4" }, { shaderLocation: 2, offset: 32, format: "float32x4" }] }], HDR, additive);
  const fadeBlend = { color: { srcFactor: "zero", dstFactor: "constant", operation: "add" }, alpha: { srcFactor: "zero", dstFactor: "constant", operation: "add" } };
  const pFade = pipe(HORDE_WGSL_FADE, [], HDR, fadeBlend);
  const pCopy = pipe(HORDE_WGSL_COPY, [], HDR, additive);
  const pDown = pipe(HORDE_WGSL_DOWN, [], HDR);
  const pUp = pipe(HORDE_WGSL_UP, [], HDR, additive);
  const pFinal = pipe(HORDE_WGSL_FINAL, [], format);

  const bg = (p, entries) => device.createBindGroup({ layout: p.getBindGroupLayout(0), entries: entries.map((r, i) => ({ binding: i, resource: r })) });
  const U = { buffer: ubuf };
  const bgFloor = bg(pFloor, [U, { buffer: flowBuf }, { buffer: crowdBuf }, { buffer: wallBuf }]);
  const bgWalls = bg(pWalls, [U]), bgEnemy = bg(pEnemy, [U]), bgSpark = bg(pSpark, [U]);
  const bgCopy = bg(pCopy, [trail.createView(), smp]);
  const prm = (a) => { const b = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); device.queue.writeBuffer(b, 0, new Float32Array(a)); return b; };
  const downs = levels.map((L, i) => {
    const src = i === 0 ? { tex: hdr, w: W, h: H } : levels[i - 1];
    return { target: L.tex, bg: bg(pDown, [src.tex.createView(), smp, { buffer: prm([1 / src.w, 1 / src.h, 1.6, i === 0 ? 1 : 0]) }]) };
  });
  const ups = [];
  for (let i = levels.length - 1; i > 0; i--) ups.push({ target: levels[i - 1].tex, bg: bg(pUp, [levels[i].tex.createView(), smp, { buffer: prm([1 / levels[i].w, 1 / levels[i].h, 0.85, 0]) }]) });
  const finalPrm = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const bgFinal = bg(pFinal, [hdr.createView(), smp, levels[0].tex.createView(), { buffer: finalPrm }]);

  // timestamps: start of the first pass, end of the last
  let qs = null, qResolve = null, qRead = [], gpuMs = [];
  if (hasTs) {
    qs = device.createQuerySet({ type: "timestamp", count: 2 });
    qResolve = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    for (let i = 0; i < 4; i++) qRead.push({ buf: device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }), busy: false });
  }

  // particles, on the main thread: x, y, z, vx, vy, vz, life, max, r, g, b, size
  const PMAX = 48000, parts = new Float32Array(PMAX * 12);
  let pn = 0;
  let seed = 99;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const emit = (x, y, n, col, speed, life) => {
    for (let i = 0; i < n && pn < PMAX; i++, pn++) {
      const a = rnd() * 6.2832, s = speed * (0.25 + rnd() * 0.75), o = pn * 12;
      parts[o] = x; parts[o + 1] = y; parts[o + 2] = 0.3; parts[o + 3] = Math.cos(a) * s; parts[o + 4] = Math.sin(a) * s; parts[o + 5] = 2 + rnd() * 5;
      parts[o + 6] = life * (0.5 + rnd() * 0.5); parts[o + 7] = parts[o + 6]; parts[o + 8] = col[0]; parts[o + 9] = col[1]; parts[o + 10] = col[2]; parts[o + 11] = 0.05 + rnd() * 0.06;
    }
  };
  const warps = []; // {x, y, t0, s}
  let shake = 0, time = 0;
  const KCOL = [[2.2, 0.3, 1.4], [2.4, 1.1, 0.2], [0.3, 2.2, 0.8]];
  const ME = hordeMat4();
  const camera = { x: M.w / 2, y: M.h / 2 + 2, dist: 84, tilt: 0.45, fov: 0.75 };

  function absorb(dt) {
    // kills and bullet impacts from the last sim step
    let kills = 0;
    for (const e of engine.events) {
      if (e.kind === 0) {
        kills++;
        emit(e.x, e.y, 18, KCOL[(e.id ?? kills) % 3] || KCOL[0], 7, 0.8);
        emit(e.x, e.y, 4, [1.6, 1.6, 1.8], 11, 0.3);
        if (warps.length < 48) warps.push({ x: e.x, y: e.y, t0: time, s: 0.35 });
      } else emit(e.x, e.y, 3, [0.6, 1.2, 3], 4, 0.3);
    }
    shake = Math.min(1.2, shake + kills * 0.03);
  }
  function explode(x, y, s) { if (warps.length >= 48) warps.shift(); warps.push({ x, y, t0: time, s }); emit(x, y, 1800, [2.5, 1.2, 3.0], 22, 1.4); emit(x, y, 600, [4, 4, 4], 34, 0.6); shake = Math.min(2, shake + s); }
  function stepParticles(dt) {
    let k = 0;
    for (let i = 0; i < pn; i++) {
      const o = i * 12;
      const life = parts[o + 6] - dt;
      if (life <= 0) continue;
      const q = k * 12;
      if (q !== o) parts.copyWithin(q, o, o + 12);
      const damp = Math.exp(-2.2 * dt);
      parts[q + 3] *= damp; parts[q + 4] *= damp;
      let x = parts[q] + parts[q + 3] * dt, y = parts[q + 1] + parts[q + 4] * dt;
      if (M.walls[Math.floor(y) * M.w + Math.floor(x)] === 1) { parts[q + 3] *= -0.5; parts[q + 4] *= -0.5; x = parts[q]; y = parts[q + 1]; }
      parts[q] = x; parts[q + 1] = y;
      parts[q + 5] -= 14 * dt; parts[q + 2] = Math.max(0.05, parts[q + 2] + parts[q + 5] * dt);
      parts[q + 6] = life;
      k++;
    }
    pn = k;
  }

  let lastStats = { gpu: 0 };
  function frame(dt) {
    time += dt;
    absorb(dt);
    stepParticles(dt);
    for (let i = warps.length - 1; i >= 0; i--) if (time - warps[i].t0 > 2.5) warps.splice(i, 1);
    shake *= Math.exp(-6 * dt);
    // agents
    const ch = engine.chunks, rg = engine.ranges;
    for (let i = 0; i < ch.length; i++) device.queue.writeBuffer(agentBuf, rg[i].base * 20, ch[i].buffer, ch[i].byteOffset, ch[i].byteLength);
    if (engine.flow) device.queue.writeBuffer(flowBuf, 0, engine.flow);
    if (engine.crowd) device.queue.writeBuffer(crowdBuf, 0, engine.crowd);
    // sparks: bullets, particles, ship
    let s = 0;
    const put = (x, y, z, dx, dy, size, len, shape, r, g, b, a) => { if (s >= MAXS) return; const o = s * 12; sparkData[o] = x; sparkData[o + 1] = y; sparkData[o + 2] = z; sparkData[o + 3] = dx; sparkData[o + 4] = dy; sparkData[o + 5] = size; sparkData[o + 6] = len; sparkData[o + 7] = shape; sparkData[o + 8] = r; sparkData[o + 9] = g; sparkData[o + 10] = b; sparkData[o + 11] = a; s++; };
    const B = engine.bullets;
    if (!opts.hide?.includes("bullets")) for (let i = 0; i < B.length; i += 4) { const vx = B[i + 2], vy = B[i + 3], l = Math.hypot(vx, vy) || 1; put(B[i], B[i + 1], 0.35, vx / l, vy / l, 0.06, 0.45, 0, 1.6, 1.3, 0.5, 1); }
    if (!opts.hide?.includes("particles")) for (let i = 0; i < pn; i++) {
      const o = i * 12, vx = parts[o + 3], vy = parts[o + 4], l = Math.hypot(vx, vy) || 1, f = parts[o + 6] / parts[o + 7];
      put(parts[o], parts[o + 1], parts[o + 2], vx / l, vy / l, parts[o + 11], Math.min(0.6, l * 0.03), 0, parts[o + 8], parts[o + 9], parts[o + 10], f * f);
    }
    const pl = engine.player, aim = engine.aim;
    put(pl[0], pl[1], 0.45, Math.cos(aim), Math.sin(aim), 0.42, 0, 2, 1.4, 2.6, 3.0, 1);
    put(pl[0], pl[1], 0.3, 1, 0, 1.0, 0, 1, 0.2, 0.7, 1.6, 0.5 + 0.2 * Math.sin(time * 6));
    device.queue.writeBuffer(sparkBuf, 0, sparkData.buffer, 0, s * 48);
    // uniforms
    const cam = opts.camera ? opts.camera(time, engine) : camera;
    const shx = (rnd() - 0.5) * shake * 0.5, shy = (rnd() - 0.5) * shake * 0.5;
    const tx = cam.x + shx, ty = -(cam.y + shy);
    const eye = [tx, ty - cam.dist * Math.sin(cam.tilt), cam.dist * Math.cos(cam.tilt)];
    const vp = ME.mul(ME.persp(cam.fov, W / H, 1, 500), ME.lookAt(eye, [tx, ty, 0], [0, 1, 0]));
    const ud = new Float32Array(ubuf.size / 4);
    ud.set(vp, 0);
    ud.set([W, H, time, shake], 16);
    ud.set([pl[0], pl[1], aim, 0], 20);
    ud.set([M.w, M.h, warps.length, opts.densityScale || 0.25], 24);
    warps.forEach((w, i) => ud.set([w.x, w.y, time - w.t0, w.s], 28 + i * 4));
    device.queue.writeBuffer(ubuf, 0, ud);
    device.queue.writeBuffer(finalPrm, 0, new Float32Array([time, opts.bloom ?? 0.55, opts.aberration ?? 0.018, opts.exposure ?? 1.0]));

    const enc = device.createCommandEncoder();
    const ts = (b, e) => (qs ? { querySet: qs, beginningOfPassWriteIndex: b, endOfPassWriteIndex: e } : undefined);
    const att = (view, load, clear) => ({ view, loadOp: load, storeOp: "store", clearValue: clear || [0, 0, 0, 1] });
    // trail: fade what is there, then draw the emissive things on top
    let pass = enc.beginRenderPass({ colorAttachments: [att(trail.createView(), "load")], timestampWrites: qs ? { querySet: qs, beginningOfPassWriteIndex: 0 } : undefined });
    pass.setPipeline(pFade); pass.setBlendConstant([opts.trail ?? 0.72, opts.trail ?? 0.72, opts.trail ?? 0.72, 1]); pass.draw(3);
    pass.setPipeline(pEnemy); pass.setBindGroup(0, bgEnemy); pass.setVertexBuffer(0, agentBuf); pass.draw(6, N);
    pass.end();
    pass = enc.beginRenderPass({ colorAttachments: [att(hdr.createView(), "clear")] });
    pass.setPipeline(pFloor); pass.setBindGroup(0, bgFloor); pass.setVertexBuffer(0, floorV); pass.setIndexBuffer(floorI, "uint32"); pass.drawIndexed(fi.length);
    pass.setPipeline(pWalls); pass.setBindGroup(0, bgWalls); pass.setVertexBuffer(0, segBuf); pass.draw(6, segs.length / 4);
    pass.setPipeline(pCopy); pass.setBindGroup(0, bgCopy); pass.draw(3);
    // sparks go straight to hdr: in the trail an additive spark that stays put (a kill zone) would sum to white
    pass.setPipeline(pSpark); pass.setBindGroup(0, bgSpark); pass.setVertexBuffer(0, sparkBuf); pass.draw(6, s);
    pass.end();
    for (const d of downs) { pass = enc.beginRenderPass({ colorAttachments: [att(d.target.createView(), "clear")] }); pass.setPipeline(pDown); pass.setBindGroup(0, d.bg); pass.draw(3); pass.end(); }
    for (const u of ups) { pass = enc.beginRenderPass({ colorAttachments: [att(u.target.createView(), "load")] }); pass.setPipeline(pUp); pass.setBindGroup(0, u.bg); pass.draw(3); pass.end(); }
    pass = enc.beginRenderPass({ colorAttachments: [att(ctx.getCurrentTexture().createView(), "clear")], timestampWrites: qs ? { querySet: qs, endOfPassWriteIndex: 1 } : undefined });
    pass.setPipeline(pFinal); pass.setBindGroup(0, bgFinal); pass.draw(3); pass.end();
    let slot = null;
    if (qs) {
      enc.resolveQuerySet(qs, 0, 2, qResolve, 0);
      slot = qRead.find((q) => !q.busy);
      if (slot) enc.copyBufferToBuffer(qResolve, 0, slot.buf, 0, 16);
    }
    device.queue.submit([enc.finish()]);
    if (slot) {
      slot.busy = true;
      slot.buf.mapAsync(GPUMapMode.READ).then(() => {
        const t = new BigInt64Array(slot.buf.getMappedRange());
        const ms = Number(t[1] - t[0]) / 1e6;
        slot.buf.unmap(); slot.busy = false;
        if (ms > 0 && ms < 1000) gpuMs.push(ms);
      });
    }
    return { sparks: s, particles: pn };
  }
  return { device, frame, explode, gpuMs, camera, hasTs, get particles() { return pn; } };
}
