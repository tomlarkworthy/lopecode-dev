const _17 = function viewof$counter(interval,invalidation){return(
interval({ period: 500, invalidation })
)};

const _44 = function(counter){return(
counter
)};

const _48 = function viewof$fizz(map,viewof$counter,invalidation){return(
map({
  view: viewof$counter,
  map: (count) => {
    if (count % 3 == 0) return "Fizz";
    return null;
  },
  invalidation
})
)};

const _52 = function(fizz){return(
fizz
)};

const _54 = function viewof$buzz(map,viewof$counter,invalidation){return(
map({
  view: viewof$counter,
  map: (count) => {
    if (count % 5 == 0) return "Buzz";
    return null;
  },
  invalidation
})
)};

const _57 = function(buzz){return(
buzz
)};

const _64 = function viewof$fizzBuzzCombineLatest(combineLatest,viewof$counter,viewof$fizz,viewof$buzz,invalidation){return(
combineLatest({
  // three views
  views: [viewof$counter, viewof$fizz, viewof$buzz],
  // three **values**
  map: (count, fizz, buzz) =>
    fizz && buzz ? fizz + buzz : fizz || buzz || count,
  invalidation
})
)};

const _71 = function(fizzBuzzCombineLatest){return(
fizzBuzzCombineLatest
)};

const _370 = function viewof$countFizzBuzzCombineLatest(scan,viewof$fizzBuzzCombineLatest,invalidation){return(
scan({
  view: viewof$fizzBuzzCombineLatest,
  seed: 0,
  scan: (acc, element) => acc + 1,
  invalidation
})
)};

const _374 = function(countFizzBuzzCombineLatest){return(
countFizzBuzzCombineLatest
)};

const _130 = function viewof$fizzBuzzZipArray(zip,viewof$counter,viewof$fizz,viewof$buzz,invalidation){return(
zip({
  views: [viewof$counter, viewof$fizz, viewof$buzz],
  invalidation
})
)};

const _132 = function(fizzBuzzZipArray){return(
fizzBuzzZipArray
)};

const _395 = function viewof$fizzBuzzZip(zip,viewof$counter,viewof$fizz,viewof$buzz,invalidation){return(
zip({
  views: [viewof$counter, viewof$fizz, viewof$buzz],
  map: (count, fizz, buzz) =>
    fizz && buzz ? fizz + buzz : fizz || buzz || count,
  invalidation
})
)};

const _582 = function(fizzBuzzZip){return(
fizzBuzzZip
)};

const _403 = function viewof$countFizzBuzzZip(scan,viewof$fizzBuzzZip,invalidation){return(
scan({
  view: viewof$fizzBuzzZip,
  seed: 0,
  scan: (acc, element) => acc + 1,
  invalidation
})
)};

const _406 = function(countFizzBuzzZip){return(
countFizzBuzzZip
)};

const _439 = function viewof$evens(map,viewof$counter,invalidation){return(
map({
  view: viewof$counter,
  map: (v) => (v % 2 ? undefined : v),
  invalidation
})
)};

const _443 = function(evens){return(
evens
)};

const _454 = function viewof$headsOrTails(map,viewof$counter,invalidation){return(
map({
  view: viewof$counter,
  map: (v) => (Math.random() > 0.5 ? "Heads" : "Tails"),
  invalidation
})
)};

const _458 = function(headsOrTails){return(
headsOrTails
)};

const _461 = function viewof$deduped(scan,viewof$headsOrTails,invalidation){return(
scan({
  view: viewof$headsOrTails,
  scan: (acc, value) => (acc !== value ? value : undefined),
  invalidation
})
)};

const _466 = function(deduped){return(
deduped
)};

const _513 = function viewof$timestamp(map,viewof$deduped,invalidation){return(
map({
  view: viewof$deduped,
  map: () => performance.now(),
  invalidation
})
)};

const _519 = function(timestamp){return(
timestamp
)};

const _530 = function viewof$last_5_secs(scan,viewof$timestamp,invalidation){return(
scan({
  view: viewof$timestamp,
  seed: [],
  scan: (acc, next) => {
    acc.push(next);
    while (acc[0] < performance.now() - 5000) acc.shift();
    return acc;
  },
  invalidation
})
)};

const _533 = function(last_5_secs){return(
last_5_secs
)};

const _540 = function viewof$rate(map,viewof$last_5_secs,invalidation){return(
map({
  view: viewof$last_5_secs,
  map: (array) => array.length / (0.001 * (array.at(-1) - array.at(1))),
  invalidation
})
)};

const _567 = function viewof$rate2(map,scan,viewof$deduped,invalidation){return(
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
      view: viewof$deduped,
      invalidation
    }),
    invalidation
  }),
  invalidation
})
)};

