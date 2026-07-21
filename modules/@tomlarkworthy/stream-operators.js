const _15nmfm2 = function _1(md){return(
md`# RxJS inspired stream operators for *views*


[Reactive Extension's (RxJS)](https://rxjs.dev/) container class is an _Observable_. Rx defines a set of stream operators to combine and transform _Observables_ into other _Observables_.

Observable[sic] Notebooks are nothing to do with RxJS, but have "views" which represent two reactive variables:
1. the control-plane variable "_viewof X_", often a DOM node.
2. the data-plane value "_X_", which is an independent reactivity participant.
  
Note the "viewof" does not need to to be a DOM node and it this notebook it will not be used like that.

In this notebook we note that a "_viewof_" can act like an RxJS Observable. It wraps a stream of values, and thus, we can make analogous viewof counterparts to RxJS's stream Operators. With our RxJS-like Stream Operators, we will combine and transform views, to create new views.

In this notebook we explore how some of RxJS's operators can solve some common Observablehq dataflow gotchas.`
)};
const _14z8e83 = function _2(md){return(
md`## Fizz Buzz Example

Walking through an implementation of FizzBuzz using stream operator's introduces the coding style. `
)};
const _w1l87c = function _3(md){return(
md`RxJS has a "creation" operator called [_interval_](https://rxjs.dev/api/index/function/interval) that creates a reactive stream that emits in incrementing numbers every "period" milliseconds. We can do the same thing:-`
)};
const _1dndbqz = function _counter(interval,invalidation){return(
interval({ period: 500, invalidation })
)};
const _1day41y = (G, _) => G.input(_);
const _5lfxcg = function _5(md){return(
md`With our _interval_ it returns a "viewof" as opposed to an _Observable_. We also have to pass in the _invalidation_ promise so that if the cell is reevaluated the timer is removed. Note: all our stream operators need the invalidation promise passed in.

If we now look at the value of the _counter_ below, it is updating every half a second, but note the control-plane _viewof_ above is not. This is important, when we combine streams we work with the "viewofs", which are static wiring, but underneath them the dataplane is reactive and processing dataflow idiomatically to the Observable's notebook dataflow paradigm.`
)};
const _i4vlqt = function _6(counter){return(
counter
)};
const _1tfa5h8 = function _7(md){return(
md`Lets implement FizzBuzz as two independently combined streams, Fizz and Buzz. 

For Fizz, we emit Fizz if we see the counter is divisible by 3, otherwise we emit null. We can use a reactive ["map"](https://rxjs.dev/api?query=map). Our input view is our previous viewof (not the data channel!)`
)};
const _bmpx4m = function _fizz(map,$0,invalidation){return(
map({
  view: $0,
  map: (count) => {
    if (count % 3 == 0) return "Fizz";
    return null;
  },
  invalidation
})
)};
const _1mapnw5 = (G, _) => G.input(_);
const _117pmor = function _9(md){return(
md`Note the result of the map is another viewof, which depends only on the previous viewof counter, so is not affected by dataflow either but the underlying data channel is recomputing at the same rate as _counter_ (see below)`
)};
const _1mgt0zk = function _10(fizz){return(
fizz
)};
const _c8heb2 = function _11(md){return(
md`Buzz is the same thing but for numbers divisible by 5 numbers.`
)};
const _prdyfg = function _buzz(map,$0,invalidation){return(
map({
  view: $0,
  map: (count) => {
    if (count % 5 == 0) return "Buzz";
    return null;
  },
  invalidation
})
)};
const _ywap05 = (G, _) => G.input(_);
const _fveuul = function _13(buzz){return(
buzz
)};
const _1w2g8rb = function _14(md){return(
md`Now lets try to combine streams. In FizzBuzz you either say fizz or buzz or both if the number is divisible by 5 and 3. If the number is not any of those you say the number. So we need to combine three streams (Fizz, Buzz and Counter).

A common stream combinator is ["combineLatest"](https://rxjs.dev/api/operators/combineLatest), which provides the latest values of multiple streams to a function, that then computes the emitted value.

Our viewof -> RxJS mapping converts the passed in viewof streams to values internally, and forwards them to the internal function in the same order but as values now. We never depend on data channels directly otherwise the stream operator call would recompute every data update.
`
)};
const _q551p7 = function _fizzBuzzCombineLatest(combineLatest,$0,$1,$2,invalidation){return(
combineLatest({
  // three views
  views: [$0, $1, $2],
  // three **values**
  map: (count, fizz, buzz) =>
    fizz && buzz ? fizz + buzz : fizz || buzz || count,
  invalidation
})
)};
const _1jk81zc = (G, _) => G.input(_);
const _npvlk4 = function _16(md){return(
md`_fizzBuzzCombineLatest_ shows the glitchiness of combining synchronised streams with _combineLatest_, sometimes there are extra frames merging a previous value to a new value, depending on the order of evaluation. 

The result is more updates than you would expect.`
)};
const _1f0lfo9 = function _17(fizzBuzzCombineLatest){return(
fizzBuzzCombineLatest
)};
const _ubbjca = function _18(md){return(
md`We can count the number of updates with a scan`
)};
const _l6hy0u = function _countFizzBuzzCombineLatest(scan,$0,invalidation){return(
scan({
  view: $0,
  seed: 0,
  scan: (acc, element) => acc + 1,
  invalidation
})
)};
const _10ranwj = (G, _) => G.input(_);
const _1d21zk7 = function _20(countFizzBuzzCombineLatest){return(
countFizzBuzzCombineLatest
)};
const _1e0m5bi = function _21(md){return(
md`Now we can clearly see that there are three updates per clock update! This is a common source of bugs in Observable reactive programming! Merging multiple active dataflow add the rate of updates, furthermore the order of the cell updates is indeterminate. ObservableHQ dataflow is most analogous to RxJS's combineLatest operator.`
)};
const _1cdmgli = function _22(md){return(
md`RxJS has an alternative solution, the [zip](https://www.learnrxjs.io/learn-rxjs/operators/combination/zip) operator, which waits until every stream emits before emitting an array of those values.`
)};
const _1uh2ovd = function _fizzBuzzZipArray(zip,$0,$1,$2,invalidation){return(
zip({
  views: [$0, $1, $2],
  invalidation
})
)};
const _1ig9ibk = (G, _) => G.input(_);
const _16ge70z = function _24(fizzBuzzZipArray){return(
fizzBuzzZipArray
)};
const _1x90ntc = function _25(md){return(
md`For zip and combineLatest you can add a map parameter to transform the stream inline.`
)};
const _1thkdbb = function _fizzBuzzZip(zip,$0,$1,$2,invalidation){return(
zip({
  views: [$0, $1, $2],
  map: (count, fizz, buzz) =>
    fizz && buzz ? fizz + buzz : fizz || buzz || count,
  invalidation
})
)};
const _jdyijp = (G, _) => G.input(_);
const _brom1o = function _27(fizzBuzzZip){return(
fizzBuzzZip
)};
const _t7mfvk = function _28(md){return(
md`Now when we count the downstream updates we get one update every 500 millis! We solved FizzBuzz the stream orientated way!`
)};
const _9m7dte = function _countFizzBuzzZip(scan,$0,invalidation){return(
scan({
  view: $0,
  seed: 0,
  scan: (acc, element) => acc + 1,
  invalidation
})
)};
const _752dzy = (G, _) => G.input(_);
const _1e2w7iy = function _30(countFizzBuzzZip){return(
countFizzBuzzZip
)};
const _3jy2a = function _31(md){return(
md`The zip operator is useful for fixing Obervable dataflow glitches caused by combining synchronised streams.`
)};
const _85rl1b = function _32(md){return(
md`## Other Examples`
)};
const _gdn1iy = function _33(md){return(
md`#### Rate reduction

Another annoyance with Observable Notebook dataflow is its hard to reduce the rate of dataflow. As soon as a cell references another cell, the downstream cell will always recompute at least as frequently as the upstream cell.

We can fix this with stream operators, if a map function returns undefined, no update is made.

In the following function we will create a cell that updates once a second by only emitting if the counter is even, thereby halving the frequency of updates`
)};
const _7t2do9 = function _evens(map,$0,invalidation){return(
map({
  view: $0,
  map: (v) => (v % 2 ? undefined : v),
  invalidation
})
)};
const _1lne34j = (G, _) => G.input(_);
const _1w8vbuv = function _35(evens){return(
evens
)};
const _1kh3ojv = function _36(md){return(
md`#### Deduplication

Another common difficulty is preventing duplicate updates, this organically arrises when filtering collections. Often minor perturbations of the selection criteria lead to the same sub-selection, so why cascade that change downstream? More generally, if a cell output is the same, there is no need to propagate a change. We can use scan to achieve this.`
)};
const _6023kb = function _headsOrTails(map,$0,invalidation){return(
map({
  view: $0,
  map: (v) => (Math.random() > 0.5 ? "Heads" : "Tails"),
  invalidation
})
)};
const _1s0ueo9 = (G, _) => G.input(_);
const _27agi2 = function _38(headsOrTails){return(
headsOrTails
)};
const _1c9lm9r = function _deduped(scan,$0,invalidation){return(
scan({
  view: $0,
  scan: (acc, value) => (acc !== value ? value : undefined),
  invalidation
})
)};
const _gf27v = (G, _) => G.input(_);
const _jhim57 = function _40(deduped){return(
deduped
)};
const _kzoadn = function _41(md){return(
md`#### Temporal Rate Measurement

The scan is pretty flexible. We can compute a running rate computation. First we map a stream to timestamps, scan to collect those within the last 5 seconds, then compute the average.`
)};
const _1wtqnov = function _timestamp(map,$0,invalidation){return(
map({
  view: $0,
  map: () => performance.now(),
  invalidation
})
)};
const _vvt5vq = (G, _) => G.input(_);
const _9v84oc = function _43(timestamp){return(
timestamp
)};
const _10vu0fj = function _last_5_secs(scan,$0,invalidation){return(
scan({
  view: $0,
  seed: [],
  scan: (acc, next) => {
    acc.push(next);
    while (acc[0] < performance.now() - 5000) acc.shift();
    return acc;
  },
  invalidation
})
)};
const _1xo0xkd = (G, _) => G.input(_);
const _1otuiko = function _45(last_5_secs){return(
last_5_secs
)};
const _1lqs7im = function _rate(map,$0,invalidation){return(
map({
  view: $0,
  map: (array) => array.length / (0.001 * (array.at(-1) - array.at(1))),
  invalidation
})
)};
const _1ofwtde = (G, _) => G.input(_);
const _41ukm9 = function _47(rate,md){return(
md`${rate} per second`
)};
const _ejmyr3 = function _48(md){return(
md`We don't actually need to do these computations in different cells, you can wire everything up purely in imperative code if you want. It looks ugly as hell though.`
)};
const _1mmc7q = function _rate2(map,scan,$0,invalidation){return(
map({
  map: (array) => array.length / (0.001 * (array.at(-1) - array.at(1))),
  view: scan({
    seed: [],
    scan: (acc, next) => {
      acc.push(next);
      while (acc[0] < performance.now() - 5000) acc.shift();
      return acc;
    },
    view: map({
      map: () => performance.now(),
      view: $0,
      invalidation
    }),
    invalidation
  }),
  invalidation
})
)};
const _1ql4mhm = (G, _) => G.input(_);
const _m6xb4n = function _50(rate2,md){return(
md`${rate2} per second`
)};
const _xvoqqz = function _51(md){return(
md`## Operator Implementation`
)};
const _1sychb7 = function _52(md){return(
md`In most places returning \`undefined\` means skip an update.`
)};
const _1a3sdj9 = function _53(md){return(
md`### interval

https://rxjs.dev/api/index/function/interval`
)};
const _px7gfx = function _interval(Inputs,Event){return(
function interval({period = 0, invalidation}) {
  const result = Inputs.input();
  let count = 0;
  void 0;
  const onTick = () => {
    void 0;
    result.value = count++;
    result.dispatchEvent(new Event('input'));
  };
  const id = setInterval(onTick, period);
  invalidation.then(() => clearInterval(id));
  return result;
}
)};
const _11meps1 = function _55(md){return(
md`### map

https://rxjs.dev/api/index/function/map`
)};
const _sdzl0o = function _map(Inputs,Event){return(
function map({ view, map = (v) => v, invalidation }) {
  const result = Inputs.input();
  const handler = () => {
    const val = map(view.value);
    if (val !== undefined) {
      result.value = val;
      result.dispatchEvent(new Event("input"));
    }
  };
  view.addEventListener("input", handler);

  invalidation.then(() => view.removeEventListener("input", handler));
  handler();
  return result;
}
)};
const _zawuyh = function _57(md){return(
md`### scan

https://rxjs.dev/api/operators/scan`
)};
const _18y2pqv = function _scan(Inputs,Event){return(
function scan({ view, scan = (acc, v) => v, seed, invalidation }) {
  const result = Inputs.input();
  let acc = seed;

  const handler = () => {
    const update = scan(acc, view.value);
    if (update !== undefined) {
      acc = update;
      result.value = acc;
      result.dispatchEvent(new Event("input"));
    }
  };

  view.addEventListener("input", handler);

  invalidation.then(() => view.removeEventListener("input", handler));

  handler();
  return result;
}
)};
const _1yxnlh9 = function _59(md){return(
md`### combineLatest

https://rxjs.dev/api/index/function/combineLatest`
)};
const _634dbj = function _combineLatest(Inputs,Event){return(
function combineLatest({
  views = [],
  map = (...views) => views,
  invalidation
}) {
  const result = Inputs.input();
  const recompute = () => {
    const latest = map(...views.map((v) => v.value));
    if (latest !== undefined) {
      result.value = latest;
      result.dispatchEvent(new Event("input"));
    }
  };
  views.forEach((view) => view.addEventListener("input", recompute));
  invalidation.then(() => {
    views.forEach((view) => view.removeEventListener("input", recompute));
  });
  return result;
}
)};
const _bhipcg = function _61(md){return(
md`### zip

https://rxjs.dev/api/index/function/zip`
)};
const _1f8ul3d = function _zip(Inputs,Event){return(
function zip({ views = [], map = (...values) => values, invalidation }) {
  const result = Inputs.input();
  const queues = views.map(() => []);
  const handlers = views.map((view, i) => {
    const handler = () => {
      queues[i].push(view.value);
      if (queues.every((q) => q.length > 0)) {
        const vals = queues.map((q) => q.shift());
        const out = map(...vals);
        if (out !== undefined) {
          result.value = out;
          result.dispatchEvent(new Event("input"));
        }
      }
    };
    view.addEventListener("input", handler);
    return { view, handler };
  });

  invalidation.then(() => {
    handlers.forEach(({ view, handler }) =>
      view.removeEventListener("input", handler)
    );
  });

  return result;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_15nmfm2", null, ["md"], _15nmfm2);  
  $def("_14z8e83", null, ["md"], _14z8e83);  
  $def("_w1l87c", null, ["md"], _w1l87c);  
  $def("_1dndbqz", "viewof counter", ["interval","invalidation"], _1dndbqz);  
  $def("_1day41y", "counter", ["Generators","viewof counter"], _1day41y);  
  $def("_5lfxcg", null, ["md"], _5lfxcg);  
  $def("_i4vlqt", null, ["counter"], _i4vlqt);  
  $def("_1tfa5h8", null, ["md"], _1tfa5h8);  
  $def("_bmpx4m", "viewof fizz", ["map","viewof counter","invalidation"], _bmpx4m);  
  $def("_1mapnw5", "fizz", ["Generators","viewof fizz"], _1mapnw5);  
  $def("_117pmor", null, ["md"], _117pmor);  
  $def("_1mgt0zk", null, ["fizz"], _1mgt0zk);  
  $def("_c8heb2", null, ["md"], _c8heb2);  
  $def("_prdyfg", "viewof buzz", ["map","viewof counter","invalidation"], _prdyfg);  
  $def("_ywap05", "buzz", ["Generators","viewof buzz"], _ywap05);  
  $def("_fveuul", null, ["buzz"], _fveuul);  
  $def("_1w2g8rb", null, ["md"], _1w2g8rb);  
  $def("_q551p7", "viewof fizzBuzzCombineLatest", ["combineLatest","viewof counter","viewof fizz","viewof buzz","invalidation"], _q551p7);  
  $def("_1jk81zc", "fizzBuzzCombineLatest", ["Generators","viewof fizzBuzzCombineLatest"], _1jk81zc);  
  $def("_npvlk4", null, ["md"], _npvlk4);  
  $def("_1f0lfo9", null, ["fizzBuzzCombineLatest"], _1f0lfo9);  
  $def("_ubbjca", null, ["md"], _ubbjca);  
  $def("_l6hy0u", "viewof countFizzBuzzCombineLatest", ["scan","viewof fizzBuzzCombineLatest","invalidation"], _l6hy0u);  
  $def("_10ranwj", "countFizzBuzzCombineLatest", ["Generators","viewof countFizzBuzzCombineLatest"], _10ranwj);  
  $def("_1d21zk7", null, ["countFizzBuzzCombineLatest"], _1d21zk7);  
  $def("_1e0m5bi", null, ["md"], _1e0m5bi);  
  $def("_1cdmgli", null, ["md"], _1cdmgli);  
  $def("_1uh2ovd", "viewof fizzBuzzZipArray", ["zip","viewof counter","viewof fizz","viewof buzz","invalidation"], _1uh2ovd);  
  $def("_1ig9ibk", "fizzBuzzZipArray", ["Generators","viewof fizzBuzzZipArray"], _1ig9ibk);  
  $def("_16ge70z", null, ["fizzBuzzZipArray"], _16ge70z);  
  $def("_1x90ntc", null, ["md"], _1x90ntc);  
  $def("_1thkdbb", "viewof fizzBuzzZip", ["zip","viewof counter","viewof fizz","viewof buzz","invalidation"], _1thkdbb);  
  $def("_jdyijp", "fizzBuzzZip", ["Generators","viewof fizzBuzzZip"], _jdyijp);  
  $def("_brom1o", null, ["fizzBuzzZip"], _brom1o);  
  $def("_t7mfvk", null, ["md"], _t7mfvk);  
  $def("_9m7dte", "viewof countFizzBuzzZip", ["scan","viewof fizzBuzzZip","invalidation"], _9m7dte);  
  $def("_752dzy", "countFizzBuzzZip", ["Generators","viewof countFizzBuzzZip"], _752dzy);  
  $def("_1e2w7iy", null, ["countFizzBuzzZip"], _1e2w7iy);  
  $def("_3jy2a", null, ["md"], _3jy2a);  
  $def("_85rl1b", null, ["md"], _85rl1b);  
  $def("_gdn1iy", null, ["md"], _gdn1iy);  
  $def("_7t2do9", "viewof evens", ["map","viewof counter","invalidation"], _7t2do9);  
  $def("_1lne34j", "evens", ["Generators","viewof evens"], _1lne34j);  
  $def("_1w8vbuv", null, ["evens"], _1w8vbuv);  
  $def("_1kh3ojv", null, ["md"], _1kh3ojv);  
  $def("_6023kb", "viewof headsOrTails", ["map","viewof counter","invalidation"], _6023kb);  
  $def("_1s0ueo9", "headsOrTails", ["Generators","viewof headsOrTails"], _1s0ueo9);  
  $def("_27agi2", null, ["headsOrTails"], _27agi2);  
  $def("_1c9lm9r", "viewof deduped", ["scan","viewof headsOrTails","invalidation"], _1c9lm9r);  
  $def("_gf27v", "deduped", ["Generators","viewof deduped"], _gf27v);  
  $def("_jhim57", null, ["deduped"], _jhim57);  
  $def("_kzoadn", null, ["md"], _kzoadn);  
  $def("_1wtqnov", "viewof timestamp", ["map","viewof deduped","invalidation"], _1wtqnov);  
  $def("_vvt5vq", "timestamp", ["Generators","viewof timestamp"], _vvt5vq);  
  $def("_9v84oc", null, ["timestamp"], _9v84oc);  
  $def("_10vu0fj", "viewof last_5_secs", ["scan","viewof timestamp","invalidation"], _10vu0fj);  
  $def("_1xo0xkd", "last_5_secs", ["Generators","viewof last_5_secs"], _1xo0xkd);  
  $def("_1otuiko", null, ["last_5_secs"], _1otuiko);  
  $def("_1lqs7im", "viewof rate", ["map","viewof last_5_secs","invalidation"], _1lqs7im);  
  $def("_1ofwtde", "rate", ["Generators","viewof rate"], _1ofwtde);  
  $def("_41ukm9", null, ["rate","md"], _41ukm9);  
  $def("_ejmyr3", null, ["md"], _ejmyr3);  
  $def("_1mmc7q", "viewof rate2", ["map","scan","viewof deduped","invalidation"], _1mmc7q);  
  $def("_1ql4mhm", "rate2", ["Generators","viewof rate2"], _1ql4mhm);  
  $def("_m6xb4n", null, ["rate2","md"], _m6xb4n);  
  $def("_xvoqqz", null, ["md"], _xvoqqz);  
  $def("_1sychb7", null, ["md"], _1sychb7);  
  $def("_1a3sdj9", null, ["md"], _1a3sdj9);  
  $def("_px7gfx", "interval", ["Inputs","Event"], _px7gfx);  
  $def("_11meps1", null, ["md"], _11meps1);  
  $def("_sdzl0o", "map", ["Inputs","Event"], _sdzl0o);  
  $def("_zawuyh", null, ["md"], _zawuyh);  
  $def("_18y2pqv", "scan", ["Inputs","Event"], _18y2pqv);  
  $def("_1yxnlh9", null, ["md"], _1yxnlh9);  
  $def("_634dbj", "combineLatest", ["Inputs","Event"], _634dbj);  
  $def("_bhipcg", null, ["md"], _bhipcg);  
  $def("_1f8ul3d", "zip", ["Inputs","Event"], _1f8ul3d);
  return main;
}