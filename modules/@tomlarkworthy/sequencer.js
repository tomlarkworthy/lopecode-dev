const _1pgepdm = function _1(md){return(
md`# Sequencer

The sequence connects to the drum pads which connect to the samples.

You can mess with the speed of samples, hit the drum pads manually and play the sequencer program in real time! When your done, click download to capture your work in a single-file 
`
)};
const _sgxmcd = function _play(Inputs,$0,Event,invalidation)
{
  let hasPlayed = false;
  const ui = Inputs.button("start/stop (spacebar)", {
    reduce: (play) => {
      if (!hasPlayed) {
        hasPlayed = true;
        $0.value.playing = true;
      }
      return !play;
    }
  });
  const keyboardListener = (e) => {
    if (e.keyCode == 32) {
      ui.value = !ui.value;
      ui.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  document.addEventListener("keyup", keyboardListener);
  invalidation.then(() =>
    document.removeEventListener("keyup", keyboardListener)
  );
  return ui;
};
const _ko3veu = (G, _) => G.input(_);
const _wuh68g = function _bpm(Inputs){return(
Inputs.range([80, 240], { label: "BPM", value: 175, step: 1 })
)};
const _w2pv3n = (G, _) => G.input(_);
const _3znpnd = function _selectedSample(juice,Inputs){return(
juice(Inputs.select, {
  label: "[1].label",
  options: "[0]", // "options" is first arg (index 0) of Inputs.select
  result: "[1].value" // "result" can be set in the options.value, options being the 2nd arg (index 0)
})([], {
  label: "select sample (DPM coords)"
})
)};
const _4d6jyj = (G, _) => G.input(_);
const _7oz61e = function _buttons64(fastBtn,grid)
{
  const btns = [];
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const button = fastBtn();
      button.i = i;
      button.j = j;
      btns.push(button);
    }
  }

  return grid({
    elements: Object.fromEntries(
      btns.map((btn, i) => [
        `${i}`,
        {
          x: btn.i,
          y: btn.j,
          element: btn
        }
      ])
    )
  });
};
const _12wric5 = (G, _) => G.input(_);
const _ktf5ev = function _buttons4x4(fastBtn,grid)
{
  const btns = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const button = fastBtn({ label: [i, j], size: "large" });
      button.i = i;
      button.j = j;
      btns.push(button);
    }
  }

  return grid({
    elements: {
      ...Object.fromEntries(
        btns.map((btn) => [
          `${btn.i} ${btn.j}`,
          {
            x: btn.i * 3,
            y: btn.j * 3,
            h: 3,
            w: 3,
            element: btn
          }
        ])
      )
    }
  });
};
const _1o65rxb = (G, _) => G.input(_);
const _1xcdr0v = function _7(md){return(
md`#### kick01`
)};
const _jse95g = async function _kick01(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.1,
  speed: 1.5,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Kick01.mp3").arrayBuffer()
})
)};
const _epidcd = (G, _) => G.input(_);
const _1hbw8wd = function _9(md){return(
md`#### clap01`
)};
const _1su7l60 = async function _clap01(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.4,
  speed: 0.9,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Clap01.mp3").arrayBuffer()
})
)};
const _1tqhsuh = (G, _) => G.input(_);
const _aafff7 = function _11(md){return(
md`#### snap02`
)};
const _bwosas = async function _snap02(sample,audioContext,FileAttachment){return(
sample({
  speed: 1.6,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Snap02.mp3").arrayBuffer()
})
)};
const _11lt4mi = (G, _) => G.input(_);
const _161wwye = function _13(md){return(
md`#### ohh02`
)};
const _1ewjfk4 = async function _ohh02(sample,audioContext,FileAttachment){return(
sample({
  speed: 1.5,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("OHH02.mp3").arrayBuffer()
})
)};
const _986ep5 = (G, _) => G.input(_);
const _tkxnkt = function _15(md){return(
md`#### chh05`
)};
const _tbd71w = async function _chh05(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.7,
  speed: 0.7,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("CHH05.mp3").arrayBuffer()
})
)};
const _efocjc = (G, _) => G.input(_);
const _1t6nz9o = function _17(md){return(
md`#### c`
)};
const _1whgrqx = async function _c(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.3,
  speed: 16.35 / 24.5,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Chord01_G.mp3").arrayBuffer()
})
)};
const _5gdu53 = (G, _) => G.input(_);
const _9ql2jd = function _19(md){return(
md`#### f`
)};
const _1rgoe40 = async function _f(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.3,
  speed: 21.83 / 24.5,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Chord01_G.mp3").arrayBuffer()
})
)};
const _a80e20 = (G, _) => G.input(_);
const _1snwyb5 = function _21(md){return(
md`#### g`
)};
const _gumgqz = async function _g(sample,audioContext,FileAttachment){return(
sample({
  gain: 0.3,
  speed: 1,
  loop: false,
  audioContext,
  arrayBuffer: await FileAttachment("Chord01_G.mp3").arrayBuffer()
})
)};
const _103yb1v = (G, _) => G.input(_);
const _6cst5v = function _23(exporter){return(
exporter()
)};
const _1xypljo = async function _initialProgram(FileAttachment,Inputs)
{
  const program = await FileAttachment("program01.json").text();
  const decoded = JSON.parse(program, (key, value) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (err) {}
    }
    return value;
  });

  const programView = Inputs.input(decoded);
  return programView;
};
const _apj1mk = (G, _) => G.input(_);
const _aqwhdn = function _25(html,program){return(
html`<h3>Current Program</h3><pre>${JSON.stringify(
  program,
  (k, v) => (v instanceof Array ? JSON.stringify(v) : v),
  2
)}</pre>`
)};
const _1uuabk = function _26(md){return(
md`## Persistence`
)};
const _131yd3f = function _module(thisModule){return(
thisModule()
)};
const _th6e4k = (G, _) => G.input(_);
const _ado95j = function _save_program(setFileAttachment,jsonFileAttachment,program,module)
{
  setFileAttachment(jsonFileAttachment("program01.json", program), module);
};
const _1afyn8r = function _attachments(getFileAttachments,module){return(
getFileAttachments(module)
)};
const _wkewba = function _30(md){return(
md`## Wiring`
)};
const _11l1yx0 = function _wiring(connect,$0,$1,invalidation,$2,$3,$4,$5,$6,$7,$8)
{
  connect(
    $0,
    $1,
    {
      label: "kick01",
      color: "#FFEE65",
      coord: [0, 0]
    },
    invalidation
  );
  connect(
    $2,
    $1,
    {
      label: "clap01",
      color: "#FFEE65",
      coord: [1, 0]
    },
    invalidation
  );
  connect(
    $3,
    $1,
    {
      label: "snap02",
      color: "#46FF72",
      coord: [2, 0]
    },
    invalidation
  );
  connect(
    $4,
    $1,
    {
      label: "ohh02",
      color: "#46FF72",
      coord: [3, 0]
    },
    invalidation
  );
  connect(
    $5,
    $1,
    {
      label: "chh05",
      color: "#46FF72",
      coord: [3, 1]
    },
    invalidation
  );
  connect(
    $6,
    $1,
    {
      label: "c",
      color: "red",
      coord: [1, 2]
    },
    invalidation
  );
  connect(
    $7,
    $1,
    {
      label: "f",
      color: "red",
      coord: [2, 2]
    },
    invalidation
  );
  connect(
    $8,
    $1,
    {
      label: "g",
      color: "red",
      coord: [3, 2]
    },
    invalidation
  );
};
const _brubvh = function _program(Inputs,initialProgram){return(
Inputs.input(initialProgram)
)};
const _k3t72m = (G, _) => G.input(_);
const _10b0p10 = function _syncSampleOptions(wiring,bindOneWay,$0,$1)
{
  wiring;
  bindOneWay($0.options, $1, {
    transform: (s) => Object.keys(s)
  });
};
const _13blhg3 = function _syncSequencerToProgram(selectedSample,buttons64,downColor,offColor,$0,Event)
{
  console.log("syncSequencerToProgram");
  if (!selectedSample.result) return;
  const triggers = [];
  for (let t = 0; t < 64; t++) {
    if (buttons64[t].element.down ^ (buttons64[t].element.color == downColor)) {
      triggers.push(t);
      buttons64[t].element.color = downColor;
    } else {
      buttons64[t].element.color = offColor;
    }
  }
  // Output is derived from button states
  $0.value.triggers[selectedSample.result] = triggers;
  $0.dispatchEvent(new Event("input", { bubbles: true }));
  return triggers;
};
const _kahz7l = function _syncSamplesToProgram(t,samples,$0,Event,program)
{
  t;
  let dirty = false;
  Object.entries(samples).forEach(([name, sampler]) => {
    Object.entries(sampler.value).forEach(([key, value]) => {
      if (key == "playing") {
      } else if (key == "arrayBuffer") {
      } else if ($0.value.samples[name][key] !== value) {
        debugger;
        $0.value.samples[name][key] = value;
        dirty = true;
      }
    });
  });
  if (dirty) {
    $0.dispatchEvent(new Event("input"));
  }
  return program.samples;
};
const _1jcgxmf = function _syncInitialProgramToSequencer(syncSampleOptions,$0,$1,offColor,initialProgram,selectedSample,downColor)
{
  syncSampleOptions;
  if (!$0.value.result) return;
  console.log("syncInitialProgramToSequencer");
  // Clear all
  for (let t = 0; t < 64; t++) {
    $1.value[t].element.down = false;
    $1.value[t].element.color = offColor;
  }
  // Load selected program onto display
  initialProgram.triggers[selectedSample.result].forEach((t) => {
    $1.value[t].element.color = downColor;
  });
  return initialProgram.triggers;
};
const _ojheey = function _syncInitialProgramToSamples(initialProgram,attachments,samples)
{
  console.log("syncInitialProgramToSamples");

  Object.entries(initialProgram.samples).forEach(([name, config]) => {
    Object.entries(config).forEach(([key, value]) => {
      if (key == "file") {
        attachments
          .get(value)
          .arrayBuffer()
          .then((buffer) => {
            samples[name].value["arrayBuffer"] = buffer;
          });
      } else {
        samples[name].value[key] = value;
      }
    });
  });

  return initialProgram.samples;
};
const _4rp9xg = function _syncTimeToSequencer(t,$0,borderColor,nowBorderColor)
{
  if (!t) return;
  $0.value[(t - 1) % 64].element.border = borderColor;
  $0.value[t % 64].element.border = nowBorderColor;
};
const _1xhrttn = function _39(md){return(
md`## Timing`
)};
const _ddb5qq = function _LOOKAHEAD(){return(
4
)};
const _xlwlas = function _next(){return(
(sequence, { t = 0, lookahead = 1, steps = 64 } = {}) => {
  const result = [];
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] < t % steps) {
    } else if (sequence[i] >= (t + lookahead) % steps) {
      return result;
    } else {
      result.push(sequence[i] + Math.floor(t / steps) * steps);
    }
  }
  return result;
}
)};
const _1ymfkoh = async function* _t(bpm,$0,audioContext,play,Promises)
{
  let t = this || 0;
  const t_start = Date.now() - (t * (60 * 1000)) / (bpm * 8);
  $0.value = audioContext.currentTime - (t * 60) / (bpm * 8);
  while (play) {
    yield t;
    let next_t = t;
    do {
      next_t = next_t + 1;
      var next_millis = t_start + (next_t * (60 * 1000)) / (bpm * 8);
    } while (next_millis < Date.now());
    await Promises.delay(next_millis - Date.now());
    t = next_t;
  }
  return yield t;
};
const _10mz3qk = function _slice(play,t,LOOKAHEAD,$0,next)
{
  if (!play) {
    // This block resets the slice state when play is toggled
    return {
      t_start: t,
      t_end: t,
      frame: {}
    };
  }
  const t_start = this?.t_end || t;
  const t_end = Math.min(t + LOOKAHEAD, t_start + LOOKAHEAD); // TODO wrapping bug here
  return {
    t_start,
    t_end,
    frame: Object.fromEntries(
      Object.keys($0.value.triggers).map((sample) => [
        sample,
        next($0.value.triggers[sample], {
          t: t_start,
          lookahead: t_end - t_start
        })
      ])
    )
  };
};
const _17omuq6 = function _audioStart(audioContext){return(
audioContext.currentTime
)};
const _2ol5ss = (M, _) => new M(_);
const _1nqpil1 = _ => _.generator;
const _198j17a = function _stepToAudio($0,bpm){return(
(step) => {
  return $0.value + (step * 60) / (bpm * 8);
}
)};
const _1xmw0rv = function _syncSliceToDPM(slice,samples,stepToAudio,buttons4x4,$0,nowBorderColor,borderColor)
{
  Object.keys(slice.frame).map((sample) => {
    if (!samples[sample]) return;

    slice.frame[sample].forEach((step) => {
      samples[sample].value.playing = stepToAudio(step);
    });
    const dpmCord = samples[sample].dpmCord;
    if (!buttons4x4[dpmCord]) return;
    $0[dpmCord].value.element.border =
      slice.frame[sample].length > 0 ? nowBorderColor : borderColor;
  });
};
const _1v4m248 = function _47(md){return(
md`#### Connect a sample to a pad`
)};
const _18h1rw9 = function _samples(Inputs){return(
Inputs.input({})
)};
const _odfq05 = (G, _) => G.input(_);
const _nf5fuj = function _49($0){return(
$0.value
)};
const _2011ma = function _connect(offColor,$0,Event,downColor){return(
(sample, dpm, { label, coord, color } = {}, invalidation) => {
  const dpmCord = `${coord[0]} ${coord[1]}`;
  const btn = dpm[dpmCord].element;
  btn.value.color = color || offColor;
  sample.dpmCord = dpmCord;
  $0.value = { ...$0.value, [label]: sample };
  $0.dispatchEvent(new Event("input", { bubbles: true }));

  const trigger = () => {
    const down = btn.down.value;
    btn.value.color = down ? downColor : color || offColor;
    if (down) sample.value.playing = true;
  };
  btn.addEventListener("input", trigger);
  invalidation.then(() => btn.removeEventListener("input", trigger));
}
)};
const _sf8mmj = function _51(md){return(
md`### FastBtn

- Multi-touch, event raised *on touch down* for lowest latency
- Reactive border color and main color
`
)};
const _3ukx5y = function _52(html){return(
html`<style>
  .small {
      width: var(--gridSize);
      height: var(--gridSize);
  }
  .large {
      width: calc(var(--gridSize) * 3);
      height: calc(var(--gridSize) * 3);
  }
  .sequencer-btn {
      border-radius: 10px;
  }
</style>`
)};
const _pgmg5j = function _fastBtnExample(fastBtn){return(
fastBtn()
)};
const _1lbbc9s = (G, _) => G.input(_);
const _1ev3se = function _fastBtn(variable,offColor,borderColor,Event,view){return(
({ label = undefined, size = "small" } = {}) => {
  const labelVar = variable(label, { name: "label" });
  const colorVar = variable(offColor, { name: "color" });
  const borderVar = variable(borderColor, { name: "color" });
  const downVar = variable(false, { name: "down" });
  const down = (e) => {
    e.preventDefault();
    downVar.value = true;
    downVar.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const up = (e) => {
    e.preventDefault();
    downVar.value = false;
    downVar.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const ui = view`<div><button
                          onmousedown=${down} ontouchstart=${down}
                          onmouseup=${up} ontouchend=${up}
                          onclick=${(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          class="sequencer-btn ${size}">
    ${["label", labelVar]}
    ${["down", downVar]}
    ${["color", colorVar]}
    ${["border", borderVar]}
  `;
  const btn = ui.querySelector(".sequencer-btn");
  const updateColor = () => {
    btn.style.backgroundColor = colorVar.value;
  };
  const updateBorder = () => {
    btn.style.borderColor = borderVar.value;
  };
  colorVar.addEventListener("assign", updateColor);
  updateColor();
  borderVar.addEventListener("assign", updateBorder);
  updateBorder();
  return ui;
}
)};
const _1swl606 = function _55(md){return(
md`### Colors`
)};
const _1cyk3l3 = function _offColor(Inputs){return(
Inputs.color({ label: "off", value: "#000" })
)};
const _1daqazo = (G, _) => G.input(_);
const _7vmkgm = function _downColor(Inputs){return(
Inputs.color({ label: "down", value: "#c78fff" })
)};
const _1w70gh5 = (G, _) => G.input(_);
const _5l63us = function _nowBorderColor(Inputs){return(
Inputs.color({ label: "now border", value: "#ff7575" })
)};
const _15zr4wd = (G, _) => G.input(_);
const _1962cyk = function _borderColor(Inputs){return(
Inputs.color({ label: "border", value: "#fff0f0" })
)};
const _rzgtar = (G, _) => G.input(_);
const _1863wd8 = function _audioContext(webaudioPolyfill){return(
webaudioPolyfill, new AudioContext()
)};
const _o31b49 = async function _silence(sample,audioContext,FileAttachment){return(
sample({
  gain: 0,
  audioContext,
  arrayBuffer: await FileAttachment("silence.wav").arrayBuffer()
})
)};
const _zhqvp = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["silence.wav","CHH05.mp3","Chord01_G.mp3","Clap01.mp3","Snap02.mp3","OHH02.mp3","Kick01.mp3","program01.json"].map((name) => {
    const module_name = "@tomlarkworthy/sequencer";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/audio-inputs", async () => runtime.module((await import("/@tomlarkworthy/audio-inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/grid@1105", async () => runtime.module((await import("/@tomlarkworthy/grid@1105.js?v=4")).default));  
  main.define("module @tomlarkworthy/juice", async () => runtime.module((await import("/@tomlarkworthy/juice.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  $def("_1pgepdm", null, ["md"], _1pgepdm);  
  $def("_sgxmcd", "viewof play", ["Inputs","viewof silence","Event","invalidation"], _sgxmcd);  
  $def("_ko3veu", "play", ["Generators","viewof play"], _ko3veu);  
  $def("_wuh68g", "viewof bpm", ["Inputs"], _wuh68g);  
  $def("_w2pv3n", "bpm", ["Generators","viewof bpm"], _w2pv3n);  
  $def("_3znpnd", "viewof selectedSample", ["juice","Inputs"], _3znpnd);  
  $def("_4d6jyj", "selectedSample", ["Generators","viewof selectedSample"], _4d6jyj);  
  $def("_7oz61e", "viewof buttons64", ["fastBtn","grid"], _7oz61e);  
  $def("_12wric5", "buttons64", ["Generators","viewof buttons64"], _12wric5);  
  $def("_ktf5ev", "viewof buttons4x4", ["fastBtn","grid"], _ktf5ev);  
  $def("_1o65rxb", "buttons4x4", ["Generators","viewof buttons4x4"], _1o65rxb);  
  $def("_1xcdr0v", null, ["md"], _1xcdr0v);  
  $def("_jse95g", "viewof kick01", ["sample","audioContext","FileAttachment"], _jse95g);  
  $def("_epidcd", "kick01", ["Generators","viewof kick01"], _epidcd);  
  $def("_1hbw8wd", null, ["md"], _1hbw8wd);  
  $def("_1su7l60", "viewof clap01", ["sample","audioContext","FileAttachment"], _1su7l60);  
  $def("_1tqhsuh", "clap01", ["Generators","viewof clap01"], _1tqhsuh);  
  $def("_aafff7", null, ["md"], _aafff7);  
  $def("_bwosas", "viewof snap02", ["sample","audioContext","FileAttachment"], _bwosas);  
  $def("_11lt4mi", "snap02", ["Generators","viewof snap02"], _11lt4mi);  
  $def("_161wwye", null, ["md"], _161wwye);  
  $def("_1ewjfk4", "viewof ohh02", ["sample","audioContext","FileAttachment"], _1ewjfk4);  
  $def("_986ep5", "ohh02", ["Generators","viewof ohh02"], _986ep5);  
  $def("_tkxnkt", null, ["md"], _tkxnkt);  
  $def("_tbd71w", "viewof chh05", ["sample","audioContext","FileAttachment"], _tbd71w);  
  $def("_efocjc", "chh05", ["Generators","viewof chh05"], _efocjc);  
  $def("_1t6nz9o", null, ["md"], _1t6nz9o);  
  $def("_1whgrqx", "viewof c", ["sample","audioContext","FileAttachment"], _1whgrqx);  
  $def("_5gdu53", "c", ["Generators","viewof c"], _5gdu53);  
  $def("_9ql2jd", null, ["md"], _9ql2jd);  
  $def("_1rgoe40", "viewof f", ["sample","audioContext","FileAttachment"], _1rgoe40);  
  $def("_a80e20", "f", ["Generators","viewof f"], _a80e20);  
  $def("_1snwyb5", null, ["md"], _1snwyb5);  
  $def("_gumgqz", "viewof g", ["sample","audioContext","FileAttachment"], _gumgqz);  
  $def("_103yb1v", "g", ["Generators","viewof g"], _103yb1v);  
  $def("_6cst5v", null, ["exporter"], _6cst5v);  
  $def("_1xypljo", "viewof initialProgram", ["FileAttachment","Inputs"], _1xypljo);  
  $def("_apj1mk", "initialProgram", ["Generators","viewof initialProgram"], _apj1mk);  
  $def("_aqwhdn", null, ["html","program"], _aqwhdn);  
  $def("_1uuabk", null, ["md"], _1uuabk);  
  $def("_131yd3f", "viewof module", ["thisModule"], _131yd3f);  
  $def("_th6e4k", "module", ["Generators","viewof module"], _th6e4k);  
  $def("_ado95j", "save_program", ["setFileAttachment","jsonFileAttachment","program","module"], _ado95j);  
  $def("_1afyn8r", "attachments", ["getFileAttachments","module"], _1afyn8r);  
  $def("_wkewba", null, ["md"], _wkewba);  
  $def("_11l1yx0", "wiring", ["connect","viewof kick01","viewof buttons4x4","invalidation","viewof clap01","viewof snap02","viewof ohh02","viewof chh05","viewof c","viewof f","viewof g"], _11l1yx0);  
  $def("_brubvh", "viewof program", ["Inputs","initialProgram"], _brubvh);  
  $def("_k3t72m", "program", ["Generators","viewof program"], _k3t72m);  
  $def("_10b0p10", "syncSampleOptions", ["wiring","bindOneWay","viewof selectedSample","viewof samples"], _10b0p10);  
  $def("_13blhg3", "syncSequencerToProgram", ["selectedSample","buttons64","downColor","offColor","viewof program","Event"], _13blhg3);  
  $def("_kahz7l", "syncSamplesToProgram", ["t","samples","viewof program","Event","program"], _kahz7l);  
  $def("_1jcgxmf", "syncInitialProgramToSequencer", ["syncSampleOptions","viewof selectedSample","viewof buttons64","offColor","initialProgram","selectedSample","downColor"], _1jcgxmf);  
  $def("_ojheey", "syncInitialProgramToSamples", ["initialProgram","attachments","samples"], _ojheey);  
  $def("_4rp9xg", "syncTimeToSequencer", ["t","viewof buttons64","borderColor","nowBorderColor"], _4rp9xg);  
  $def("_1xhrttn", null, ["md"], _1xhrttn);  
  $def("_ddb5qq", "LOOKAHEAD", [], _ddb5qq);  
  $def("_xlwlas", "next", [], _xlwlas);  
  $def("_1ymfkoh", "t", ["bpm","mutable audioStart","audioContext","play","Promises"], _1ymfkoh);  
  $def("_10mz3qk", "slice", ["play","t","LOOKAHEAD","viewof program","next"], _10mz3qk);  
  $def("_17omuq6", "initial audioStart", ["audioContext"], _17omuq6);  
  $def("_2ol5ss", "mutable audioStart", ["Mutable","initial audioStart"], _2ol5ss);  
  $def("_1nqpil1", "audioStart", ["mutable audioStart"], _1nqpil1);  
  $def("_198j17a", "stepToAudio", ["mutable audioStart","bpm"], _198j17a);  
  $def("_1xmw0rv", "syncSliceToDPM", ["slice","samples","stepToAudio","buttons4x4","viewof buttons4x4","nowBorderColor","borderColor"], _1xmw0rv);  
  $def("_1v4m248", null, ["md"], _1v4m248);  
  $def("_18h1rw9", "viewof samples", ["Inputs"], _18h1rw9);  
  $def("_odfq05", "samples", ["Generators","viewof samples"], _odfq05);  
  $def("_nf5fuj", null, ["viewof buttons4x4"], _nf5fuj);  
  $def("_2011ma", "connect", ["offColor","viewof samples","Event","downColor"], _2011ma);  
  $def("_sf8mmj", null, ["md"], _sf8mmj);  
  $def("_3ukx5y", null, ["html"], _3ukx5y);  
  $def("_pgmg5j", "viewof fastBtnExample", ["fastBtn"], _pgmg5j);  
  $def("_1lbbc9s", "fastBtnExample", ["Generators","viewof fastBtnExample"], _1lbbc9s);  
  $def("_1ev3se", "fastBtn", ["variable","offColor","borderColor","Event","view"], _1ev3se);  
  $def("_1swl606", null, ["md"], _1swl606);  
  $def("_1cyk3l3", "viewof offColor", ["Inputs"], _1cyk3l3);  
  $def("_1daqazo", "offColor", ["Generators","viewof offColor"], _1daqazo);  
  $def("_7vmkgm", "viewof downColor", ["Inputs"], _7vmkgm);  
  $def("_1w70gh5", "downColor", ["Generators","viewof downColor"], _1w70gh5);  
  $def("_5l63us", "viewof nowBorderColor", ["Inputs"], _5l63us);  
  $def("_15zr4wd", "nowBorderColor", ["Generators","viewof nowBorderColor"], _15zr4wd);  
  $def("_1962cyk", "viewof borderColor", ["Inputs"], _1962cyk);  
  $def("_rzgtar", "borderColor", ["Generators","viewof borderColor"], _rzgtar);  
  $def("_1863wd8", "audioContext", ["webaudioPolyfill"], _1863wd8);  
  $def("_o31b49", "viewof silence", ["sample","audioContext","FileAttachment"], _o31b49);  
  $def("_zhqvp", "silence", ["Generators","viewof silence"], _zhqvp);  
  main.define("main", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("main", _));  
  main.define("getFileAttachments", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachments", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("sample", ["module @tomlarkworthy/audio-inputs", "@variable"], (_, v) => v.import("sample", _));  
  main.define("webaudioPolyfill", ["module @tomlarkworthy/audio-inputs", "@variable"], (_, v) => v.import("webaudioPolyfill", _));  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("variable", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("variable", _));  
  main.define("bindOneWay", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("bindOneWay", _));  
  main.define("grid", ["module @tomlarkworthy/grid@1105", "@variable"], (_, v) => v.import("grid", _));  
  main.define("juice", ["module @tomlarkworthy/juice", "@variable"], (_, v) => v.import("juice", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));
  return main;
}