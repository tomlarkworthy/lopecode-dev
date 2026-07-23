import { importNotebookModule } from "../notebook-import.ts";
const acorn = await import("../node_modules/acorn/dist/acorn.mjs");
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js", { overrides: { acorn } });
console.log(await m.value("test_tools_measure_through_ctx"));
console.log(await m.value("test_tools_write_through_the_delta"));
