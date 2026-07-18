const _14bo005 = function _1(md){return(
md`# DAW`
)};
const _uafule = function _station(gridContainer,runtime,invalidation,dawModule){return(
gridContainer(runtime, {
  invalidation,
  module: dawModule,
  include: [
    'viewof playing',
    'viewof bpm',
    'viewof masterVol',
    'viewof clock',
    'viewof kit1',
    'viewof pattern',
    'viewof bassCutoff',
    'viewof bassDecay',
    'scope',
    'template_drum',
    'drum1',
    'controls',
    'viewof synth1',
    'viewof synthSeq',
    'viewof midi1',
    'viewof keys1'
  ],
  layout: {
    atoms: {
      'controls': {
        'x': 20,
        'y': 20
      },
      'viewof playing': {
        'x': 160,
        'y': 20
      },
      'viewof bpm': {
        'x': 340,
        'y': 20,
        'w': 360
      },
      'viewof masterVol': {
        'x': 720,
        'y': 20,
        'w': 360
      },
      'viewof pattern': {
        'x': 20,
        'y': 80
      },
      'viewof clock': {
        'x': 440,
        'y': 80
      },
      'viewof kit1': {
        'x': 440,
        'y': 130
      },
      'scope': {
        'x': 720,
        'y': 80,
        'w': 360
      },
      'viewof bassCutoff': {
        'x': 20,
        'y': 180,
        'w': 360
      },
      'viewof bassDecay': {
        'x': 400,
        'y': 180,
        'w': 320
      },
      'template_drum': {
        'x': 20,
        'y': 260
      },
      'drum1': {
        'x': 460,
        'y': 260
      },
      'viewof synth1': {
        'x': 20,
        'y': 420
      },
      'viewof synthSeq': {
        'x': 560,
        'y': 420
      },
      'viewof midi1': {
        'x': 960,
        'y': 420
      },
      'viewof keys1': {
        'x': 20,
        'y': 540
      }
    }
  },
  height: 660
})
)};
const _hn2uu3 = function _title(md){return(
md`

A digital audio workstation that is nothing but a notebook. Every piece of state — knob positions, the drum pattern, the rack layout, even instruments you add from the template menu — lives in cell source code, so export, diff, undo and remix all see the whole studio.

Built from three orthogonal concepts, none of them audio-specific:

- **[sticky](https://observablehq.com/@tomlarkworthy/sticky)** — any view remembers its value in its own source (\`sticky(view, remembered)\`), persisted by a silent definition swap: no recompute, no remount, no audio glitch.
- **[grid-container](https://observablehq.com/@tomlarkworthy/grid-container)** — the rack. Atoms are live cells; layout and membership are self-rewritten literals. Even the rack controls are a normal cell (\`controls = gridControls()\`) placed on the rack; its **＋ cell → templates** instantiates a copy of any \`template_*\` cell group under a fresh name — add an instrument without typing code.
- **Observable dataflow** — wiring. Voices are plain function cells; each instrument's \`sources:\` list and the kit's \`voices\` literal are the patch cords, edited like any other cell (✎ on its atom).

Audio discipline (no timers anywhere):
- \`daw_ctx\`/\`master\`/\`analyser\` use the \`this\` idiom — recompute returns the previous instance, so the audio graph is immortal.
- The **clock** is the only ticking thing, and it runs on the **audio clock**: a silent \`ConstantSourceNode\` ends just before each step boundary and its \`onended\` schedules the next step. No \`setInterval\`, no lookahead polling, and it keeps time in background tabs. It dispatches look-ahead \`tick\` events carrying the exact \`AudioContext\` time of the boundary; everything downstream is a passive subscriber.
- A **seq** is a pattern grid that listens to the clock and emits *timed* MIDI — a sequencer is a keyboard that plays itself. Instruments can't tell a pattern from a human.
- Voice functions read knob **elements'** \`.value\` at trigger time, so turning a knob never recomputes the audio path.

Live input speaks **MIDI**. A MIDI source is any view that dispatches \`midi\` CustomEvents carrying raw MIDI bytes (\`detail.data = [status, note, velocity]\`): **keys** (pointer + computer-keyboard piano — the key binding is a plain \`keymap\` literal in its cell, editable like anything else) and **midiIn** (Web MIDI hardware) both speak it. Instruments like the polyphonic **synth** subscribe to any list of sources — the \`sources:\` list in the cell is the patch cord — and persist their whole patch through one \`sticky\` slot.`
)};
const _18x0rsh = function _dawModule(thisModule){return(
thisModule()
)};
const _1kmg14a = (G, _) => G.input(_);
const _19o1i4f = function _daw_ctx()
{
  // `this` = previous value: the context survives any recompute and is never closed
  return this ?? new (window.AudioContext || window.webkitAudioContext)();
};
const _1qz528a = function _master(daw_ctx)
{
  const g = this ?? daw_ctx.createGain();
  if (!this) {
    g.gain.value = 0.8;
    g.connect(daw_ctx.destination);
  }
  return g;
};
const _1cxip4o = function _masterVol(sticky,Inputs){return(
sticky(Inputs.range([
  0,
  1
], {
  label: 'master',
  step: 0.01,
  value: 0.8
}), 0.8)
)};
const _12egs9p = (G, _) => G.input(_);
const _1r939zp = function _masterVolBind(master,masterVol)
{
  master.gain.value = masterVol;
  return masterVol;
};
const _1bzzngz = function _analyser(daw_ctx,master)
{
  const a = this ?? daw_ctx.createAnalyser();
  if (!this) {
    a.fftSize = 512;
    master.connect(a);
  }
  return a;
};
const _kha09r = function _scope(analyser,invalidation)
{
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 72;
  c.style.cssText = 'display:block; width:100%; height:72px; background:#111; border-radius:4px;';
  const g = c.getContext('2d');
  const buf = new Uint8Array(analyser.fftSize);
  let raf;
  const draw = () => {
    analyser.getByteTimeDomainData(buf);
    g.fillStyle = '#111';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#3ddc84';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < buf.length; i++) {
      const x = i / (buf.length - 1) * c.width;
      const y = buf[i] / 255 * c.height;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    raf = requestAnimationFrame(draw);
  };
  draw();
  invalidation.then(() => cancelAnimationFrame(raf));
  return c;
};
const _1efbfap = function _bpm(sticky,Inputs){return(
sticky(Inputs.range([
  60,
  180
], {
  label: 'bpm',
  step: 1,
  value: 120
}), 85)
)};
const _w2pv3n = (G, _) => G.input(_);
const _ae8ir = function _playing(Inputs){return(
Inputs.toggle({ label: '\u25B6 play' })
)};
const _1vfroho = (G, _) => G.input(_);
const _s71xha = function _stepGrid(Event){return(
(rows, {
  steps = 16
} = {}) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid; gap:2px; font:10px var(--sans-serif, sans-serif); user-select:none; width:max-content;';
  wrap.style.gridTemplateColumns = `52px repeat(${ steps }, 18px)`;
  const value = Object.fromEntries(rows.map(r => [
    r,
    Array(steps).fill(false)
  ]));
  const btns = {};
  let ph = -1;
  const paint = () => {
    for (const r of rows)
      value[r].forEach((on, i) => {
        btns[r][i].style.background = on ? '#e7040f' : i % 4 === 0 ? 'var(--theme-foreground-faint, #ccc)' : 'var(--theme-foreground-faintest, #e5e5e5)';
        btns[r][i].style.outline = i === ph ? '2px solid #3ddc84' : 'none';
        btns[r][i].style.outlineOffset = '-2px';
      });
  };
  wrap.playhead = i => {
    if (i === ph)
      return;
    ph = i;
    paint();
  };
  for (const r of rows) {
    const lab = document.createElement('div');
    lab.textContent = r;
    lab.style.cssText = 'align-self:center; overflow:hidden; text-overflow:ellipsis;';
    wrap.appendChild(lab);
    btns[r] = [];
    for (let i = 0; i < steps; i++) {
      const b = document.createElement('div');
      b.style.cssText = 'width:18px; height:18px; border-radius:3px; cursor:pointer;';
      b.addEventListener('pointerdown', () => {
        value[r][i] = !value[r][i];
        paint();
        wrap.dispatchEvent(new Event('input', { bubbles: true }));
        wrap.dispatchEvent(new Event('change', { bubbles: true }));
      });
      btns[r].push(b);
      wrap.appendChild(b);
    }
  }
  Object.defineProperty(wrap, 'value', {
    get: () => value,
    set: v => {
      if (!v)
        return;
      for (const r of rows)
        if (Array.isArray(v[r]))
          value[r] = v[r].slice(0, steps).concat(Array(Math.max(0, steps - v[r].length)).fill(false)).map(Boolean);
      paint();
    }
  });
  paint();
  return wrap;
}
)};
const _14j1vyd = function _pattern(sticky,mkSeq,$0,invalidation){return(
sticky(mkSeq($0, {
  label: 'drums',
  rows: [
    { name: 'kick', note: 36 },
    { name: 'hat', note: 42 },
    { name: 'bass', note: 43 }
  ],
  invalidation
}), {
  'kick': [
    true,
    true,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false
  ],
  'hat': [
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    true,
    true
  ],
  'bass': [
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false
  ]
})
)};
const _7a7f2w = (G, _) => G.input(_);
const _wu1p2x = function _noiseBuffer(daw_ctx)
{
  if (this)
    return this;
  const b = daw_ctx.createBuffer(1, daw_ctx.sampleRate, daw_ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = Math.random() * 2 - 1;
  return b;
};
const _6ldw81 = function _kick_voice(daw_ctx,master){return(
t => {
  const o = daw_ctx.createOscillator();
  const g = daw_ctx.createGain();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.3);
  o.onended = () => g.disconnect();
}
)};
const _1xa2q3y = function _hat_voice(daw_ctx,noiseBuffer,master){return(
t => {
  const s = daw_ctx.createBufferSource();
  s.buffer = noiseBuffer;
  const f = daw_ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = daw_ctx.createGain();
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
  s.stop(t + 0.08);
  s.onended = () => g.disconnect();
}
)};
const _1n3qz47 = function _bassCutoff(sticky,Inputs){return(
sticky(Inputs.range([
  100,
  4000
], {
  label: 'cutoff',
  step: 10,
  value: 800
}), 4000)
)};
const _1hifuoy = (G, _) => G.input(_);
const _tsq2pi = function _bassDecay(sticky,Inputs){return(
sticky(Inputs.range([
  0.05,
  0.6
], {
  label: 'decay',
  step: 0.01,
  value: 0.25
}), 0.06)
)};
const _cecwt5 = (G, _) => G.input(_);
const _7zke3z = function _bass_voice($0,$1,daw_ctx,master)
{
  return t => {
    // knob ELEMENTS are the deps (stable); values read at trigger time, so
    // turning a knob never recomputes the audio path
    const cutoff = Number($0.value) || 800;
    const decay = Number($1.value) || 0.25;
    const o = daw_ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    const f = daw_ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff / 8), t + decay);
    f.Q.value = 8;
    const g = daw_ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + decay + 0.05);
    o.onended = () => g.disconnect();
  };
};
const _mkclk7 = function _mkClock(){return(
(ctx, { playing, bpm, stepsPerBar = 16, invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; gap:8px; align-items:center; font:11px var(--sans-serif, sans-serif); background:#1c2529; color:#eceff1; border:1px solid #37474f; border-radius:6px; padding:6px 10px;';
  const led = document.createElement('span');
  led.style.cssText = 'width:8px; height:8px; border-radius:50%; background:#37474f; flex:none;';
  const pos = document.createElement('span');
  pos.style.cssText = 'font-family:monospace; min-width:5ch;';
  pos.textContent = '1.1';
  el.append(led, pos);
  const secPerStep = () => 60 / (Number(bpm && bpm.value) || 120) / 4;
  let step = 0;
  let running = false;
  let gen = 0;
  const dispatchTick = t => {
    const bar = Math.floor(step / stepsPerBar);
    const stepInBar = step % stepsPerBar;
    el.dispatchEvent(new window.CustomEvent('tick', { detail: { t, step, stepInBar, bar, stepsPerBar, secPerStep: secPerStep() } }));
    pos.textContent = `${ bar + 1 }.${ Math.floor(stepInBar / 4) + 1 }`;
    led.style.background = stepInBar % 4 === 0 ? '#3ddc84' : '#2e7d32';
  };
  const loop = (g, nextT) => {
    if (!running || g !== gen)
      return;
    dispatchTick(nextT);
    // audio-clock tick: a silent node ends just before the next step boundary
    // and onended schedules it — keeps time in background tabs
    const tick = ctx.createConstantSource();
    const mute = ctx.createGain();
    mute.gain.value = 0;
    tick.connect(mute);
    mute.connect(ctx.destination);
    tick.start();
    tick.stop(Math.max(nextT - 0.04, ctx.currentTime + 0.005));
    tick.onended = () => {
      tick.disconnect();
      mute.disconnect();
      if (!running || g !== gen)
        return;
      step++;
      let t = nextT + secPerStep();
      if (t < ctx.currentTime + 0.02)
        t = ctx.currentTime + 0.02;
      // resync after jank
      loop(g, t);
    };
  };
  const start = () => {
    if (running)
      return;
    running = true;
    gen++;
    step = 0;
    ctx.resume();
    loop(gen, ctx.currentTime + 0.1);
  };
  const stop = () => {
    running = false;
    gen++;
    led.style.background = '#37474f';
    pos.textContent = '1.1';
    el.dispatchEvent(new window.CustomEvent('stop'));
  };
  const sync = () => playing && playing.value ? start() : stop();
  if (playing)
    playing.addEventListener('input', sync);
  sync();
  el.seek = bar => {
    step = bar * stepsPerBar;
  };
  if (invalidation)
    invalidation.then(() => {
      stop();
      if (playing)
        playing.removeEventListener('input', sync);
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      running,
      step,
      bar: Math.floor(step / stepsPerBar)
    }),
    set: () => {
    }
  });
  return el;
}
)};
const _mkseq3 = function _mkSeq(stepGrid){return(
(clock, { rows = [], steps = 16, velocity = 100, gate = 0.5, label, invalidation } = {}) => {
  const grid = stepGrid(rows.map(r => r.name), { steps });
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:2px; width:max-content;';
  if (label) {
    const lab = document.createElement('div');
    lab.textContent = label;
    lab.style.cssText = 'font:9px var(--sans-serif, sans-serif); color:#90a4ae;';
    el.appendChild(lab);
  }
  el.appendChild(grid);
  const onTick = e => {
    const { t, step, secPerStep } = e.detail;
    const col = step % steps;
    grid.playhead(col);
    const pat = grid.value;
    for (const r of rows) {
      if (pat[r.name] && pat[r.name][col]) {
        el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: [144, r.note & 127, velocity], time: t } }));
        el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: [128, r.note & 127, 0], time: t + Math.max(0.02, secPerStep * gate) } }));
      }
    }
  };
  const onStop = () => grid.playhead(-1);
  clock.addEventListener('tick', onTick);
  clock.addEventListener('stop', onStop);
  if (invalidation)
    invalidation.then(() => {
      clock.removeEventListener('tick', onTick);
      clock.removeEventListener('stop', onStop);
    });
  Object.defineProperty(el, 'value', {
    get: () => grid.value,
    set: v => {
      grid.value = v;
    }
  });
  return el;
}
)};
const _mkkit9 = function _mkKit(){return(
(ctx, { voices = {}, sources = [], label = 'kit', invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; gap:6px; align-items:center; font:10px var(--sans-serif, sans-serif); background:#1c2529; color:#eceff1; border:1px solid #37474f; border-radius:6px; padding:6px 10px;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  const map = document.createElement('span');
  map.style.cssText = 'color:#90a4ae; font-family:monospace;';
  map.textContent = Object.keys(voices).join(' ');
  el.append(led, name, map);
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 100);
  };
  const onMidi = e => {
    const [st, note, vel] = e.detail.data;
    if ((st & 240) !== 144 || vel === 0)
      return;
    const v = voices[note];
    if (!v)
      return;
    ctx.resume();
    try {
      v(e.detail.time ?? ctx.currentTime + 0.003);
      flash();
    } catch (err) {
      console.warn('daw: kit voice failed', note, err);
    }
  };
  sources.filter(Boolean).forEach(s => s.addEventListener('midi', onMidi));
  if (invalidation)
    invalidation.then(() => sources.filter(Boolean).forEach(s => s.removeEventListener('midi', onMidi)));
  Object.defineProperty(el, 'value', {
    get: () => Object.keys(voices).map(Number),
    set: () => {
    }
  });
  return el;
}
)};
const _1mtgc1q = function _template_knob(sticky,Inputs){return(
sticky(Inputs.range([
  0,
  1
], {
  label: 'knob',
  step: 0.01,
  value: 0.5
}), 0.5)
)};
const _9ywdi1 = (G, _) => G.input(_);
const _1rkh166 = function _template_drum(gridContainer,runtime,invalidation,dawModule){return(
gridContainer(runtime, {
  invalidation,
  module: dawModule,
  include: [
    'viewof template_drum_pitch',
    'viewof template_drum_decay',
    'viewof template_drum_hit'
  ],
  layout: {
    atoms: {
      'viewof template_drum_pitch': {
        'x': 10,
        'y': 10,
        'w': 380
      },
      'viewof template_drum_decay': {
        'x': 10,
        'y': 60,
        'w': 380
      },
      'viewof template_drum_hit': {
        'x': 10,
        'y': 110
      }
    }
  },
  width: 400,
  height: 150,
  grid: 10
})
)};
const _ivdukz = function _template_drum_pitch(sticky,Inputs){return(
sticky(Inputs.range([
  40,
  400
], {
  label: 'pitch',
  step: 1,
  value: 120
}), 343)
)};
const _i2vntw = (G, _) => G.input(_);
const _1f7glvg = function _template_drum_decay(sticky,Inputs){return(
sticky(Inputs.range([
  0.05,
  0.8
], {
  label: 'decay',
  step: 0.01,
  value: 0.3
}), 0.3)
)};
const _lp3ewg = (G, _) => G.input(_);
const _7we2z6 = function _template_drum_hit(Inputs,daw_ctx,template_drum_voice)
{
  const b = Inputs.button('hit');
  b.addEventListener('click', () => {
    daw_ctx.resume();
    template_drum_voice(daw_ctx.currentTime + 0.02);
  });
  return b;
};
const _kyc5cz = (G, _) => G.input(_);
const _bzz7zk = function _template_drum_voice($0,$1,daw_ctx,master){return(
t => {
  const pitch = Number($0.value) || 120;
  const decay = Number($1.value) || 0.3;
  const o = daw_ctx.createOscillator();
  const g = daw_ctx.createGain();
  o.frequency.setValueAtTime(pitch * 2, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + decay * 0.6);
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
  o.onended = () => g.disconnect();
}
)};
const _1tgfsqb = function _extending(md){return(
md`## Extending the studio

1. **＋ cell → ⊕ drum** on the station copies the whole \`template_drum\` group (faceplate, knobs, hit button, voice function) under a fresh name like \`drum1\` — every cross-reference renamed, no code typed. Its knobs are sticky; hit plays it immediately.
2. To sequence it, pick a MIDI note for it: add a row like \`{ name: 'drum1', note: 45 }\` to the drum seq's \`rows\` (✎ on the pattern atom) and map \`45: drum1_voice\` in the kit's \`voices\` literal. Wiring is the one deliberately code-shaped step: dataflow references *are* the patch cords.
3. Melodic instruments subscribe to MIDI sources instead: add a new \`mkSeq\` cell on the clock and list it in a synth's \`sources:\` — or just play it from \`keys\` / hardware \`midiIn\`.
4. Any view from anywhere can join: \`viewof myThing = sticky(anyView, undefined)\` remembers itself; **＋ cell** puts it on the rack. Template authors just name cells \`template_<name>\` / \`template_<name>_<part>\`.`
)};
const _dwctrl = function _controls(gridControls){return(
gridControls()
)};
const _1bmgwdy = function _drum1(gridContainer,runtime,invalidation,dawModule){return(
gridContainer(runtime, {
  invalidation,
  module: dawModule,
  include: [
    'viewof drum1_pitch',
    'viewof drum1_decay',
    'viewof drum1_hit'
  ],
  layout: {
    atoms: {
      'viewof drum1_pitch': {
        'x': 10,
        'y': 10,
        'w': 380
      },
      'viewof drum1_decay': {
        'x': 10,
        'y': 60,
        'w': 380
      },
      'viewof drum1_hit': {
        'x': 10,
        'y': 110
      }
    }
  },
  width: 400,
  height: 150,
  grid: 10
})
)};
const _f4meuj = function _drum1_pitch(sticky,Inputs){return(
sticky(Inputs.range([
  40,
  400
], {
  label: 'pitch',
  step: 1,
  value: 120
}), 313)
)};
const _14idqs = (G, _) => G.input(_);
const _q6ae90 = function _drum1_decay(sticky,Inputs){return(
sticky(Inputs.range([
  0.05,
  0.8
], {
  label: 'decay',
  step: 0.01,
  value: 0.3
}), 0.3)
)};
const _5rm1fk = (G, _) => G.input(_);
const _5jxnjk = function _drum1_voice($0,$1,daw_ctx,master){return(
t => {
  const pitch = Number($0.value) || 120;
  const decay = Number($1.value) || 0.3;
  const o = daw_ctx.createOscillator();
  const g = daw_ctx.createGain();
  o.frequency.setValueAtTime(pitch * 2, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + decay * 0.6);
  g.gain.setValueAtTime(0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
  o.onended = () => g.disconnect();
}
)};
const _x1uqb6 = function _drum1_hit(Inputs,daw_ctx,drum1_voice)
{
  const b = Inputs.button('hit');
  b.addEventListener('click', () => {
    daw_ctx.resume();
    drum1_voice(daw_ctx.currentTime + 0.02);
  });
  return b;
};
const _1o2c2pf = (G, _) => G.input(_);
const _knb4x2 = function _knob(){return(
({ label = '', min = 0, max = 1, value = 0.5, step = 0.001, log = false, fmt } = {}) => {
  const initial = value;
  const clamp = v => Math.min(max, Math.max(min, v));
  const dec = (String(step).split('.')[1] || '').length;
  const quant = v => +clamp(Math.round(clamp(v) / step) * step).toFixed(dec);
  const toPos = v => log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const fromPos = p => log ? min * Math.pow(max / min, p) : min + p * (max - min);
  let val = quant(value);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; align-items:center; width:44px; font:9px var(--sans-serif, sans-serif); color:#90a4ae; user-select:none; touch-action:none; cursor:ns-resize;';
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  c.style.cssText = 'width:32px; height:32px;';
  const g = c.getContext('2d');
  const lab = document.createElement('div');
  lab.textContent = label;
  const out = document.createElement('div');
  out.style.cssText = 'color:#3ddc84; font-family:monospace;';
  const show = v => fmt ? fmt(v) : v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(+v.toPrecision(3));
  const paint = () => {
    g.clearRect(0, 0, 64, 64);
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    const a = a0 + toPos(val) * (a1 - a0);
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.strokeStyle = '#37474f';
    g.beginPath();
    g.arc(32, 32, 24, a0, a1);
    g.stroke();
    g.strokeStyle = '#3ddc84';
    g.beginPath();
    g.arc(32, 32, 24, a0, a);
    g.stroke();
    g.strokeStyle = '#eceff1';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(32 + 12 * Math.cos(a), 32 + 12 * Math.sin(a));
    g.lineTo(32 + 22 * Math.cos(a), 32 + 22 * Math.sin(a));
    g.stroke();
    out.textContent = show(val);
  };
  const set = (v, notify) => {
    v = quant(v);
    const changed = v !== val;
    val = v;
    paint();
    if (notify && changed)
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  let py = null;
  let p0 = 0;
  c.addEventListener('pointerdown', e => {
    c.setPointerCapture(e.pointerId);
    py = e.clientY;
    p0 = toPos(val);
    e.preventDefault();
  });
  c.addEventListener('pointermove', e => {
    if (py == null)
      return;
    const fine = e.shiftKey ? 0.1 : 1;
    set(fromPos(Math.min(1, Math.max(0, p0 + (py - e.clientY) / 130 * fine))), true);
  });
  const done = () => {
    py = null;
  };
  c.addEventListener('pointerup', done);
  c.addEventListener('pointercancel', done);
  c.addEventListener('dblclick', () => set(initial, true));
  el.appendChild(c);
  el.appendChild(lab);
  el.appendChild(out);
  Object.defineProperty(el, 'value', {
    get: () => val,
    set: v => {
      if (typeof v === 'number' && !Number.isNaN(v))
        set(v, false);
    }
  });
  paint();
  return el;
}
)};
const _kys9m1 = function _keys(){return(
({
  octaves = 2,
  base = 48,
  velocity = 100,
  keymap = {
    KeyA: 0,
    KeyW: 1,
    KeyS: 2,
    KeyE: 3,
    KeyD: 4,
    KeyF: 5,
    KeyT: 6,
    KeyG: 7,
    KeyY: 8,
    KeyH: 9,
    KeyU: 10,
    KeyJ: 11,
    KeyK: 12,
    KeyO: 13,
    KeyL: 14
  }
} = {}) => {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const nn = n => NAMES[n % 12] + (Math.floor(n / 12) - 1);
  let oct = 0;
  const held = new Set();
  const el = document.createElement('div');
  el.tabIndex = 0;
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:3px; outline:none; user-select:none; width:max-content; font:9px var(--sans-serif, sans-serif); color:#90a4ae; border-radius:6px; padding:4px;';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex; gap:6px; align-items:center;';
  const octBtn = t => {
    const b = document.createElement('button');
    b.textContent = t;
    b.style.cssText = 'font:9px monospace; padding:0 5px; cursor:pointer;';
    return b;
  };
  const downB = octBtn('−');
  const upB = octBtn('+');
  const octLab = document.createElement('span');
  const status = document.createElement('span');
  status.textContent = 'click to arm ⌨';
  bar.append(downB, octLab, upB, status);
  const board = document.createElement('div');
  board.style.cssText = 'position:relative; height:64px; width:max-content; touch-action:none;';
  const emit = (on, note, vel) => {
    el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: [on ? 144 : 128, note & 127, on ? vel : 0] } }));
  };
  const fire = () => el.dispatchEvent(new window.Event('input', { bubbles: true }));
  const paint = () => {
    for (const k of keyEls)
      k.style.background = held.has(base + oct * 12 + +k.dataset.i) ? '#3ddc84' : k.dataset.black ? '#263238' : '#eceff1';
  };
  const noteon = (note, vel = velocity) => {
    if (held.has(note))
      return;
    held.add(note);
    emit(true, note, vel);
    paint();
    fire();
  };
  const noteoff = note => {
    if (!held.delete(note))
      return;
    emit(false, note, 0);
    paint();
    fire();
  };
  const allOff = () => {
    for (const n of [...held])
      noteoff(n);
  };
  const codeFor = {};
  for (const [code, off] of Object.entries(keymap))
    codeFor[off] = code.replace(/^(Key|Digit)/, '');
  const keyEls = [];
  let dragNote = null;
  const BLACK = [1, 3, 6, 8, 10];
  let wx = 0;
  for (let i = 0; i < octaves * 12 + 1; i++) {
    const black = BLACK.includes(i % 12);
    const k = document.createElement('div');
    k.dataset.i = i;
    if (black)
      k.dataset.black = '1';
    k.style.cssText = black ? `position:absolute; left:${ wx - 7 }px; top:0; width:14px; height:38px; background:#263238; border:1px solid #111; border-radius:0 0 3px 3px; z-index:2; cursor:pointer;` : `position:absolute; left:${ wx }px; top:0; width:21px; height:62px; background:#eceff1; border:1px solid #78909c; border-radius:0 0 3px 3px; box-sizing:border-box; cursor:pointer;`;
    if (!black) {
      if (codeFor[i] != null) {
        const t = document.createElement('div');
        t.textContent = codeFor[i].toLowerCase();
        t.style.cssText = 'position:absolute; bottom:2px; width:100%; text-align:center; color:#78909c; pointer-events:none;';
        k.appendChild(t);
      }
      wx += 21;
    }
    k.addEventListener('pointerdown', e => {
      e.preventDefault();
      el.focus();
      dragNote = base + oct * 12 + i;
      noteon(dragNote);
    });
    k.addEventListener('pointerenter', e => {
      if (e.buttons & 1) {
        if (dragNote != null)
          noteoff(dragNote);
        dragNote = base + oct * 12 + i;
        noteon(dragNote);
      }
    });
    keyEls.push(k);
    board.appendChild(k);
  }
  board.style.width = wx + 'px';
  const endDrag = () => {
    if (dragNote != null) {
      noteoff(dragNote);
      dragNote = null;
    }
  };
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointerleave', endDrag);
  const paintOct = () => {
    octLab.textContent = nn(base + oct * 12) + '–' + nn(base + oct * 12 + octaves * 12);
  };
  const shiftOct = d => {
    allOff();
    oct = Math.max(-3, Math.min(3, oct + d));
    paintOct();
  };
  downB.addEventListener('click', () => shiftOct(-1));
  upB.addEventListener('click', () => shiftOct(1));
  el.addEventListener('keydown', e => {
    if (e.repeat)
      return;
    const off = keymap[e.code];
    if (off != null) {
      e.preventDefault();
      noteon(base + oct * 12 + off);
      return;
    }
    if (e.code === 'KeyZ')
      shiftOct(-1);
    if (e.code === 'KeyX')
      shiftOct(1);
  });
  el.addEventListener('keyup', e => {
    const off = keymap[e.code];
    if (off != null)
      noteoff(base + oct * 12 + off);
  });
  el.addEventListener('focus', () => {
    status.textContent = '⌨ armed (z/x octave)';
    el.style.outline = '1px solid #3ddc84';
  });
  el.addEventListener('blur', () => {
    allOff();
    status.textContent = 'click to arm ⌨';
    el.style.outline = 'none';
  });
  el.append(bar, board);
  Object.defineProperty(el, 'value', {
    get: () => [...held].sort((a, b) => a - b),
    set: () => {
    }
  });
  paintOct();
  return el;
}
)};
const _mdn3q7 = function _midiIn(){return(
({ label = 'MIDI in' } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; gap:6px; align-items:center; font:11px var(--sans-serif, sans-serif);';
  const led = document.createElement('span');
  led.style.cssText = 'width:8px; height:8px; border-radius:50%; background:#555; display:inline-block; flex:none;';
  const lab = document.createElement('span');
  lab.textContent = label;
  const slot = document.createElement('span');
  el.append(led, lab, slot);
  Object.defineProperty(el, 'value', { get: () => attached.map(i => i.name), set: () => {
  } });
  if (!window.navigator.requestMIDIAccess) {
    slot.textContent = 'Web MIDI unsupported';
    return el;
  }
  let access = null;
  let attached = [];
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = attached.length ? '#2e7d32' : '#555';
    }, 120);
  };
  const onMsg = e => {
    flash();
    el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: [...e.data] } }));
  };
  const sel = document.createElement('select');
  sel.style.cssText = 'font:11px inherit; max-width:150px;';
  const attach = () => {
    attached.forEach(i => i.removeEventListener('midimessage', onMsg));
    attached = [];
    for (const inp of access.inputs.values())
      if (sel.value === '*' || inp.id === sel.value) {
        inp.addEventListener('midimessage', onMsg);
        attached.push(inp);
      }
    led.style.background = attached.length ? '#2e7d32' : '#555';
  };
  const rebuild = () => {
    const cur = sel.value || '*';
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = '*';
    all.textContent = access.inputs.size ? 'all devices' : 'no devices';
    sel.appendChild(all);
    for (const inp of access.inputs.values()) {
      const o = document.createElement('option');
      o.value = inp.id;
      o.textContent = inp.name;
      sel.appendChild(o);
    }
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : '*';
    attach();
  };
  sel.addEventListener('input', e => e.stopPropagation());
  sel.addEventListener('change', attach);
  const btn = document.createElement('button');
  btn.textContent = 'connect';
  btn.style.cssText = 'font:11px inherit; cursor:pointer;';
  btn.addEventListener('click', async () => {
    try {
      access = await window.navigator.requestMIDIAccess();
      access.addEventListener('statechange', rebuild);
      slot.replaceChildren(sel);
      rebuild();
    } catch (e) {
      slot.textContent = 'MIDI access denied';
    }
  });
  slot.appendChild(btn);
  return el;
}
)};
const _msy5k4 = function _mkSynth(knob){return(
(ctx, out, { label = 'synth', sources = [], invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  const wave = document.createElement('select');
  wave.style.cssText = 'font:10px inherit; margin-left:auto;';
  for (const w of ['sawtooth', 'square', 'triangle', 'sine']) {
    const o = document.createElement('option');
    o.value = w;
    o.textContent = w;
    wave.appendChild(o);
  }
  head.append(led, name, wave);
  const k = {
    gain: knob({ label: 'gain', min: 0, max: 1, value: 0.6, step: 0.01 }),
    cutoff: knob({ label: 'cutoff', min: 60, max: 14000, value: 3000, step: 1, log: true }),
    res: knob({ label: 'res', min: 0, max: 18, value: 2, step: 0.1 }),
    env: knob({ label: 'env', min: 0, max: 1, value: 0.35, step: 0.01 }),
    a: knob({ label: 'att', min: 0.002, max: 1.5, value: 0.005, step: 0.001, log: true }),
    d: knob({ label: 'dec', min: 0.02, max: 2, value: 0.18, step: 0.01, log: true }),
    s: knob({ label: 'sus', min: 0, max: 1, value: 0.5, step: 0.01 }),
    r: knob({ label: 'rel', min: 0.02, max: 4, value: 0.25, step: 0.01, log: true })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, row);
  const patch = () => ({
    wave: wave.value,
    ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value]))
  });
  const live = new Map();
  const noteoff = (note, at) => {
    const v = live.get(note);
    if (!v)
      return;
    live.delete(note);
    const t = at ?? ctx.currentTime;
    const r = Math.max(0.02, k.r.value);
    if (v.g.gain.cancelAndHoldAtTime)
      v.g.gain.cancelAndHoldAtTime(t);
    else
      v.g.gain.cancelScheduledValues(t);
    v.g.gain.setTargetAtTime(0.0001, t, r / 3);
    v.o.stop(t + r * 3 + 0.1);
    v.o.onended = () => v.g.disconnect();
    if (!live.size)
      led.style.background = '#37474f';
  };
  const noteon = (note, vel, at) => {
    ctx.resume();
    if (live.has(note))
      noteoff(note, at);
    const p = patch();
    const t = at ?? ctx.currentTime + 0.003;
    const o = ctx.createOscillator();
    o.type = p.wave;
    o.frequency.value = 440 * 2 ** ((note - 69) / 12);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = p.res;
    const peak = Math.min(16000, p.cutoff + p.env * 12000);
    f.frequency.setValueAtTime(peak, t);
    f.frequency.setTargetAtTime(p.cutoff, t + Math.max(0.002, p.a), Math.max(0.01, p.d / 3));
    const g = ctx.createGain();
    const amp = 0.25 * p.gain * (vel / 127);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, amp), t + Math.max(0.002, p.a));
    g.gain.setTargetAtTime(Math.max(0.0001, amp * p.s), t + Math.max(0.002, p.a), Math.max(0.01, p.d / 3));
    o.connect(f);
    f.connect(g);
    g.connect(out);
    o.start(t);
    live.set(note, { o, g });
    led.style.background = '#3ddc84';
  };
  const onMidi = e => {
    const [st, d1, d2] = e.detail.data;
    const c = st & 240;
    const t = e.detail.time;
    if (c === 144 && d2 > 0)
      noteon(d1, d2, t);
    else if (c === 128 || c === 144)
      noteoff(d1, t);
  };
  sources.filter(Boolean).forEach(s => s.addEventListener('midi', onMidi));
  const allOff = () => [...live.keys()].forEach(noteoff);
  if (invalidation)
    invalidation.then(() => {
      sources.filter(Boolean).forEach(s => s.removeEventListener('midi', onMidi));
      allOff();
    });
  Object.defineProperty(el, 'value', {
    get: patch,
    set: p => {
      if (!p)
        return;
      if (p.wave)
        wave.value = p.wave;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
    }
  });
  return el;
}
)};
const _ky1v6r = function _keys1(keys){return(
keys({
  octaves: 2,
  base: 48,
  keymap: {
    KeyA: 0,
    KeyW: 1,
    KeyS: 2,
    KeyE: 3,
    KeyD: 4,
    KeyF: 5,
    KeyT: 6,
    KeyG: 7,
    KeyY: 8,
    KeyH: 9,
    KeyU: 10,
    KeyJ: 11,
    KeyK: 12,
    KeyO: 13,
    KeyL: 14
  }
})
)};
const _ky1g3s = (G, _) => G.input(_);
const _md1v5t = function _midi1(midiIn){return(
midiIn()
)};
const _md1g7u = (G, _) => G.input(_);
const _sy1v8e = function _synth1(sticky,mkSynth,daw_ctx,master,$0,$1,$2,invalidation){return(
sticky(mkSynth(daw_ctx, master, {
  label: 'poly',
  sources: [
    $0,
    $1,
    $2
  ],
  invalidation
}), undefined)
)};
const _sy1g2h = (G, _) => G.input(_);
const _clk1v4 = function _clock(mkClock,daw_ctx,$0,$1,invalidation){return(
mkClock(daw_ctx, {
  playing: $0,
  bpm: $1,
  invalidation
})
)};
const _clk1g5 = (G, _) => G.input(_);
const _kit1v2 = function _kit1(mkKit,daw_ctx,$0,kick_voice,hat_voice,bass_voice,invalidation){return(
mkKit(daw_ctx, {
  label: 'drums',
  sources: [$0],
  voices: {
    36: kick_voice,
    42: hat_voice,
    43: bass_voice
  },
  invalidation
})
)};
const _kit1g8 = (G, _) => G.input(_);
const _sq2v6a = function _synthSeq(sticky,mkSeq,$0,invalidation){return(
sticky(mkSeq($0, {
  label: 'synth seq',
  gate: 0.9,
  rows: [
    { name: 'C4', note: 60 },
    { name: 'A#3', note: 58 },
    { name: 'G3', note: 55 },
    { name: 'F3', note: 53 },
    { name: 'D#3', note: 51 },
    { name: 'C3', note: 48 }
  ],
  invalidation
}), {
  'C4': [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ],
  'A#3': [
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false
  ],
  'G3': [
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false
  ],
  'F3': [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false
  ],
  'D#3': [
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    true
  ],
  'C3': [
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ]
})
)};
const _sq2g7b = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/grid-container", async () => runtime.module((await import("/@tomlarkworthy/grid-container.js?v=4")).default));  
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_14bo005", null, ["md"], _14bo005);  
  $def("_uafule", "station", ["gridContainer","runtime","invalidation","dawModule"], _uafule);  
  $def("_hn2uu3", "title", ["md"], _hn2uu3);  
  $def("_18x0rsh", "viewof dawModule", ["thisModule"], _18x0rsh);  
  $def("_1kmg14a", "dawModule", ["Generators","viewof dawModule"], _1kmg14a);  
  $def("_19o1i4f", "daw_ctx", [], _19o1i4f);  
  $def("_1qz528a", "master", ["daw_ctx"], _1qz528a);  
  $def("_1cxip4o", "viewof masterVol", ["sticky","Inputs"], _1cxip4o);  
  $def("_12egs9p", "masterVol", ["Generators","viewof masterVol"], _12egs9p);  
  $def("_1r939zp", "masterVolBind", ["master","masterVol"], _1r939zp);  
  $def("_1bzzngz", "analyser", ["daw_ctx","master"], _1bzzngz);  
  $def("_kha09r", "scope", ["analyser","invalidation"], _kha09r);  
  $def("_1efbfap", "viewof bpm", ["sticky","Inputs"], _1efbfap);  
  $def("_w2pv3n", "bpm", ["Generators","viewof bpm"], _w2pv3n);  
  $def("_ae8ir", "viewof playing", ["Inputs"], _ae8ir);  
  $def("_1vfroho", "playing", ["Generators","viewof playing"], _1vfroho);  
  $def("_s71xha", "stepGrid", ["Event"], _s71xha);
  $def("_14j1vyd", "viewof pattern", ["sticky","mkSeq","viewof clock","invalidation"], _14j1vyd);
  $def("_7a7f2w", "pattern", ["Generators","viewof pattern"], _7a7f2w);
  $def("_wu1p2x", "noiseBuffer", ["daw_ctx"], _wu1p2x);  
  $def("_6ldw81", "kick_voice", ["daw_ctx","master"], _6ldw81);  
  $def("_1xa2q3y", "hat_voice", ["daw_ctx","noiseBuffer","master"], _1xa2q3y);  
  $def("_1n3qz47", "viewof bassCutoff", ["sticky","Inputs"], _1n3qz47);  
  $def("_1hifuoy", "bassCutoff", ["Generators","viewof bassCutoff"], _1hifuoy);  
  $def("_tsq2pi", "viewof bassDecay", ["sticky","Inputs"], _tsq2pi);  
  $def("_cecwt5", "bassDecay", ["Generators","viewof bassDecay"], _cecwt5);  
  $def("_7zke3z", "bass_voice", ["viewof bassCutoff","viewof bassDecay","daw_ctx","master"], _7zke3z);
  $def("_1mtgc1q", "viewof template_knob", ["sticky","Inputs"], _1mtgc1q);  
  $def("_9ywdi1", "template_knob", ["Generators","viewof template_knob"], _9ywdi1);  
  $def("_1rkh166", "template_drum", ["gridContainer","runtime","invalidation","dawModule"], _1rkh166);  
  $def("_ivdukz", "viewof template_drum_pitch", ["sticky","Inputs"], _ivdukz);  
  $def("_i2vntw", "template_drum_pitch", ["Generators","viewof template_drum_pitch"], _i2vntw);  
  $def("_1f7glvg", "viewof template_drum_decay", ["sticky","Inputs"], _1f7glvg);  
  $def("_lp3ewg", "template_drum_decay", ["Generators","viewof template_drum_decay"], _lp3ewg);  
  $def("_7we2z6", "viewof template_drum_hit", ["Inputs","daw_ctx","template_drum_voice"], _7we2z6);  
  $def("_kyc5cz", "template_drum_hit", ["Generators","viewof template_drum_hit"], _kyc5cz);  
  $def("_bzz7zk", "template_drum_voice", ["viewof template_drum_pitch","viewof template_drum_decay","daw_ctx","master"], _bzz7zk);  
  $def("_1tgfsqb", "extending", ["md"], _1tgfsqb);  
  $def("_dwctrl", "controls", ["gridControls"], _dwctrl);
  $def("_1bmgwdy", "drum1", ["gridContainer","runtime","invalidation","dawModule"], _1bmgwdy);
  $def("_f4meuj", "viewof drum1_pitch", ["sticky","Inputs"], _f4meuj);  
  $def("_14idqs", "drum1_pitch", ["Generators","viewof drum1_pitch"], _14idqs);  
  $def("_q6ae90", "viewof drum1_decay", ["sticky","Inputs"], _q6ae90);  
  $def("_5rm1fk", "drum1_decay", ["Generators","viewof drum1_decay"], _5rm1fk);  
  $def("_5jxnjk", "drum1_voice", ["viewof drum1_pitch","viewof drum1_decay","daw_ctx","master"], _5jxnjk);  
  $def("_x1uqb6", "viewof drum1_hit", ["Inputs","daw_ctx","drum1_voice"], _x1uqb6);
  $def("_1o2c2pf", "drum1_hit", ["Generators","viewof drum1_hit"], _1o2c2pf);
  $def("_knb4x2", "knob", [], _knb4x2);
  $def("_kys9m1", "keys", [], _kys9m1);
  $def("_mdn3q7", "midiIn", [], _mdn3q7);
  $def("_msy5k4", "mkSynth", ["knob"], _msy5k4);
  $def("_mkclk7", "mkClock", [], _mkclk7);
  $def("_mkseq3", "mkSeq", ["stepGrid"], _mkseq3);
  $def("_mkkit9", "mkKit", [], _mkkit9);
  $def("_ky1v6r", "viewof keys1", ["keys"], _ky1v6r);
  $def("_ky1g3s", "keys1", ["Generators","viewof keys1"], _ky1g3s);
  $def("_md1v5t", "viewof midi1", ["midiIn"], _md1v5t);
  $def("_md1g7u", "midi1", ["Generators","viewof midi1"], _md1g7u);
  $def("_clk1v4", "viewof clock", ["mkClock","daw_ctx","viewof playing","viewof bpm","invalidation"], _clk1v4);
  $def("_clk1g5", "clock", ["Generators","viewof clock"], _clk1g5);
  $def("_kit1v2", "viewof kit1", ["mkKit","daw_ctx","viewof pattern","kick_voice","hat_voice","bass_voice","invalidation"], _kit1v2);
  $def("_kit1g8", "kit1", ["Generators","viewof kit1"], _kit1g8);
  $def("_sq2v6a", "viewof synthSeq", ["sticky","mkSeq","viewof clock","invalidation"], _sq2v6a);
  $def("_sq2g7b", "synthSeq", ["Generators","viewof synthSeq"], _sq2g7b);
  $def("_sy1v8e", "viewof synth1", ["sticky","mkSynth","daw_ctx","master","viewof keys1","viewof midi1","viewof synthSeq","invalidation"], _sy1v8e);
  $def("_sy1g2h", "synth1", ["Generators","viewof synth1"], _sy1g2h);
  main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
  main.define("gridControls", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridControls", _));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}