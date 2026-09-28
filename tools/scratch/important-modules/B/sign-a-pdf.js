const _pdfBytes = async function pdfBytes(pdfLib){
  const doc = await pdfLib.PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  page.drawText("Hello from a cell", {x: 40, y: 100, size: 24, font, color: pdfLib.rgb(0.1, 0.3, 0.7)});
  return doc.save();
};
const _pdfLink = function pdfLink(pdfBytes, htl){
  const blob = new Blob([pdfBytes], {type: "application/pdf"});
  return htl.html`<a href=${URL.createObjectURL(blob)} download="hello.pdf">Download PDF (${blob.size} bytes)</a>`;
};
const _preview = async function preview(pdfjs, pdfBytes, htl){
  const pdf = await pdfjs.getDocument({data: pdfBytes.slice()}).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({scale: 1.5});
  const canvas = htl.html`<canvas width=${viewport.width} height=${viewport.height} style="border:1px solid #aaa">`;
  await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
  return canvas;
};
const _check = async function check(pdfBytes, pdfLib, preview, pdfLink){
  const back = await pdfLib.PDFDocument.load(pdfBytes);
  const px = preview.getContext("2d").getImageData(0, 0, preview.width, preview.height).data;
  let ink = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] && px[i] < 200) ink++;
  return {bytes: pdfBytes.length, magic: new TextDecoder().decode(pdfBytes.slice(0, 5)), pages: back.getPageCount(), inkPixels: ink, link: pdfLink.getAttribute("download")};
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_pdfBytes", "pdfBytes", ["pdfLib"], _pdfBytes);
  $def("_pdfLink", "pdfLink", ["pdfBytes", "htl"], _pdfLink);
  $def("_preview", "preview", ["pdfjs", "pdfBytes", "htl"], _preview);
  $def("_check", "check", ["pdfBytes", "pdfLib", "preview", "pdfLink"], _check);
  main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
  main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
  main.define("pdfjs", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfjs", _));
  return main;
}
