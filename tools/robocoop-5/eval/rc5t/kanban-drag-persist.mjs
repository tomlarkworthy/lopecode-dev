// rc5t-kanban-drag-persist: a To do / Doing / Done board where a card is added through the UI, dragged to
// another column, and is still in that column after the notebook is saved and reopened elsewhere.
// setup.collect (kanban.collect.js) acts as the user after the turn: types a card, adds it, drags it with
// HTML5 drag-and-drop (falling back to a pointer press-move-release), exports the notebook, boots the
// export in a sandboxed blob: iframe (opaque origin: this browser's localStorage/IndexedDB are not
// visible) and reports which column the card is shown in.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// State via sticky, copied from @tomlarkworthy/codestrates.doc (lopebooks tomlarkworthy_codestrates.html)
// and the view contract of codestrates.codestratePlace (setter re-renders). Drag handlers copied from
// @tomlarkworthy/slides.deckEditor (lopebooks tomlarkworthy_slides.html): draggable="true",
// ondragstart sets dataTransfer, ondragover preventDefault, ondrop moves.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Kanban

Cards are kept in this cell's source by \\\`sticky\\\`, so saving the notebook saves the board.\` )};

const _kanban = function kanban(htl){return(
function kanban() {
  const COLS = ["To do", "Doing", "Done"];
  let cards = [];
  let dragging = null;
  const input = htl.html\`<input type=text placeholder="New card">\`;
  const add = htl.html\`<button>Add</button>\`;
  const board = htl.html\`<div style="display:flex;gap:8px">\`;
  const el = htl.html\`<div>\${input}\${add}\${board}</div>\`;
  const commit = () => { render(); el.dispatchEvent(new Event("input", {bubbles: true})); };
  function render() {
    board.replaceChildren(...COLS.map(col => {
      const list = htl.html\`<div style="min-height:60px">\${cards.map((c, i) => c.col !== col ? null : (() => {
        const card = htl.html\`<div draggable="true" style="border:1px solid #888;padding:4px;margin:4px 0">\${c.text}</div>\`;
        card.ondragstart = (e) => { dragging = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); };
        card.ondragend = () => { dragging = null; };
        return card;
      })())}</div>\`;
      const column = htl.html\`<section style="flex:1;border:1px solid #ccc;padding:4px"><h3>\${col}</h3>\${list}</section>\`;
      column.ondragover = (e) => { if (dragging != null) e.preventDefault(); };
      column.ondrop = (e) => {
        e.preventDefault();
        if (dragging == null) return;
        cards = cards.map((c, i) => i === dragging ? {...c, col} : c);
        dragging = null;
        commit();
      };
      return column;
    }));
  }
  add.onclick = () => { const t = input.value.trim(); if (!t) return; cards = [...cards, {text: t, col: "To do"}]; input.value = ""; commit(); };
  input.onkeydown = e => { if (e.key === "Enter") add.click(); };
  Object.defineProperty(el, "value", { get: () => cards, set: v => { cards = Array.isArray(v) ? v : []; render(); } });
  render();
  return el;
}
)};

const _viewof_cards = function viewof_cards(sticky, kanban){return( sticky(kanban(), []) )};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_kanban", "kanban", ["htl"], _kanban);
  $def("_viewof_cards", "viewof cards", ["sticky", "kanban"], _viewof_cards);
  $def("_cards", "cards", ["Generators", "viewof cards"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-kanban-drag-persist",
  category: "rc5-train",
  question: "Make a small kanban board with To do / Doing / Done columns. I can add a card, drag cards between columns, and the board should still be there after I save and reopen the notebook.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: readFileSync(resolve(here, "kanban-drag-persist.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "addedLive", equals: true }, weight: 1 },
    // dragging the card to another column moves it (HTML5 DnD or pointer events)
    { name: "collected_equals", args: { key: "movedLive", equals: true }, weight: 2 },
    // after save + reopen on an opaque origin the card is shown, in the column it was dragged to
    { name: "collected_equals", args: { key: "reopenedShown", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "reopenedInTarget", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keeping-user-state-in-the-saved-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/kanban.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
