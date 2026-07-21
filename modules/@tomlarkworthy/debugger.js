const _1vmpq0h = function _1(md){return(
md`# Debugger: Notebook Dataflow Debugger (ndd)
`
)};
const _q0dcbc = function __ndd(htl,$0,$1,$2,$3,vizUpdater,vizHolder){return(
this || // Reuse DOM to keep control state working, but mixin 'vizUpdater'
  htl.html`<div style="display:flex;flex-wrap:wrap; max-height: 200px; ">
        ${$0}
        ${$1}
        ${$2}
        ${$3}
      </div>
      ${(vizUpdater, vizHolder)}
      `
)};
const _2nok4x = function _b(a){return(
a + 6
)};
const _prpofm = function _a(Inputs){return(
Inputs.range()
)};
const _rpc4xh = (G, _) => G.input(_);
const _1ee7x29 = function _5(md){return(
md`
A [moldable](https://moldabledevelopment.com/) development tool to help debug [dataflow problems](https://observablehq.com/@observablehq/how-observable-runs) by visualizing all cell state transitions in the containing notebook on a timeline.

\`\`\`js
import {_ndd} from '@tomlarkworthy/debugger'
\`\`\`

Thanks to [\`@mootari/access-runtime\`](https://observablehq.com/@mootari/access-runtime) on which this tool builds upon.


|Date| Change|
|---|---|
| 2025-04-27 | Fixed bug that broke exports by calling observe on unobserved variables
| 2025-03-11 | Visualize all variables in runtime, better zoom
| 2024-12-08 | Added dependancy graph and track anon variables too
| 2023-11-04 | Fixed renaming bug not tracking the new variable name
|            | Fixed initial variables not triggering`
)};
const _130wjbz = function _6(md){return(
md`## TODO
- Reduce volume of signals (filters? Search)
- Vertical zoom?
- brush zoom horzintal`
)};
const _1wgrpv3 = function _slider2(Inputs){return(
Inputs.range([0, 1], { label: "slide me!" })
)};
const _109mo27 = (G, _) => G.input(_);
const _sdiwtm = function _clicker(Inputs){return(
Inputs.button("Click me!")
)};
const _r06z9p = (G, _) => G.input(_);
const _wncs0o = function _delayedDependentAsyncComputation(clicker,uid)
{
  clicker; // create dependancy on clicker cellto resolve a value
  return uid();
};
const _1jn49nw = function _uid(){return(
() => (Math.random() + 1).toString(36).substring(7)
)};
const _126ji04 = function _11(md){return(
md`## State`
)};
const _1f84ysf = function _extra_excludes(){return(
new Set()
)};
const _re8wli = (M, _) => new M(_);
const _1kkkvkr = _ => _.generator;
const _f30e6j = async function _excludes(descendants,lookupVariable,module,extra_excludes){return(
descendants(
  await lookupVariable("range", module),
  await lookupVariable("events", module),
  await lookupVariable("dedupe_range", module),
  await lookupVariable("trackedVariables", module),
  ...extra_excludes
)
)};
const _1ld5bll = function _events()
{
  const val = [];
  return val;
};
const _1bdyt5b = (M, _) => new M(_);
const _1mk7fy2 = _ => _.generator;
const _t7h3pu = function _endTime(Inputs){return(
Inputs.input(null)
)};
const _1x44ha = (G, _) => G.input(_);
const _zb6had = function _16(md){return(
md`### UI`
)};
const _yoabrw = function _17(md){return(
md`#### timeline`
)};
const _jh7in4 = function _18(events){return(
events
)};
const _94gpr8 = function _range(now,endTime,timeDelay,windowSecs,$0,Event)
{
  now;
  const end = (endTime || performance.now()) - timeDelay * 1000;
  const start = Math.max(end - windowSecs * 1000);
  if (
    $0.value[0] !== start ||
    $0.value[1] !== end
  ) {
    $0.value[0] = start;
    $0.value[1] = end;
    $0.dispatchEvent(new Event("input"));
  }
};
const _11jjv2d = function _dedupe_range(keepalive,module,Inputs)
{
  keepalive(module, "range");
  return Inputs.input([0, 30]);
};
const _8xyd7t = (G, _) => G.input(_);
const _1jg9cfm = function _viz(dedupe_range,Plot,width,events)
{
  const [start, end] = dedupe_range;
  return Plot.plot({
    width,
    marginLeft: 200,
    y: {
      axis: null,
      domain: [
        ...events.reduce((acc, e) => (acc.add(e.name), acc), new Set())
      ].sort()
    },
    x: {
      domain: [start, end],
      type: "time"
    },
    color: {
      domain: ["pending", "fulfilled", "rejected", "idle"],
      range: ["#BBF", "#0F0", "#F44", "#EEE"]
    },
    marks: [
      Plot.ruleY(
        events,
        Plot.selectLast({
          z: "name",
          y: "name",
          stroke: "#EEE",
          strokeDasharray: [2, 3]
        })
      ),
      Plot.barX(
        events,
        Plot.selectLast({
          x1: start,
          x2: start - 60 * 60 * 1000,
          y: "name",
          z: "name",
          text: "name",
          textAnchor: "end",
          dx: -10,
          fill: (d) =>
            d.type === "pending" ? "pending" : end - d.t < 500 ? d.type : "idle"
        })
      ),
      Plot.tickX(events, {
        x: "t",
        y: "name",
        stroke: "type",
        strokeWidth: 2
      }),
      // Plot.arrow(
      //   events.flatMap((e) =>
      //     e.variable._inputs.map((i) => ({
      //       input: i,
      //       variable: e.variable
      //     }))
      //   ),
      //   {
      //     x1: start,
      //     y1: (d) => d.input._name,
      //     x2: start,
      //     y2: (d) => d.variable._name,
      //     bend: true,
      //     stroke: "#ccc",
      //     headLength: 4,
      //     strokeWidth: 1
      //   }
      // ),
      Plot.text(
        events,
        Plot.selectLast({
          x: start,
          y: "name",
          z: "name",
          text: (d) => d.name, // + "\n " + d.variable._definition.toString().slice(0, 30),
          textAnchor: "end",
          dx: -10,
          fill: "black"
        })
      )
    ]
  });
};
const _1xzbn0y = function _22(md){return(
md`#### timeline holder`
)};
const _190oc0r = function _vizHolder(){return(
document.createElement("div")
)};
const _1r1r5c8 = function _vizUpdater(interceptVariables,vizHolder,viz)
{
  interceptVariables;
  vizHolder.firstChild?.remove();
  vizHolder.appendChild(viz);
  
};
const _1bhf88z = function _25(md){return(
md`#### clear button`
)};
const _1xwjbf5 = function _clear(Inputs,$0){return(
Inputs.button("clear", {
  reduce: () => ($0.value = [])
})
)};
const _ssh4lj = (G, _) => G.input(_);
const _dfbc8c = function _27(md){return(
md`#### pause toggle`
)};
const _1symutn = function _pause(Inputs,$0,Event)
{
  const ui = Inputs.toggle({ label: "pause" });

  const updateEndTime = () => {
    $0.value = ui.value ? performance.now() : null;
    $0.dispatchEvent(new Event("input", { bubbles: true }));
  };
  ui.addEventListener("input", updateEndTime);
  return ui;
};
const _qrycic = (G, _) => G.input(_);
const _cdvss1 = function _29(md){return(
md`#### break toggler`
)};
const _8p3kdu = function _breakpoint(Inputs){return(
Inputs.toggle({ label: "break next?" })
)};
const _1a4f397 = (G, _) => G.input(_);
const _1nx3lxe = function _31(md){return(
md`#### Time window`
)};
const _1g0urnr = function _windowSecs(Inputs){return(
Inputs.range([0.01, 60], {
  value: 30,
  step: 0.01,
  label: "window (secs)"
})
)};
const _1f3394e = (G, _) => G.input(_);
const _1dpobqb = function _33(md){return(
md`#### Time delay`
)};
const _10d4d33 = function _timeDelay(Inputs){return(
Inputs.range([0, 30], {
  value: 0,
  step: 0.01,
  label: "delay (secs)"
})
)};
const _1r2fbyu = (G, _) => G.input(_);
const _15bno4n = function _35(md){return(
md`## Implementation`
)};
const _1e12g68 = function _36(md){return(
md`### Get the runtime`
)};
const _1t2oksy = function _38(md){return(
md`### track notebook variables`
)};
const _1dop2vt = function _allVariables(variables,runtime){return(
variables(runtime)
)};
const _1b82ds4 = (G, _) => G.input(_);
const _131yd3f = function _module(thisModule){return(
thisModule()
)};
const _th6e4k = (G, _) => G.input(_);
const _vftspw = function _trackedVariables(allVariables){return(
[...allVariables]
)};
const _1dm30r3 = function _mainVariableNames(trackedVariables){return(
trackedVariables.map((v) => v._name)
)};
const _mx96qr = function _interceptVariables(trackedVariables,interceptVariable,invalidation,excludes)
{
  trackedVariables.forEach((v) => interceptVariable(v, invalidation, excludes));
  return Object.fromEntries(trackedVariables.map((v) => [v._name, v]));
};
const _begl54 = function _notify($0,$1,$2){return(
function notify(name, type, value, variable) {
  if ($0.value) return;

  const event = {
    t: performance.now(),
    name: name || variable._definition.toString().slice(0, 30),
    value,
    type,
    variable
  };
  $1.value.push(event);
  while ($1.value.length > 2000) $1.value.shift();

  $1.value = $1.value;
  if ($2.value) {
    debugger;
  }
}
)};
const _4pfuk2 = function _names(){return(
{}
)};
const _8m0r8m = function _interceptVariable(observe,notify){return(
function interceptVariable(v, invalidation, excludes, firstSeen = false) {
  if (excludes.has(v)) return;
  if (v._name === "now") return;
  if (!v._reachable) return; // causes bugs and there is nothing interesting to debug anyway
  if (!v.ndd) {
    v.ndd = true;
    observe(v, {
      pending: (...args) => notify(v._name, "pending", args[0], v),
      rejected: (...args) => notify(v._name, "rejected", args[0], v),
      fulfilled: (...args) => notify(v._name, "fulfilled", args[0], v)
    });
  }
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module d/e1c39d41e8e944b0@939", async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_1vmpq0h", null, ["md"], _1vmpq0h);  
  $def("_q0dcbc", "_ndd", ["htl","viewof clear","viewof pause","viewof windowSecs","viewof timeDelay","vizUpdater","vizHolder"], _q0dcbc);  
  $def("_2nok4x", "b", ["a"], _2nok4x);  
  $def("_prpofm", "viewof a", ["Inputs"], _prpofm);  
  $def("_rpc4xh", "a", ["Generators","viewof a"], _rpc4xh);  
  $def("_1ee7x29", null, ["md"], _1ee7x29);  
  $def("_130wjbz", null, ["md"], _130wjbz);  
  $def("_1wgrpv3", "viewof slider2", ["Inputs"], _1wgrpv3);  
  $def("_109mo27", "slider2", ["Generators","viewof slider2"], _109mo27);  
  $def("_sdiwtm", "viewof clicker", ["Inputs"], _sdiwtm);  
  $def("_r06z9p", "clicker", ["Generators","viewof clicker"], _r06z9p);  
  $def("_wncs0o", "delayedDependentAsyncComputation", ["clicker","uid"], _wncs0o);  
  $def("_1jn49nw", "uid", [], _1jn49nw);  
  $def("_126ji04", null, ["md"], _126ji04);  
  $def("_1f84ysf", "initial extra_excludes", [], _1f84ysf);  
  $def("_re8wli", "mutable extra_excludes", ["Mutable","initial extra_excludes"], _re8wli);  
  $def("_1kkkvkr", "extra_excludes", ["mutable extra_excludes"], _1kkkvkr);  
  $def("_f30e6j", "excludes", ["descendants","lookupVariable","module","extra_excludes"], _f30e6j);  
  $def("_1ld5bll", "initial events", [], _1ld5bll);  
  $def("_1bdyt5b", "mutable events", ["Mutable","initial events"], _1bdyt5b);  
  $def("_1mk7fy2", "events", ["mutable events"], _1mk7fy2);  
  $def("_t7h3pu", "viewof endTime", ["Inputs"], _t7h3pu);  
  $def("_1x44ha", "endTime", ["Generators","viewof endTime"], _1x44ha);  
  $def("_zb6had", null, ["md"], _zb6had);  
  $def("_yoabrw", null, ["md"], _yoabrw);  
  $def("_jh7in4", null, ["events"], _jh7in4);  
  $def("_94gpr8", "range", ["now","endTime","timeDelay","windowSecs","viewof dedupe_range","Event"], _94gpr8);  
  $def("_11jjv2d", "viewof dedupe_range", ["keepalive","module","Inputs"], _11jjv2d);  
  $def("_8xyd7t", "dedupe_range", ["Generators","viewof dedupe_range"], _8xyd7t);  
  $def("_1jg9cfm", "viz", ["dedupe_range","Plot","width","events"], _1jg9cfm);  
  $def("_1xzbn0y", null, ["md"], _1xzbn0y);  
  $def("_190oc0r", "vizHolder", [], _190oc0r);  
  $def("_1r1r5c8", "vizUpdater", ["interceptVariables","vizHolder","viz"], _1r1r5c8);  
  $def("_1bhf88z", null, ["md"], _1bhf88z);  
  $def("_1xwjbf5", "viewof clear", ["Inputs","mutable events"], _1xwjbf5);  
  $def("_ssh4lj", "clear", ["Generators","viewof clear"], _ssh4lj);  
  $def("_dfbc8c", null, ["md"], _dfbc8c);  
  $def("_1symutn", "viewof pause", ["Inputs","viewof endTime","Event"], _1symutn);  
  $def("_qrycic", "pause", ["Generators","viewof pause"], _qrycic);  
  $def("_cdvss1", null, ["md"], _cdvss1);  
  $def("_8p3kdu", "viewof breakpoint", ["Inputs"], _8p3kdu);  
  $def("_1a4f397", "breakpoint", ["Generators","viewof breakpoint"], _1a4f397);  
  $def("_1nx3lxe", null, ["md"], _1nx3lxe);  
  $def("_1g0urnr", "viewof windowSecs", ["Inputs"], _1g0urnr);  
  $def("_1f3394e", "windowSecs", ["Generators","viewof windowSecs"], _1f3394e);  
  $def("_1dpobqb", null, ["md"], _1dpobqb);  
  $def("_10d4d33", "viewof timeDelay", ["Inputs"], _10d4d33);  
  $def("_1r2fbyu", "timeDelay", ["Generators","viewof timeDelay"], _1r2fbyu);  
  $def("_15bno4n", null, ["md"], _15bno4n);  
  $def("_1e12g68", null, ["md"], _1e12g68);  
  main.define("modules", ["module d/e1c39d41e8e944b0@939", "@variable"], (_, v) => v.import("modules", _));  
  $def("_1t2oksy", null, ["md"], _1t2oksy);  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  $def("_1dop2vt", "viewof allVariables", ["variables","runtime"], _1dop2vt);  
  $def("_1b82ds4", "allVariables", ["Generators","viewof allVariables"], _1b82ds4);  
  $def("_131yd3f", "viewof module", ["thisModule"], _131yd3f);  
  $def("_th6e4k", "module", ["Generators","viewof module"], _th6e4k);  
  $def("_vftspw", "trackedVariables", ["allVariables"], _vftspw);  
  $def("_1dm30r3", "mainVariableNames", ["trackedVariables"], _1dm30r3);  
  $def("_mx96qr", "interceptVariables", ["trackedVariables","interceptVariable","invalidation","excludes"], _mx96qr);  
  $def("_begl54", "notify", ["viewof pause","mutable events","viewof breakpoint"], _begl54);  
  $def("_4pfuk2", "names", [], _4pfuk2);  
  $def("_8m0r8m", "interceptVariable", ["observe","notify"], _8m0r8m);
  return main;
}