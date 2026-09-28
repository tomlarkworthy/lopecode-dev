// Page-side (setup.collect) for rc5t-notes-app: act as the user on the notes app the agent built.
// Every part is scored on its own key, so one broken feature does not hide the others:
//   created    clicking New adds a note (the textarea is empty / the list grows)
//   focusKept  typing a note one character at a time: after every character the same <textarea> is still
//              in the page, still focused, the caret is where the typing left it, and the text is intact
//   preview    the preview under the textarea shows the typed markdown as elements (h2, strong, li)
//   selected   with two notes, clicking the first one in the list loads its text into the textarea
//   searched   typing into the search box hides the note that does not match and keeps the one that does
//   deleted    Delete removes the selected note from the list
//   reopened   after exportToHTML + boot of the export in a sandboxed blob: iframe (opaque origin, so this
//              browser's localStorage/IndexedDB are invisible), the kept note's text is shown
(async () => {
  const A = "Alpha 7Q", B = "Bravo 7Q", C = "Charlie 7Q";
  const bodyOf = t => t + "\n\n## Sub " + t.split(" ")[0] + "\n\n**bold** and *it*\n\n- one\n- two";
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
  await sleep(600);
  // cells not open in a pane hold detached elements: mount them on a stage so they have layout and focus
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:0;top:0;width:1100px;max-height:100vh;overflow:auto;background:white;z-index:2147483647";
  document.body.append(stage);
  const roots = () => {
    const els = [...rt._variables].filter(mine).map(v => v._value).filter(x => x instanceof Element);
    for (const e of els) if (!e.isConnected) stage.append(e);
    for (const c of [...stage.children]) if (!els.includes(c)) c.remove();
    return els.filter(e => !els.some(o => o !== e && o.contains(e)));
  };
  const qa = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]);
  const deepActive = () => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; };
  const label = el => [el.textContent, el.value, el.title, el.placeholder, el.getAttribute("aria-label")].filter(Boolean).join(" ");
  const buttons = () => qa("button, input[type=button], input[type=submit]");
  const btn = re => buttons().find(b => re.test(label(b)));
  const ta = () => qa("textarea")[0];
  const search = () => qa("input").find(i => i.type === "search" || /search|filter|find/i.test(label(i)));
  const titleBox = () => qa("input").find(i => (!i.type || i.type === "text") && i !== search() && !/search|filter|find/i.test(label(i)));
  const fire = el => el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  const put = (el, v) => { el.value = v; fire(el); el.dispatchEvent(new Event("change", { bubbles: true })); };
  // the element showing a note's name in the list: text containing t, outside the textarea, the preview
  // (anything holding markdown elements) and form controls; prefer an item-like ancestor
  const preview = () => qa("h1, h2, h3, strong, em, li").map(e => e.closest("div, section, article, output") || e);
  const listItem = t => {
    const hits = [];
    for (const r of roots()) {
      const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        if (!n.nodeValue.includes(t) || /bold|## /.test(n.nodeValue)) continue;
        const p = n.parentElement;
        if (p.closest("textarea, input, h1, h2, h3, h4, h5, h6, strong, em")) continue;
        if (p.closest("p") && p.closest("p").parentElement.querySelector("h2, strong, ul li")) continue;
        hits.push(p.closest("li, [role=option], button, a, tr") || p);
      }
    }
    return hits[0] || null;
  };
  const inList = t => !!listItem(t);
  try {
    if (!ta()) return res("no <textarea> in any cell of a new module");
    // --- new
    const newBtn = btn(/new|add|\+/i);
    if (!newBtn) return res("no New button (buttons: " + JSON.stringify(buttons().map(b => label(b).trim().slice(0, 30))) + ")");
    const typeNote = async (text, check) => {
      if (!check) {
        ta().focus();
        put(ta(), text);
        await sleep(400);
        const tb = titleBox();
        if (tb && !tb.value.includes(text.split("\n")[0])) { put(tb, text.split("\n")[0]); await sleep(300); }
        return null;
      }
      let el = ta();
      el.focus();
      el.value = "";
      fire(el);
      await sleep(300);
      el = ta();
      el.focus();
      let pos = 0, fail = null;
      for (const ch of text) {
        const cur = ta();
        if (check && !fail) {
          if (cur !== el) fail = "textarea was replaced by a new element after " + pos + " chars";
          else if (!el.isConnected) fail = "textarea detached after " + pos + " chars";
          else if (deepActive() !== el) fail = "textarea lost focus after " + pos + " chars (active: " + (deepActive()?.tagName || null) + ")";
          else if (el.selectionStart !== pos) fail = "caret moved to " + el.selectionStart + " after " + pos + " chars";
          else if (el.value !== text.slice(0, pos)) fail = "text changed under the caret after " + pos + " chars: " + JSON.stringify(el.value.slice(0, 40));
        }
        if (cur !== el || deepActive() !== cur) { el = cur; el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        el.setRangeText(ch, el.selectionStart, el.selectionEnd, "end");
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch }));
        pos++;
        await sleep(ch === "\n" || pos % 8 === 0 ? 80 : 20);
      }
      await sleep(400);
      if (ta().value !== text) put(ta(), text);
      const tb = titleBox();
      if (tb && !tb.value.includes(text.split("\n")[0])) put(tb, text.split("\n")[0]);
      await sleep(400);
      return fail;
    };
    const countBefore = qa("li, [role=option]").length;
    newBtn.click();
    await sleep(500);
    out.created = !!ta() && (ta().value === "" || qa("li, [role=option]").length > countBefore);
    const fail = await typeNote(bodyOf(A), true);
    out.focusFailure = fail;
    out.focusKept = !fail;
    // --- preview
    const md = t => {
      const sub = "Sub " + t.split(" ")[0];
      return qa("h2, h3, h1").some(h => h.textContent.includes(sub)) && qa("strong, b").some(s => s.textContent.trim() === "bold") &&
        qa("li").some(l => l.textContent.trim() === "one");
    };
    out.preview = md(A);
    if (!out.preview) out.previewText = qa("*").map(e => e.textContent).find(s => s.includes("**bold**"))?.slice(0, 80) || null;
    // --- second note, then select the first
    (btn(/new|add|\+/i) || newBtn).click();
    await sleep(500);
    await typeNote(bodyOf(B), false);
    out.listed = [inList(A), inList(B)];
    const itemA = listItem(A);
    if (!itemA) return res("note " + A + " is not shown in the list");
    itemA.click();
    await sleep(500);
    out.selected = ta()?.value.includes(A) === true && !ta().value.includes(B);
    // --- search
    const sb = search();
    if (sb) {
      put(sb, "Bravo");
      await sleep(500);
      out.searched = inList(B) && !inList(A);
      put(sb, "");
      await sleep(500);
    } else out.searched = false;
    // --- delete: a third note, select it, delete it
    (btn(/new|add|\+/i) || newBtn).click();
    await sleep(500);
    await typeNote(bodyOf(C), false);
    const itemC = listItem(C);
    if (itemC) { itemC.click(); await sleep(500); }
    const del = btn(/delete|remove|🗑|✕|×/i);
    const orig = window.confirm; window.confirm = () => true;
    if (del) del.click();
    await sleep(500);
    window.confirm = orig;
    out.deleted = !!del && !inList(C) && inList(A) && inList(B);
    // --- persist: export and reopen
    for (const k of keepers.splice(0)) try { k.delete(); } catch {}
    stage.remove();
    await sleep(300);
    const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    if (deadline - Date.now() < 5000) { out.reopened = false; out.reopenedWith = { skipped: "under 5s left of the 30s collect bound" }; return res("done"); }
    const budget = deadline - Date.now() - 1500;
    const reporter = `<script>(${async function (A, B, base, budget) {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = Date.now();
      let got = { a: false, b: false };
      while (Date.now() - t0 < budget) {
        await sleep(700);
        const rt = globalThis.__ojs_runtime;
        if (!rt || !rt.mains || !rt.mains.size) continue;
        const mods = [...rt.mains].filter(([n]) => !base.includes(n)).map(([, m]) => m);
        const texts = [];
        for (const v of [...rt._variables].filter(v => mods.includes(v._module) && v._name && !String(v._name).startsWith("module "))) {
          let x; try { x = await Promise.race([v._module.value(v._name), sleep(1500).then(() => undefined)]); } catch { x = undefined; }
          if (x instanceof Element) texts.push(x.textContent + " " + [...x.querySelectorAll("textarea, input")].map(i => i.value).join(" "));
        }
        const all = texts.join(" | ");
        got = { a: all.includes(A), b: all.includes(B), cells: texts.length };
        parent.postMessage({ __notesProbe: got, partial: true }, "*");
        if (got.a && got.b) break;
      }
      parent.postMessage({ __notesProbe: got }, "*");
    }})(${JSON.stringify(A)}, ${JSON.stringify(B)}, ${JSON.stringify([...base])}, ${budget})<\/script>`;
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    let last = { timeout: true };
    const got = new Promise(res => {
      addEventListener("message", e => { if (e.data && e.data.__notesProbe) { last = { ...e.data.__notesProbe, timeout: !!e.data.partial }; if (!e.data.partial) res(last); } });
      setTimeout(() => res(last), budget + 800);
    });
    frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    document.body.appendChild(frame);
    out.reopenedWith = await got;
    frame.remove();
    out.reopened = !!(out.reopenedWith.a && out.reopenedWith.b);
    out.msLeft = deadline - Date.now();
    return res("done");
  } finally {
    for (const k of keepers) try { k.delete(); } catch {}
    stage.remove();
  }
})()
