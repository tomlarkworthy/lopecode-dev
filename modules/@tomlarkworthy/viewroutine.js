const _kpo4tb = async function _1(md,FileAttachment){return(
md`# Composing views across time: viewroutine

${await FileAttachment("viewroutine.png").image()}

Sometimes you want to put a sequence of UI steps in a single cell. Using inspiration drawn from Unity and Golang ([_coroutines_](https://docs.unity3d.com/Manual/Coroutines.html) and _goroutines_) checkout the _viewroutine_. A _viewroutine_ leans on Javascript's _async generator functions_ to compose views across time.

~~~
    viewroutine(generator: async function*) => viewof
~~~

The import:-

~~~js
import {viewroutine, ask} from '@tomlarkworthy/viewroutine'
~~~
`
)};
const _17qwhk2 = function _2(md){return(
md`## What is a view again?

A view

- contains a visual DOM component (viewof foo)
- contains a data component (foo) as the value of the visual component (viewof foo.value)
- Emits _input_ events to signal listeners that the data value has changed
- Like all cells, the viewof cell can be a generator as well and be its own stream

(see also https://observablehq.com/@observablehq/introduction-to-views)
`
)};
const _no7041 = function _3(md){return(
md`## What is an async generator?

Async generators
- Have a signature like _async foo*()_
- have intermediate return values in the body with _yield_
- can have a final return value with _return_
- can use _await_ in the body
- can bulk return the results of other generators with _yield*_

(see also https://observablehq.com/@observablehq/introduction-to-generators)

`
)};
const _s9w0xy = function _4(md){return(
md`## Putting it together

The broad idea of a viewroutine, is that an async generator yields a stream of visual components, and we update an overarching span by setting its only child to be those stream of values. Thus, the span becomes a view that doesn't invalidate when the generator yields.

There are a few nice properties with this. You can have variables declared in the closure that are carried between yields. This can often replace the use of an overarching _mutable_ in Observable.

You can compose generators by using the _yield*_ syntax making things compose nicely.

You can on demand and programatically drive the sequence, wait for user input, make choices _etc._ You could probably build an entire app in this way, and it can be decomposed into functional pieces.

One other important aspect of views is programmatic control over when an input event is raised. The viewroutine will emit an event if yielded.  
`
)};
const _o30q5l = function _5(md){return(
md`### Pattern we are trying to fix

We want to avoid stuffing a model into a mutable and asynchronously updating that from a dedicated input cell. It takes up too many cells and the use of mutable has lots of unexpected implications such as not working when imported from other notebooks
`
)};
const _1r0kzfe = function _nameOfThing(){return(
undefined
)};
const _uf7o72 = (M, _) => new M(_);
const _iw386b = _ => _.generator;
const _1at7q4y = function _newName(Inputs){return(
Inputs.text({
  label: "please enter the name of the thing to create",
  submit: true,
  minlength: 1
})
)};
const _1wzqt7z = (G, _) => G.input(_);
const _ed1zta = async function* _sideEffect(md,$0,newName)
{
  yield md`<mark>updating`;
  await new Promise(r => setTimeout(r, 1000));
  $0.value = newName;

  yield md`<mark>updated!!!`;
};
const _8cq9eq = function _9(md){return(
md`## The viewroutine`
)};
const _1stwksv = function _viewroutine(Event){return(
function viewroutine(generator) {
  let current;
  const holder = Object.defineProperty(
    document.createElement("span"),
    "value",
    {
      get: () => current?.value,
      set: (v) => (current ? (current.value = v) : null),
      enumerable: true
    }
  );

  new Promise(async () => {
    const iterator = generator();
    const n = await iterator.next();
    let { done, value } = n;
    while (!done) {
      if (value instanceof Event) {
        holder.dispatchEvent(value);
      } else {
        current = value;
        if (holder.firstChild) holder.removeChild(holder.firstChild);
        if (value) {
          holder.appendChild(value);
        }
      }
      ({ done, value } = await iterator.next());
    }
    holder.remove();
  });
  return holder;
}
)};
const _78i74s = function _11(md){return(
md`### Example`
)};
const _1fss2nk = function _12(md){return(
md`_ask_ wraps any input. It yields the passed in input to be its visual representation, but its final return is the value submitted, which ends the routine (allowing an enclosing generator to continue with the sequence)`
)};
const _3ts5lw = function _ask(){return(
async function* ask(input) {
  let responder = null;
  const response = new Promise(resolve => (responder = resolve));
  input.addEventListener('input', () => responder(input.value));
  yield input;
  return await response;
}
)};
const _1hkzt1g = function _14(md){return(
md`Now we can do the same thing without a mutable, even carrying the inputed name in the first step to steps further along.`
)};
const _4yqv50 = function _example1(viewroutine,ask,Inputs,md,htl){return(
viewroutine(async function*() {
  let newName = undefined;
  while (true) {
    newName = yield* ask(
      Inputs.text({
        label: "please enter the name of the thing to create",
        minlength: 1,
        value: newName,
        submit: true
      })
    );
    yield md`<mark>updating to ${newName}`; // Note we can remember newName
    await new Promise(r => setTimeout(r, 1000)); // Mock async action
    yield* ask(htl.html`${md`<mark>updated`} ${Inputs.button("Again?")}`);
  }
})
)};
const _1jzejjl = (G, _) => G.input(_);
const _g4pc22 = function _16(example1){return(
example1
)};
const _zim6zj = function _17(md){return(
md`## Animation Example with return values

Mixing HTML with SVG and composing animations
`
)};
const _1irclz0 = function _18(choice){return(
choice
)};
const _11nu5nj = function _choice(viewroutine,choose,flashSquare,flashStar){return(
viewroutine(async function*() {
  while (true) {
    const choice = yield* choose();
    if (choice == 'square') yield* flashSquare();
    if (choice == 'star') yield* flashStar();
  }
})
)};
const _1apj80z = (G, _) => G.input(_);
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
const _9ae7ib = function _flashSquare(html,Event,Promises){return(
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
}
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
const _1mezj6n = function _24(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["viewroutine.png"].map((name) => {
    const module_name = "@tomlarkworthy/viewroutine";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_kpo4tb", null, ["md","FileAttachment"], _kpo4tb);  
  $def("_17qwhk2", null, ["md"], _17qwhk2);  
  $def("_no7041", null, ["md"], _no7041);  
  $def("_s9w0xy", null, ["md"], _s9w0xy);  
  $def("_o30q5l", null, ["md"], _o30q5l);  
  $def("_1r0kzfe", "initial nameOfThing", [], _1r0kzfe);  
  $def("_uf7o72", "mutable nameOfThing", ["Mutable","initial nameOfThing"], _uf7o72);  
  $def("_iw386b", "nameOfThing", ["mutable nameOfThing"], _iw386b);  
  $def("_1at7q4y", "viewof newName", ["Inputs"], _1at7q4y);  
  $def("_1wzqt7z", "newName", ["Generators","viewof newName"], _1wzqt7z);  
  $def("_ed1zta", "sideEffect", ["md","mutable nameOfThing","newName"], _ed1zta);  
  $def("_8cq9eq", null, ["md"], _8cq9eq);  
  $def("_1stwksv", "viewroutine", ["Event"], _1stwksv);  
  $def("_78i74s", null, ["md"], _78i74s);  
  $def("_1fss2nk", null, ["md"], _1fss2nk);  
  $def("_3ts5lw", "ask", [], _3ts5lw);  
  $def("_1hkzt1g", null, ["md"], _1hkzt1g);  
  $def("_4yqv50", "viewof example1", ["viewroutine","ask","Inputs","md","htl"], _4yqv50);  
  $def("_1jzejjl", "example1", ["Generators","viewof example1"], _1jzejjl);  
  $def("_g4pc22", null, ["example1"], _g4pc22);  
  $def("_zim6zj", null, ["md"], _zim6zj);  
  $def("_1irclz0", null, ["choice"], _1irclz0);  
  $def("_11nu5nj", "viewof choice", ["viewroutine","choose","flashSquare","flashStar"], _11nu5nj);  
  $def("_1apj80z", "choice", ["Generators","viewof choice"], _1apj80z);  
  $def("_1kz7qag", "choose", ["htl","Event"], _1kz7qag);  
  $def("_9ae7ib", "flashSquare", ["html","Event","Promises"], _9ae7ib);  
  $def("_jngcdg", "flashStar", ["htl","Event","Promises"], _jngcdg);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1mezj6n", null, ["footer"], _1mezj6n);
  return main;
}