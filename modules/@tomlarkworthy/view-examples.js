const _173tfmw = function _1(md){return(
md`# View Composition Examples


Here we play _view_ template literal and related techniques. The _view_ literal lets you build components heirarchically. Its _closed_. Each construction is also a _view_ and can be placed inside another _view_ literal.

Because each view is a multi-level views, the system plays very well with _Inputs.bind_. You can _bind_ to not jus tthe root view, but also individual fields in the composite. This allows interesting and programatic cross-wiring across sibling cells. I think of _bind_ as dimension reduction. What was once two free parameters becomes one after binding.

Well written _views_ are back-writable (and _view_ template literal does this for you). Using back-writability, we can acheive business-presentation logic seperation. Simply have the business logic in a different cell manipulating the presentation parameters view writes.

Because data updates propogate in a different logical channel to the presentation code channel, we can acheive good performance by targetted manipulation of DOM nodes on data changes. In this notebook we use _reconcile_ which probably is not as effecient as possible, but fairly trivial to implement.



`
)};
const _11kje0 = function _4(md){return(
md`## Heirarchical Composition`
)};
const _ylhxig = function _5(md){return(
md`### Isosceles

Create a parameterized shape in 3D.
`
)};
const _1w131ta = function _isosceles(DOM,variable,reconcile,viewSvg){return(
({ w = 100, l = 100, color = "#0000FF" } = {}) => {
  // TODO: Pass in variable
  const id = DOM.uid().id; // A uid helps reconcile's matcher.
  const wVar = variable(w).onWrite(() => reconcile(me, render()));
  const lVar = variable(l).onWrite(() => reconcile(me, render()));
  const colorVar = variable(color, () => reconcile(me, render()));
  const render = () =>
    viewSvg`<polygon id=${id} fill=${colorVar} points=
      "${wVar.value / 2} 0, 0 ${lVar.value}, ${-wVar.value / 2} 0"
    ><!-- ${["w", wVar]} ${["l", lVar]} ${["color", colorVar]} -->`; // TODO, better way to bind dummies
  const me = render();
  return me;
}
)};
const _5ozs1i = function _isoscelesFabian(DOM,propsToVars,reconcile,htl){return(
({
  w = 100 /* TODO Could we pass in a variable here and bind to it automgically*/,
  l = 100,
  color = "#0000FF"
} = {}) => {
  const id = DOM.uid().id; // A uid helps reconcile's matcher.
  const vars = propsToVars({ w, l, color }, () => reconcile(me, render(vars)));
  const render = ({ color, w, l }) =>
    htl.svg`<polygon id=${id} fill=${color} points=
      "${w / 2} 0, 0 ${l}, ${-w / 2} 0"
    ></polygon>`;
  const me = render(vars);
  console.log("me", me.w);
  me.value = {};
  Object.entries(vars).forEach(([name, variable]) => {
    Object.defineProperty(me, name, {
      get: () => variable,
      set: (v) => (variable = v),
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(me.value, name, {
      get: () => variable.value,
      set: (v) => (variable.value = v),
      enumerable: true,
      configurable: true
    });
  });
  return me;
}
)};
const _z1p57j = function _propsToVars(variable){return(
(obj, onWrite) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, variable(v).onWrite(onWrite)]))
)};
const _1weu1e5 = function _testIsosceles(isosceles){return(
isosceles()
)};
const _a0r3fc = (G, _) => G.input(_);
const _1il0jj4 = function _10($0){return(
$0.values
)};
const _1hocn15 = function _11(md){return(
md`The _viewof_ is an SVG element`
)};
const _59u4zq = function _12($0){return(
$0.outerHTML
)};
const _xpiw37 = function _13(md){return(
md`The data is the parameters, which are individually backwritable`
)};
const _1viw3mt = function _14(testIsosceles){return(
testIsosceles.w
)};
const _1rb0t92 = function _15(md){return(
md`#### View nesting`
)};
const _1trg4y2 = function _16(md){return(
md`We can embed views inside other views with the view literal`
)};
const _1x8e8zi = function _17(htl,$0){return(
htl.svg`<svg width="100px" viewBox="-200 -200 400 400">
  ${$0}
`
)};
const _1vemwlm = function _18(md){return(
md`We can add a UI to a view by binding to sibling views`
)};
const _128nnv5 = function _19(md){return(
md`#### Bind a single control to a single field of the component`
)};
const _2f0bpp = function _sigleWidth(Inputs,$0){return(
Inputs.bind(
  Inputs.range([0, 1000], { label: "width", value: 10 }),
  $0.w
)
)};
const _1yn64fm = (G, _) => G.input(_);
const _h3erc9 = function _21(testIsosceles){return(
testIsosceles.w
)};
const _c2srg1 = function _22(md){return(
md`#### Bind a composite control to the whole component`
)};
const _1dr6zrw = function _dartLook(Inputs,view,colorPicker,$0){return(
Inputs.bind(
  view`<div style="height: 100px">
  ${["w", Inputs.range([0, 1000], { label: "width" })]}
  ${["l", Inputs.range([0, 1000], { label: "length" })]}
  ${
    [
      "color",
      colorPicker($0.color.value)
    ] /* Manual fix for non backwritability */
  }
`,
  $0
)
)};
const _5jci6m = (G, _) => G.input(_);
const _rsgz6r = function _24(testIsosceles){return(
testIsosceles
)};
const _mezhl9 = function _25(md){return(
md`#### Programatically manipulate parameters

The parameters are backwritable too
`
)};
const _1kdm7mg = function _26($0,Event)
{
  $0.w.value = 20;
  $0.l.value = 50;
  $0.w.dispatchEvent(new Event('input', { bubbles: true })); // TODO bubbling broke?
  $0.dispatchEvent(new Event('input', { bubbles: true }));
};
const _1tpj157 = function _27(md){return(
md`### Transform

Create a parameterized transform. The useful thing is that we can minimize recomputation of the DOM stable for changes in transform parameters.
`
)};
const _tkuryv = function _transform(DOM,variable,reconcile,viewSvg){return(
({ tx = 0, ty = 0, sx = 1, sy = 1, angle = 0, inner } = {}) => {
  const id = DOM.uid().id;
  const txVar = variable(tx).onWrite(() => reconcile(me, render()));
  const tyVar = variable(ty).onWrite(() => reconcile(me, render()));
  const sxVar = variable(sx).onWrite(() => reconcile(me, render()));
  const syVar = variable(sy).onWrite(() => reconcile(me, render()));
  const aVar = variable(angle).onWrite(() => reconcile(me, render()));
  const render = () =>
    viewSvg`<g id=${id} transform="
        translate(${["tx", txVar]} ${["ty", tyVar]})
        scale(${["sx", sxVar]} ${["sy", syVar]})
        rotate(${["angle", aVar]})">
      ${["inner", inner]}
    </g>`;
  const me = render();
  return me;
}
)};
const _cywlh1 = function _testTransform(transform,isosceles){return(
transform({ inner: isosceles(), tx: 100 })
)};
const _11kknb2 = (G, _) => G.input(_);
const _1x8p4vu = function _30(testTransform){return(
testTransform
)};
const _3eto2x = function _31($0){return(
$0
)};
const _1u6nvjk = function _32($0){return(
$0.outerHTML
)};
const _kgm62 = function _33(htl,$0){return(
htl.svg`<svg width="100" viewBox="-100 -100 200 200">
  ${$0}
`
)};
const _1gqo4c = function _34(md){return(
md`#### Bind to Controls`
)};
const _4m14qa = function _35(view,Inputs,$0,colorPicker){return(
view`<div style="height: 250px">
  ${Inputs.bind(
    Inputs.range([0, 200], { label: "tx" }),
    $0.tx
  )}
  ${Inputs.bind(
    Inputs.range([-100, 200], { label: "ty" }),
    $0.ty
  )}
  ${Inputs.bind(
    Inputs.range([0, 5], { label: "scale x" }),
    $0.sx
  )}
  ${Inputs.bind(
    Inputs.range([0, 5], { label: "scale y" }),
    $0.sy
  )}
  ${Inputs.bind(
    Inputs.range([-360, 360], { label: "angle" }),
    $0.angle
  )}
  ${Inputs.bind(
    Inputs.range([-100, 200], { label: "width" }),
    $0.inner.w
  )}
  ${Inputs.bind(
    Inputs.range([-100, 200], { label: "length" }),
    $0.inner.l
  )}
  ${Inputs.bind(
    colorPicker($0.inner.color.value),
    $0.inner.color
  )}
`
)};
const _u39p50 = function _36(md){return(
md`## Arrays

`
)};
const _1286urg = function _arrayOfSlider(md){return(
md`#### Array of sliders`
)};
const _1jezfct = function _arrayControl(view,Inputs){return(
view`<div style="display: flex">
  <table>
  ${[
    "r",
    // Its slightly annoying we have to bind the inner control to a property
    new Array(10).fill(null).map((r, i) => {
      return view`<tr>
        <td>${[
          "v",
          Inputs.range([0, 10], { label: `r[${i}].v`, value: i })
        ]}</td>
      </tr>`;
    })
  ]}
  </table>
</div>`
)};
const _17j26tq = (G, _) => G.input(_);
const _1vr5fml = function _39(arrayControl){return(
arrayControl
)};
const _qwc8ip = function _40($0){return(
$0
)};
const _eby97o = function _41(md){return(
md`### Coordinating arrays`
)};
const _1kdbks4 = function _dartParams(view,Inputs){return(
view`
  ${[
    "n",
    Inputs.range([0, 1000], {
      label: "number of darts",
      value: 50,
      step: 1
    })
  ]}

  ${[
    "v",
    Inputs.range([0, 100], {
      label: "velocity of darts",
      value: 5
    })
  ]}
`
)};
const _15nq5uz = (G, _) => G.input(_);
const _wqqrm = function _43(md){return(
md`## Fullsize world`
)};
const _5hm55a = function _world(viewSvg,width,documentHeight,dartParams,isosceles,Inputs,$0,invalidation,transform){return(
viewSvg`<svg style="position: fixed; top: 0px; botom:0px;" width="${width}" height=${documentHeight} viewBox="0 0 ${width} ${documentHeight}" pointer-events="none">
  ${[
    "darts",
    new Array(dartParams.n).fill(null).map((_, i) => {
      const dart = isosceles({
        color: `hsla(${(i * 360) / dartParams.n},100%, 50%, 20%)`
      });
      Inputs.bind(dart.w, $0.w, invalidation);
      Inputs.bind(dart.l, $0.l, invalidation);
      return transform({
        inner: dart,
        angle: -(i * 360) / dartParams.n,
        tx: 100 * Math.sin((2 * i * Math.PI) / dartParams.n) + width / 2,
        ty: 100 * Math.cos((2 * i * Math.PI) / dartParams.n) + width / 2
      });
    })
  ]}
`
)};
const _gobpau = (G, _) => G.input(_);
const _1r0a1ry = function _45(world){return(
world
)};
const _7vekpz = function _46($0){return(
$0
)};
const _xccdo6 = function _47(md){return(
md`By puppeteering view data by backwriting from sibling cells, we can seperate logic from presentation`
)};
const _b95x6x = function _dartControl(now,world,dartParams,mousePos)
{
  now;
  world.darts.forEach(dart => {
    dart.tx -= dartParams.v * Math.sin((2 * Math.PI * dart.angle) / 360);
    dart.ty += dartParams.v * Math.cos((2 * Math.PI * dart.angle) / 360);
    const target =
      (Math.atan2(dart.tx - mousePos[0], -dart.ty + mousePos[1]) * 180) /
      Math.PI;
    let error = target - dart.angle;
    while (error > 180) error -= 360;
    while (error < -180) error += 360;

    if (error > 180) error = 360 - error;
    dart.angle += 0.01 * error;
  });
};
const _obcd2f = function _49(md){return(
md`## Temporal Composition

Composing UI across time is a technique used in the games industry under the term of coroutines. Its very useful for creating animation sequences. 
`
)};
const _1k8q2zz = function _50(md){return(
md`### Basic coroutine with a generator`
)};
const _1bj6548 = async function* _coroutineExample(html,Promises)
{
  let t = 0;
  while (true) {
    yield html`<span style="display:inline-block; width:50px;height:50px; background-color: hsl(${(t =
      (t + 5) % 360)}, 50%, 50%);"></span>`;
    await Promises.delay(50);
  }
};
const _14pewcw = (G, _) => G.input(_);
const _izu79e = function _52($0){return(
$0
)};
const _1lkn0sp = function _53(coroutineExample){return(
coroutineExample
)};
const _1lv4yjr = function _54(md){return(
md`### Coroutines are an async function*

(as are cells)
`
)};
const _76i5l2 = function _flashSquare(html,Event,Promises){return(
async function* flashSquare() {
  for (let index = 0; index < 360; index += 5) {
    yield Object.defineProperty(
      html`<span style="display:inline-block; width:50px;height:50px; background-color: hsl(${index}, 50%, 50%);"></span>`,
      'value',
      {
        value: "square"
      }
    );
    if (index === 0) yield new Event("input", { bubbles: true });
    await Promises.delay(10);
  }
  return null; // End coroutine
}
)};
const _i0za0p = function _toView(Event,reconcile){return(
function toView(generator) {
  let current;
  const holder = Object.defineProperty(document.createElement('span'), 'value', {
    get : () => current?.value,
    set : (v) => current ? current.value = v : null,
    enumerable: true
  });
  
  new Promise(async () => {
    const iterator = generator();
    let { done, value } = await iterator.next();
    while (!done) {
      if (value instanceof Event) { 
        holder.dispatchEvent(value);
      } else {
        current = value
        if (value) {
          const span = document.createElement('span');
          span.appendChild(value);
          reconcile(holder, span);
        }
      }
      ({ done, value } = await iterator.next());
    }
    holder.remove();
  });
  return holder;
}
)};
const _15i8376 = function _57(md){return(
md`A noticable difference to Observable cells is the DOM removes itself when the coroutine finishes`
)};
const _88xvcp = function _58(toView,flashSquare){return(
toView(flashSquare)
)};
const _9e0928 = function _59(flashSquare){return(
flashSquare()
)};
const _1nuo2le = async function _square(view,toView,flashSquare){return(
view`<span>${['sqaure', await toView(flashSquare)]}`
)};
const _z4o4z7 = (G, _) => G.input(_);
const _d1tchz = function _61(square){return(
square.square
)};
const _x7ocpe = function _62(md){return(
md`#### Combining coroutines

The power of coroutines is the ability to hold state in the closure, and that they can be sequences together
`
)};
const _jngcdg = function _flashStar(htl,Event,Promises){return(
async function* flashStar() {
  for (let index = 0; index < 360; index += 5) {
    yield Object.defineProperty(
      htl.svg`<svg height="50" width="50" viewbox="0 0 200 200">
        <polygon points="100,10 40,198 190,78 10,78 160,198"
                 style="fill:hsl(${index}, 50%, 50%);" /></svg>`,
      'value',
      {
        value: "star"
      }
    );
    if (index === 0) yield new Event("input", { bubbles: true });
    await Promises.delay(10);
  }
}
)};
const _1sw3otq = function _64(flashStar){return(
flashStar()
)};
const _1kz7qag = function _choose(htl,Event){return(
async function* choose() {
  let resolve;
  yield Object.defineProperty(
    htl.html`<button onclick=${() =>
      resolve('star')}>click to play star</button>
             <button onclick=${() =>
               resolve('square')}>click to play square</button>`,
    'value',
    {
      value: 'undecided'
    }
  );
  yield new Event("input", { bubbles: true });
  return await new Promise(function(_resolve) {
    resolve = _resolve;
  });
}
)};
const _45ho3k = async function _animatedUI(view,toView,choose,flashSquare,flashStar){return(
view`<span>${[
  'choice',
  await toView(async function*() {
    while (true) {
      const choice = yield* choose();
      if (choice == 'square') yield* flashSquare();
      if (choice == 'star') yield* flashStar();
    }
  })
]}`
)};
const _zzrmhf = (G, _) => G.input(_);
const _4dybna = function _67(animatedUI){return(
animatedUI
)};
const _sol4h7 = function _68($0){return(
$0
)};
const _pb8kk0 = function _variable(EventTarget){return(
function variable(value) {
  let onWrites = [];
  const self = new EventTarget();
  return Object.defineProperties(self, {
    value: {
      get: () => value,
      set: newValue => {
        value = newValue;
        onWrites.forEach(onWrite => onWrite(value)); // TODO: use CustomEvent
      },
      enumerable: true
    },
    toString: {
      // Should this be a Text node?
      value: () => `${value}`
    },
    onWrite: {
      value: cb => {
        onWrites.push(cb);
        return self;
      }
    }
  });
}
)};
const _9vhnai = function _documentBody(Generators,ResizeObserver){return(
Generators.observe((notify) => {
  const resizeObserver = new ResizeObserver((entries) =>
    notify(entries[0].target)
  );
  resizeObserver.observe(document.body);
})
)};
const _11b6pvi = function _documentHeight(documentBody){return(
documentBody.clientHeight
)};
const _16y0rgg = function _mousePos(Generators,invalidation){return(
Generators.observe(notify => {
  const pointermoved = e => {
    notify([e.clientX, e.clientY]);
  };
  document.addEventListener("pointermove", pointermoved);
  invalidation.then(() => {
    document.removeEventListener("pointermove", pointermoved);
  });
})
)};
const _15zjzlc = function _76(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reconcile-nanomorph", async () => runtime.module((await import("/@tomlarkworthy/reconcile-nanomorph.js?v=4")).default));  
  main.define("module @tomlarkworthy/colorpicker", async () => runtime.module((await import("/@tomlarkworthy/colorpicker.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_173tfmw", null, ["md"], _173tfmw);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("viewSvg", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("viewSvg", _));  
  main.define("reconcile", ["module @tomlarkworthy/reconcile-nanomorph", "@variable"], (_, v) => v.import("reconcile", _));  
  $def("_11kje0", null, ["md"], _11kje0);  
  $def("_ylhxig", null, ["md"], _ylhxig);  
  $def("_1w131ta", "isosceles", ["DOM","variable","reconcile","viewSvg"], _1w131ta);  
  $def("_5ozs1i", "isoscelesFabian", ["DOM","propsToVars","reconcile","htl"], _5ozs1i);  
  $def("_z1p57j", "propsToVars", ["variable"], _z1p57j);  
  $def("_1weu1e5", "viewof testIsosceles", ["isosceles"], _1weu1e5);  
  $def("_a0r3fc", "testIsosceles", ["Generators","viewof testIsosceles"], _a0r3fc);  
  $def("_1il0jj4", null, ["viewof testIsosceles"], _1il0jj4);  
  $def("_1hocn15", null, ["md"], _1hocn15);  
  $def("_59u4zq", null, ["viewof testIsosceles"], _59u4zq);  
  $def("_xpiw37", null, ["md"], _xpiw37);  
  $def("_1viw3mt", null, ["testIsosceles"], _1viw3mt);  
  $def("_1rb0t92", null, ["md"], _1rb0t92);  
  $def("_1trg4y2", null, ["md"], _1trg4y2);  
  $def("_1x8e8zi", null, ["htl","viewof testIsosceles"], _1x8e8zi);  
  $def("_1vemwlm", null, ["md"], _1vemwlm);  
  $def("_128nnv5", null, ["md"], _128nnv5);  
  $def("_2f0bpp", "viewof sigleWidth", ["Inputs","viewof testIsosceles"], _2f0bpp);  
  $def("_1yn64fm", "sigleWidth", ["Generators","viewof sigleWidth"], _1yn64fm);  
  $def("_h3erc9", null, ["testIsosceles"], _h3erc9);  
  $def("_c2srg1", null, ["md"], _c2srg1);  
  $def("_1dr6zrw", "viewof dartLook", ["Inputs","view","colorPicker","viewof testIsosceles"], _1dr6zrw);  
  $def("_5jci6m", "dartLook", ["Generators","viewof dartLook"], _5jci6m);  
  $def("_rsgz6r", null, ["testIsosceles"], _rsgz6r);  
  $def("_mezhl9", null, ["md"], _mezhl9);  
  $def("_1kdm7mg", null, ["viewof testIsosceles","Event"], _1kdm7mg);  
  $def("_1tpj157", null, ["md"], _1tpj157);  
  $def("_tkuryv", "transform", ["DOM","variable","reconcile","viewSvg"], _tkuryv);  
  $def("_cywlh1", "viewof testTransform", ["transform","isosceles"], _cywlh1);  
  $def("_11kknb2", "testTransform", ["Generators","viewof testTransform"], _11kknb2);  
  $def("_1x8p4vu", null, ["testTransform"], _1x8p4vu);  
  $def("_3eto2x", null, ["viewof testTransform"], _3eto2x);  
  $def("_1u6nvjk", null, ["viewof testTransform"], _1u6nvjk);  
  $def("_kgm62", null, ["htl","viewof testTransform"], _kgm62);  
  $def("_1gqo4c", null, ["md"], _1gqo4c);  
  $def("_4m14qa", null, ["view","Inputs","viewof testTransform","colorPicker"], _4m14qa);  
  $def("_u39p50", null, ["md"], _u39p50);  
  $def("_1286urg", "arrayOfSlider", ["md"], _1286urg);  
  $def("_1jezfct", "viewof arrayControl", ["view","Inputs"], _1jezfct);  
  $def("_17j26tq", "arrayControl", ["Generators","viewof arrayControl"], _17j26tq);  
  $def("_1vr5fml", null, ["arrayControl"], _1vr5fml);  
  $def("_qwc8ip", null, ["viewof arrayControl"], _qwc8ip);  
  $def("_eby97o", null, ["md"], _eby97o);  
  $def("_1kdbks4", "viewof dartParams", ["view","Inputs"], _1kdbks4);  
  $def("_15nq5uz", "dartParams", ["Generators","viewof dartParams"], _15nq5uz);  
  $def("_wqqrm", null, ["md"], _wqqrm);  
  $def("_5hm55a", "viewof world", ["viewSvg","width","documentHeight","dartParams","isosceles","Inputs","viewof dartLook","invalidation","transform"], _5hm55a);  
  $def("_gobpau", "world", ["Generators","viewof world"], _gobpau);  
  $def("_1r0a1ry", null, ["world"], _1r0a1ry);  
  $def("_7vekpz", null, ["viewof world"], _7vekpz);  
  $def("_xccdo6", null, ["md"], _xccdo6);  
  $def("_b95x6x", "dartControl", ["now","world","dartParams","mousePos"], _b95x6x);  
  $def("_obcd2f", null, ["md"], _obcd2f);  
  $def("_1k8q2zz", null, ["md"], _1k8q2zz);  
  $def("_1bj6548", "viewof coroutineExample", ["html","Promises"], _1bj6548);  
  $def("_14pewcw", "coroutineExample", ["Generators","viewof coroutineExample"], _14pewcw);  
  $def("_izu79e", null, ["viewof coroutineExample"], _izu79e);  
  $def("_1lkn0sp", null, ["coroutineExample"], _1lkn0sp);  
  $def("_1lv4yjr", null, ["md"], _1lv4yjr);  
  $def("_76i5l2", "flashSquare", ["html","Event","Promises"], _76i5l2);  
  $def("_i0za0p", "toView", ["Event","reconcile"], _i0za0p);  
  $def("_15i8376", null, ["md"], _15i8376);  
  $def("_88xvcp", null, ["toView","flashSquare"], _88xvcp);  
  $def("_9e0928", null, ["flashSquare"], _9e0928);  
  $def("_1nuo2le", "viewof square", ["view","toView","flashSquare"], _1nuo2le);  
  $def("_z4o4z7", "square", ["Generators","viewof square"], _z4o4z7);  
  $def("_d1tchz", null, ["square"], _d1tchz);  
  $def("_x7ocpe", null, ["md"], _x7ocpe);  
  $def("_jngcdg", "flashStar", ["htl","Event","Promises"], _jngcdg);  
  $def("_1sw3otq", null, ["flashStar"], _1sw3otq);  
  $def("_1kz7qag", "choose", ["htl","Event"], _1kz7qag);  
  $def("_45ho3k", "viewof animatedUI", ["view","toView","choose","flashSquare","flashStar"], _45ho3k);  
  $def("_zzrmhf", "animatedUI", ["Generators","viewof animatedUI"], _zzrmhf);  
  $def("_4dybna", null, ["animatedUI"], _4dybna);  
  $def("_sol4h7", null, ["viewof animatedUI"], _sol4h7);  
  main.define("cautious", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("cautious", _));  
  main.define("colorPicker", ["module @tomlarkworthy/colorpicker", "@variable"], (_, v) => v.import("colorPicker", _));  
  $def("_pb8kk0", "variable", ["EventTarget"], _pb8kk0);  
  $def("_9vhnai", "documentBody", ["Generators","ResizeObserver"], _9vhnai);  
  $def("_11b6pvi", "documentHeight", ["documentBody"], _11b6pvi);  
  $def("_16y0rgg", "mousePos", ["Generators","invalidation"], _16y0rgg);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_15zjzlc", null, ["footer"], _15zjzlc);
  return main;
}