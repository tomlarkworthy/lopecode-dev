// rc5t-explain-self-save: a comprehension question with no writing. The robocoop-5 notebook has two
// user-facing save routes, both ending in exporter-3's exportToHTML: save-in-place's sip_save (menu
// "Save in place", writes back over the file) and lopepage-2's lp2_menu_defaults (menu "Download" /
// "Fork", exporter-3 downloadAnchor / forkAnchor). exportToHTML serialises every module AND its file
// attachments (module_specs -> getFileAttachments; book) into one HTML file.
// Run 20260928-0030-w8-before (mimo-v2.5-pro, 21s, 2 reads): read save-in-place in full and the first 80 of
// exporter-3's 3800 lines, then answered. Every cited cell was real, but the answer named one route
// only and described exportToHTML from the system prompt's summary (no attachments).
const QUESTION = "How does this notebook save itself? Explain briefly, pointing at the cells involved.";

export default {
  id: "rc5t-explain-self-save",
  category: "rc5-train",
  question: QUESTION,
  setup: { collect: "({ pids: [...(window.__ojs_runtime?._variables ?? [])].map((v) => v.pid).filter(Boolean) })" },
  criteria: [
    // grounding: the answer's claims about serialisation come from exporter-3's source
    { name: "tool_call_matches", args: { pattern: "exporter-3|exportToHTML" }, weight: 1 },
    // hallucination guard: no invented cell names (browser/platform API names allowed)
    { name: "answer_cites_real_cells", args: { minKnown: 2, allow: "^(window|document|location|indexedDB|IndexedDB|localStorage|FileSystem\\w*|showSaveFilePicker|createWritable|Blob|URL|fetch|define|runtime|main|observer|invalidation|md|html|htl|Inputs|FileAttachment|Generators|mains|bootconf|lp2-menu|true|false|null|undefined|\\w*Handle)$" }, weight: 3 },
    // the trace's gap: one route named. The menu's Download / Fork also serialise the notebook. 0 of 16
    // mimo-v2.5-pro runs (base and three candidate changes) named it: a gradient, not a fix check.
    { name: "answer_matches", args: { pattern: "downloadAnchor|forkAnchor|lp2_menu_defaults|\\bDownload\\b|\\bFork\\b" }, weight: 1 },
    // exportToHTML described from its source, which includes the file attachments
    { name: "answer_matches", args: { pattern: "attachment", flags: "i" }, weight: 1 },
  ],
  // Reads the two save entry points and the exporter's export path, then answers.
  oracle: [
    { tool: "grep", args: { pattern: "exportToHTML|downloadAnchor|forkAnchor", path: "/src" } },
    { tool: "read_file", args: { file_path: "/src/@tomlarkworthy/save-in-place.js" } },
    { tool: "grep", args: { pattern: "function _(exportToHTML|module_specs|book|getFileAttachments)\\(", path: "/src/@tomlarkworthy/exporter-3.js" } },
    { assistant: "It serialises itself with exporter-3. Two menu routes call it: save-in-place's `sip_save` (\"Save in place\": `sip_handleStore` keeps the file handle, then `exportToHTML` output is written over the file) and lopepage-2's `lp2_menu_defaults` (\"Download\" / \"Fork\" via exporter-3's `downloadAnchor` / `forkAnchor`). `exportToHTML` runs `module_specs`, which emits each module's source plus its file attachments (`getFileAttachments`), and `book` assembles them with the runtime and bootloader into one HTML file." },
  ],
};
