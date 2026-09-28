const _viewof_cutoff = function cutoff(sticky,Inputs){return(
sticky(Inputs.range([0, 2000], {label: "cutoff", step: 1, value: 440}), 440)
)};
const _pdfBytes = async function pdfBytes(pdfLib){
  const doc = await pdfLib.PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  page.drawText("Hello from a cell", {x: 40, y: 100, size: 24, font});
  return doc.save();
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
  $def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
  $def("_A1", "A1", [], () => 120);
  $def("_B1", "B1", [], () => 340);
  $def("_C1", "C1", ["A1", "B1"], (A1, B1) => A1 + B1);
  $def("_grid", "grid", ["sheet", "runtime", "invalidation", "myModule"],
    (sheet, runtime, invalidation, myModule) => sheet(runtime, {invalidation, module: myModule, format: {C1: "0.00"}}));
  $def("_viewof_cutoff", "viewof cutoff", ["sticky", "Inputs"], _viewof_cutoff);
  $def("_cutoff", "cutoff", ["Generators", "viewof cutoff"], (G, v) => G.input(v));
  $def("_vv", "viewof volume", ["Inputs", "localStorageView"], (Inputs, localStorageView) =>
    Inputs.bind(Inputs.range([0, 100], {label: "volume", step: 1, value: 10}), localStorageView("demo-volume", {defaultValue: 10})));
  $def("_v", "volume", ["Generators", "viewof volume"], (G, v) => G.input(v));
  $def("_rows", "rows", [], () => [{name: "Ada", score: 91}, {name: "Grace", score: 88}]);
  $def("_csv", "csvButton", ["DOM", "d3", "rows"], (DOM, d3, rows) =>
    DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), "scores.csv", "Download CSV"));
  $def("_pdfBytes", "pdfBytes", ["pdfLib"], _pdfBytes);
  $def("_pdfLink", "pdfLink", ["pdfBytes", "htl"], (pdfBytes, htl) => {
    const blob = new Blob([pdfBytes], {type: "application/pdf"});
    return htl.html`<a href=${URL.createObjectURL(blob)} download="hello.pdf">Download PDF (${blob.size} bytes)</a>`;
  });
  $def("_save", "saveLink", ["downloadAnchor"], (downloadAnchor) => downloadAnchor({}, "Save this notebook"));
  $def("_intro", "intro", ["md", "C1"], (md, count) => md`# Shopping list

We need ${count} apples. Click this text to edit it.`);
  main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
  main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("module @tomlarkworthy/sticky", async () => "@tomlarkworthy/sticky" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
  main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
  main.define("module @tomlarkworthy/editable-md", async () => "@tomlarkworthy/editable-md" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji")).default));
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}
