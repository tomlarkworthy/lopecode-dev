const _noteCount = function noteCount(notes){return(
`${notes.length} notes stored in this browser`
)};
const _noteTable = function noteTable(Inputs,notes){return(
Inputs.table(notes, { columns: ["note_id", "title", "content", "modified"] })
)};
const _addButton = function addButton(Inputs,notes_collection){return(
Inputs.button("add note", { reduce: () => notes_collection.add({ title: "Untitled", content: "", created: Date.now(), modified: Date.now() }) })
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_noteCount", "noteCount", ["notes"], _noteCount);
  $def("_noteTable", "noteTable", ["Inputs", "notes"], _noteTable);
  $def("_addButton", "addButton", ["Inputs", "notes_collection"], _addButton);

  main.define("module @tomlarkworthy/notes", async () => runtime.module((await import("/@tomlarkworthy/notes.js?v=4")).default));
  main.define("notes", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes", _));
  main.define("notes_collection", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes_collection", _));
  return main;
}
