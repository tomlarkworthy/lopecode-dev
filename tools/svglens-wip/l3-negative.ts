import { importNotebookModule } from "../notebook-import.ts";
const acorn = await import("../node_modules/acorn/dist/acorn.mjs");
const m = await importNotebookModule("tools/svglens-wip/rogue.js", { overrides: { acorn } });
try { console.log("UNEXPECTED PASS:", await m.value("test_tools_write_through_the_delta")); }
catch (e) { console.log("correctly rejected:", e.message); }
