const _19a24t5 = function _1(md){return(
md`# Unaggregating Cloud Watch Metrics


[Visnu Pitiyanuvath](https://observablehq.com/@visnup) of Observable advocates _"never aggregate your datapoints"_. The outliers _are_ the signal! His talk made me realize that we, the developer community, could do better, *especially* the Cloud providers. `
)};
const _njxf02 = function _2(htl){return(
htl.html`<details><summary>The "DataViz Dashboards for Developers" talk that inspired me</summary>
<lite-youtube videoid="L_5vavklnVI" playlabel="DataViz Dashboards for Developers"></lite-youtube>
</details>`
)};
const _1suzl5n = function _3(md){return(
md`

Ever since that talk my heart sinks when I assemble a Cloud Watch dashboard. Yes, they work and are useful, but why are they just _lines_?... after some though I realized that, well, maybe they do not need to be? 

Maybe there is a way to take _Visnu_'s lessons and apply them to my day-to-day work. Can we invert Cloud Watch metrics back to something close to the original unaggregated datapoints? Turns out, YES WE CAN!`
)};
const _1atjvd7 = function _4(md){return(
md`## My Uninspiring Cloud Watch Dashboard`
)};
const _1qs2wom = async function _5(FileAttachment,htl){return(
htl.html`<img style="width: 640px"  alt="image@2.png" src="${await FileAttachment("image@2.png").url()}">`
)};
const _1tt5z0e = function _6(md){return(
md`## The same data after unaggregating it`
)};
const _1n4vp0v = function _synthetic_example(Plot,resampled,foreground){return(
Plot.plot({
  width: 640,
  height: 300,
  marginLeft: 50,
  marks: [
    Plot.dot(resampled, {
      x: "time",
      y: "value",
      r: 3,
      fill: foreground,
      opacity: 0.1
    })
    // Plot.dot(tidy_data, {
    //   x: "time",
    //   y: "avg",
    //   r: 3,
    //   fill: "red"
    // })
  ]
})
)};
const _1mwb9qa = function _animate(Inputs){return(
Inputs.toggle({
  label: "resample",
  value: false
})
)};
const _1q68msx = (G, _) => G.input(_);
const _x2bbzy = function _9(md){return(
md`Thats the same data source that displays the Cloud Watch metric above. LOOK AT THE DETAILS. I can see that just before 12pm, traffic stopped, and then there was pent up demand unleashed at 12pm. You _cannot_ see traffic volume in the Cloud Watch chart of latency! I can also see that the biggest outlier is over 20 seconds! Again I can't usually see that in Cloud Watch. THERE IS SO MUCH MAGNIFISCENT DETAIL REVEALED.

It's the same metric! That detail was there, you just have to visualize it.`
)};
const _hn7a4k = function _10(md){return(
md`## How it works

A Cloud Watch metric precisely tracks the _max_, _min_, _count_ and _sum_ into temporal bins ([AWS docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html)). The main idea is to use those statitics to generate something close to the real dataset.

If the sample count in a bin is 1, 2 or 3, you know all the values *exactly*, that's essentially unaggregated points. If you have more than 4 points in a bin, you still know 2 of those points exactly (the min and max), plus you know how many more points there are. We use sampling to regenerate the remaining points, using the statistics to estimate of the skewness. That's what produce the above graph.

Is it accurate though?`
)};
const _1p5jw91 = function _11(md){return(
md`## Ground truth`
)};
const _ui4blm = function _12(md){return(
md`

I have the real datapoints (below) gathered from logs. There are some differences between the unaggregated data and the ground truth data. The ground truth shows a stronger floor latency distribution. But still, the unaggregated graph did a pretty amazing job at representing the real distribution. Its shocking to me that this level of detail was already present in my existing Cloud Watch metrics.`
)};
const _11i01ed = function _ground_truth(Plot,truth,foreground){return(
Plot.plot({
  width: 640,
  height: 300,
  marginLeft: 50,
  x: {
    type: "time"
  },
  marks: [
    Plot.dot(truth, {
      x: "time",
      y: "value",
      r: 3,
      fill: foreground,
      opacity: 0.1
    })
  ]
})
)};
const _1hbtkru = function _14(md){return(
md`## ⚠️ High throughput Metrics

For metric streams under 1 request per second, Cloud Watch metrics streams do not lose much detail because their 4 dimensional statistics are nearly enough to represent the raw dataset in 5 second bins. At higher rates though the synthetically sampled data dominates and obscures.`
)};
const _1n03464 = function _15(md){return(
md`---`
)};
const _1jl8lh = function _16(md){return(
md`Original blog on [Observablehq](https://observablehq.com/@tomlarkworthy/unaggregating-cloudwatch-metrics). Exported to a hermetic local-first form with [Lopecode](https://github.com/tomlarkworthy/lopecode)`
)};
const _14sslpg = function _17(exporter){return(
exporter()
)};
const _1vk7kzy = function _18(md){return(
md`### Appendix: Data`
)};
const _ii00da = function _19(md){return(
md`<details><summary>Boto3 call to collect the Metric Data</summary>
  ${md`
~~~python
import boto3
import json
PERIOD = 60  # seconds

cw = boto3.client('cloudwatch', region_name='eu-central-1')

metric = {
    "Namespace": "Taktile",
    "MetricName": "latency",
    "Dimensions": [
        {"Name":"path","Value":"..."},
        {"Name":"method","Value":"POST"},
        {"Name":"status","Value":"200"},
    ]
}

resp = cw.get_metric_data(
    MetricDataQueries=[
        {
            "Id": "min",
            "MetricStat": {
                "Metric": metric,
                "Period": PERIOD,
                "Stat": "Minimum",
            },
            "ReturnData": True,
        },
        {
            "Id": "max",
            "MetricStat": {
                "Metric": metric,
                "Period": PERIOD,
                "Stat": "Maximum",
            },
            "ReturnData": True,
        },
        {
            "Id": "sum",
            "MetricStat": {
                "Metric": metric,
                "Period": PERIOD,
                "Stat": "Sum",
            },
            "ReturnData": True,
        },
        {
            "Id": "count",
            "MetricStat": {
                "Metric": metric,
                "Period": PERIOD,
                "Stat": "SampleCount",
            },
            "ReturnData": True,
        }
    ],
    StartTime="2025-12-03T20:43Z",
    EndTime="2025-12-04T20:43Z",
)

print(json.dumps(resp, indent=2, default=str))
~~~`}
  
</details>
`
)};
const _1ktfim = function _data(FileAttachment){return(
FileAttachment("data@4.json").json()
)};
const _yc51sk = function _tidy_data(data)
{
  const byTime = new Map();
  const idToField = {
    min: "min",
    max: "max",
    sum: "sum",
    count: "count"
  };
  for (const { Id, Timestamps = [], Values = [] } of data.MetricDataResults) {
    const field = idToField[Id];
    if (!field) continue;
    for (let i = 0; i < Timestamps.length; i++) {
      const t = new Date(Timestamps[i]);
      const key = t.getTime();
      let entry = byTime.get(key);
      if (!entry) {
        entry = { time: t };
        byTime.set(key, entry);
      }
      entry[field] = Values[i];
    }
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};
const _euopxs = function* _resampled(animate,generateSyntheticFromStats,tidy_data)
{
  while (animate) {
    yield new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateSyntheticFromStats(tidy_data, { periodMs: 60_000 }));
      }, 200);
    });
  }
  yield generateSyntheticFromStats(tidy_data, { periodMs: 60_000 });
};
const _1d7limw = async function _truth(FileAttachment){return(
(await FileAttachment("logs-insights-results (27)@1.csv").csv()).map(
  (d) => ({
    time: new Date(d["@timestamp"]).getTime(),
    value: Number.parseInt(d.integration_latency)
  })
)
)};
const _uyily0 = function _24(md){return(
md`### Appendix: Code`
)};
const _1w9avu5 = function _generateSyntheticFromStats(sampleFairFromStats){return(
(
  rows,
  { periodMs = 60000, rng = Math.random } = {}
) => {
  const all = [];
  for (const d of rows ?? []) {
    if (!d || !d.time) continue;

    const bin = [];
    const count = Math.max(1, Math.round(d.count ?? 1));
    const t0 = d.time.getTime();
    const t1 = t0 + periodMs;

    const randTime = () => new Date(t0 + rng() * (t1 - t0));
    const push = (v) => {
      if (v == null || !Number.isFinite(v)) return;
      bin.push({ time: randTime(), value: v, bucketTime: d.time });
    };

    const min = d.min ?? d.avg ?? d.max ?? 0;
    const max = d.max ?? d.avg ?? d.min ?? min;
    const sum =
      d.sum != null && Number.isFinite(d.sum)
        ? d.sum
        : d.avg != null && Number.isFinite(d.avg)
        ? d.avg * count
        : ((min + max) / 2) * count;

    if (count === 1) {
      push(min);
    } else if (count === 2) {
      push(min);
      push(max);
    } else if (count === 3) {
      const mean = sum / count;
      push(min);
      push(mean);
      push(max);
    } else if (count === 4) {
      const innerSum = sum - min - max;
      const mid = innerSum / 2;
      push(min);
      push(mid);
      push(mid);
      push(max);
    } else {
      let remaining = count;
      push(min);
      push(max);
      remaining -= 2;
      for (let i = 0; i < remaining; i++) {
        push(sampleFairFromStats([d.min, d.max, d.sum, d.count]));
      }
    }

    all.push(...bin);
  }
  return all;
}
)};
const _1u87h92 = function _sampleFairFromStats(){return(
([min, max, sum, count], rng = Math.random) => {
  const a = min;
  const b = max;
  if (
    a == null ||
    b == null ||
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a === b
  )
    return a ?? b ?? 0;
  const n = Math.max(1, count ?? 1);
  const mean = sum != null && Number.isFinite(sum) ? sum / n : (a + b) / 2;
  if (!Number.isFinite(mean) || mean <= a || mean >= b)
    return a + rng() * (b - a);
  const Fm = (mean - a) / (b - a);
  const u = rng();
  if (u < Fm) {
    return a + Math.sqrt(u * (b - a) * (mean - a));
  } else {
    return b - Math.sqrt((1 - u) * (b - a) * (b - mean));
  }
}
)};
const _17n6uge = function _unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};
const _z92m23 = function _foreground(getComputedStyle)
{
  const styles = getComputedStyle(document.body);
  return styles.getPropertyValue("--theme-foreground").trim() || "black";
};
const _g3gjqw = function _background(getComputedStyle)
{
  const styles = getComputedStyle(document.body);
  return styles.getPropertyValue("--theme-background").trim() || "black";
};
const _1ywoprp = function _30(md){return(
md`### Appendix: developer tools`
)};
const _8zdpxg = function _32(robocoop){return(
robocoop
)};
const _ull36a = function _34(lite_youtube_css){return(
lite_youtube_css
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image@2.png","data@4.json","logs-insights-results (27)@1.csv"].map((name) => {
    const module_name = "@tomlarkworthy/unaggregating-cloudwatch-metrics";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-2", async () => runtime.module((await import("/@tomlarkworthy/robocoop-2.js?v=4")).default));  
  main.define("module @tomlarkworthy/lite-youtube-embed", async () => runtime.module((await import("/@tomlarkworthy/lite-youtube-embed.js?v=4")).default));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  $def("_19a24t5", null, ["md"], _19a24t5);  
  $def("_njxf02", null, ["htl"], _njxf02);  
  $def("_1suzl5n", null, ["md"], _1suzl5n);  
  $def("_1atjvd7", null, ["md"], _1atjvd7);  
  $def("_1qs2wom", null, ["FileAttachment","htl"], _1qs2wom);  
  $def("_1tt5z0e", null, ["md"], _1tt5z0e);  
  $def("_1n4vp0v", "synthetic_example", ["Plot","resampled","foreground"], _1n4vp0v);  
  $def("_1mwb9qa", "viewof animate", ["Inputs"], _1mwb9qa);  
  $def("_1q68msx", "animate", ["Generators","viewof animate"], _1q68msx);  
  $def("_x2bbzy", null, ["md"], _x2bbzy);  
  $def("_hn7a4k", null, ["md"], _hn7a4k);  
  $def("_1p5jw91", null, ["md"], _1p5jw91);  
  $def("_ui4blm", null, ["md"], _ui4blm);  
  $def("_11i01ed", "ground_truth", ["Plot","truth","foreground"], _11i01ed);  
  $def("_1hbtkru", null, ["md"], _1hbtkru);  
  $def("_1n03464", null, ["md"], _1n03464);  
  $def("_1jl8lh", null, ["md"], _1jl8lh);  
  $def("_14sslpg", null, ["exporter"], _14sslpg);  
  $def("_1vk7kzy", null, ["md"], _1vk7kzy);  
  $def("_ii00da", null, ["md"], _ii00da);  
  $def("_1ktfim", "data", ["FileAttachment"], _1ktfim);  
  $def("_yc51sk", "tidy_data", ["data"], _yc51sk);  
  $def("_euopxs", "resampled", ["animate","generateSyntheticFromStats","tidy_data"], _euopxs);  
  $def("_1d7limw", "truth", ["FileAttachment"], _1d7limw);  
  $def("_uyily0", null, ["md"], _uyily0);  
  $def("_1w9avu5", "generateSyntheticFromStats", ["sampleFairFromStats"], _1w9avu5);  
  $def("_1u87h92", "sampleFairFromStats", [], _1u87h92);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);  
  $def("_z92m23", "foreground", ["getComputedStyle"], _z92m23);  
  $def("_g3gjqw", "background", ["getComputedStyle"], _g3gjqw);  
  $def("_1ywoprp", null, ["md"], _1ywoprp);  
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_8zdpxg", null, ["robocoop"], _8zdpxg);  
  main.define("robocoop", ["module @tomlarkworthy/robocoop-2", "@variable"], (_, v) => v.import("robocoop", _));  
  $def("_ull36a", null, ["lite_youtube_css"], _ull36a);  
  main.define("lite_youtube_css", ["module @tomlarkworthy/lite-youtube-embed", "@variable"], (_, v) => v.import("lite_youtube_css", _));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}