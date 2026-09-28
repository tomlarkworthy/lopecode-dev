// rc5-train eval (20260928-0847-w6): an invoice form whose PDF download must still work after a save.
// In run 20260928-0847-w6-before the agent never read important-modules.md (its index title names
// "files", not PDF) and spent the whole 20-minute turn reasoning about jsPDF from a CDN versus
// vendoring it (step 1 took 686 s, step 2 never returned). The page answers that question: pdfLib from
// @tomlarkworthy/sign-a-pdf is embedded by a save; a CDN jsPDF import is not and fails offline.
//
// setup.collect mounts every cell of the modules created during the turn, types a client name, clicks
// the PDF download control, captures the offered file (an <a download> clicked in or out of the
// document, dispatched, or DOM.download's second click), and checks: PDF bytes, the client name inside
// the PDF (literal, hex or Flate-compressed text), and that no user cell loads code from a CDN URL,
// which a save does not embed.

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

export const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  // modules created during the turn, less the ones they import (sign-a-pdf and its own imports)
  const imported = new Set([...rt._variables].filter(v => String(v._name).startsWith("module ") && v._value).map(v => v._value));
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && !imported.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { pdf: false, name: false, offline: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // offline: a save embeds modules and file attachments, not code fetched from a CDN at run time
  const userMods = new Set(users().map(v => v._module));
  const srcs = [...rt._variables].filter(v => userMods.has(v._module) && v._definition).map(v => String(v._definition));
  const cdn = /https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|cdnjs\.cloudflare\.com|cdn\.skypack\.dev|ga\.jspm\.io|jspm\.dev)/;
  const hit = srcs.find(s => cdn.test(s));
  out.offline = !hit;
  if (hit) out.why.push("a user cell loads from a CDN (not embedded by a save): " + hit.match(cdn)[0]);
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff;max-height:100vh;overflow:auto";
  document.body.appendChild(host);
  const mount = () => { for (const x of els()) if (!x.isConnected) host.appendChild(x); };
  const files = [];
  const record = a => { if (a && a.hasAttribute && a.hasAttribute("download") && a.href) files.push({ href: a.href, name: a.download || a.getAttribute("download") }); };
  // a handler may revoke the object URL right after click(), before this reads it; the browser's own
  // download would already have the bytes
  const origRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = () => {};
  const origClick = HTMLAnchorElement.prototype.click;
  const origDispatch = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (e && e.type === "click" && !this.isConnected) { record(this); return true; } return origDispatch.call(this, e); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); setTimeout(() => record(a), 0); } };
  document.addEventListener("click", onDocClick, true);
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
  // the words around an input: its own attributes, then the nearest ancestor that has any text
  const ctx = el => {
    const own = [el.placeholder, el.name, el.id, el.getAttribute("aria-label"), el.labels?.[0]?.textContent].filter(Boolean).join(" ");
    let a = el.parentElement, near = "";
    for (let k = 0; k < 4 && a && !near.trim(); k++, a = a.parentElement) near = a.textContent || "";
    return (own + " " + near).slice(0, 200);
  };
  const setInput = (inp, value) => {
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), "value").set; set.call(inp, value);
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const dlBtn = () => [...all("a[download]"), ...all("button"), ...all("input[type=button]")]
    .find(b => /pdf/i.test(label(b) + " " + (b.getAttribute("download") || "")) || (b.matches("a[download]") && /download/i.test(label(b))));
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      mount(); const b = dlBtn(); if (!b) return null;
      b.click();
      for (let w = 0; w < 30 && files.length === n; w++) await sleep(200);
    }
    return files.length > n ? files[files.length - 1] : null;
  };
  const inflate = async bytes => {
    for (const fmt of ["deflate", "deflate-raw"]) {
      try { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(fmt))).arrayBuffer()); } catch {}
    }
    return null;
  };
  // every text form a PDF writer may use: literal, hex, and inside FlateDecode streams
  const pdfText = async bytes => {
    const latin = b => { let s = ""; for (let i = 0; i < b.length; i += 65536) s += String.fromCharCode(...b.subarray(i, i + 65536)); return s; };
    const raw = latin(bytes);
    const parts = [raw];
    const re = /stream\r?\n/g; let m;
    while ((m = re.exec(raw))) {
      const start = m.index + m[0].length;
      let end = raw.indexOf("endstream", start);
      if (end < 0) break;
      while (end > start && (raw[end - 1] === "\n" || raw[end - 1] === "\r")) end--;
      const inf = await inflate(bytes.subarray(start, end));
      if (inf) parts.push(latin(inf));
    }
    return parts.join("\n");
  };
  const contains = (text, s) => {
    if (text.includes(s)) return true;
    const hex = [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    const hex16 = [...s].map(c => c.charCodeAt(0).toString(16).padStart(4, "0")).join("");
    const t = text.toLowerCase().replace(/[\s<>]/g, "");
    return t.includes(hex) || t.includes(hex16);
  };
  try {
    await sleep(1000); mount();
    const texts = all("input").filter(i => !i.type || i.type === "text" || i.type === "search");
    const nameInput = texts.find(i => /client|customer|bill/i.test(ctx(i))) || texts.find(i => /name/i.test(ctx(i)));
    const NAME = "Zebulon Quill";
    if (nameInput) { setInput(nameInput, NAME); await sleep(1500); } else out.why.push("no client name input");
    if (!dlBtn()) { mount(); await sleep(1500); }
    if (!dlBtn()) { out.why.push("no PDF download control (controls: " + JSON.stringify([...all("button"), ...all("a")].map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    // the PDF may be rebuilt asynchronously after the name changes: allow a few seconds for it
    for (let k = 0; k < 4; k++) {
      const f = await download();
      if (!f) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
      const bytes = new Uint8Array(await (await fetch(f.href)).arrayBuffer());
      out.pdf = String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
      if (!out.pdf) { out.why.push("file " + JSON.stringify(f.name) + " does not start with %PDF-"); return out; }
      out.name = !!nameInput && contains(await pdfText(bytes), NAME);
      if (out.name || !nameInput) break;
      await sleep(1500);
    }
    if (nameInput && !out.name) out.why.push("the PDF does not contain the typed client name");
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

// pdfLib import and the pdfBytes/pdfLink pair copied from the important-modules.md sign-a-pdf section,
// whose pdfLib is @tomlarkworthy/sign-a-pdf._pdfLib (lopebooks/notebooks/@tomlarkworthy_sign-a-pdf.html)
export const SOLUTION = `const _intro = function intro(md){return( md\`# Invoice\` )};
const _viewof_client = function viewof_client(Inputs){return( Inputs.text({label: "Client name", value: "Acme Ltd"}) )};
const _client = (G, _) => G.input(_);
const _viewof_taxRate = function viewof_taxRate(Inputs){return( Inputs.number({label: "Tax rate (%)", value: 20, min: 0, step: 0.1}) )};
const _taxRate = (G, _) => G.input(_);
const _viewof_items = function viewof_items(htl){
  const tbody = htl.html\`<tbody></tbody>\`;
  const root = htl.html\`<div><table><thead><tr><th>Description</th><th>Qty</th><th>Price</th></tr></thead>\${tbody}</table>
    <button onclick=\${() => { addRow("", 1, 0); emit(); }}>Add line</button></div>\`;
  const read = () => [...tbody.rows].map(r => ({description: r.cells[0].firstChild.value, quantity: +r.cells[1].firstChild.value || 0, price: +r.cells[2].firstChild.value || 0}));
  const emit = () => { root.value = read(); root.dispatchEvent(new Event("input", {bubbles: true})); };
  function addRow(d, q, p) {
    tbody.append(htl.html\`<tr><td><input value=\${d} oninput=\${emit}></td><td><input type=number value=\${q} oninput=\${emit}></td><td><input type=number step=0.01 value=\${p} oninput=\${emit}></td></tr>\`);
  }
  addRow("Design work", 10, 80); addRow("Hosting", 1, 25);
  root.value = read();
  return root;
};
const _items = (G, _) => G.input(_);
const _subtotal = function subtotal(items){return( items.reduce((s, i) => s + i.quantity * i.price, 0) )};
const _tax = function tax(subtotal, taxRate){return( subtotal * taxRate / 100 )};
const _total = function total(subtotal, tax){return( subtotal + tax )};
const _summary = function summary(htl, subtotal, tax, total){return( htl.html\`<p>Subtotal \${subtotal.toFixed(2)} · Tax \${tax.toFixed(2)} · <b>Total \${total.toFixed(2)}</b></p>\` )};
const _pdfBytes = async function pdfBytes(pdfLib, client, items, taxRate, subtotal, tax, total){
  const doc = await pdfLib.PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  let y = 780;
  const line = (s, size = 12) => { page.drawText(s, {x: 50, y, size, font}); y -= size + 8; };
  line("Invoice", 24);
  line("Client: " + client);
  for (const i of items) line(i.description + "  " + i.quantity + " x " + i.price.toFixed(2) + " = " + (i.quantity * i.price).toFixed(2));
  line("Subtotal: " + subtotal.toFixed(2));
  line("Tax (" + taxRate + "%): " + tax.toFixed(2));
  line("Total: " + total.toFixed(2), 14);
  return doc.save();
};
const _pdfLink = function pdfLink(pdfBytes, htl){
  const blob = new Blob([pdfBytes], {type: "application/pdf"});
  return htl.html\`<a href=\${URL.createObjectURL(blob)} download="invoice.pdf">Download PDF</a>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_client", "viewof client", ["Inputs"], _viewof_client);
  $def("_client", "client", ["Generators", "viewof client"], _client);
  $def("_viewof_taxRate", "viewof taxRate", ["Inputs"], _viewof_taxRate);
  $def("_taxRate", "taxRate", ["Generators", "viewof taxRate"], _taxRate);
  $def("_viewof_items", "viewof items", ["htl"], _viewof_items);
  $def("_items", "items", ["Generators", "viewof items"], _items);
  $def("_subtotal", "subtotal", ["items"], _subtotal);
  $def("_tax", "tax", ["subtotal", "taxRate"], _tax);
  $def("_total", "total", ["subtotal", "tax"], _total);
  $def("_summary", "summary", ["htl", "subtotal", "tax", "total"], _summary);
  $def("_pdfBytes", "pdfBytes", ["pdfLib", "client", "items", "taxRate", "subtotal", "tax", "total"], _pdfBytes);
  $def("_pdfLink", "pdfLink", ["pdfBytes", "htl"], _pdfLink);
  main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
  main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
  return main;
}
`;

export const criteria = [
  // the defect: a turn that never produces a working PDF download
  { name: "collected_equals", args: { key: "pdf", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "name", equals: true }, weight: 2 },
  // a CDN import works live and fails after save + reopen offline
  { name: "collected_equals", args: { key: "offline", equals: true }, weight: 2 },
];

export default {
  id: "rc5t-invoice-pdf",
  category: "rc5-train",
  question: "Make an invoice form (client name, line items with quantity and price, tax rate) that shows the total and has a button to download the invoice as a PDF.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/invoice.js", content: SOLUTION }, settleMs: 4000 },
  ],
};
