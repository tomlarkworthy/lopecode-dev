const _13elcg3 = async function _1(md,FileAttachment){return(
md`# Exponentially Weighted Moving Rate Estimation with Fast Initialization

For use as serverless in-memory rate limiters ([packaged](https://observablehq.com/@tomlarkworthy/rate-estimation-min)).

![](${await FileAttachment("image.png").url()})

Rate limiters are used to prevent damage and are an important tools for reliability engineering.

This rate estimator is designed to 

- By used in Pareto situations where most tenants are far from engineering limits
- Optimized for small memory footprint
- Designed to reside in lambda memory.
- Fast convergence on initialization

The assumption is that only a few high traffic customers will need rate limiting at any time. Those kinds of workloads will end up hitting all lambda clones in production. Thus it's enough to estimate the rate on an individual runtime and multiple by the number of running clones. Its approximate but cheap.

## Implementation Sketch

Serverless runtimes are booted up frequently, so they need to converge to good estimates fast. As each runtime will have to hold rate counters for all 'recent customers', each counter needs to be lightweight.

To estimate rate we use an Exponentially Weighted Moving Average (EWMA) of the event intervals. At low sample counts we have a _fastConverge_ feature to calculate rate estimates based on small sample size statistics. 

The following page expains how the _fastConverge_ optimization works.
`
)};
const _4iwa59 = function _2(md){return(
md`## Experiment on _fastConverge_ Parameter`
)};
const _u7axw0 = function _experiment(start_t,rate_estimator){return(
{
  window_secs: 2,
  start_t: start_t,
  first: true,
  rate_estimator: rate_estimator({
    fastConverge: false,
    forgetFactor: 0.02,
    initial_rate: 45 / 1000 // Time unit is millis not seconds
  }),
  rate_estimator_fast: rate_estimator({
    fastConverge: true,
    forgetFactor: 0.02,
    initial_rate: 45 / 1000 // Time unit is millis not seconds
  }),
  samples: []
}
)};
const _17b3fnx = (M, _) => new M(_);
const _phi6k = _ => _.generator;
const _12wh4k7 = function _experiment_step(now,experiment)
{
  const sample = now;
  if (now > experiment.start_t + experiment.window_secs * 1000) return;
  
  if (experiment.first) {
    experiment.rate_estimator.last_t = sample;
    experiment.rate_estimator_fast.last_t = sample;
    experiment.start_t = sample;
    experiment.first = false;
    return;
  }
  
  // Update running rate estimators
  experiment.rate_estimator = experiment.rate_estimator.observeAtTime(sample);
  experiment.rate_estimator_fast = experiment.rate_estimator_fast.observeAtTime(sample);
  
  // Push new sample, time and predictions
  experiment.samples.push({
    t: sample,
    r1: experiment.rate_estimator.estimateRateAtTime(sample) * 1000,
    r2: experiment.rate_estimator_fast.estimateRateAtTime(sample) * 1000,
  })
  // expire old samples
  while (experiment.samples[0].t < sample - experiment.window_secs * 1000) 
    experiment.samples.shift()
};
const _1ypal8r = function _start_t(){return(
Date.now()
)};
const _1w5bv8z = (M, _) => new M(_);
const _n5c5b6 = _ => _.generator;
const _17e82vy = function _6(md){return(
md`

The following is a timeseries of the 'now' spike train. On the Y axis is an estimate of the frequency (frames per second). The blue and red are estimates of the rate, with and without the _fastConverge_ parameter. The rate estimation has a low forgetting factor (0.02), so the initial state takes a long time to be forgotten without _fastConverge_.
`
)};
const _552zwp = function _7($0,html)
{
  function reset() {
    $0.value = Date.now()
  }
  return html`<button onclick=${reset}>run</button>`
};
const _1le1bav = function _converge(d3,experiment,now,width)
{
  const margin = { top: 20, right: 30, bottom: 30, left: 40 }
  const viewportHeight = 280;
  const viewportWidth = 500;
  const xMapper = d3
    .scaleTime()
    .domain([experiment.samples[0].t, Math.min(now, experiment.start_t + experiment.window_secs * 1000)])
    .range([margin.left, viewportWidth - margin.right]);

  const yMapper = d3
    .scaleLinear()
    .domain([0, 70])
    .range([viewportHeight - margin.bottom, margin.top]);

  const line = d3
    .line()
    .x(d => xMapper(d[0]))
    .y(d => yMapper(d[1]));

  const xAxis = function(g) {
    return g.attr("transform", `translate(0,${viewportHeight - margin.bottom})`).call(
      d3
        .axisBottom(xMapper)
        .ticks(d3.timeSecond.every(1))
    );
  };

  const yAxis = function(g) {
    return g.attr("transform", `translate(${margin.left},0)`).call(
      d3
        .axisLeft(yMapper)
        .ticks(5)
        .tickSizeOuter(0)
    );
    // to remove the axis line, add the following
    // .call(g => g.select(".domain").remove());
  };

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("width", viewportWidth)
    .attr("height", viewportHeight)
    .attr("style", "border:1px solid black");

  svg
    .append('rect')
    .attr('fill', '#FFF')
    .attr('width', width)
    .attr('height', viewportHeight)
  svg
    .append("path")
    .datum(experiment.samples.flatMap(s => [[s.t, 0], [s.t, 20], [s.t, 0]]))
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
  
  svg
    .append("path")
    .datum(experiment.samples.map(s => [s.t, s.r1]))
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 1.5)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
  
  svg
    .append("path")
    .datum(experiment.samples.map(s => [s.t, s.r2]))
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 1.5)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
  
  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  return svg.node();
};
const _18kd7am = function _9(md){return(
md`[Get gif](https://observablehq.com/@tomlarkworthy/svg-to-gif?id=@tomlarkworthy/rate-estimation&cell=converge)`
)};
const _18n9dnb = function _10(md){return(
md`## Experiment on rate tracking

The forgetFactor controls how must history is integrated into the running rate estimate. A small value is smooth but slow to react to changes in the rate.

`
)};
const _1v08azt = function _experiment_tracking(start_t,rate_estimator,forgetFactor){return(
{
  start_t: start_t,
  window_secs: 2,
  first: true,
  rate_estimator: rate_estimator({
    fastConverge: true,
    forgetFactor: forgetFactor,
    initial_rate: 0
  }),
  samples: []
}
)};
const _z8dytd = (M, _) => new M(_);
const _1ii2bdg = _ => _.generator;
const _19ahixn = function* _experiment_tracking_step(experiment_tracking,frequency,Promises)
{
  while (true) {
    const sample = Date.now()
    if (experiment_tracking.first) {
      experiment_tracking.rate_estimator.last_t = sample;
      experiment_tracking.first = false;
    } else {
      // Update running rate estimators
      experiment_tracking.rate_estimator = experiment_tracking.rate_estimator.observeAtTime(sample);

      // Push new sample, time and predictions
      experiment_tracking.samples.push({
        t: sample,
        r2: experiment_tracking.rate_estimator.estimateRateAtTime(sample) * 1000,
      })
      // expire old samples
      while (experiment_tracking.samples[0].t < sample - experiment_tracking.window_secs * 1000) 
        experiment_tracking.samples.shift()
    }
    const delay = 1.0 / frequency * 1000;
    yield Promises.tick(delay);
  }
};
const _vm59n8 = function _forgetFactor(slider){return(
slider({
  min: 0, 
  max: 1, 
  step: 0.01, 
  value: 0.2, 
  title: "forgetFactor",
})
)};
const _451asy = (G, _) => G.input(_);
const _1bq5b7e = function _frequency(slider){return(
slider({
  min: 1, 
  max: 60, 
  step: 1, 
  value: 20, 
  title: "Events per second"
})
)};
const _18cwxn4 = (G, _) => G.input(_);
const _1b12cky = function _15($0,html)
{
  function reset() {
    $0.value = Date.now()
  }
  return html`<button onclick=${reset}>run</button>`
};
const _i1sud4 = function _16(width,d3,now,experiment_tracking)
{
  const margin = { top: 20, right: 30, bottom: 30, left: 40 }
  const viewportHeight = 300;
  const viewportWidth = width;
  const xMapper = d3
    .scaleTime()
    .domain([now - experiment_tracking.window_secs * 1000, now])
    .range([margin.left, viewportWidth - margin.right]);

  const yMapper = d3
    .scaleLinear()
    .domain([0, 70])
    .range([viewportHeight - margin.bottom, margin.top]);

  const line = d3
    .line()
    .x(d => xMapper(d[0]))
    .y(d => yMapper(d[1]));

  const xAxis = function(g) {
    return g.attr("transform", `translate(0,${300 - margin.bottom})`).call(
      d3
        .axisBottom(xMapper)
        .ticks(d3.timeSecond.every(1))
    );
  };

  const yAxis = function(g) {
    return g.attr("transform", `translate(${margin.left},0)`).call(
      d3
        .axisLeft(yMapper)
        .ticks(5)
        .tickSizeOuter(0)
    );
    // to remove the axis line, add the following
    // .call(g => g.select(".domain").remove());
  };

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", 300)
    .attr("style", "border:1px solid black");

  svg
    .append("path")
    .datum(experiment_tracking.samples.flatMap(s => [[s.t, 0], [s.t, 20], [s.t, 0]]))
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
  
  svg
    .append("path")
    .datum(experiment_tracking.samples.map(s => [s.t, s.r2]))
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 1.5)
    .attr("stroke-miterlimit", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round");
  
  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  return svg.node();
};
const _1w2188r = function _17(md){return(
md`## Experiment on Number of clones 

If we have _n_ clones with user traffic randomly load balanced over them. Then obviously they only see _nth_ the frequency so we should _n_ their estimate too. But should we need also scale their forgetting factor too to keep their convergence rate constant? 

__TODO, not critical right now__
`
)};
const _fr66fl = function _18(md){return(
md`## Forgetful Rate Estimator

Takes a stream of time measurements, and estimates the rate. E.g. send it "new Date().getTime() / 1000" and it will converge to (frames per second)

By default it assumes a rate of 1 dt. You have to initialize the historical state which it then forgets over time by the _forgetFactor_. Without _fastConverge_ it assumes it is always in the steady state. So if you have a low _forgetFactor_, it will be slow to forget its initial conditions.

_fastCoverge_ takes into account the number of samples already taken. When there is a low sample count, new measurements are weighted more heavily than the _forgetFactor_ would. This makes the estimate converge much more quickly after restart.
`
)};
const _asv4s1 = function _rate_estimator(){return(
({
    fastConverge = true,
    forgetFactor = 0.9,
    initial_rate = 1,
    initial_t = 0,
  } = {}) => {
  const smallSetThreshold = Math.floor(1.0 / forgetFactor)
  class RateEstimate {
    constructor(state) {
      Object.assign(this, state);
    }
    observeAtTime (t) {
      const interval = t - this.last_t;
      if (fastConverge && this.n < smallSetThreshold) {
        const n = this.n + 1
        return new RateEstimate({
          n: n,
          last_t: t,
          dt: ((n - 1) * (this.dt) + 1 * interval) / n
        });
      } else {
        return new RateEstimate({
          n: this.n + 1,
          last_t: t,
          dt: (1 - forgetFactor) * (this.dt) + forgetFactor * interval
        });
      }
    }
    estimateRateAtTime (t) {
      if (t === this.last_t) {
        // No time has passed since last observation
        // Use historical mean interval
        return 1.0 / this.dt;
      } else {
        const interval = t - this.last_t;
        if (interval < this.dt) {
          // If less time has passed than expected, we can use
          // the existing estimate
          return 1.0 / this.dt;
        } else {
          // Its been a long time since an observation
          // The lack of information should affect the prediction
          return this.observeAtTime(t).estimateRateAtTime(t);
        }
      }
    }
  }
  return new RateEstimate({
    n: 0,
    last_t: initial_t,
    dt: 1.0 / Math.max(initial_rate, 0.00001)
  })
}
)};
const _5fx7m2 = function _frames_per_second_estimator(rate_estimator){return(
rate_estimator({
  fastConverge: true,
  forgetFactor: 0.01,
  initial_rate: 30,
  initial_t: (new Date().getTime() - 16) / 1000
})
)};
const _86qwda = (M, _) => new M(_);
const _16y1tj = _ => _.generator;
const _yylir = function _21($0,frames_per_second_estimator,now)
{ 
  $0.value = frames_per_second_estimator.observeAtTime(now / 1000)
  return frames_per_second_estimator.estimateRateAtTime(now/1000)
};
const _mh0f1z = function _rate_estimator_tests(createSuite){return(
createSuite()
)};
const _60jerx = (G, _) => G.input(_);
const _1vk3ata = function _23(rate_estimator_tests,expect,rate_estimator){return(
rate_estimator_tests.test("rate_estimator_tests.forgetFactor", () => {
  expect(
    rate_estimator({
      fastConverge: false,
      forgetFactor: 0.7
    }).observeAtTime(2).estimateRateAtTime(2)
  ).toBeCloseTo(0.59)

  expect(
    rate_estimator({
      fastConverge: false,
      forgetFactor: 0.2
    }).observeAtTime(2).estimateRateAtTime(2)
  ).toBeCloseTo(0.83)
})
)};
const _yrwmbk = function _24(rate_estimator_tests,expect,rate_estimator){return(
rate_estimator_tests.test("rate_estimator_tests.initial_rate", () => {
  expect(
    rate_estimator({
      fastConverge: false,
      initial_rate: 0.5
    }).observeAtTime(2).estimateRateAtTime(2)
  ).toBeCloseTo(0.5)

  expect(
    rate_estimator({
      fastConverge: false,
      initial_rate: 2
    }).observeAtTime(0.5).estimateRateAtTime(0.5)
  ).toBeCloseTo(2)
})
)};
const _edx0wq = function _25(rate_estimator_tests,expect,rate_estimator){return(
rate_estimator_tests.test("rate_estimator_tests.estimateRateAtTime(t)", () => {
  expect(
    rate_estimator({
      fastConverge: false,
      initial_rate: 2
    }).estimateRateAtTime(0)
  ).toBeCloseTo(2)
  
  expect(
    rate_estimator({
      fastConverge: false,
      initial_rate: 2
    }).estimateRateAtTime(2)
  ).toBeCloseTo(0.54)
  
})
)};
const _47or8h = function _26(rate_estimator_tests,rate_estimator,expect){return(
rate_estimator_tests.test("rate_estimator_tests.fastConverge(t)", () => {
  // Slow to converge (low forgetFactor)
  // initialized very wrong
  let estimator = rate_estimator({
      fastConverge: true,
      forgetFactor: 0.001,
      initial_rate: 100
    })
  // First measurement is initialization
  expect(
    estimator.estimateRateAtTime(0)
  ).toBeCloseTo(100)
  
  // Delays to first observation pull down rate estimate
  expect(
    estimator.estimateRateAtTime(1)
  ).toBeLessThan(100)
  
  // Do an observation after 1 second.
  estimator = estimator.observeAtTime(1)
  
  // As this is first time we expect to just use that 
  expect(
    estimator.estimateRateAtTime(1)
  ).toBe(1)
  
  debugger;
  // Do an observation after 1.5 second, 0.5 seconds after the first
  estimator = estimator.observeAtTime(1.5)
  
  // With fastConverge we have had two samples, one with an interval of 1 and one with an interval of 0.5
  // Average interval is thus 0.75 (TODO I am not sure arithmetic mean is ideal for frequency domain)
  expect(
    estimator.estimateRateAtTime(1)
  ).toBeCloseTo(1.0 / 0.75)
})
)};
const _1xdmk8a = function _27(md){return(
md`## Exponentially Weighted Moving Average (EWMA)

Takes the average of a stream of numbers, weighted by a forget factor. 1 means ignore history. 0 means ignore fresh data.
`
)};
const _3htsq0 = function _running_mean(){return(
({
    forgetFactor = 0.9,
    initial = 0
  } = {}) => {
  let mean = initial;
  return (datum) => {
    mean = (1 - forgetFactor) * (mean) + forgetFactor * datum;
    return mean
  }
}
)};
const _159wnuz = function _running_mean_tests(createSuite){return(
createSuite()
)};
const _3ps0y7 = (G, _) => G.input(_);
const _1lorig2 = function _30(running_mean_tests,expect,running_mean){return(
running_mean_tests.test("config.initial", () => {
  expect(running_mean({
    initial: 1
  })(1)).toBe(1)
  
  expect(running_mean({
    initial: 2
  })(2)).toBe(2)
})
)};
const _181tb5w = function _31(running_mean_tests,expect,running_mean){return(
running_mean_tests.test("config.forgetFactor", () => {
  expect(running_mean({
    forgetFactor: 0.9
  })(1)).toBe(0.9)
  
  expect(running_mean({
    forgetFactor: 0.2
  })(1)).toBe(0.2)
})
)};
const _rautam = function _d3(require){return(
require("d3@6")
)};
const _v1mltv = function _37(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png"].map((name) => {
    const module_name = "@tomlarkworthy/rate-estimation";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_13elcg3", null, ["md","FileAttachment"], _13elcg3);  
  $def("_4iwa59", null, ["md"], _4iwa59);  
  $def("_u7axw0", "initial experiment", ["start_t","rate_estimator"], _u7axw0);  
  $def("_17b3fnx", "mutable experiment", ["Mutable","initial experiment"], _17b3fnx);  
  $def("_phi6k", "experiment", ["mutable experiment"], _phi6k);  
  $def("_12wh4k7", "experiment_step", ["now","experiment"], _12wh4k7);  
  $def("_1ypal8r", "initial start_t", [], _1ypal8r);  
  $def("_1w5bv8z", "mutable start_t", ["Mutable","initial start_t"], _1w5bv8z);  
  $def("_n5c5b6", "start_t", ["mutable start_t"], _n5c5b6);  
  $def("_17e82vy", null, ["md"], _17e82vy);  
  $def("_552zwp", null, ["mutable start_t","html"], _552zwp);  
  $def("_1le1bav", "converge", ["d3","experiment","now","width"], _1le1bav);  
  $def("_18kd7am", null, ["md"], _18kd7am);  
  $def("_18n9dnb", null, ["md"], _18n9dnb);  
  $def("_1v08azt", "initial experiment_tracking", ["start_t","rate_estimator","forgetFactor"], _1v08azt);  
  $def("_z8dytd", "mutable experiment_tracking", ["Mutable","initial experiment_tracking"], _z8dytd);  
  $def("_1ii2bdg", "experiment_tracking", ["mutable experiment_tracking"], _1ii2bdg);  
  $def("_19ahixn", "experiment_tracking_step", ["experiment_tracking","frequency","Promises"], _19ahixn);  
  $def("_vm59n8", "viewof forgetFactor", ["slider"], _vm59n8);  
  $def("_451asy", "forgetFactor", ["Generators","viewof forgetFactor"], _451asy);  
  $def("_1bq5b7e", "viewof frequency", ["slider"], _1bq5b7e);  
  $def("_18cwxn4", "frequency", ["Generators","viewof frequency"], _18cwxn4);  
  $def("_1b12cky", null, ["mutable start_t","html"], _1b12cky);  
  $def("_i1sud4", null, ["width","d3","now","experiment_tracking"], _i1sud4);  
  $def("_1w2188r", null, ["md"], _1w2188r);  
  $def("_fr66fl", null, ["md"], _fr66fl);  
  $def("_asv4s1", "rate_estimator", [], _asv4s1);  
  $def("_5fx7m2", "initial frames_per_second_estimator", ["rate_estimator"], _5fx7m2);  
  $def("_86qwda", "mutable frames_per_second_estimator", ["Mutable","initial frames_per_second_estimator"], _86qwda);  
  $def("_16y1tj", "frames_per_second_estimator", ["mutable frames_per_second_estimator"], _16y1tj);  
  $def("_yylir", null, ["mutable frames_per_second_estimator","frames_per_second_estimator","now"], _yylir);  
  $def("_mh0f1z", "viewof rate_estimator_tests", ["createSuite"], _mh0f1z);  
  $def("_60jerx", "rate_estimator_tests", ["Generators","viewof rate_estimator_tests"], _60jerx);  
  $def("_1vk3ata", null, ["rate_estimator_tests","expect","rate_estimator"], _1vk3ata);  
  $def("_yrwmbk", null, ["rate_estimator_tests","expect","rate_estimator"], _yrwmbk);  
  $def("_edx0wq", null, ["rate_estimator_tests","expect","rate_estimator"], _edx0wq);  
  $def("_47or8h", null, ["rate_estimator_tests","rate_estimator","expect"], _47or8h);  
  $def("_1xdmk8a", null, ["md"], _1xdmk8a);  
  $def("_3htsq0", "running_mean", [], _3htsq0);  
  $def("_159wnuz", "viewof running_mean_tests", ["createSuite"], _159wnuz);  
  $def("_3ps0y7", "running_mean_tests", ["Generators","viewof running_mean_tests"], _3ps0y7);  
  $def("_1lorig2", null, ["running_mean_tests","expect","running_mean"], _1lorig2);  
  $def("_181tb5w", null, ["running_mean_tests","expect","running_mean"], _181tb5w);  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));  
  main.define("createSuite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("createSuite", _));  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  $def("_rautam", "d3", ["require"], _rautam);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_v1mltv", null, ["footer"], _v1mltv);
  return main;
}