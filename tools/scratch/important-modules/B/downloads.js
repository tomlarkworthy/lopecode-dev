const _rows = function rows(){return([{name: "Ada", score: 91}, {name: "Grace", score: 88}])};
const _csvButton = function csvButton(DOM, d3, rows){return(
DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), "scores.csv", "Download CSV")
)};
const _jsonButton = function jsonButton(DOM, rows){return(
DOM.download(() => new Blob([JSON.stringify(rows, null, 2)], {type: "application/json"}), "scores.json", "Download JSON")
)};
const _jspdf = async function jspdf(){return((await import("https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm")).jsPDF)};
const _pdfBlob = function pdfBlob(jspdf, rows){
  const doc = new jspdf();
  doc.text("Scores", 20, 20);
  rows.forEach((r, i) => doc.text(`${r.name}: ${r.score}`, 20, 30 + i * 10));
  return doc.output("blob");
};
const _docxLib = async function docxLib(){return(import("https://cdn.jsdelivr.net/npm/docx@9.8.0/+esm"))};
const _docxBlob = function docxBlob(docxLib, rows){
  const {Document, Packer, Paragraph, TextRun} = docxLib;
  const doc = new Document({sections: [{children: [
    new Paragraph({children: [new TextRun({text: "Scores", bold: true})]}),
    ...rows.map(r => new Paragraph(`${r.name}: ${r.score}`))
  ]}]});
  return Packer.toBlob(doc);
};
const _XLSX = async function XLSX(){return(import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"))};
const _xlsxBlob = function xlsxBlob(XLSX, rows){
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Scores");
  const bytes = XLSX.write(wb, {bookType: "xlsx", type: "array"});
  return new Blob([bytes], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
};
const _fileLinks = function fileLinks(htl, pdfBlob, docxBlob, xlsxBlob){
  const a = (blob, name) => htl.html`<a href=${URL.createObjectURL(blob)} download=${name}>${name}</a>`;
  return htl.html`<div>${a(pdfBlob, "scores.pdf")} · ${a(docxBlob, "scores.docx")} · ${a(xlsxBlob, "scores.xlsx")}</div>`;
};
const _check = async function check(csvButton, jsonButton, pdfBlob, docxBlob, xlsxBlob, fileLinks){
  const head = async (b, n) => new TextDecoder().decode(new Uint8Array(await b.slice(0, n).arrayBuffer()));
  return [csvButton.textContent.trim(), jsonButton.textContent.trim(),
    "pdf " + pdfBlob.size + " " + await head(pdfBlob, 5), "docx " + docxBlob.size + " " + await head(docxBlob, 2),
    "xlsx " + xlsxBlob.size + " " + await head(xlsxBlob, 2), fileLinks.querySelectorAll("a[download]").length + " links"].join("|");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_rows", "rows", [], _rows);
  $def("_csvButton", "csvButton", ["DOM", "d3", "rows"], _csvButton);
  $def("_jsonButton", "jsonButton", ["DOM", "rows"], _jsonButton);
  $def("_jspdf", "jspdf", [], _jspdf);
  $def("_pdfBlob", "pdfBlob", ["jspdf", "rows"], _pdfBlob);
  $def("_docxLib", "docxLib", [], _docxLib);
  $def("_docxBlob", "docxBlob", ["docxLib", "rows"], _docxBlob);
  $def("_XLSX", "XLSX", [], _XLSX);
  $def("_xlsxBlob", "xlsxBlob", ["XLSX", "rows"], _xlsxBlob);
  $def("_fileLinks", "fileLinks", ["htl", "pdfBlob", "docxBlob", "xlsxBlob"], _fileLinks);
  $def("_check", "check", ["csvButton", "jsonButton", "pdfBlob", "docxBlob", "xlsxBlob", "fileLinks"], _check);
  return main;
}
