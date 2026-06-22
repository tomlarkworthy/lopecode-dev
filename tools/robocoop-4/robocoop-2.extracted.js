
const _bcrbvp = function _1(md){return(
md`# Roboco-op 2.1: Notebook collaborator
`
)};
const _6tzb9m = function _2(robocoop2){return(
robocoop2()
)};
const _rxi385 = function _3(md){return(
md`## Usage

Import cell \`robocoop\`:-

~~~js
import {robocoop2} from "@tomlarkworthy/robocoop-2"
~~~

execute the cell in your notebook:

~~~js
robocoop2()
~~~`
)};
const _cgr7pz = function _4(md){return(
md`## Introduction`
)};
const _1umx4m3 = function _5(md){return(
md`Roboco-op blends [Observablehq.com](https://observablehq.com/)'s reactive notebooks with an **open source** userspace AI coding assistant. Observable notebooks are a unique coding environment because the code development and runtime state are mixed together. This means Robocoop can write code and see the executed result.`
)};
const _141h9uf = function _6(md){return(
md`## Made by Roboco-op 2.0`
)};
const _oity7e = function _pong_game(html,Inputs,ResizeObserver,invalidation)
{
  const root = html`<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; display:grid; gap:10px; max-width: 920px; margin: 0 auto;">
    <style>
      .pong-card{background:#fff;border:1px solid #e7e7ea;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.06);overflow:hidden}
      .pong-toolbar{display:grid;gap:10px;padding:12px}
      .pong-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
      .pong-left{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .pong-score{font-weight:800;font-size:20px;letter-spacing:.02em}
      .pong-status{color:#667085;font-size:12px}
      .pong-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .pong-controls label{display:flex;gap:6px;align-items:center;font-size:12px;color:#344054;background:#f6f7f9;border:1px solid #e7e7ea;border-radius:999px;padding:6px 10px}
      .pong-controls select,.pong-controls input[type="number"]{font-size:12px;border:1px solid #d0d5dd;border-radius:8px;padding:4px 8px;background:#fff}
      .pong-controls input[type="checkbox"]{transform:translateY(.5px)}
      .pong-btns{display:flex;gap:8px;align-items:center}
      .pong-btns button{padding:7px 10px;border-radius:10px;border:1px solid #d0d5dd;background:#fff;font-weight:600;font-size:12px}
      .pong-btns button:active{transform:translateY(1px)}
      .pong-canvas-wrap{position:relative;background:#0d0f14;border-radius:12px;overflow:hidden}
      .pong-help{padding:0 12px 12px;color:#667085;font-size:12px}
      .pong-help ul{margin:6px 0 0 16px;line-height:1.6}
      .pong-note{color:#475467;font-size:12px}
      .pong-kbd{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;background:#f2f4f7;border:1px solid #e7e7ea;border-radius:6px;padding:1px 6px}
    </style>

    <div class="pong-card">
      <div class="pong-toolbar">
        <div class="pong-row">
          <div class="pong-left">
            <div class="pong-score" aria-live="polite" aria-atomic="true">0 — 0</div>
            <div class="pong-status">W/S & ↑/↓ to move • P to pause</div>
          </div>
          <div class="pong-btns">
            <button type="button" class="pause" aria-label="Pause or resume">Pause</button>
            <button type="button" class="reset" aria-label="Reset">Reset</button>
          </div>
        </div>

        <div class="pong-row">
          <div class="pong-controls" role="group" aria-label="Game options"></div>
          <div class="pong-note">Tip: press <span class="pong-kbd">Space</span> to serve early.</div>
        </div>
      </div>

      <div class="pong-canvas-wrap" aria-label="Pong playfield"></div>

      <div class="pong-help">
        <details>
          <summary>Controls</summary>
          <ul>
            <li>Left paddle: <span class="pong-kbd">W</span>/<span class="pong-kbd">S</span> or drag on left half</li>
            <li>Right paddle: <span class="pong-kbd">↑</span>/<span class="pong-kbd">↓</span> or drag on right half (2P mode)</li>
            <li><span class="pong-kbd">P</span>: Pause/Resume • <span class="pong-kbd">R</span>: Reset • <span class="pong-kbd">Space</span>: Serve</li>
          </ul>
        </details>
      </div>
    </div>
  </div>`;

  const wrap = root.querySelector(".pong-canvas-wrap");
  const scoreEl = root.querySelector(".pong-score");
  const statusEl = root.querySelector(".pong-status");
  const btnPause = root.querySelector(".pause");
  const btnReset = root.querySelector(".reset");
  const controlsHost = root.querySelector(".pong-controls");

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rand = (a, b) => a + Math.random() * (b - a);

  const controlForm = Inputs.form({
    mode: Inputs.select(
      [
        ["1", "1 Player (AI)"],
        ["2", "2 Players"]
      ],
      { label: "Mode", value: "1" }
    ),
    ai: Inputs.select(
      [
        ["easy", "Easy"],
        ["normal", "Normal"],
        ["hard", "Hard"],
        ["insane", "Insane"]
      ],
      { label: "AI", value: "normal" }
    ),
    scoreToWin: Inputs.select(
      [
        ["5", "First to 5"],
        ["7", "First to 7"],
        ["11", "First to 11"],
        ["21", "First to 21"],
        ["0", "Endless"]
      ],
      { label: "Win", value: "11" }
    ),
    baseSpeed: Inputs.range([260, 640], {
      label: "Ball",
      step: 10,
      value: 380
    }),
    paddleHeight: Inputs.range([0.14, 0.34], {
      label: "Paddle",
      step: 0.01,
      value: 0.22
    }),
    trail: Inputs.toggle({ label: "Trail", value: true }),
    sparks: Inputs.toggle({ label: "Sparks", value: true }),
    sound: Inputs.toggle({ label: "Sound", value: false })
  });

  const badgeWrap = html`<div style="display:flex;gap:10px;flex-wrap:wrap"></div>`;
  for (const el of controlForm.querySelectorAll(
    "label, .observablehq--inspect"
  )) {
    if (el.tagName?.toLowerCase?.() === "label") badgeWrap.appendChild(el);
  }
  controlsHost.appendChild(badgeWrap);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Pong canvas");
  canvas.setAttribute("role", "img");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const dim = { W: 800, H: 450, DPR: 1 };

  const TARGET_ASPECT = 16 / 9;
  const MAX_W = 900;
  const MIN_W = 420;

  const resizeCanvas = () => {
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(MIN_W, Math.min(MAX_W, wrap.clientWidth || MAX_W));
    const h = Math.round(w / TARGET_ASPECT);
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    canvas.style.height = `${h}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dim.W = w;
    dim.H = h;
    dim.DPR = DPR;
  };

  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(wrap);

  const keys = new Set();
  const pointers = new Map();

  const aiParams = {
    easy: { react: 0.06, jitter: 0.4, maxSpeed: 260, lookahead: 0.55 },
    normal: { react: 0.1, jitter: 0.22, maxSpeed: 340, lookahead: 0.75 },
    hard: { react: 0.16, jitter: 0.12, maxSpeed: 450, lookahead: 0.92 },
    insane: { react: 0.22, jitter: 0.06, maxSpeed: 620, lookahead: 1.05 }
  };

  const state = {
    paused: false,
    over: null,
    waitingServeMs: 900,
    servingDir: rand(0, 1) < 0.5 ? -1 : 1,
    lastScored: null,
    scores: [0, 0],
    rally: 0,
    lastTime: 0,
    raf: 0,
    particles: [],
    pool: [],
    trail: [],
    audio: { ctx: null, enabled: false, master: null }
  };

  const getOpts = () => {
    const v = controlForm.value;
    const singlePlayer = v.mode === "1";
    const ai = v.ai;
    const scoreToWin = +v.scoreToWin || 0;
    const baseSpeed = +v.baseSpeed;
    const paddleHeight = +v.paddleHeight;
    const trail = !!v.trail;
    const sparks = !!v.sparks;
    const sound = !!v.sound;
    return {
      singlePlayer,
      ai,
      scoreToWin,
      baseSpeed,
      paddleHeight,
      trail,
      sparks,
      sound
    };
  };

  const ensureAudio = async () => {
    const { sound } = getOpts();
    state.audio.enabled = sound;
    if (!sound) return;
    if (state.audio.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const a = new AudioCtx();
    const master = a.createGain();
    master.gain.value = 0.12;
    master.connect(a.destination);
    state.audio.ctx = a;
    state.audio.master = master;
    if (a.state === "suspended") {
      try {
        await a.resume();
      } catch {}
    }
  };

  const beep = async (freq = 440, dur = 0.05, type = "square") => {
    const { sound } = getOpts();
    if (!sound) return;
    await ensureAudio();
    const a = state.audio.ctx;
    const master = state.audio.master;
    if (!a || !master) return;
    try {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(master);
      const t0 = a.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {}
  };

  const spawnSparks = (x, y, nx, ny, count, col) => {
    const { sparks } = getOpts();
    if (!sparks) return;
    for (let i = 0; i < count; i++) {
      const p = state.pool.pop() || {};
      p.x = x;
      p.y = y;
      const ang = Math.atan2(ny, nx) + rand(-0.7, 0.7);
      const spd = rand(90, 310);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.life = rand(0.22, 0.58);
      p.age = 0;
      p.size = rand(1, 2.3);
      p.color = col;
      state.particles.push(p);
    }
  };

  const updateParticles = (dt) => {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      if (p.age >= p.life) {
        state.particles.splice(i, 1);
        state.pool.push(p);
      }
    }
  };

  const drawParticles = () => {
    if (state.particles.length === 0) return;
    ctx.save();
    for (const p of state.particles) {
      const t = p.age / p.life;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  };

  const rectsOverlap = (bx, by, br, rx, ry, rw, rh) => {
    const cx = clamp(bx, rx, rx + rw);
    const cy = clamp(by, ry, ry + rh);
    const dx = bx - cx;
    const dy = by - cy;
    return dx * dx + dy * dy <= br * br;
  };

  const predictInterceptY = (ball, targetX, W, H, r) => {
    const dx = targetX - ball.x;
    if (ball.vx === 0) return ball.y;
    const t = dx / ball.vx;
    if (t <= 0) return ball.y;
    const y = ball.y + ball.vy * t;
    const span = H - 2 * r;
    if (span <= 0) return clamp(y, r, H - r);
    const n = (y - r) / span;
    const m = ((n % 2) + 2) % 2;
    const folded = m <= 1 ? m : 2 - m;
    const yy = r + folded * span;
    return clamp(yy, r, H - r);
  };

  const entity = {
    paddles: null,
    ball: null
  };

  const initEntities = () => {
    const { paddleHeight, baseSpeed } = getOpts();
    const W = dim.W,
      H = dim.H;
    const padW = Math.max(10, Math.round(W * 0.016));
    const padH = Math.max(64, Math.round(H * paddleHeight));
    const margin = Math.max(16, Math.round(W * 0.024));

    entity.paddles = [
      {
        x: margin,
        y: (H - padH) / 2,
        w: padW,
        h: padH,
        vy: 0,
        color: "#ffffff",
        lastHitAt: -1
      },
      {
        x: W - margin - padW,
        y: (H - padH) / 2,
        w: padW,
        h: padH,
        vy: 0,
        color: "#ffffff",
        lastHitAt: -1
      }
    ];

    entity.ball = {
      x: W / 2,
      y: H / 2,
      r: Math.max(6, Math.round(H * 0.015)),
      vx: 0,
      vy: 0,
      speed: baseSpeed
    };

    state.trail.length = 0;
    state.particles.length = 0;
    state.rally = 0;
    state.over = null;
    state.waitingServeMs = 900;
    state.servingDir = rand(0, 1) < 0.5 ? -1 : 1;
    serve(state.servingDir, state.waitingServeMs);
  };

  const serve = (dirX, delayMs = 900) => {
    const { baseSpeed } = getOpts();
    const b = entity.ball;
    state.waitingServeMs = delayMs;
    state.servingDir = dirX;

    const angle = rand(-0.28, 0.28) * Math.PI;
    const s = baseSpeed * (1 + rand(-0.04, 0.04));
    b.x = dim.W / 2;
    b.y = dim.H / 2;
    b.speed = s;
    b.vx = Math.cos(angle) * s * dirX;
    b.vy = Math.sin(angle) * s;
    state.rally = 0;
  };

  const hardReset = () => {
    state.scores = [0, 0];
    state.lastScored = null;
    initEntities();
    draw();
  };

  const togglePause = () => {
    state.paused = !state.paused;
    draw();
  };

  const maybeWin = () => {
    const { scoreToWin } = getOpts();
    if (!scoreToWin) return false;
    const [a, b] = state.scores;
    if (a >= scoreToWin || b >= scoreToWin) {
      state.over = a > b ? 0 : 1;
      state.paused = true;
      return true;
    }
    return false;
  };

  const collidePaddle = (b, p, isLeft, timeTag) => {
    if (p.lastHitAt === timeTag) return false;
    if (!rectsOverlap(b.x, b.y, b.r, p.x, p.y, p.w, p.h)) return false;

    const pct = ((b.y - p.y) / p.h) * 2 - 1;
    const offset = clamp(pct, -1, 1);

    const toward = isLeft ? b.vx < 0 : b.vx > 0;
    if (!toward) {
      const nudge = isLeft ? p.x + p.w + b.r + 0.8 : p.x - b.r - 0.8;
      b.x = nudge;
      return true;
    }

    const { baseSpeed } = getOpts();
    const cur = Math.hypot(b.vx, b.vy);
    const speedMax = Math.max(900, baseSpeed * 2.2);
    const spinFactor = Math.max(240, baseSpeed * 0.72);

    const nextSpeed = clamp(cur + 18 + state.rally * 2.0, baseSpeed, speedMax);
    const newVy = clamp(b.vy + offset * spinFactor, -speedMax, speedMax);
    const dirX = isLeft ? 1 : -1;
    const newVxMag = Math.sqrt(
      Math.max(1, nextSpeed * nextSpeed - newVy * newVy)
    );
    const newVx = newVxMag * dirX;

    b.vx = newVx;
    b.vy = newVy;
    b.speed = Math.hypot(b.vx, b.vy);

    b.x = isLeft ? p.x + p.w + b.r + 0.8 : p.x - b.r - 0.8;

    p.lastHitAt = timeTag;
    state.rally += 1;

    spawnSparks(b.x, clamp(b.y, p.y, p.y + p.h), dirX, 0, 14, "#e6f3ff");
    beep(isLeft ? 520 : 600, 0.04, "square");
    return true;
  };

  const step = (dt, timeTag) => {
    const { singlePlayer, ai } = getOpts();
    const W = dim.W,
      H = dim.H;
    const [L, R] = entity.paddles;
    const b = entity.ball;

    if (state.waitingServeMs > 0) {
      state.waitingServeMs -= dt * 1000;
      if (state.waitingServeMs < 0) state.waitingServeMs = 0;
      return;
    }

    const paddleSpeed = Math.max(420, W * 0.64);
    let leftMove = 0,
      rightMove = 0;
    if (keys.has("KeyW")) leftMove -= 1;
    if (keys.has("KeyS")) leftMove += 1;
    if (keys.has("ArrowUp")) rightMove -= 1;
    if (keys.has("ArrowDown")) rightMove += 1;

    L.vy = leftMove * paddleSpeed;
    if (!singlePlayer) R.vy = rightMove * paddleSpeed;

    if (singlePlayer) {
      const aip = aiParams[ai] || aiParams.normal;
      const targetX = R.x;
      const towardAI = b.vx > 0 || b.x > W * 0.42;
      const intercept = towardAI
        ? predictInterceptY(b, targetX, W, H, b.r)
        : H / 2;
      const jitter = rand(-1, 1) * aip.jitter * 55;
      const desired = clamp(intercept + jitter, b.r, H - b.r);
      const center = R.y + R.h / 2;
      const diff = desired - center;
      const accel = aip.react * 2600 * (towardAI ? aip.lookahead : 0.35);
      R.vy += clamp(diff / 90, -1, 1) * accel * dt;
      R.vy = clamp(R.vy, -aip.maxSpeed, aip.maxSpeed);
    }

    L.y = clamp(L.y + L.vy * dt, 0, H - L.h);
    R.y = clamp(R.y + R.vy * dt, 0, H - R.h);

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.y - b.r <= 0 && b.vy < 0) {
      b.y = b.r + 0.8;
      b.vy = -b.vy;
      spawnSparks(b.x, b.y, 0, 1, 10, "#d7f7ff");
      beep(880, 0.03, "triangle");
    } else if (b.y + b.r >= H && b.vy > 0) {
      b.y = H - b.r - 0.8;
      b.vy = -b.vy;
      spawnSparks(b.x, b.y, 0, -1, 10, "#d7f7ff");
      beep(880, 0.03, "triangle");
    }

    collidePaddle(b, L, true, timeTag);
    collidePaddle(b, R, false, timeTag);

    if (b.x + b.r < 0) {
      state.scores[1] += 1;
      state.lastScored = 1;
      spawnSparks(0, b.y, 1, 0, 28, "#ffd6d6");
      beep(220, 0.08, "sawtooth");
      if (!maybeWin()) serve(1, 900);
    } else if (b.x - b.r > W) {
      state.scores[0] += 1;
      state.lastScored = 0;
      spawnSparks(W, b.y, -1, 0, 28, "#ffd6d6");
      beep(220, 0.08, "sawtooth");
      if (!maybeWin()) serve(-1, 900);
    }
  };

  const draw = () => {
    const { singlePlayer, trail } = getOpts();
    const W = dim.W,
      H = dim.H;
    const [L, R] = entity.paddles;
    const b = entity.ball;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0c10");
    bg.addColorStop(1, "#111827");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.setLineDash([10, 14]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 16);
    ctx.lineTo(W / 2, H - 16);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.25)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(L.x, Math.round(L.y), L.w, Math.round(L.h));
    ctx.fillRect(R.x, Math.round(R.y), R.w, Math.round(R.h));
    ctx.restore();

    if (trail) {
      ctx.save();
      for (let i = 0; i < state.trail.length; i++) {
        const t = state.trail[i];
        const a = (i + 1) / state.trail.length;
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.r * (0.72 + 0.28 * a), 0, Math.PI * 2);
        ctx.fillStyle = "#cfe9ff";
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.38)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    drawParticles();

    ctx.save();
    ctx.font = `800 ${Math.max(
      22,
      Math.round(H * 0.06)
    )}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(`${state.scores[0]} — ${state.scores[1]}`, W / 2, 14);
    ctx.restore();

    if (state.waitingServeMs > 0 && !state.over) {
      const t = Math.ceil(state.waitingServeMs / 350);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.max(
        40,
        Math.round(H * 0.14)
      )}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${t}`, W / 2, H / 2 - 14);
      ctx.font = `600 ${Math.max(
        12,
        Math.round(H * 0.035)
      )}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`Press Space / Tap to serve`, W / 2, H / 2 + 34);
      ctx.restore();
    }

    if (state.over != null) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.44)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.max(
        28,
        Math.round(H * 0.1)
      )}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`Player ${state.over + 1} wins`, W / 2, H / 2 - 18);
      ctx.font = `650 ${Math.max(
        12,
        Math.round(H * 0.035)
      )}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(`Press R or Reset`, W / 2, H / 2 + 34);
      ctx.restore();
    }

    scoreEl.textContent = `${state.scores[0]} — ${state.scores[1]}`;
    statusEl.textContent = `${
      singlePlayer ? "W/S (Left) vs AI" : "W/S (Left) & ↑/↓ (Right)"
    } • ${state.paused ? "Paused (P)" : "Running (P to pause)"}${
      state.over != null ? " • Game Over" : ""
    }`;
    btnPause.textContent = state.paused ? "Resume" : "Pause";
  };

  const frame = (t) => {
    if (!state.lastTime) state.lastTime = t;
    const dt0 = Math.min(1 / 20, Math.max(0, (t - state.lastTime) / 1000));
    state.lastTime = t;

    const subStep = 1 / 240;
    const steps = Math.max(1, Math.min(10, Math.ceil(dt0 / subStep)));
    const dt = dt0 / steps;

    if (!state.paused && state.over == null) {
      for (let i = 0; i < steps; i++) step(dt, t);
    }

    updateParticles(dt0);

    const { trail } = getOpts();
    if (trail) {
      const b = entity.ball;
      state.trail.push({ x: b.x, y: b.y });
      const max = 18;
      if (state.trail.length > max)
        state.trail.splice(0, state.trail.length - max);
    } else {
      state.trail.length = 0;
    }

    draw();
    state.raf = window.requestAnimationFrame(frame);
  };

  const serveNow = () => {
    if (state.over != null) return;
    if (state.waitingServeMs > 0) state.waitingServeMs = 0;
  };

  const onKeyDown = (e) => {
    if (e.repeat) return;
    if (e.code === "KeyP") {
      togglePause();
      return;
    }
    if (e.code === "KeyR") {
      state.paused = false;
      hardReset();
      return;
    }
    if (e.code === "Space") {
      serveNow();
      ensureAudio();
      return;
    }
    keys.add(e.code);
    if (getOpts().sound) ensureAudio();
  };

  const onKeyUp = (e) => keys.delete(e.code);

  const onPointerDown = (e) => {
    pointers.set(e.pointerId, { side: null });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    onPointerMove(e);
    serveNow();
    ensureAudio();
  };

  const onPointerUp = (e) => {
    pointers.delete(e.pointerId);
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const { singlePlayer } = getOpts();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const side = x < rect.width / 2 ? 0 : 1;
    if (singlePlayer && side === 1) return;
    const pad = entity.paddles[side];
    pad.y = clamp(y - pad.h / 2, 0, dim.H - pad.h);
  };

  btnPause.addEventListener("click", () => {
    ensureAudio();
    togglePause();
  });

  btnReset.addEventListener("click", () => {
    ensureAudio();
    state.paused = false;
    hardReset();
  });

  controlForm.addEventListener("input", () => {
    const { sound, singlePlayer } = getOpts();
    if (sound) ensureAudio();
    state.paused = false;
    state.over = null;
    keys.clear();
    pointers.clear();
    if (singlePlayer) {
      state.lastScored = state.lastScored ?? 0;
    }
    initEntities();
    draw();
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointermove", onPointerMove);

  resizeCanvas();
  initEntities();
  draw();
  state.raf = window.requestAnimationFrame(frame);

  invalidation.then(() => {
    try {
      ro.disconnect();
    } catch {}
    try {
      window.cancelAnimationFrame(state.raf);
    } catch {}
    try {
      window.removeEventListener("keydown", onKeyDown);
    } catch {}
    try {
      window.removeEventListener("keyup", onKeyUp);
    } catch {}
    try {
      canvas.removeEventListener("pointerdown", onPointerDown);
    } catch {}
    try {
      canvas.removeEventListener("pointerup", onPointerUp);
    } catch {}
    try {
      canvas.removeEventListener("pointercancel", onPointerUp);
    } catch {}
    try {
      canvas.removeEventListener("pointermove", onPointerMove);
    } catch {}
    try {
      state.audio.ctx?.close?.();
    } catch {}
  });

  return root;
};
const _qap3z6 = function _8(md){return(
md`## Value aware

