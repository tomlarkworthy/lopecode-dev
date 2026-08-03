// runtime-adapter.js — the contentSync seam.
//
// Reconciles a notebook document (cell source text) into Observable runtime
// variables. Redefining a changed cell lets the runtime propagate recomputation
// downstream automatically — that reactive dataflow is exactly what lopecode
// contributes and Patchwork/Automerge does not have.
//
// This mirrors, in miniature, what lopecode's bootloader does when it resolves
// module source via window.lopecode.contentSync and calls runtime.module(): here
// the source comes from the Automerge doc instead of <script type=text/plain>.

import { Runtime } from "@observablehq/runtime";

// Compile one cell's source text into an Observable definition function.
// A cell is { inputs: string[], body: string } where body is a function body
// (may `return` a value or a DOM node). Kept deliberately small: the point is
// that the *source is text in the doc*, not a bespoke cell language.
function compile(cell) {
  // eslint-disable-next-line no-new-func
  return new Function(...cell.inputs, cell.body);
}

// Render one cell's value into its own row. DOM nodes are mounted live; other
// values are stringified. This stands in for lopecode's Inspector.
function makeObserver(name, host) {
  const row = document.createElement("div");
  row.className = "lpw-cell";
  row.dataset.cell = name;
  const label = document.createElement("span");
  label.className = "lpw-cell-name";
  label.textContent = name;
  const out = document.createElement("span");
  out.className = "lpw-cell-value";
  row.append(label, out);
  host.append(row);

  return {
    node: row,
    pending() {
      row.dataset.state = "pending";
    },
    fulfilled(value) {
      row.dataset.state = "ok";
      out.replaceChildren();
      if (value instanceof Node) out.append(value);
      else out.textContent = format(value);
    },
    rejected(error) {
      row.dataset.state = "error";
      out.replaceChildren();
      out.textContent = String((error && error.message) || error);
    },
  };
}

function format(v) {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// Mount a notebook document into `element`, reconciling reactively.
// Returns { sync(doc), dispose() }.
export function mountNotebook(element, initialDoc) {
  const runtime = new Runtime();
  const main = runtime.module();

  const host = document.createElement("div");
  host.className = "lpw-notebook";
  element.append(host);

  // name -> { variable, observer, key } where key fingerprints the source so we
  // only redefine cells whose text actually changed.
  const live = new Map();
  const keyOf = (cell) => JSON.stringify([cell.inputs, cell.body]);

  function sync(doc) {
    const cells = (doc && doc.cells) || {};
    const order = (doc && doc.order) || Object.keys(cells);

    // Remove cells that no longer exist.
    for (const name of [...live.keys()]) {
      if (!cells[name]) {
        const entry = live.get(name);
        entry.variable.delete();
        entry.observer.node.remove();
        live.delete(name);
      }
    }

    // Add or redefine cells from the doc's source.
    for (const name of order) {
      const cell = cells[name];
      if (!cell) continue;
      const key = keyOf(cell);
      const existing = live.get(name);
      if (existing) {
        if (existing.key === key) continue; // unchanged source — skip
        existing.variable.define(name, cell.inputs, compile(cell));
        existing.key = key;
      } else {
        const observer = makeObserver(name, host);
        const variable = main.variable(observer);
        variable.define(name, cell.inputs, compile(cell));
        live.set(name, { variable, observer, key });
      }
    }
  }

  sync(initialDoc);

  return {
    sync,
    dispose() {
      runtime.dispose();
      host.remove();
      live.clear();
    },
  };
}
