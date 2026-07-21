const _1lbbkso = function _1(md){return(
md`# Userspace notebook editor


Can we write an [Observable Runtime](https://github.com/observablehq/runtime) toolchain within a notebook? (previous [notes](https://observablehq.com/d/56315133960a2175))`
)};
const _3i79ng = function _2(md){return(
md`## Observable Runtime and Inspector`
)};
const _g7md0y = function _rt() {
    return import('https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js');
};
const _a5ytjs = function _4(md){return(
md`## Compiling

The [unofficial compiler provides](https://github.com/asg017/unofficial-observablehq-compiler) a way to go from source code to runtime variables. There is a [Quarto fork](https://github.com/quarto-dev/external-asg017-unofficial-observablehq-compiler/) with some bug fixes`
)};
const _pew4q9 = function _quarto() {
    return import('https://esm.sh/@quarto/external-alex-garcia-unofficial-observablehq-compiler');
};
const _1mp7ink = function _6(md){return(
md`## Obtaining Notebook Source from Observable documents API

The [SVG boinger](https://observablehq.com/@tomlarkworthy/svg-boinger) is just a random notebook I made in 2021
\`\`\`
curl https://api.observablehq.com/document/@tomlarkworthy/svg-boinger
\`\`\`

Document endpoint not support CORS so I just pasted the results here:`
)};
const _1brhhlu = function _notebook_source(FileAttachment){return(
FileAttachment("api_document.json").json()
)};
const _1jew7c4 = function _8(md){return(
md`## Source editor (CodeMirror)`
)};
const _1js9xre = async function _cm_js(esmImport){return(
await esmImport(`@codemirror/lang-javascript`)
)};
const _mps5qm = function _11(md){return(
md`## Userspace Notebook Editor
`
)};
const _1mxymue = function _12(md){return(
md`we will declare a view to hold our source, initialised to the SVG Boinger source to test`
)};
const _1hnts61 = function _notebook(view,notebook_source,CodeMirror,javascriptPlugin,codemirror,myDefaultTheme){return(
view`${[
  "source",
  notebook_source.nodes /*.slice(0, 2)*/
    .map((i) =>
      CodeMirror(i.value, {
        extensions: [
          javascriptPlugin.javascript(),
          codemirror.basicSetup,
          myDefaultTheme
        ]
      })
    )
]}`
)};
const _f10xtt = (G, _) => G.input(_);
const _19qszog = function _14(notebook){return(
notebook
)};
const _qbxljn = function _15(md){return(
md`## Userspace Notebook Viewer`
)};
const _4f1xp0 = function _outputs(view,$0,domView){return(
view`${[
  "outputs",
  $0.value.source.map((i) => domView({ className: "cell" }))
]}`
)};
const _9d9p8 = (G, _) => G.input(_);
const _1jbjgvd = function _17(outputs){return(
outputs
)};
const _1jp3xf5 = function _18(md){return(
md`## Linking source to the notebook view`
)};
const _jeswl5 = function _19(md){return(
md`Finally we bind the source to the output with a oneWayBind that transforms using the compiler`
)};
const _1udt9bj = function _link(rt,quarto,$0,$1,invalidation)
{
  const embedded_runtime = new rt.Runtime().module();
  const interpret = new quarto.Interpreter({
    module: embedded_runtime
  });
  $0.source.value.forEach((src, i) => {
    let variables = [];
    const inspector = rt.Inspector.into($1.outputs[i]);
    const onInput = async (_) => {
      const src = $0.source[i].value;
      variables.forEach((v) => {
        v.delete();
      });
      $1.outputs[i].value = null;
      variables = await interpret.cell(src, embedded_runtime, inspector);
    };
    $0.source[i].addEventListener("input", onInput);
    onInput();

    invalidation.then(() =>
      $0.source[i].removeEventListener("input", onInput)
    );
  });
  return embedded_runtime;
};
const _qm46jl = function _21(md){return(
md`---`
)};
const _s066k8 = function _25(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["api_document.json"].map((name) => {
    const module_name = "@tomlarkworthy/userspace-editor";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/codemirror-6", async () => runtime.module((await import("/@tomlarkworthy/codemirror-6.js?v=4")).default));  
  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/dom-view", async () => runtime.module((await import("/@tomlarkworthy/dom-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1lbbkso", null, ["md"], _1lbbkso);  
  $def("_3i79ng", null, ["md"], _3i79ng);  
  $def("_g7md0y", "rt", [], _g7md0y);  
  $def("_a5ytjs", null, ["md"], _a5ytjs);  
  $def("_pew4q9", "quarto", [], _pew4q9);  
  $def("_1mp7ink", null, ["md"], _1mp7ink);  
  $def("_1brhhlu", "notebook_source", ["FileAttachment"], _1brhhlu);  
  $def("_1jew7c4", null, ["md"], _1jew7c4);  
  main.define("CodeMirror", ["module @tomlarkworthy/codemirror-6", "@variable"], (_, v) => v.import("CodeMirror", _));  
  main.define("esmImport", ["module @tomlarkworthy/codemirror-6", "@variable"], (_, v) => v.import("esmImport", _));  
  main.define("javascriptPlugin", ["module @tomlarkworthy/codemirror-6", "@variable"], (_, v) => v.import("javascriptPlugin", _));  
  main.define("myDefaultTheme", ["module @tomlarkworthy/codemirror-6", "@variable"], (_, v) => v.import("myDefaultTheme", _));  
  main.define("codemirror", ["module @tomlarkworthy/codemirror-6", "@variable"], (_, v) => v.import("codemirror", _));  
  $def("_1js9xre", "cm_js", ["esmImport"], _1js9xre);  
  $def("_mps5qm", null, ["md"], _mps5qm);  
  $def("_1mxymue", null, ["md"], _1mxymue);  
  $def("_1hnts61", "viewof notebook", ["view","notebook_source","CodeMirror","javascriptPlugin","codemirror","myDefaultTheme"], _1hnts61);  
  $def("_f10xtt", "notebook", ["Generators","viewof notebook"], _f10xtt);  
  $def("_19qszog", null, ["notebook"], _19qszog);  
  $def("_qbxljn", null, ["md"], _qbxljn);  
  $def("_4f1xp0", "viewof outputs", ["view","viewof notebook","domView"], _4f1xp0);  
  $def("_9d9p8", "outputs", ["Generators","viewof outputs"], _9d9p8);  
  $def("_1jbjgvd", null, ["outputs"], _1jbjgvd);  
  $def("_1jp3xf5", null, ["md"], _1jp3xf5);  
  $def("_jeswl5", null, ["md"], _jeswl5);  
  $def("_1udt9bj", "link", ["rt","quarto","viewof notebook","viewof outputs","invalidation"], _1udt9bj);  
  $def("_qm46jl", null, ["md"], _qm46jl);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("bindOneWay", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("bindOneWay", _));  
  main.define("domView", ["module @tomlarkworthy/dom-view", "@variable"], (_, v) => v.import("domView", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_s066k8", null, ["footer"], _s066k8);
  return main;
}