// Page-side (setup.collect): act as the user on the module the agent built, then save + reopen the file.
// 1. find a new module's element with a text box, type PROBE, click Add (or Enter), tick PROBE's checkbox
// 2. exportToHTML (the file a save writes), boot it in a sandboxed blob: iframe (opaque origin: no
//    localStorage/IndexedDB from this browser, like opening the file on another machine)
// 3. report whether PROBE is SHOWN (in a cell element) after reopening, whether its row is still ticked,
//    and (inData) whether it is only in a data cell: the source kept it but the view does not display it
(async () => {
  const PROBE = "persist probe 7Q";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { probe: PROBE, newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const vars = [...rt._variables].filter(v => v._module && out.newModules.some(n => rt.mains.get(n) === v._module));
  const els = vars.map(v => v._value).filter(x => x instanceof Element);
  const box = e => e.querySelector('input[type=text], input:not([type]), textarea');
  const host = els.find(e => box(e));
  if (!host) return { ...out, stage: "no text input in a new module's cells" };
  const inp = box(host);
  inp.focus();
  inp.value = PROBE;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = [...host.querySelectorAll('button, input[type=submit], input[type=button]')].find(b => /add|\+|save|create|new/i.test(b.textContent + " " + (b.value || "") + " " + (b.title || "") + " " + (b.getAttribute("aria-label") || "")));
  if (btn) btn.click();
  else {
    for (const type of ["keydown", "keypress", "keyup"]) inp.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    inp.form?.requestSubmit?.();
  }
  await sleep(800);
  // the view may have re-rendered: search every new-module element again
  const liveEls = () => [...rt._variables].filter(v => v._module && out.newModules.some(n => rt.mains.get(n) === v._module)).map(v => v._value).filter(x => x instanceof Element);
  const rowOf = e => { // smallest ancestor of PROBE's text holding exactly one checkbox
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) if (n.nodeValue.includes(PROBE)) break;
    let r = n?.parentElement ?? [...e.querySelectorAll("input")].find(i => i.value === PROBE && i !== box(e))?.parentElement;
    while (r && r !== e.parentElement && r.querySelectorAll('input[type=checkbox]').length !== 1) r = r.parentElement;
    return r && r !== e.parentElement ? r : null;
  };
  const addedIn = liveEls().find(e => rowOf(e));
  out.addedLive = !!addedIn;
  if (!addedIn) return { ...out, stage: "adding PROBE through the UI did not show a row with a checkbox" };
  const cb = rowOf(addedIn).querySelector('input[type=checkbox]');
  if (!cb.checked) cb.click();
  await sleep(800);
  out.tickedLive = !!rowOf(liveEls().find(e => rowOf(e)) || addedIn)?.querySelector('input[type=checkbox]')?.checked;

  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  out.exportedBytes = html.length;
  // modules in the saved file that the boot did not have (an import fetched from observablehq.com must be embedded to work offline)
  out.addedBlocks = [...html.matchAll(/<script[^>]*\bid="(@[^"\/]+\/[^"\/]+)"/g)].map(m => m[1]).filter(id => !document.getElementById(id));
  // reporter: boots with the file, forces each non-base module's cells, looks for PROBE
  const reporter = `<script>(${async function (PROBE, base) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = Date.now();
    let res = { found: false };
    while (Date.now() - t0 < 20000) {
      await sleep(1000);
      const rt = globalThis.__ojs_runtime;
      if (!rt || !rt.mains || !rt.mains.size) continue;
      const mods = [...rt.mains].filter(([n]) => !base.includes(n));
      for (const [n, m] of mods) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
        let x; try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch (e) { x = undefined; }
        if (x instanceof Element) {
          if (!x.textContent.includes(PROBE) && ![...x.querySelectorAll("input")].some(i => i.value === PROBE)) continue;
          const w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) if (t.nodeValue.includes(PROBE)) break;
          let row = t?.parentElement; while (row && row !== x.parentElement && row.querySelectorAll('input[type=checkbox]').length !== 1) row = row.parentElement;
          res = { ...res, found: true, module: n, cell: v._name, ticked: !!(row && row !== x.parentElement && row.querySelector('input[type=checkbox]').checked) };
        } else {
          let s; try { s = JSON.stringify(x); } catch { s = ""; }
          if (!s || !s.includes(PROBE)) continue;
          res.inData = res.inData || v._name + ': ' + s.slice(0, 200);
        }
        if (res.ticked) break;
      }
      res.seen = mods.map(([n, m]) => n + ":" + [...rt._variables].filter(v => v._module === m && v._name).length);
      if (res.found || (res.seen.length && Date.now() - t0 > 12000)) break;
    }
    // network fetches the reopened file made (a module it had to fetch is missing from the file: offline it fails)
    res.net = performance.getEntriesByType("resource").map(e => e.name).filter(u => /^https?:/.test(u)).slice(0, 20);
    parent.postMessage({ __persistProbe: res }, "*");
  }})(${JSON.stringify(PROBE)}, ${JSON.stringify([...base])})<\/script>`;
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__persistProbe) res(e.data.__persistProbe); });
    setTimeout(() => res({ found: false, timeout: true }), 24000);
  });
  frame.src = url;
  document.body.appendChild(frame);
  out.reopened = await got;
  out.reopenedShown = !!out.reopened.found;
  out.reopenedTicked = !!out.reopened.ticked;
  frame.remove();
  out.stage = "done";
  return out;
})()
