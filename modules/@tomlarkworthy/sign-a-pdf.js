const _j5ztf6 = function _1(md){return(
md`# Sign a PDF and Adobe: Go F* Yourself

Allows super-imposing an image of your signature on a PDF. 

** Note: you can also do this using Mac Preview, see _Tools > Annotate > Signature_ ([docs](https://support.apple.com/en-gb/guide/preview/prvw35725/mac))** 

### Why not use Adobe?
I once had a Adobe subscription exactly for this purpose but I was unable to cancel it. So it cost me $200 to sign a document. They are [predatory](https://www.reddit.com/r/Adobe/comments/ad72z0/adobe_fix_your_predatory_billing_practices/), and [its not just me](https://news.ycombinator.com/item?id=25971114).

### Why not use the free tools on the internet?

I want to sign financial documents and privacy is critical. Unfortunately, I cannot audit most free software on the internet. Lack of auditability of digital services is actually why I started [@endpointservices](https://observablehq.com/@endpointservices), a Cloud which *exclusively* runs source available software. But in this case we can sign a document clientside so no data will leave the computer and we don't even need a digital service.

### Why on [Observablehq.com](https://observablehq.com/)?

I love it, it took a day to build this and I do not need to worry about hosting, and anybody can inspect, fork and improve the software right from within their browser. It radically lowers viscosity of software development. I can painlessly upgrade it as I go.

### How can I verify data is not leaving my computer?

To see if a webpage is transmiting your data you should check to see if a network call is made when you upload you pdf. Open the View > Developer > Developer Tools > Network, *then* set your pdf. For this application a network call is made! But it's a blob resource with size 0 that takes 2ms. This is an in-memory representation used to move data around *inside* the current session, it doesn't represent data leaving the computer. In general if there are no network entries generator or only blob entries you can be sure data is not leaving your computer and its safe to use. You would generally expect about the same amount of data would need to leave your computer as the file you just uploaded. Read more about the network tab: https://developer.chrome.com/docs/devtools/network/

### Credits

We salute you Andrew Dillon for [pdf-lib](https://github.com/Hopding/pdf-lib) (PDF writer) and Mozilla for [PDF.js](https://mozilla.github.io/pdf.js/) (PDF viewer). 🖖

`
)};
const _qfvnaz = function _2(md){return(
md`### Select files`
)};
const _1k8igmf = function _top(view,htl,$0,Inputs){return(
view`<div>
  <style>
    .labelManual {
      --length1: 3.25px;
      --length2: 6.5px;
      --length3: 13px;
      --label-width: 120px;
      --input-width: 240px;
      font: 13px/1.2 var(--sans-serif);
      flex-shrink: 0;
      align-self: start;
      padding: 5px 0 4px 0;
      width: var(--label-width);
      margin-right: var(--length2);
    }
  </style>
  <div style="display: flex;">
    <label class="labelManual">Choose a pdf</label> 
    ${htl.html`<input name="pdf" type="file" onchange=${evt =>
      ($0.value = evt)} accept=".pdf">`}
  </div>
  ${[
    "images",
    Inputs.range([1, 5], {
      label: "Number of images to add",
      value: 1,
      step: 1
    })
  ]}
`
)};
const _1ghxfqd = (G, _) => G.input(_);
const _1e1wnki = function _signatures(view,top,htl,sigchange,$0){return(
view`
  ${[
    "sigs",
    Array(top.images)
      .fill(null)
      .map(
        (_, i) => view`<div style="display: flex;">
    <label class="labelManual">Choose image ${i + 1}</label> 
    ${htl.html`<input type="file" onchange=${evt => {
      sigchange[i] = evt;
      $0.value = $0.value; //trigger update
    }} accept="image/jpg">`}
  </div>`
      )
  ]}
  
`
)};
const _14q9kdb = (G, _) => G.input(_);
const _kds1r3 = function _5(md){return(
md`### Controls`
)};
const _12byxbx = async function _6(pdfjs,url,config,html,width)
{
  const pdf = await pdfjs.getDocument(url).promise;
  const page = await pdf.getPage(config.page);

  const canvas = html`<canvas width=${width} height=${config.height} style="border: 1px solid #aaa">`;

  page.render({
    canvasContext: canvas.getContext('2d'),
    viewport: page.getViewport({ scale: 1.5 })
  });
  return canvas;
};
const _zahcm0 = function _config(view,Inputs,fixedDoc,signatures,sigUrls){return(
view`<div>
  ${[
    'height',
    Inputs.range([0, 1200], { label: "preview height", value: 800 })
  ]}
  ${[
    'page',
    Inputs.range([1, fixedDoc.pageCount], {
      label: "preview page",
      value: 1,
      step: 1
    })
  ]}
  ${[
    "sigs",
    signatures.sigs.map(
      (_, i) => view`<hr>
      <img height="100px" src=${sigUrls[i]}></img>
      ${[
        'page',
        Inputs.range([1, fixedDoc.pageCount], { label: "page", value: 1 })
      ]}
      ${[
        'sX',
        Inputs.range([0, fixedDoc.getPage(0).getWidth()], {
          label: "signature x",
          value: 0
        })
      ]}
      ${[
        'sY',
        Inputs.range([0, fixedDoc.getPage(0).getHeight()], {
          label: "signature y",
          value: 0
        })
      ]}
      ${[
        'sW',
        Inputs.range([1, fixedDoc.getPage(0).getWidth()], {
          label: "signature width",
          value: 300
        })
      ]}
      ${[
        'sH',
        Inputs.range([1, fixedDoc.getPage(0).getHeight()], {
          label: "signature height",
          value: 300
        })
      ]}`
    )
  ]}

`
)};
const _njp9qq = (G, _) => G.input(_);
const _1k7n1i5 = function _8(md){return(
md`## Download the result`
)};
const _1m9j1zg = function _9(htl,url){return(
htl.html`<a href=${url} download="output.pdf">download</a>`
)};
const _1pecavy = function _pdfchange(){return(
undefined
)};
const _ujeirm = (M, _) => new M(_);
const _vu7zmz = _ => _.generator;
const _4zw3be = function _11(md){return(
md`---
## Implementation`
)};
const _qpxv38 = function _sigchange(){return(
[]
)};
const _na4ja9 = (M, _) => new M(_);
const _1at3os8 = _ => _.generator;
const _mgtmcy = function _pdf(pdfchange){return(
pdfchange.target.files[0]
)};
const _bv9q6m = async function _fixedDoc(pdfLib,pdf){return(
await pdfLib.PDFDocument.load(await pdf.arrayBuffer())
)};
const _7s20cq = async function _pdfDoc(config,pdfLib,pdf){return(
config, await pdfLib.PDFDocument.load(await pdf.arrayBuffer())
)};
const _1holgx0 = function _embed(promiseRecursive,sigchange,pdfDoc,config){return(
promiseRecursive(
  // Mutate PDF, overlays images onto pdf
  sigchange.map(async (sig, i) => {
    if (!sig.target.files[0]) return "N/A";

    const page = pdfDoc.getPage(config.sigs[i].page - 1);
    const jpgImage = await pdfDoc.embedJpg(
      await sig.target.files[0].arrayBuffer()
    );
    page.drawImage(jpgImage, {
      x: config.sigs[i].sX,
      y: config.sigs[i].sY,
      width: config.sigs[i].sW,
      height: config.sigs[i].sH
    });

    return "OK";
  })
)
)};
const _1abtymm = async function _url(embed,pdfDoc)
{
  // Generate a blob representing the rendered PDF
  embed; // make sure image is in it first
  const file = new Blob([await pdfDoc.save()], {
    type: "application/pdf"
  });
  return URL.createObjectURL(file);
};
const _19a15wm = function _sigUrls(promiseRecursive,sigchange){return(
promiseRecursive(
  // Generate a blobs for the signatures
  sigchange.map(async (sig, i) => {
    if (!sig.target.files[0]) return undefined;
    const file = new Blob([await sig.target.files[0].arrayBuffer()], {
      type: "image/jpg"
    });
    return URL.createObjectURL(file);
  })
)
)};
const _1hoc7z0 = function _19(md){return(
md`### Imports`
)};
const _i8ep3 = async function _pdfLib(require,FileAttachment){return(
require(await FileAttachment("pdf-lib.min.js").url())
)};
const _1sahkm3 = async function _pdfjs(require,FileAttachment)
{
  const lib = await require(await FileAttachment("pdf.js").url());
  lib.GlobalWorkerOptions.workerSrc = await FileAttachment(
    "pdf.worker.js"
  ).url();
  return lib;
};
const _s066k8 = function _25(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["pdf-lib.min.js","pdf.worker.js","pdf.js"].map((name) => {
    const module_name = "@tomlarkworthy/sign-a-pdf";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/utils", async () => runtime.module((await import("/@tomlarkworthy/utils.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_j5ztf6", null, ["md"], _j5ztf6);  
  $def("_qfvnaz", null, ["md"], _qfvnaz);  
  $def("_1k8igmf", "viewof top", ["view","htl","mutable pdfchange","Inputs"], _1k8igmf);  
  $def("_1ghxfqd", "top", ["Generators","viewof top"], _1ghxfqd);  
  $def("_1e1wnki", "viewof signatures", ["view","top","htl","sigchange","mutable sigchange"], _1e1wnki);  
  $def("_14q9kdb", "signatures", ["Generators","viewof signatures"], _14q9kdb);  
  $def("_kds1r3", null, ["md"], _kds1r3);  
  $def("_12byxbx", null, ["pdfjs","url","config","html","width"], _12byxbx);  
  $def("_zahcm0", "viewof config", ["view","Inputs","fixedDoc","signatures","sigUrls"], _zahcm0);  
  $def("_njp9qq", "config", ["Generators","viewof config"], _njp9qq);  
  $def("_1k7n1i5", null, ["md"], _1k7n1i5);  
  $def("_1m9j1zg", null, ["htl","url"], _1m9j1zg);  
  $def("_1pecavy", "initial pdfchange", [], _1pecavy);  
  $def("_ujeirm", "mutable pdfchange", ["Mutable","initial pdfchange"], _ujeirm);  
  $def("_vu7zmz", "pdfchange", ["mutable pdfchange"], _vu7zmz);  
  $def("_4zw3be", null, ["md"], _4zw3be);  
  $def("_qpxv38", "initial sigchange", [], _qpxv38);  
  $def("_na4ja9", "mutable sigchange", ["Mutable","initial sigchange"], _na4ja9);  
  $def("_1at3os8", "sigchange", ["mutable sigchange"], _1at3os8);  
  $def("_mgtmcy", "pdf", ["pdfchange"], _mgtmcy);  
  $def("_bv9q6m", "fixedDoc", ["pdfLib","pdf"], _bv9q6m);  
  $def("_7s20cq", "pdfDoc", ["config","pdfLib","pdf"], _7s20cq);  
  $def("_1holgx0", "embed", ["promiseRecursive","sigchange","pdfDoc","config"], _1holgx0);  
  $def("_1abtymm", "url", ["embed","pdfDoc"], _1abtymm);  
  $def("_19a15wm", "sigUrls", ["promiseRecursive","sigchange"], _19a15wm);  
  $def("_1hoc7z0", null, ["md"], _1hoc7z0);  
  $def("_i8ep3", "pdfLib", ["require","FileAttachment"], _i8ep3);  
  $def("_1sahkm3", "pdfjs", ["require","FileAttachment"], _1sahkm3);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("promiseRecursive", ["module @tomlarkworthy/utils", "@variable"], (_, v) => v.import("promiseRecursive", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_s066k8", null, ["footer"], _s066k8);
  return main;
}