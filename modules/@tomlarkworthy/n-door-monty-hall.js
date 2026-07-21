const _1dwezzj = function _1(md){return(
md`# N-door Monty Hall

The Monty Hall Problem:

A gameshow host asks you to pick a door. It is not opened.
Next, the gameshow host opens a different door NOT containing a prize.
You get to pick a door again, should you switch from your original guess?

This application lets you try different amounts of doors and keeps track of the win ratio and whether you swapped or not for you (using [Plot](https://observablehq.com/@observablehq/plot)).

`
)};
const _smuq4s = function _game(Inputs,viewroutine,pickDoor,view)
{
  const n = Inputs.range([3, 20], {
    value: 3,
    step: 1,
    label: "Number of doors (applies on game cycle)"
  });
  const doors = viewroutine(async function*() {
    const history = new Map();
    while (true) {
      const nChosen = n.value;
      let state = {
        history,
        doors: Array(nChosen).fill("closed")
      };
      let prize = Math.floor(Math.random() * state.doors.length);
      let firstPick = yield* pickDoor(state);
      // Open other doors not the prize and not the one picked
      let otherDoor = prize;
      while (otherDoor === firstPick) {
        otherDoor = Math.floor(Math.random() * state.doors.length);
      }
      state.doors = state.doors.map((s, index) =>
        index === otherDoor || index === firstPick ? "closed" : "openingEmpty"
      );
      let secondPick = yield* pickDoor(state);
      const swapped = secondPick !== firstPick;
      state.doors = state.doors.map(s => (s === "openingEmpty" ? "empty" : s));
      state.doors[secondPick] =
        secondPick === prize ? "openingPrize" : "openingEmpty";
      yield* pickDoor(state);
      const won = secondPick === prize;
      const historyKey = JSON.stringify([swapped, nChosen]);
      if (!history.has(historyKey)) {
        history.set(historyKey, { n: 0, w: 0 });
      }
      console.log(
        history,
        historyKey,
        history.has(historyKey),
        history.get(historyKey)
      );
      if (won) history.get(historyKey).w++;
      history.get(historyKey).n++;
    }
  });
  return view`<div>
    ${n}
    ${doors}
  </div>`;
};
const _pelkcy = (G, _) => G.input(_);
const _1bonxai = function _pickDoor(doorButtons){return(
async function*(doors) {
  let notify;
  const result = new Promise(resolve => (notify = resolve));
  yield doorButtons(doors, notify);
  return await result;
}
)};
const _h6spje = function _doorButtons(promiseRecursive,FileAttachment,viewroutine,openEmptyDoor,invalidation,openPrizeDoor,htl,Plot){return(
async ({ doors, history } = {}, notify) => {
  const imgs = await promiseRecursive(
    doors.map(door => {
      if (door === 'closed') return FileAttachment("e0@1.jpg").image();
      if (door === 'empty') return FileAttachment("e3@1.jpg").image();
      if (door === 'prize') return FileAttachment("b3@1.jpg").image();
    })
  );
  const buttons = doors.map((door, i) =>
    door === 'closed'
      ? ((imgs[i].onclick = () => notify(i)), imgs[i])
      : door === 'openingEmpty'
      ? viewroutine(openEmptyDoor.bind(null, invalidation))
      : door === 'openingPrize'
      ? viewroutine(openPrizeDoor.bind(null, invalidation))
      : imgs[i]
  );
  const processed = [...history.keys()].map(key => {
    const [swapped, n] = JSON.parse(key);
    return {
      n,
      swapped,
      win_rate: history.get(key).w / history.get(key).n
    };
  });
  return htl.html`<div>
    <style>
      .game {
        display:flex;
        width: 100%
      }
      .game > img,.game > span {
        width: 1px;
        flex-grow: 1;
        flex-shrink: 1;
      }
      .game > span > img {
        width: 100%;
      }
    </style>
    <div>
      ${Plot.plot({
        y: {
          domain: [0, 1]
        },
        color: {
          domain: [false, true]
        },
        x: {
          domain: [false, true]
        },
        facet: {
          data: processed,
          x: "n"
        },
        height: 200,
        marks: [
          Plot.barY(processed, {
            x: "swapped",
            y: "win_rate",
            fill: 'swapped'
          }),
          Plot.ruleY([0])
        ]
      })}
    </div>
    <div class="game">
      ${buttons}
    </div>
  </div>`;
}
)};
const _2nbnan = function _openEmptyDoor(FileAttachment,Promises){return(
async function* openEmptyDoor(finish) {
  yield FileAttachment("e0@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("e1@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("e2@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("e3@1.jpg").image();
  await finish;
}
)};
const _d5zlxs = function _openPrizeDoor(FileAttachment,Promises){return(
async function* openPrizeDoor(finish) {
  yield FileAttachment("b0@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("b1@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("b2@1.jpg").image();
  await Promises.delay(200);
  yield FileAttachment("b3@1.jpg").image();
  await finish;
}
)};
const _1pgxkx1 = function _7(md){return(
md`The animations are quicker to load if you run through it once`
)};
const _iinh52 = function _8(openPrizeDoor){return(
openPrizeDoor()
)};
const _hskn1r = function _9(openEmptyDoor){return(
openEmptyDoor()
)};
const _8v798g = function _14(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["e1@1.jpg","e2@1.jpg","b1@1.jpg","b2@1.jpg","b0@1.jpg","e3@1.jpg","b3@1.jpg","e0@1.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/n-door-monty-hall";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/viewroutine", async () => runtime.module((await import("/@tomlarkworthy/viewroutine.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/utils", async () => runtime.module((await import("/@tomlarkworthy/utils.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1dwezzj", null, ["md"], _1dwezzj);  
  $def("_smuq4s", "viewof game", ["Inputs","viewroutine","pickDoor","view"], _smuq4s);  
  $def("_pelkcy", "game", ["Generators","viewof game"], _pelkcy);  
  $def("_1bonxai", "pickDoor", ["doorButtons"], _1bonxai);  
  $def("_h6spje", "doorButtons", ["promiseRecursive","FileAttachment","viewroutine","openEmptyDoor","invalidation","openPrizeDoor","htl","Plot"], _h6spje);  
  $def("_2nbnan", "openEmptyDoor", ["FileAttachment","Promises"], _2nbnan);  
  $def("_d5zlxs", "openPrizeDoor", ["FileAttachment","Promises"], _d5zlxs);  
  $def("_1pgxkx1", null, ["md"], _1pgxkx1);  
  $def("_iinh52", null, ["openPrizeDoor"], _iinh52);  
  $def("_hskn1r", null, ["openEmptyDoor"], _hskn1r);  
  main.define("viewroutine", ["module @tomlarkworthy/viewroutine", "@variable"], (_, v) => v.import("viewroutine", _));  
  main.define("ask", ["module @tomlarkworthy/viewroutine", "@variable"], (_, v) => v.import("ask", _));  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("promiseRecursive", ["module @tomlarkworthy/utils", "@variable"], (_, v) => v.import("promiseRecursive", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_8v798g", null, ["footer"], _8v798g);
  return main;
}