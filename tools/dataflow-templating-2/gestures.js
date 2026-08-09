// Five editor-5 gestures, run identically against the v1 canonical and the v2 baked copy so the
// two reports can be diffed. Returns data only — no assertions — because the question is whether
// v2 differs from v1, not whether either matches some idea of correct.
(async () => {
  const rt = window.__ojs_runtime;
  const ed = [...rt._variables].find((v) => v._name === "cellEditor" && v._definition)._module;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anon = () =>
    [...rt._variables].filter(
      (v) => v._module === ed && v._name === null && String(v._definition).includes("_anonymous")
    );
  const openBodies = () =>
    [...document.querySelectorAll(".cell-editor-body")].filter((b) => b.style.display !== "none");
  const btn = (root, text) =>
    [...root.querySelectorAll("span,button")].find((b) => b.textContent.trim() === text);

  const report = { start: { hotbars: document.querySelectorAll(".hotbar").length,
                            primary: rt._variables.size, scope: ed._scope.size } };

  // 1. add-cell
  const adds = [...document.querySelectorAll(".add-cell-btn")];
  const anon0 = anon().length;
  adds[adds.length - 1].click();
  await wait(2500);
  const created = anon().find((v) => true);
  report.addCell = { buttons: adds.length, anonBefore: anon0, anonAfter: anon().length,
                     newCellOpen: !!openBodies().find(
                       (b) => b.querySelector(".cm-content") &&
                              b.querySelector(".cm-content").textContent.trim() === "{}") };

  // 2. copy — does anything reach the clipboard?
  const panel = openBodies()[0];
  let copyResult = { ran: false };
  if (panel) {
    const copy = [...panel.querySelectorAll("span,button")].find((b) =>
      b.textContent.trim().startsWith("\u{1F4C4}\u{1F4C4}"));
    if (copy) {
      try { await navigator.clipboard.writeText(""); } catch (e) {}
      copy.click();
      await wait(1500);
      let text = null, err = null;
      try { text = await navigator.clipboard.readText(); } catch (e) { err = e.message; }
      copyResult = { ran: true, length: text == null ? null : text.length,
                     head: text ? text.slice(0, 40) : null, error: err };
    }
  }
  report.copy = copyResult;

  // 3. paste
  const anonPre = anon().length;
  let pasteResult = { ran: false };
  if (panel) {
    const paste = btn(panel, "\u{1F4CB}");
    if (paste) { paste.click(); await wait(2000);
      pasteResult = { ran: true, anonBefore: anonPre, anonAfter: anon().length }; }
  }
  report.paste = pasteResult;

  // 4. cell-link navigation — the "inputs: x" links under a panel
  let linkResult = { ran: false };
  const link = document.querySelector(".cell-editor-body a, .cell-links a, .variable-link");
  if (link) {
    const hashBefore = location.hash;
    link.click();
    await wait(1200);
    linkResult = { ran: true, tag: link.tagName, text: link.textContent.trim().slice(0, 20),
                   hashChanged: location.hash !== hashBefore,
                   openAfter: openBodies().length };
  }
  report.cellLink = linkResult;

  // 5. drag-to-reorder — synthetic pointer drag on a hotbar grip, one slot down
  let dragResult = { ran: false };
  const grip = document.querySelector(".reorder-grip");
  if (grip) {
    const hotbar = grip.closest(".hotbar");
    const r = hotbar.getBoundingClientRect();
    const order = () => [...document.querySelectorAll(".hotbar")].indexOf(hotbar);
    const idxBefore = order();
    const ev = (type, y, extra = {}) => hotbar.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, clientX: r.x + 10, clientY: y, ...extra }));
    ev("pointerdown", r.y + r.height / 2, { button: 0 });
    await wait(120);
    ev("pointermove", r.y + r.height * 3);
    await wait(200);
    ev("pointermove", r.y + r.height * 4);
    await wait(200);
    ev("pointerup", r.y + r.height * 4);
    await wait(1500);
    dragResult = { ran: true, idxBefore, idxAfter: order(),
                   moved: order() !== idxBefore,
                   reorderingClassCleared: !document.body.classList.contains("lope-reordering") };
  }
  report.drag = dragResult;

  await wait(1000);
  const dyn = [...rt._variables].filter(
    (v) => typeof v._name === "string" && v._name.startsWith("dynamic "));
  report.end = { hotbars: document.querySelectorAll(".hotbar").length,
                 primary: rt._variables.size, scope: ed._scope.size,
                 dynamicTotal: dyn.length,
                 dynamicBridges: dyn.filter((v) => v._name.startsWith("dynamic bridge ")).length };
  return report;
})()
