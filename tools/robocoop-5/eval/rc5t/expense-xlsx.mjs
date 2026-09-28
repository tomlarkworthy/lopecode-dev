// rc5-train eval (20260928-0847-w14): a table the user adds rows to through visible fields, with a
// running total, and a button that downloads a real .xlsx holding those rows.
//
// Defect it catches: the agent used Inputs.input(v) (an invisible EventTarget) as the form's fields;
// the form showed "Date [object EventTarget] ... Amount [object EventTarget] Add Expense", the write
// result said "all 15 cells compute", and the agent told the user it worked.
//
// setup.collect mounts every cell of the modules created during the turn, then:
//   fields  - a visible text field and a numeric field (and no "[object ...]" text on the page)
//   added   - typing two rows and clicking the add control shows both descriptions
//   total   - some number on the page rises by the two amounts (12.5 + 30.25 = 42.75)
//   xlsx    - the Excel control offers a *.xlsx zip with [Content_Types].xml, xl/workbook.xml and a
//             worksheet whose cells (or sharedStrings) hold both descriptions and 30.25
//   clickOnly - adding a row after the download offers no file
//   offline - no user cell loads code from a CDN URL (a save does not embed it)

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

export const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const imported = new Set([...rt._variables].filter(v => String(v._name).startsWith("module ") && v._value).map(v => v._value));
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && !imported.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { fields: false, added: false, total: false, xlsx: false, clickOnly: false, offline: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const userMods = new Set(users().map(v => v._module));
  const srcs = [...rt._variables].filter(v => userMods.has(v._module) && v._definition).map(v => String(v._definition));
  const cdn = /https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|cdnjs\.cloudflare\.com|cdn\.skypack\.dev|ga\.jspm\.io|jspm\.dev|cdn\.sheetjs\.com)/;
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
  const pageText = () => { mount(); return els().map(e => e.innerText || e.textContent || "").join("\n"); };
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
    for (let k = 0; k < 3 && a && !near.trim(); k++, a = a.parentElement) near = a.textContent || "";
    return (own + " " + near.slice(0, 80));
  };
  const setInput = (inp, value) => {
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), "value").set; set.call(inp, value);
    inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const nums = t => (t.replace(/(\d),(\d{3})/g, "$1$2").match(/-?\d+(\.\d+)?/g) || []).map(Number);
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
  const ROWS = [["Quokka feed", "12.5"], ["Zither strings", "30.25"]];
  try {
    await sleep(1000); mount();
    const bad = pageText().match(/\[object [A-Z]\w*\]/);
    const inputs = all("input").filter(i => i.type !== "hidden" && i.getClientRects().length);
    const textIn = inputs.find(i => (!i.type || i.type === "text" || i.type === "search") && /desc|item|what|note|name|label/i.test(ctx(i))) || inputs.find(i => !i.type || i.type === "text");
    const numIn = inputs.find(i => i.type === "number" && /amount|cost|price|value|sum/i.test(ctx(i))) || inputs.find(i => i.type === "number") || inputs.find(i => i !== textIn && (i.type === "text" || i.inputMode === "decimal") && /amount|cost|price/i.test(ctx(i)));
    const dateIn = inputs.find(i => i.type === "date") || inputs.find(i => i !== textIn && i !== numIn && /date/i.test(ctx(i)));
    out.fields = !!textIn && !!numIn && !bad;
    if (bad) out.why.push("the page shows the text " + JSON.stringify(bad[0]));
    if (!textIn || !numIn) { out.why.push("no visible description/amount fields (inputs: " + JSON.stringify(inputs.map(i => i.type + ":" + ctx(i).slice(0, 30))) + ")"); return out; }
    const addBtn = () => [...all("button"), ...all("input[type=submit]"), ...all("input[type=button]")].find(b => /add|save|record|submit|\+/i.test(label(b)) && !/excel|xlsx|export|download/i.test(label(b)));
    if (!addBtn()) { out.why.push("no add control"); return out; }
    const beforeNums = [0, ...nums(pageText())];
    for (const [desc, amt] of ROWS) {
      if (dateIn) setInput(dateIn, dateIn.type === "date" ? "2031-03-14" : "2031-03-14");
      setInput(textIn, desc); setInput(numIn, amt); await sleep(300);
      addBtn().click(); await sleep(1200); mount();
    }
    const after = pageText();
    out.added = ROWS.every(([d]) => after.includes(d));
    if (!out.added) out.why.push("after adding two rows the page shows " + JSON.stringify(ROWS.map(([d]) => d).filter(d => !after.includes(d))) + " missing");
    const afterNums = nums(after);
    out.total = out.added && beforeNums.some(b => afterNums.some(a => Math.abs(a - (b + 42.75)) < 0.006));
    if (out.added && !out.total) out.why.push("no number on the page rose by 42.75 (numbers: " + JSON.stringify(afterNums.slice(-12)) + ")");
    const dlBtn = () => [...all("a[download]"), ...all("button"), ...all("input[type=button]")].find(b => /excel|xlsx|spreadsheet/i.test(label(b) + " " + (b.getAttribute("download") || "")))
      || [...all("a[download]"), ...all("button")].find(b => /export|download/i.test(label(b)));
    if (!dlBtn()) { out.why.push("no Excel export control"); return out; }
    let f = null;
    for (let k = 0; k < 2 && !f; k++) {
      const n = files.length; const b = dlBtn();
      if (b instanceof HTMLAnchorElement) b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true })); else b.click();
      for (let w = 0; w < 30 && files.length === n; w++) await sleep(200);
      if (files.length > n) f = files[files.length - 1];
    }
    if (!f) { out.why.push("clicking " + JSON.stringify(label(dlBtn())) + " offered no file"); return out; }
    const bytes = new Uint8Array(await (await fetch(f.href)).arrayBuffer());
    if (bytes.length < 300000) { let s = ""; for (const c of bytes) s += String.fromCharCode(c); out.file = { name: f.name, b64: btoa(s) }; }
    const z = bytes[0] === 0x50 && bytes[1] === 0x4b ? await unzip(bytes) : null;
    if (!z) out.why.push("file " + JSON.stringify(f.name) + " is not a zip (an .xlsx is one); starts " + JSON.stringify(new TextDecoder().decode(bytes.subarray(0, 40))));
    else {
      const sheets = z.names.filter(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n));
      let text = "";
      for (const n of [...sheets, "xl/sharedStrings.xml"]) text += (await z.read(n)) || "";
      const ok = /\.xlsx$/i.test(f.name || "") && z.names.includes("[Content_Types].xml") && z.names.includes("xl/workbook.xml") && sheets.length > 0;
      out.xlsx = ok && ROWS.every(([d]) => text.includes(d)) && /(>|")30\.25(<|")/.test(text);
      if (!out.xlsx) out.why.push("file " + JSON.stringify(f.name) + " entries " + JSON.stringify(z.names.slice(0, 12)) + (ok ? " lacks the added rows" : ""));
    }
    const n0 = files.length;
    setInput(textIn, "Yak wool"); setInput(numIn, "1"); await sleep(300); addBtn()?.click(); await sleep(2500);
    out.clickOnly = files.length === n0;
    if (!out.clickOnly) out.why.push((files.length - n0) + " file(s) offered with no click, after adding a row");
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

