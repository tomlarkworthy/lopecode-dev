const _14ls5q6 = function _1(md){return(
md`# [CloudEvents](https://github.com/cloudevents/spec/blob/v1.0.1/spec.md) Explorer

Events are an extremely common concept in computers to decouple generic producers and consumers. For instance, Zapier allows actions to be triggers by events. Github exposes subscriptions of repository events in their API. Kubernetes has an internal events bus etc.

There is no standard for what an events should look like. The [Cloud Native Computing Foundation (CNCF)](https://cncf.io/) had a stab at it though, so I will use their deliberations as a base for event driven work. 

*"CloudEvents is a vendor-neutral specification for defining the format of event data." https://github.com/cloudevents/spec/blob/v1.0.1/spec.md*

It defines some useful common metadata (id, time, type, source and subject) along with an opaque data payload and the data encoding formal (e.g. JSON/gRPC).

This notebook is a UI component for exploring some deserialized CloudEvent data drawn from *somewhere* using Plot. For the demo I have taken some IP network data and transformed put it in the CloudEvents envelope. This dataset has too many pointscand dimensions which messes up the scale.
`
)};
const _1nm6xq6 = function _eventExplorer(_,tooltip,Plot,addTooltips){return(
(events, settings) => {
  let options = {
    ...(settings.xDim && { x: (d) => _.get(d, settings.xDim) }),
    ...(settings.yDim && { y: (d) => _.get(d, settings.yDim) }),
    ...(settings.zDim && { z: (d) => _.get(d, settings.zDim) }),
    ...(settings.fillDim && { fill: (d) => _.get(d, settings.fillDim) }),
    ...(settings.strokeDim && { stroke: (d) => _.get(d, settings.strokeDim) }),
    title: tooltip
  };

  options = settings.groupX
    ? Plot.groupX({ y: settings.groupX }, options)
    : options;
  options = settings.groupY
    ? Plot.groupY({ x: settings.groupY }, options)
    : options;

  return addTooltips(
    Plot.plot({
      x: {
        //type: "time"
      },
      facet: {
        data: events,
        ...(settings.facetX && { x: (d) => _.get(d, settings.facetX) }),
        ...(settings.facetY && { y: (d) => _.get(d, settings.facetY) })
      },
      marks: [_.get(Plot, settings.mark)(events, options)]
    })
  );
}
)};
const _1i6qve8 = function _3(md){return(
md`### Demo Data: IP Network Traffic Flows Labeled with 75 Apps
*Labeled IP flows with their Application Protocol*

source: https://www.kaggle.com/jsrojas/ip-network-traffic-flows-labeled-with-87-apps`
)};
const _15ejrtg = function _4($0,_,Event,htl,Inputs)
{
  const preset = (args) => {
    $0.value = _.merge($0.value, args);
    $0.dispatchEvent(new Event("input", { bubbles: true }));
  };
  return htl.html`
    <h4>Demo Presets</h4>
    <div style="display: flex">
      ${Inputs.button("Bytes/sec per LABEL over time", {
        reduce: () => {
          preset({
            mark: "barY",
            xDim: "time",
            yDim: "data.flow_bytes_s",
            zDim: null,
            strokeDim: null,
            fillDim: null,
            facetX: null,
            facetY: "data.protocolname",
            groupX: "sum",
            groupY: null
          });
        }
      })}

      ${Inputs.button("sourceports", {
        reduce: () => {
          preset({
            mark: "barY",
            xDim: "data.source_port",
            yDim: null,
            zDim: null,
            strokeDim: null,
            fillDim: null,
            facetX: null,
            facetY: null,
            groupX: "count",
            groupY: null
          });
        }
      })}

      ${Inputs.button("fwd_packets_s", {
        reduce: () => {
          preset({
            mark: "tickX",
            xDim: "data.fwd_packets_s",
            yDim: null,
            zDim: null,
            strokeDim: null,
            fillDim: null,
            facetX: null,
            facetY: null,
            groupX: null,
            groupY: null
          });
        }
      })}

    `;
};
const _128h6si = function _5(md,settings){return(
md`

Code for the graph below
~~~js
eventExplorer(data, ${JSON.stringify(
  Object.fromEntries(Object.entries(settings).filter(([k, v]) => v)),
  null,
  2
)})
~~~

`
)};
const _c6c99q = function _settings(view,Inputs,marks,dims,reducers){return(
view`<div>
  ${[
    "mark",
    Inputs.select(marks, {
      label: "mark"
    })
  ]}
  ${[
    "xDim",
    Inputs.select([undefined].concat(dims), {
      label: "xDim"
    })
  ]}
  ${[
    "yDim",
    Inputs.select([undefined].concat(dims), {
      label: "yDim"
    })
  ]}
  ${[
    "zDim",
    Inputs.select([undefined].concat(dims), {
      label: "zDim"
    })
  ]}
  ${[
    "strokeDim",
    Inputs.select([undefined].concat(dims), {
      label: "strokeDim"
    })
  ]}
  ${[
    "fillDim",
    Inputs.select([undefined].concat(dims), {
      label: "fillDim"
    })
  ]}
  ${[
    "facetX",
    Inputs.select([undefined].concat(dims), {
      label: "facetX"
    })
  ]}
  ${[
    "facetY",
    Inputs.select([undefined].concat(dims), {
      label: "facetY"
    })
  ]}
  ${[
    "groupX",
    Inputs.select([undefined].concat(reducers), {
      label: "groupX"
    })
  ]}
  ${[
    "groupY",
    Inputs.select([undefined].concat(reducers), {
      label: "groupY"
    })
  ]}
`
)};
const _8o97qh = (G, _) => G.input(_);
const _35fey3 = function _exampleEventExplorer(eventExplorer,events,settings){return(
eventExplorer(events, settings)
)};
const _16m1ldh = (G, _) => G.input(_);
const _kfq1vw = function _8(md){return(
md`### Cloud events`
)};
const _z14p3f = function _createEvent(randomId){return(
(args) => ({
  specversion: "1.0",
  id: randomId(),
  time: new Date(),
  type: "default",
  source: "createEvent()",
  subject: "default",
  datacontenttype: "application/json",
  data: undefined,
  ...args
})
)};
const _17f76v1 = function _exampleEvent(createEvent){return(
createEvent()
)};
const _16430xc = function _storedSettings(localStorageView){return(
localStorageView("settings", { json: true })
)};
const _17afxv2 = (G, _) => G.input(_);
const _jvwpi5 = function _pageLoad(_,$0,$1)
{
  _.merge($0.value, {
    // Default if no data in storage
    mark: "tickX",
    xDim: "data.fwd_packets_s"
  });
  _.merge($0.value, $1.value);
};
const _14vbtg4 = function _saveToStorage(pageLoad,Inputs,$0,$1){return(
pageLoad, Inputs.bind($0, $1)
)};
const _p99smv = function _randomId(){return(
() => Math.random().toString(16).substring(2, 12)
)};
const _1gvb24m = function _events(ipNetwork){return(
ipNetwork
)};
const _bphrfx = function _reducers(){return(
[
  "count",
  "sum",
  "proportion",
  "min",
  "max",
  "mean",
  "median",
  "variance",
  "deviation",
  "first",
  "last"
]
)};
const _1kxfss7 = function _marks(){return(
["dot", "tickX", "tickY", "barX", "barY", "cell", "line", "rect"]
)};
const _11d8fm9 = function _tooltip(){return(
(d) => JSON.stringify(d, null, 2)
)};
const _18dy6fo = function _dims(events){return(
Object.keys(events[0])
  .filter((k) => k !== "data")
  .concat(Object.keys(events[0].data).map((k) => "data." + k))
)};
const _1d43f6x = function _ipNetwork(d3,network_csv,createEvent)
{
  const parseTime = d3.timeParse("%d/%m/%Y%H:%M:%S");
  return network_csv.map((d) =>
    createEvent({
      time: parseTime(d.Timestamp),
      subject: d["Flow.ID"],
      data: Object.fromEntries(
        Object.entries(d).map(([key, v]) => {
          key = key.toLowerCase().replaceAll(".", "_");
          if (key.includes("total")) return [key, Number.parseInt(v)];
          if (key.includes("count")) return [key, Number.parseInt(v)];
          if (key.includes("mean")) return [key, Number.parseFloat(v)];
          if (key.includes("std")) return [key, Number.parseFloat(v)];
          if (key.includes("port")) return [key, Number.parseInt(v)];
          if (key.includes("bytes_s")) return [key, Number.parseFloat(v)];
          if (key.includes("packets_s")) return [key, Number.parseFloat(v)];
          if (key.includes("min")) return [key, Number.parseFloat(v)];
          if (key.includes("max")) return [key, Number.parseFloat(v)];
          if (key.includes("duration")) return [key, Number.parseInt(v)];

          if (key == "timestamp") return [key, parseTime(v)];
          return [key, v];
        })
      )
    })
  );
};
const _1dotulf = async function _network_csv(FileAttachment){return(
(
  await FileAttachment("Dataset-Unicauca-Version2-10k.csv.zip").zip()
)
  .file("Dataset-Unicauca-Version2-10k.csv")
  .csv()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["Dataset-Unicauca-Version2-10k.csv.zip"].map((name) => {
    const module_name = "@tomlarkworthy/cloudevents-explorer";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @mkfreeman/plot-tooltip", async () => runtime.module((await import("/@mkfreeman/plot-tooltip.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  $def("_14ls5q6", null, ["md"], _14ls5q6);  
  $def("_1nm6xq6", "eventExplorer", ["_","tooltip","Plot","addTooltips"], _1nm6xq6);  
  $def("_1i6qve8", null, ["md"], _1i6qve8);  
  $def("_15ejrtg", null, ["viewof settings","_","Event","htl","Inputs"], _15ejrtg);  
  $def("_128h6si", null, ["md","settings"], _128h6si);  
  $def("_c6c99q", "viewof settings", ["view","Inputs","marks","dims","reducers"], _c6c99q);  
  $def("_8o97qh", "settings", ["Generators","viewof settings"], _8o97qh);  
  $def("_35fey3", "viewof exampleEventExplorer", ["eventExplorer","events","settings"], _35fey3);  
  $def("_16m1ldh", "exampleEventExplorer", ["Generators","viewof exampleEventExplorer"], _16m1ldh);  
  $def("_kfq1vw", null, ["md"], _kfq1vw);  
  $def("_z14p3f", "createEvent", ["randomId"], _z14p3f);  
  $def("_17f76v1", "exampleEvent", ["createEvent"], _17f76v1);  
  $def("_16430xc", "viewof storedSettings", ["localStorageView"], _16430xc);  
  $def("_17afxv2", "storedSettings", ["Generators","viewof storedSettings"], _17afxv2);  
  $def("_jvwpi5", "pageLoad", ["_","viewof settings","viewof storedSettings"], _jvwpi5);  
  $def("_14vbtg4", "saveToStorage", ["pageLoad","Inputs","viewof storedSettings","viewof settings"], _14vbtg4);  
  $def("_p99smv", "randomId", [], _p99smv);  
  $def("_1gvb24m", "events", ["ipNetwork"], _1gvb24m);  
  $def("_bphrfx", "reducers", [], _bphrfx);  
  $def("_1kxfss7", "marks", [], _1kxfss7);  
  $def("_11d8fm9", "tooltip", [], _11d8fm9);  
  $def("_18dy6fo", "dims", ["events"], _18dy6fo);  
  main.define("addTooltips", ["module @mkfreeman/plot-tooltip", "@variable"], (_, v) => v.import("addTooltips", _));  
  $def("_1d43f6x", "ipNetwork", ["d3","network_csv","createEvent"], _1d43f6x);  
  $def("_1dotulf", "network_csv", ["FileAttachment"], _1dotulf);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}