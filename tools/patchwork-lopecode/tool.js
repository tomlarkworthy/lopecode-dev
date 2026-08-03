// tool.js — the Patchwork render contract: (handle, element) => cleanup.
//
// Boots the Observable runtime, mounts the notebook whose source lives in the
// Automerge doc, and re-syncs on every doc change (local or remote). Edits made
// through Patchwork's version control / multiplayer arrive here as `change`
// events; the runtime recomputes reactively.

import { mountNotebook } from "./runtime-adapter.js";

const STYLE = `
.lpw-notebook { font: 14px/1.5 var(--editor-family-code, ui-monospace, monospace);
  color: var(--editor-line, #111); padding: .5rem; }
.lpw-notebook .lpw-cell { display: flex; gap: .5rem; padding: .25rem 0;
  border-bottom: 1px solid var(--editor-fill-offset-20, #eee); }
.lpw-notebook .lpw-cell-name { min-width: 6rem; font-weight: 600;
  color: var(--editor-line-offset-40, #888); }
.lpw-notebook .lpw-cell[data-state="error"] .lpw-cell-value { color: var(--studio-danger, #c00); }
.lpw-notebook .lpw-cell[data-state="pending"] { opacity: .5; }
`;

export default function LopecodeNotebookTool(handle, element) {
  const style = document.createElement("style");
  style.textContent = STYLE;
  element.append(style);

  const nb = mountNotebook(element, handle.doc());

  const onChange = () => nb.sync(handle.doc());
  handle.on("change", onChange);

  return () => {
    handle.off("change", onChange);
    nb.dispose();
    style.remove();
  };
}
