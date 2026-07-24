import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const rotateAbout = await m.value("rotateAbout"), opsLens = await m.value("opsLens");
const base = opsLens.get("");
console.log("emitted string for rotate 45 about (60,52):", JSON.stringify(opsLens.put(rotateAbout(base,45,60,52), "")));
