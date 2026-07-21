const _jvlm9s = async function _1(md,tweet,FileAttachment){return(
md`# Bitcoin Energy Use

Some people think Bitcoin is an ecological disaster:

${tweet("1350869944888664064")}

Other people think the ecological case is overblown ([HN](https://news.ycombinator.com/item?id=25881088))

![](${await FileAttachment("image@3.png").url()})

I feel the root of the problem is scale. How much electricity does Bitcoin burn, relative to how much electricity in general we have?
`
)};
const _rexq4m = async function _2(md,FileAttachment){return(
md`## Hash Rate over time

The network hashrate is how much computation is being performed and is a recorded publically on the blockchain.

![](${await FileAttachment("image.png").url()})

source: https://www.blockchain.com/charts/hash-rate
`
)};
const _roig1s = async function _hashrate(d3,FileAttachment,moment){return(
d3.csvParse(await FileAttachment("hash-rate.csv").text()).map(row => ({
  date: moment(row.Timestamp).toDate(),
  th_per_sec: row['hash-rate']
})).filter(row => row.date > new Date("2015-01-01T00:00"))
)};
const _49ulom = function _4(md){return(
md`## ASIC Efficiency over time

We can look at existing hardware specs to see how fast we can hash/mine at a given point in time.

source: https://www.asicminervalue.com/`
)};
const _zhiv9o = async function _asicminervaluetable(FileAttachment){return(
(await FileAttachment("asicminervalue.com").text()).match(
  /(<table[\s\S]*<\/table>)/
)[1]
)};
const _1nlkum = function _asic_history(tableExtractor,d3,asicminervaluetable,ThPerSec,Watts,moment){return(
tableExtractor(d3.create("div").html(asicminervaluetable)).map(row => ({...row, th_per_sec_per_watt: ThPerSec(row.Hashrate) / Watts(row.Power), date: new Date(moment(row.Release).toDate())}))
)};
const _s8gme1 = function _best_asic_history(asic_history){return(
asic_history.sort((a,b) => a.date - b.date).reduce(
  (acc, row) => {
    if (row.th_per_sec_per_watt > acc.best_th_per_sec_per_watt) {
      acc.best_th_per_sec_per_watt = row.th_per_sec_per_watt;
      acc.history.push(row);
    }
    return acc;
  },
  {
    history: [],
    best_th_per_sec_per_watt: 0
  }
).history
)};
const _19x49cj = function _8(vega,best_asic_history,width){return(
vega({
  data: {values: best_asic_history},
  width,
  height: 500,
  autosize: "fit",
  mark: "line",
  encoding: {
    x: {"field": "Release", "type": "temporal"},
    y: {"field": "th_per_sec_per_watt", "type": "quantitative"}
  }
})
)};
const _12xjve8 = function _best_th_per_sec_per_watt_at(best_asic_history){return(
(date) => {
  return best_asic_history.slice().reverse().find(row => row.date < date).th_per_sec_per_watt
}
)};
const _m4erqm = function _10(md){return(
md`## Minimum Energy Usage over time

If we use the most effecient ASIC technology to mine the recorded hashrate, we can see the minimum energy spend
`
)};
const _14m0epo = function _power_over_time(hashrate,best_th_per_sec_per_watt_at){return(
hashrate.map(row => {
  const best_th_per_sec_per_watt = best_th_per_sec_per_watt_at(row.date);
  const min_watts = row.th_per_sec / best_th_per_sec_per_watt;
  return {
    ...row,
    best_th_per_sec_per_watt,
    min_watts,
    TWh: min_watts * 60 * 60 * 1.0E-12
  };
})
)};
const _1koz43l = function _12(vega,power_over_time,width){return(
vega({
  data: {values: power_over_time},
  width,
  height: 500,
  autosize: "fit",
  mark: "line",
  encoding: {
    x: {"field": "date", "type": "temporal"},
    y: {"field": "TWh", "type": "quantitative"}
  }
})
)};
const _17dmk8z = async function _13(md,FileAttachment){return(
md`# Realistic Energy usage

The above graph assumes all the miners are using the best hardware available to satsify the hash rate. In the paper:

*"Bitcoin’s energy consumption is underestimated: A market dynamics approach"* -- **Alexde Vries**
https://www.sciencedirect.com/science/article/abs/pii/S2214629620302966?via%3Dihub

Vries tries to estimate the inneffeciency leading to estimate of 87.1 TWh of electrical energy annually on September, 2019 (so about 10x the optimal rate).

[Statista](https://www.statista.com/statistics/881472/worldwide-bitcoin-energy-consumption/#:~:text=Global%20Bitcoin%20energy%20consumption%202017%2D2020&text=As%20of%20November%202020%2C%20Bitcoin,76.87%20terawatt%20hours%20per%20year) estiamtes energy leveling off at 80TWh

![](${await FileAttachment("image@2.png").url()})


# Worldwide Electricity usage

So bitcoin is using somewhere in the region on 80TWh to 160TWh. Is that a lot?

![](${await FileAttachment("image@1.png").url()})

World wide energy consumption for *everything* is in the order of 22kTWh, thus Bitcoin is around 0.4% - 0.7% of worldwide consumption.

Given Bitcoin contributes nothing in my life, and electricity a lot, I think Bitcoin usage is way too high for the niche collection of people it is used by.

`
)};
const _1yx5obu = function _ThPerSec(){return(
(hashrate) => {
  if (hashrate.endsWith('Th/s')) {
    return parseFloat(hashrate.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0])
  } else if (hashrate.endsWith('Gh/s')) {
    return parseFloat(hashrate.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0]) * 1e-3
  } else if (hashrate.endsWith('Mh/s')) {
    return parseFloat(hashrate.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0]) * 1e-6
  } else if (hashrate.endsWith('ksol/s')) {
    return parseFloat(hashrate.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0]) * 1e-9
  } else if (hashrate.endsWith('h/s')) {
    return parseFloat(hashrate.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0]) * 1e-12
  }
  throw new Error("Unrecognised unit " + hashrate)
}
)};
const _e87pff = function _ThPerSecTests(createSuite){return(
createSuite()
)};
const _1i3jogn = (G, _) => G.input(_);
const _5owwzj = function _ThPerSecTestCase(ThPerSecTests,expect,ThPerSec){return(
function ThPerSecTestCase(input, expected) {
  return ThPerSecTests.test(`${input} is ${expected}TH/s`, () => {
    expect(ThPerSec(input)).toBe(expected)
  })
}
)};
const _1xl9h7a = function _Watts(hashrate){return(
(power) => {
  if (power.endsWith('W')) {
    return parseFloat(power.match(/^([+-]?([0-9]*[.])?[0-9]+)/)[0])
  }
  throw new Error("Unrecognised unit " + hashrate)
}
)};
const _atjx8n = function _18(ThPerSecTestCase){return(
ThPerSecTestCase("6.6Th/s", 6.6)
)};
const _j9ts5l = function _19(ThPerSecTestCase){return(
ThPerSecTestCase("1Gh/s", 0.001)
)};
const _8851r7 = function _20(ThPerSecTestCase){return(
ThPerSecTestCase("12Mh/s", 0.000012)
)};
const _1umz88b = function _21(ThPerSecTests,asic_history,ThPerSec){return(
ThPerSecTests.test(`All Hashrate of asic_history can be converted to Th/s`, () => {
  asic_history.map(row => ThPerSec(row.Hashrate))
})
)};
const _1o4t1o3 = function _22(ThPerSecTests,asic_history,Watts){return(
ThPerSecTests.test(`All Power of asic_history can be converted to W`, () => {
  asic_history.map(row => Watts(row.Power))
})
)};
const _rautam = function _d3(require){return(
require("d3@6")
)};
const _r7bm6x = function _moment(require){return(
require('moment')
)};
const _ngpy6j = function _vega(require){return(
require("@observablehq/vega-lite@0.1")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png","hash-rate.csv","asicminervalue.com","image@1.png","image@2.png","image@3.png"].map((name) => {
    const module_name = "@tomlarkworthy/bitcoin-energy";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @fil/table-extractor", async () => runtime.module((await import("/@fil/table-extractor.js?v=4")).default));  
  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  main.define("module @sdaas/d3-timeseries", async () => runtime.module((await import("/@sdaas/d3-timeseries.js?v=4")).default));  
  main.define("module @mbostock/tweet", async () => runtime.module((await import("/@mbostock/tweet.js?v=4")).default));  
  $def("_jvlm9s", null, ["md","tweet","FileAttachment"], _jvlm9s);  
  $def("_rexq4m", null, ["md","FileAttachment"], _rexq4m);  
  $def("_roig1s", "hashrate", ["d3","FileAttachment","moment"], _roig1s);  
  $def("_49ulom", null, ["md"], _49ulom);  
  $def("_zhiv9o", "asicminervaluetable", ["FileAttachment"], _zhiv9o);  
  $def("_1nlkum", "asic_history", ["tableExtractor","d3","asicminervaluetable","ThPerSec","Watts","moment"], _1nlkum);  
  $def("_s8gme1", "best_asic_history", ["asic_history"], _s8gme1);  
  $def("_19x49cj", null, ["vega","best_asic_history","width"], _19x49cj);  
  $def("_12xjve8", "best_th_per_sec_per_watt_at", ["best_asic_history"], _12xjve8);  
  $def("_m4erqm", null, ["md"], _m4erqm);  
  $def("_14m0epo", "power_over_time", ["hashrate","best_th_per_sec_per_watt_at"], _14m0epo);  
  $def("_1koz43l", null, ["vega","power_over_time","width"], _1koz43l);  
  $def("_17dmk8z", null, ["md","FileAttachment"], _17dmk8z);  
  $def("_1yx5obu", "ThPerSec", [], _1yx5obu);  
  $def("_e87pff", "viewof ThPerSecTests", ["createSuite"], _e87pff);  
  $def("_1i3jogn", "ThPerSecTests", ["Generators","viewof ThPerSecTests"], _1i3jogn);  
  $def("_5owwzj", "ThPerSecTestCase", ["ThPerSecTests","expect","ThPerSec"], _5owwzj);  
  $def("_1xl9h7a", "Watts", ["hashrate"], _1xl9h7a);  
  $def("_atjx8n", null, ["ThPerSecTestCase"], _atjx8n);  
  $def("_j9ts5l", null, ["ThPerSecTestCase"], _j9ts5l);  
  $def("_8851r7", null, ["ThPerSecTestCase"], _8851r7);  
  $def("_1umz88b", null, ["ThPerSecTests","asic_history","ThPerSec"], _1umz88b);  
  $def("_1o4t1o3", null, ["ThPerSecTests","asic_history","Watts"], _1o4t1o3);  
  main.define("tableExtractor", ["module @fil/table-extractor", "@variable"], (_, v) => v.import("tableExtractor", _));  
  $def("_rautam", "d3", ["require"], _rautam);  
  main.define("createSuite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("createSuite", _));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));  
  main.define("timeSeries", ["module @sdaas/d3-timeseries", "@variable"], (_, v) => v.import("timeSeries", _));  
  $def("_r7bm6x", "moment", ["require"], _r7bm6x);  
  $def("_ngpy6j", "vega", ["require"], _ngpy6j);  
  main.define("tweet", ["module @mbostock/tweet", "@variable"], (_, v) => v.import("tweet", _));
  return main;
}