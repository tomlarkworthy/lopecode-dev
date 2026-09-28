// Page-side (setup.collect) for rc5t-kanban-drag-persist: act as the user on the board the agent built.
// 1. find the new module's element holding "To do", "Doing" and "Done" column headings and a text box
// 2. type PROBE, click Add (or Enter): PROBE must appear as a card in the To do column
// 3. drag the card to Done: HTML5 drag-and-drop (DragEvent with a shared DataTransfer), then, if the card
//    did not move, a pointer/mouse press-move-release at the Done column's centre
// 4. exportToHTML (the file a save writes), boot it in a sandboxed blob: iframe (opaque origin: no
//    localStorage/IndexedDB from this browser) and report which column PROBE is shown in
(async () => {
  const PROBE = "kanban probe 4K";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { probe: PROBE, newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const liveEls = () => [...rt._variables].filter(v => v._module && out.newModules.some(n => rt.mains.get(n) === v._module))
    .map(v => v._value).filter(x => x instanceof Element);
  // a board: an element whose text has all three headings and a text box
  const HEADS = { todo: /^\s*(to[\s-]?do)\b/i, doing: /^\s*doing\b/i, done: /^\s*done\b/i };
  const box = e => e.querySelector('input[type=text], input:not([type]), textarea');
  // keep every new cell observed so a board inside a non-rendered cell still computes
  const keepers = [];
  for (const v of [...rt._variables].filter(v => v._module && out.newModules.some(n => rt.mains.get(n) === v._module) && v._name && !String(v._name).startsWith("module "))) {
    try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {}
  }
  await sleep(1000);
  const findBoard = () => liveEls().find(e => box(e) && /to[\s-]?do/i.test(e.textContent) && /doing/i.test(e.textContent) && /done/i.test(e.textContent))
    || liveEls().find(e => /to[\s-]?do/i.test(e.textContent) && /doing/i.test(e.textContent) && /done/i.test(e.textContent));
  // heading element: smallest element whose own text starts with the column name (not an input/button/card)
  const heading = (root, re) => [...root.querySelectorAll("*")].filter(el => !el.closest("button, input, textarea, select, option") &&
    [...el.childNodes].some(n => n.nodeType === 3 && re.test(n.nodeValue)) || (el.children.length === 0 && re.test(el.textContent)))
    .find(el => !el.closest("[draggable=true]"));
  // column: climb from the heading while the ancestor does not contain another column's heading
  const column = (root, key) => {
    const h = heading(root, HEADS[key]);
    if (!h) return null;
    const others = Object.keys(HEADS).filter(k => k !== key).map(k => heading(root, HEADS[k])).filter(Boolean);
    let c = h;
    while (c.parentElement && c.parentElement !== root.parentElement && !others.some(o => c.parentElement.contains(o))) c = c.parentElement;
    return c;
  };
  const cardIn = (col) => {
    if (!col) return null;
    const w = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
    let t; while ((t = w.nextNode())) if (t.nodeValue.includes(PROBE)) break;
    if (!t) return null;
    let c = t.parentElement;
    const d = c.closest("[draggable=true]");
    if (d && col.contains(d)) return d;
    // climb to the largest ancestor inside the column that holds only this card's text
    while (c.parentElement && c.parentElement !== col && c.parentElement.textContent.trim() === c.textContent.trim()) c = c.parentElement;
    return c;
  };
  // innermost element holding PROBE's text: a press there bubbles through whatever element is the card
  const grip = col => {
    const w = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
    let t; while ((t = w.nextNode())) if (t.nodeValue.includes(PROBE)) return t.parentElement;
    return null;
  };
  const where = root => Object.keys(HEADS).filter(k => cardIn(column(root, k)));
  let board = findBoard();
  if (!board) return { ...out, stage: "no element in a new module shows To do / Doing / Done" };
  // a module not open in a pane has a detached element: mount it so it has layout (a pointer drag hit-tests)
  out.mounted = !board.isConnected;
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:0;top:0;width:1000px;background:white;z-index:2147483647";
  if (out.mounted) { stage.append(board); document.body.append(stage); }
  const inp = box(board);
  if (!inp) return { ...out, stage: "board has no text box to add a card" };
  inp.focus();
  inp.value = PROBE;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = [...board.querySelectorAll('button, input[type=submit], input[type=button]')].find(b => /add|\+|create|new/i.test(b.textContent + " " + (b.value || "") + " " + (b.title || "") + " " + (b.getAttribute("aria-label") || "")));
  if (btn) btn.click();
  else {
    for (const type of ["keydown", "keypress", "keyup"]) inp.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    inp.form?.requestSubmit?.();
  }
  await sleep(800);
  board = findBoard();
  out.addedIn = where(board);
  out.addedLive = out.addedIn.length > 0;
  if (!out.addedLive) { stage.remove(); return { ...out, stage: "adding PROBE did not show it in any column" }; }

  // drag the card to the Done column
  const dropTarget = col => { // deepest element in the column that contains its non-heading content, else the column
    const h = heading(col, HEADS.done);
    const kids = [...col.querySelectorAll("*")].filter(el => !(h && (h.contains(el) || el.contains(h))) && !el.closest("button, input, textarea, [draggable=true]"));
    return kids.length ? kids.reduce((a, b) => (a.contains(b) ? a : b.contains(a) ? b : a)) : col;
  };
  const dragHtml5 = (card, col) => {
    const dt = new DataTransfer();
    const fire = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    fire(card, "dragstart");
    for (const el of [col, dropTarget(col)]) { fire(el, "dragenter"); fire(el, "dragover"); }
    fire(dropTarget(col), "drop");
    fire(card, "dragend");
  };
  const dragPointer = (card, col) => {
    card.scrollIntoView?.({ block: "center" });
    const a = card.getBoundingClientRect(), b = col.getBoundingClientRect();
    const p0 = { clientX: a.x + a.width / 2, clientY: a.y + a.height / 2 }, p1 = { clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 };
    const opt = p => ({ bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, pointerId: 1, isPrimary: true, pointerType: "mouse", ...p });
    card.dispatchEvent(new PointerEvent("pointerdown", opt(p0)));
    card.dispatchEvent(new MouseEvent("mousedown", opt(p0)));
    for (let i = 1; i <= 5; i++) {
      const p = { clientX: p0.clientX + (p1.clientX - p0.clientX) * i / 5, clientY: p0.clientY + (p1.clientY - p0.clientY) * i / 5 };
      const t = document.elementFromPoint(p.clientX, p.clientY) || col;
      for (const el of [t, document]) { el.dispatchEvent(new PointerEvent("pointermove", opt(p))); el.dispatchEvent(new MouseEvent("mousemove", opt(p))); }
    }
    const t = document.elementFromPoint(p1.clientX, p1.clientY) || col;
    for (const el of [...new Set([t, dropTarget(col)])].filter(x => col.contains(x)).concat([document])) { el.dispatchEvent(new PointerEvent("pointerup", opt({ ...p1, buttons: 0 }))); el.dispatchEvent(new MouseEvent("mouseup", opt({ ...p1, buttons: 0 }))); }
  };
  const from = out.addedIn[0];
  const target = from === "done" ? "doing" : "done";
  out.dragTarget = target;
  dragHtml5(cardIn(column(board, from)), column(board, target));
  await sleep(800);
  board = findBoard();
  out.afterDrag = where(board);
  if (!out.afterDrag.includes(target)) {
    out.dragVia = "pointer";
    dragPointer(grip(column(board, from)), column(board, target));
    await sleep(800);
    board = findBoard();
    out.afterDrag = where(board);
  } else out.dragVia = "html5";
  out.movedLive = out.afterDrag.length === 1 && out.afterDrag[0] === target;
  if (!out.movedLive) { stage.remove(); return { ...out, stage: "dragging the card to " + target + " did not move it" }; }

  stage.remove();
  for (const k of keepers) try { k.delete(); } catch {}
  await sleep(300);
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  out.exportedBytes = html.length;
  out.addedBlocks = [...html.matchAll(/<script[^>]*\bid="(@[^"\/]+\/[^"\/]+)"/g)].map(m => m[1]).filter(id => !document.getElementById(id));
  const reporter = `<script>(${async function (PROBE, base, HEADSRC) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const HEADS = Object.fromEntries(Object.entries(HEADSRC).map(([k, s]) => [k, new RegExp(s, "i")]));
    const heading = (root, re) => [...root.querySelectorAll("*")].filter(el => !el.closest("button, input, textarea, select, option") &&
      [...el.childNodes].some(n => n.nodeType === 3 && re.test(n.nodeValue)) || (el.children.length === 0 && re.test(el.textContent)))
      .find(el => !el.closest("[draggable=true]"));
    const column = (root, key) => {
      const h = heading(root, HEADS[key]);
      if (!h) return null;
      const others = Object.keys(HEADS).filter(k => k !== key).map(k => heading(root, HEADS[k])).filter(Boolean);
      let c = h;
      while (c.parentElement && c.parentElement !== root.parentElement && !others.some(o => c.parentElement.contains(o))) c = c.parentElement;
      return c;
    };
    const t0 = Date.now();
    let res = { found: false, columns: [] };
    while (Date.now() - t0 < 20000) {
      await sleep(1000);
      const rt = globalThis.__ojs_runtime;
      if (!rt || !rt.mains || !rt.mains.size) continue;
      const mods = [...rt.mains].filter(([n]) => !base.includes(n));
      for (const [n, m] of mods) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
        let x; try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch (e) { x = undefined; }
        if (!(x instanceof Element) || !x.textContent.includes(PROBE)) continue;
        res = { ...res, found: true, module: n, cell: v._name, columns: Object.keys(HEADS).filter(k => column(x, k)?.textContent.includes(PROBE)) };
        break;
      }
      res.seen = mods.map(([n, m]) => n + ":" + [...rt._variables].filter(v => v._module === m && v._name).length);
      if (res.found || (res.seen.length && Date.now() - t0 > 12000)) break;
    }
    parent.postMessage({ __kanbanProbe: res }, "*");
  }})(${JSON.stringify(PROBE)}, ${JSON.stringify([...base])}, ${JSON.stringify(Object.fromEntries(Object.entries(HEADS).map(([k, re]) => [k, re.source])))})<\/script>`;
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__kanbanProbe) res(e.data.__kanbanProbe); });
    setTimeout(() => res({ found: false, timeout: true }), 24000);
  });
  frame.src = url;
  document.body.appendChild(frame);
  out.reopened = await got;
  out.reopenedShown = !!out.reopened.found;
  out.reopenedInTarget = out.reopened.columns?.length === 1 && out.reopened.columns[0] === target;
  frame.remove();
  out.stage = "done";
  return out;
})()
