// rc5-train eval (20260928-0847-w10): a form-filled letter whose "Word document" download must be a real
// .docx that still downloads after a save + reopen offline.
//
// setup.collect mounts every cell of the modules created during the turn, types a recipient name into
// the name input, clicks the Word download control, captures the offered file (an <a download> clicked
// in or out of the document, dispatched, or DOM.download's second click), unzips it in the page and
// checks: a zip with [Content_Types].xml and word/document.xml, the typed name in word/document.xml's
// text, the name shown on the page (the letter preview), and that no user cell loads code from a CDN
// URL, which a save does not embed.

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

export const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  // modules created during the turn, less the ones they import
  const imported = new Set([...rt._variables].filter(v => String(v._name).startsWith("module ") && v._value).map(v => v._value));
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && !imported.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { docx: false, name: false, preview: false, date: false, clickOnly: false, offline: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
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
  const origRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = () => {};
  const origClick = HTMLAnchorElement.prototype.click;
  const origDispatch = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (e && e.type === "click" && !this.isConnected) { record(this); return true; } return origDispatch.call(this, e); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); setTimeout(() => record(a), 0); } };
  document.addEventListener("click", onDocClick, true);
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
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
    .find(b => /word|docx|\.doc\b/i.test(label(b) + " " + (b.getAttribute("download") || "")) || (b.matches("a[download]") && /download/i.test(label(b))))
    || [...all("button")].find(b => /download/i.test(label(b)));
  const download = async () => {
    const n = files.length;
    for (let k = 0; k < 2 && files.length === n; k++) {
      mount(); const b = dlBtn(); if (!b) return null;
      // a real click event: HTMLAnchorElement.click is patched to record, which would skip DOM.download's handler
      if (b instanceof HTMLAnchorElement) b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true })); else b.click();
      for (let w = 0; w < 30 && files.length === n; w++) await sleep(200);
    }
    return files.length > n ? files[files.length - 1] : null;
  };
  // minimal zip reader: central directory -> entry bytes (stored or deflated)
  const unzip = async bytes => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return null;
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const entries = {};
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nlen));
      entries[name] = { method, csize, local };
      p += 46 + nlen + xlen + clen;
    }
    const read = async name => {
      const e = entries[name]; if (!e) return null;
      const start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const raw = bytes.subarray(start, start + e.csize);
      if (e.method === 0) return new TextDecoder().decode(raw);
      if (e.method === 8) return new TextDecoder().decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
      return null;
    };
    return { names: Object.keys(entries), read };
  };
  const NAME = "Zebulon Quill";
  try {
    await sleep(1000); mount();
    const texts = all("input").filter(i => !i.type || i.type === "text" || i.type === "search");
    const own = i => [i.placeholder, i.name, i.id, i.getAttribute("aria-label"), i.labels?.[0]?.textContent].filter(Boolean).join(" ");
    const nameInput = texts.find(i => /recipient|addressee|\bto\b/i.test(own(i)) && !/address|street|date|city/i.test(own(i))) || texts.find(i => /recipient/i.test(ctx(i)) && !/address/i.test(own(i))) || texts.find(i => /name/i.test(ctx(i)));
    if (nameInput) { setInput(nameInput, NAME); await sleep(1500); } else out.why.push("no recipient name input");
    mount();
    out.preview = !!nameInput && els().some(e => !e.matches("form, input, textarea") && !e.querySelector("input") && (e.textContent || "").includes(NAME));
    if (nameInput && !out.preview) out.why.push("the typed name does not appear in a rendered letter");
    if (!dlBtn()) { mount(); await sleep(1500); }
    if (!dlBtn()) { out.why.push("no Word download control (controls: " + JSON.stringify([...all("button"), ...all("a")].map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    // the file may be rebuilt asynchronously after the name changes: allow a few seconds for it
    for (let k = 0; k < 4; k++) {
      const f = await download();
      if (!f) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
      const bytes = new Uint8Array(await (await fetch(f.href)).arrayBuffer());
      // the offered file, for inspecting it outside the page (not scored)
      if (bytes.length < 300000) { let b = ""; for (const c of bytes) b += String.fromCharCode(c); out.file = { name: f.name, b64: btoa(b) }; }
      const z = bytes[0] === 0x50 && bytes[1] === 0x4b ? await unzip(bytes) : null;
      if (!z) { out.why.push("file " + JSON.stringify(f.name) + " is not a zip (a .docx is one); starts " + JSON.stringify(new TextDecoder().decode(bytes.subarray(0, 40)))); break; }
      const doc = await z.read("word/document.xml");
      out.docx = z.names.includes("[Content_Types].xml") && doc != null && /\.docx$/i.test(f.name || "");
      if (!out.docx) { out.why.push("file " + JSON.stringify(f.name) + " entries " + JSON.stringify(z.names.slice(0, 12))); break; }
      out.name = !!nameInput && doc.replace(/<[^>]+>/g, "").includes(NAME);
      if (out.name || !nameInput) break;
      await sleep(1500);
    }
    if (out.docx && nameInput && !out.name) out.why.push("word/document.xml does not contain the typed name");
    // a file is offered only when the button is clicked: editing the form after a download offers none
    const before = files.length;
    if (nameInput) { setInput(nameInput, NAME + " Jr"); await sleep(1200); setInput(nameInput, NAME); await sleep(2500); }
    out.clickOnly = files.length === before;
    if (!out.clickOnly) out.why.push((files.length - before) + " file(s) offered with no click, after editing the name");
    // a picked date shows in the letter as a date
    const dateInput = all("input[type=date]")[0];
    if (!dateInput) out.why.push("no date input");
    else {
      setInput(dateInput, "2031-03-14"); await sleep(2000); mount();
      const shown = els().filter(e => !e.matches("form, input, textarea") && !e.querySelector("input")).map(e => e.textContent || "").join("\n");
      out.date = /2031/.test(shown) && !/Invalid Date|NaN/.test(shown);
      if (!out.date) out.why.push("after picking 2031-03-14 the letter shows " + JSON.stringify((shown.match(/.{0,20}(Invalid Date|NaN|2031).{0,20}/) || [shown.slice(0, 80)])[0]));
    }
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

// JSZip import from @tomlarkworthy/jszip-3-10-1 (embedded in the robocoop-5 notebook, so a save keeps it);
// new JSZip() / zip.file / generateAsync({type: "blob"}) after @tomlarkworthy/local-change-history._exportFsToZip
// (lopecode/notebooks/@tomlarkworthy_exporter-3.html)
export const SOLUTION = `const _title = function title(md){return( md\`# Letter\` )};
const _viewof_recipient = function viewof_recipient(Inputs){return( Inputs.form({
  name: Inputs.text({label: "Recipient name", value: "Ada Lovelace"}),
  address: Inputs.textarea({label: "Address", value: "12 St James's Square\\nLondon"}),
  date: Inputs.date({label: "Date", value: new Date("2026-09-28")})
}) )};
const _recipient = (G, _) => G.input(_);
const _paragraphs = function paragraphs(recipient){
  const d = recipient.date ? recipient.date.toISOString().slice(0, 10) : "";
  return [recipient.name, ...String(recipient.address).split("\\n"), "", d, "", "Dear " + recipient.name + ",", "", "Thank you for your letter.", "", "Yours sincerely,", "The Sender"];
};
const _letter = function letter(htl, paragraphs){return( htl.html\`<div style="border:1px solid #ccc;padding:24px;max-width:560px;font-family:serif">\${paragraphs.map(p => htl.html\`<p style="margin:0;min-height:1em">\${p}</p>\`)}</div>\` )};
const _docxBlob = async function docxBlob(JSZip, paragraphs){
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const body = paragraphs.map(p => '<w:p><w:r><w:t xml:space="preserve">' + esc(p) + '</w:t></w:r></w:p>').join("");
  zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>');
  return zip.generateAsync({type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
};
const _download = function download(DOM, docxBlob, recipient){return( DOM.download(docxBlob, "letter-" + (recipient.name || "recipient").replace(/\\W+/g, "-") + ".docx", "Download Word document") )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_viewof_recipient", "viewof recipient", ["Inputs"], _viewof_recipient);
  $def("_recipient", "recipient", ["Generators", "viewof recipient"], _recipient);
  $def("_paragraphs", "paragraphs", ["recipient"], _paragraphs);
  $def("_letter", "letter", ["htl", "paragraphs"], _letter);
  $def("_docxBlob", "docxBlob", ["JSZip", "paragraphs"], _docxBlob);
  $def("_download", "download", ["DOM", "docxBlob", "recipient"], _download);
  main.define("module @tomlarkworthy/jszip-3-10-1", async () => runtime.module((await import("/@tomlarkworthy/jszip-3-10-1.js?v=4")).default));
  main.define("JSZip", ["module @tomlarkworthy/jszip-3-10-1", "@variable"], (_, v) => v.import("JSZip", _));
  return main;
}
`;

export const criteria = [
  { name: "collected_equals", args: { key: "docx", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "name", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "preview", equals: true }, weight: 1 },
  // editing the form after one download must not download again
  { name: "collected_equals", args: { key: "clickOnly", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "date", equals: true }, weight: 2 },
  // a CDN import works live and fails after save + reopen offline
  { name: "collected_equals", args: { key: "offline", equals: true }, weight: 2 },
];

export default {
  id: "rc5t-letter-docx",
  category: "rc5-train",
  question: "Make a letter template: I fill in the recipient's name, address and the date in a form, it shows the finished letter, and a button downloads it as a Word document.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/letter.js", content: SOLUTION }, settleMs: 4000 },
  ],
};
