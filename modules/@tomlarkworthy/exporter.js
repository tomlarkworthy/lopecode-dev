const _11i1qeu = function _1(md){return(
md`# Exporter: Single File Serializer
## [video explainer](https://www.youtube.com/watch?v=wx93r1pY_6Y)


Serialize literate computational notebooks with their dependancies into single files. Double click to open locally. No server required, works in a \`file://\` context for simplicity.

- **File-first** representation. The [Observable Runtime](https://github.com/observablehq/runtime) and common builtins like \`Inputs\`, \`htl\`, \`highlight\`, \`_\` (lodash) and \`markdown\` are bundled for offline operation. directly push to S3 or S3-like too if you want 
- **Recursive and self-sustaining**, the exporter is implemented in userspace and can be invoked again after exporting.
- **Fast**, single file notebooks open fast!
- **Moldable**, the file format is uncompressed, readable, editable with a text editor, and diffable by Git. 
- **Runtime-as-the-source-of-truth**, format derived from the live [Obervable Runtime](https://github.com/observablehq/runtime) representation.
- **No boxing**, the notebook is rendered without an iframe 
`
)};
const _1ioy64l = function _2(md){return(
md`⚠️ A new version of exporter with vastly better themed CSS is available [here](https://observablehq.com/@tomlarkworthy/exporter-2)`
)};
const _24cys7 = function _parameters(Inputs,exporter,default_style,$0,Event,localStorageView){return(
Inputs.bind(
  exporter({
    style: default_style,
    output: (out) => {
      $0.value = out;
      $0.dispatchEvent(new Event("input"));
    }
  }),
  localStorageView(`exporter-${document.baseURI}`, {
    json: true,
    defaultValue: exporter().value
  })
)
)};
const _1k442co = (G, _) => G.input(_);
const _8ifz29 = function _4(md){return(
md`## Usage Guide

You can use the UI here to export any Observable notebook to a single file. But that's not the coolest thing.

If you include the exporter in the notebook to be exported, you will enable recursive exporting. You can get a feel for that by running the exporter in *this* notebook. Try clicking "Preview" which will open an in-memory copy of a notebook exporter in a new browser tab in a \`blob://\` url. You can keep pressing "Preview"!.

To put the exporter in one of your notebooks, first import the UI builder. 
\`\`\`js
import {exporter } from '@tomlarkworthy/exporter'
\`\`\`

Then call the builder to make the UI. You don't need to pass any options, but the options is where you can customise the output format.
\`\`\`js
exporter({
  handler: (action, state) => {...}, // Optional UI click handler
  style: // customer reference to a style DOM node or a string to insert as a style block
  output: (out) => ... // hook to get result of exporting
  notebook_url: // hardcode the default notebook_url
  headless: false // Use an empty inspector and no placement div.
})
\`\`\`

If you want it to remember your settings, its a [composite view](https://observablehq.com/@tomlarkworthy/view) so you can script it or bind it to a storage solution, _e.g._

\`\`\`js
viewof parameters = Inputs.bind(
  exporter(),
  localStorageView(\`exporter-${document.baseURI}\`, {
    json: true,
    defaultValue: exporter().value
  })
)

\`\`\`


If you want to export without a UI, use the function \`exportToHTML\`, see the [example](https://observablehq.com/@tomlarkworthy/export-to-html-example)

\`\`\`js
import {exportToHTML } from '@tomlarkworthy/exporter'
\`\`\``
)};
const _1et6b01 = function _5(md){return(
md`## Lope Format Specification

The HTML file is split into several \`<script>\` blocks that have different purposes.

### FileAttachments

File attachments are static assets encoded as a base64 strings with some metadata to understand the content-type and their URL.

~~~html
<script type="lope-file"       
        file="runtime.js.gz"
        module="@tomlarkworthy/exporter"
        mime="application/gzip">
...base64 encoded string
</scr\ipt>
~~~

### Modules

Modules are serialised Observable notebooks that are loaded into the runtime. The content of these look similar to the format used in the 1st party [download code](https://observablehq.com/@observablehq/advanced-embeds) feature. The contain cell definitions, and a module's [\`define\`](https://github.com/observablehq/runtime?tab=readme-ov-file#runtimemoduledefine-observer) which can import them into a running Runtime instance.

~~~html
<script type="lope-module"            
        id="@tomlarkworthy/exporter"          
        file="runtime.js.gz">
...lots of Javascript
</scr\ipt>
~~~

### Bootloader

The bootloader is normal \`<script type="application/javascript">\` block that initialises the notebook. It has a few phases
1. Discovers all the modules and builds \`blob://\` URLs for them.
2. Creates an *importmap* from notebook urls to \`lope-module\` blob URLs.
4. Creates a javascript *module* to execute *after* the \`importmap\`
   1. Sets up a custom Observable Runtime Library defaulting to exporter bundled dependancies.
   2. Starts the Observable Runtime with the standard inspector.

The ordering and types of javascript are important. By putting notebook source under the type \`lope-module\` it is not interpreted as javascript by the browser. So the first real code to execute is the \`importmap\`. By running the Observable runtime inside a \`module\` script, the ESM imports in modules are resolved using the \`importmap\`.
  
### Style sheet

Two style sheets define the look, one is the [inspector css](https://github.com/observablehq/inspector/blob/main/src/style.css) and the other is one I made up as I don't think the original Observable stylesheet is open-source.`
)};
const _hyblhs = function _6(md){return(
md`## Debugging

To help understand the information flow, the bundling processes is implemented as reactive dataflow, so you can inspect the steps after you serialize. To help composability, that dataflow is encapsulated into a promise using [@tomlarkworthy/flow-queue](https://observablehq.com/@tomlarkworthy/flow-queue).

While helpful, the dataflow is not enough to debug problems! The Javascript \`debugger\` statement is placed at parts of the code that *should never happen*™️. If you are lucky, simply serializing a notebook with the developer tools open might lead you straight to the problem areas.

Furthermore, when debugging difficult cases I add additional \`debugger\` statements conditioned on the execution context. As Observable is executing Javascript, the browser's developer tool features like \`debugger\` and REPL are invaluable tools to track down bugs and gather more information at problem sites.`
)};
const _kuzcdk = function _7(md){return(
md`## Persisted Hash URL

To help carry state across an export, the URL hash parameter is remembered and set automatically when opening the file. If you need to move large amount of data, use a [local FileAttachment](https://observablehq.com/@tomlarkworthy/fileattachments) instead.`
)};
const _pb6k9b = function _8(md){return(
md`### TODO
- Bug: Every recursive cycle more imports cells are created
- Improve: Set S3 URL in arg
- Improve: Refactor the bootloader so its not an inline string. (would avoids some escaping issues)

### Known Issues
  - Doesn't work for \`with\` clauses in imports. Fixing is not a priority, they are complex.`
)};
const _1czbr75 = function _example(exporter){return(
exporter()
)};
const _4me580 = (G, _) => G.input(_);
const _v3220x = function _exporter(actionHandler,default_style,keepalive,exporter_module,variable,domView,exportState,view,diskImgUrl,Inputs,createShowable,top120List,reportValidity,invalidation,bindOneWay){return(
({
  handler = actionHandler,
  style = default_style,
  output = (out) => {},
  notebook_url = "",
  head,
  headless,
  debug = false
} = {}) => {
  keepalive(exporter_module, "futureExportedState");

  const handlerVar = variable(handler);
  const feedback = domView();
  const options = {
    style,
    output,
    head: head === undefined ? exportState?.options?.head : head,
    headless:
      headless === undefined ? exportState?.options?.headless : headless,
    debug
  };
  const spinner = async (...args) => {
    try {
      ui.querySelector(".disk-image").classList.add("spinning");
      await handler(...args, (cb) => (feedback.value = cb));
      ui.querySelector(".disk-image").classList.remove("spinning");
    } catch (e) {
      ui.querySelector(".disk-image").classList.remove("spinning");
      throw e;
    }
  };
  const ui = view`<div class="moldbook-exporter" style="max-width: 450px;">
    <style>
      .observablehq:has(> .moldbook-exporter){
        padding: 0px;
      }
      .moldbook-exporter {
        background: linear-gradient(#333, #111, #333);
        border-radius: 6px;
        padding: 2px;
        color: black;
        font-size: 0.8rem;
      }
      .moldbook-exporter button {
        background: black;
        color: white;
        height: 20px;
        font-size: 0.7rem;
      }
      .moldbook-exporter form {
        width: auto;
      }
      .moldbook-exporter :is(select,input) {
        color: black;
      }
      .moldbook-exporter .moldbook-dark {
        background: black;
        color: white;
      }

      .moldbook-exporter .moldbook-dark :is(select,input) {
        font-size: 0.5rem;
      }

      @keyframes spin {
        from {
          transform: rotateY(0deg);
        }
      
        to {
          transform: rotateY(180deg);
        }
      }
      .moldbook-exporter .spinning {
          transform-style: preserve-3d;
          animation-name: spin;
          animation-duration: 0.2s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: alternate;  
      }
    </style>
    ${["handler", handlerVar]}
    <div style="display: flex; "> 
      <img class="disk-image"
                  style="width: 50px;
                  height: 100%;
                  border-radius: 1px;"
            src=${diskImgUrl}
        ></img>
      <div style="width: 10px"></div>
      <div style="width: 100%">
        <div style="background: yellow;">
          <span style="display: flex;
                       align-items: center;
                       margin-left: 5px">
            notebook to export:
            <div style="flex-grow:1"></div>
            ${[
              "source",
              Inputs.select(
                ["this notebook", "a notebook url", "the top 100"],
                {
                  width: 100
                }
              )
            ]}
          </span>
          ${[
            "notebook_url",
            createShowable(
              Inputs.text({
                value: notebook_url,
                placeholder: "https://observablehq.com/@tomlarkworthy/exporter"
              })
            )
          ]}
          ${["top_100", createShowable(Inputs.select(top120List))]}
        </div>
        <div class="moldbook-dark">
          <div>
            ${[
              "s3Params",
              createShowable(
                view`<div>
                  ${[
                    "url",
                    reportValidity(
                      Inputs.text({
                        label: "S3 Object URL",
                        placeholder:
                          "https://<BKT>.s3.<REGION>.amazonaws.com/moldbook.html",
                        pattern: "https?://.*"
                      }),
                      invalidation
                    )
                  ]}
                  ${[
                    "accessKeyId",
                    reportValidity(
                      Inputs.text({
                        label: "access key id",
                        placeholder: ""
                      }),
                      invalidation
                    )
                  ]}
                  ${[
                    "secretAccessKey",
                    reportValidity(
                      Inputs.password({
                        label: "secret access key",
                        placeholder: ""
                      }),
                      invalidation
                    )
                  ]}
                </div>`
              )
            ]}
            <div style="display: flex;
                        gap: 5px;
                        justify-content: flex-end;
                        align-items: center;
                        margin-left: 5px;">
              output:
              <div style="flex-grow:1"></div>
              ${[
                "blob",
                Inputs.button("Preview", {
                  reduce: () => spinner("tab", ui.value, options)
                })
              ]}
              ${[
                "html",
                Inputs.button("Download", {
                  reduce: () => spinner("file", ui.value, options)
                })
              ]}
              ${[
                "s3",
                Inputs.button("S3", {
                  reduce: () =>
                    ui.value.s3Params.child.url &&
                    spinner("s3", ui.value, options)
                })
              ]}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="background: white;">
      ${feedback}
    </div>
  </div>`;

  bindOneWay(ui.notebook_url.show, ui.source, {
    transform: (src) => src === "a notebook url"
  });
  bindOneWay(ui.top_100.show, ui.source, {
    transform: (src) => src === "the top 100"
  });
  bindOneWay(ui.s3Params.show, ui.s3, {
    transform: (src) => !ui.value.s3Params.show || ui.value.s3Params.child.url
  });
  return ui;
}
)};
const _fmjg2v = function _actionHandler(Inputs,getSourceModule,exportToHTML,view,html,location,getCompactISODate,AwsClient,ReadableStream,CompressionStream,Response,md){return(
async (action, state, options, feedback_callback) => {
  feedback_callback(Inputs.textarea({ value: `Generating source...\n` }));

  const { notebook, module } = await getSourceModule(state);
  const response = await exportToHTML({
    notebook,
    module,
    options
  });

  if (options.output) {
    options.output(response);
  }

  const { source, report } = response;

  const fileByName = report.reduce((acc, f) => {
    acc[f.file] = f;
    return acc;
  }, {});

  const url = URL.createObjectURL(new Blob([source], { type: "text/html" }));

  feedback_callback(
    view`
      <center><h2><a href="${url}" target="_blank">export</a></h2></center>
      <center><b>FileAttachment</b></center>
      ${Inputs.table(
        report.filter((f) => f.file),
        {
          columns: ["file", "size"],
          width: { file: "80%", size: "20%" },
          format: {
            file: (f) =>
              html`<a target="_blank" href=${fileByName[f].id}>${f} (${fileByName[f].module})`
          },
          sort: "size",
          reverse: true
        }
      )}
      <center><b>Modules</b></center>
      ${Inputs.table(
        report.filter((f) => !f.file),
        {
          columns: ["id", "size"],
          width: { id: "80%", size: "20%" },
          sort: "size",
          reverse: true
        }
      )}
    `
  );

  if (action === "tab") {
    window.open(url + location.hash, "_blank");
  } else if (action === "file") {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notebook}_${getCompactISODate()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (action === "s3") {
    const client = new AwsClient({
      accessKeyId: state.s3Params.child.accessKeyId,
      secretAccessKey: state.s3Params.child.secretAccessKey
    });
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(source));
        controller.close();
      }
    });

    // Compress using the CompressionStream API
    const gzipStream = new CompressionStream("gzip");
    const compressedStream = readableStream.pipeThrough(gzipStream);

    // Wrap the compressed stream in a Blob
    const compressedBlob = new Response(compressedStream).blob();

    // Upload the compressed Blob
    const response = await client.fetch(state.s3Params.child.url, {
      method: "PUT",
      body: await compressedBlob,
      headers: {
        "Content-Encoding": "gzip",
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, public, max-age=31536000"
      }
    });

    if (response.status == 200) window.open(state.s3Params.child.url, "_blank");
    else {
      feedback_callback(md`~~~\n${await response.text()}\n~~~`);
    }
  }
}
)};
const _1qh3pkx = function _exportToHTML(main,keepalive,exporter_module,$0){return(
async function exportToHTML({
  notebook, // String, name of module e.g. "@tomlarkworthy/exporter"
  module = main, // Module, main module reference
  modules, // Optional Map<String, Module> additional modules to add e.g. "@tomlarkworthy/agent" -> Module
  options // Object, export options, e.g. headless
} = {}) {
  // Force observation of response
  keepalive(exporter_module, "tomlarkworthy_exporter_task");
  const response = await $0.send({
    notebook,
    module,
    modules,
    options
  });
  return response;
}
)};
const _eyzsra = function _getSourceModule(notebook_name, main) {
    return async state => {
        if (state.source == 'this notebook')
            return {
                notebook: notebook_name,
                module: main
            };
        const url = state.source == 'a notebook url' ? state.notebook_url.child : state.top_100.child;
        const notebook = url.trim().replace('https://observablehq.com/', '');
        const [{Runtime, Inspector}, {default: define}] = await Promise.all([
            import('https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js'),
            import(`https://api.observablehq.com/${ notebook }.js?v=4`)
        ]);
        return {
            notebook,
            module: new Runtime().module(define)
        };
    };
};
const _10asekp = function _createShowable(variable,view){return(
function createShowable(child, { show = true } = {}) {
  const showVariable = variable(show, { name: "show" });
  const showable = view`<div>${["show", showVariable]}${["child", child]}`;

  // The showable logic is to toggle the visibility of the enclosing div based
  // on the show variable state
  const updateDisplay = () => {
    if (showVariable.value) {
      showable.style.display = "inline";
    } else {
      showable.style.display = "none";
    }
  };
  // Variables have additional assign event so presentation can be
  // updated as soon as variables change but before dataflow
  // because this is a pure presentation state it makes sense not to trigger
  // dataflow so we do not use 'input' event
  showVariable.addEventListener("assign", updateDisplay);

  updateDisplay();
  return showable;
}
)};
const _k5lohd = function _reportValidity(){return(
(view, invalidation) => {
  const input = view.querySelector("input");
  const report = () => view.reportValidity();
  input.addEventListener("input", report);
  invalidation.then(() => input.removeEventListener("input", report));
  return view;
}
)};
const _1ioj1hn = function _top120List(){return(
[
  "https://observablehq.com/@jashkenas/inputs",
  "https://observablehq.com/@d3/gallery",
  "https://observablehq.com/@d3/learn-d3",
  "https://observablehq.com/@makio135/creative-coding",
  "https://observablehq.com/@observablehq/module-require-debugger",
  "https://observablehq.com/@d3/zoomable-sunburst",
  "https://observablehq.com/@observablehq/plot",
  "https://observablehq.com/@tmcw/enigma-machine",
  "https://observablehq.com/@d3/force-directed-graph-component",
  "https://observablehq.com/@d3/bar-chart-race-explained",
  "https://observablehq.com/@observablehq/data-wrangler",
  "https://observablehq.com/@d3/collapsible-tree",
  "https://observablehq.com/@sxywu/introduction-to-svg-and-d3-js",
  "https://observablehq.com/@d3/sankey-component",
  "https://observablehq.com/@d3/zoomable-circle-packing",
  "https://observablehq.com/@d3/selection-join",
  "https://observablehq.com/@bstaats/graph-visualization-introduction",
  "https://observablehq.com/@d3/color-legend",
  "https://observablehq.com/@uwdata/introducing-arquero",
  "https://observablehq.com/@mbostock/10-years-of-open-source-visualization",
  "https://observablehq.com/@nitaku/tangled-tree-visualization-ii",
  "https://observablehq.com/@makio135/give-me-colors",
  "https://observablehq.com/@johnburnmurdoch/bar-chart-race-the-most-populous-cities-in-the-world",
  "https://observablehq.com/@d3/color-schemes",
  "https://observablehq.com/@tezzutezzu/world-history-timeline",
  "https://observablehq.com/@d3/calendar",
  "https://observablehq.com/@observablehq/a-taste-of-observable",
  "https://observablehq.com/@d3/bar-chart-race",
  "https://observablehq.com/@mourner/martin-real-time-rtin-terrain-mesh",
  "https://observablehq.com/@uwdata/introduction-to-vega-lite",
  "https://observablehq.com/@mbostock/voronoi-stippling",
  "https://observablehq.com/@ben-tanen/a-tutorial-to-using-d3-force-from-someone-who-just-learned-ho",
  "https://observablehq.com/@d3/hierarchical-edge-bundling",
  "https://observablehq.com/@observablehq/introduction-to-data",
  "https://observablehq.com/@harrystevens/directly-labelling-lines",
  "https://observablehq.com/@observablehq/summary-table",
  "https://observablehq.com/@observablehq/plot-cheatsheets",
  "https://observablehq.com/@tomshanley/cheysson-color-palettes",
  "https://observablehq.com/@tophtucker/inferring-chart-type-from-autocorrelation-and-other-evils",
  "https://observablehq.com/@mitvis/introduction-to-d3",
  "https://observablehq.com/@veltman/watercolor",
  "https://observablehq.com/@veltman/centerline-labeling",
  "https://observablehq.com/@mbostock/scrubber",
  "https://observablehq.com/@observablehq/electoral-college-decision-tree",
  "https://observablehq.com/@d3/tree-component",
  "https://observablehq.com/@d3/radial-tree-component",
  "https://observablehq.com/@d3/world-tour",
  "https://observablehq.com/@observablehq/introduction-to-generators",
  "https://observablehq.com/@yurivish/peak-detection",
  "https://observablehq.com/@mkfreeman/plot-tooltip",
  "https://observablehq.com/@aboutaaron/racial-demographic-dot-density-map",
  "https://observablehq.com/@mbostock/methods-of-comparison-compared",
  "https://observablehq.com/@rreusser/gpgpu-boids",
  "https://observablehq.com/@rreusser/2d-n-body-gravity-with-poissons-equation",
  "https://observablehq.com/@bumbeishvili/data-driven-range-sliders",
  "https://observablehq.com/@observablehq/introducing-visual-dataflow",
  "https://observablehq.com/@observablehq/vega-lite",
  "https://observablehq.com/@observablehq/observable-for-jupyter-users",
  "https://observablehq.com/@observablehq/how-observable-runs",
  "https://observablehq.com/@unkleho/introducing-d3-render-truly-declarative-and-reusable-d3",
  "https://observablehq.com/@vega/a-guide-to-guides-axes-legends-in-vega",
  "https://observablehq.com/@bartok32/diy-inputs",
  "https://observablehq.com/@mbostock/polar-clock",
  "https://observablehq.com/@dakoop/learn-js-data",
  "https://observablehq.com/@mbostock/manipulating-flat-arrays",
  "https://observablehq.com/@uwdata/an-illustrated-guide-to-arquero-verbs",
  "https://observablehq.com/@daformat/rounding-polygon-corners",
  "https://observablehq.com/@yurivish/seasonal-spirals",
  "https://observablehq.com/@emamd/animating-lots-and-lots-of-circles-with-regl-js",
  "https://observablehq.com/@uwdata/data-visualization-curriculum",
  "https://observablehq.com/@d3/d3-group",
  "https://observablehq.com/@d3/tree-of-life",
  "https://observablehq.com/@d3/arc-diagram",
  "https://observablehq.com/@d3/choropleth",
  "https://observablehq.com/@mattdzugan/generative-art-using-wind-turbine-data",
  "https://observablehq.com/@jashkenas/handy-embed-code-generator",
  "https://observablehq.com/@analyzer2004/plot-gallery",
  "https://observablehq.com/@nsthorat/how-to-build-a-teachable-machine-with-tensorflow-js",
  "https://observablehq.com/@d3/sunburst-component",
  "https://observablehq.com/@tomlarkworthy/saas-tutorial",
  "https://observablehq.com/@mbostock/the-wealth-health-of-nations",
  "https://observablehq.com/@yy/covid-19-fatality-rate",
  "https://observablehq.com/@bryangingechen/importing-data-from-google-spreadsheets-into-a-notebook-we",
  "https://observablehq.com/@mbostock/slide",
  "https://observablehq.com/@kerryrodden/sequences-sunburst",
  "https://observablehq.com/@d3/zoom-to-bounding-box",
  "https://observablehq.com/@ambassadors/interactive-plot-dashboard",
  "https://observablehq.com/@sethpipho/fractal-tree",
  "https://observablehq.com/@mbostock/saving-svg",
  "https://observablehq.com/@analyzer2004/west-coast-weather-from-seattle-to-san-diego",
  "https://observablehq.com/@tmcw/tables",
  "https://observablehq.com/@observablehq/introduction-to-serverless-notebooks",
  "https://observablehq.com/@mootari/range-slider",
  "https://observablehq.com/@d3/animated-treemap",
  "https://observablehq.com/@d3/treemap-component",
  "https://observablehq.com/@uwdata/interaction",
  "https://observablehq.com/@hydrosquall/d3-annotation-with-d3-line-chart",
  "https://observablehq.com/@jiazhewang/introduction-to-antv",
  "https://observablehq.com/@d3/hierarchical-bar-chart",
  "https://observablehq.com/@uwdata/data-types-graphical-marks-and-visual-encoding-channels",
  "https://observablehq.com/@observablehq/why-use-a-radial-data-visualization",
  "https://observablehq.com/@kerryrodden/introduction-to-text-analysis-with-tf-idf",
  "https://observablehq.com/@uw-info474/javascript-data-wrangling",
  "https://observablehq.com/@karimdouieb/try-to-impeach-this-challenge-accepted",
  "https://observablehq.com/@observablehq/plot-gallery",
  "https://observablehq.com/@carmen-tm/women-architects-i-didnt-hear-about",
  "https://observablehq.com/@d3/versor-dragging",
  "https://observablehq.com/@analyzer2004/timespiral",
  "https://observablehq.com/@d3/brushable-scatterplot-matrix",
  "https://observablehq.com/@observablehq/require",
  "https://observablehq.com/@anjana/functional-javascript-first-steps",
  "https://observablehq.com/@hamzaamjad/tiny-charts",
  "https://observablehq.com/@observablehq/views",
  "https://observablehq.com/@yurivish/quarantine-now",
  "https://observablehq.com/@analyzer2004/performance-chart",
  "https://observablehq.com/@freedmand/sounds",
  "https://observablehq.com/@d3/bubble-chart-component",
  "https://observablehq.com/@d3/mobile-patent-suits",
  "https://observablehq.com/@observablehq/notebook-visualizer",
  "https://observablehq.com/@d3/force-directed-tree"
]
)};
const _tgf41g = function _default_style(htl){return(
htl.html`<style>/* General layout with max-width */
  
:root {
  --system-ui: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  --code: code, "monospace";
}
  
body {
  font-family: var(--system-ui);
  font-size: 1rem;
  font-weight: 200;
  line-height: 1.6;
  margin: 0 auto;
}

.observablehq {
  max-width: 1200px;
  border-radius: 2px; 
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin-bottom: 1px;
  background-color: #ffffff;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  color: #2c3e50;
  font-weight: 400;
}

h1 { font-size: 2.5rem;  line-height: 1.2;  }
h2 { font-size: 2rem;    line-height: 1.25; }
h3 { font-size: 1.75rem; line-height: 1.3;  }
h4 { font-size: 1.5rem;  line-height: 1.35; }
h5 { font-size: 1.25rem; line-height: 1.4;  }
h6 { font-size: 1rem;    line-height: 1.45; }
  
/* General layout */
font-family: var(--system-ui);
font-size: 1rem;
line-height: 1.4;
color: #333;
max-width: 100%;
margin: 0 auto;
background-color: #f8f9fa;
border: 1px solid #e0e0e0;
border-radius: 6px;
box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);


/* Paragraphs */
p {
  margin: 0 0 1rem;
  word-wrap: break-word;
}

/* Code blocks */
pre, code {
  font-family: Menlo, Consolas, Monaco, "Courier New", monospace;
  font-size: 0.95rem;
  background: #f1f3f5;
  color: #2e2e2e;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  overflow-x: auto;
}

pre {
  padding: 0.75rem;
  margin: 0 0 1rem;
}

/* Inline code */
code {
  font-size: 0.9rem;
  padding: 0.2rem 0.4rem;
  background: #f9f9f9;
  color: #c7254e;
}

/* Lists */
ul, ol {
  margin: 0 0 1rem 1.25rem;
  padding: 0;
}

li {
  margin-bottom: 0.5rem;
}

/* Links */
a {
  color: #007bff;
  text-decoration: underline;
}

a:hover {
  color: #0056b3;
  text-decoration: none;
}

/* Table styling */
table {
  width: 100%;
  margin-bottom: 1rem;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-top: 1px solid #dee2e6;
}

th {
  background-color: #f1f3f5;
  font-weight: bold;
}

figure img {
  max-width: 100%;
}


/* Responsive adjustments */
@media (max-width: 768px) {
  font-size: 0.95rem;
  padding: 0.75rem;

  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }
}
</style>`
)};
const _i4p2od = function _inspector_css(htl){return(
htl.html`<style>
:root {
  --syntax_normal: #1b1e23;
  --syntax_comment: #a9b0bc;
  --syntax_number: #20a5ba;
  --syntax_keyword: #c30771;
  --syntax_atom: #10a778;
  --syntax_string: #008ec4;
  --syntax_error: #ffbedc;
  --syntax_unknown_variable: #838383;
  --syntax_known_variable: #005f87;
  --syntax_matchbracket: #20bbfc;
  --syntax_key: #6636b4;
  --mono_fonts: 82%/1.5 Menlo, Consolas, monospace;
}

.observablehq--expanded,
.observablehq--collapsed,
.observablehq--function,
.observablehq--import,
.observablehq--string:before,
.observablehq--string:after,
.observablehq--gray {
  color: var(--syntax_normal);
}

.observablehq--collapsed,
.observablehq--inspect a {
  cursor: pointer;
}

.observablehq--field {
  text-indent: -1em;
  margin-left: 1em;
}

.observablehq--empty {
  color: var(--syntax_comment);
}

.observablehq--keyword,
.observablehq--blue {
  color: #3182bd;
}

.observablehq--forbidden,
.observablehq--pink {
  color: #e377c2;
}

.observablehq--orange {
  color: #e6550d;
}

.observablehq--null,
.observablehq--undefined,
.observablehq--boolean {
  color: var(--syntax_atom);
}

.observablehq--number,
.observablehq--bigint,
.observablehq--date,
.observablehq--regexp,
.observablehq--symbol,
.observablehq--green {
  color: var(--syntax_number);
}

.observablehq--index,
.observablehq--key {
  color: var(--syntax_key);
}

.observablehq--prototype-key {
  color: #aaa;
}

.observablehq--empty {
  font-style: oblique;
}

.observablehq--string,
.observablehq--purple {
  color: var(--syntax_string);
}

.observablehq--error,
.observablehq--red {
  color: #e7040f;
}

.observablehq--inspect {
  font: var(--mono_fonts);
  overflow-x: auto;
  display: block;
  white-space: pre;
}

.observablehq--error .observablehq--inspect {
  word-break: break-all;
  white-space: pre-wrap;
}
</style>`
)};
const _924n2d = function _notebook_name(){return(
document.querySelector("title")?.innerHTML ||
  new URL(document.baseURI).pathname.replace("/", "")
)};
const _kjjb0o = function _20(md){return(
md`### Single File Notebook Generator Flow`
)};
const _1ph3r8b = function _TRACE_MODULE(){return(
"-"
)};
const _8i205q = function _task(flowQueue){return(
flowQueue({ timeout_ms: 10000 })
)};
const _ngmf1x = (G, _) => G.input(_);
const _kduntu = function _23(task){return(
task
)};
const _1ovtbdg = function _main_module(task){return(
task.module
)};
const _14v4kfe = function _task_runtime(main_module){return(
main_module?._runtime
)};
const _tdkfs5 = function _runtime_variables(task_runtime,variableToObject){return(
[...task_runtime._variables].map(variableToObject)
)};
const _prt2rr = function _module_map(moduleMap,task_runtime)
{
  debugger;
  return moduleMap(task_runtime);
};
const _u046m2 = function _excluded_module_names(submit_summary,task)
{
  submit_summary;
  return ["TBD", "error", "builtin", "main", task.notebook];
};
const _12cd2yn = function _excluded_modules(module_map,excluded_module_names){return(
new Map(
  [...module_map.entries()].filter(([m, info]) =>
    excluded_module_names.includes(info.name)
  )
)
)};
const _7a8h8e = function _included_modules(module_map,excluded_module_names){return(
new Map(
  [...module_map.entries()].filter(
    ([m, info]) => !excluded_module_names.includes(info.name)
  )
)
)};
const _1ub1jrs = function _moduleLookup(included_modules){return(
new Map(
  [...included_modules.entries()].map(([m, info]) => [m, info.name])
)
)};
const _p8lkcw = function _module_specs(module_specs_new){return(
module_specs_new
)};
const _1l8s94s = async function _module_specs_old(task,main_module,included_modules,TRACE_MODULE,cellMap,moduleLookup,findImports,getFileAttachments,main,generate_module_source)
{
  if (task.options?.debug) debugger;
  const specsTodo = new Set();
  return new Map(
    await Promise.all(
      [
        ...(main_module ? [[main_module, { name: task.notebook }]] : []),
        ...(task.modules
          ? [...task.modules.entries()].map(([name, module]) => [
              module,
              { name }
            ])
          : []),
        ...included_modules.entries()
      ].map(async ([module, spec]) => {
        specsTodo.add(spec.name);
        if (spec.name == TRACE_MODULE) {
          debugger;
        }

        const cells = await cellMap(module, {
          extraModuleLookup: moduleLookup
        });
        const imports = findImports(cells);
        if (spec.name == TRACE_MODULE) {
          debugger;
        }
        const fileAttachments = getFileAttachments(module) || new Map();
        if (spec.name == task.notebook && task?.options?.main_files !== false) {
          getFileAttachments(main).forEach((value, key) =>
            fileAttachments.set(key, value)
          );
        }
        if (spec.name == TRACE_MODULE) {
          debugger;
        }
        const source = await generate_module_source(
          spec,
          module._scope,
          cells,
          fileAttachments,
          {
            extraModuleLookup: moduleLookup
          }
        );
        specsTodo.delete(spec.name);
        console.log("Generated spec for " + spec.name, "remaining", specsTodo);
        return [
          spec.name,
          {
            url: spec.name,
            imports,
            fileAttachments,
            source: source,
            cells,
            module,
            define: spec.define
          }
        ];
      })
    )
  );
};
const _hfa5co = async function _module_specs_new(task,cellMap,task_runtime,module_map,main_module,included_modules,TRACE_MODULE,getFileAttachments,main,generate_module_source,moduleLookup)
{
  if (task.options?.debug) debugger;
  const specsTodo = new Set();

  const allCells = await cellMap(
    [...task_runtime._variables].filter((v) => v._type == 1),
    module_map
  );
  return new Map(
    await Promise.all(
      [
        ...(main_module ? [[main_module, { name: task.notebook }]] : []),
        ...(task.modules
          ? [...task.modules.entries()].map(([name, module]) => [
              module,
              { name }
            ])
          : []),
        ...included_modules.entries()
      ].map(async ([module, spec]) => {
        specsTodo.add(spec.name);
        if (spec.name == TRACE_MODULE) {
          debugger;
        }

        const cellMap = allCells.get(module);

        if (cellMap === undefined) {
          throw "cannot find module: " + spec.name;
        }
        const imports = cellMap
          .filter((c) => c.type == "import")
          .map((c) => c.module_name)
          .filter((m) => !["builtin"].includes(m));
        const cells = new Map(cellMap.map((c) => [c.name, c.variables]));

        if (spec.name == TRACE_MODULE) {
          debugger;
        }
        const fileAttachments = getFileAttachments(module) || new Map();
        if (spec.name == task.notebook && task?.options?.main_files !== false) {
          getFileAttachments(main).forEach((value, key) =>
            fileAttachments.set(key, value)
          );
        }

        if (spec.name == TRACE_MODULE) {
          debugger;
        }
        const source = await generate_module_source(
          spec,
          module._scope,
          cells,
          fileAttachments,
          {
            extraModuleLookup: moduleLookup
          }
        );
        specsTodo.delete(spec.name);
        console.log("Generated spec for " + spec.name, "remaining", specsTodo);
        return [
          spec.name,
          {
            url: spec.name,
            imports,
            fileAttachments,
            source: source,
            cells,
            module,
            define: spec.define
          }
        ];
      })
    )
  );
};
const _wwg8rm = function _findImports(){return(
(cells) =>
  [...cells.keys()]
    .filter((name) => typeof name === "string" && name.startsWith("module "))
    .map((name) => name.replace("module ", ""))
)};
const _1ihmstm = function _getFileAttachments(){return(
(module) => {
  let fileMap;
  const FileAttachment = module._builtins.get("FileAttachment");
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try {
    FileAttachment("");
  } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap;
}
)};
const _r3csbv = async function _book(lopebook,task,module_specs)
{
  const book = await lopebook(
    {
      url: task.notebook,
      modules: module_specs
    },
    {
      title: task.notebook,
      ...task.options
    }
  );
  console.log("book", book);
  return book;
};
const _1io68jl = function _38(Inputs,module_specs){return(
Inputs.table(
  [
    ...module_specs.entries().map(([name, spec]) => ({
      name,
      source: spec.source.length,

      imports: spec.imports,
      fileAttachments: spec.fileAttachments
    }))
  ],
  {
    width: {
      name: 250,
      source: 50
    },
    format: {
      fileAttachments: (f) =>
        !f
          ? "none"
          : Inputs.table([
              ...f.entries().map(([name, f]) => ({ name, url: f.url || f }))
            ]),

      imports: (f) => Inputs.table(f.map((i) => ({ name: i })))
    }
  }
)
)};
const _7jb2xv = function _39(md){return(
md`##### Generate a report on the sizes of components`
)};
const _pswogy = function _report(DOMParser,book)
{
  let report;
  try {
    report = [
      ...new DOMParser()
        .parseFromString(book, "text/html")
        .querySelectorAll("script")
    ].map((script) => ({
      ...(script.getAttribute("file") && {
        file: script.getAttribute("file"),
        module: script.getAttribute("module")
      }),
      type: script.type,
      size: script.text.length,
      id: script.id
    }));
  } catch (err) {
    report = err;
  }

  console.log("report", report);
  return report;
};
const _w1qnbn = function _tomlarkworthy_exporter_task(book,report,futureExportedState,exporter_module,$0)
{
  const result = {
    source: book,
    report: report
  };
  console.log("resolving exporter_task", result);
  futureExportedState;
  exporter_module;
  return $0.resolve(result);
};
const _15ekmvu = function _42(md){return(
md`### Module Source Generator`
)};
const _1kpc1n0 = function _generate_module_source(generate_definitions,generate_define){return(
async (
  spec,
  scope,
  cells,
  fileAttachments,
  { extraModuleLookup = new Map() } = {}
) =>
  `${await generate_definitions(cells, { extraModuleLookup })}
${await generate_define(spec, scope, cells, fileAttachments, {
  extraModuleLookup
})}`
)};
const _1d13q7y = function _generate_definitions(cellToDefinition,importCell){return(
async (cells) =>
  [
    ...(await Promise.all(
      [...cells.entries()].map(([name, variables]) =>
        cellToDefinition(name, variables)
      )
    )),
    importCell.toString() // for all modules
  ]
    .flat()
    .join("")
)};
const _18arykt = function _generate_define(cellToDefines){return(
async (
  spec,
  scope,
  cells,
  fileAttachments,
  { extraModuleLookup } = {}
) => {
  const fileAttachmentExpression = fileAttachments
    ? `  const fileAttachments = new Map(${JSON.stringify(
        [...fileAttachments.entries()],
        null,
        2
      )}.map(([name, entry]) => {
        const module_name = "${spec.name}";
        const url = entry.url || entry; 
        const query = \`script[type=lope-file][module='\${CSS.escape(module_name)}'][file='\${CSS.escape(encodeURIComponent(name))}']\`;
        console.log(query)
        const file = document.querySelector(query);
        const base64 = file.text;
        const binary = atob(base64);
        const array = new Uint8Array(binary.length)
        for( var i = 0; i < binary.length; i++ ) { array[i] = binary.charCodeAt(i) }
        const blob_url = URL.createObjectURL(new Blob([array], {
          type: file.getAttribute("mime")
        }));
        return [name, {url: blob_url, mimeType: file.getAttribute("mime")}]
      }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));\n`
    : "";

  return `export default function define(runtime, observer) {
  const main = runtime.module();
${fileAttachmentExpression}${(
    await Promise.all(
      [...cells.entries()].map(([name, variables]) =>
        cellToDefines(scope, name, variables, { extraModuleLookup })
      )
    )
  )
    .flat()
    .join("\n")}
  return main;
}`;
}
)};
const _f0tkr4 = function _isLiveImport(){return(
(variable) =>
  variable._definition
    .toString()
    .includes("observablehq" + "--inspect " + "observablehq--import")
)};
const _1rnlqq9 = function _contentHash(){return(
(s) => {
  s = String(s);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36); // compact rep
}
)};
const _yzfou4 = function _cellToDefinition(isLiveImport,contentHash){return(
(name, variables) => {
  if (typeof name == "string") {
    if (name.startsWith("module ")) {
      return "";
    }
    if (name.startsWith("dynamic ")) {
      return "";
    }
    if (name.startsWith("viewof ")) {
      name = name.replace("viewof ", "");
    } else {
      if (name.startsWith("mutable ")) {
        name = name.replace("mutable ", "");
      }
    }
  } else if (isLiveImport(variables[0])) {
    return ""; //`const _${name} = () => "live imports are stripped";\n`;
  } else {
    return `const _${contentHash(
      variables[0]._definition
    )} = ${variables[0]._definition.toString()};\n`;
  }
  return `const _${name} = ${variables[0]._definition.toString()};\n`;
}
)};
const _iizt5a = function _importCell(){return(
function importCell({ specifier, specifiers, notebook }, module) {
  const importElement = document.createElement("span");
  importElement.className = "observablehq--inspect observablehq--import";
  importElement.appendChild(document.createTextNode("import {"));

  let isFirstSpecifier = false;
  for (const { imported: originalName, local: aliasName } of specifiers) {
    if (isFirstSpecifier) {
      importElement.appendChild(document.createTextNode(", "));
    } else {
      isFirstSpecifier = true;
    }

    const link = document.createElement("a");
    if (module._scope.has(originalName)) {
      if (notebook) {
        link.href = new URL(`#${originalName}`, notebook);
      }
    } else {
      link.className = "observablehq--unknown";
    }
    link.textContent = originalName;
    importElement.appendChild(link);

    if (originalName !== aliasName) {
      importElement.appendChild(document.createTextNode(` as ${aliasName}`));
    }
  }

  importElement.appendChild(document.createTextNode("}"));
  if (notebook) {
    importElement.appendChild(document.createTextNode(" from "));
    const notebookLink = document.createElement("a");
    notebookLink.href = new URL(notebook);
    notebookLink.textContent = `"${specifier}"`;
    importElement.appendChild(notebookLink);
  }

  return importElement;
}
)};
const _1wqwjwy = function _cellToDefines(sourceModule,findModuleName,findImportedName,isLiveImport,contentHash){return(
async (scope, name, variables, { extraModuleLookup } = {}) => {
  const defines = [];
  if (typeof name === "string") {
    if (name.startsWith("module <unknown")) {
      debugger;
      return [];
    } else if (name.startsWith("module ")) {
      const module = await sourceModule(variables[0]);
      const moduleName =
        extraModuleLookup.get(module) || findModuleName(scope, module);
      //load the module
      defines.push(
        `  main.define("${name}", async () => runtime.module((await import("/${moduleName}.js?v=4")).default));`
      );

      // load the variables
      const specifiers = new Map(); // local -> remote
      await Promise.all(
        variables.map(async (v) => {
          const importedName = await findImportedName(v);
          specifiers.set(v._name, importedName);
          defines.push(
            `  main.define("${
              v._name
            }", ["${name}", "@variable"], (_, v) => v.import(${
              importedName && importedName !== v._name
                ? `"${importedName}", `
                : ""
            }"${v._name}", _));`
          );
        })
      );
      // Filter out redundant specifiers otherwise the same thing gets imported multiple
      // time
      const trimmed_specifiers = [];
      [...specifiers.entries()].forEach(([local, imported]) => {
        if (
          specifiers.has("mutable " + local) ||
          specifiers.has("viewof " + local)
        ) {
          // skip its imported as a viewof
        } else {
          trimmed_specifiers.push({
            local,
            imported
          });
        }
      });
      // create an anon variable to do the import
      //     defines.push(
      //       `  main.variable(observer()).define(["${name}"], async (m) => importCell({
      // specifier: "${moduleName}",
      // specifiers: ${JSON.stringify(trimmed_specifiers)},
      // notebook: "https://${moduleName}"
      //       }, m));`
      //     );
    } else if (name.startsWith("viewof ")) {
      // viewof <name>
      const viewName = name.replace("viewof ", "");
      const v = variables[0];
      defines.push(
        `  main.variable(observer("${name}")).define("${name}", ${
          v._inputs.length > 0
            ? `[${v._inputs.map((i) => `"${i._name.toString()}"`)}], `
            : ""
        }_${viewName});`
      );
      defines.push(
        `  main.variable(observer("${viewName}")).define("${viewName}", ["Generators", "viewof ${viewName}"], (G, _) => G.input(_));`
      );
    } else if (name.startsWith("mutable ")) {
      // mutable <name>
      const mutableName = name.replace("mutable ", "");
      const v = variables[0];
      defines.push(
        `  main.define("initial ${mutableName}", ${
          v._inputs.length > 0
            ? `[${v._inputs.map((i) => `"${i._name.toString()}"`)}], `
            : ""
        }_${mutableName});`
      );
      defines.push(
        `  main.variable(observer("mutable ${mutableName}")).define("mutable ${mutableName}", ["Mutable", "initial ${mutableName}"], (M, _) => new M(_));`
      );
      defines.push(
        `  main.variable(observer("${mutableName}")).define("${mutableName}", ["mutable ${mutableName}"], _ => _.generator);`
      );
    }
  } else if (isLiveImport(variables[0])) {
    return []; //`const _${name} = () => "live imports are stripped";\n`;
  }

  if (defines.length == 0 && variables.length == 1) {
    const v = variables[0];
    defines.push(
      `  main.variable(observer(${v._name ? `"${v._name}"` : ""})).define(${
        v._name ? `"${v._name}", ` : ""
      }${
        v._inputs.length > 0
          ? `[${v._inputs.map((i) => `"${i._name.toString()}"`)}], `
          : ""
      }_${typeof name == "string" ? name : contentHash(v._definition)});`
    );
  }
  return defines;
}
)};
const _1knljml = function _51(md){return(
md`## Assemble `
)};
const _4oprf0 = function _lopebook(inspector_css,lopemodule,decompress_sledfile,builtin_def){return(
async (
  bundle,
  { style, title, head, headless } = {}
) => `<!DOCTYPE html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>${title}</title>
${head ? head : `<link rel="icon" href="data:,">`}
</head>
${style?.outerHTML || style}
${inspector_css.outerHTML}
${(
  await Promise.all(
    [...bundle.modules.values()]
      .sort((a, b) => a.url.localeCompare(b.url))
      .map((module) => lopemodule(module))
  )
).join("")}

<script>
  window.onload = function() {
    const imports = {};
    [...document.querySelectorAll("script[type=lope-module]")].forEach(module => {
      const blob_url = URL.createObjectURL(new Blob([module.text], {
        type: "application/javascript"
      }));
      if (module.id[0] == "/") module.id = module.id.substring(1);
      imports[module.id] = blob_url;
    });
    
    const importmap = document.createElement("script");
    importmap.type = "importmap";
    importmap.text = JSON.stringify({imports}, null, 2);
    document.body.append(importmap);

    const main = document.createElement("script");
    main.type = "module";
    main.text = \`
import define from "${bundle.url}";
const decompress_sledfile = ${decompress_sledfile.toString()};
const { Runtime, Library, Inspector } = await import(await decompress_sledfile("runtime.js.gz"));
const builtins = ${builtin_def}
const library = new Library(async (name) => {
  if (builtins[name]) return builtins[name]() 
  return Library.resolve(name);
})
const runtime = new Runtime(library);
const main = runtime.module(define, ${
  headless
    ? "Inspector.into(document.createElement('div'))"
    : "Inspector.into(document.body)"
});
\`;
    document.body.append(main);
  }
</scr\ipt>`
)};
const _1jiuy55 = function _lopemodule(TRACE_MODULE,CSS,arrayBufferToBase64,escapeScriptTags,rewriteImports){return(
async (module) => {
  if (module.url === TRACE_MODULE) {
    debugger;
  }
  const files = module.fileAttachments
    ? await Promise.all(
        [...module.fileAttachments.entries()].map(
          async ([name, attachment]) => {
            const url = attachment.url || attachment;
            // Get from local when possible
            const lopefile =
              !url.startsWith("blob:") &&
              document.querySelector(
                `script[type=lope-file][module='${CSS.escape(
                  module.url
                )}'][file='${CSS.escape(encodeURIComponent(name))}']`
              );
            let data64,
              mime = undefined;
            if (!lopefile) {
              const response = await fetch(url);
              data64 = await response.arrayBuffer().then(arrayBufferToBase64);
              mime = response.headers.get("content-type");
            } else {
              data64 = lopefile.textContent;
              mime = lopefile.getAttribute("mime");
            }
            return `<script type="lope-file" module="${
              module.url
            }" file="${encodeURIComponent(
              name
            )}" mime="${mime}">${data64}</scr\ipt>\n`;
          }
        )
      )
    : [];
  return `${files.join("")}<script type="lope-module" id="${module.url}">
${escapeScriptTags(rewriteImports(module))}
</scr\ipt>\n`;
}
)};
const _72pqco = function _escapeScriptTags(){return(
(str) => str.replaceAll("</scr\ipt", "</scr\\ipt")
)};
const _3paumt = function _rewriteImports(){return(
(module) => {
  let modified = module.source;
  module.imports.forEach((i) => {
    modified = modified.replaceAll(
      new RegExp('"/?' + i + '[^"]*"', "g"),
      `"${i}"`
    );
  });
  return modified;
}
)};
const _nztpzj = function _arrayBufferToBase64(){return(
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce(
    (data, byte) => data + String.fromCharCode(byte),
    ""
  );
  return btoa(binary);
}
)};
const _18tucvi = function _57(md){return(
md`### Bundled Deps`
)};
const _8k8j6i = function _decompress_sledfile(DecompressionStream,Response){return(
async (file) => {
  const source = document.querySelector(
    'script[type=lope-file][file="' + file + '"]'
  );
  const base64 = source.text;
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([array], {
    type: "application/octet-stream"
  });
  const decompressedStream = (await blob.stream()).pipeThrough(
    new DecompressionStream("gzip")
  );
  const arrayBuffer = await new Response(decompressedStream).arrayBuffer();

  // Create a Blob from the ArrayBuffer
  const decompressed_blob = new Blob([arrayBuffer], {
    type: "application/javascript"
  });

  return URL.createObjectURL(decompressed_blob);
}
)};
const _wyob8f = function _builtin_def(){return(
`({
  "htl@0.3.1/dist/htl.min.js": async () =>
    import(await decompress_sledfile("htl.js.gz")),
  "@observablehq/inputs@0.11.0/dist/inputs.min.js": async () => decompress_sledfile("inputs.2.min.js.gz"),
  "marked@0.3.12/marked.min.js": () =>
    decompress_sledfile("marked.0.3.12.min.js.gz"),
  "lodash@4.17.21/lodash.min.js": () => decompress_sledfile("lodash-4.17.21.min.js.gz"),
  "@observablehq/highlight.js@2.0.0/highlight.min.js": () => decompress_sledfile("highlight.js-2.0.0.min.js.gz"),
  "d3@7.9.0/dist/d3.min.js": () => {
    console.log("d3@7.9.0/dist/d3.min.js")
    return decompress_sledfile("d3.v7.min.js.gz")
  },
  "@observablehq/plot@0.6.16/dist/plot.umd.min.js": () => {
    console.log("@observablehq/plot@0.6.16/dist/plot.umd.min.js")
    return decompress_sledfile("plot.umd.min.js.gz")
  }
})`
)};
const _1oz2s27 = function _builtins(builtin_def){return(
eval(builtin_def)
)};
const _1ueohzb = function _fileAttachmentKeepAlive(FileAttachment)
{
  // Unused file attachments are wiped after fork, so we need to manually reference them
  FileAttachment("highlight.js-2.0.0.min.js.gz");
  FileAttachment("htl.js.gz");
  FileAttachment("inputs.2.min.js.gz");
  FileAttachment("lodash-4.17.21.min.js.gz");
  FileAttachment("marked.0.3.12.min.js.gz");
  FileAttachment("runtime.js.gz");
  FileAttachment("d3.v7.min.js.gz");
  FileAttachment("plot.umd.min.js.gz");
};
const _1w1fk21 = function _62(md){return(
md`### URL Hash Handling

We use a FileAttachment to carry the hash state to an exported notebook, and it is restored on first page load`
)};
const _1divtw1 = async function _exportState(getFileAttachment,exporter_module,location,history)
{
  let state;
  try {
    state =
      (await getFileAttachment("export_state.json", exporter_module)?.json()) ||
      {};
  } catch (err) {
    state = {};
  }
  if (state.hash && !location.hash) {
    try {
      history.replaceState(null, "", state.hash);
    } catch (err) {
      console.error(err);
    }
  }
  console.log("export_state.json", state);
  return state;
};
const _2crihl = async function _futureExportedState(hash,exportState,location,save_exporter_state)
{
  hash;
  exportState; // ensure we get the current value first
  const savedState = {
    ...exportState,
    ...(location.hash && { hash: location.hash })
  };
  console.log("futureExportedState", savedState);
  await save_exporter_state(savedState);

  return savedState;
};
const _bd8tta = function _save_exporter_state(getFileAttachments,exporter_module,setFileAttachment,jsonFileAttachment){return(
async function save_exporter_state(state) {
  console.log("save_exporter_state", state);
  const current = await getFileAttachments(exporter_module);
  await setFileAttachment(
    jsonFileAttachment("export_state.json", state),
    exporter_module
  );
  const newest = await getFileAttachments(exporter_module);
  return;
}
)};
const _khj5ki = function _68(md){return(
md`### Global Output`
)};
const _pfhond = function _output(Inputs){return(
Inputs.input(undefined)
)};
const _ei7ugd = (G, _) => G.input(_);
const _ehqf5h = function _70(md){return(
md`## Utils`
)};
const _19ky3g9 = function _getCompactISODate(){return(
function getCompactISODate() {
  const date = new Date();

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}
)};
const _blfbdd = function _exporter_module(thisModule){return(
thisModule()
)};
const _1iao5e4 = (G, _) => G.input(_);
const _p88mjk = function _diskImgUrl(FileAttachment){return(
FileAttachment("disk-floppy-memory-svgrepo-com@2.svg").url()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["runtime.js.gz","htl.js.gz","marked.0.3.12.min.js.gz","inputs.2.min.js.gz","disk-floppy-memory-svgrepo-com@2.svg","lodash-4.17.21.min.js.gz","highlight.js-2.0.0.min.js.gz","d3.v7.min.js.gz","plot.umd.min.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/exporter";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/cell-map", async () => runtime.module((await import("/@tomlarkworthy/cell-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/reversible-attachment", async () => runtime.module((await import("/@tomlarkworthy/reversible-attachment.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/aws4fetch", async () => runtime.module((await import("/@tomlarkworthy/aws4fetch.js?v=4")).default));  
  main.define("module @tomlarkworthy/dom-view", async () => runtime.module((await import("/@tomlarkworthy/dom-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  $def("_11i1qeu", null, ["md"], _11i1qeu);  
  $def("_1ioy64l", null, ["md"], _1ioy64l);  
  $def("_24cys7", "viewof parameters", ["Inputs","exporter","default_style","viewof output","Event","localStorageView"], _24cys7);  
  $def("_1k442co", "parameters", ["Generators","viewof parameters"], _1k442co);  
  $def("_8ifz29", null, ["md"], _8ifz29);  
  $def("_1et6b01", null, ["md"], _1et6b01);  
  $def("_hyblhs", null, ["md"], _hyblhs);  
  $def("_kuzcdk", null, ["md"], _kuzcdk);  
  $def("_pb6k9b", null, ["md"], _pb6k9b);  
  $def("_1czbr75", "viewof example", ["exporter"], _1czbr75);  
  $def("_4me580", "example", ["Generators","viewof example"], _4me580);  
  $def("_v3220x", "exporter", ["actionHandler","default_style","keepalive","exporter_module","variable","domView","exportState","view","diskImgUrl","Inputs","createShowable","top120List","reportValidity","invalidation","bindOneWay"], _v3220x);  
  $def("_fmjg2v", "actionHandler", ["Inputs","getSourceModule","exportToHTML","view","html","location","getCompactISODate","AwsClient","ReadableStream","CompressionStream","Response","md"], _fmjg2v);  
  $def("_1qh3pkx", "exportToHTML", ["main","keepalive","exporter_module","viewof task"], _1qh3pkx);  
  $def("_eyzsra", "getSourceModule", ["notebook_name","main"], _eyzsra);  
  $def("_10asekp", "createShowable", ["variable","view"], _10asekp);  
  $def("_k5lohd", "reportValidity", [], _k5lohd);  
  $def("_1ioj1hn", "top120List", [], _1ioj1hn);  
  $def("_tgf41g", "default_style", ["htl"], _tgf41g);  
  $def("_i4p2od", "inspector_css", ["htl"], _i4p2od);  
  $def("_924n2d", "notebook_name", [], _924n2d);  
  $def("_kjjb0o", null, ["md"], _kjjb0o);  
  $def("_1ph3r8b", "TRACE_MODULE", [], _1ph3r8b);  
  $def("_8i205q", "viewof task", ["flowQueue"], _8i205q);  
  $def("_ngmf1x", "task", ["Generators","viewof task"], _ngmf1x);  
  $def("_kduntu", null, ["task"], _kduntu);  
  $def("_1ovtbdg", "main_module", ["task"], _1ovtbdg);  
  $def("_14v4kfe", "task_runtime", ["main_module"], _14v4kfe);  
  $def("_tdkfs5", "runtime_variables", ["task_runtime","variableToObject"], _tdkfs5);  
  $def("_prt2rr", "module_map", ["moduleMap","task_runtime"], _prt2rr);  
  $def("_u046m2", "excluded_module_names", ["submit_summary","task"], _u046m2);  
  $def("_12cd2yn", "excluded_modules", ["module_map","excluded_module_names"], _12cd2yn);  
  $def("_7a8h8e", "included_modules", ["module_map","excluded_module_names"], _7a8h8e);  
  $def("_1ub1jrs", "moduleLookup", ["included_modules"], _1ub1jrs);  
  $def("_p8lkcw", "module_specs", ["module_specs_new"], _p8lkcw);  
  $def("_1l8s94s", "module_specs_old", ["task","main_module","included_modules","TRACE_MODULE","cellMap","moduleLookup","findImports","getFileAttachments","main","generate_module_source"], _1l8s94s);  
  $def("_hfa5co", "module_specs_new", ["task","cellMap","task_runtime","module_map","main_module","included_modules","TRACE_MODULE","getFileAttachments","main","generate_module_source","moduleLookup"], _hfa5co);  
  $def("_wwg8rm", "findImports", [], _wwg8rm);  
  $def("_1ihmstm", "getFileAttachments", [], _1ihmstm);  
  $def("_r3csbv", "book", ["lopebook","task","module_specs"], _r3csbv);  
  $def("_1io68jl", null, ["Inputs","module_specs"], _1io68jl);  
  $def("_7jb2xv", null, ["md"], _7jb2xv);  
  $def("_pswogy", "report", ["DOMParser","book"], _pswogy);  
  $def("_w1qnbn", "tomlarkworthy_exporter_task", ["book","report","futureExportedState","exporter_module","viewof task"], _w1qnbn);  
  $def("_15ekmvu", null, ["md"], _15ekmvu);  
  $def("_1kpc1n0", "generate_module_source", ["generate_definitions","generate_define"], _1kpc1n0);  
  $def("_1d13q7y", "generate_definitions", ["cellToDefinition","importCell"], _1d13q7y);  
  $def("_18arykt", "generate_define", ["cellToDefines"], _18arykt);  
  $def("_f0tkr4", "isLiveImport", [], _f0tkr4);  
  $def("_1rnlqq9", "contentHash", [], _1rnlqq9);  
  $def("_yzfou4", "cellToDefinition", ["isLiveImport","contentHash"], _yzfou4);  
  $def("_iizt5a", "importCell", [], _iizt5a);  
  $def("_1wqwjwy", "cellToDefines", ["sourceModule","findModuleName","findImportedName","isLiveImport","contentHash"], _1wqwjwy);  
  $def("_1knljml", null, ["md"], _1knljml);  
  $def("_4oprf0", "lopebook", ["inspector_css","lopemodule","decompress_sledfile","builtin_def"], _4oprf0);  
  $def("_1jiuy55", "lopemodule", ["TRACE_MODULE","CSS","arrayBufferToBase64","escapeScriptTags","rewriteImports"], _1jiuy55);  
  $def("_72pqco", "escapeScriptTags", [], _72pqco);  
  $def("_3paumt", "rewriteImports", [], _3paumt);  
  $def("_nztpzj", "arrayBufferToBase64", [], _nztpzj);  
  $def("_18tucvi", null, ["md"], _18tucvi);  
  $def("_8k8j6i", "decompress_sledfile", ["DecompressionStream","Response"], _8k8j6i);  
  $def("_wyob8f", "builtin_def", [], _wyob8f);  
  $def("_1oz2s27", "builtins", ["builtin_def"], _1oz2s27);  
  $def("_1ueohzb", "fileAttachmentKeepAlive", ["FileAttachment"], _1ueohzb);  
  $def("_1w1fk21", null, ["md"], _1w1fk21);  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("getFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachment", _));  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  $def("_1divtw1", "exportState", ["getFileAttachment","exporter_module","location","history"], _1divtw1);  
  $def("_2crihl", "futureExportedState", ["hash","exportState","location","save_exporter_state"], _2crihl);  
  $def("_bd8tta", "save_exporter_state", ["getFileAttachments","exporter_module","setFileAttachment","jsonFileAttachment"], _bd8tta);  
  $def("_khj5ki", null, ["md"], _khj5ki);  
  $def("_pfhond", "viewof output", ["Inputs"], _pfhond);  
  $def("_ei7ugd", "output", ["Generators","viewof output"], _ei7ugd);  
  $def("_ehqf5h", null, ["md"], _ehqf5h);  
  $def("_19ky3g9", "getCompactISODate", [], _19ky3g9);  
  $def("_blfbdd", "viewof exporter_module", ["thisModule"], _blfbdd);  
  $def("_1iao5e4", "exporter_module", ["Generators","viewof exporter_module"], _1iao5e4);  
  $def("_p88mjk", "diskImgUrl", ["FileAttachment"], _p88mjk);  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("cellMap", ["module @tomlarkworthy/cell-map", "@variable"], (_, v) => v.import("cellMap", _));  
  main.define("findModuleName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findModuleName", _));  
  main.define("sourceModule", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("sourceModule", _));  
  main.define("findImportedName", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("findImportedName", _));  
  main.define("variableToObject", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("variableToObject", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("decompress_url", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompress_url", _));  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("variable", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("variable", _));  
  main.define("bindOneWay", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("bindOneWay", _));  
  main.define("reversibleAttach", ["module @tomlarkworthy/reversible-attachment", "@variable"], (_, v) => v.import("reversibleAttach", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("AwsClient", ["module @tomlarkworthy/aws4fetch", "@variable"], (_, v) => v.import("AwsClient", _));  
  main.define("AwsV4Signer", ["module @tomlarkworthy/aws4fetch", "@variable"], (_, v) => v.import("AwsV4Signer", _));  
  main.define("domView", ["module @tomlarkworthy/dom-view", "@variable"], (_, v) => v.import("domView", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("forcePeek", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("forcePeek", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}