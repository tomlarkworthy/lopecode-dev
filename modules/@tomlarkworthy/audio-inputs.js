const _13o3v41 = function _1(md){return(
md`# Audio Inputs

~~~js
import { sample, audioContext } from "@tomlarkworthy/audio-inputs"
~~~`
)};
const _pmxeha = function _2(md){return(
md`## Sample

Loads audio data into an AudioBuffer, and provides some controls for selection, playbackRate, volume and loop of the sample.

The value emitted by the control is the buffer, annotated with properties.

TODO: BUG: changing loop selection resets loop which is not strictly necissary
`
)};
const _12qie6f = async function _dynamicBuffer(Inputs,FileAttachment){return(
Inputs.select(
  new Map([
    [
      "crash.mp3",
      await FileAttachment("crash.mp3").arrayBuffer()
    ],
    ["CHH05.mp3", await FileAttachment("CHH05.mp3").arrayBuffer()]
  ])
)
)};
const _t9zaft = (G, _) => G.input(_);
const _108g7q1 = function _syncBuffer(manual,dynamicBuffer)
{
  manual.arrayBuffer = dynamicBuffer.slice();
};
const _15xe61p = async function _manual(sample,audioContext,FileAttachment){return(
sample({
  loop: false,
  gain: 0.4,
  speed: 3,
  audioContext: audioContext,
  arrayBuffer: await FileAttachment("crash.mp3").arrayBuffer()
})
)};
const _1neugxy = (G, _) => G.input(_);
const _mxkmt5 = async function _cymbal(sample,audioContext,FileAttachment){return(
sample({
  loop: true,
  gain: 0.4,
  start: 0.1,
  end: 0.5,
  speed: 3,
  audioContext: audioContext,
  arrayBuffer: await FileAttachment("crash.mp3").arrayBuffer()
})
)};
const _19m5yey = (G, _) => G.input(_);
const _1xb7f52 = function _7(md){return(
md`

~~~js
import {sample, webaudioPolyfill} from '@tomlarkworthy/audio-inputs'
~~~

~~~js
viewof cymbal = sample({
  audioContext: new AudioContext() /* usually shared across many componetns in an audio app */,
  arrayBuffer: await FileAttachment("crash.mp3").arrayBuffer(),
})
~~~
`
)};
const _xb0tud = function _sample(webaudioPolyfill,waveformSelect,invalidation,Range,knob,html){return(
async function sample({
  loop = false,
  gain = 1,
  speed = 1,
  start = 0,
  end,
  audioContext,
  arrayBuffer,
  speedAdjust = true
} = {}) {
  webaudioPolyfill; // Safari
  let sampleData, d2s, s2d, waveform;

  async function setBuffer(arrayBuffer) {
    const currentlyPlaying = waveform && playing;
    if (currentlyPlaying) stop();
    sampleData = await audioContext.decodeAudioData(arrayBuffer);

    // Some useful seconds to data indeces factors.
    d2s = sampleData.duration / sampleData.getChannelData(0).length;
    s2d = sampleData.getChannelData(0).length / sampleData.duration;
    if (!end) end = sampleData.duration;

    const current = waveform ? ui.querySelector(".waveform") : undefined;

    debugger;
    waveform = waveformSelect({
      selectionStart: current?.value?.selectionStart || start * s2d,
      selectionEnd: current?.value?.selectionEnd || end * s2d,
      audioBuffer: sampleData,
      height: 34
    });

    waveform.style["padding"] = "4px";
    waveform.style["margin-top"] = `3px`;
    const syncWaveform = () => setLoop(loop);
    waveform.addEventListener("input", syncWaveform);
    invalidation.then(() =>
      waveform.removeEventListener("input", syncWaveform)
    );

    if (current) {
      current.replaceWith(waveform);
      current.remove();
    }

    if (currentlyPlaying) play();
  }
  await setBuffer(arrayBuffer);

  const speedCtl = Range([0.2, 5], {
    value: speed,
    label: "speed",
    transform: Math.log
  });
  const syncSpeed = () => setLoop(loop);
  speedCtl.addEventListener("input", syncSpeed);
  invalidation.then(() => speedCtl.removeEventListener("input", syncSpeed));

  const volume = knob({
    value: gain,
    type: "volume",
    size: 50
  });
  const syncVolume = () => {
    if (gain && gain.gain) gain.gain.value = volume.value;
  };
  volume.addEventListener("input", syncVolume);
  invalidation.then(() => volume.removeEventListener("input", syncVolume));

  let source = null;
  let playing = false;

  function play(when = 0) {
    if (when === 0) stop();
    source = audioContext.createBufferSource();
    source.onended = () => {
      console.log("on ended");
      playing = false;
      updateLook();
    };
    source.buffer = sampleData;
    source.playbackRate.value = speedCtl.value;

    gain = audioContext.createGain();
    source.connect(gain);
    gain.connect(audioContext.destination);

    setLoop(loop);
    volume.setVolume(volume.value);

    const start = waveform.value.selectionStart * d2s;
    const duration =
      (waveform.value.selectionEnd - waveform.value.selectionStart) * d2s;
    source.start(when, start, loop ? undefined : duration);
    playing = true;
    updateLook();
  }
  function stop() {
    if (source) {
      source.onended = null;
      source.stop();
    }
    playing = false;
    source = gain = null;
    updateLook();
  }

  function updateLook() {
    loopButton.style["color"] = loop ? "green" : "black";
    loopButton.style["stroke"] = loop ? "green" : "black";
    loopButton.style["border-color"] = loop ? "green" : "black";
    playButton.style["color"] = playing ? "green" : "black";
    playButton.style["stroke"] = playing ? "green" : "black";
    playButton.style["border-color"] = playing ? "green" : "black";
  }

  function setLoop(shouldLoop) {
    loop = shouldLoop;
    if (source) {
      source.loop = loop;
      source.loopStart = waveform.value.selectionStart * d2s;
      source.loopEnd = waveform.value.selectionEnd * d2s;
      if (playing && loop) {
        console.log("Restart loop");
        stop();
        play();
      }
    }
  }
  const ui = html`<div class="audio">
    <style>
      .audio-container {
        display: flex;
        flex-direction: row;
      }
      .audio-btn {
        color: black;
        stroke: black;
        border-color: black;
        border-width: 1px;
        border-radius: 5px;
        text-align: center;
        background: white;
        height:35px;
        width:35px;
        margin: 2px;
        margin-top: 6px;
      }
    </style>
    <span class="audio-container">
      ${volume}
      <button class="audio-btn play-btn" onclick=${() => play(0)}>▶</button>
      <button class="audio-btn" onclick=${stop}>◾</button>
      <button class="audio-btn loop-btn" style="font-size:24px"  onclick=${() => {
        setLoop(!loop);
        updateLook();
      }} >↻</button>
      ${waveform}
    </span>
    <span>
      ${speedAdjust ? speedCtl : null}
    </span>
  </div>`;
  let loopButton = ui.querySelector(".loop-btn");
  let playButton = ui.querySelector(".play-btn");
  ui.value = sampleData;

  // Add accessors to value to make it mutable
  Object.defineProperty(ui.value, "gain", {
    get: () => volume.value,
    set: (value) => {
      gain = value;
      volume.setVolume(value);
    },
    enumerable: true
  });

  Object.defineProperty(ui.value, "speed", {
    get: () => speedCtl.value,
    set: (value) => (speedCtl.value = value),
    enumerable: true
  });

  Object.defineProperty(ui.value, "start", {
    get: () => waveform.value.selectionStart * d2s,
    set: (value) => {
      start = value;
      waveform.value.setSelectionStart(value * s2d);
    },
    enumerable: true
  });

  Object.defineProperty(ui.value, "end", {
    get: () => waveform.value.selectionEnd * d2s,
    set: (value) => {
      end = value;
      waveform.value.setSelectionEnd(value * s2d);
    },
    enumerable: true
  });

  Object.defineProperty(ui.value, "playing", {
    get: () => playing,
    set: (newVal) => {
      if (typeof newVal === "number") {
        play(newVal);
      } else {
        newVal ? play() : stop();
      }
    },
    enumerable: true
  });

  Object.defineProperty(ui.value, "arrayBuffer", {
    get: () => arrayBuffer,
    set: (newVal) => {
      arrayBuffer = newVal;
      setBuffer(arrayBuffer);
    },
    enumerable: true
  });

  // Add top level control to DOM
  ui.play = play;
  ui.stop = stop;

  invalidation.then(() => stop());

  // Color in loop button
  setLoop(loop);
  updateLook();

  return ui;
}
)};
const _qfdnl0 = function _9(md){return(
md`### Writable properties demo

If you write to the emitted value fields the UI will update. See what happens when you press play and fiddle with the playback speed.
`
)};
const _r0xgch = function _10(writable_demo,now)
{
  writable_demo.start = 0.5* Math.sin(now/300) + 0.5
  writable_demo.end = 0.5*Math.sin(now/300) + 0.6
  writable_demo.gain = (now / 1000) % 1
  return Object.keys(writable_demo).concat(Object.values(writable_demo))
};
const _uwjb3g = function _audioContext(){return(
new AudioContext()
)};
const _5sn7l9 = async function _writable_demo(sample,audioContext,FileAttachment){return(
sample({
  loop: true,
  audioContext: audioContext,
  arrayBuffer: await FileAttachment("crash.mp3").arrayBuffer()
})
)};
const _dd70ac = (G, _) => G.input(_);
const _1wlcnb1 = function _13(writable_demo){return(
writable_demo
)};
const _yg2mz5 = function _14(md){return(
md`## Knob

Knobs are an inferior but cooler way of implementing a slider. Drag up or to the right to increase the value.

`
)};
const _1j1wjl3 = function _volume(knob){return(
knob({
  type: "volume",
  size: 250,
  value: 0.5
})
)};
const _12wzpy2 = (G, _) => G.input(_);
const _11e7jgv = function _knob(width,invalidation,svg,range){return(
function knob({
  type = "volume",
  value = 1, 
  size = 100
} = {}) {
  if (type != "volume") throw new Error("Only have volume know ATM")
  let start = null;
  function mousedown(evt) {
    start = [evt.clientX, evt.clientY, value]
    return false;
  }
  const mousemove = (evt) => {
    if (!evt.buttons) start = null;
    if (start) {
      const delta =
            evt.clientX - start[0] - evt.clientY + start[1]
      const volume = start[2] + delta / width * 5
      setVolume(volume)
    }
  }
  const mouseup = (evt) => start = null;
  document.addEventListener('mousemove', mousemove)
  document.addEventListener('mouseup', mouseup)
  
  invalidation.then(() => {
    document.removeEventListener('mousemove', mousemove)
    document.removeEventListener('mouseup', mouseup)
  })
  
  function setVolume(_volume) {
    value = Math.min(Math.max(_volume, 0), 1)
    ui.value = value;
    const deg = -125 + value * 250;
    pivot.transform.baseVal.getItem(0).setRotate(deg, 0, 0);
    ui.dispatchEvent(new CustomEvent("input"));
  }
  
  const ui = svg`<svg
      onmousedown=${mousedown}
      viewBox="-1 -1 2 2"
      width=${size} height=${size}
      stroke-width="0.01"
      stroke="black"
      stroke-linecap="round"
      fill="none">
    <circle r=".7"/>
    <line class="pivot" x2="0" y2="-0.6" stroke-width="0.15" transform="rotate(0)"/>
    <g fill="black" stroke="none">
      ${range(-125, 125, 250 / 20).map((d, i) => svg`<g 
        transform="rotate(${d})translate(0 -0.75)">
        <rect x="-0.025" y="${-i*0.005}" width="0.05" height="${i*0.005}"/>
      </g>`)}
    </g>
  </svg>`
  
  let pivot = ui.querySelector(".pivot");
  setVolume(value);
  ui.value = value
  ui.setVolume = setVolume;
  return ui;
}
)};
const _15d0qlk = function _17(md){return(
md`## Waveform Selector

Uses Yuri Vishnevsky's [density plot](https://observablehq.com/collection/@twitter/density) to display a waveform effeciently as an undersampled timeseries. The user can select a portion with the mouse.
`
)};
const _h9o67 = async function _waveform(waveformSelect,FileAttachment){return(
waveformSelect({
  audioBuffer: await new AudioContext().decodeAudioData(await FileAttachment("crash.mp3").arrayBuffer()),
  selectionStart: 10000,
  selectionEnd: 50000, 
})
)};
const _27htnb = (G, _) => G.input(_);
const _1iw07ux = function _waveformSelect(seriesDensity,densityPlot,svg,html,invalidation){return(
function waveformSelect({
  audioBuffer,
  width = 250,
  height = 50,
  selectionStart = 0,
  selectionEnd = audioBuffer.length
} = {}) {
  const data = audioBuffer.getChannelData(0);
  const density = seriesDensity(width, height)
    .yDomain([-1, 1])
    .arcLengthNormalize(false)
    .xDomain([0, data.length]);
  let plot = densityPlot(density)
    .drawAxes(false)
    .background("white")
    .color(() => () => ({ r: 0, g: 0, b: 0, opacity: 1 }));
  const waveform = plot([data]);
  let start = null;

  function mousedown(evt) {
    const rect = ui.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    start = x;
    setSelectionStart(x * px2x);
    return false;
  }
  function mousemove(evt) {
    if (!evt.buttons) start = null;
    if (start) {
      const rect = ui.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      setSelectionEnd(x * px2x);
    }
  }

  let selectionStartRect, selectionEndRect;
  const px2x = (data.length * 1.0) / width;
  const x2px = (width * 1.0) / data.length;

  function setSelectionStart(start) {
    selectionStart = start;
    selectionStartRect.setAttribute("width", start * x2px);
    notifyInput();
  }

  function setSelectionEnd(end) {
    selectionEnd = end;
    selectionEndRect.setAttribute("x", end * x2px);
    notifyInput();
  }
  const value = {
    selectionStart,
    selectionEnd,
    setSelectionStart,
    setSelectionEnd
  };

  function notifyInput() {
    value.selectionStart = selectionStart;
    value.selectionEnd = selectionEnd;
    ui.dispatchEvent(new CustomEvent("input"));
  }

  const overlay = svg`<svg
      viewBox="0 0 ${width} ${height}"
      width="${width}px"
      height="${height}px"
      preserveAspectRatio="none"
      fill="rgba(0, 0, 0, 0.3)"
      stroke="none"
      style="position: absolute"
    >
    <rect class="wselect-start"
          x="0"
          width=${selectionStart * x2px}
          height=${height} />
    
    <rect class="wselect-end"
          x=${selectionEnd * x2px}
          width=${width}
          height=${height} />
  </svg>`;

  const ui = html`<span class="waveform">
    ${overlay}
    ${waveform}
  </span>`;
  selectionStartRect = ui.querySelector(".wselect-start");
  selectionEndRect = ui.querySelector(".wselect-end");

  ui.addEventListener("mousedown", mousedown);
  document.addEventListener("mousemove", mousemove);

  invalidation.then(() => {
    ui.removeEventListener("mousedown", mousedown);
    document.removeEventListener("mousemove", mousemove);
  });
  ui.value = value;
  return ui;
}
)};
const _99c1dr = function _range(){return(
(start, stop, step) => Array(Math.floor((stop - start) / step + 1 + step * 0.001)).fill(0).map((_, i) => start + i * step)
)};
const _1wrgvy1 = function _webaudioPolyfill(require,html)
{
  (function() {
    return function() {
        return function e(t, r, o) {
            function n(a, u) {
                if (!r[a]) {
                    if (!t[a]) {
                        var f = "function" == typeof require && require;
                        if (!u && f) return f(a, !0);
                        if (i) return i(a, !0);
                        var c = new Error("Cannot find module '" + a + "'");
                        throw c.code = "MODULE_NOT_FOUND", c
                    }
                    var s = r[a] = {
                        exports: {}
                    };
                    t[a][0].call(s.exports, function(e) {
                        return n(t[a][1][e] || e)
                    }, s, s.exports, e, t, r, o)
                }
                return r[a].exports
            }
            for (var i = "function" == typeof require && require, a = 0; a < o.length; a++) n(o[a]);
            return n
        }
    }()({
        1: [function(e, t, r) {
            ! function() {
                "use strict";
                var e = window.AudioContext = window.AudioContext || window.webkitAudioContext,
                    t = e.prototype;
                Object.defineProperties(t, {
                    createGain: {
                        value: t.createGain || t.createGainNode
                    },
                    createDelay: {
                        value: t.createDelay || t.createDelayNode
                    },
                    createScriptProcessor: {
                        value: t.createScriptProcessor || t.createJavaScriptNode
                    },
                    // Added in @tomlarkworthy/audio-inputs
                    decodeAudioData: {
                      value: window.webkitAudioContext ? function(raw) {
                        return this.createBuffer(raw, 1);
                      }: t.decodeAudioData
                    },
                });
                var r = new e,
                    o = r.createOscillator().constructor.prototype,
                    n = r.createBufferSource().constructor.prototype,
                    i = r.createGain().gain.constructor.prototype;
                Object.defineProperties(o, {
                    setPeriodicWave: {
                        value: o.setPeriodicWave || o.setWaveTable
                    },
                    start: {
                        value: o.start || o.noteOn
                    },
                    stop: {
                        value: o.stop || o.noteOff
                    }
                }), Object.defineProperties(n, {
                    start: {
                        value: n.start || function() {
                            return arguments.length > 1 ? n.noteGrainOn.apply(this, arguments) : n.noteOn.apply(this, arguments)
                        }
                    },
                    stop: {
                        value: n.stop || n.noteOff
                    }
                }), Object.defineProperties(i, {
                    setTargetAtTime: {
                        value: i.setTargetAtTime || i.setTargetValueAtTime
                    }
                })
            }()
        }, {}]
    }, {}, [1])(1)
})();
  return html`inline <a href="https://www.npmjs.com/package/audio-context-polyfill">audio-context-polyfill</a>`
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["crash.mp3","CHH05.mp3"].map((name) => {
    const module_name = "@tomlarkworthy/audio-inputs";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @twitter/density-plot@4159", async () => runtime.module((await import("/@twitter/density-plot@4159.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @observablehq/inputs", async () => runtime.module((await import("/@observablehq/inputs.js?v=4")).default));  
  $def("_13o3v41", null, ["md"], _13o3v41);  
  $def("_pmxeha", null, ["md"], _pmxeha);  
  $def("_12qie6f", "viewof dynamicBuffer", ["Inputs","FileAttachment"], _12qie6f);  
  $def("_t9zaft", "dynamicBuffer", ["Generators","viewof dynamicBuffer"], _t9zaft);  
  $def("_108g7q1", "syncBuffer", ["manual","dynamicBuffer"], _108g7q1);  
  $def("_15xe61p", "viewof manual", ["sample","audioContext","FileAttachment"], _15xe61p);  
  $def("_1neugxy", "manual", ["Generators","viewof manual"], _1neugxy);  
  $def("_mxkmt5", "viewof cymbal", ["sample","audioContext","FileAttachment"], _mxkmt5);  
  $def("_19m5yey", "cymbal", ["Generators","viewof cymbal"], _19m5yey);  
  $def("_1xb7f52", null, ["md"], _1xb7f52);  
  $def("_xb0tud", "sample", ["webaudioPolyfill","waveformSelect","invalidation","Range","knob","html"], _xb0tud);  
  $def("_qfdnl0", null, ["md"], _qfdnl0);  
  $def("_r0xgch", null, ["writable_demo","now"], _r0xgch);  
  $def("_uwjb3g", "audioContext", [], _uwjb3g);  
  $def("_5sn7l9", "viewof writable_demo", ["sample","audioContext","FileAttachment"], _5sn7l9);  
  $def("_dd70ac", "writable_demo", ["Generators","viewof writable_demo"], _dd70ac);  
  $def("_1wlcnb1", null, ["writable_demo"], _1wlcnb1);  
  $def("_yg2mz5", null, ["md"], _yg2mz5);  
  $def("_1j1wjl3", "viewof volume", ["knob"], _1j1wjl3);  
  $def("_12wzpy2", "volume", ["Generators","viewof volume"], _12wzpy2);  
  $def("_11e7jgv", "knob", ["width","invalidation","svg","range"], _11e7jgv);  
  $def("_15d0qlk", null, ["md"], _15d0qlk);  
  $def("_h9o67", "viewof waveform", ["waveformSelect","FileAttachment"], _h9o67);  
  $def("_27htnb", "waveform", ["Generators","viewof waveform"], _27htnb);  
  $def("_1iw07ux", "waveformSelect", ["seriesDensity","densityPlot","svg","html","invalidation"], _1iw07ux);  
  $def("_99c1dr", "range", [], _99c1dr);  
  main.define("densityPlot", ["module @twitter/density-plot@4159", "@variable"], (_, v) => v.import("densityPlot", _));  
  main.define("seriesDensity", ["module @twitter/density-plot@4159", "@variable"], (_, v) => v.import("seriesDensity", _));  
  main.define("cacheInterpolator", ["module @twitter/density-plot@4159", "@variable"], (_, v) => v.import("cacheInterpolator", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));  
  main.define("Range", ["module @observablehq/inputs", "@variable"], (_, v) => v.import("Range", _));  
  $def("_1wrgvy1", "webaudioPolyfill", ["require","html"], _1wrgvy1);
  return main;
}