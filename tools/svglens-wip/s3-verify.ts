import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
console.log(await m.value("test_shape_registry"));
const shapes = await m.value("svgShapes");
console.log("entries:", shapes.map((e: any) => `${e.mode}[${e.tags}] -> ${e.writes}${e.rotatable ? " +rot" : ""}`).join("\n          "));