// Inputs.date/text/number viewofs (writing-cells-in-module-source.md "viewof"), a mutable row list
// ("mutable", after @spond/revised-sars-cov-2-analytics-page `item`), and the JSZip import + zip.file /
// generateAsync from important-modules.md "Files" (@tomlarkworthy/local-change-history._exportFsToZip).
export const SOLUTION = `const _title = function title(md){return( md\`# Ledger\` )};
const _viewof_day = function viewof_day(Inputs){return( Inputs.date({label: "Date", value: new Date(2026, 8, 28)}) )};
const _day = (G, _) => G.input(_);
const _viewof_what = function viewof_what(Inputs){return( Inputs.text({label: "Description"}) )};
const _what = (G, _) => G.input(_);
const _viewof_amount = function viewof_amount(Inputs){return( Inputs.number({label: "Amount", step: 0.01}) )};
const _amount = (G, _) => G.input(_);
const _initial_rows = function initial_rows(){return( [] )};
const _mutable_rows = (M, _) => new M(_);
const _rows = _ => _.generator;
const _dayKey = function dayKey(){return( d => d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : "" )};
const _add = function add(htl, $day, $what, $amount, $rows, rows, dayKey){return(
  htl.html\`<button onclick=\${() => {
    const a = Number($amount.value);
    if (!$what.value || !Number.isFinite(a)) return;
    $rows.value = [...$rows.value, {date: dayKey($day.value), description: $what.value, amount: a}];
  }}>Add row</button>\`
)};
const _withTotals = function withTotals(rows){
  let t = 0;
  return rows.map(r => ({...r, total: Math.round((t += r.amount) * 100) / 100}));
};
const _table = function table(Inputs, withTotals){return( Inputs.table(withTotals, {columns: ["date", "description", "amount", "total"], header: {total: "Running total"}}) )};
const _grand = function grand(htl, withTotals){return( htl.html\`<p>Total: \${withTotals.length ? withTotals[withTotals.length - 1].total.toFixed(2) : "0.00"}</p>\` )};
const _xlsxBlob = function xlsxBlob(JSZip){return( async (header, rows) => {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const col = i => String.fromCharCode(65 + i);
  const cell = (v, ref) => typeof v === "number" ? '<c r="' + ref + '"><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"><is><t>' + esc(v) + '</t></is></c>';
  const data = [header, ...rows].map((r, i) => '<row r="' + (i + 1) + '">' + r.map((v, j) => cell(v, col(j) + (i + 1))).join("") + '</row>').join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file("xl/worksheets/sheet1.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + data + '</sheetData></worksheet>');
  return zip.generateAsync({type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
} )};
const _save = function save(htl, xlsxBlob, withTotals){return(
  htl.html\`<button onclick=\${async () => {
    const blob = await xlsxBlob(["Date", "Description", "Amount", "Running total"], withTotals.map(r => [r.date, r.description, r.amount, r.total]));
    const link = htl.html\`<a download="ledger.xlsx" href=\${URL.createObjectURL(blob)}>\`;
    link.click();
  }}>Download Excel (.xlsx)</button>\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_viewof_day", "viewof day", ["Inputs"], _viewof_day);
  $def("_day", "day", ["Generators", "viewof day"], _day);
  $def("_viewof_what", "viewof what", ["Inputs"], _viewof_what);
  $def("_what", "what", ["Generators", "viewof what"], _what);
  $def("_viewof_amount", "viewof amount", ["Inputs"], _viewof_amount);
  $def("_amount", "amount", ["Generators", "viewof amount"], _amount);
  $def("_initial_rows", "initial rows", [], _initial_rows);
  $def("_mutable_rows", "mutable rows", ["Mutable", "initial rows"], _mutable_rows);
  $def("_rows", "rows", ["mutable rows"], _rows);
  $def("_dayKey", "dayKey", [], _dayKey);
  $def("_add", "add", ["htl", "viewof day", "viewof what", "viewof amount", "mutable rows", "rows", "dayKey"], _add);
  $def("_withTotals", "withTotals", ["rows"], _withTotals);
  $def("_table", "table", ["Inputs", "withTotals"], _table);
  $def("_grand", "grand", ["htl", "withTotals"], _grand);
  $def("_xlsxBlob", "xlsxBlob", ["JSZip"], _xlsxBlob);
  $def("_save", "save", ["htl", "xlsxBlob", "withTotals"], _save);
  main.define("module @tomlarkworthy/jszip-3-10-1", async () => runtime.module((await import("/@tomlarkworthy/jszip-3-10-1.js?v=4")).default));
  main.define("JSZip", ["module @tomlarkworthy/jszip-3-10-1", "@variable"], (_, v) => v.import("JSZip", _));
  return main;
}
`;

export const criteria = [
  // the defect: fields rendered as "[object EventTarget]" text, nothing to type into
  { name: "collected_equals", args: { key: "fields", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "added", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "total", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "xlsx", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "clickOnly", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "offline", equals: true }, weight: 2 },
];

export default {
  id: "rc5t-expense-xlsx",
  category: "rc5-train",
  question: "Make an expense tracker (date, description, amount) with a running total and a button that exports it as an Excel spreadsheet.",
  setup: { init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/ledger.js", content: SOLUTION }, settleMs: 4000 },
  ],
};
