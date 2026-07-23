import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
console.log(await m.value("test_pen_path"));
const pen = await m.value("penPath");
// what three anchors look like: click, drag, click
let d = pen.start(10, 10);
d = pen.curveTo(d, [20, 0], pen.mirror([40, 10], [50, 0]), 40, 10);   // dragged anchor
d = pen.curveTo(d, [50, 0], [70, 40], 70, 40);                        // click after a drag
console.log(d);
console.log(pen.close(d));
