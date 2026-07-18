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
    'viewof swing',
    'viewof masterVol',
    'viewof clock',
    'viewof kit1',
    'viewof pattern',
    'viewof bassCutoff',
    'viewof bassDecay',
    'viewof scope',
    'viewof song',
    'viewof drum1',
    'controls',
    'viewof synth1',
    'viewof synthSeq',
    'viewof midi1',
    'viewof keys1',
    'viewof chord1',
    'viewof synth2',
    'viewof keys2',
    'viewof seq1',
    'viewof chordSeq',
    'viewof kick1',
    'viewof snare1',
    'viewof hat1',
    'viewof pads1',
    'viewof echo1',
    'viewof verb1',
    'viewof duck1',
    'viewof slicer1'
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
      'viewof swing': {
        'x': 1090,
        'y': 20,
        'w': 220
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
        'y': 130,
        'w': 140,
        'h': 40
      },
      'viewof scope': {
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
      'viewof drum1': {
        'x': 20,
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
      },
      'viewof chord1': {
        'x': 460,
        'y': 540
      },
      'viewof song': {
        'x': 720,
        'y': 540,
        'w': 360
      },
      'viewof synth2': {
        'x': 20,
        'y': 660
      },
      'viewof keys2': {
        'x': 480,
        'y': 660
      },
      'viewof seq1': {
        'x': 20,
        'y': 790
      },
      'viewof chordSeq': {
        'x': 480,
        'y': 790
      },
      'viewof kick1': {
        'x': 20,
        'y': 940
      },
      'viewof snare1': {
        'x': 390,
        'y': 940
      },
      'viewof hat1': {
        'x': 760,
        'y': 940
      },
      'viewof pads1': {
        'x': 20,
        'y': 1110
      },
      'viewof echo1': {
        'x': 20,
        'y': 1310
      },
      'viewof verb1': {
        'x': 420,
        'y': 1310
      },
      'viewof duck1': {
        'x': 760,
        'y': 1310
      },
      'viewof slicer1': {
        'x': 20,
        'y': 1460
      }
    }
  },
  height: 1650
})
)};
const _hn2uu3 = function _title(md){return(
md`

A digital audio workstation that is nothing but a notebook. Every piece of state — knob positions, the drum pattern, the rack layout, even instruments you add from the template menu — lives in cell source code, so export, diff, undo and remix all see the whole studio.

Built from three orthogonal concepts, none of them audio-specific:

- **[sticky](https://observablehq.com/@tomlarkworthy/sticky)** — any view remembers its value in its own source (\`sticky(view, remembered)\`), persisted by a silent definition swap: no recompute, no remount, no audio glitch.
- **[grid-container](https://observablehq.com/@tomlarkworthy/grid-container)** — the rack. Atoms are live cells; layout and membership are self-rewritten literals. Even the rack controls are a normal cell (\`controls = gridControls()\`) placed on the rack; its **＋ cell → templates** instantiates a copy of any \`template_*\` cell group under a fresh name — add an instrument without typing code.
- **Observable dataflow** — structure. Voices are plain function cells; the kit's \`voices\` literal maps MIDI notes to them, edited like any other cell (✎ on its atom).

Audio discipline (no timers anywhere):
- \`daw_ctx\`/\`master\`/\`analyser\` use the \`this\` idiom — recompute returns the previous instance, so the audio graph is immortal.
- The **clock** is the only ticking thing, and it runs on the **audio clock**: a silent \`ConstantSourceNode\` ends just before each step boundary and its \`onended\` schedules the next step. No \`setInterval\`, no lookahead polling, and it keeps time in background tabs. It dispatches look-ahead \`tick\` events carrying the exact \`AudioContext\` time of the boundary; everything downstream is a passive subscriber.
- A **seq** is a pattern grid that listens to the clock and emits *timed* MIDI — a sequencer is a keyboard that plays itself. Instruments can't tell a pattern from a human.
- Voice functions read knob **elements'** \`.value\` at trigger time, so turning a knob never recomputes the audio path.

Everything speaks **MIDI** over a shared bus. Sources publish named events (\`{source, data, time}\`, raw MIDI bytes, optional scheduled time) onto \`midiBus\`: **keys** (pointer + computer-keyboard piano — the key binding is a plain \`keymap\` literal in its cell), **midiIn** (Web MIDI hardware), and every **seq**. Instruments pick their inputs with the **⌁ chooser** on their faceplate; the selection persists inside the same \`sticky\` patch as the knobs, so rewiring is a click yet the whole patch bay still lives in cell source. **Transformers** are both sink and source: **chord** expands each incoming note into a chord under its own bus name (\`keys1 → chord1 → synth\`) — arpeggiators, transposers and quantizers are the same shape. The bus also carries **audio taps**: \`master\` and every synth register their output node under their name, and a **scope** selects which tap it draws.

The **song** cell is the arranger — the sequencer of sequencers. It reuses the persistence plane as the arrangement plane: sticky writes view values to *source*, a scene writes view values to *time*. **⊕** captures a snapshot of its ⌁ targets (patterns, synth patches, chord quality, anything with a value) as a scene with a bar count; while armed, the last tick of each bar applies the next scene's values — the events are marked *transient* so sticky does not commit playback moves to source. The scene list itself is a sticky value, so the whole arrangement survives export.`
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
const _1qz528a = function _master(daw_ctx,midiBus)
{
  const g = this ?? daw_ctx.createGain();
  if (!this) {
    g.gain.value = 0.8;
    g.connect(daw_ctx.destination);
  }
  midiBus.registerTap('master', g);
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
const _mksc6 = function _mkScope(){return(
(ctx, bus, { tap = 'master', label = 'scope', invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:6px 8px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const name = document.createElement('b');
  name.textContent = label;
  const sel = document.createElement('select');
  sel.style.cssText = 'font:10px inherit; margin-left:auto;';
  head.append(name, sel);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  let want = tap;
  let cur = null;
  const connect = () => {
    if (cur) {
      try {
        cur.disconnect(analyser);
      } catch (e) {
      }
      cur = null;
    }
    const node = bus && bus.taps && bus.taps.get(want);
    if (node) {
      node.connect(analyser);
      cur = node;
    }
  };
  const refresh = () => {
    const names = [...new Set([
        ...bus && bus.taps ? bus.taps.keys() : [],
        want
      ])].filter(n => !n.startsWith('template_') || n === want);
    sel.innerHTML = '';
    for (const n of names) {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    }
    sel.value = want;
    connect();
  };
  sel.addEventListener('input', () => {
    want = sel.value;
    connect();
  });
  if (bus)
    bus.addEventListener('taps', refresh);
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
  el.append(head, c);
  refresh();
  draw();
  if (invalidation)
    invalidation.then(() => {
      cancelAnimationFrame(raf);
      if (bus)
        bus.removeEventListener('taps', refresh);
      if (cur)
        try {
          cur.disconnect(analyser);
        } catch (e) {
        }
    });
  Object.defineProperty(el, 'value', {
    get: () => ({ tap: want }),
    set: p => {
      if (p && p.tap) {
        want = p.tap;
        refresh();
      }
    }
  });
  return el;
}
)};
const _scp1v = function _scope(sticky,mkScope,daw_ctx,midiBus,invalidation){return(
sticky(mkScope(daw_ctx, midiBus, {
  label: 'scope',
  tap: 'master',
  invalidation
}), undefined)
)};
const _scp1g = (G, _) => G.input(_);
const _tsc1v = function _template_scope(sticky,mkScope,daw_ctx,midiBus,invalidation){return(
sticky(mkScope(daw_ctx, midiBus, {
  label: 'template_scope',
  tap: 'master',
  invalidation
}), undefined)
)};
const _tsc1g = (G, _) => G.input(_);
const _1efbfap = function _bpm(sticky,Inputs){return(
sticky(Inputs.range([
  60,
  180
], {
  label: 'bpm',
  step: 1,
  value: 120
}), 172)
)};
const _w2pv3n = (G, _) => G.input(_);
const _swg1v = function _swing(sticky,Inputs){return(
sticky(Inputs.range([
  0,
  0.6
], {
  label: 'swing',
  step: 0.01,
  value: 0
}), 0)
)};
const _swg1g = (G, _) => G.input(_);
const _ae8ir = function _playing(Inputs){return(
Inputs.toggle({ label: '\u25B6 play' })
)};
const _1vfroho = (G, _) => G.input(_);
const _s71xha = function _stepGrid(Event){return(
(rows, {
  steps = 16,
  labelWidth = 52,
  rowLabel = null
} = {}) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid; gap:2px; font:10px var(--sans-serif, sans-serif); user-select:none; width:max-content;';
  wrap.style.gridTemplateColumns = `${ labelWidth }px repeat(${ steps }, 18px)`;
  const value = Object.fromEntries(rows.map(r => [
    r,
    Array(steps).fill(0)
  ]));
  const btns = {};
  let ph = -1;
  const paint = () => {
    for (const r of rows)
      value[r].forEach((on, i) => {
        btns[r][i].style.background = on ? '#e7040f' : i % 4 === 0 ? 'var(--theme-foreground-faint, #ccc)' : 'var(--theme-foreground-faintest, #e5e5e5)';
        btns[r][i].style.outline = i === ph ? '2px solid #3ddc84' : 'none';
        btns[r][i].style.outlineOffset = '-2px';
        btns[r][i].textContent = on > 1 ? on : '';
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
    if (rowLabel)
      lab.appendChild(rowLabel(r));
    else
      lab.textContent = r;
    lab.style.cssText = 'align-self:center; overflow:hidden; text-overflow:ellipsis;';
    wrap.appendChild(lab);
    btns[r] = [];
    for (let i = 0; i < steps; i++) {
      const b = document.createElement('div');
      b.style.cssText = 'width:18px; height:18px; border-radius:3px; cursor:pointer; color:#fff; font:10px/18px var(--sans-serif, sans-serif); text-align:center;';
      b.addEventListener('pointerdown', e => {
        const cur = +value[r][i] || 0;
        // shift-click ratchets: 2-4 sub-hits inside the step (drum rolls)
        value[r][i] = e.shiftKey ? (cur >= 4 ? 1 : (cur || 1) + 1) : cur ? 0 : 1;
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
          value[r] = v[r].slice(0, steps).concat(Array(Math.max(0, steps - v[r].length)).fill(0)).map(x => typeof x === 'number' ? Math.max(0, Math.min(4, Math.round(x))) : x ? 1 : 0);
      paint();
    }
  });
  paint();
  return wrap;
}
)};
const _14j1vyd = function _pattern(sticky,mkSeq,$0,midiBus,invalidation){return(
sticky(mkSeq($0, {
  label: 'drums',
  name: 'drums',
  bus: midiBus,
  rows: [
    { name: 'kick', note: 36 },
    { name: 'snare', note: 38, vel: 112 },
    { name: 'ghost', note: 38, vel: 38 },
    { name: 'hat', note: 42, vel: 48 },
    { name: 'bass', note: 43 }
  ],
  invalidation
}), {"kick":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"ghost":[0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],"hat":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"bass":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]})
)};
const _7a7f2w = (G, _) => G.input(_);
const _dbus1 = function _drumBus(daw_ctx,master,midiBus)
{
  // the drum chain: voices sum into a gain, glue compressor, then master.
  // `this` idiom keeps the graph immortal; tap 'drums' lets scopes watch it
  const b = this ?? (() => {
    const g = daw_ctx.createGain();
    g.gain.value = 0.9;
    const comp = daw_ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    g.connect(comp);
    comp.connect(master);
    return g;
  })();
  midiBus.registerTap('drums', b);
  return b;
};
const _1n3qz47 = function _bassCutoff(sticky,Inputs){return(
sticky(Inputs.range([
  100,
  4000
], {
  label: 'cutoff',
  step: 10,
  value: 800
}), 900)
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
}), 0.14)
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
(ctx, { playing, bpm, swing = null, stepsPerBar = 16, invalidation } = {}) => {
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
    // swing: off-beat 16ths land late; internal grid stays steady, only emitted time shifts
    const sw = swing ? Math.min(0.6, Math.max(0, Number(swing.value) || 0)) : 0;
    const ts = stepInBar % 2 ? t + sw * secPerStep() : t;
    el.dispatchEvent(new window.CustomEvent('tick', { detail: { t: ts, step, stepInBar, bar, stepsPerBar, secPerStep: secPerStep() } }));
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
(clock, { rows = [], steps = 16, velocity = 100, gate = 0.5, label, bus = null, name = 'seq', invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  // the wiring is the note: each row's pitch is live UI state (chip), not a source literal
  const notes = Object.fromEntries(rows.map(r => [r.name, r.note & 127]));
  const chips = {};
  const isPitch = rn => /^[A-G]#?\d$/.test(rn);
  const rowLabel = rn => {
    const r = rows.find(x => x.name === rn);
    const box = document.createElement('span');
    box.style.cssText = 'display:inline-flex; gap:4px; align-items:baseline;';
    if (!isPitch(rn)) {
      const nm = document.createElement('span');
      nm.textContent = rn;
      box.appendChild(nm);
    }
    const chip = document.createElement('span');
    chip.style.cssText = 'color:#3ddc84; font-family:monospace; cursor:ns-resize; touch-action:none;';
    chip.title = 'drag to transpose (shift = octaves); dblclick resets';
    const paint = () => {
      chip.textContent = NN(notes[rn]);
    };
    chips[rn] = paint;
    const bump = v => {
      v = Math.max(0, Math.min(127, v));
      if (v === notes[rn])
        return;
      notes[rn] = v;
      paint();
      chip.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    let py = null;
    let n0 = 0;
    chip.addEventListener('pointerdown', e => {
      chip.setPointerCapture(e.pointerId);
      py = e.clientY;
      n0 = notes[rn];
      e.preventDefault();
    });
    chip.addEventListener('pointermove', e => {
      if (py == null)
        return;
      bump(n0 + Math.round((py - e.clientY) / 6) * (e.shiftKey ? 12 : 1));
    });
    const done = () => {
      py = null;
    };
    chip.addEventListener('pointerup', done);
    chip.addEventListener('pointercancel', done);
    chip.addEventListener('dblclick', () => bump(r.note & 127));
    paint();
    box.appendChild(chip);
    return box;
  };
  const grid = stepGrid(rows.map(r => r.name), { steps, labelWidth: 64, rowLabel });
  if (bus)
    bus.register(name);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:2px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:6px; align-items:center; font:9px var(--sans-serif, sans-serif); color:#90a4ae;';
  const lab = document.createElement('span');
  lab.textContent = label || name;
  const muteBtn = document.createElement('button');
  muteBtn.textContent = 'M';
  muteBtn.title = 'mute (live, not persisted)';
  muteBtn.style.cssText = 'font:8px monospace; padding:0 4px; cursor:pointer;';
  let muted = false;
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.style.background = muted ? '#e7040f' : '';
    muteBtn.style.color = muted ? '#fff' : '';
  });
  head.append(lab, muteBtn);
  el.appendChild(head);
  el.appendChild(grid);
  const onTick = e => {
    const { t, step, secPerStep } = e.detail;
    const col = step % steps;
    grid.playhead(col);
    if (muted)
      return;
    const pat = grid.value;
    for (const r of rows) {
      const n = pat[r.name] ? +pat[r.name][col] || 0 : 0;
      if (!n)
        continue;
      const note = notes[r.name];
      const hits = Math.min(4, n);
      for (let h = 0; h < hits; h++) {
        const ht = t + h * secPerStep / hits;
        const offT = ht + Math.max(0.02, secPerStep / hits * gate);
        const bv = Math.max(1, Math.min(127, r.vel ?? velocity));
        const on = [144, note, hits > 1 ? Math.max(1, Math.round(bv * (0.55 + 0.45 * (h + 1) / hits))) : bv];
        const off = [128, note, 0];
        el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: on, time: ht } }));
        el.dispatchEvent(new window.CustomEvent('midi', { detail: { data: off, time: offT } }));
        if (bus) {
          bus.publish(name, on, ht);
          bus.publish(name, off, offT);
        }
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
    get: () => ({
      ...grid.value,
      __notes: { ...notes }
    }),
    set: v => {
      if (!v)
        return;
      if (v.__notes)
        for (const [rn, n] of Object.entries(v.__notes))
          if (typeof n === 'number' && notes[rn] != null) {
            notes[rn] = n & 127;
            if (chips[rn])
              chips[rn]();
          }
      grid.value = v;
    }
  });
  return el;
}
)};
const _mkkit9 = function _mkKit(mkInputPicker){return(
(ctx, { voices = {}, sources = [], bus = null, inputs = [], label = 'kit', invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; gap:6px; align-items:center; font:10px var(--sans-serif, sans-serif); background:#1c2529; color:#eceff1; border:1px solid #37474f; border-radius:6px; padding:6px 10px;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  const map = document.createElement('span');
  map.style.cssText = 'color:#90a4ae; font-family:monospace;';
  map.textContent = Object.keys(voices).map(n => NN(+n)).join(' ');
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  el.append(led, name, picker, map);
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
      v(e.detail.time ?? ctx.currentTime + 0.003, Math.max(0.05, vel / 127));
      flash();
    } catch (err) {
      console.warn('daw: kit voice failed', note, err);
    }
  };
  sources.filter(Boolean).forEach(s => s.addEventListener('midi', onMidi));
  const onBus = e => {
    if (selected.has(e.detail.source))
      onMidi(e);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      sources.filter(Boolean).forEach(s => s.removeEventListener('midi', onMidi));
      if (bus)
        bus.removeEventListener('midi', onBus);
    });
  Object.defineProperty(el, 'value', {
    get: () => ({ inputs: picker.value }),
    set: p => {
      if (p && Array.isArray(p.inputs))
        picker.value = p.inputs;
    }
  });
  return el;
}
)};
const _bus1a2 = function _midiBus()
{
  // `this` idiom: the bus is immortal, so name-based subscriptions survive remounts
  if (this)
    return this;
  const bus = new window.EventTarget();
  bus.sources = new Set();
  bus.register = name => {
    if (!name || bus.sources.has(name))
      return;
    bus.sources.add(name);
    bus.dispatchEvent(new window.CustomEvent('sources'));
  };
  bus.publish = (name, data, time) => {
    bus.register(name);
    bus.dispatchEvent(new window.CustomEvent('midi', { detail: { source: name, data, time } }));
  };
  // audio taps: named AudioNodes that scopes/meters can listen to
  bus.taps = new Map();
  bus.registerTap = (name, node) => {
    if (!name || !node || bus.taps.get(name) === node)
      return;
    bus.taps.set(name, node);
    bus.dispatchEvent(new window.CustomEvent('taps'));
  };
  return bus;
};
const _mkpk5 = function _mkInputPicker(){return(
(bus, { selected = [], onChange } = {}) => {
  const sel = new Set(selected);
  const el = document.createElement('span');
  el.style.cssText = 'display:inline-flex;';
  const btn = document.createElement('button');
  btn.style.cssText = 'font:9px monospace; cursor:pointer; padding:1px 5px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  const paint = () => {
    btn.textContent = '⌁ ' + (sel.size ? [...sel].join(',') : 'inputs');
  };
  let pop = null;
  const close = () => {
    if (pop) {
      pop.remove();
      pop = null;
    }
  };
  const open = () => {
    close();
    pop = document.createElement('div');
    pop.style.cssText = 'position:fixed; z-index:1000; background:#1c2529; color:#eceff1; border:1px solid #37474f; border-radius:6px; padding:6px 10px; font:10px var(--sans-serif, sans-serif); display:flex; flex-direction:column; gap:3px;';
    const r = btn.getBoundingClientRect();
    pop.style.left = r.left + 'px';
    pop.style.top = r.bottom + 4 + 'px';
    const names = [...new Set([
        ...bus && bus.sources || [],
        ...sel
      ])].filter(n => !n.startsWith('template_') || sel.has(n));
    if (!names.length)
      pop.textContent = 'no sources';
    for (const n of names) {
      const lab = document.createElement('label');
      lab.style.cssText = 'display:flex; gap:5px; align-items:center; cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = sel.has(n);
      cb.addEventListener('input', () => {
        cb.checked ? sel.add(n) : sel.delete(n);
        paint();
        if (onChange)
          onChange([...sel]);
        // popover lives on document.body, outside the faceplate — re-dispatch
        // from the picker so sticky (listening on the faceplate) hears it
        el.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
      lab.append(cb, document.createTextNode(n));
      pop.appendChild(lab);
    }
    pop.addEventListener('pointerleave', close);
    document.body.appendChild(pop);
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop ? close() : open();
  });
  el.appendChild(btn);
  Object.defineProperty(el, 'value', {
    get: () => [...sel],
    set: v => {
      if (!Array.isArray(v))
        return;
      sel.clear();
      v.forEach(n => sel.add(n));
      paint();
      if (onChange)
        onChange([...sel]);
    }
  });
  paint();
  return el;
}
)};
const _mkchd2 = function _mkChord(mkInputPicker){return(
(bus, { name = 'chord', inputs = [], chord = 'min', invalidation } = {}) => {
  const CHORDS = {
    maj: [
      0,
      4,
      7
    ],
    min: [
      0,
      3,
      7
    ],
    '7': [
      0,
      4,
      7,
      10
    ],
    maj7: [
      0,
      4,
      7,
      11
    ],
    min7: [
      0,
      3,
      7,
      10
    ],
    sus4: [
      0,
      5,
      7
    ],
    power: [
      0,
      7
    ],
    oct: [
      0,
      12
    ]
  };
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; gap:6px; align-items:center; font:10px var(--sans-serif, sans-serif); background:#1c2529; color:#eceff1; border:1px solid #37474f; border-radius:6px; padding:6px 10px;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const title = document.createElement('b');
  title.textContent = name;
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  const sel = document.createElement('select');
  sel.style.cssText = 'font:10px inherit;';
  for (const c of Object.keys(CHORDS)) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
  sel.value = chord;
  el.append(led, title, picker, sel);
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 100);
  };
  const active = new Map();
  let emitting = false;
  const onBus = e => {
    // emitting guard breaks transformer cycles; source===name skips own echoes
    if (emitting || e.detail.source === name || !selected.has(e.detail.source))
      return;
    const [st, n, v] = e.detail.data;
    const c = st & 240;
    emitting = true;
    try {
      if (c === 144 && v > 0) {
        const notes = (CHORDS[sel.value] || [0]).map(i => n + i).filter(x => x >= 0 && x <= 127);
        active.set(n, notes);
        for (const x of notes)
          bus.publish(name, [
            144,
            x,
            v
          ], e.detail.time);
        flash();
      } else if (c === 128 || c === 144) {
        const notes = active.get(n) || [n];
        active.delete(n);
        for (const x of notes)
          bus.publish(name, [
            128,
            x,
            0
          ], e.detail.time);
      }
    } finally {
      emitting = false;
    }
  };
  bus.register(name);
  bus.addEventListener('midi', onBus);
  const allOff = () => {
    for (const [n, notes] of [...active]) {
      active.delete(n);
      for (const x of notes)
        bus.publish(name, [
          128,
          x,
          0
        ]);
    }
  };
  sel.addEventListener('input', allOff);
  if (invalidation)
    invalidation.then(() => {
      bus.removeEventListener('midi', onBus);
      allOff();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      chord: sel.value,
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      if (p.chord && CHORDS[p.chord])
        sel.value = p.chord;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
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
const _1tgfsqb = function _extending(md){return(
md`## Extending the studio

1. **＋ cell → ⊕ drum / synth / sampler / pads / seq / keys / scope / echo / verb / duck** adds a fresh instance of that equipment. Each registers on the \`midiBus\` under its new name and appears in every ⌁ input chooser.
2. **Wiring is notes.** Every seq row has a draggable note chip; drums and samplers have a matching \`note\` knob (pads: a chip per pad). An instrument plays a row when the notes match and the seq's name is ticked in its ⌁.
3. **Samples**: drop an audio file on a sampler's waveform or a pad (right-click a pad to browse). The bytes become file attachments, so an exported notebook still has them.
4. **Groove**: the *swing* slider (next to bpm) pushes every off-beat 16th late. **Rolls**: shift-click a step to ratchet it (2–4 sub-hits, rising velocity).
5. **FX are patch cords**: an echo/verb's *from* select taps any instrument's output in parallel (dry path untouched — send/return). \`send\` = how much goes in, \`wet\` = how much comes back. FX register their own tap, so you can scope or duck them by name.
6. **Sidechain**: a duck unit listens for a \`note\` on its ⌁ sources and dips the *ducks* target's gain (\`depth\`, \`rel\`). Default: the kick ducks the reese — classic pump.
7. **Glide**: any synth's \`glide\` knob > 0 makes it mono — overlapping notes slide 303-style instead of retriggering.
8. **Pan**: every instrument has a \`pan\` knob. Spread the hats, keep kick and sub centred.
9. **Slice a break**: drop a breakbeat on a slicer — it chops into \`slices\` equal parts mapped upward from \`base\` (labels drawn on the waveform). Point seq row chips at those notes to resequence the chop; click a slice to audition.
10. **Arranging**: set the song's ⌁ to the cells that define a section, dial in a sound, **⊕** to capture it as a scene, change things, capture again. Set bar counts, press play — the song walks the scenes in a loop. ▶ auditions a scene, ⟳ re-captures into it. Un-tick *armed* to jam without the song moving values under you. Tick **morph** for automation: numeric knob values glide toward the next scene across its bars (patterns and note pitches still switch on the boundary).
11. Any view from anywhere can join: \`viewof myThing = sticky(anyView, undefined)\` remembers itself; **＋ cell** puts it on the rack. Template authors just name cells \`template_<name>\`.`
)};
const _dwctrl = function _controls(gridControls){return(
gridControls()
)};
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
  bus = null,
  name = 'keys',
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
  if (bus)
    bus.register(name);
  const emit = (on, note, vel) => {
    const data = [on ? 144 : 128, note & 127, on ? vel : 0];
    el.dispatchEvent(new window.CustomEvent('midi', { detail: { data } }));
    if (bus)
      bus.publish(name, data);
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
({ label = 'MIDI in', bus = null, name = 'midi' } = {}) => {
  const el = document.createElement('div');
  if (bus)
    bus.register(name);
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
    const data = [...e.data];
    el.dispatchEvent(new window.CustomEvent('midi', { detail: { data } }));
    if (bus)
      bus.publish(name, data);
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
const _msy5k4 = function _mkSynth(knob,mkInputPicker){return(
(ctx, out, { label = 'synth', sources = [], bus = null, inputs = [], invalidation } = {}) => {
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
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  head.append(led, name, picker, wave);
  // per-instrument output: voices sum here so scopes can tap this synth alone
  const outNode = ctx.createGain();
  const panner = ctx.createStereoPanner();
  outNode.connect(panner);
  panner.connect(out);
  if (bus && bus.registerTap)
    bus.registerTap(label, outNode);
  const k = {
    gain: knob({ label: 'gain', min: 0, max: 1, value: 0.6, step: 0.01 }),
    cutoff: knob({ label: 'cutoff', min: 60, max: 14000, value: 3000, step: 1, log: true }),
    res: knob({ label: 'res', min: 0, max: 18, value: 2, step: 0.1 }),
    det: knob({ label: 'det', min: 0, max: 50, value: 0, step: 1 }),
    glide: knob({ label: 'glide', min: 0, max: 0.5, value: 0, step: 0.005 }),
    env: knob({ label: 'env', min: 0, max: 1, value: 0.35, step: 0.01 }),
    a: knob({ label: 'att', min: 0.002, max: 1.5, value: 0.005, step: 0.001, log: true }),
    d: knob({ label: 'dec', min: 0.02, max: 2, value: 0.18, step: 0.01, log: true }),
    s: knob({ label: 'sus', min: 0, max: 1, value: 0.5, step: 0.01 }),
    r: knob({ label: 'rel', min: 0.02, max: 4, value: 0.25, step: 0.01, log: true }),
    pan: knob({ label: 'pan', min: -1, max: 1, value: 0, step: 0.01 })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, row);
  el.addEventListener('input', () => {
    panner.pan.value = k.pan.value;
  });
  const patch = () => ({
    wave: wave.value,
    ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value]))
  });
  const live = new Map();
  let mv = null;
  let held = [];
  // fast choke (no release tail): same-note retrigger (rolls) and teardown
  const kill = (v, t) => {
    if (v.g.gain.cancelAndHoldAtTime)
      v.g.gain.cancelAndHoldAtTime(t);
    else
      v.g.gain.cancelScheduledValues(t);
    v.g.gain.setTargetAtTime(0.0001, t, 0.004);
    v.o.stop(t + 0.05);
    if (v.o2)
      v.o2.stop(t + 0.05);
    v.o.onended = () => v.g.disconnect();
  };
  const release = (v, t) => {
    const r = Math.max(0.02, k.r.value);
    if (v.g.gain.cancelAndHoldAtTime)
      v.g.gain.cancelAndHoldAtTime(t);
    else
      v.g.gain.cancelScheduledValues(t);
    v.g.gain.setTargetAtTime(0.0001, t, r / 3);
    v.o.stop(t + r * 3 + 0.1);
    if (v.o2)
      v.o2.stop(t + r * 3 + 0.1);
    v.o.onended = () => v.g.disconnect();
  };
  const mkVoice = (note, vel, t, p) => {
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
    const amp = 0.25 * p.gain * (vel / 127) * (p.det > 0 ? 0.65 : 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, amp), t + Math.max(0.002, p.a));
    g.gain.setTargetAtTime(Math.max(0.0001, amp * p.s), t + Math.max(0.002, p.a), Math.max(0.01, p.d / 3));
    let o2 = null;
    if (p.det > 0) {
      o.detune.setValueAtTime(-p.det / 2, t);
      o2 = ctx.createOscillator();
      o2.type = p.wave;
      o2.frequency.value = o.frequency.value;
      o2.detune.setValueAtTime(p.det / 2, t);
      o2.connect(f);
    }
    o.connect(f);
    f.connect(g);
    g.connect(outNode);
    o.start(t);
    if (o2)
      o2.start(t);
    return { o, o2, g };
  };
  const noteoff = (note, at) => {
    const t = at ?? ctx.currentTime;
    if (mv) {
      // mono/glide: release only when the last held note lifts
      const i = held.indexOf(note);
      if (i >= 0)
        held.splice(i, 1);
      if (!held.length) {
        release(mv, t);
        mv = null;
        if (!live.size)
          led.style.background = '#37474f';
      }
      return;
    }
    const v = live.get(note);
    if (!v)
      return;
    // ratchets overlap on/off pairs on one note: only the LAST open releases
    if (--v.opens > 0)
      return;
    live.delete(note);
    release(v, t);
    if (!live.size)
      led.style.background = '#37474f';
  };
  const noteon = (note, vel, at) => {
    ctx.resume();
    const t = at ?? ctx.currentTime + 0.003;
    const p = patch();
    if (p.glide > 0 || mv) {
      // glide > 0 = mono/legato: overlapping notes slide 303-style, no env retrigger
      held.push(note);
      const f = 440 * 2 ** ((note - 69) / 12);
      if (mv) {
        const gl = Math.max(0.005, p.glide);
        mv.o.frequency.cancelScheduledValues(t);
        mv.o.frequency.setTargetAtTime(f, t, gl / 3);
        if (mv.o2) {
          mv.o2.frequency.cancelScheduledValues(t);
          mv.o2.frequency.setTargetAtTime(f, t, gl / 3);
        }
      } else {
        mv = mkVoice(note, vel, t, p);
      }
      led.style.background = '#3ddc84';
      return;
    }
    const prev = live.get(note);
    let opens = 1;
    if (prev) {
      kill(prev, t);
      opens = prev.opens + 1;
    }
    const v = mkVoice(note, vel, t, p);
    v.opens = opens;
    live.set(note, v);
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
  const onBus = e => {
    if (selected.has(e.detail.source))
      onMidi(e);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  const allOff = () => {
    [...live.values()].forEach(v => kill(v, ctx.currentTime));
    live.clear();
    if (mv)
      kill(mv, ctx.currentTime);
    mv = null;
    held = [];
    led.style.background = '#37474f';
  };
  if (invalidation)
    invalidation.then(() => {
      sources.filter(Boolean).forEach(s => s.removeEventListener('midi', onMidi));
      if (bus)
        bus.removeEventListener('midi', onBus);
      allOff();
      outNode.disconnect();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      ...patch(),
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      if (p.wave)
        wave.value = p.wave;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      panner.pan.value = k.pan.value;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
    }
  });
  return el;
}
)};
const _ky1v6r = function _keys1(keys,midiBus){return(
keys({
  octaves: 2,
  base: 48,
  bus: midiBus,
  name: 'keys1',
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
const _md1v5t = function _midi1(midiIn,midiBus){return(
midiIn({
  bus: midiBus,
  name: 'midi1'
})
)};
const _md1g7u = (G, _) => G.input(_);
const _sy1v8e = function _synth1(sticky,mkSynth,daw_ctx,master,midiBus,invalidation){return(
sticky(mkSynth(daw_ctx, master, {
  label: 'poly',
  bus: midiBus,
  inputs: [
    'chord1',
    'midi1'
  ],
  invalidation
}), {"wave":"sawtooth","gain":0.4,"cutoff":1100,"res":1,"env":0.3,"a":0.06,"d":0.5,"s":0.4,"r":0.5,"det":8,"inputs":["chord1","midi1"]})
)};
const _sy1g2h = (G, _) => G.input(_);
const _clk1v4 = function _clock(mkClock,daw_ctx,$0,$1,$2,invalidation){return(
mkClock(daw_ctx, {
  playing: $0,
  bpm: $1,
  swing: $2,
  invalidation
})
)};
const _clk1g5 = (G, _) => G.input(_);
const _kit1v2 = function _kit1(sticky,mkKit,daw_ctx,midiBus,bass_voice,invalidation){return(
sticky(mkKit(daw_ctx, {
  label: 'bass',
  bus: midiBus,
  inputs: [
    'drums'
  ],
  voices: {
    43: bass_voice
  },
  invalidation
}), {"inputs":["drums","seq1"]})
)};
const _kit1g8 = (G, _) => G.input(_);
const _sq2v6a = function _synthSeq(sticky,mkSeq,$0,midiBus,invalidation){return(
sticky(mkSeq($0, {
  label: 'bassline',
  name: 'synthSeq',
  bus: midiBus,
  gate: 3,
  rows: [
    { name: 'C4', note: 60 },
    { name: 'A#3', note: 58 },
    { name: 'G3', note: 55 },
    { name: 'F3', note: 53 },
    { name: 'D#3', note: 51 },
    { name: 'C3', note: 48 }
  ],
  invalidation
}), {"C4":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"G3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],"F3":[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],"D#3":[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],"C3":[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0]})
)};
const _sq2g7b = (G, _) => G.input(_);
const _chd1v = function _chord1(sticky,mkChord,midiBus,invalidation){return(
sticky(mkChord(midiBus, {
  name: 'chord1',
  inputs: [
    'keys1'
  ],
  chord: 'min',
  invalidation
}), {"chord":"min7","inputs":["keys1","chordSeq"]})
)};
const _chd1g = (G, _) => G.input(_);
const _tk1v9 = function _template_keys(keys,midiBus){return(
keys({
  octaves: 2,
  base: 48,
  bus: midiBus,
  name: 'template_keys'
})
)};
const _tk1g0 = (G, _) => G.input(_);
const _tsy1v = function _template_synth(sticky,mkSynth,daw_ctx,master,midiBus,invalidation){return(
sticky(mkSynth(daw_ctx, master, {
  label: 'template_synth',
  bus: midiBus,
  inputs: [],
  invalidation
}), undefined)
)};
const _tsy1g = (G, _) => G.input(_);
const _tsq1v = function _template_seq(sticky,mkSeq,$0,midiBus,invalidation){return(
sticky(mkSeq($0, {
  label: 'template_seq',
  name: 'template_seq',
  bus: midiBus,
  rows: [
    { name: 'kick', note: 36 },
    { name: 'hat', note: 42 },
    { name: 'bass', note: 43 }
  ],
  invalidation
}), undefined)
)};
const _tsq1g = (G, _) => G.input(_);
const _mkarr5 = function _mkArranger(mkInputPicker){return(
(runtime, { clock, targets = [], label = 'song', invalidation } = {}) => {
  const song = {
    targets: [...targets],
    scenes: []
  };
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; font:10px var(--sans-serif, sans-serif); color:#eceff1; width:max-content; min-width:230px;';
  const resolve = n => {
    for (const v of runtime._variables)
      if (v._name === 'viewof ' + n && v._value instanceof window.Element)
        return v._value;
    return null;
  };
  const candidates = () => {
    const names = new Set();
    for (const v of runtime._variables) {
      if (!v._name || !v._name.startsWith('viewof '))
        continue;
      const n = v._name.slice(7);
      if (n === 'playing' || n === 'clock' || n === 'song' || n === 'dawModule' || n === 'station')
        continue;
      if (v._value instanceof window.Element)
        names.add(n);
    }
    return names;
  };
  const picker = mkInputPicker({
    get sources() {
      return candidates();
    }
  }, {
    selected: song.targets,
    onChange: v => {
      song.targets = v;
    }
  });
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:6px; align-items:center;';
  const name = document.createElement('b');
  name.textContent = label;
  const armed = document.createElement('input');
  armed.type = 'checkbox';
  armed.checked = true;
  const armLab = document.createElement('label');
  armLab.title = 'armed: apply scenes on bar boundaries (live, not persisted)';
  armLab.style.cssText = 'display:flex; gap:3px; align-items:center; cursor:pointer; margin-left:auto;';
  armLab.append(armed, document.createTextNode('armed'));
  const morph = document.createElement('input');
  morph.type = 'checkbox';
  const morphLab = document.createElement('label');
  morphLab.title = 'morph: numeric knob values glide toward the next scene across its bars (automation); patterns and notes still switch on the boundary';
  morphLab.style.cssText = 'display:flex; gap:3px; align-items:center; cursor:pointer;';
  morphLab.append(morph, document.createTextNode('morph'));
  const capBtn = document.createElement('button');
  capBtn.textContent = '⊕';
  capBtn.title = 'capture current values of ⌁ targets as a new scene';
  capBtn.style.cssText = 'font:9px monospace; cursor:pointer;';
  head.append(name, picker, armLab, morphLab, capBtn);
  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
  el.append(head, list);
  const snapshot = () => {
    const set = {};
    for (const n of picker.value) {
      const t = resolve(n);
      if (!t)
        continue;
      try {
        const v = JSON.parse(JSON.stringify(t.value));
        if (v !== undefined)
          set[n] = v;
      } catch (e) {
      }
    }
    return set;
  };
  let current = -1;
  const spans = () => song.scenes.map(s => Math.max(1, Math.round(+s.bars) || 1));
  const sceneIndexAt = bar => {
    const sp = spans();
    const total = sp.reduce((a, b) => a + b, 0);
    if (!total)
      return -1;
    let b = (bar % total + total) % total;
    for (let i = 0; i < sp.length; i++) {
      if (b < sp[i])
        return i;
      b -= sp[i];
    }
    return -1;
  };
  const scenePos = bar => {
    const sp = spans();
    const total = sp.reduce((a, b) => a + b, 0);
    if (!total)
      return null;
    let b = (bar % total + total) % total;
    for (let i = 0; i < sp.length; i++) {
      if (b < sp[i])
        return { i, barInScene: b, bars: sp[i] };
      b -= sp[i];
    }
    return null;
  };
  // morph rule: plain numbers lerp; note pitches, arrays (patterns) and __notes
  // hold the current scene until the boundary
  const morphValue = (a, b, f, key) => {
    if (typeof a === 'number' && typeof b === 'number' && key !== 'note')
      return a + (b - a) * f;
    if (a && b && typeof a === 'object' && !Array.isArray(a) && typeof b === 'object' && !Array.isArray(b) && key !== '__notes') {
      const o = {};
      for (const k2 of Object.keys(a))
        o[k2] = k2 in b ? morphValue(a[k2], b[k2], f, k2) : a[k2];
      return o;
    }
    return a;
  };
  const hasMorphDiff = (a, b, key) => {
    if (typeof a === 'number' && typeof b === 'number' && key !== 'note')
      return a !== b;
    if (a && b && typeof a === 'object' && !Array.isArray(a) && typeof b === 'object' && !Array.isArray(b) && key !== '__notes')
      return Object.keys(a).some(k2 => k2 in b && hasMorphDiff(a[k2], b[k2], k2));
    return false;
  };
  const paintActive = () => {
    [...list.children].forEach((row, i) => {
      row.style.background = i === current ? '#264d33' : 'transparent';
    });
  };
  const apply = i => {
    const s = song.scenes[i];
    if (!s)
      return;
    for (const [n, v] of Object.entries(s.set || {})) {
      const t = resolve(n);
      if (!t)
        continue;
      try {
        t.value = JSON.parse(JSON.stringify(v));
        // transient: drive the view for playback without sticky committing it
        const ev = new window.Event('input', { bubbles: true });
        ev.transient = true;
        t.dispatchEvent(ev);
      } catch (err) {
        console.warn('daw: scene apply failed', n, err);
      }
    }
    current = i;
    paintActive();
  };
  const changed = () => el.dispatchEvent(new window.Event('input', { bubbles: true }));
  const render = () => {
    list.innerHTML = '';
    song.scenes.forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:4px; align-items:center; border-radius:3px; padding:1px 3px;';
      const play = document.createElement('button');
      play.textContent = '▶';
      play.title = 'apply this scene now (audition)';
      play.style.cssText = 'font:8px monospace; cursor:pointer; padding:0 3px;';
      play.addEventListener('click', () => apply(i));
      const nm = document.createElement('input');
      nm.type = 'text';
      nm.value = s.name || '';
      nm.placeholder = 'scene ' + (i + 1);
      nm.style.cssText = 'font:10px inherit; width:9ch; background:#111; color:#eceff1; border:1px solid #37474f; border-radius:3px; padding:0 3px;';
      nm.addEventListener('input', () => {
        s.name = nm.value;
      });
      const bars = document.createElement('input');
      bars.type = 'number';
      bars.min = 1;
      bars.value = Math.max(1, Math.round(+s.bars) || 1);
      bars.title = 'bars';
      bars.style.cssText = 'font:10px inherit; width:4ch; background:#111; color:#eceff1; border:1px solid #37474f; border-radius:3px;';
      bars.addEventListener('input', () => {
        s.bars = Math.max(1, Math.round(+bars.value) || 1);
      });
      const tcount = document.createElement('span');
      tcount.title = 'captured targets';
      tcount.style.cssText = 'color:#90a4ae; font:8px monospace;';
      tcount.textContent = String(Object.keys(s.set || {}).length);
      const recap = document.createElement('button');
      recap.textContent = '⟳';
      recap.title = 're-capture current values into this scene';
      recap.style.cssText = 'font:8px monospace; cursor:pointer; padding:0 3px;';
      recap.addEventListener('click', () => {
        s.set = snapshot();
        render();
        changed();
      });
      const del = document.createElement('button');
      del.textContent = '✕';
      del.style.cssText = 'font:8px monospace; cursor:pointer; padding:0 3px;';
      del.addEventListener('click', () => {
        song.scenes.splice(i, 1);
        if (current === i)
          current = -1;
        render();
        changed();
      });
      row.append(play, nm, bars, tcount, recap, del);
      list.appendChild(row);
    });
    if (!song.scenes.length) {
      const hint = document.createElement('span');
      hint.style.cssText = 'color:#90a4ae;';
      hint.textContent = 'no scenes — ⊕ captures the ⌁ targets';
      list.appendChild(hint);
    }
    paintActive();
  };
  capBtn.addEventListener('click', () => {
    song.scenes.push({
      name: 'scene ' + (song.scenes.length + 1),
      bars: 1,
      set: snapshot()
    });
    render();
    changed();
  });
  const onTick = e => {
    if (!armed.checked || !song.scenes.length)
      return;
    const { stepInBar, stepsPerBar, bar } = e.detail;
    if (bar === 0 && stepInBar === 0 && current < 0) {
      // first tick: bring the rack to scene 0 (one-step glitch accepted)
      const first = sceneIndexAt(0);
      if (first >= 0)
        window.queueMicrotask(() => apply(first));
    } else if (stepInBar === stepsPerBar - 1) {
      // last step of the bar: flip for bar+1 after the seqs handled this tick
      const next = sceneIndexAt(bar + 1);
      if (next >= 0 && next !== current)
        window.queueMicrotask(() => apply(next));
    }
    if (morph.checked && current >= 0 && song.scenes.length > 1) {
      const pos = scenePos(bar);
      if (pos && pos.i === current) {
        const a = song.scenes[current].set || {};
        const nb = song.scenes[(current + 1) % song.scenes.length].set || {};
        const f = (pos.barInScene * stepsPerBar + stepInBar + 1) / (pos.bars * stepsPerBar);
        for (const [n, av] of Object.entries(a)) {
          if (!(n in nb) || !hasMorphDiff(av, nb[n], n))
            continue;
          const t = resolve(n);
          if (!t)
            continue;
          try {
            t.value = JSON.parse(JSON.stringify(morphValue(av, nb[n], f, n)));
            const ev = new window.Event('input', { bubbles: true });
            ev.transient = true;
            t.dispatchEvent(ev);
          } catch (err) {
          }
        }
      }
    }
  };
  const onStop = () => {
    current = -1;
    paintActive();
  };
  if (clock) {
    clock.addEventListener('tick', onTick);
    clock.addEventListener('stop', onStop);
  }
  if (invalidation)
    invalidation.then(() => {
      if (clock) {
        clock.removeEventListener('tick', onTick);
        clock.removeEventListener('stop', onStop);
      }
    });
  Object.defineProperty(el, 'value', {
    get: () => JSON.parse(JSON.stringify({
      targets: picker.value,
      scenes: song.scenes,
      morph: morph.checked
    })),
    set: v => {
      if (!v)
        return;
      if (Array.isArray(v.targets))
        picker.value = v.targets;
      if (Array.isArray(v.scenes))
        song.scenes = JSON.parse(JSON.stringify(v.scenes));
      morph.checked = !!v.morph;
      render();
    }
  });
  render();
  return el;
}
)};
const _sng1v = function _song(sticky,mkArranger,runtime,$0,invalidation){return(
sticky(mkArranger(runtime, {
  clock: $0,
  targets: [
    'pattern',
    'synthSeq',
    'chordSeq',
    'seq1',
    'synth1',
    'synth2',
    'kit1',
    'chord1',
    'bassCutoff',
    'bassDecay'
  ],
  invalidation
}), {"targets":["pattern","synthSeq","chordSeq","seq1","synth1","synth2","kit1","chord1","bassCutoff","bassDecay"],"scenes":[{"name":"intro","bars":2,"set":{"pattern":{"kick":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"snare":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ghost":[0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],"hat":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"bass":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"synthSeq":{"C4":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"G3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"F3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"D#3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"C3":[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"chordSeq":{"Cm":[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#":[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]},"seq1":{"kick":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"snare":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"hat":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"synth1":{"wave":"sawtooth","gain":0.4,"cutoff":1100,"res":1,"env":0.3,"a":0.06,"d":0.5,"s":0.4,"r":0.5,"det":8,"inputs":["chord1","midi1"]},"synth2":{"wave":"sawtooth","gain":0.7,"cutoff":300,"res":1.5,"env":0.15,"a":0.01,"d":0.4,"s":0.85,"r":0.15,"det":30,"inputs":["synthSeq","keys2"]},"kit1":{"inputs":["drums","seq1"]},"chord1":{"chord":"min7","inputs":["keys1","chordSeq"]},"bassCutoff":900,"bassDecay":0.14}},{"name":"drop","bars":4,"set":{"pattern":{"kick":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"ghost":[0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],"hat":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"bass":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]},"synthSeq":{"C4":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"G3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],"F3":[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],"D#3":[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],"C3":[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0]},"chordSeq":{"Cm":[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#":[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]},"seq1":{"kick":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"snare":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"hat":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"synth1":{"wave":"sawtooth","gain":0.4,"cutoff":1100,"res":1,"env":0.3,"a":0.06,"d":0.5,"s":0.4,"r":0.5,"det":8,"inputs":["chord1","midi1"]},"synth2":{"wave":"sawtooth","gain":0.7,"cutoff":500,"res":1.5,"env":0.15,"a":0.01,"d":0.4,"s":0.85,"r":0.15,"det":30,"inputs":["synthSeq","keys2"]},"kit1":{"inputs":["drums","seq1"]},"chord1":{"chord":"min7","inputs":["keys1","chordSeq"]},"bassCutoff":900,"bassDecay":0.14}},{"name":"roll","bars":2,"set":{"pattern":{"kick":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"ghost":[0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],"hat":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"bass":[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]},"synthSeq":{"C4":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"G3":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0],"F3":[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],"D#3":[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],"C3":[1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0]},"chordSeq":{"Cm":[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#":[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]},"seq1":{"kick":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"snare":[0,0,0,0,0,0,0,0,0,0,2,0,2,0,4,0],"hat":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"synth1":{"wave":"sawtooth","gain":0.4,"cutoff":1100,"res":1,"env":0.3,"a":0.06,"d":0.5,"s":0.4,"r":0.5,"det":8,"inputs":["chord1","midi1"]},"synth2":{"wave":"sawtooth","gain":0.7,"cutoff":700,"res":1.5,"env":0.15,"a":0.01,"d":0.4,"s":0.85,"r":0.15,"det":30,"inputs":["synthSeq","keys2"]},"kit1":{"inputs":["drums","seq1"]},"chord1":{"chord":"min7","inputs":["keys1","chordSeq"]},"bassCutoff":900,"bassDecay":0.14}}]})
)};
const _sng1g = (G, _) => G.input(_);
const _sy2v1 = function _synth2(sticky,mkSynth,daw_ctx,master,midiBus,invalidation){return(
sticky(mkSynth(daw_ctx, master, {
  label: 'synth2',
  bus: midiBus,
  inputs: [
    'synthSeq',
    'keys2'
  ],
  invalidation
}), {"wave":"sawtooth","gain":0.7,"cutoff":500,"res":1.5,"env":0.15,"a":0.01,"d":0.4,"s":0.85,"r":0.15,"det":30,"inputs":["synthSeq","keys2"]})
)};
const _sy2g1 = (G, _) => G.input(_);
const _ky2v1 = function _keys2(keys,midiBus){return(
keys({
  octaves: 2,
  base: 36,
  bus: midiBus,
  name: 'keys2'
})
)};
const _ky2g1 = (G, _) => G.input(_);
const _sq3v1 = function _seq1(sticky,mkSeq,$0,midiBus,invalidation){return(
sticky(mkSeq($0, {
  label: 'fill',
  name: 'seq1',
  bus: midiBus,
  rows: [
    { name: 'kick', note: 36 },
    { name: 'snare', note: 38 },
    { name: 'hat', note: 42, vel: 60 }
  ],
  invalidation
}), {"kick":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"snare":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"hat":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]})
)};
const _sq3g1 = (G, _) => G.input(_);
const _csq1v = function _chordSeq(sticky,mkSeq,$0,midiBus,invalidation){return(
sticky(mkSeq($0, {
  label: 'chords',
  name: 'chordSeq',
  bus: midiBus,
  gate: 1.4,
  rows: [
    { name: 'Cm', note: 60, vel: 72 },
    { name: 'A#', note: 58, vel: 72 }
  ],
  invalidation
}), {"Cm":[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"A#":[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]})
)};
const _csq1g = (G, _) => G.input(_);
const _smpst1 = function _sampleStore(FileAttachment,getFileAttachmentsMap,daw_ctx){return(
{
  load: async name => daw_ctx.decodeAudioData(await (await FileAttachment(name).arrayBuffer()).slice(0)),
  // register uploaded bytes as a module FileAttachment so export round-trips them
  register: async f => {
    const ab = await f.arrayBuffer();
    const buf = await daw_ctx.decodeAudioData(ab.slice(0));
    const mime = f.type || 'audio/wav';
    getFileAttachmentsMap(FileAttachment).set(f.name, {
      url: URL.createObjectURL(new Blob([ab], { type: mime })),
      mimeType: mime
    });
    return buf;
  }
}
)};
const _mksmp1 = function _mkSampler(knob,mkInputPicker,sampleStore){return(
(ctx, out, { label = 'sampler', bus = null, inputs = [], invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  const fileLab = document.createElement('span');
  fileLab.style.cssText = 'color:#90a4ae; font-family:monospace;';
  fileLab.textContent = '\u2014';
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'audio/*';
  file.style.display = 'none';
  const open = document.createElement('button');
  open.textContent = '\ud83d\udcc2';
  open.title = 'load sample';
  open.style.cssText = 'font:10px inherit; margin-left:auto; cursor:pointer;';
  open.onclick = () => file.click();
  head.append(led, name, fileLab, picker, open, file);
  const cv = document.createElement('canvas');
  cv.width = 220;
  cv.height = 40;
  cv.style.cssText = 'width:220px; height:40px; border:1px solid #263238; border-radius:3px; cursor:pointer;';
  cv.title = 'click to audition; drop audio to load';
  const k = {
    note: knob({ label: 'note', min: 0, max: 127, value: 36, step: 1, fmt: NN }),
    rate: knob({ label: 'rate', min: 0.25, max: 4, value: 1, step: 0.01, log: true }),
    gain: knob({ label: 'gain', min: 0, max: 1.5, value: 1, step: 0.01 }),
    start: knob({ label: 'start', min: 0, max: 1, value: 0, step: 0.005 }),
    end: knob({ label: 'end', min: 0, max: 1, value: 1, step: 0.005 }),
    pan: knob({ label: 'pan', min: -1, max: 1, value: 0, step: 0.01 })
  };
  const track = document.createElement('input');
  track.type = 'checkbox';
  track.title = 'keytrack: any note plays, pitched around note knob';
  const trkLab = document.createElement('label');
  trkLab.style.cssText = 'display:inline-flex; flex-direction:column; align-items:center; font:9px var(--sans-serif, sans-serif); color:#90a4ae; justify-content:center;';
  trkLab.append(track, document.createTextNode('trk'));
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px; align-items:center;';
  row.append(...Object.values(k), trkLab);
  el.append(head, cv, row);
  // audio: one-shots sum into a per-sampler gain so scopes can tap it
  const outNode = ctx.createGain();
  const panner = ctx.createStereoPanner();
  outNode.connect(panner);
  panner.connect(out);
  if (bus && bus.registerTap)
    bus.registerTap(label, outNode);
  let buffer = null;
  let fileName = null;
  let loadTok = 0;
  const draw = () => {
    const w = cv.width;
    const h = cv.height;
    const g2 = cv.getContext('2d');
    g2.fillStyle = '#141b1e';
    g2.fillRect(0, 0, w, h);
    if (!buffer) {
      g2.fillStyle = '#546e7a';
      g2.font = '10px sans-serif';
      g2.fillText('drop / \ud83d\udcc2 a sample', 8, h / 2 + 3);
      return;
    }
    const d = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(d.length / w));
    g2.strokeStyle = '#3ddc84';
    g2.beginPath();
    for (let x = 0; x < w; x++) {
      let mn = 1;
      let mx = -1;
      for (let i = x * step, e = Math.min(d.length, i + step); i < e; i++) {
        const v = d[i];
        if (v < mn)
          mn = v;
        if (v > mx)
          mx = v;
      }
      g2.moveTo(x + 0.5, h / 2 + mn * (h / 2 - 1));
      g2.lineTo(x + 0.5, h / 2 + mx * (h / 2 - 1));
    }
    g2.stroke();
    g2.fillStyle = 'rgba(10,14,16,0.75)';
    const x0 = Math.min(k.start.value, k.end.value) * w;
    const x1 = Math.max(k.start.value, k.end.value) * w;
    g2.fillRect(0, 0, x0, h);
    g2.fillRect(x1, 0, w - x1, h);
  };
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 100);
  };
  let cur = null;
  const play = (t, vel = 100, noteIn = null) => {
    if (!buffer)
      return;
    ctx.resume();
    const dur = buffer.duration;
    const s0 = Math.min(k.start.value, k.end.value) * dur;
    const s1 = Math.max(k.start.value, k.end.value) * dur;
    if (s1 - s0 < 0.001)
      return;
    // mono choke: overlapping copies of the same sample comb-filter into glitch
    if (cur) {
      cur.g.gain.setTargetAtTime(0.0001, t, 0.004);
      try {
        cur.s.stop(t + 0.05);
      } catch (err) {}
    }
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    let rate = k.rate.value;
    if (track.checked && noteIn != null)
      rate *= 2 ** ((noteIn - k.note.value) / 12);
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = k.gain.value * Math.max(0.05, vel / 127);
    s.connect(g);
    g.connect(outNode);
    s.start(t, s0, s1 - s0);
    cur = { s, g };
    s.onended = () => {
      g.disconnect();
      if (cur && cur.s === s)
        cur = null;
    };
    flash();
  };
  const loadFile = async n => {
    const tok = ++loadTok;
    try {
      const buf = await sampleStore.load(n);
      if (tok !== loadTok)
        return;
      buffer = buf;
      fileName = n;
      fileLab.textContent = n;
      draw();
    } catch (err) {
      if (tok === loadTok) {
        fileLab.textContent = n + ' ?';
        console.warn('daw: sampler load failed', n, err);
      }
    }
  };
  // the sticky slot only remembers the NAME; bytes live in the attachment map
  const upload = async f => {
    if (!f)
      return;
    try {
      const buf = await sampleStore.register(f);
      loadTok++;
      buffer = buf;
      fileName = f.name;
      fileLab.textContent = f.name;
      draw();
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    } catch (err) {
      console.warn('daw: sampler upload failed', err);
    }
  };
  file.addEventListener('change', e => {
    e.stopPropagation();
    upload(file.files[0]);
    file.value = '';
  });
  cv.addEventListener('dragover', e => e.preventDefault());
  cv.addEventListener('drop', e => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  });
  cv.addEventListener('click', () => play(ctx.currentTime + 0.01, 100, null));
  el.addEventListener('input', () => {
    panner.pan.value = k.pan.value;
    draw();
  });
  const onMidi = e => {
    const [st, d1, d2] = e.detail.data;
    if ((st & 240) !== 144 || d2 === 0)
      return;
    if (!track.checked && d1 !== k.note.value)
      return;
    play(e.detail.time ?? ctx.currentTime + 0.003, d2, d1);
  };
  const onBus = e => {
    if (selected.has(e.detail.source))
      onMidi(e);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      if (bus)
        bus.removeEventListener('midi', onBus);
      outNode.disconnect();
    });
  draw();
  Object.defineProperty(el, 'value', {
    get: () => ({
      file: fileName,
      note: k.note.value,
      track: track.checked,
      rate: k.rate.value,
      gain: k.gain.value,
      start: k.start.value,
      end: k.end.value,
      pan: k.pan.value,
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      for (const n of Object.keys(k))
        if (typeof p[n] === 'number')
          k[n].value = p[n];
      panner.pan.value = k.pan.value;
      if (typeof p.track === 'boolean')
        track.checked = p.track;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
      if (p.file && p.file !== fileName)
        loadFile(p.file);
      draw();
    }
  });
  return el;
}
)};
const _smpk1v = function _kick1(sticky,mkSampler,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkSampler(daw_ctx, drumBus, {
  label: 'kick1',
  bus: midiBus,
  invalidation
}), {"file":"kick.wav","note":36,"track":false,"rate":1,"gain":1,"start":0,"end":1,"inputs":["drums","seq1"]})
)};
const _smpk1g = (G, _) => G.input(_);
const _smps1v = function _snare1(sticky,mkSampler,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkSampler(daw_ctx, drumBus, {
  label: 'snare1',
  bus: midiBus,
  invalidation
}), {"file":"snare.wav","note":38,"track":false,"rate":1,"gain":1,"start":0,"end":1,"inputs":["drums","seq1"]})
)};
const _smps1g = (G, _) => G.input(_);
const _smph1v = function _hat1(sticky,mkSampler,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkSampler(daw_ctx, drumBus, {
  label: 'hat1',
  bus: midiBus,
  invalidation
}), {"file":"hihat.wav","note":42,"track":false,"rate":1,"gain":0.8,"start":0,"end":1,"inputs":["drums","seq1"]})
)};
const _smph1g = (G, _) => G.input(_);
const _tsmp1v = function _template_sampler(sticky,mkSampler,daw_ctx,master,midiBus,invalidation){return(
sticky(mkSampler(daw_ctx, master, {
  label: 'template_sampler',
  bus: midiBus,
  invalidation
}), {"note":36,"track":false,"rate":1,"gain":1,"start":0,"end":1,"inputs":[]})
)};
const _tsmp1g = (G, _) => G.input(_);
const _mkpd1 = function _mkPads(knob,mkInputPicker,sampleStore){return(
(ctx, out, { label = 'pads', bus = null, inputs = [], count = 8, invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const DEFAULT_NOTES = [36, 38, 42, 46, 43, 45, 47, 49];
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  const gainK = knob({ label: 'gain', min: 0, max: 1.5, value: 1, step: 0.01 });
  const panK = knob({ label: 'pan', min: -1, max: 1, value: 0, step: 0.01 });
  head.append(led, name, picker);
  const body = document.createElement('div');
  body.style.cssText = 'display:flex; gap:6px; align-items:flex-start;';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(4, 56px); gap:4px;';
  body.append(grid, gainK, panK);
  el.append(head, body);
  // pads are a bus SOURCE (finger drumming publishes MIDI) and a sink (seqs drive them)
  if (bus)
    bus.register(label);
  const outNode = ctx.createGain();
  const panner = ctx.createStereoPanner();
  outNode.connect(panner);
  panner.connect(out);
  el.addEventListener('input', () => {
    panner.pan.value = panK.value;
  });
  if (bus && bus.registerTap)
    bus.registerTap(label, outNode);
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'audio/*';
  file.style.display = 'none';
  el.appendChild(file);
  let target = null;
  const pads = Array.from({ length: count }, (_, i) => ({
    note: (DEFAULT_NOTES[i % DEFAULT_NOTES.length] + 12 * Math.floor(i / DEFAULT_NOTES.length)) & 127,
    file: null,
    buffer: null,
    el: null,
    paint: null
  }));
  let loadTok = 0;
  const play = (p, vel = 110, t = null) => {
    if (!p.buffer)
      return;
    ctx.resume();
    const tt = t ?? ctx.currentTime + 0.003;
    if (p.cur) {
      p.cur.g.gain.setTargetAtTime(0.0001, tt, 0.004);
      try {
        p.cur.s.stop(tt + 0.05);
      } catch (err) {}
    }
    const s = ctx.createBufferSource();
    s.buffer = p.buffer;
    const g = ctx.createGain();
    g.gain.value = gainK.value * Math.max(0.05, vel / 127);
    s.connect(g);
    g.connect(outNode);
    s.start(tt);
    p.cur = { s, g };
    s.onended = () => {
      g.disconnect();
      if (p.cur && p.cur.s === s)
        p.cur = null;
    };
    p.el.style.background = '#2e7d32';
    window.setTimeout(() => {
      p.el.style.background = p.buffer ? '#263238' : '#1c2529';
    }, 90);
    led.style.background = '#3ddc84';
    window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 90);
  };
  const assign = async (p, f) => {
    if (!f)
      return;
    try {
      const buf = await sampleStore.register(f);
      p.file = f.name;
      p.buffer = buf;
      p.paint();
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    } catch (err) {
      console.warn('daw: pad upload failed', err);
    }
  };
  for (const p of pads) {
    const b = document.createElement('div');
    p.el = b;
    b.style.cssText = 'height:46px; border-radius:5px; background:#1c2529; border:1px solid #37474f; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:3px 2px; font:8px monospace; color:#90a4ae; touch-action:none; overflow:hidden;';
    b.title = 'tap to play; drop audio to load; right-click to browse';
    const fileLab = document.createElement('div');
    fileLab.style.cssText = 'overflow:hidden; text-overflow:ellipsis; max-width:52px; white-space:nowrap;';
    const chip = document.createElement('span');
    chip.style.cssText = 'color:#3ddc84; cursor:ns-resize; touch-action:none;';
    chip.title = 'drag to transpose (shift = octaves)';
    p.paint = () => {
      fileLab.textContent = p.file ? p.file.replace(/\.[^.]+$/, '') : '\u00b7';
      chip.textContent = NN(p.note);
      b.style.background = p.buffer ? '#263238' : '#1c2529';
    };
    let py = null;
    let n0 = 0;
    chip.addEventListener('pointerdown', e => {
      e.stopPropagation();
      chip.setPointerCapture(e.pointerId);
      py = e.clientY;
      n0 = p.note;
      e.preventDefault();
    });
    chip.addEventListener('pointermove', e => {
      if (py == null)
        return;
      const v = Math.max(0, Math.min(127, n0 + Math.round((py - e.clientY) / 6) * (e.shiftKey ? 12 : 1)));
      if (v !== p.note) {
        p.note = v;
        p.paint();
        chip.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
    });
    const done = () => {
      py = null;
    };
    chip.addEventListener('pointerup', done);
    chip.addEventListener('pointercancel', done);
    b.append(fileLab, chip);
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      const t = ctx.currentTime + 0.003;
      play(p, 110, t);
      if (bus) {
        bus.publish(label, [144, p.note, 110], t);
        bus.publish(label, [128, p.note, 0], t + 0.15);
      }
    });
    b.addEventListener('dragover', e => e.preventDefault());
    b.addEventListener('drop', e => {
      e.preventDefault();
      assign(p, e.dataTransfer.files[0]);
    });
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      target = p;
      file.click();
    });
    p.paint();
    grid.appendChild(b);
  }
  file.addEventListener('change', e => {
    e.stopPropagation();
    if (target)
      assign(target, file.files[0]);
    file.value = '';
  });
  const onBus = e => {
    if (e.detail.source === label || !selected.has(e.detail.source))
      return;
    const [st, d1, d2] = e.detail.data;
    if ((st & 240) !== 144 || d2 === 0)
      return;
    for (const p of pads)
      if (p.note === d1)
        play(p, d2, e.detail.time ?? null);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      if (bus)
        bus.removeEventListener('midi', onBus);
      outNode.disconnect();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      pads: pads.map(p => ({ file: p.file || undefined, note: p.note })),
      gain: gainK.value,
      pan: panK.value,
      inputs: picker.value
    }),
    set: v => {
      if (!v)
        return;
      if (typeof v.gain === 'number')
        gainK.value = v.gain;
      if (typeof v.pan === 'number')
        panK.value = v.pan;
      panner.pan.value = panK.value;
      if (Array.isArray(v.inputs))
        picker.value = v.inputs;
      if (Array.isArray(v.pads))
        v.pads.slice(0, count).forEach((pv, i) => {
          const p = pads[i];
          if (!pv)
            return;
          if (typeof pv.note === 'number')
            p.note = pv.note & 127;
          if (pv.file && pv.file !== p.file) {
            const tok = ++loadTok;
            p.file = pv.file;
            sampleStore.load(pv.file).then(buf => {
              if (tok === loadTok || p.file === pv.file) {
                p.buffer = buf;
                p.paint();
              }
            }).catch(err => console.warn('daw: pad load failed', pv.file, err));
          }
          p.paint();
        });
    }
  });
  return el;
}
)};
const _pd1v = function _pads1(sticky,mkPads,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkPads(daw_ctx, drumBus, {
  label: 'pads1',
  bus: midiBus,
  invalidation
}), {"pads":[{"file":"kick.wav","note":36},{"file":"snare.wav","note":38},{"file":"hihat.wav","note":42},{"note":46},{"note":43},{"note":45},{"note":47},{"note":49}],"gain":1,"inputs":[]})
)};
const _pd1g = (G, _) => G.input(_);
const _tpd1v = function _template_pads(sticky,mkPads,daw_ctx,master,midiBus,invalidation){return(
sticky(mkPads(daw_ctx, master, {
  label: 'template_pads',
  bus: midiBus,
  invalidation
}), {"pads":[{"note":36},{"note":38},{"note":42},{"note":46},{"note":43},{"note":45},{"note":47},{"note":49}],"gain":1,"inputs":[]})
)};
const _tpd1g = (G, _) => G.input(_);
const _mkdr1 = function _mkDrum(knob,mkInputPicker){return(
(ctx, out, { label = 'drum', bus = null, inputs = [], invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  head.append(led, name, picker);
  const k = {
    note: knob({ label: 'note', min: 0, max: 127, value: 45, step: 1, fmt: NN }),
    pitch: knob({ label: 'pitch', min: 30, max: 800, value: 120, step: 1, log: true }),
    bend: knob({ label: 'bend', min: 1, max: 8, value: 2, step: 0.1 }),
    decay: knob({ label: 'decay', min: 0.05, max: 1.5, value: 0.3, step: 0.01, log: true }),
    gain: knob({ label: 'gain', min: 0, max: 1.5, value: 0.9, step: 0.01 }),
    pan: knob({ label: 'pan', min: -1, max: 1, value: 0, step: 0.01 })
  };
  const hit = document.createElement('div');
  hit.textContent = 'hit';
  hit.style.cssText = 'width:34px; height:34px; border-radius:5px; background:#263238; border:1px solid #37474f; cursor:pointer; display:flex; align-items:center; justify-content:center; font:9px monospace; color:#90a4ae; touch-action:none; align-self:center;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px; align-items:center;';
  row.append(...Object.values(k), hit);
  el.append(head, row);
  if (bus)
    bus.register(label);
  const outNode = ctx.createGain();
  const panner = ctx.createStereoPanner();
  outNode.connect(panner);
  panner.connect(out);
  el.addEventListener('input', () => {
    panner.pan.value = k.pan.value;
  });
  if (bus && bus.registerTap)
    bus.registerTap(label, outNode);
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 90);
  };
  let cur = null;
  const play = (vel = 110, at = null) => {
    ctx.resume();
    const t = at ?? ctx.currentTime + 0.003;
    if (cur) {
      cur.g.gain.cancelScheduledValues(t);
      cur.g.gain.setTargetAtTime(0.0001, t, 0.004);
      try {
        cur.o.stop(t + 0.05);
      } catch (err) {}
    }
    const p = k.pitch.value;
    const d = k.decay.value;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(p * k.bend.value, t);
    o.frequency.exponentialRampToValueAtTime(p, t + d * 0.6);
    g.gain.setValueAtTime(0.7 * k.gain.value * Math.max(0.05, vel / 127), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(outNode);
    o.start(t);
    o.stop(t + d + 0.05);
    cur = { o, g };
    o.onended = () => {
      g.disconnect();
      if (cur && cur.o === o)
        cur = null;
    };
    flash();
  };
  hit.addEventListener('pointerdown', e => {
    e.preventDefault();
    const t = ctx.currentTime + 0.003;
    play(110, t);
    if (bus) {
      bus.publish(label, [144, k.note.value, 110], t);
      bus.publish(label, [128, k.note.value, 0], t + 0.15);
    }
  });
  const onBus = e => {
    if (e.detail.source === label || !selected.has(e.detail.source))
      return;
    const [st, d1, d2] = e.detail.data;
    if ((st & 240) !== 144 || d2 === 0)
      return;
    if (d1 !== k.note.value)
      return;
    play(d2, e.detail.time ?? null);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      if (bus)
        bus.removeEventListener('midi', onBus);
      outNode.disconnect();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value])),
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      panner.pan.value = k.pan.value;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
    }
  });
  return el;
}
)};
const _dr1v = function _drum1(sticky,mkDrum,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkDrum(daw_ctx, drumBus, {
  label: 'drum1',
  bus: midiBus,
  invalidation
}), {"note":45,"pitch":296,"bend":2,"decay":0.3,"gain":0.9,"inputs":[]})
)};
const _dr1g = (G, _) => G.input(_);
const _tdr1v = function _template_drum(sticky,mkDrum,daw_ctx,master,midiBus,invalidation){return(
sticky(mkDrum(daw_ctx, master, {
  label: 'template_drum',
  bus: midiBus,
  invalidation
}), {"note":45,"pitch":120,"bend":2,"decay":0.3,"gain":0.9,"inputs":[]})
)};
const _tdr1g = (G, _) => G.input(_);
const _mkec1 = function _mkEcho(knob){return(
(ctx, out, { label = 'echo', bus = null, tap = '', invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const name = document.createElement('b');
  name.textContent = label;
  const from = document.createElement('span');
  from.textContent = 'from';
  from.style.cssText = 'color:#90a4ae; margin-left:auto;';
  const sel = document.createElement('select');
  sel.style.cssText = 'font:10px inherit;';
  head.append(name, from, sel);
  const k = {
    send: knob({ label: 'send', min: 0, max: 1.5, value: 0.6, step: 0.01 }),
    time: knob({ label: 'time', min: 0.03, max: 1.5, value: 0.26, step: 0.005, log: true }),
    fb: knob({ label: 'fb', min: 0, max: 0.9, value: 0.35, step: 0.01 }),
    wet: knob({ label: 'wet', min: 0, max: 1.5, value: 0.5, step: 0.01 })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, row);
  // send/return: taps the chosen instrument's output IN PARALLEL — dry path untouched
  const inG = ctx.createGain();
  const dl = ctx.createDelay(2);
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 4500;
  const fbG = ctx.createGain();
  const wetG = ctx.createGain();
  inG.connect(dl);
  dl.connect(damp);
  damp.connect(fbG);
  fbG.connect(dl);
  dl.connect(wetG);
  wetG.connect(out);
  if (bus && bus.registerTap)
    bus.registerTap(label, wetG);
  const apply = () => {
    const t = ctx.currentTime;
    inG.gain.setTargetAtTime(k.send.value, t, 0.02);
    dl.delayTime.setTargetAtTime(k.time.value, t, 0.05);
    fbG.gain.setTargetAtTime(Math.min(0.92, k.fb.value), t, 0.02);
    wetG.gain.setTargetAtTime(k.wet.value, t, 0.02);
  };
  apply();
  el.addEventListener('input', apply);
  let want = tap;
  let cur = null;
  const connect = () => {
    if (cur) {
      try {
        cur.disconnect(inG);
      } catch (e) {
      }
      cur = null;
    }
    const node = bus && bus.taps && bus.taps.get(want);
    if (node && node !== wetG) {
      node.connect(inG);
      cur = node;
    }
  };
  const refresh = () => {
    const names = [...new Set([
        '',
        ...bus && bus.taps ? bus.taps.keys() : [],
        want
      ])].filter(n => (!n || !n.startsWith('template_') || n === want) && n !== label);
    sel.innerHTML = '';
    for (const n of names) {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n || '\u2014';
      sel.appendChild(o);
    }
    sel.value = want;
    connect();
  };
  sel.addEventListener('input', () => {
    want = sel.value;
    connect();
  });
  if (bus)
    bus.addEventListener('taps', refresh);
  refresh();
  if (invalidation)
    invalidation.then(() => {
      if (bus)
        bus.removeEventListener('taps', refresh);
      if (cur)
        try {
          cur.disconnect(inG);
        } catch (e) {
        }
      wetG.disconnect();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      tap: want,
      ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value]))
    }),
    set: p => {
      if (!p)
        return;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      if (typeof p.tap === 'string')
        want = p.tap;
      apply();
      refresh();
    }
  });
  return el;
}
)};
const _mkvb1 = function _mkVerb(knob){return(
(ctx, out, { label = 'verb', bus = null, tap = '', invalidation } = {}) => {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const name = document.createElement('b');
  name.textContent = label;
  const from = document.createElement('span');
  from.textContent = 'from';
  from.style.cssText = 'color:#90a4ae; margin-left:auto;';
  const sel = document.createElement('select');
  sel.style.cssText = 'font:10px inherit;';
  head.append(name, from, sel);
  const k = {
    send: knob({ label: 'send', min: 0, max: 1.5, value: 0.6, step: 0.01 }),
    size: knob({ label: 'size', min: 0.3, max: 6, value: 1.8, step: 0.05, log: true }),
    wet: knob({ label: 'wet', min: 0, max: 1.5, value: 0.35, step: 0.01 })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, row);
  const inG = ctx.createGain();
  const conv = ctx.createConvolver();
  const wetG = ctx.createGain();
  inG.connect(conv);
  conv.connect(wetG);
  wetG.connect(out);
  if (bus && bus.registerTap)
    bus.registerTap(label, wetG);
  let lastSize = 0;
  const genImpulse = secs => {
    const sr = ctx.sampleRate;
    const len = Math.max(sr * 0.1, Math.floor(sr * secs));
    const b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = b;
    lastSize = secs;
  };
  genImpulse(k.size.value);
  let regen = null;
  const apply = () => {
    const t = ctx.currentTime;
    inG.gain.setTargetAtTime(k.send.value, t, 0.02);
    wetG.gain.setTargetAtTime(k.wet.value, t, 0.02);
    if (k.size.value !== lastSize) {
      window.clearTimeout(regen);
      regen = window.setTimeout(() => genImpulse(k.size.value), 250);
    }
  };
  apply();
  el.addEventListener('input', apply);
  let want = tap;
  let cur = null;
  const connect = () => {
    if (cur) {
      try {
        cur.disconnect(inG);
      } catch (e) {
      }
      cur = null;
    }
    const node = bus && bus.taps && bus.taps.get(want);
    if (node && node !== wetG) {
      node.connect(inG);
      cur = node;
    }
  };
  const refresh = () => {
    const names = [...new Set([
        '',
        ...bus && bus.taps ? bus.taps.keys() : [],
        want
      ])].filter(n => (!n || !n.startsWith('template_') || n === want) && n !== label);
    sel.innerHTML = '';
    for (const n of names) {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n || '\u2014';
      sel.appendChild(o);
    }
    sel.value = want;
    connect();
  };
  sel.addEventListener('input', () => {
    want = sel.value;
    connect();
  });
  if (bus)
    bus.addEventListener('taps', refresh);
  refresh();
  if (invalidation)
    invalidation.then(() => {
      window.clearTimeout(regen);
      if (bus)
        bus.removeEventListener('taps', refresh);
      if (cur)
        try {
          cur.disconnect(inG);
        } catch (e) {
        }
      wetG.disconnect();
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      tap: want,
      ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value]))
    }),
    set: p => {
      if (!p)
        return;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      if (typeof p.tap === 'string')
        want = p.tap;
      apply();
      refresh();
    }
  });
  return el;
}
)};
const _mkdk1 = function _mkDucker(knob,mkInputPicker){return(
(ctx, bus, { label = 'duck', inputs = [], target = '', invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  const arrow = document.createElement('span');
  arrow.textContent = 'ducks';
  arrow.style.cssText = 'color:#90a4ae; margin-left:auto;';
  const sel = document.createElement('select');
  sel.style.cssText = 'font:10px inherit;';
  head.append(led, name, picker, arrow, sel);
  const k = {
    note: knob({ label: 'note', min: 0, max: 127, value: 36, step: 1, fmt: NN }),
    depth: knob({ label: 'depth', min: 0, max: 1, value: 0.55, step: 0.01 }),
    rel: knob({ label: 'rel', min: 0.05, max: 1, value: 0.22, step: 0.01, log: true })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, row);
  let want = target;
  const refresh = () => {
    const names = [...new Set([
        '',
        ...bus && bus.taps ? bus.taps.keys() : [],
        want
      ])].filter(n => (!n || !n.startsWith('template_') || n === want) && n !== 'master' && n !== label);
    sel.innerHTML = '';
    for (const n of names) {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n || '\u2014';
      sel.appendChild(o);
    }
    sel.value = want;
  };
  sel.addEventListener('input', () => {
    want = sel.value;
  });
  if (bus)
    bus.addEventListener('taps', refresh);
  refresh();
  let fade = null;
  const flash = () => {
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      led.style.background = '#37474f';
    }, 90);
  };
  // MIDI-keyed sidechain: the trigger time is known ahead (look-ahead clock),
  // so the dip is scheduled sample-accurately on the target's output gain
  const duck = t => {
    const node = bus && bus.taps && bus.taps.get(want);
    if (!node || !node.gain)
      return;
    const g = node.gain;
    const t0 = Math.max(ctx.currentTime, t - 0.012);
    g.cancelScheduledValues(t0);
    g.setValueAtTime(g.value, t0);
    g.linearRampToValueAtTime(Math.max(0, 1 - k.depth.value), t + 0.004);
    g.setTargetAtTime(1, t + 0.05, Math.max(0.02, k.rel.value) / 3);
    flash();
  };
  const onBus = e => {
    if (!selected.has(e.detail.source))
      return;
    const [st, d1, d2] = e.detail.data;
    if ((st & 240) !== 144 || d2 === 0)
      return;
    if (d1 !== k.note.value)
      return;
    duck(e.detail.time ?? ctx.currentTime + 0.003);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      if (bus) {
        bus.removeEventListener('midi', onBus);
        bus.removeEventListener('taps', refresh);
        const node = bus.taps && bus.taps.get(want);
        if (node && node.gain)
          node.gain.setTargetAtTime(1, ctx.currentTime, 0.02);
      }
    });
  Object.defineProperty(el, 'value', {
    get: () => ({
      target: want,
      ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value])),
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      if (typeof p.target === 'string')
        want = p.target;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
      refresh();
    }
  });
  return el;
}
)};
const _ec1v = function _echo1(sticky,mkEcho,daw_ctx,master,midiBus,invalidation){return(
sticky(mkEcho(daw_ctx, master, {
  label: 'echo1',
  bus: midiBus,
  invalidation
}), {"tap":"poly","send":0.6,"time":0.26,"fb":0.35,"wet":0.5})
)};
const _ec1g = (G, _) => G.input(_);
const _vb1v = function _verb1(sticky,mkVerb,daw_ctx,master,midiBus,invalidation){return(
sticky(mkVerb(daw_ctx, master, {
  label: 'verb1',
  bus: midiBus,
  invalidation
}), {"tap":"snare1","send":0.6,"size":1.8,"wet":0.35})
)};
const _vb1g = (G, _) => G.input(_);
const _dk1v = function _duck1(sticky,mkDucker,daw_ctx,midiBus,invalidation){return(
sticky(mkDucker(daw_ctx, midiBus, {
  label: 'duck1',
  invalidation
}), {"inputs":["drums"],"target":"synth2","note":36,"depth":0.55,"rel":0.22})
)};
const _dk1g = (G, _) => G.input(_);
const _tec1v = function _template_echo(sticky,mkEcho,daw_ctx,master,midiBus,invalidation){return(
sticky(mkEcho(daw_ctx, master, {
  label: 'template_echo',
  bus: midiBus,
  invalidation
}), {"tap":"","send":0.6,"time":0.26,"fb":0.35,"wet":0.5})
)};
const _tec1g = (G, _) => G.input(_);
const _tvb1v = function _template_verb(sticky,mkVerb,daw_ctx,master,midiBus,invalidation){return(
sticky(mkVerb(daw_ctx, master, {
  label: 'template_verb',
  bus: midiBus,
  invalidation
}), {"tap":"","send":0.6,"size":1.8,"wet":0.35})
)};
const _tvb1g = (G, _) => G.input(_);
const _tdk1v = function _template_duck(sticky,mkDucker,daw_ctx,midiBus,invalidation){return(
sticky(mkDucker(daw_ctx, midiBus, {
  label: 'template_duck',
  invalidation
}), {"inputs":[],"target":"","note":36,"depth":0.55,"rel":0.22})
)};
const _tdk1g = (G, _) => G.input(_);
const _mksl1 = function _mkSlicer(knob,mkInputPicker,sampleStore){return(
(ctx, out, { label = 'slicer', bus = null, inputs = [], invalidation } = {}) => {
  const NN = n => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n % 12] + (Math.floor(n / 12) - 1);
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex; flex-direction:column; gap:4px; background:#1c2529; border:1px solid #37474f; border-radius:6px; padding:8px 10px; width:max-content;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; gap:8px; align-items:center; font:10px var(--sans-serif, sans-serif); color:#eceff1;';
  const led = document.createElement('span');
  led.style.cssText = 'width:7px; height:7px; border-radius:50%; background:#37474f; flex:none;';
  const name = document.createElement('b');
  name.textContent = label;
  const fileLab = document.createElement('span');
  fileLab.style.cssText = 'color:#90a4ae; font-family:monospace;';
  fileLab.textContent = '\u2014';
  let selected = new Set(inputs);
  const picker = mkInputPicker(bus, {
    selected: inputs,
    onChange: v => {
      selected = new Set(v);
    }
  });
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'audio/*';
  file.style.display = 'none';
  const open = document.createElement('button');
  open.textContent = '\ud83d\udcc2';
  open.title = 'load a breakbeat';
  open.style.cssText = 'font:10px inherit; margin-left:auto; cursor:pointer;';
  open.onclick = () => file.click();
  head.append(led, name, fileLab, picker, open, file);
  const cv = document.createElement('canvas');
  cv.width = 260;
  cv.height = 44;
  cv.style.cssText = 'width:260px; height:44px; border:1px solid #263238; border-radius:3px; cursor:pointer;';
  cv.title = 'click a slice to audition; drop audio to load';
  const k = {
    base: knob({ label: 'base', min: 0, max: 115, value: 60, step: 1, fmt: NN }),
    slices: knob({ label: 'slices', min: 2, max: 32, value: 8, step: 1 }),
    rate: knob({ label: 'rate', min: 0.5, max: 2, value: 1, step: 0.01, log: true }),
    gain: knob({ label: 'gain', min: 0, max: 1.5, value: 1, step: 0.01 }),
    pan: knob({ label: 'pan', min: -1, max: 1, value: 0, step: 0.01 })
  };
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; gap:2px;';
  row.append(...Object.values(k));
  el.append(head, cv, row);
  // slices map upward from base: base=C4, 8 slices -> C4..G#4 trigger chops
  const outNode = ctx.createGain();
  const panner = ctx.createStereoPanner();
  outNode.connect(panner);
  panner.connect(out);
  if (bus && bus.registerTap)
    bus.registerTap(label, outNode);
  if (bus)
    bus.register(label);
  el.addEventListener('input', () => {
    panner.pan.value = k.pan.value;
    draw();
  });
  let buffer = null;
  let fileName = null;
  let loadTok = 0;
  let cur = null;
  let flashSlice = -1;
  const draw = () => {
    const w = cv.width;
    const h = cv.height;
    const g2 = cv.getContext('2d');
    g2.fillStyle = '#141b1e';
    g2.fillRect(0, 0, w, h);
    if (!buffer) {
      g2.fillStyle = '#546e7a';
      g2.font = '10px sans-serif';
      g2.fillText('drop / \ud83d\udcc2 a breakbeat', 8, h / 2 + 3);
      return;
    }
    const d = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(d.length / w));
    g2.strokeStyle = '#3ddc84';
    g2.beginPath();
    for (let x = 0; x < w; x++) {
      let mn = 1;
      let mx = -1;
      for (let i = x * step, e = Math.min(d.length, i + step); i < e; i++) {
        const v = d[i];
        if (v < mn)
          mn = v;
        if (v > mx)
          mx = v;
      }
      g2.moveTo(x + 0.5, h / 2 + mn * (h / 2 - 1));
      g2.lineTo(x + 0.5, h / 2 + mx * (h / 2 - 1));
    }
    g2.stroke();
    const n = Math.max(2, Math.round(k.slices.value));
    for (let i = 0; i < n; i++) {
      const x = i / n * w;
      if (i) {
        g2.strokeStyle = 'rgba(236,239,241,0.35)';
        g2.beginPath();
        g2.moveTo(x + 0.5, 0);
        g2.lineTo(x + 0.5, h);
        g2.stroke();
      }
      if (i === flashSlice) {
        g2.fillStyle = 'rgba(61,220,132,0.25)';
        g2.fillRect(x, 0, w / n, h);
      }
      g2.fillStyle = '#90a4ae';
      g2.font = '7px monospace';
      g2.fillText(NN(k.base.value + i), x + 2, 8);
    }
  };
  let fade = null;
  const flash = i => {
    flashSlice = i;
    draw();
    led.style.background = '#3ddc84';
    window.clearTimeout(fade);
    fade = window.setTimeout(() => {
      flashSlice = -1;
      led.style.background = '#37474f';
      draw();
    }, 120);
  };
  const play = (slice, vel = 100, t = null) => {
    if (!buffer)
      return;
    const n = Math.max(2, Math.round(k.slices.value));
    if (slice < 0 || slice >= n)
      return;
    ctx.resume();
    const tt = t ?? ctx.currentTime + 0.003;
    // mono choke: each chop cuts the last, like classic hardware slicing
    if (cur) {
      cur.g.gain.setTargetAtTime(0.0001, tt, 0.004);
      try {
        cur.s.stop(tt + 0.05);
      } catch (err) {}
    }
    const dur = buffer.duration / n;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = k.rate.value;
    const g = ctx.createGain();
    g.gain.value = k.gain.value * Math.max(0.05, vel / 127);
    s.connect(g);
    g.connect(outNode);
    s.start(tt, slice * dur, dur);
    cur = { s, g };
    s.onended = () => {
      g.disconnect();
      if (cur && cur.s === s)
        cur = null;
    };
    flash(slice);
  };
  const loadFile = async n => {
    const tok = ++loadTok;
    try {
      const buf = await sampleStore.load(n);
      if (tok !== loadTok)
        return;
      buffer = buf;
      fileName = n;
      fileLab.textContent = n;
      draw();
    } catch (err) {
      if (tok === loadTok) {
        fileLab.textContent = n + ' ?';
        console.warn('daw: slicer load failed', n, err);
      }
    }
  };
  const upload = async f => {
    if (!f)
      return;
    try {
      const buf = await sampleStore.register(f);
      loadTok++;
      buffer = buf;
      fileName = f.name;
      fileLab.textContent = f.name;
      draw();
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    } catch (err) {
      console.warn('daw: slicer upload failed', err);
    }
  };
  file.addEventListener('change', e => {
    e.stopPropagation();
    upload(file.files[0]);
    file.value = '';
  });
  cv.addEventListener('dragover', e => e.preventDefault());
  cv.addEventListener('drop', e => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  });
  cv.addEventListener('pointerdown', e => {
    if (!buffer)
      return;
    const n = Math.max(2, Math.round(k.slices.value));
    const slice = Math.floor(e.offsetX / cv.getBoundingClientRect().width * n);
    const t = ctx.currentTime + 0.003;
    play(slice, 110, t);
    if (bus) {
      bus.publish(label, [144, (k.base.value + slice) & 127, 110], t);
      bus.publish(label, [128, (k.base.value + slice) & 127, 0], t + 0.15);
    }
  });
  const onBus = e => {
    if (e.detail.source === label || !selected.has(e.detail.source))
      return;
    const [st, d1, d2] = e.detail.data;
    if ((st & 240) !== 144 || d2 === 0)
      return;
    play(d1 - k.base.value, d2, e.detail.time ?? null);
  };
  if (bus)
    bus.addEventListener('midi', onBus);
  if (invalidation)
    invalidation.then(() => {
      if (bus)
        bus.removeEventListener('midi', onBus);
      outNode.disconnect();
    });
  draw();
  Object.defineProperty(el, 'value', {
    get: () => ({
      file: fileName,
      ...Object.fromEntries(Object.entries(k).map(([n, e]) => [n, e.value])),
      inputs: picker.value
    }),
    set: p => {
      if (!p)
        return;
      for (const [n, e] of Object.entries(k))
        if (typeof p[n] === 'number')
          e.value = p[n];
      panner.pan.value = k.pan.value;
      if (Array.isArray(p.inputs))
        picker.value = p.inputs;
      if (p.file && p.file !== fileName)
        loadFile(p.file);
      draw();
    }
  });
  return el;
}
)};
const _sl1v = function _slicer1(sticky,mkSlicer,daw_ctx,drumBus,midiBus,invalidation){return(
sticky(mkSlicer(daw_ctx, drumBus, {
  label: 'slicer1',
  bus: midiBus,
  invalidation
}), {"base":60,"slices":8,"rate":1,"gain":1,"pan":0,"inputs":[]})
)};
const _sl1g = (G, _) => G.input(_);
const _tsl1v = function _template_slicer(sticky,mkSlicer,daw_ctx,master,midiBus,invalidation){return(
sticky(mkSlicer(daw_ctx, master, {
  label: 'template_slicer',
  bus: midiBus,
  invalidation
}), {"base":60,"slices":8,"rate":1,"gain":1,"pan":0,"inputs":[]})
)};
const _tsl1g = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  const fileAttachments = new Map(["kick.wav","snare.wav","hihat.wav"].map((name) => {
    const module_name = "@tomlarkworthy/daw";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    if (status !== 200) return [name, undefined];
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    return [name, {url: blob_url, mimeType: mime}];
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/grid-container", async () => runtime.module((await import("/@tomlarkworthy/grid-container.js?v=4")).default));  
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));
  $def("_14bo005", null, ["md"], _14bo005);  
  $def("_uafule", "station", ["gridContainer","runtime","invalidation","dawModule"], _uafule);  
  $def("_hn2uu3", "title", ["md"], _hn2uu3);  
  $def("_18x0rsh", "viewof dawModule", ["thisModule"], _18x0rsh);  
  $def("_1kmg14a", "dawModule", ["Generators","viewof dawModule"], _1kmg14a);  
  $def("_19o1i4f", "daw_ctx", [], _19o1i4f);  
  $def("_1qz528a", "master", ["daw_ctx","midiBus"], _1qz528a);
  $def("_1cxip4o", "viewof masterVol", ["sticky","Inputs"], _1cxip4o);  
  $def("_12egs9p", "masterVol", ["Generators","viewof masterVol"], _12egs9p);  
  $def("_1r939zp", "masterVolBind", ["master","masterVol"], _1r939zp);  
  $def("_1bzzngz", "analyser", ["daw_ctx","master"], _1bzzngz);  
  $def("_mksc6", "mkScope", [], _mksc6);
  $def("_scp1v", "viewof scope", ["sticky","mkScope","daw_ctx","midiBus","invalidation"], _scp1v);
  $def("_scp1g", "scope", ["Generators","viewof scope"], _scp1g);
  $def("_tsc1v", "viewof template_scope", ["sticky","mkScope","daw_ctx","midiBus","invalidation"], _tsc1v);
  $def("_tsc1g", "template_scope", ["Generators","viewof template_scope"], _tsc1g);
  $def("_1efbfap", "viewof bpm", ["sticky","Inputs"], _1efbfap);  
  $def("_w2pv3n", "bpm", ["Generators","viewof bpm"], _w2pv3n);
  $def("_swg1v", "viewof swing", ["sticky","Inputs"], _swg1v);
  $def("_swg1g", "swing", ["Generators","viewof swing"], _swg1g);  
  $def("_ae8ir", "viewof playing", ["Inputs"], _ae8ir);  
  $def("_1vfroho", "playing", ["Generators","viewof playing"], _1vfroho);  
  $def("_s71xha", "stepGrid", ["Event"], _s71xha);
  $def("_14j1vyd", "viewof pattern", ["sticky","mkSeq","viewof clock","midiBus","invalidation"], _14j1vyd);
  $def("_7a7f2w", "pattern", ["Generators","viewof pattern"], _7a7f2w);
  $def("_dbus1", "drumBus", ["daw_ctx","master","midiBus"], _dbus1);
  $def("_1n3qz47", "viewof bassCutoff", ["sticky","Inputs"], _1n3qz47);  
  $def("_1hifuoy", "bassCutoff", ["Generators","viewof bassCutoff"], _1hifuoy);  
  $def("_tsq2pi", "viewof bassDecay", ["sticky","Inputs"], _tsq2pi);  
  $def("_cecwt5", "bassDecay", ["Generators","viewof bassDecay"], _cecwt5);  
  $def("_7zke3z", "bass_voice", ["viewof bassCutoff","viewof bassDecay","daw_ctx","master"], _7zke3z);
  $def("_1mtgc1q", "viewof template_knob", ["sticky","Inputs"], _1mtgc1q);  
  $def("_9ywdi1", "template_knob", ["Generators","viewof template_knob"], _9ywdi1);  
  $def("_1tgfsqb", "extending", ["md"], _1tgfsqb);  
  $def("_dwctrl", "controls", ["gridControls"], _dwctrl);
  $def("_knb4x2", "knob", [], _knb4x2);
  $def("_kys9m1", "keys", [], _kys9m1);
  $def("_mdn3q7", "midiIn", [], _mdn3q7);
  $def("_bus1a2", "midiBus", [], _bus1a2);
  $def("_mkpk5", "mkInputPicker", [], _mkpk5);
  $def("_msy5k4", "mkSynth", ["knob","mkInputPicker"], _msy5k4);
  $def("_mkclk7", "mkClock", [], _mkclk7);
  $def("_mkseq3", "mkSeq", ["stepGrid"], _mkseq3);
  $def("_mkkit9", "mkKit", ["mkInputPicker"], _mkkit9);
  $def("_mkchd2", "mkChord", ["mkInputPicker"], _mkchd2);
  $def("_ky1v6r", "viewof keys1", ["keys","midiBus"], _ky1v6r);
  $def("_ky1g3s", "keys1", ["Generators","viewof keys1"], _ky1g3s);
  $def("_md1v5t", "viewof midi1", ["midiIn","midiBus"], _md1v5t);
  $def("_md1g7u", "midi1", ["Generators","viewof midi1"], _md1g7u);
  $def("_clk1v4", "viewof clock", ["mkClock","daw_ctx","viewof playing","viewof bpm","viewof swing","invalidation"], _clk1v4);
  $def("_clk1g5", "clock", ["Generators","viewof clock"], _clk1g5);
  $def("_kit1v2", "viewof kit1", ["sticky","mkKit","daw_ctx","midiBus","bass_voice","invalidation"], _kit1v2);
  $def("_kit1g8", "kit1", ["Generators","viewof kit1"], _kit1g8);
  $def("_sq2v6a", "viewof synthSeq", ["sticky","mkSeq","viewof clock","midiBus","invalidation"], _sq2v6a);
  $def("_sq2g7b", "synthSeq", ["Generators","viewof synthSeq"], _sq2g7b);
  $def("_chd1v", "viewof chord1", ["sticky","mkChord","midiBus","invalidation"], _chd1v);
  $def("_chd1g", "chord1", ["Generators","viewof chord1"], _chd1g);
  $def("_sy1v8e", "viewof synth1", ["sticky","mkSynth","daw_ctx","master","midiBus","invalidation"], _sy1v8e);
  $def("_sy1g2h", "synth1", ["Generators","viewof synth1"], _sy1g2h);
  $def("_tk1v9", "viewof template_keys", ["keys","midiBus"], _tk1v9);
  $def("_tk1g0", "template_keys", ["Generators","viewof template_keys"], _tk1g0);
  $def("_tsy1v", "viewof template_synth", ["sticky","mkSynth","daw_ctx","master","midiBus","invalidation"], _tsy1v);
  $def("_tsy1g", "template_synth", ["Generators","viewof template_synth"], _tsy1g);
  $def("_tsq1v", "viewof template_seq", ["sticky","mkSeq","viewof clock","midiBus","invalidation"], _tsq1v);
  $def("_tsq1g", "template_seq", ["Generators","viewof template_seq"], _tsq1g);
  $def("_mkarr5", "mkArranger", ["mkInputPicker"], _mkarr5);
  $def("_sng1v", "viewof song", ["sticky","mkArranger","runtime","viewof clock","invalidation"], _sng1v);
  $def("_sng1g", "song", ["Generators","viewof song"], _sng1g);
  $def("_sy2v1", "viewof synth2", ["sticky","mkSynth","daw_ctx","master","midiBus","invalidation"], _sy2v1);
  $def("_sy2g1", "synth2", ["Generators","viewof synth2"], _sy2g1);
  $def("_ky2v1", "viewof keys2", ["keys","midiBus"], _ky2v1);
  $def("_ky2g1", "keys2", ["Generators","viewof keys2"], _ky2g1);
  $def("_sq3v1", "viewof seq1", ["sticky","mkSeq","viewof clock","midiBus","invalidation"], _sq3v1);
  $def("_sq3g1", "seq1", ["Generators","viewof seq1"], _sq3g1);
  $def("_csq1v", "viewof chordSeq", ["sticky","mkSeq","viewof clock","midiBus","invalidation"], _csq1v);
  $def("_csq1g", "chordSeq", ["Generators","viewof chordSeq"], _csq1g);
  $def("_smpst1", "sampleStore", ["FileAttachment","getFileAttachmentsMap","daw_ctx"], _smpst1);
  $def("_mksmp1", "mkSampler", ["knob","mkInputPicker","sampleStore"], _mksmp1);
  $def("_smpk1v", "viewof kick1", ["sticky","mkSampler","daw_ctx","drumBus","midiBus","invalidation"], _smpk1v);
  $def("_smpk1g", "kick1", ["Generators","viewof kick1"], _smpk1g);
  $def("_smps1v", "viewof snare1", ["sticky","mkSampler","daw_ctx","drumBus","midiBus","invalidation"], _smps1v);
  $def("_smps1g", "snare1", ["Generators","viewof snare1"], _smps1g);
  $def("_smph1v", "viewof hat1", ["sticky","mkSampler","daw_ctx","drumBus","midiBus","invalidation"], _smph1v);
  $def("_smph1g", "hat1", ["Generators","viewof hat1"], _smph1g);
  $def("_tsmp1v", "viewof template_sampler", ["sticky","mkSampler","daw_ctx","master","midiBus","invalidation"], _tsmp1v);
  $def("_tsmp1g", "template_sampler", ["Generators","viewof template_sampler"], _tsmp1g);
  $def("_mkpd1", "mkPads", ["knob","mkInputPicker","sampleStore"], _mkpd1);
  $def("_pd1v", "viewof pads1", ["sticky","mkPads","daw_ctx","drumBus","midiBus","invalidation"], _pd1v);
  $def("_pd1g", "pads1", ["Generators","viewof pads1"], _pd1g);
  $def("_tpd1v", "viewof template_pads", ["sticky","mkPads","daw_ctx","master","midiBus","invalidation"], _tpd1v);
  $def("_tpd1g", "template_pads", ["Generators","viewof template_pads"], _tpd1g);
  $def("_mkdr1", "mkDrum", ["knob","mkInputPicker"], _mkdr1);
  $def("_dr1v", "viewof drum1", ["sticky","mkDrum","daw_ctx","drumBus","midiBus","invalidation"], _dr1v);
  $def("_dr1g", "drum1", ["Generators","viewof drum1"], _dr1g);
  $def("_tdr1v", "viewof template_drum", ["sticky","mkDrum","daw_ctx","master","midiBus","invalidation"], _tdr1v);
  $def("_tdr1g", "template_drum", ["Generators","viewof template_drum"], _tdr1g);
  $def("_mkec1", "mkEcho", ["knob"], _mkec1);
  $def("_mkvb1", "mkVerb", ["knob"], _mkvb1);
  $def("_mkdk1", "mkDucker", ["knob","mkInputPicker"], _mkdk1);
  $def("_ec1v", "viewof echo1", ["sticky","mkEcho","daw_ctx","master","midiBus","invalidation"], _ec1v);
  $def("_ec1g", "echo1", ["Generators","viewof echo1"], _ec1g);
  $def("_vb1v", "viewof verb1", ["sticky","mkVerb","daw_ctx","master","midiBus","invalidation"], _vb1v);
  $def("_vb1g", "verb1", ["Generators","viewof verb1"], _vb1g);
  $def("_dk1v", "viewof duck1", ["sticky","mkDucker","daw_ctx","midiBus","invalidation"], _dk1v);
  $def("_dk1g", "duck1", ["Generators","viewof duck1"], _dk1g);
  $def("_tec1v", "viewof template_echo", ["sticky","mkEcho","daw_ctx","master","midiBus","invalidation"], _tec1v);
  $def("_tec1g", "template_echo", ["Generators","viewof template_echo"], _tec1g);
  $def("_tvb1v", "viewof template_verb", ["sticky","mkVerb","daw_ctx","master","midiBus","invalidation"], _tvb1v);
  $def("_tvb1g", "template_verb", ["Generators","viewof template_verb"], _tvb1g);
  $def("_tdk1v", "viewof template_duck", ["sticky","mkDucker","daw_ctx","midiBus","invalidation"], _tdk1v);
  $def("_tdk1g", "template_duck", ["Generators","viewof template_duck"], _tdk1g);
  $def("_mksl1", "mkSlicer", ["knob","mkInputPicker","sampleStore"], _mksl1);
  $def("_sl1v", "viewof slicer1", ["sticky","mkSlicer","daw_ctx","drumBus","midiBus","invalidation"], _sl1v);
  $def("_sl1g", "slicer1", ["Generators","viewof slicer1"], _sl1g);
  $def("_tsl1v", "viewof template_slicer", ["sticky","mkSlicer","daw_ctx","master","midiBus","invalidation"], _tsl1v);
  $def("_tsl1g", "template_slicer", ["Generators","viewof template_slicer"], _tsl1g);
  main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
  main.define("gridControls", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridControls", _));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("getFileAttachmentsMap", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachmentsMap", _));
  return main;
}