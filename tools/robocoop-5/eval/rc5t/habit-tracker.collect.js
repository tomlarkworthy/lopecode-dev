// Page-side (setup.collect) for rc5t-habit-tracker: act as the user on the tracker the agent built.
// The page clock is pinned by setup.initScript to Mon 2026-09-28 00:20 Europe/Berlin (Sun 22:20 UTC), so
// a date taken from toISOString() is a day behind the user's calendar. Each part has its own key:
//   added       two habits typed into a text box and added (Add button or Enter) are shown
//   downloaded  the Download/CSV/Export control hands the browser a file (anchor/blob intercepted) naming both habits
//   window      the CSV's dates are exactly the user's last 14 local days, 2026-09-15 .. 2026-09-28
//   toggled     clicks in habit A's row (the grid's last day, the day before, 3 days before; one extra cell
//               clicked on then off) leave exactly those three days marked for A in the CSV, nothing for B.
//               Relative to the grid's own days, so a wrong window is scored only by `window`
//   streak      the number shown next to habit A is 2 (today + yesterday; 3 days ago is after a gap)
//   marksKept   adding a third habit afterwards does not clear A's marks
//   reopened    exportToHTML booted in a sandboxed blob: iframe (opaque origin: no localStorage/IndexedDB)
//               shows both habits and A's streak of 2 (the same clock is injected into the export)
(async () => {
  const A = "Floss 7Q", B = "Stretch 7Q", C = "Water 7Q";
  const TODAY = "2026-09-28";
  const DAYS = Array.from({ length: 14 }, (_, i) => "2026-09-" + String(15 + i).padStart(2, "0"));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const deadline = Date.now() + 28500; // driver-core bounds setup.collect at 30s
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const res = v => { out.stage = v; return out; };
  if (!out.newModules.length) return res("no module was created");
  const mine = v => v._module && out.newModules.some(n => rt.mains.get(n) === v._module);
  const keepers = [];
  for (const v of [...rt._variables].filter(v => mine(v) && v._name && !String(v._name).startsWith("module "))) {
    try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {}
  }
  // --- download capture: blobs by URL, anchors clicked (prototype or event), window.open
  const blobs = new Map(), grabbed = [];
  const oCreate = URL.createObjectURL, oRevoke = URL.revokeObjectURL, oClick = HTMLAnchorElement.prototype.click,
    oDispatch = HTMLAnchorElement.prototype.dispatchEvent, oOpen = window.open;
  const isFile = a => a.hasAttribute("download") || /^(blob|data):/.test(a.getAttribute("href") || "");
  const grab = href => { if (href && /^(blob|data):/.test(href)) grabbed.push(href); };
  URL.createObjectURL = function (b) { const u = oCreate.call(URL, b); blobs.set(u, b); return u; };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () { if (isFile(this)) { grab(this.href); if (/^(blob|data):/.test(this.href)) return; } return oClick.call(this); };
  HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (e.type === "click" && isFile(this) && /^(blob|data):/.test(this.href)) { grab(this.href); return false; } return oDispatch.call(this, e); };
  window.open = function (u) { if (/^(blob|data):/.test(String(u))) { grab(String(u)); return null; } return oOpen.apply(this, arguments); };
  const onDocClick = e => { const a = e.composedPath().find(x => x instanceof HTMLAnchorElement); if (a && /^(blob|data):/.test(a.href)) { e.preventDefault(); grab(a.href); } };
  document.addEventListener("click", onDocClick, true);
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:0;top:0;width:1200px;max-height:100vh;overflow:auto;background:white;z-index:2147483647";
  document.body.append(stage);
  try {
    await sleep(600);
    const roots = () => {
      const els = [...rt._variables].filter(mine).map(v => v._value).filter(x => x instanceof Element);
      for (const e of els) if (!e.isConnected) stage.append(e);
      for (const c of [...stage.children]) if (!els.includes(c)) c.remove();
      return els.filter(e => !els.some(o => o !== e && o.contains(e)));
    };
    const qa = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]);
    const label = el => [el.textContent, el.value, el.title, el.placeholder, el.getAttribute("aria-label"), el.closest("label, form")?.textContent].filter(Boolean).join(" ");
    const allText = () => roots().map(r => r.textContent).join(" | ");
    const clickables = () => qa("button, input[type=button], input[type=submit], a");
    const textBox = () => qa("input").find(i => (!i.type || i.type === "text") && !/search|filter|find/i.test(label(i)));
    const addHabit = async name => {
      const box = textBox();
      if (!box) return false;
      box.focus();
      box.value = name;
      box.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      await sleep(150);
      const btn = qa("button, input[type=button], input[type=submit]").find(b => /add|\+|create|new/i.test([b.textContent, b.value, b.title, b.getAttribute("aria-label")].join(" ")));
      if (btn) btn.click();
      else {
        for (const type of ["keydown", "keypress", "keyup"]) box.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        box.form?.requestSubmit?.();
      }
      await sleep(500);
      return allText().includes(name);
    };
    // --- CSV
    const parseCsv = text => text.replace(/\r/g, "").split("\n").filter(l => l.trim()).map(line => {
      const cells = []; let cur = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
        else if (ch === '"') q = true; else if (ch === "," || ch === ";" || ch === "\t") { cells.push(cur.trim()); cur = ""; } else cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    });
    const toDate = s => {
      let m = /(20\d\d)-(\d\d)-(\d\d)/.exec(s);
      if (m) return m[1] + "-" + m[2] + "-" + m[3];
      m = /\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/.exec(s);
      if (m) { const [a, b] = [+m[1], +m[2]]; const mo = a === 9 ? a : b, d = a === 9 ? b : a; return m[3] + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
      return null;
    };
    const truthy = s => /^(1|true|x|✓|✔|☑|yes|y|done|✅)$/i.test(String(s).trim());
    const marksOf = (rows, name) => {
      const hdr = rows.findIndex(r => r.filter(toDate).length >= 7);
      if (hdr >= 0) { // wide: dates across, one row per habit
        const row = rows.find(r => r.some(c => c === name || c.includes(name)));
        if (!row) return null;
        return rows[hdr].map((c, j) => toDate(c) && truthy(row[j]) ? toDate(c) : null).filter(Boolean);
      }
      const h = rows.findIndex(r => r.some(c => c === name || c.includes(name)) && !r.some(toDate));
      if (h >= 0) { // transposed: habits across, one row per date
        const j = rows[h].findIndex(c => c === name || c.includes(name));
        return rows.filter(r => r.some(toDate)).filter(r => truthy(r[j])).map(r => toDate(r.find(toDate)));
      }
      // long: one row per (date, habit)
      return rows.filter(r => r.some(toDate) && r.some(c => c === name || c.includes(name)) && (r.some(truthy) || r.length <= 2)).map(r => toDate(r.find(toDate)));
    };
    const download = async () => {
      const b = clickables().find(x => /csv|download|export/i.test([x.textContent, x.value, x.title, x.getAttribute("aria-label"), x.getAttribute("download")].join(" ")));
      if (!b) return { error: "no Download/CSV/Export control" };
      const n0 = grabbed.length;
      b.click();
      for (let i = 0; i < 20 && grabbed.length === n0; i++) await sleep(100);
      if (grabbed.length === n0) return { error: "clicking the control handed the browser no file" };
      const href = grabbed[grabbed.length - 1];
      let text;
      try { text = blobs.has(href) ? await blobs.get(href).text() : await (await fetch(href)).text(); } catch (e) { return { error: "file unreadable: " + e.message }; }
      const rows = parseCsv(text);
      const dates = [...new Set(rows.flat().map(toDate).filter(Boolean))].sort();
      return { text, rows, dates };
    };
    // --- the row of clickable day cells for a habit
    const cellish = el => el.matches("td, button, input[type=checkbox], [role=gridcell], [role=checkbox], [role=button]") || el.onclick || getComputedStyle(el).cursor === "pointer";
    const nameNodes = name => roots().flatMap(r => {
      const hits = [], w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) if (n.nodeValue.includes(name) && !n.parentElement.closest("input, textarea, select, option")) hits.push(n.parentElement);
      return hits;
    });
    const others = name => [A, B, C].filter(x => x !== name);
    const dayCells = name => {
      for (const start of nameNodes(name)) {
        let anc = start;
        while (anc.parentElement && !others(name).some(o => anc.parentElement.textContent.includes(o))) {
          anc = anc.parentElement;
          let cands = [...anc.querySelectorAll("*")].filter(el => cellish(el) && !el.textContent.includes(name) && !/delete|remove|×|✕|🗑/i.test(label(el)));
          cands = cands.filter(el => !cands.some(o => o !== el && el.contains(o)));
          if (cands.length > 14) { const nonNum = cands.filter(el => !/^\s*\d+\s*(d|days?)?\s*🔥?\s*$/.test(el.textContent)); if (nonNum.length >= 14) cands = nonNum; }
          if (cands.length >= 14) return cands.slice(0, 14);
        }
      }
      return null;
    };
    const nearNums = name => nameNodes(name).map(start => {
      let anc = start;
      for (;;) {
        const t = anc.textContent.split(name).join(" ").replace(/20\d\d-\d\d-\d\d|\d{1,2}\/\d{1,2}(\/20\d\d)?|\d{1,2}-\d{2}/g, " ");
        const nums = (t.match(/\b\d+\b/g) || []).map(Number).filter(n => n <= 14);
        if (nums.length) return nums;
        if (!anc.parentElement || others(name).some(o => anc.parentElement.textContent.includes(o))) return [];
        anc = anc.parentElement;
      }
    });
    // DOM view of the marks, for when no CSV can be read: a cell differs from the unmarked majority
    const sig = el => { const cs = getComputedStyle(el); return [el.textContent.trim(), el.className, el.checked, el.getAttribute("aria-checked"), el.getAttribute("aria-pressed"), cs.backgroundColor, cs.color].join("|"); };
    let blankSig = null;
    const domMarks = name => { const c = dayCells(name); return c ? c.map((el, i) => sig(el) !== blankSig ? i : -1).filter(i => i >= 0) : null; };
    const clickCell = async (name, idx) => { const cells = dayCells(name); if (!cells) return false; cells[idx].click(); await sleep(350); return true; };

    out.added = (await addHabit(A)) && (await addHabit(B));
    if (!out.added) return res("adding two habits did not show both names");
    let csv = await download();
    out.downloaded = !csv.error && csv.text.includes(A) && csv.text.includes(B);
    out.csvDates = csv.dates;
    out.window = !csv.error && csv.dates.length === 14 && csv.dates.every((d, i) => d === DAYS[i]);
    if (csv.error) out.csvError = csv.error;
    const cells = dayCells(A);
    out.cells = cells ? cells.length : 0;
    if (!cells) return res("no row of 14 clickable cells next to " + A);
    // which end of the row is today: click the last cell and see which date the CSV marks
    { const c0 = dayCells(A).map(sig), n = {}; for (const x of c0) n[x] = (n[x] || 0) + 1; blankSig = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; }
    await clickCell(A, 13);
    csv = await download();
    const first = csv.error ? null : marksOf(csv.rows, A);
    out.lastCellMarks = first;
    // order and "today" come from the grid itself, so toggling is scored apart from the window
    const gridDays = csv.error ? DAYS : csv.dates;
    const gTop = gridDays[gridDays.length - 1], gBot = gridDays[0];
    let idxOf;
    if (first && first.length === 1 && first[0] === gTop) idxOf = k => 13 - k; // k days ago
    else if (first && first.length === 1 && first[0] === gBot) idxOf = k => k;
    else if (!first) idxOf = k => 13 - k; // marks not readable from a CSV: assume left-to-right
    if (!idxOf) return res("clicking the last cell of " + A + "'s row did not mark one end of the window: " + JSON.stringify(first));
    const ago = k => gridDays[gridDays.length - 1 - k];
    await clickCell(A, idxOf(1));
    await clickCell(A, idxOf(4)); // on
    await clickCell(A, idxOf(4)); // and off again
    await clickCell(A, idxOf(3));
    csv = await download();
    const marks = csv.error ? null : (marksOf(csv.rows, A) || []).sort();
    const marksB = csv.error ? null : (marksOf(csv.rows, B) || []);
    out.marksA = marks; out.marksB = marksB;
    out.domMarksA = domMarks(A); out.domMarksB = domMarks(B);
    const domOk = JSON.stringify(out.domMarksA) === JSON.stringify([idxOf(0), idxOf(1), idxOf(3)].sort((a, b) => a - b)) && out.domMarksB?.length === 0;
    out.toggled = marks ? JSON.stringify(marks) === JSON.stringify([ago(3), ago(1), ago(0)]) && marksB.length === 0 : domOk;
    out.streakNums = nearNums(A);
    out.streak = out.streakNums.some(ns => ns.includes(2) && !ns.includes(1) && !ns.includes(3));
    out.addedThird = await addHabit(C);
    csv = await download();
    const kept = csv.error ? null : (marksOf(csv.rows, A) || []).sort();
    out.domMarksAfterAdd = domMarks(A);
    out.marksAfterAdd = kept;
    out.marksKept = out.addedThird && (kept ? JSON.stringify(kept) === JSON.stringify(marks) && kept.length === 3
      : JSON.stringify(out.domMarksAfterAdd) === JSON.stringify(out.domMarksA) && out.domMarksA?.length === 3);
    // --- persist: export and reopen
    for (const k of keepers.splice(0)) try { k.delete(); } catch {}
    stage.remove();
    await sleep(300);
    const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    if (deadline - Date.now() < 5000) { out.reopened = false; out.reopenedWith = { skipped: "under 5s left of the 30s collect bound" }; return res("done"); }
    const budget = deadline - Date.now() - 1500;
    const reporter = `<script>(${async function (A, B, C, base, budget, nearNumsSrc) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = Date.now();
      let got = { a: false, b: false };
      while (Date.now() - t0 < budget) {
        await sleep(700);
        const rt = globalThis.__ojs_runtime;
        if (!rt || !rt.mains || !rt.mains.size) continue;
        const mods = [...rt.mains].filter(([n]) => !base.includes(n)).map(([, m]) => m);
        const els = [];
        for (const v of [...rt._variables].filter(v => mods.includes(v._module) && v._name && !String(v._name).startsWith("module "))) {
          let x; try { x = await Promise.race([v._module.value(v._name), sleep(1500).then(() => undefined)]); } catch { x = undefined; }
          if (x instanceof Element) els.push(x);
        }
        const roots = () => els.filter(e => !els.some(o => o !== e && o.contains(e)));
        const others = name => [A, B, C].filter(x => x !== name);
        const nameNodes = name => roots().flatMap(r => {
          const hits = [], w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
          let n; while ((n = w.nextNode())) if (n.nodeValue.includes(name) && !n.parentElement.closest("input, textarea, select, option")) hits.push(n.parentElement);
          return hits;
        });
        const nearNums = eval("(" + nearNumsSrc + ")");
        const all = roots().map(e => e.textContent).join(" | ");
        const nums = nearNums(A);
        got = { a: all.includes(A), b: all.includes(B), nums, streak: nums.some(ns => ns.includes(2) && !ns.includes(1) && !ns.includes(3)), cells: els.length };
        parent.postMessage({ __habitProbe: got, partial: true }, "*");
        if (got.a && got.b && got.streak) break;
      }
      parent.postMessage({ __habitProbe: got }, "*");
    }})(${JSON.stringify(A)}, ${JSON.stringify(B)}, ${JSON.stringify(C)}, ${JSON.stringify([...base])}, ${budget}, ${JSON.stringify(nearNums.toString())})<\/script>`;
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    if (globalThis.__habitInit) html = html.replace(/<head[^>]*>/i, m => m + "<script>" + globalThis.__habitInit + "<\/script>");
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    let last = { timeout: true };
    const got = new Promise(res => {
      addEventListener("message", e => { if (e.data && e.data.__habitProbe) { last = { ...e.data.__habitProbe, timeout: !!e.data.partial }; if (!e.data.partial) res(last); } });
      setTimeout(() => res(last), budget + 800);
    });
    frame.src = oCreate.call(URL, new Blob([html], { type: "text/html" }));
    document.body.appendChild(frame);
    out.reopenedWith = await got;
    frame.remove();
    out.reopened = !!(out.reopenedWith.a && out.reopenedWith.b && out.reopenedWith.streak);
    out.msLeft = deadline - Date.now();
    return res("done");
  } finally {
    for (const k of keepers) try { k.delete(); } catch {}
    stage.remove();
    URL.createObjectURL = oCreate; URL.revokeObjectURL = oRevoke; HTMLAnchorElement.prototype.click = oClick;
    HTMLAnchorElement.prototype.dispatchEvent = oDispatch; window.open = oOpen;
    document.removeEventListener("click", onDocClick, true);
  }
})()
