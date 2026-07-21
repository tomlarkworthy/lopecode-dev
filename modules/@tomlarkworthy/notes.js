const _1t2408w = function _1(md){return(
md`# Notes`
)};
const _1qavxkw = function _2(exporter){return(
exporter()
)};
const _17ewnt1 = function _3($0,Inputs,addNote,deleteCurrent,htl){return(
htl.html`<div style="display:flex">
${$0}
${Inputs.button("new note", {
  reduce: addNote
})}  
${Inputs.button("delete", {
  reduce: deleteCurrent
})}
</div>`
)};
const _kmarvh = function _title(Inputs,notes,current_note_id){return(
Inputs.text({
  value: notes.find((n) => n.note_id == current_note_id).title
})
)};
const _ufp4hk = (G, _) => G.input(_);
const _xabhyl = function _note_editor_ui(htl){return(
htl.html`<textarea style="
  width: 100%;
  height: 1024px;
" autocorrect="on"/>`
)};
const _1s3fprv = function _6(Inputs,notes){return(
Inputs.table(notes, {
  //columns: ["title", "modified", "note_id"],
  layout: "auto",
  format: {
    created: (timestamp) => new Date(timestamp).toISOString(),
    modified: (timestamp) => new Date(timestamp).toISOString()
  }
})
)};
const _14vbnq = function _7(md){return(
md`## About

\`Notes\` offers offline note taking. Notes are stored in the browser using local-first [Dexie](https://dexie.org/), and you can export the whole application including notes to a single file for distributing. There are no network dependancies. It is recommended you click download to get a hardcopy of the app on your machine for offline use.`
)};
const _1g03tl0 = function _8(md){return(
md`
# Technical documentation

This document explains the capabilities, architecture, and algorithmic design of the notebook-backed Notes application.

## High-level capabilities

- Offline-first, local-persisted notes: notes are stored in IndexedDB via Dexie (see \`db_unconfigured\`, \`notes_db\`) so content is retained across reloads and when the browser is offline.
- Live sync across tabs: all open tabs/windows that load the same origin see near-real-time updates. The app uses Dexie's reactive/live-query features (\`dexie.liveQuery\`) and Observable's reactive cells (\`Generators.observe\`) to keep UI and data synchronized.
- Last-write-wins conflict resolution: every change carries a numeric \`modified\` timestamp. When multiple writers (tabs, file import) propose different versions of the same note, the system uses the \`modified\` value to decide which version wins (LWW).
- Background debounce & autosave: editing is captured locally and saved after a short debounce to avoid excessive writes; blur triggers immediate save.
- Single-file application export (bundled HTML): the app can be exported as a single standalone HTML file that includes the application’s ESM modules and any FileAttachment assets (for example, a snapshot of notes). This exported HTML is a self-contained application you can save and open without any external network dependencies.
- Simple UI built with Observable Inputs and HTL: selection, title entry, add/delete controls, editor textarea, and a table view.

## Data model and storage

- Database name and schema:
  - \`db_unconfigured\` — Dexie database instance created with name 'notes'.
  - \`notes_db\` — database configured with version 1 and stores:
    - \`notes\`: primary keys incrementing (\`++note_id\`) and indexed fields \`title, created, modified\`.
    - \`tags\`: primary keys incrementing (\`++tag_id\`) and \`name\`.
  - \`notes_collection\` and \`tags_collection\` are convenience references to the Dexie table objects.

- Note fields (as used in the code):
  - \`note_id\` (auto increment PK)
  - \`title\`
  - \`content\`
  - \`created\` (numeric timestamp)
  - \`modified\` (numeric timestamp; the LWW marker)

## Reactive flows and UI wiring

- Observing collections:
  - \`notes\` and \`tags\` are provided by:
    - Generators.observe(notify => dexie.liveQuery(() => notes_collection.orderBy('created').desc().toArray()).subscribe({ next: notify }))
    - This returns a reactive array that updates whenever the underlying IndexedDB content changes (including changes from other tabs).

- Selection UI:
  - \`viewof selector\` is an \`Inputs.select\` built from \`notes\`. It stores and emits the currently selected note object.
  - \`viewof current_note_id\` is an \`Inputs.input\` that holds the active \`note_id\` (used to drive which note is shown/edited).

- Editor UI:
  - \`note_editor_ui\` is the \`<textarea>\` element used for editing content.
  - \`viewof title\` is an \`Inputs.text\` field bound to the note title.

- Synchronization helpers:
  - \`sync_ui\` ensures the selector and the \`viewof current_note_id\` stay consistent: if selector changes, it updates the current id (dispatching an input event).
  - \`sync_current_note\` subscribes to \`dexie.liveQuery(() => notes_collection.get(id))\` for the active note id so the editor can receive updates from other tabs or external writes.

## Writing, debounce, and LWW enforcement (the algorithm)

Core writer logic lives in the \`write_note\` cell. It implements an efficient autosave with Last Write Wins (LWW) semantics:

1. User input:
   - On every \`input\` in the editor or the title field, the input handler runs:
     - It sets \`note_editor_ui.__modified = Date.now()\`.
     - It clears any existing debounce timer and starts a new 500ms timer.

2. Debounce & save:
   - After 500ms of inactivity the timer calls \`doSave()\`.
   - On blur (losing focus) the \`blurHandler\` cancels the timer and runs \`doSave()\` immediately.

3. doSave():
   - Reads \`id = viewof current_note_id.value\`, \`content = note_editor_ui.value\`, and the \`title\` value.
   - Writes an update to \`notes_collection.update(id, { title, content, modified: note_editor_ui.__modified })\`.
   - The numeric \`modified\` value is the authoritative last-write timestamp.

4. Cross-tab resolution:
   - When another tab writes a note with a newer \`modified\`, the \`sync_current_note\` subscription sees the remote note and compares its \`note.modified\` to the local \`note_editor_ui.__modified\`. If the remote \`modified\` is greater, the editor receives the remote content (i.e., remote newer wins).
   - This is a straightforward Last-Write-Wins (LWW) policy using numeric timestamps (epoch milliseconds). It’s simple, deterministic, and works well for single-field replace semantics.


## Export and import (file persistence and merge)

- FileAttachment in Observable:
  - A \`FileAttachment\` is an Observable runtime abstraction that gives a cell access to a named asset (for example a JSON blob named \`notes.json\`). In the notebook environment a FileAttachment can come from several places: an asset uploaded to the notebook, a file produced programmatically with \`setFileAttachment\`, or (in other contexts) user-provided files.
  - Reading \`FileAttachment('notes.json').json()\` is a runtime call that resolves the attachment and parses it as JSON.

- Exporter and single-file bundling:
  - The notebook's \`exporter\` helper bundles the live notebook into a single standalone HTML application. When exporter runs it collects the app's modules (ESM) and any registered FileAttachments and inlines them into the generated HTML. The resulting HTML is self-contained: it contains the application code and any attached assets so the app can run without servers or external files.
  - Crucially, the purpose of \`setFileAttachment\` (and helpers like \`jsonFileAttachment\`) in this notebook is often to register an asset in the notebook's runtime so that exporter will include that asset inline in the exported HTML. In other words, the code path that creates a FileAttachment is not for "downloading a file to disk" — it's a way to tell the exporter "include this data as an embedded asset in the single-file HTML."

- How \`persist_to_file\` is used in this app:
  - The \`persist_to_file\` cell collects the current DB contents (\`await notes_collection.toArray()\` and \`await tags_collection.toArray()\`) and calls:
    - \`setFileAttachment(jsonFileAttachment('notes.json', { notes, tags }), notesModule)\`
  - That call creates a FileAttachment named \`notes.json\` (backed by the in-memory JSON) and registers it with the module \`notesModule\`. The practical effect:
    - In the live notebook: other cells that call \`FileAttachment('notes.json').json()\` will resolve to this snapshot object.
    - When the user runs the notebook's exporter to produce the single-file HTML, the exporter will include the \`notes.json\` asset inline in the generated HTML. When that exported HTML is later opened, the same \`FileAttachment('notes.json').json()\` call will read the embedded JSON asset from inside the exported file.

- How \`load_from_file\` behaves:
  - \`file = FileAttachment('notes.json').json()\` reads the named attachment at runtime and parses it. In the notebook this resolves to whichever \`notes.json\` attachment is registered in the runtime (for example by \`persist_to_file\`).
  - In the standalone exported HTML (produced by \`exporter\`), the \`notes.json\` asset is embedded; \`FileAttachment('notes.json').json()\` will read the embedded JSON from the exported HTML. The \`load_from_file\` function then merges that JSON into IndexedDB using the same LWW merge rules used for cross-tab updates:
    - For each note in the file, compare by \`note_id\` to local state and include the file note only if it is missing locally or has a strictly greater \`modified\` timestamp.
    - Tags are merged with the same rule.

- Net effect:
  - The exporter makes a single-file HTML application that includes both the app code (ESM modules) and the attached asset(s) such as \`notes.json\`. This allows the exported HTML to be opened independently and to populate its IndexedDB from the embedded \`notes.json\` asset if the app calls \`FileAttachment('notes.json').json()\` and then runs \`load_from_file\`.
  - The FileAttachment API is therefore being used as the mechanism for embedding and later reading snapshot data inside the exported single-file application.

## Important operational detail

- The application assumes the origin where the page opens may already have notes in IndexedDB. Import logic compares the file contents (the FileAttachment) to the existing DB and applies only entries that are missing or newer. This complements the cross-tab LWW strategy — both import and cross-tab synchronization use the same timestamp-based winner selection.
- The exporter + FileAttachment flow allows you to create a standalone HTML snapshot that carries the notes with it. Opening that HTML will run the notebook app and initialize a database using the embedded attachment.

## Noteworthy cells

- Storage & schema:
  - \`db_unconfigured\` — raw Dexie instance before schema applied
  - \`notes_db\` — configured database (version/stores)
  - \`notes_collection\` — Dexie table for notes
  - \`tags_collection\` — Dexie table for tags

- Reactive data:
  - \`notes\` — reactive array of notes (Generators.observe + dexie.liveQuery)
  - \`tags\` — reactive array of tags

- UI & selection:
  - \`viewof notesModule\` — the module view (used for file attachments during export)
  - \`viewof current_note_id\` — numeric input holding the active note id
  - \`viewof selector\` — \`Inputs.select\` for choosing notes
  - \`viewof title\` — title text input
  - \`note_editor_ui\` — the \`textarea\` used for editing content
  - \`md\`, \`htl\`, \`Inputs\` — Notebook helpers used throughout

- Synchronization & logic:
  - \`sync_ui\` — keeps selector and current id in sync
  - \`sync_current_note\` — liveQuery subscription for the currently open note
  - \`write_note\` — the autosave/debounce/write logic with \`__modified\` marker
  - \`deleteCurrent\` — delete the current note and choose a replacement selection
  - \`addNote\` — create a new note with \`created\` and \`modified\` timestamps

- File / export:
  - \`file\` — \`FileAttachment('notes.json').json()\` (the parsed incoming JSON attachment)
  - \`persist_to_file\` — register a \`notes.json\` FileAttachment representing current DB contents (so exporter can inline it)
  - \`load_from_file\` — merge file data into local DB using LWW (works both in the notebook and in the exported single-file HTML because the attachment will be present)
  - \`exporter\` — exporter helper used by the UI to build the single-file HTML

## Implementation summary (algorithm in plain steps)

1. Initialize Dexie DB and tables (\`db_unconfigured\`, \`notes_db\`).
2. Create reactive views on tables using \`dexie.liveQuery\` wrapped in \`Generators.observe\` (\`notes\`, \`tags\`) so UI updates automatically when data changes.
3. Build editor UI (\`note_editor_ui\` and \`viewof title\`), selection UI (\`viewof selector\`) and wiring (\`sync_ui\`).
4. For editing:
   - On input, set local \`__modified\` timestamp and debounce a save.
   - On save, write \`{title, content, modified}\` to IndexedDB (\`notes_collection.update\`).
5. For incoming updates (from other tabs or DB changes):
   - Subscribe to a liveQuery for the active note (\`sync_current_note\`).
   - If a database note has \`modified\` strictly greater than the editor's \`__modified\`, overwrite editor contents with the database version.
6. Export/import and bundling:
   - \`persist_to_file\` collects the DB state and registers a FileAttachment named \`notes.json\` via \`setFileAttachment(jsonFileAttachment(...), notesModule)\`. This registers an asset for inclusion.
   - Using the notebook \`exporter\` generates a single-file HTML that bundles the application ESM modules and any registered FileAttachments (including \`notes.json\`) inline.
   - In the exported HTML, \`FileAttachment('notes.json').json()\` resolves to the embedded JSON asset, and \`load_from_file\` can merge that embedded snapshot into the local IndexedDB using the same timestamp-based LWW rule.

## Design trade-offs

- Simple, robust offline-first model backed by a proven browser storage (IndexedDB/Dexie).
- Near-instant updates across tabs without a backend.
- Simple merge semantics (LWW) avoids complex CRDTs and makes the implementation small and maintainable.
- The exporter + FileAttachment approach provides a convenient way to produce self-contained distributable application snapshots (single-file HTML that embeds both code and data). This is ideal for portability and for sharing a complete application state without depending on external servers.
- The FileAttachment mechanism is used here as an export-time asset registration and runtime asset resolver.

`
)};
const _171k9ob = function _9(md){return(
md`---

## Implementation`
)};
const _1omr9gd = function _db_unconfigured(dexie){return(
new dexie.Dexie("notes")
)};
const _2wi89q = function _14(md){return(
md`### Schema`
)};
const _x1n20t = function _notes_db(db_unconfigured){return(
db_unconfigured.version(1).stores({
  notes: "++note_id,title,created,modified",
  tags: "++tag_id,name"
}).db
)};
const _8s7fed = function _notes_collection(notes_db){return(
notes_db.notes
)};
const _1vxvdij = function _tags_collection(notes_db){return(
notes_db.tags
)};
const _15w7d0l = function _18(md){return(
md`### Data`
)};
const _1ymq23j = function _notesModule(thisModule){return(
thisModule()
)};
const _1l33pb7 = (G, _) => G.input(_);
const _148got0 = function _current_note_id(Inputs){return(
Inputs.input(1)
)};
const _ewtd2s = (G, _) => G.input(_);
const _7tizp2 = function _notes(Generators,dexie,notes_collection){return(
Generators.observe((notify) => {
  dexie
    .liveQuery(() => notes_collection.orderBy("created").desc().toArray())
    .subscribe({ next: notify });
})
)};
const _127nui = function _tags(Generators,dexie,tags_collection){return(
Generators.observe((notify) => {
  dexie.liveQuery(() => tags_collection.toArray()).subscribe({ next: notify });
})
)};
const _12s81e = function _selector(Inputs,notes,current_note_id){return(
Inputs.select(
  new Map(
    notes.map((note) => [
      `${note.note_id}: ${new Date(note.modified).toDateString()} ${
        note.title
      }`,
      note
    ])
  ),
  {
    width: "100%",
    value: notes.find((n) => n.note_id == current_note_id)
  }
)
)};
const _1yp5p2d = (G, _) => G.input(_);
const _o4o9v9 = function _24(md){return(
md`### App`
)};
const _828ap3 = function _sync_ui($0,selector,Event)
{
  if ($0.value != selector.note_id) {
    $0.value = selector.note_id;
    $0.dispatchEvent(new Event("input"));
  }
};
const _laez95 = function _write_note(note_editor_ui,$0,$1,notes_collection)
{
  if (note_editor_ui.__write_note_handler) {
    note_editor_ui.removeEventListener(
      "input",
      note_editor_ui.__write_note_handler
    );
    if (note_editor_ui.__write_note_blur)
      note_editor_ui.removeEventListener(
        "blur",
        note_editor_ui.__write_note_blur
      );
    clearTimeout(note_editor_ui.__write_note_timer);
    delete note_editor_ui.__write_note_handler;
    delete note_editor_ui.__write_note_blur;
    delete note_editor_ui.__write_note_timer;
  }

  let saving = false;

  async function doSave() {
    const id = $0.value;
    if (id == null) return;
    const content = note_editor_ui.value;
    const title = $1.value;
    saving = true;
    try {
      await notes_collection.update(id, {
        title,
        content,
        modified: note_editor_ui.__modified
      });
    } finally {
      saving = false;
    }
  }

  function inputHandler() {
    note_editor_ui.__modified = Date.now();
    clearTimeout(note_editor_ui.__write_note_timer);
    note_editor_ui.__write_note_timer = setTimeout(() => {
      void doSave();
    }, 500);
  }

  function blurHandler() {
    clearTimeout(note_editor_ui.__write_note_timer);
    void doSave();
  }

  note_editor_ui.__write_note_handler = inputHandler;
  note_editor_ui.__write_note_blur = blurHandler;
  note_editor_ui.addEventListener("input", inputHandler);
  $1.addEventListener("input", inputHandler);
  note_editor_ui.addEventListener("blur", blurHandler);

  return {
    save: doSave,
    isSaving: () => saving,
    stop() {
      note_editor_ui.removeEventListener("input", inputHandler);
      note_editor_ui.removeEventListener("blur", blurHandler);
      $1.removeEventListener("input", inputHandler);
      clearTimeout(note_editor_ui.__write_note_timer);
      delete note_editor_ui.__write_note_handler;
      delete note_editor_ui.__write_note_blur;
      delete note_editor_ui.__write_note_timer;
    }
  };
};
const _1hvaqt9 = function _sync_current_note(current_note_id,note_editor_ui,dexie,notes_collection,$0,invalidation)
{
  const id = current_note_id;
  if (id == null) return;
  note_editor_ui.__modified = 0;
  const subscription = dexie
    .liveQuery(() => notes_collection.get(id))
    .subscribe({
      next(note) {
        if (note.modified > (note_editor_ui.__modified || 0)) {
          note_editor_ui.__modified = note.modified;
          note_editor_ui.value = note.content ?? "";
          $0.value = note.title;
        }
      }
    });
  invalidation.then(subscription.unsubscribe);
};
const _bey95g = function _deleteCurrent(current_note_id,notes,notes_collection,note_editor_ui,$0,Event){return(
async () => {
    const id = current_note_id;
    if (id == null) return null;
    const idx = notes.findIndex(n => n.note_id == id);
    const replacementNote = (idx >= 0) ? (notes[idx + 1] ?? notes[idx - 1] ?? null) : null;
    await notes_collection.delete(id);
    note_editor_ui.__modified = 0;
    $0.value = replacementNote ? replacementNote.note_id : null;
    $0.dispatchEvent(new Event('input', { bubbles: true }));
    return id;
}
)};
const _1dnckd8 = function _addNote(notes_collection,$0,Event){return(
async () => {
  const ts = Date.now();
  const id = await notes_collection.add({
    title: "Untitled",
    content: "",
    created: ts,
    modified: ts
  });
  $0.value = id;
  $0.dispatchEvent(new Event("input", { bubbles: true }));
  return id;
}
)};
const _1gvumoy = function _30(md){return(
md`### File Persistence`
)};
const _1fw6vmh = function _file(FileAttachment){return(
FileAttachment("notes.json").json()
)};
const _ff7jve = async function _persist_to_file(notes,setFileAttachment,jsonFileAttachment,notes_collection,tags_collection,notesModule)
{
  notes;
  return setFileAttachment(
    jsonFileAttachment("notes.json", {
      notes: await notes_collection.toArray(),
      tags: await tags_collection.toArray()
    }),
    notesModule
  );
};
const _vcdlu4 = async function _load_from_file(file,notes_collection,tags_collection)
{
  const fileNotes = file.notes || [];
  const fileNoteIds = fileNotes.map((n) => n.note_id);
  const existingNotes = await notes_collection.bulkGet(fileNoteIds);
  const notesToPut = [];
  for (let i = 0; i < fileNotes.length; i++) {
    const fn = fileNotes[i];
    const en = existingNotes[i];
    if (!en) {
      notesToPut.push(fn);
    } else if ((fn.modified || 0) > (en.modified || 0)) {
      notesToPut.push(fn);
    }
  }
  if (notesToPut.length) await notes_collection.bulkPut(notesToPut);
  const fileTags = file.tags || [];
  if (fileTags.length) {
    const fileTagIds = fileTags.map((t) => t.tag_id);
    const existingTags = await tags_collection.bulkGet(fileTagIds);
    const tagsToPut = [];
    for (let i = 0; i < fileTags.length; i++) {
      const ft = fileTags[i];
      const et = existingTags[i];
      if (!et) {
        tagsToPut.push(ft);
      } else if ((ft.modified || 0) > (et.modified || 0)) {
        tagsToPut.push(ft);
      }
    }
    if (tagsToPut.length) await tags_collection.bulkPut(tagsToPut);
  }
};
const _10369fb = function _35(auto_attach){return(
auto_attach
)};
const _zpwyyn = function _37(robocoop){return(
robocoop
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["notes.json"].map((name) => {
    const module_name = "@tomlarkworthy/notes";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/dexie-4", async () => runtime.module((await import("/@tomlarkworthy/dexie-4.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));  
  $def("_1t2408w", null, ["md"], _1t2408w);  
  $def("_1qavxkw", null, ["exporter"], _1qavxkw);  
  $def("_17ewnt1", null, ["viewof selector","Inputs","addNote","deleteCurrent","htl"], _17ewnt1);  
  $def("_kmarvh", "viewof title", ["Inputs","notes","current_note_id"], _kmarvh);  
  $def("_ufp4hk", "title", ["Generators","viewof title"], _ufp4hk);  
  $def("_xabhyl", "note_editor_ui", ["htl"], _xabhyl);  
  $def("_1s3fprv", null, ["Inputs","notes"], _1s3fprv);  
  $def("_14vbnq", null, ["md"], _14vbnq);  
  $def("_1g03tl0", null, ["md"], _1g03tl0);  
  $def("_171k9ob", null, ["md"], _171k9ob);  
  main.define("dexie", ["module @tomlarkworthy/dexie-4", "@variable"], (_, v) => v.import("dexie", _));  
  main.define("getFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("removeFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("removeFileAttachment", _));  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("createFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("createFileAttachment", _));  
  main.define("thisModule", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_1omr9gd", "db_unconfigured", ["dexie"], _1omr9gd);  
  $def("_2wi89q", null, ["md"], _2wi89q);  
  $def("_x1n20t", "notes_db", ["db_unconfigured"], _x1n20t);  
  $def("_8s7fed", "notes_collection", ["notes_db"], _8s7fed);  
  $def("_1vxvdij", "tags_collection", ["notes_db"], _1vxvdij);  
  $def("_15w7d0l", null, ["md"], _15w7d0l);  
  $def("_1ymq23j", "viewof notesModule", ["thisModule"], _1ymq23j);  
  $def("_1l33pb7", "notesModule", ["Generators","viewof notesModule"], _1l33pb7);  
  $def("_148got0", "viewof current_note_id", ["Inputs"], _148got0);  
  $def("_ewtd2s", "current_note_id", ["Generators","viewof current_note_id"], _ewtd2s);  
  $def("_7tizp2", "notes", ["Generators","dexie","notes_collection"], _7tizp2);  
  $def("_127nui", "tags", ["Generators","dexie","tags_collection"], _127nui);  
  $def("_12s81e", "viewof selector", ["Inputs","notes","current_note_id"], _12s81e);  
  $def("_1yp5p2d", "selector", ["Generators","viewof selector"], _1yp5p2d);  
  $def("_o4o9v9", null, ["md"], _o4o9v9);  
  $def("_828ap3", "sync_ui", ["viewof current_note_id","selector","Event"], _828ap3);  
  $def("_laez95", "write_note", ["note_editor_ui","viewof current_note_id","viewof title","notes_collection"], _laez95);  
  $def("_1hvaqt9", "sync_current_note", ["current_note_id","note_editor_ui","dexie","notes_collection","viewof title","invalidation"], _1hvaqt9);  
  $def("_bey95g", "deleteCurrent", ["current_note_id","notes","notes_collection","note_editor_ui","viewof current_note_id","Event"], _bey95g);  
  $def("_1dnckd8", "addNote", ["notes_collection","viewof current_note_id","Event"], _1dnckd8);  
  $def("_1gvumoy", null, ["md"], _1gvumoy);  
  $def("_1fw6vmh", "file", ["FileAttachment"], _1fw6vmh);  
  $def("_ff7jve", "persist_to_file", ["notes","setFileAttachment","jsonFileAttachment","notes_collection","tags_collection","notesModule"], _ff7jve);  
  $def("_vcdlu4", "load_from_file", ["file","notes_collection","tags_collection"], _vcdlu4);  
  main.define("auto_attach", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("auto_attach", _));  
  $def("_10369fb", null, ["auto_attach"], _10369fb);  
  $def("_zpwyyn", null, ["robocoop"], _zpwyyn);
  return main;
}