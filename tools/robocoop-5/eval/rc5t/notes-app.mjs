// rc5t-notes-app (run 20260928-0625-w33): a notes app with list / editor / live markdown preview /
// New / Delete / search, kept in the saved file. setup.collect (notes-app.collect.js) acts as the user
// and scores each part on its own key; see that file for what each key means.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// The editor <textarea> is built once and never re-rendered while typing: the input handler updates
// the note, then re-renders only the list and the preview. Same split as @tomlarkworthy/notes
// (note_editor_ui is a constant textarea cell; write_note listens to its input; lopebooks
// @tomlarkworthy_notes.html). State via sticky, as rc5t-kanban-drag-persist / @tomlarkworthy/codestrates.doc.
export const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Notes

Notes are kept in this cell's source by \\\`sticky\\\`, so saving the notebook saves them.\` )};

const _notesApp = function notesApp(htl, md){return(
function notesApp() {
  let notes = [];
  let selected = null;
  let query = "";
  const titleOf = n => (n.body.split("\\n")[0].replace(/^#+\\s*/, "").trim() || "Untitled");
  const searchBox = htl.html\`<input type=search placeholder="Search notes" style="width:100%">\`;
  const newBtn = htl.html\`<button>New note</button>\`;
  const delBtn = htl.html\`<button>Delete</button>\`;
  const list = htl.html\`<ul style="list-style:none;padding:0;margin:0">\`;
  const editor = htl.html\`<textarea rows=12 style="width:100%;box-sizing:border-box" placeholder="Write markdown…"></textarea>\`;
  const preview = htl.html\`<div style="border-top:1px solid #ccc;margin-top:8px">\`;
  const el = htl.html\`<div style="display:flex;gap:12px">
    <div style="flex:0 0 220px">\${searchBox}<div>\${newBtn}\${delBtn}</div>\${list}</div>
    <div style="flex:1">\${editor}\${preview}</div>
  </div>\`;
  const current = () => notes.find(n => n.id === selected);
  const commit = () => el.dispatchEvent(new Event("input", {bubbles: true}));
  function renderList() {
    const q = query.toLowerCase();
    list.replaceChildren(...notes.filter(n => n.body.toLowerCase().includes(q)).map(n => {
      const li = htl.html\`<li style="cursor:pointer;padding:4px;\${n.id === selected ? "background:#ddeeff" : ""}">\${titleOf(n)}</li>\`;
      li.onclick = () => { selected = n.id; renderEditor(); renderList(); };
      return li;
    }));
  }
  function renderPreview() {
    const n = current();
    preview.replaceChildren(n ? md\`\${n.body}\` : "");
  }
  function renderEditor() {
    const n = current();
    editor.disabled = !n;
    editor.value = n ? n.body : "";
    renderPreview();
  }
  editor.oninput = (e) => {
    e.stopPropagation();
    const n = current();
    if (!n) return;
    n.body = editor.value;
    renderList();
    renderPreview();
    commit();
  };
  searchBox.oninput = (e) => { e.stopPropagation(); query = searchBox.value; renderList(); };
  newBtn.onclick = () => {
    const n = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), body: ""};
    notes = [n, ...notes];
    selected = n.id;
    renderEditor(); renderList(); commit();
    editor.focus();
  };
  delBtn.onclick = () => {
    if (!current()) return;
    notes = notes.filter(n => n.id !== selected);
    selected = notes[0]?.id ?? null;
    renderEditor(); renderList(); commit();
  };
  Object.defineProperty(el, "value", {
    get: () => notes,
    set: v => { notes = Array.isArray(v) ? v.map(n => ({...n})) : []; selected = notes[0]?.id ?? null; renderEditor(); renderList(); }
  });
  renderEditor(); renderList();
  return el;
}
)};

const _viewof_notes = function viewof_notes(sticky, notesApp){return( sticky(notesApp(), []) )};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_notesApp", "notesApp", ["htl", "md"], _notesApp);
  $def("_viewof_notes", "viewof notes", ["sticky", "notesApp"], _viewof_notes);
  $def("_notes", "notes", ["Generators", "viewof notes"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-notes-app",
  category: "rc5-train",
  question: "Turn this notebook into a little notes app: a list of notes on the left, click one to edit it in a text area on the right with a live markdown preview underneath, a New note button, a Delete button, and a search box that filters the list. Notes should be kept when I save the notebook.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: readFileSync(resolve(here, "notes-app.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "created", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "selected", equals: true }, weight: 1 },
    // the same textarea keeps focus and caret while typing: a re-rendered editor fails here
    { name: "collected_equals", args: { key: "focusKept", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "preview", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "deleted", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "searched", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keeping-user-state-in-the-saved-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/notes.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
