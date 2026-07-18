const _welcome = function _welcome(md){return(
md`# Blank Notebook

A single self-contained HTML file built on the Observable reactive runtime. Everything you need to author, run, save, and share is already inside this file — no server, no build step, no separate runtime.

This page is the overview. Click any text here to edit it in place ([\`editable-md\`](https://observablehq.com/@tomlarkworthy/editable-md)), then use **Save in place** in the ☰ menu to write your changes back to this file. Delete this page and start building.
`
)};

const _capabilities = function _capabilities(md){return(
md`## What's included

- **AI agent** — [\`robocoop-5\`](https://observablehq.com/@tomlarkworthy/robocoop-5) is in the right pane. Describe a change and it edits the notebook's cells directly.
- **In-place editing** — [\`editable-md\`](https://observablehq.com/@tomlarkworthy/editable-md) makes markdown editable where it renders. No jumping to source.
- **Save to disk** — [\`save-in-place\`](https://observablehq.com/@tomlarkworthy/save-in-place) (☰ menu) writes the whole notebook back to its own file via the File System Access API.
- **Publish** — the **Publish** tab ([\`at-write\`](https://observablehq.com/@tomlarkworthy/at-write)) pushes this notebook to your atproto (Bluesky) account as a shareable bundle.
- **Pair with Claude Code** — the **Pairing** tab connects a live Claude Code session to this running notebook for real-time collaboration.
`
)};

const _next = function _next(md){return(
md`## Next steps

- Edit this overview, then Save in place.
- Ask the agent to add a cell.
- Publish to atproto, or pair with Claude Code to build together.

Reference: [Lopecode collection](https://observablehq.com/collection/@tomlarkworthy/lopebook) · [lopecode-dev](https://github.com/tomlarkworthy/lopecode-dev)
`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  $def("_welcome", "welcome", ["md"], _welcome);
  $def("_capabilities", "capabilities", ["md"], _capabilities);
  $def("_next", "next", ["md"], _next);
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}
