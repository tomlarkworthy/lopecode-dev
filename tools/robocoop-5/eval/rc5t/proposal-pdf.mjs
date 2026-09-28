// rc5-train eval (20260928-0847-w16): a PDF drawn with fonts embedded into a different PDFDocument.
// In run 20260928-0847-w16-before the agent's first pdf-lib write called pdfLib.embedFont (no such
// function); to fix it, it added a cell `pdfDoc = PDFDocument.create()` and cells `font`/`bold` =
// pdfDoc.embedFont(...), while `pdfBytes` created and saved a second document. pdf-lib raised no error
// and the write result said "all 24 cells compute with no runtime error". In the saved file the bold
// font's reference pointed at the Page object: PDF.js extracted no title, no section headings, no
// "Total" row and no $110,000 figure; only the regular-weight lines survived.
//
// setup.collect mounts every cell of the modules created during the turn, clicks the PDF download
// control, captures the file, and parses it without any PDF library: every entry of every /Font resource
// dictionary must resolve to a /Type /Font object (the defect), the text drawn with a readable font must
// contain the budget total the page computes (score 2) and the document's text (score 1): a sentence typed
// into its largest textarea when it has one, else a sentence of its rendered text.

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

export const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const imported = new Set([...rt._variables].filter(v => String(v._name).startsWith("module ") && v._value).map(v => v._value));
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && !imported.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { pdf: false, fonts: false, total: false, doc: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff;max-height:100vh;overflow:auto;width:900px";
  document.body.appendChild(host);
  const mount = () => { for (const x of els()) if (!x.isConnected) host.appendChild(x); };
  const files = [];
  const record = a => { if (a && a.hasAttribute && a.hasAttribute("download") && a.href) files.push({ href: a.href, name: a.download || a.getAttribute("download") }); };
  const origRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = () => {};
  const origClick = HTMLAnchorElement.prototype.click;
  const origDispatch = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (e && e.type === "click" && !this.isConnected) { record(this); return true; } return origDispatch.call(this, e); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); setTimeout(() => record(a), 0); } };
  document.addEventListener("click", onDocClick, true);
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
  const dlBtn = () => [...all("a[download]"), ...all("button"), ...all("input[type=button]")]
    .find(b => /pdf/i.test(label(b) + " " + (b.getAttribute("download") || "")) || (b.matches("a[download]") && /download/i.test(label(b))));
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      mount(); const b = dlBtn(); if (!b) return null;
      // an <a download> with no href yet (DOM.download) builds its file in its own click handler: run it
      if (b.matches("a[download]") && !b.href) origDispatch.call(b, new MouseEvent("click", { bubbles: false, cancelable: true }));
      else b.click();
      for (let w = 0; w < 30 && files.length === n; w++) { await sleep(200); if (b.matches("a[download]") && b.href) record(b); }
    }
    return files.length > n ? files[files.length - 1] : null;
  };
  // No PDF library: objects (direct and inside /ObjStm streams), /Font resource entries, and the strings
  // shown by Tj/TJ in content streams.
  const pdfCheck = async bytes => {
    const latin = b => { let s = ""; for (let i = 0; i < b.length; i += 65536) s += String.fromCharCode(...b.subarray(i, i + 65536)); return s; };
    const inflate = async b => { for (const f of ["deflate", "deflate-raw"]) { try { return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream(f))).arrayBuffer()); } catch {} } return null; };
    const raw = latin(bytes);
    const objs = new Map(), streams = [];
    const re = /(\d+)\s+(\d+)\s+obj\b/g; let m;
    while ((m = re.exec(raw))) {
      const start = m.index + m[0].length;
      const end = raw.indexOf("endobj", start); if (end < 0) break;
      let body = raw.slice(start, end);
      const si = body.search(/stream\r?\n/);
      if (si >= 0) {
        const dict = body.slice(0, si);
        const s0 = start + si + body.slice(si).match(/stream\r?\n/)[0].length;
        let s1 = raw.lastIndexOf("endstream", end); while (s1 > s0 && (raw[s1 - 1] === "\n" || raw[s1 - 1] === "\r")) s1--;
        const data = /FlateDecode/.test(dict) ? await inflate(bytes.subarray(s0, s1)) : bytes.subarray(s0, s1);
        const text = data ? latin(data) : "";
        streams.push(text);
        body = dict;
        if (/\/Type\s*\/ObjStm/.test(dict) && text) {
          const first = +dict.match(/\/First\s+(\d+)/)[1];
          const head = text.slice(0, first).trim().split(/\s+/).map(Number);
          for (let i = 0; i < head.length; i += 2) {
            const a = first + head[i + 1], b = i + 3 < head.length ? first + head[i + 3] : text.length;
            objs.set(head[i], text.slice(a, b));
          }
        }
      }
      objs.set(+m[1], body);
    }
    const every = [...objs.values()].join("\n");
    const fontDicts = [];
    for (const x of every.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) fontDicts.push(x[1]);
    for (const x of every.matchAll(/\/Font\s+(\d+)\s+0\s+R/g)) fontDicts.push(objs.get(+x[1]) || "");
    const fontRefs = new Set();
    for (const d of fontDicts) for (const r of d.matchAll(/\/[^\s/<>\[\]()]+\s+(\d+)\s+0\s+R/g)) fontRefs.add(+r[1]);
    const badFonts = [...fontRefs].filter(n => !/\/Type\s*\/Font\b/.test(objs.get(n) || ""));
    const hex = h => (h.replace(/\s/g, "").match(/../g) || []).map(c => String.fromCharCode(parseInt(c, 16))).join("").replace(/\0/g, "");
    // a font name is readable when some resource dictionary maps it to a real /Font object
    const readable = new Set();
    for (const d of fontDicts) for (const r of d.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+0\s+R/g)) if (/\/Type\s*\/Font\b/.test(objs.get(+r[2]) || "")) readable.add(r[1]);
    const shown = [];
    for (const s of streams) {
      // walk Tf / Tj / TJ in order; keep only text drawn with a readable font
      let cur = null;
      for (const x of s.matchAll(/\/([^\s/<>\[\]()]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f\s]+)>\s*Tj|\(((?:\\.|[^\\)])*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g)) {
        if (x[1] != null) { cur = x[1]; continue; }
        if (!readable.has(cur)) continue;
        if (x[2] != null) shown.push(hex(x[2]));
        else if (x[3] != null) shown.push(x[3]);
        else shown.push([...x[4].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)].map(y => y[1] ?? hex(y[2])).join(""));
      }
    }
    return { text: shown.join("\n"), badFonts, fontCount: fontRefs.size };
  };
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  try {
    await sleep(3000); mount(); await sleep(1500);
    // the total the page computes: a numeric user cell named *total*, else the number after "Total" on the page
    const totals = users().filter(v => /total/i.test(v._name) && typeof v._value === "number" && v._value > 0).map(v => v._value);
    // the document's text: rendered text plus what the reader typed into text fields
    const pageText = els().map(e => e.innerText || e.textContent || "").join("\n") + "\n" + all("textarea, input[type=text], input:not([type])").map(i => i.value).join("\n");
    if (!totals.length) for (const x of pageText.matchAll(/total[^\d\n]{0,20}(\d[\d,]*(?:\.\d+)?)/gi)) totals.push(+x[1].replace(/,/g, ""));
    if (!totals.length) out.why.push("no budget total on the page (no numeric *total* cell, no 'Total <number>' text)");
    if (!dlBtn()) { out.why.push("no PDF download control (controls: " + JSON.stringify([...all("button"), ...all("a")].map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    // a document written in text fields: type a sentence into the largest one; the PDF must carry it
    const TYPED = "Quokka rotation schedule approved by the steering group";
    const areas = all("textarea");
    const field = areas.sort((a, b) => (b.rows || 2) - (a.rows || 2))[0];
    if (field) {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      set.call(field, TYPED);
      field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(3000); mount();
    }
    const f = await download();
    if (!f) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
    const bytes = new Uint8Array(await (await fetch(f.href)).arrayBuffer());
    out.pdf = String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
    if (!out.pdf) { out.why.push("file " + JSON.stringify(f.name) + " does not start with %PDF-"); return out; }
    const r = await pdfCheck(bytes);
    out.fonts = r.fontCount > 0 && r.badFonts.length === 0;
    if (!out.fonts) out.why.push(r.fontCount ? "font resource(s) " + r.badFonts.join(",") + " do not point at a /Font object (font embedded into a different document?)" : "no /Font resources found");
    const flat = r.text.replace(/[,\s]/g, "");
    // text drawn with an unresolvable font counts as absent: PDF.js drops it
    out.total = totals.some(t => flat.includes(String(Math.trunc(t))));
    if (totals.length && !out.total) out.why.push("the PDF does not show the total " + JSON.stringify(totals));
    // a sentence of the document: any 30+ char run of the page's text that is not a number table
    const sentences = pageText.split(/[\n.!?]/).map(norm).filter(s => s.length >= 30 && /[a-z]{4}/i.test(s));
    const pdfFlat = norm(r.text.replace(/\n/g, " "));
    out.doc = field ? pdfFlat.includes(TYPED) : sentences.some(s => pdfFlat.includes(s.slice(0, 30)));
    if (!out.doc) out.why.push(field ? "the PDF does not contain the text typed into the document's text field" : "no sentence of the page's text is in the PDF");
    return out;
  } finally {
    HTMLAnchorElement.prototype.click = origClick;
    URL.revokeObjectURL = origRevoke;
    HTMLAnchorElement.prototype.dispatchEvent = origDispatch;
    document.removeEventListener("click", onDocClick, true);
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

// editable-md import from important-modules.md "editable-md"; sheet import and grid from its "sheet"
// section; pdfLib import from "sign-a-pdf". Fonts are embedded into the document the handler saves, as
// @tomlarkworthy/sign-a-pdf._embed embeds into the same pdfDoc that _url saves.
export const SOLUTION = `const _proposal = function proposal(md){return( md\`# Proposal: community tool library

We will open a lending library for garden and repair tools in the church hall on Saturdays.

## Budget
The table below adds up its own total.\` )};
const _A1 = function A1(){return( "Shelving" )};
const _B1 = function B1(){return( 1200 )};
const _A2 = function A2(){return( "Tools" )};
const _B2 = function B2(){return( 3400 )};
const _A3 = function A3(){return( "Insurance" )};
const _B3 = function B3(){return( 650 )};
const _total = function total(B1, B2, B3){return( B1 + B2 + B3 )};
const _A5 = function A5(){return( "Total" )};
const _B5 = function B5(total){return( total )};
const _buildPdf = function buildPdf(pdfLib){return( async (lines) => {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  let y = 790;
  for (const [text, strong] of lines) { page.drawText(text, {x: 50, y, size: strong ? 14 : 11, font: strong ? bold : font}); y -= strong ? 22 : 16; }
  return new Blob([await doc.save()], {type: "application/pdf"});
} )};
const _download = function download(htl, buildPdf, proposal, A1, B1, A2, B2, A3, B3, total){return(
htl.html\`<button onclick=\${async () => {
  const text = proposal.innerText.split("\\n").map(s => s.trim()).filter(Boolean).map((s, i) => [s, i === 0]);
  const rows = [[A1, B1], [A2, B2], [A3, B3]].map(([a, b]) => [a + "  " + b.toFixed(2), false]);
  const blob = await buildPdf([...text, ...rows, ["Total  " + total.toFixed(2), true]]);
  const link = htl.html\`<a download="proposal.pdf" href=\${URL.createObjectURL(blob)}>\`;
  link.click();
}}>Download PDF</button>\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_proposal", "proposal", ["md"], _proposal);
  $def("_A1", "A1", [], _A1);
  $def("_B1", "B1", [], _B1);
  $def("_A2", "A2", [], _A2);
  $def("_B2", "B2", [], _B2);
  $def("_A3", "A3", [], _A3);
  $def("_B3", "B3", [], _B3);
  $def("_total", "total", ["B1", "B2", "B3"], _total);
  $def("_A5", "A5", [], _A5);
  $def("_B5", "B5", ["total"], _B5);
  $def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
  $def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
  $def("_grid", "grid", ["sheet", "runtime", "invalidation", "myModule"], (sheet, runtime, invalidation, myModule) => sheet(runtime, {invalidation, module: myModule, format: {B1: "0.00", B2: "0.00", B3: "0.00", B5: "0.00"}}));
  $def("_buildPdf", "buildPdf", ["pdfLib"], _buildPdf);
  $def("_download", "download", ["htl", "buildPdf", "proposal", "A1", "B1", "A2", "B2", "A3", "B3", "total"], _download);
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
  main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
  main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
  return main;
}
`;

export const criteria = [
  // the defect: text drawn with a font that belongs to another PDFDocument
  { name: "collected_equals", args: { key: "fonts", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "total", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "doc", equals: true }, weight: 1 },
];

export default {
  id: "rc5t-proposal-pdf",
  category: "rc5-train",
  question: "Write a one-page project proposal as a document I can edit, with a budget table that adds up its own total, and a button to download it as a PDF.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/proposal.js", content: SOLUTION }, settleMs: 6000 },
  ],
};
