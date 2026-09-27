---
scope: [local-development, in-notebook]
write-triggers:
  - "localStorage|sessionStorage|indexedDB"
---

# Keeping user state in the saved notebook file (localStorage does not travel)

A Lopecode notebook is one HTML file. "It should still be there next time I open the notebook" means
the state is written into that file when the notebook is saved (Save in place, or export), so it
reopens with the file: in another browser, on another machine, or after the file is emailed.

`localStorage`, `sessionStorage` and IndexedDB are none of these. They belong to one browser profile
and one origin, are not part of the file, and throw on an opaque origin (a `blob:` fork). Use them
only for per-browser settings that must *not* travel with the file: API keys, a model choice, a
panel toggle. The corpus uses them for exactly that (`@tomlarkworthy/local-storage-view`, the
robocoop-5 model picker and key field).

Observed (run 20260927-2352-w6, todo-list prompt): the agent kept the list in
`localStorage.getItem("todo-list")` and reported that items "persist across page reloads and
notebook reopenings". After an export and a reopen in a fresh browser context, the list was empty.

## JSON state: `sticky` rewrites the cell's own source

`@tomlarkworthy/sticky` wraps any view. The second argument is a literal slot; on every `input`
event from the view, sticky writes `JSON.stringify(view.value)` into that slot in the cell's
definition. Saving the notebook saves the source, so the value comes back on reopen.

From `@tomlarkworthy/codestrates.doc` (lopebooks `tomlarkworthy_codestrates.html`), a whole HTML
document kept this way:

```js
const _o07hro = function _doc(sticky,codestrate,defaultCodestrate) {return (sticky(codestrate({ value: defaultCodestrate }), "<!doctype html>…"))};
```

Module source for a list, with the import (sticky is fetched from observablehq.com on first write
and embedded in the file from then on):

```js
const _viewof_todos = function viewof_todos(sticky, todoList){return( sticky(todoList(), []) )};
…
  $def("_viewof_todos", "viewof todos", ["sticky", "todoList"], _viewof_todos);
  $def("_todos", "todos", ["Generators", "viewof todos"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
```

The view must follow the Observable view contract, because sticky only talks to it through that.
Sticky restores a saved value by **assigning `el.value` when the cell runs**, so the setter must
re-render. A setter that only stores the value leaves the reopened list blank while the data is in
the source. From `@tomlarkworthy/codestrates.codestratePlace` (lopebooks
`tomlarkworthy_codestrates.html`, used as `sticky(codestratePlace($0))`):

```js
  Object.defineProperty(root, "value", {
    get: () => state,
    set: (v) => {
      state = { where: v?.where === "webstrate" && v?.url ? "webstrate" : "notebook", url: v?.url || "" };
      render();
    }
  });
  render();
  return root;
```

- `get` returns the state, JSON-serializable (arrays, objects, strings, numbers).
- `set` replaces the state **and calls `render()`**.
- after each user edit, `el.dispatchEvent(new Event("input", {bubbles: true}))`; sticky writes the
  slot on that event.

`Inputs.*` widgets already satisfy this: `sticky(Inputs.range([0, 100], {value: 50}), 50)`.

One `sticky(` call per cell. Binary or large state (images, audio, datasets) goes in a file
attachment instead (`how-file-attachments-work.md`).

## Tell the user to save

The state is in the page until the file is saved. After building it, say so: use Save in place (or
export) before closing the tab.

## Checking it

`inspect_value` on the cell only shows the live value. Check both halves:

1. Saving: drive the view (`eval_js`: set `.value`, dispatch `input`), then read `/notebook/<id>.js`;
   the sticky slot must hold the new value.
2. Reopening: set `.value` WITHOUT dispatching (what sticky does at boot) and confirm the element
   now shows the items (`viewof_todos.textContent`).
