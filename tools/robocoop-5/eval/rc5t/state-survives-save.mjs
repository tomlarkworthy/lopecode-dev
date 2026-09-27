// rc5t-state-survives-save: "It should still be there next time I open the notebook" means the state is
// in the HTML file the notebook saves. In run 20260927-2352-w6-before the agent kept the todo list in
// localStorage, which stays in one browser profile and does not travel with the file; its summary said
// "persist across page reloads and notebook reopenings".
// setup.collect (state-survives-save.collect.js) acts as the user after the turn: types an item into the module's
// text box, adds it, ticks it, exports the notebook, boots the export in a sandboxed blob: iframe (an
// opaque origin: this browser's localStorage/IndexedDB are not visible, as on another machine) and
// reports whether the item is there and still ticked.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Copied from the sticky idiom: @tomlarkworthy/codestrates.doc (lopebooks tomlarkworthy_codestrates.html)
// is `sticky(codestrate({value: defaultCodestrate}), "<saved document>")`; the view exposes get/set value
// and dispatches `input` on each edit, and sticky rewrites the literal in the cell's own source.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Todo list

Items are kept in this cell's source by \\\`sticky\\\`, so saving the notebook saves the list.\` )};

const _todoList = function todoList(html){return(
function todoList() {
  let items = [];
  const input = html\`<input type=text placeholder="New item">\`;
  const add = html\`<button>Add</button>\`;
  const list = html\`<div>\`;
  const el = html\`<div>\${input}\${add}\${list}</div>\`;
  const commit = () => { render(); el.dispatchEvent(new Event("input", {bubbles: true})); };
  function render() {
    list.replaceChildren(...items.map((it, i) => {
      const cb = html\`<input type=checkbox>\`;
      cb.checked = it.done;
      cb.onchange = () => { items[i] = {...it, done: cb.checked}; commit(); };
      return html\`<div><label>\${cb} \${it.text}</label></div>\`;
    }));
  }
  add.onclick = () => { const t = input.value.trim(); if (!t) return; items = [...items, {text: t, done: false}]; input.value = ""; commit(); };
  input.onkeydown = e => { if (e.key === "Enter") add.click(); };
  Object.defineProperty(el, "value", { get: () => items, set: v => { items = Array.isArray(v) ? v : []; render(); } });
  render();
  return el;
}
)};

const _viewof_todos = function viewof_todos(sticky, todoList){return( sticky(todoList(), []) )};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_todoList", "todoList", ["html"], _todoList);
  $def("_viewof_todos", "viewof todos", ["sticky", "todoList"], _viewof_todos);
  $def("_todos", "todos", ["Generators", "viewof todos"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-state-survives-save",
  category: "rc5-train",
  question: "Make me a todo list I can add items to and tick off. It should still be there next time I open the notebook.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: readFileSync(resolve(here, "state-survives-save.collect.js"), "utf8"),
  },
  criteria: [
    // the list works live: an item typed into the module's text box and added shows up with a checkbox
    { name: "collected_equals", args: { key: "addedLive", equals: true }, weight: 1 },
    // THE defect: after save + reopen elsewhere the item is not shown (localStorage does not travel with the
    // file; or the data is in the source but the view's value setter does not re-render, run eval-fixed #1)
    { name: "collected_equals", args: { key: "reopenedShown", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "reopenedTicked", equals: true }, weight: 1 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keeping-user-state-in-the-saved-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/todo.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