const _27 = function interval(Inputs,Event){return(
function interval({period = 0, invalidation}) {
  const result = Inputs.input();
  let count = 0;
  debugger;
  const onTick = () => {
    debugger;
    result.value = count++;
    result.dispatchEvent(new Event('input'));
  };
  const id = setInterval(onTick, period);
  invalidation.then(() => clearInterval(id));
  return result;
}
)};

const _271 = function map(Inputs,Event){return(
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

const _362 = function scan(Inputs,Event){return(
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

const _7 = function combineLatest(Inputs,Event){return(
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

const _121 = function zip(Inputs,Event){return(
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

export default function define(runtime) {
  const main = runtime.module();
  main.define("viewof counter", ["interval","invalidation"], _17);
  main.define("counter", ["Generators", "viewof counter"], (G, _) => G.input(_));
  main.define("cell 44", ["counter"], _44);
  main.define("viewof fizz", ["map","viewof counter","invalidation"], _48);
  main.define("fizz", ["Generators", "viewof fizz"], (G, _) => G.input(_));
  main.define("cell 52", ["fizz"], _52);
  main.define("viewof buzz", ["map","viewof counter","invalidation"], _54);
  main.define("buzz", ["Generators", "viewof buzz"], (G, _) => G.input(_));
  main.define("cell 57", ["buzz"], _57);
  main.define("viewof fizzBuzzCombineLatest", ["combineLatest","viewof counter","viewof fizz","viewof buzz","invalidation"], _64);
  main.define("fizzBuzzCombineLatest", ["Generators", "viewof fizzBuzzCombineLatest"], (G, _) => G.input(_));
  main.define("cell 71", ["fizzBuzzCombineLatest"], _71);
  main.define("viewof countFizzBuzzCombineLatest", ["scan","viewof fizzBuzzCombineLatest","invalidation"], _370);
  main.define("countFizzBuzzCombineLatest", ["Generators", "viewof countFizzBuzzCombineLatest"], (G, _) => G.input(_));
  main.define("cell 374", ["countFizzBuzzCombineLatest"], _374);
  main.define("viewof fizzBuzzZipArray", ["zip","viewof counter","viewof fizz","viewof buzz","invalidation"], _130);
  main.define("fizzBuzzZipArray", ["Generators", "viewof fizzBuzzZipArray"], (G, _) => G.input(_));
  main.define("cell 132", ["fizzBuzzZipArray"], _132);
  main.define("viewof fizzBuzzZip", ["zip","viewof counter","viewof fizz","viewof buzz","invalidation"], _395);
  main.define("fizzBuzzZip", ["Generators", "viewof fizzBuzzZip"], (G, _) => G.input(_));
  main.define("cell 582", ["fizzBuzzZip"], _582);
  main.define("viewof countFizzBuzzZip", ["scan","viewof fizzBuzzZip","invalidation"], _403);
  main.define("countFizzBuzzZip", ["Generators", "viewof countFizzBuzzZip"], (G, _) => G.input(_));
  main.define("cell 406", ["countFizzBuzzZip"], _406);
  main.define("viewof evens", ["map","viewof counter","invalidation"], _439);
  main.define("evens", ["Generators", "viewof evens"], (G, _) => G.input(_));
  main.define("cell 443", ["evens"], _443);
  main.define("viewof headsOrTails", ["map","viewof counter","invalidation"], _454);
  main.define("headsOrTails", ["Generators", "viewof headsOrTails"], (G, _) => G.input(_));
  main.define("cell 458", ["headsOrTails"], _458);
  main.define("viewof deduped", ["scan","viewof headsOrTails","invalidation"], _461);
  main.define("deduped", ["Generators", "viewof deduped"], (G, _) => G.input(_));
  main.define("cell 466", ["deduped"], _466);
  main.define("viewof timestamp", ["map","viewof deduped","invalidation"], _513);
  main.define("timestamp", ["Generators", "viewof timestamp"], (G, _) => G.input(_));
  main.define("cell 519", ["timestamp"], _519);
  main.define("viewof last_5_secs", ["scan","viewof timestamp","invalidation"], _530);
  main.define("last_5_secs", ["Generators", "viewof last_5_secs"], (G, _) => G.input(_));
  main.define("cell 533", ["last_5_secs"], _533);
  main.define("viewof rate", ["map","viewof last_5_secs","invalidation"], _540);
  main.define("rate", ["Generators", "viewof rate"], (G, _) => G.input(_));
  main.define("viewof rate2", ["map","scan","viewof deduped","invalidation"], _567);
  main.define("rate2", ["Generators", "viewof rate2"], (G, _) => G.input(_));
  main.define("interval", ["Inputs","Event"], _27);
  main.define("map", ["Inputs","Event"], _271);
  main.define("scan", ["Inputs","Event"], _362);
  main.define("combineLatest", ["Inputs","Event"], _7);
  main.define("zip", ["Inputs","Event"], _121);
  return main;
}