Robocoop receives the values of cells allowing test driven development. Pairs well with [inline unit tests](https://observablehq.com/@tomlarkworthy/tester). Uses [@tomlarkworthy/summarizejs](@tomlarkworthy/summarizejs#summarizeJS) to control context length and communicate typing.`
)};
const _1lu32ic = function _9(md){return(
md`## Multi-modal

Robocoop receives a screenshot of the notebook using [@tomlarkworthy/modern-screenshot](https://observablehq.com/@tomlarkworthy/modern-screenshot)

`
)};
const _3yvp3d = function _10(md){return(
md`## Websearch

Optionally can do websearch before answering`
)};
const _1mvvm7u = function _11(md){return(
md`## Steerable

You can include additional loaded modules, this is very useful for reusing established coding patterns. Import additional modules if needed to bring them into context.

[Whole Notebook Generation](https://www.youtube.com/watch?v=h8igBmevlo8)`
)};
const _95ct7a = function _12(md){return(
md`## Contributing

If Roboco-op cannot do something you expect it should, you could add to its [\`evals\`](https://observablehq.com/@tomlarkworthy/robocoop-eval). The evals are used to evolve a new prompt using [GEPA](https://observablehq.com/@tomlarkworthy/gepa).`
)};
const _a2v04m = function _robocoop2_template(lookupVariable,robocoopModule){return(
lookupVariable([
  "robocoop",
  "robocoop2_background_tasks",
  "formatted_instruction",
  "on_prompt",

  "viewof ui_attached",
  "ui_attached",

  "viewof prompt",
  "prompt",

  "viewof codingModule",
  "codingModule",

  "viewof additionalModules",
  "additionalModules",

  "viewof includeNotebookScreenshot",
  "includeNotebookScreenshot",

  "viewof websearch",
  "websearch",

  "viewof copy_code",
  "copy_code",

  "viewof suggestion",
  "suggestion",

  "mutable context",
  "context",

  "viewof context_viz",
  "context_viz",

  "viewof response",
  "response",

  "viewof OPENAI_API_KEY",
  "OPENAI_API_KEY",

  "viewof settings",
  "settings",

  "viewof system_prompt",
  "system_prompt"
], robocoopModule)
)};
const _1ipdcqw = function _robocoop2(cloneDataflow,robocoop2_template,Event,MutationObserver){return(
({autoDispose = true} = {}) => {
  const root = document.createElement("div");
  root.value = null;

  let dispose = null;
  const keepAliveNames = new Set([
    "robocoop2_background_tasks",
    "on_prompt",
    "formatted_instruction"
  ]);

  const noopObserver = () => ({
    fulfilled: () => {},
    pending: () => {},
    error: () => {}
  });

  const start = () => {
    if (dispose) return;

    dispose = cloneDataflow(robocoop2_template, (name) => {
      if (name === "robocoop") {
        return {
          fulfilled: (el) => {
            root.replaceChildren(el);
            root.value = el;
            root.dispatchEvent(new Event("input", {bubbles: true}));
          }
        };
      }

      if (keepAliveNames.has(name)) return noopObserver();

      return null;
    });

    root.dispose = () => {
      try {
        dispose?.();
      } finally {
        dispose = null;
      }
    };

    if (autoDispose) {
      const mo = new MutationObserver(() => {
        if (!root.isConnected && dispose) {
          root.dispose?.();
          mo.disconnect();
        }
      });
      mo.observe(document.documentElement, {childList: true, subtree: true});
    }
  };

  start();
  return root;
}
)};
const _8kqvx2 = function _16(md){return(
md`## Templating

Extracting the robocoop prototype into a reusable function`
)};
const _i1t51q = function _17(md){return(
md`## Prompt Interface
`
)};
const _6069d1 = function _robocoop(keepalive,robocoopModule,tabbedPane,html,reversibleAttach,ui_attached,$0,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
{
  keepalive(robocoopModule, "robocoop2_background_tasks");
  return tabbedPane({
    Robocoop: html`<div>
    ${reversibleAttach(ui_attached, $0)}
    ${reversibleAttach(ui_attached, $1)}
    ${reversibleAttach(ui_attached, $2)}
    ${reversibleAttach(ui_attached, $3)}
    ${reversibleAttach(ui_attached, $4)}
    ${reversibleAttach(ui_attached, $5)}
    ${reversibleAttach(ui_attached, $6)}
    ${reversibleAttach(ui_attached, $7)}
  </div>`,
    config: html`<div>
    ${reversibleAttach(ui_attached, $8)}
    ${reversibleAttach(ui_attached, $9)}
    ${reversibleAttach(ui_attached, $10)}
  </div>`
  });
};
const _1jn1r5 = function _ui_attached(Inputs){return(
Inputs.toggle({
  label: "ui_attached",
  value: true
})
)};
const _bskwvt = (G, _) => G.input(_);
const _1fw6r4c = function _prompt(whisperInput,OPENAI_API_KEY,view,cautious,Inputs,invalidation)
{
  const whisper = whisperInput({
    API_KEY: OPENAI_API_KEY
  });
  const ui = view`<div>
      ${cautious(() => whisper)}
      ${[
        "...",
        Inputs.textarea({
          width: "100%",
          placeholder: "ask for a cell",
          rows: 10,
          minlength: 1,
          submit: true
        })
      ]}
    </div>`;
  invalidation.then(
    whisper.addEventListener("input", () => {
      ui.value = whisper.value;
    })
  );

  return ui;
};
const _1bmfswu = (G, _) => G.input(_);
const _rfw9af = async function _moduleNames(moduleMap,default_runtime){return(
(await moduleMap(default_runtime))
  .values()
  .toArray()
  .map((d) => d?.name)
  .filter((n) => n)
  .sort()
)};
const _1sr51bv = function _codingModule(Inputs,moduleNames){return(
Inputs.select(moduleNames, {
  label: "Coding module",
  width: "100%",
  value: "main"
})
)};
const _ziusjq = (G, _) => G.input(_);
const _10iaszj = function _additionalModules(Inputs,moduleNames){return(
Inputs.select(moduleNames, {
  label: "Additional modules to include in context",
  width: "100%",
  multiple: true,
  value: []
})
)};
const _1fp6h64 = (G, _) => G.input(_);
const _191vlsz = function _includeNotebookScreenshot(Inputs){return(
Inputs.toggle({
  label: "include notebook screenshot in context?",
  value: false
})
)};
const _1fq4dxf = (G, _) => G.input(_);
const _1795j04 = function _websearch(Inputs){return(
Inputs.toggle({
  label: "use websearch?",
  value: true
})
)};
const _jlkges = (G, _) => G.input(_);
const _mwzj4p = function _copy_code(Inputs,cellsToClipboard,$0){return(
Inputs.button("copy code to clipboard", {
  reduce: () =>
    cellsToClipboard($0.value.cells.map((cell) => cell.code))
})
)};
const _czjgix = (G, _) => G.input(_);
const _1o63tf1 = function _suggestion(Inputs){return(
Inputs.textarea({
  label: "suggestion",
  width: "100%",
  rows: 50,
  disabled: true,
  value: "",
  style: "height: 500px"
})
)};
const _b0jhhw = (G, _) => G.input(_);
const _i9nlq8 = function _context(){return(
[]
)};
const _1e0fm2r = (M, _) => new M(_);
const _2em2iq = _ => _.generator;
const _6s2k6w = function _context_viz(Inputs,context){return(
Inputs.textarea({
  label: "context",
  rows: 20,
  width: "100%",
  disabled: true,
  value: context
    .map(
      ({ role, content }) =>
        `${role}:\n${typeof content == "string" ? content : content[0].text}\n`
    )
    .join("\n")
})
)};
const _ijdn07 = (G, _) => G.input(_);
const _4ahqfr = function _31(md){return(
md`### AI Settings`
)};
const _h5d2bs = function _system_prompt(Inputs){return(
Inputs.textarea({
  label: "system prompt",
  rows: 20,
  width: "100%",
  value: `Respond only with Observable JavaScript (Notebook 1.0) as XML <cell> blocks. Do not include any prose, Markdown, or JSON before, after, or between the XML cells.

Response format
- Each response may contain one or more <cell> blocks. Every block must contain exactly:
  - <inputs>…</inputs>: a comma-separated list of every free variable the cell reads (standard libraries and other cells), or empty if none. Examples: <inputs></inputs>, <inputs>d3</inputs>, <inputs>expect,x</inputs>, <inputs>viewof ready</inputs>.
    - Include all referenced globals such as Inputs, htl, d3, Plot, FileAttachment, width, etc., when used.
    - Use exact names only; do not nest tags or add attributes inside <inputs>.
  - <code><![CDATA[ …Observable JS code… ]]></code>

General rules
- Use Observable Notebook 1.0 semantics.
- Use the fewest cells required; prefer a single view (e.g., via Inputs.form). Split cells only when an import must be isolated or when a derived output should react to a view value.
- Do not log to the console or include comments; the cell’s value is the result.
- Use the exact variable names from the task. If the task requires a view, bind it with: viewof name = …
  - Use name for the view’s current value and viewof name for the element. Do not use name.value unless an API explicitly requires it.
- Prefer zero-dependency or standard-library solutions; import third-party packages only when necessary.

Standard libraries and inputs listing
- UI: use Inputs.* (Inputs.button with reduce, Inputs.toggle, Inputs.select, Inputs.range/Inputs.number, Inputs.form). Any cell calling Inputs.* must list Inputs.
- DOM/SVG: use Hypertext Literal via htl.html and htl.svg. Any cell using htl.* must list htl.
- Data utilities/viz: if a task mentions d3 or Plot, assume they are provided and list them in <inputs> for cells that use them.
- If you use FileAttachment, width, or other provided globals, list them in <inputs>.

Imports
- Do not use require().
- Use ESM CDN imports with a pinned version:
  - Single-assignment cell example: dateFns = await import("https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm")
- If you must provide a fallback CDN, keep a single top-level assignment via an async IIFE expression with try/catch:
  - dateFns = await (async () => { try { return await import("https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm"); } catch { return await import("https://esm.sh/date-fns@4.1.0"); } })()
- Keep each import cell to a single top-level assignment (no extra top-level statements).

Reactivity
- Any cell that reads a variable x must list x in <inputs>.
- If a cell needs the view element, list viewof x; if it needs the view’s value, list x.

Testing and fixes
- If asked to fix a failing test, change the implementation to satisfy the test; do not modify the test unless explicitly requested.
- If you provide a minimal assertion helper (e.g., expect().toBe), implement only what’s needed and keep it in its own cell.

Error handling
- If a requested feature is unsupported without external deps and imports are disallowed or fail, either implement a minimal dependency-free solution or return a value that throws a clear Error describing the unsupported case.

UI patterns
- Counter button:
  <cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof count = Inputs.button("Increment", {value: 0, reduce: v => v + 1})
  ]]></code>
  </cell>
- Toggle:
  <cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof ready = Inputs.toggle({label: "Ready", value: false})
  ]]></code>
  </cell>
- Dropdown:
  <cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof rgb = Inputs.select(["red", "green", "blue"], {value: "red"})
  ]]></code>
  </cell>
- Form (single view returning an object):
  <cell>
  <inputs>Inputs</inputs>
  <code><![CDATA[
  viewof credentials = Inputs.form({username: Inputs.text({label: "Username"}), password: Inputs.password({label: "Password"})})
  ]]></code>
  </cell>

Examples (minimal)
- Literal:
  <cell>
  <inputs></inputs>
  <code><![CDATA[
  x = 42
  ]]></code>
  </cell>
- Using d3:
  <cell>
  <inputs>d3</inputs>
  <code><![CDATA[
  sum = d3.sum([1, 2, 3, 4, 5])
  ]]></code>
  </cell>
- Pinned import and usage (CDN ESM):
  <cell>
  <inputs></inputs>
  <code><![CDATA[
  dateFns = await import("https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm")
  ]]></code>
  </cell>
  <cell>
  <inputs>dateFns</inputs>
  <code><![CDATA[
  formatted = dateFns.format(new Date(2020, 0, 1), "yyyy-MM-dd")
  ]]></code>
  </cell>
- Reactive SVG:
  <cell>
  <inputs>htl,rectangleSettings</inputs>
  <code><![CDATA[
  htl.svg\`<svg width="\${rectangleSettings.width + 20}" height="\${rectangleSettings.height + 20}" viewBox="0 0 \${rectangleSettings.width + 20} \${rectangleSettings.height + 20}">
    <rect x="10" y="10" width="\${rectangleSettings.width}" height="\${rectangleSettings.height}" fill="\${rectangleSettings.fill ?? "#ccc"}" stroke="#000"/>
  </svg>\`
  ]]></code>
  </cell>`
})
)};
const _bqjn8y = (G, _) => G.input(_);
const _qk8kw4 = function _models(){return(
["gpt-5.4", "gpt-5.2", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"]
)};
const _ueb3sx = function _OPENAI_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    width: "100%",
    label: "OPENAI_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("OPENAI_API_KEY")
)
)};
const _13dv669 = (G, _) => G.input(_);
const _d1urqa = function _settings(Inputs,view,models,localStorageView){return(
{
  prompt:
    '\nThe notebook contains:\n  - cell "form" is Object {a: "", b: ""}\nUsing the already imported view literal for configuring a ChatGPT session. Example response \n\n{\n  model: "gpt-3.5-turbo"\n  temperature: 0.7\n  max_tokens: 1000\n  top_p: 1\n  frequency_penalty: 0\n  presence_penalty: 0\n}\n\nUse Inputs.select for model, Inputs.range for max_tokens etc.',
  time: 1699384189902,
  comment:
    "Creating a form to configure a ChatGPT session. The form includes a select input for model, and range inputs for temperature, max_tokens, top_p, frequency_penalty, and presence_penalty."
} &&
  Inputs.bind(
    view`
    <div>${["model", Inputs.select(models.sort(), { label: "model" })]}</div>
    <div>${[
      "temperature",
      Inputs.range([0, 1], { step: 0.1, value: 0.7, label: "temperature" })
    ]}</div>
    <div>${[
      "max_prompt_tokens",
      Inputs.range([1, 200000], {
        value: 4000,
        label: "max_tokens sent (oldest are truncated)"
      })
    ]}</div>
    <div>${[
      "max_tokens",
      Inputs.range([1, 200000], {
        value: 1000,
        label: "max_tokens for response"
      })
    ]}</div>
    <div>${[
      "top_p",
      Inputs.range([0, 1], { step: 0.1, value: 1, label: "top_p" })
    ]}</div>
    <div>${[
      "frequency_penalty",
      Inputs.range([0, 1], { step: 0.1, value: 0, label: "frequency_penalty" })
    ]}</div>
    <div>${[
      "presence_penalty",
      Inputs.range([0, 1], { step: 0.1, value: 0, label: "presence_penalty" })
    ]}</div>
  `,
    localStorageView("NOTEBOOK_WRITER_2", {
      defaultValue: {
        model: "gpt-5-mini",
        temperature: 1,
        max_prompt_tokens: 10000,
        max_tokens: 10000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      json: true
    })
  )
)};
const _8o97qh = (G, _) => G.input(_);
const _71u3yq = function _37(md){return(
md`## Roboco-op Implementation below`
)};
const _9d3v6f = function _robocoopModule(thisModule){return(
thisModule()
)};
const _6exat = (G, _) => G.input(_);
const _1ypkcy8 = function _robocoop2_background_tasks(submit_summary,on_prompt,formatted_instruction)
{
  try {
    submit_summary;
    on_prompt;
    formatted_instruction;
  } catch (e) {
    console.log("Error during robocoop2_background_tasks", e);
    debugger;
  }
};
const _akm6zj = function _user_variable_filters(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.input({}),
  localStorageView(
    `${new URL(document.baseURI).pathname}|user_variable_filters`,
    {
      defaultValue: {},
      json: true
    }
  )
)
)};
const _f3kd6q = (G, _) => G.input(_);
const _1hc6osx = function _formatted_instruction(response,$0,Event)
{
  let formatted_instruction = undefined;
  if (response.action == "upsert_cells") {
    formatted_instruction = response.cells.map((r) => r.code).join("\n\n");
  } else {
    formatted_instruction = response.content;
  }
  $0.value = formatted_instruction;
  $0.dispatchEvent(new Event("input"));
  return formatted_instruction;
};
const _1vjol6p = function _response(Inputs){return(
Inputs.input(undefined)
)};
const _1nef9sb = (G, _) => G.input(_);
const _eowz7m = async function _on_prompt($0,system_prompt,buildContext,$1,$2,includeNotebookScreenshot,prompt,$3,$4,runAsk,settings,$5,$6,Event)
{
  const payload = [
    {
      role: $0.value.model.startsWith("o1") ? "user" : "system",
      content: system_prompt
    },
    ...(await buildContext({
      codingModule: $1.value,
      additionalModules: $2.value,
      notebookImage: includeNotebookScreenshot
    })),
    { role: "user", content: prompt }
  ];

  $3.value = payload;
  $4.value = "";

  const response = await runAsk({
    settings: { ...settings, websearch: $5.value },
    messages: payload
  });

  $6.value = response;
  $6.dispatchEvent(new Event("input"));
};
const _p8kqgg = function _44(md){return(
md`#### \`buildContext\` context Construction`
)};
const _1oec3nc = function _buildContext(default_runtime,moduleMap,cellMap,module_summary,modern_screenshot){return(
async function buildContext({
  codingModule = "main",
  additionalModules = [],
  notebookImage = false,
  runtime = default_runtime
} = {}) {
  const modules = await moduleMap(runtime);
  const cells = await Promise.all(
    [...modules.entries()].map(async ([m, mInfo]) => ({
      ...mInfo,
      cells: await cellMap(m)
    }))
  );

  const byName = new Map(cells.map((c) => [c.name, c]));
  const base = byName.get(codingModule) ?? byName.get("main") ?? cells[0];
  const extras = additionalModules.map((n) => byName.get(n)).filter(Boolean);

  const summary = (await Promise.all([base, ...extras].map(module_summary))).join(
    "\n"
  );

  return [
    {
      role: "user",
      content: [
        { type: "text", text: summary },
        ...(notebookImage
          ? [
              {
                type: "image_url",
                image_url: {
                  url: await modern_screenshot.domToDataUrl(document.body, {
                    scale: 0.1
                  })
                }
              }
            ]
          : [])
      ]
    }
  ];
}
)};
const _vggsua = function _default_runtime(runtime){return(
runtime
)};
const _1ewvdpv = function _module_summary(cellSummary){return(
async (mInfo) => {
  return `
module: ${mInfo.name}

${(
  await Promise.all(
    [...mInfo.cells.entries()].map(async ([name, vars]) => cellSummary(vars))
  )
).join("\n")}
`;
}
)};
const _loz5om = function _cdata(){return(
(s) => `<![CDATA[${String(s).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`
)};
const _129e3mh = function _cellSummary(getPromiseState,cdata,decompile,summarizeJS){return(
async (variables, { max_size = 200 } = {}) => {
  const state = await getPromiseState(variables[0]._promise);
  return `<cell>
  <inputs>${variables[0]._inputs.map((i) => i._name).join(", ")}</inputs>
<code>${cdata(
  await decompile(variables).catch((err) => {
    console.error("Unable to decompile", variables);
  })
)}</code>
  <value>${cdata(summarizeJS(variables[0]._value, { max_size: 200 }))}</value>
  <error>${cdata(summarizeJS(state.error, { max_size }))}</error>
</cell>\n`
}
)};
const _1kglkhh = function _50(md){return(
md`---`
)};
const _pj6emy = function _51(md){return(
md`## LLM API Call`
)};
const _1um6eid = function _runAsk(convert,responses,process){return(
async ({ settings, messages }) => {
  messages = messages.map((m) => convert(m));
  const [system_prompt, ...prompt] = messages;

  const response = await responses({
    model: settings.model,
    reasoning: {
      effort: "medium",
      summary: "detailed"
    },
    instructions: system_prompt.content,
    input: prompt,
    tools: settings.websearch ? [{ type: "web_search_preview" }] : []
  });

  const message = response.output.at(-1).content.at(-1).text;
  const instuctions = {
    cells: process(message),
    response: response.output,
    prompt: system_prompt,
    action: "upsert_cells",
    time: Date.now()
  };
  return instuctions;
}
)};
const _lcn0j3 = async function _test_runAsk(runAsk,$0,$1){return(
(
  await runAsk({
    settings: $0.value,
    messages: [
      {
        role: "system",
        content: $1.value
      },
      {
        role: "user",
        content: "say hello"
      }
    ]
  })
).cells
)};
const _1gmy2dh = function _domParser(DOMParser){return(
new DOMParser()
)};
const _2vfeni = function _process(domParser){return(
function process(content) {
  const doc = domParser.parseFromString(
    "<response>" + content + "</response>",
    "text/xml"
  );
  const cells = [...doc.querySelectorAll("cell")];
  return cells.map((cell) => {
    const inputsContent = cell.querySelector("inputs")?.textContent || "";
    return {
      inputs:
        inputsContent.length > 0
          ? inputsContent.split(",").map((s) => s.trim())
          : [],
      code: (cell.querySelector("code")?.textContent || "").trim()
    };
  });
}
)};
const _atgu6h = function _convert(convertContent){return(
(message) => {
  return {
    ...message,
    content: convertContent(message.content)
  };
}
)};
const _1j3revi = function _convertContent(convertContentElement){return(
(content) => {
  if (typeof content == "string") return content;
  if (Array.isArray(content)) return content.map(convertContentElement);
  throw "unrecognized content element";
}
)};
const _qgt0ss = function _convertContentElement(){return(
(element) => {
  if (element.type == "text")
    return {
      type: "input_text",
      text: element.text
    };
  else if (element.type == "image_url") {
    return {
      type: "input_image",
      image_url: element.image_url.url
    };
  } else return element;
}
)};
const _1e70zrw = function _59(md){return(
md`---`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/dataflow-templating", async () => runtime.module((await import("/@tomlarkworthy/dataflow-templating.js?v=4")).default));  
  main.define("module @tomlarkworthy/tabbed-pane-view", async () => runtime.module((await import("/@tomlarkworthy/tabbed-pane-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/openai-responses-api", async () => runtime.module((await import("/@tomlarkworthy/openai-responses-api.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/cells-to-clipboard", async () => runtime.module((await import("/@tomlarkworthy/cells-to-clipboard.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module d/1f41fef8b019cf4e@94", async () => runtime.module((await import("/d/1f41fef8b019cf4e@94.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/whisper-input", async () => runtime.module((await import("/@tomlarkworthy/whisper-input.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/summarizejs", async () => runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));  
  main.define("module @tomlarkworthy/modern-screenshot", async () => runtime.module((await import("/@tomlarkworthy/modern-screenshot.js?v=4")).default));  
  $def("_bcrbvp", null, ["md"], _bcrbvp);  
  $def("_6tzb9m", null, ["robocoop2"], _6tzb9m);  
  $def("_rxi385", null, ["md"], _rxi385);  
  $def("_cgr7pz", null, ["md"], _cgr7pz);  
  $def("_1umx4m3", null, ["md"], _1umx4m3);  
  $def("_141h9uf", null, ["md"], _141h9uf);  
  $def("_oity7e", "pong_game", ["html","Inputs","ResizeObserver","invalidation"], _oity7e);  
  $def("_qap3z6", null, ["md"], _qap3z6);  
  $def("_1lu32ic", null, ["md"], _1lu32ic);  
  $def("_3yvp3d", null, ["md"], _3yvp3d);  
  $def("_1mvvm7u", null, ["md"], _1mvvm7u);  
  $def("_95ct7a", null, ["md"], _95ct7a);  
  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("lookupVariable", _));  
  $def("_a2v04m", "robocoop2_template", ["lookupVariable","robocoopModule"], _a2v04m);  
  $def("_1ipdcqw", "robocoop2", ["cloneDataflow","robocoop2_template","Event","MutationObserver"], _1ipdcqw);  
  $def("_8kqvx2", null, ["md"], _8kqvx2);  
  $def("_i1t51q", null, ["md"], _i1t51q);  
  $def("_6069d1", "robocoop", ["keepalive","robocoopModule","tabbedPane","html","reversibleAttach","ui_attached","viewof prompt","viewof codingModule","viewof additionalModules","viewof includeNotebookScreenshot","viewof websearch","viewof copy_code","viewof suggestion","viewof context_viz","viewof OPENAI_API_KEY","viewof settings","viewof system_prompt"], _6069d1);  
  $def("_1jn1r5", "viewof ui_attached", ["Inputs"], _1jn1r5);  
  $def("_bskwvt", "ui_attached", ["Generators","viewof ui_attached"], _bskwvt);  
  main.define("tabbedPane", ["module @tomlarkworthy/tabbed-pane-view", "@variable"], (_, v) => v.import("tabbedPane", _));  
  $def("_1fw6r4c", "viewof prompt", ["whisperInput","OPENAI_API_KEY","view","cautious","Inputs","invalidation"], _1fw6r4c);  
  $def("_1bmfswu", "prompt", ["Generators","viewof prompt"], _1bmfswu);  
  $def("_rfw9af", "moduleNames", ["moduleMap","default_runtime"], _rfw9af);  
  $def("_1sr51bv", "viewof codingModule", ["Inputs","moduleNames"], _1sr51bv);  
  $def("_ziusjq", "codingModule", ["Generators","viewof codingModule"], _ziusjq);  
  $def("_10iaszj", "viewof additionalModules", ["Inputs","moduleNames"], _10iaszj);  
  $def("_1fp6h64", "additionalModules", ["Generators","viewof additionalModules"], _1fp6h64);  
  $def("_191vlsz", "viewof includeNotebookScreenshot", ["Inputs"], _191vlsz);  
  $def("_1fq4dxf", "includeNotebookScreenshot", ["Generators","viewof includeNotebookScreenshot"], _1fq4dxf);  
  $def("_1795j04", "viewof websearch", ["Inputs"], _1795j04);  
  $def("_jlkges", "websearch", ["Generators","viewof websearch"], _jlkges);  
  $def("_mwzj4p", "viewof copy_code", ["Inputs","cellsToClipboard","viewof response"], _mwzj4p);  
  $def("_czjgix", "copy_code", ["Generators","viewof copy_code"], _czjgix);  
  $def("_1o63tf1", "viewof suggestion", ["Inputs"], _1o63tf1);  
  $def("_b0jhhw", "suggestion", ["Generators","viewof suggestion"], _b0jhhw);  
  $def("_i9nlq8", "initial context", [], _i9nlq8);  
  $def("_1e0fm2r", "mutable context", ["Mutable","initial context"], _1e0fm2r);  
  $def("_2em2iq", "context", ["mutable context"], _2em2iq);  
  $def("_6s2k6w", "viewof context_viz", ["Inputs","context"], _6s2k6w);  
  $def("_ijdn07", "context_viz", ["Generators","viewof context_viz"], _ijdn07);  
  $def("_4ahqfr", null, ["md"], _4ahqfr);  
  $def("_h5d2bs", "viewof system_prompt", ["Inputs"], _h5d2bs);  
  $def("_bqjn8y", "system_prompt", ["Generators","viewof system_prompt"], _bqjn8y);  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  $def("_qk8kw4", "models", [], _qk8kw4);  
  $def("_ueb3sx", "viewof OPENAI_API_KEY", ["Inputs","localStorageView"], _ueb3sx);  
  $def("_13dv669", "OPENAI_API_KEY", ["Generators","viewof OPENAI_API_KEY"], _13dv669);  
  $def("_d1urqa", "viewof settings", ["Inputs","view","models","localStorageView"], _d1urqa);  
  $def("_8o97qh", "settings", ["Generators","viewof settings"], _8o97qh);  
  $def("_71u3yq", null, ["md"], _71u3yq);  
  $def("_9d3v6f", "viewof robocoopModule", ["thisModule"], _9d3v6f);  
  $def("_6exat", "robocoopModule", ["Generators","viewof robocoopModule"], _6exat);  
  $def("_1ypkcy8", "robocoop2_background_tasks", ["submit_summary","on_prompt","formatted_instruction"], _1ypkcy8);  
  $def("_akm6zj", "viewof user_variable_filters", ["Inputs","localStorageView"], _akm6zj);  
  $def("_f3kd6q", "user_variable_filters", ["Generators","viewof user_variable_filters"], _f3kd6q);  
  $def("_1hc6osx", "formatted_instruction", ["response","viewof suggestion","Event"], _1hc6osx);  
  $def("_1vjol6p", "viewof response", ["Inputs"], _1vjol6p);  
  $def("_1nef9sb", "response", ["Generators","viewof response"], _1nef9sb);  
  $def("_eowz7m", "on_prompt", ["viewof settings","system_prompt","buildContext","viewof codingModule","viewof additionalModules","includeNotebookScreenshot","prompt","mutable context","viewof suggestion","runAsk","settings","viewof websearch","viewof response","Event"], _eowz7m);  
  $def("_p8kqgg", null, ["md"], _p8kqgg);  
  $def("_1oec3nc", "buildContext", ["default_runtime","moduleMap","cellMap","module_summary","modern_screenshot"], _1oec3nc);  
  $def("_vggsua", "default_runtime", ["runtime"], _vggsua);  
  $def("_1ewvdpv", "module_summary", ["cellSummary"], _1ewvdpv);  
  $def("_loz5om", "cdata", [], _loz5om);  
  $def("_129e3mh", "cellSummary", ["getPromiseState","cdata","decompile","summarizeJS"], _129e3mh);  
  $def("_1kglkhh", null, ["md"], _1kglkhh);  
  $def("_pj6emy", null, ["md"], _pj6emy);  
  $def("_1um6eid", "runAsk", ["convert","responses","process"], _1um6eid);  
  $def("_lcn0j3", "test_runAsk", ["runAsk","viewof settings","viewof system_prompt"], _lcn0j3);  
  $def("_1gmy2dh", "domParser", ["DOMParser"], _1gmy2dh);  
  $def("_2vfeni", "process", ["domParser"], _2vfeni);  
  $def("_atgu6h", "convert", ["convertContent"], _atgu6h);  
  $def("_1j3revi", "convertContent", ["convertContentElement"], _1j3revi);  
  $def("_qgt0ss", "convertContentElement", [], _qgt0ss);  
  $def("_1e70zrw", null, ["md"], _1e70zrw);  
  main.define("responses", ["module @tomlarkworthy/openai-responses-api", "@variable"], (_, v) => v.import("responses", _));  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("cellsToClipboard", ["module @tomlarkworthy/cells-to-clipboard", "@variable"], (_, v) => v.import("cellsToClipboard", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("inspect", ["module d/1f41fef8b019cf4e@94", "@variable"], (_, v) => v.import("inspect", _));  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("cautious", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("cautious", _));  
  main.define("whisperInput", ["module @tomlarkworthy/whisper-input", "@variable"], (_, v) => v.import("whisperInput", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));  
  main.define("modern_screenshot", ["module @tomlarkworthy/modern-screenshot", "@variable"], (_, v) => v.import("modern_screenshot", _));
  return main;
}