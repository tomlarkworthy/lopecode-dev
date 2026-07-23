import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const groupElements = await m.value("groupElements");
const ungroupElements = await m.value("ungroupElements");

const doc = `<svg viewBox="-2 9 641 460">
  <!-- Y10b  -->
  <polygon points="1,2 3,4"/>
  <rect x="16" y="0"
    width="99" height="67" transform="rotate(-2)"/>
</svg>`;
const g = groupElements(doc, [[0, 0], [0, 1]]);
console.log("--- grouped ---\n" + g);
const back = ungroupElements(g, [0, 0]);
console.log("--- back ---\n" + back);
console.log("identical:", back === doc);
console.log(JSON.stringify(doc));
console.log(JSON.stringify(back));
