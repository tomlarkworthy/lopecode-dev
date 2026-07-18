const _14bo005 = function _1(md){return(
md`# Lope DAW`
)};
const _uafule = function _station(gridContainer,runtime,invalidation,dawModule){return(
gridContainer(runtime, {
  invalidation,
  module: dawModule,
  include: [
    'viewof playing',
    'viewof bpm',
    'viewof masterVol',
    'sequencer',
    'viewof pattern',
    'viewof bassCutoff',
    'viewof bassDecay',
    'scope',
    'template_drum',
    'drum1',
    'controls'
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
      'sequencer': {
        'x': 440,
        'y': 80
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
      }
    }
  },
  height: 460
})
)};
const _hn2uu3 = function _title(md){return(
md`

A digital audio workstation that is nothing but a notebook. Every piece of state — knob positions, the drum pattern, the rack layout, even instruments you add from the template menu — lives in cell source code, so export, diff, undo and remix all see the whole studio.

Built from three orthogonal concepts, none of them audio-specific:

- **[sticky](https://observablehq.com/@tomlarkworthy/sticky)** — any view remembers its value in its own source (\`sticky(view, remembered)\`), persisted by a silent definition swap: no recompute, no remount, no audio glitch.
- **[grid-container](https://observablehq.com/@tomlarkworthy/grid-container)** — the rack. Atoms are live cells; layout and membership are self-rewritten literals. Even the rack controls are a normal cell (\`controls = gridControls()\`) placed on the rack; its **＋ cell → templates** instantiates a copy of any \`template_*\` cell group under a fresh name — add an instrument without typing code.
- **Observable dataflow** — wiring. Voices are plain function cells; the sequencer's \`voices\` literal is the patchbay, edited like any other cell (✎ on its atom).

Audio discipline (no timers anywhere):
- \`daw_ctx\`/\`master\`/\`analyser\` use the \`this\` idiom — recompute returns the previous instance, so the audio graph is immortal.
- The sequencer's clock is the **audio clock**: a silent \`ConstantSourceNode\` ends at each step boundary and its \`onended\` schedules the next step. No \`setInterval\`, no lookahead polling, and it keeps time in background tabs.
- Voice functions read knob **elements'** \`.value\` at trigger time, so turning a knob never recomputes the audio path.`
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
}), 133)
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
  const paint = () => {
    for (const r of rows)
      value[r].forEach((on, i) => {
        btns[r][i].style.background = on ? '#e7040f' : i % 4 === 0 ? 'var(--theme-foreground-faint, #ccc)' : 'var(--theme-foreground-faintest, #e5e5e5)';
      });
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
const _14j1vyd = function _pattern(sticky,stepGrid){return(
sticky(stepGrid([
  'kick',
  'hat',
  'bass'
]), {
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
}), 2400)
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
}), 0.25)
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
const _10onszx = function _sequencer(playing,md,daw_ctx,invalidation,kick_voice,hat_voice,bass_voice,$0,$1)
{
  if (!playing)
    return md`⏹ stopped`;
  const ctx = daw_ctx;
  ctx.resume();
  let stop = false;
  invalidation.then(() => {
    stop = true;
  });
  // the patchbay: pattern row -> voice function. Edit this literal (✎) to wire
  // in an instrument you instantiated from the template menu.
  const voices = {
    kick: kick_voice,
    hat: hat_voice,
    bass: bass_voice
  };
  let step = 0;
  let nextT = ctx.currentTime + 0.1;
  const tickStep = () => {
    if (stop)
      return;
    const secPerStep = 60 / (Number($0.value) || 120) / 4;
    // 16th notes, live bpm
    const pat = $1.value || {};
    for (const [row, cells] of Object.entries(pat)) {
      if (cells[step % (cells.length || 16)] && voices[row]) {
        try {
          voices[row](nextT);
        } catch (e) {
          console.warn('lope-daw: voice failed', row, e);
        }
      }
    }
    // audio-clock tick: a silent node ends just before the next step boundary
    // and onended schedules it — sample-accurate-ish, works in background tabs
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
      if (stop)
        return;
      step++;
      nextT += secPerStep;
      if (nextT < ctx.currentTime + 0.02)
        nextT = ctx.currentTime + 0.02;
      // resync after jank
      tickStep();
    };
  };
  tickStep();
  return md`▶ playing`;
};
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
}), 120)
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
2. To sequence it, open the sequencer's ✎ editor and add \`drum1_voice\` to the \`voices\` literal, and its row to the pattern grid's rows. Wiring is the one deliberately code-shaped step: dataflow references *are* the patch cords.
3. Any view from anywhere can join: \`viewof myThing = sticky(anyView, undefined)\` remembers itself; **＋ cell** puts it on the rack. Template authors just name cells \`template_<name>\` / \`template_<name>_<part>\`.`
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
  $def("_14j1vyd", "viewof pattern", ["sticky","stepGrid"], _14j1vyd);  
  $def("_7a7f2w", "pattern", ["Generators","viewof pattern"], _7a7f2w);  
  $def("_wu1p2x", "noiseBuffer", ["daw_ctx"], _wu1p2x);  
  $def("_6ldw81", "kick_voice", ["daw_ctx","master"], _6ldw81);  
  $def("_1xa2q3y", "hat_voice", ["daw_ctx","noiseBuffer","master"], _1xa2q3y);  
  $def("_1n3qz47", "viewof bassCutoff", ["sticky","Inputs"], _1n3qz47);  
  $def("_1hifuoy", "bassCutoff", ["Generators","viewof bassCutoff"], _1hifuoy);  
  $def("_tsq2pi", "viewof bassDecay", ["sticky","Inputs"], _tsq2pi);  
  $def("_cecwt5", "bassDecay", ["Generators","viewof bassDecay"], _cecwt5);  
  $def("_7zke3z", "bass_voice", ["viewof bassCutoff","viewof bassDecay","daw_ctx","master"], _7zke3z);  
  $def("_10onszx", "sequencer", ["playing","md","daw_ctx","invalidation","kick_voice","hat_voice","bass_voice","viewof bpm","viewof pattern"], _10onszx);  
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
  main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
  main.define("gridControls", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridControls", _));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}