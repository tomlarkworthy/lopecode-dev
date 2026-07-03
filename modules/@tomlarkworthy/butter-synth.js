const _intro = function intro(md){return(
md`# 🎹 Buttery Smooth Synth Pad Station
<style>
.synth-app *{box-sizing:border-box;margin:0;padding:0}
.synth-app{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(145deg,#0a0b1e,#0d0e28,#0a0b1e);color:#e2e8f0;padding:24px;border-radius:20px;max-width:900px}
.synth-section{margin-bottom:20px}
.synth-section-title{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin-bottom:10px;font-weight:600}
.seq-grid{display:grid;grid-template-columns:50px repeat(16,1fr);gap:3px;align-items:center}
.seq-label{font-size:10px;color:#94a3b8;text-align:right;padding-right:8px;white-space:nowrap}
.seq-cell{aspect-ratio:1;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:all .08s;min-width:14px}
.seq-cell:hover{background:rgba(255,255,255,0.08)}
.seq-cell.active{border-color:var(--drum-color,#ff6b9d);background:var(--drum-color,#ff6b9d);opacity:.8}
.seq-cell.current{box-shadow:0 0 8px rgba(255,255,255,0.3)}
.chord-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.chord-pad{padding:14px 6px;border-radius:12px;border:2px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);color:#e2e8f0;cursor:pointer;text-align:center;font-weight:600;font-size:13px;transition:all .15s;user-select:none;-webkit-user-select:none}
.chord-pad:hover{background:rgba(255,255,255,0.08);transform:translateY(-2px)}
.chord-pad.active{transform:scale(0.96);border-color:var(--pad-color,#a855f7);box-shadow:0 0 25px rgba(168,85,247,0.25);background:rgba(168,85,247,0.12)}
.chord-pad .cn{display:block}.chord-pad .ci{display:block;font-size:9px;opacity:.5;margin-top:3px;font-weight:400}
.piano{display:flex;position:relative;height:90px;margin-top:8px;border-radius:0 0 8px 8px;overflow:hidden}
.pw{flex:1;background:linear-gradient(180deg,#f8f9fa,#e2e8f0);border:1px solid #94a3b8;border-radius:0 0 5px 5px;cursor:pointer;transition:all .05s;position:relative;z-index:1}
.pw:hover{background:linear-gradient(180deg,#e2e8f0,#cbd5e1)}
.pw:active,.pw.on{background:linear-gradient(180deg,#a78bfa,#7c3aed)}
.pb{width:55%;height:58%;background:linear-gradient(180deg,#1e1b4b,#0f0e2a);border:1px solid #312e81;border-radius:0 0 4px 4px;cursor:pointer;position:absolute;z-index:2;transition:all .05s}
.pb:hover{background:linear-gradient(180deg,#312e81,#1e1b4b)}
.pb:active,.pb.on{background:linear-gradient(180deg,#6d28d9,#4c1d95)}
.fx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px}
.fx-control{display:flex;flex-direction:column;gap:3px}
.fx-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b}
.fx-slider{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,0.08);outline:none;cursor:pointer}
.synth-app .fx-control input.fx-slider{width:100% !important;max-width:100%;min-width:0}
.fx-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#a855f7;cursor:pointer;box-shadow:0 0 8px rgba(168,85,247,0.3)}
.fx-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#a855f7;cursor:pointer;border:none}
.fx-val{font-size:10px;color:#a78bfa;font-variant-numeric:tabular-nums;text-align:right}
.transport{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.tbtn{padding:7px 16px;border-radius:8px;border:2px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:#e2e8f0;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s}
.tbtn:hover{background:rgba(255,255,255,0.08)}.tbtn.on{border-color:#4ecdc4;color:#4ecdc4;box-shadow:0 0 12px rgba(78,205,196,0.2)}
.bpm{font-size:18px;font-weight:700;color:#f59e0b;font-variant-numeric:tabular-nums}
.synth-select{background:rgba(255,255,255,0.06);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer}
</style>

A complete jamming station — drum machine, lush chord pads, piano keyboard, and full effects chain. All sounds synthesized in real-time.

> 🎵 Hit **▶ Play** on the sequencer, click chord pads to jam, and tweak effects to shape your sound.`
)};
const _ctx = function ctx(){return(
new (window.AudioContext || window.webkitAudioContext)()
)};
const _resumeCtx = async function* resumeCtx(ctx, html){
  if (ctx.state === 'suspended') {
    const btn = html`<button style="display:block;margin:16px auto;padding:18px 36px;border-radius:16px;background:linear-gradient(135deg,#1a1b3d,#0a0b1e);color:#e2e8f0;border:2px solid #a855f7;font-size:20px;cursor:pointer;box-shadow:0 0 40px rgba(168,85,247,0.3);font-family:-apple-system,sans-serif">🎹 Click to Start Synth</button>`;
    const clicked = new Promise(r => btn.onclick = r);
    yield btn;
    await clicked;
    await ctx.resume();
  }
  yield 'ready';
};
const _noiseBuffer = function noiseBuffer(ctx){
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
};
const _effects = function effects(ctx){
  const makeIR = (dur, decay) => {
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  };
  const input = ctx.createGain();
  const sat = ctx.createWaveShaper();
  const crv = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    crv[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
  }
  sat.curve = crv;
  sat.oversample = '2x';
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 14000;
  filt.Q.value = 0.7;
  const revSend = ctx.createGain();
  revSend.gain.value = 0.3;
  const conv = ctx.createConvolver();
  conv.buffer = makeIR(3.5, 1.8);
  const dlySend = ctx.createGain();
  dlySend.gain.value = 0.15;
  const dly = ctx.createDelay(2);
  dly.delayTime.value = 0.33;
  const dlyFb = ctx.createGain();
  dlyFb.gain.value = 0.25;
  const dlyWet = ctx.createGain();
  dlyWet.gain.value = 0.4;
  const mix = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = 0.65;
  // Routing
  input.connect(sat);
  sat.connect(filt);
  filt.connect(mix); // dry
  filt.connect(revSend);
  revSend.connect(conv);
  conv.connect(mix); // reverb return
  filt.connect(dlySend);
  dlySend.connect(dly);
  dly.connect(dlyWet);
  dlyWet.connect(mix); // delay return
  dly.connect(dlyFb);
  dlyFb.connect(dly); // feedback loop
  mix.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);
  return {
    input, filt, revSend, conv, dlySend, dly, dlyFb, dlyWet, mix, comp, master,
    params: {
      volume: 0.65, reverb: 0.3, delayMix: 0.15, delayTime: 0.33, delayFb: 0.25,
      cutoff: 14000, resonance: 0.7, attack: 0.4, release: 1.8, detune: 6, voices: 4,
      waveform: 'triangle'
    }
  };
};
const _engine = function engine(ctx, effects, noiseBuffer){
  function mtf(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function playNote(midi, dur) {
    if (dur === undefined) dur = 2;
    const p = effects.params;
    const now = ctx.currentTime;
    const freq = mtf(midi);
    const v = p.voices;
    const stopFns = [];
    for (let i = 0; i < v; i++) {
      const osc = ctx.createOscillator();
      osc.type = p.waveform;
      osc.frequency.value = freq;
      osc.detune.value = ((i - (v - 1) / 2) * p.detune) + (Math.random() - 0.5) * 2;
      const eg = ctx.createGain();
      const peak = 0.12 / v;
      eg.gain.setValueAtTime(0, now);
      eg.gain.linearRampToValueAtTime(peak, now + p.attack);
      eg.gain.setValueAtTime(peak * 0.85, now + p.attack + 0.05);
      eg.gain.setValueAtTime(peak * 0.85, now + dur);
      eg.gain.linearRampToValueAtTime(0.0001, now + dur + p.release);
      osc.connect(eg);
      eg.connect(effects.input);
      osc.start(now);
      osc.stop(now + dur + p.release + 0.1);
      stopFns.push(function() {
        const t = ctx.currentTime;
        eg.gain.cancelScheduledValues(t);
        eg.gain.setValueAtTime(eg.gain.value, t);
        eg.gain.linearRampToValueAtTime(0.0001, t + p.release * 0.5);
        osc.stop(t + p.release * 0.5 + 0.05);
      });
    }
    return function stop() { stopFns.forEach(function(fn) { fn(); }); };
  }

  function playChord(midis, dur) {
    const stops = midis.map(function(m) { return playNote(m, dur); });
    return function stop() { stops.forEach(function(fn) { fn(); }); };
  }

  function playDrum(type, time) {
    const t = time || ctx.currentTime;
    const dest = effects.input;
    if (type === 'kick') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.1);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
      const cl = ctx.createOscillator(); const cg = ctx.createGain();
      cl.frequency.setValueAtTime(800, t);
      cl.frequency.exponentialRampToValueAtTime(100, t + 0.015);
      cg.gain.setValueAtTime(0.4, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
      cl.connect(hp); hp.connect(cg); cg.connect(dest); cl.start(t); cl.stop(t + 0.05);
    } else if (type === 'snare') {
      const nl = ctx.sampleRate * 0.15;
      const nb = ctx.createBuffer(1, nl, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4500; bp.Q.value = 1;
      ns.connect(bp); bp.connect(ng); ng.connect(dest); ns.start(t); ns.stop(t + 0.2);
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(100, t + 0.04);
      og.gain.setValueAtTime(0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.1);
    } else if (type === 'chh') {
      const nl = ctx.sampleRate * 0.05;
      const nb = ctx.createBuffer(1, nl, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      ns.connect(hp); hp.connect(g); g.connect(dest); ns.start(t); ns.stop(t + 0.08);
    } else if (type === 'ohh') {
      const nl = ctx.sampleRate * 0.25;
      const nb = ctx.createBuffer(1, nl, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      ns.connect(hp); hp.connect(g); g.connect(dest); ns.start(t); ns.stop(t + 0.3);
    } else if (type === 'clap') {
      const nl = ctx.sampleRate * 0.12;
      const nb = ctx.createBuffer(1, nl, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      for (let j = 0; j < 3; j++) {
        g.gain.setValueAtTime(0.4, t + j * 0.012);
        g.gain.setValueAtTime(0, t + j * 0.012 + 0.006);
      }
      g.gain.setValueAtTime(0.5, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      ns.connect(bp); bp.connect(g); g.connect(dest); ns.start(t); ns.stop(t + 0.15);
    } else if (type === 'tomLo') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.setValueAtTime(100, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35);
    } else if (type === 'tomHi') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3);
    } else if (type === 'rim') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(800, t);
      o.frequency.exponentialRampToValueAtTime(400, t + 0.02);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.06);
    }
  }

  return { playNote, playChord, playDrum, mtf };
};
const _chords = function chords(){
  // Key of C: diatonic triads (I ii iii IV V vi), diatonic sevenths, then borrowed chords.
  return {
    'C':      [60, 64, 67],
    'Dm':     [50, 53, 57],
    'Em':     [52, 55, 59],
    'F':      [53, 57, 60],
    'G':      [55, 59, 62],
    'Am':     [57, 60, 64],
    'Cmaj7':  [60, 64, 67, 71],
    'Dm7':    [50, 53, 57, 60],
    'Em7':    [52, 55, 59, 62],
    'Fmaj7':  [53, 57, 60, 64],
    'G7':     [55, 59, 62, 65],
    'Am7':    [57, 60, 64, 67],
    'Bm7b5':  [59, 62, 65, 69],
    'Cm':     [60, 63, 67],
    'Fm':     [53, 56, 60],
    'Bb':     [58, 62, 65],
    'Ab':     [56, 60, 63]
  };
};
const _drumUI = function drumUI(engine, effects, ctx, html){
  var TYPES = ['kick','snare','chh','ohh','clap','tomLo','tomHi','rim'];
  var LABELS = ['Kick','Snare','CH HH','OH HH','Clap','Tom L','Tom H','Rim'];
  var COLORS = ['#ff6b9d','#ff9f43','#feca57','#48dbfb','#ff6b81','#a29bfe','#6c5ce7','#00d2d3'];
  var grid = Array.from({length:8}, function(){ return Array(16).fill(false); });
  // Default beat
  grid[0][0]=true; grid[0][8]=true; // kick
  grid[1][4]=true; grid[1][12]=true; // snare
  for(var i=0;i<16;i+=2) grid[2][i]=true; // chh
  grid[3][14]=true; // ohh
  grid[7][10]=true; // rim

  var cells = [];
  var container = document.createElement('div');
  container.className = 'synth-section';
  container.innerHTML = '<div class="synth-section-title">🥁 Drum Machine</div>' +
    '<div class="transport">' +
    '<button class="tbtn" data-action="play">▶ Play</button>' +
    '<button class="tbtn" data-action="stop">■ Stop</button>' +
    '<button class="tbtn" data-action="clear">✕ Clear</button>' +
    '<span class="bpm" data-el="bpm">120</span>' +
    '<span style="font-size:10px;color:#64748b">BPM</span>' +
    '<input type="range" class="fx-slider" min="60" max="200" value="120" step="1" style="width:100px" data-ctl="bpm">' +
    '</div><div class="seq-grid" data-el="grid"></div>';

  var gridEl = container.querySelector('[data-el="grid"]');
  // Column headers
  var blank = document.createElement('div');
  gridEl.appendChild(blank);
  for (var s = 0; s < 16; s++) {
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:8px;color:#475569;text-align:center';
    hdr.textContent = s % 4 === 0 ? String(s / 4 + 1) : '\u00b7';
    gridEl.appendChild(hdr);
  }
  for (var r = 0; r < 8; r++) {
    var lbl = document.createElement('div');
    lbl.className = 'seq-label';
    lbl.textContent = LABELS[r];
    gridEl.appendChild(lbl);
    var rowCells = [];
    for (var ss = 0; ss < 16; ss++) {
      var c = document.createElement('div');
      c.className = 'seq-cell';
      c.style.setProperty('--drum-color', COLORS[r]);
      if (grid[r][ss]) c.classList.add('active');
      (function(rr, sss, cell) {
        cell.onclick = function() {
          grid[rr][sss] = !grid[rr][sss];
          cell.classList.toggle('active', grid[rr][sss]);
        };
      })(r, ss, c);
      gridEl.appendChild(c);
      rowCells.push(c);
    }
    cells.push(rowCells);
  }

  var playing = false, step = -1, rafId = null;
  var bpmSlider = container.querySelector('[data-ctl="bpm"]');
  var bpmDisp = container.querySelector('[data-el="bpm"]');
  var bpm = 120;

  bpmSlider.oninput = function() { bpm = +bpmSlider.value; bpmDisp.textContent = bpm; };

  var playBtn = container.querySelector('[data-action="play"]');
  var stopBtn = container.querySelector('[data-action="stop"]');
  var clearBtn = container.querySelector('[data-action="clear"]');

  playBtn.onclick = function() {
    if (playing) return;
    playing = true; playBtn.classList.add('on');
    var nextTime = ctx.currentTime;
    step = -1;
    var tick = function() {
      if (!playing) return;
      var stepLen = 60 / bpm / 4;
      while (nextTime < ctx.currentTime + 0.1) {
        step = (step + 1) % 16;
        cells.forEach(function(row) {
          row.forEach(function(ci, idx) { ci.classList.toggle('current', idx === step); });
        });
        for (var rr = 0; rr < 8; rr++) {
          if (grid[rr][step]) engine.playDrum(TYPES[rr], nextTime);
        }
        nextTime += stepLen;
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();
  };
  stopBtn.onclick = function() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    playBtn.classList.remove('on');
    step = -1;
    cells.forEach(function(row) { row.forEach(function(c) { c.classList.remove('current'); }); });
  };
  clearBtn.onclick = function() {
    grid.forEach(function(row) { row.fill(false); });
    cells.forEach(function(row) { row.forEach(function(c) { c.classList.remove('active'); }); });
  };

  return container;
};
const _chordPadUI = function chordPadUI(engine, chords, html){
  var COLORS_MAP = {
    'maj7': '#f59e0b', 'm7': '#6366f1', 'maj': '#f59e0b', 'min': '#8b5cf6', 'dom7': '#06b6d4'
  };
  function chordColor(name) {
    if (name.indexOf('maj7') >= 0) return COLORS_MAP.maj7;
    if (name.indexOf('m7') >= 0) return COLORS_MAP.m7;
    if (name.indexOf('7') >= 0) return COLORS_MAP.dom7;
    if (name.indexOf('m') >= 0) return COLORS_MAP.min;
    return COLORS_MAP.maj;
  }
  var NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var names = Object.keys(chords);
  var container = document.createElement('div');
  container.className = 'synth-section';
  container.innerHTML = '<div class="synth-section-title">🎵 Chord Pads <span style="font-size:9px;color:#475569;margin-left:8px">key of C · triads, sevenths, borrowed · hold to sustain</span></div>';
  var gridEl = document.createElement('div');
  gridEl.className = 'chord-grid';
  names.forEach(function(name) {
    var col = chordColor(name);
    var notes = chords[name];
    var noteNames = notes.map(function(m) { return NOTE_NAMES[m % 12]; }).join(' ');
    var pad = document.createElement('div');
    pad.className = 'chord-pad';
    pad.style.setProperty('--pad-color', col);
    pad.style.borderColor = col + '33';
    pad.innerHTML = '<span class="cn">' + name + '</span><span class="ci">' + noteNames + '</span>';
    var activeStop = null;
    pad.onmousedown = function(e) {
      e.preventDefault();
      pad.classList.add('active');
      activeStop = engine.playChord(notes, 30);
    };
    pad.onmouseup = pad.onmouseleave = function() {
      pad.classList.remove('active');
      if (activeStop) { activeStop(); activeStop = null; }
    };
    gridEl.appendChild(pad);
  });
  container.appendChild(gridEl);
  return container;
};
const _pianoUI = function pianoUI(engine, html){
  var OCTAVE_START = 4;
  var OCTAVES = 2;
  function isBlack(n) { return [1,3,6,8,10].indexOf(n % 12) >= 0; }
  var container = document.createElement('div');
  container.className = 'synth-section';
  container.innerHTML = '<div class="synth-section-title">🎹 Keyboard <span style="font-size:9px;color:#475569;margin-left:8px">click keys to play</span></div>';
  var piano = document.createElement('div');
  piano.className = 'piano';

  var whiteIndex = 0;
  var keyData = [];
  for (var o = OCTAVE_START; o < OCTAVE_START + OCTAVES; o++) {
    for (var n = 0; n < 12; n++) {
      var midi = (o + 1) * 12 + n;
      var black = isBlack(n);
      keyData.push({ midi: midi, black: black });
      if (!black) whiteIndex++;
    }
  }
  var totalWhite = whiteIndex;
  whiteIndex = 0;
  var blackKeys = [];
  keyData.forEach(function(kd) {
    if (kd.black) {
      var key = document.createElement('div');
      key.className = 'pb';
      key.dataset.midi = kd.midi;
      key.style.left = 'calc(' + ((whiteIndex - 0.3) / totalWhite * 100) + '%)';
      key.style.width = 'calc(' + (0.6 / totalWhite * 100) + '%)';
      blackKeys.push(key);
    } else {
      var key2 = document.createElement('div');
      key2.className = 'pw';
      key2.dataset.midi = kd.midi;
      piano.appendChild(key2);
      whiteIndex++;
    }
  });
  blackKeys.forEach(function(k) { piano.appendChild(k); });

  var allKeys = piano.querySelectorAll('.pw,.pb');
  allKeys.forEach(function(key) {
    var m = +key.dataset.midi;
    var stopFn = null;
    key.onmousedown = function(e) {
      e.preventDefault();
      key.classList.add('on');
      stopFn = engine.playNote(m, 30);
    };
    key.onmouseup = key.onmouseleave = function() {
      key.classList.remove('on');
      if (stopFn) { stopFn(); stopFn = null; }
    };
  });
  container.appendChild(piano);
  return container;
};
const _effectsUI = function effectsUI(effects, html){
  var sliders = [
    ['volume', '🔊 Volume', 0, 1, 0.01],
    ['reverb', '🌊 Reverb', 0, 1, 0.01],
    ['delayMix', '💧 Delay', 0, 1, 0.01],
    ['delayTime', '⏱ Delay Time', 0.05, 1, 0.01],
    ['delayFb', '🔁 Feedback', 0, 0.6, 0.01],
    ['cutoff', '🎛 Cutoff', 100, 20000, 1],
    ['resonance', '⚡ Resonance', 0, 10, 0.1],
    ['attack', '⬆ Attack', 0.005, 3, 0.005],
    ['release', '⬇ Release', 0.05, 5, 0.05],
    ['detune', '🎶 Spread', 0, 20, 0.5],
    ['voices', '👥 Voices', 1, 8, 1]
  ];
  var waveformOptions = ['triangle', 'sawtooth', 'sine', 'square'];
  var container = document.createElement('div');
  container.className = 'synth-section';
  var titleRow = document.createElement('div');
  titleRow.innerHTML = '<div class="synth-section-title">🎛 Effects &amp; Sound Shaping ' +
    '<span style="font-size:9px;color:#475569;margin-left:8px;text-transform:none;letter-spacing:0">' +
    'volume / reverb / delay / cutoff / resonance are live · attack / spread / voices / waveform apply to the next note</span></div>';
  container.appendChild(titleRow);

  var waveRow = document.createElement('div');
  waveRow.style.cssText = 'display:flex;gap:16px;align-items:center;margin-bottom:12px';
  var wLabel = document.createElement('span');
  wLabel.className = 'fx-label';
  wLabel.textContent = 'Waveform';
  waveRow.appendChild(wLabel);
  var wSel = document.createElement('select');
  wSel.className = 'synth-select';
  waveformOptions.forEach(function(w) {
    var opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    if (w === effects.params.waveform) opt.selected = true;
    wSel.appendChild(opt);
  });
  wSel.onchange = function() { effects.params.waveform = wSel.value; };
  waveRow.appendChild(wSel);
  container.appendChild(waveRow);

  var fxGrid = document.createElement('div');
  fxGrid.className = 'fx-grid';
  sliders.forEach(function(s) {
    var key = s[0], label = s[1], min = s[2], max = s[3], step = s[4];
    var initVal = effects.params[key];
    var ctrl = document.createElement('div');
    ctrl.className = 'fx-control';
    var lbl = document.createElement('div');
    lbl.className = 'fx-label';
    lbl.textContent = label;
    var input = document.createElement('input');
    input.type = 'range';
    input.className = 'fx-slider';
    input.min = min; input.max = max; input.step = step; input.value = initVal;
    var valEl = document.createElement('div');
    valEl.className = 'fx-val';
    valEl.textContent = typeof initVal === 'number' ? (initVal % 1 ? initVal.toFixed(2) : String(initVal)) : initVal;
    input.oninput = function() {
      var v = +input.value;
      effects.params[key] = v;
      valEl.textContent = v % 1 ? v.toFixed(2) : String(v);
      if (key === 'volume') effects.master.gain.value = v;
      else if (key === 'reverb') effects.revSend.gain.value = v;
      else if (key === 'delayMix') effects.dlySend.gain.value = v;
      else if (key === 'delayTime') effects.dly.delayTime.value = v;
      else if (key === 'delayFb') effects.dlyFb.gain.value = v;
      else if (key === 'cutoff') effects.filt.frequency.value = v;
      else if (key === 'resonance') effects.filt.Q.value = v;
    };
    ctrl.appendChild(lbl);
    ctrl.appendChild(input);
    ctrl.appendChild(valEl);
    fxGrid.appendChild(ctrl);
  });
  container.appendChild(fxGrid);
  return container;
};
const _synthApp = function synthApp(drumUI, chordPadUI, pianoUI, effectsUI, presetUI, visualizer, keyboardShortcuts, resumeCtx){
  var app = document.createElement('div');
  app.className = 'synth-app';
  app.appendChild(presetUI);
  app.appendChild(effectsUI);
  app.appendChild(visualizer);
  app.appendChild(drumUI);
  app.appendChild(chordPadUI);
  app.appendChild(pianoUI);
  app.appendChild(keyboardShortcuts);
  return app;
};
const _presets = function presets(){
  return {
    'Warm Pad': { volume: 0.6, reverb: 0.3, delayMix: 0.06, delayTime: 0.375, delayFb: 0.15, cutoff: 4000, resonance: 1.5, attack: 0.6, release: 2.5, detune: 8, voices: 6, waveform: 'sawtooth' },
    'Ethereal': { volume: 0.55, reverb: 0.45, delayMix: 0.15, delayTime: 0.5, delayFb: 0.25, cutoff: 6000, resonance: 2, attack: 0.8, release: 3, detune: 10, voices: 6, waveform: 'triangle' },
    'Bright Lead': { volume: 0.5, reverb: 0.15, delayMix: 0.12, delayTime: 0.25, delayFb: 0.25, cutoff: 12000, resonance: 3, attack: 0.01, release: 0.5, detune: 3, voices: 3, waveform: 'sawtooth' },
    'Deep Bass': { volume: 0.7, reverb: 0.05, delayMix: 0.03, delayTime: 0.25, delayFb: 0.1, cutoff: 800, resonance: 4, attack: 0.01, release: 0.3, detune: 2, voices: 2, waveform: 'square' },
    'Dreamy': { volume: 0.55, reverb: 0.4, delayMix: 0.18, delayTime: 0.5, delayFb: 0.3, cutoff: 5000, resonance: 1.8, attack: 1.0, release: 3.5, detune: 12, voices: 8, waveform: 'triangle' },
    'Pluck': { volume: 0.6, reverb: 0.12, delayMix: 0.12, delayTime: 0.25, delayFb: 0.2, cutoff: 10000, resonance: 5, attack: 0.005, release: 0.4, detune: 4, voices: 3, waveform: 'sawtooth' },
    'Strings': { volume: 0.55, reverb: 0.35, delayMix: 0.08, delayTime: 0.375, delayFb: 0.18, cutoff: 7000, resonance: 1.2, attack: 0.5, release: 2.0, detune: 15, voices: 8, waveform: 'sawtooth' }
  };
};
const _presetUI = function presetUI(presets, effects, effectsUI, html){
  var container = document.createElement('div');
  container.className = 'transport';
  container.style.marginBottom = '16px';
  var lbl = document.createElement('span');
  lbl.className = 'fx-label';
  lbl.textContent = 'PRESETS';
  lbl.style.marginRight = '8px';
  container.appendChild(lbl);
  Object.keys(presets).forEach(function(name) {
    var btn = document.createElement('button');
    btn.className = 'tbtn';
    btn.textContent = name;
    btn.onclick = function() {
      var p = presets[name];
      Object.keys(p).forEach(function(key) {
        effects.params[key] = p[key];
      });
      // Apply to audio nodes
      effects.master.gain.value = p.volume;
      effects.revSend.gain.value = p.reverb;
      effects.dlySend.gain.value = p.delayMix;
      effects.dly.delayTime.value = p.delayTime;
      effects.dlyFb.gain.value = p.delayFb;
      effects.filt.frequency.value = p.cutoff;
      effects.filt.Q.value = p.resonance;
      // Update UI sliders
      var sliders = effectsUI.querySelectorAll('.fx-slider');
      var vals = effectsUI.querySelectorAll('.fx-val');
      var keys = ['volume','reverb','delayMix','delayTime','delayFb','cutoff','resonance','attack','release','detune','voices'];
      sliders.forEach(function(s, idx) {
        var k = keys[idx];
        if (p[k] !== undefined) {
          s.value = p[k];
          if (vals[idx]) vals[idx].textContent = p[k] % 1 ? p[k].toFixed(2) : String(p[k]);
        }
      });
      // Update waveform select
      var wSel = effectsUI.querySelector('.synth-select');
      if (wSel && p.waveform) wSel.value = p.waveform;
    };
    container.appendChild(btn);
  });
  return container;
};
const _visualizer = function visualizer(ctx, effects, invalidation, html){
  var canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 80;
  canvas.style.cssText = 'width:100%;height:80px;border-radius:10px;background:rgba(0,0,0,0.3);';
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  effects.master.connect(analyser);
  var bufLen = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufLen);
  var canvasCtx = canvas.getContext('2d');
  var alive = true;
  invalidation.then(function() { alive = false; });
  function draw() {
    if (!alive) return;
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.fillStyle = 'rgba(10, 11, 30, 0.3)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    var barW = (canvas.width / bufLen) * 2.5;
    var x = 0;
    for (var i = 0; i < bufLen; i++) {
      var barH = (dataArray[i] / 255) * canvas.height;
      var hue = (i / bufLen) * 60 + 270;
      canvasCtx.fillStyle = 'hsl(' + hue + ', 80%, ' + (40 + dataArray[i] / 5) + '%)';
      canvasCtx.fillRect(x, canvas.height - barH, barW, barH);
      x += barW + 1;
    }
  }
  draw();
  var container = document.createElement('div');
  container.className = 'synth-section';
  container.innerHTML = '<div class="synth-section-title">📊 Spectrum</div>';
  container.appendChild(canvas);
  return container;
};
const _keyboardShortcuts = function keyboardShortcuts(engine, invalidation, html){
  var drumKeys = { 'a':'kick','s':'snare','d':'chh','f':'ohh','g':'clap','h':'tomLo','j':'tomHi','k':'rim' };
  var pianoKeys = {'z':48,'x':50,'c':52,'v':53,'b':55,'n':57,'m':59,',':60};
  var container = document.createElement('div');
  container.className = 'synth-section';
  container.innerHTML = '<div class="synth-section-title">⌨ Keyboard Shortcuts</div>' +
    '<div style="font-size:11px;color:#94a3b8;line-height:1.8">' +
    '<b style="color:#e2e8f0">Drums:</b> A=Kick S=Snare D=CH HH F=OH HH G=Clap H=Tom L J=Tom H K=Rim<br>' +
    '<b style="color:#e2e8f0">Piano:</b> Z=C3 X=D3 C=E3 V=F3 B=G3 N=A3 M=B3 ,=C4 — notes stop on key release' +
    '</div>';
  var noteStops = {};
  function isTyping(e) {
    var t = e.target;
    if (!t) return false;
    if (t.tagName === 'INPUT') {
      var tt = (t.type || 'text').toLowerCase();
      return !(tt === 'range' || tt === 'checkbox' || tt === 'radio' || tt === 'button' || tt === 'submit');
    }
    return t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' ||
      t.isContentEditable || !!(t.closest && t.closest('.cm-editor'));
  }
  function down(e) {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (noteStops[k]) return;
    if (drumKeys[k]) { noteStops[k] = true; engine.playDrum(drumKeys[k]); return; }
    if (pianoKeys[k]) noteStops[k] = engine.playNote(pianoKeys[k], 30);
  }
  function up(e) {
    var k = e.key.toLowerCase();
    var s = noteStops[k];
    delete noteStops[k];
    if (typeof s === 'function') s();
  }
  document.addEventListener('keydown', down);
  document.addEventListener('keyup', up);
  invalidation.then(function() {
    document.removeEventListener('keydown', down);
    document.removeEventListener('keyup', up);
  });
  return container;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_intro", "intro", ["md"], _intro);  
  $def("_ctx", "ctx", [], _ctx);  
  $def("_resumeCtx", "resumeCtx", ["ctx","html"], _resumeCtx);  
  $def("_noiseBuffer", "noiseBuffer", ["ctx"], _noiseBuffer);  
  $def("_effects", "effects", ["ctx"], _effects);  
  $def("_engine", "engine", ["ctx","effects","noiseBuffer"], _engine);  
  $def("_chords", "chords", [], _chords);  
  $def("_drumUI", "drumUI", ["engine","effects","ctx","html"], _drumUI);  
  $def("_chordPadUI", "chordPadUI", ["engine","chords","html"], _chordPadUI);  
  $def("_pianoUI", "pianoUI", ["engine","html"], _pianoUI);  
  $def("_effectsUI", "effectsUI", ["effects","html"], _effectsUI);  
  $def("_synthApp", "synthApp", ["drumUI","chordPadUI","pianoUI","effectsUI","presetUI","visualizer","keyboardShortcuts","resumeCtx"], _synthApp);  
  $def("_presets", "presets", [], _presets);  
  $def("_presetUI", "presetUI", ["presets","effects","effectsUI","html"], _presetUI);  
  $def("_visualizer", "visualizer", ["ctx","effects","invalidation","html"], _visualizer);
  $def("_keyboardShortcuts", "keyboardShortcuts", ["engine","invalidation","html"], _keyboardShortcuts);
  return main;
}
