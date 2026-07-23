import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("tools/svglens-wip/broken.js");
try { console.log("NO FAILURE:", await m.value("test_shape_registry")); }
catch (e) { console.log("caught as expected:", String(e).split("\n")[0]); }
