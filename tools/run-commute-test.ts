import { importNotebookModule } from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
for (const name of ["test_commands_commute", "test_attrTextLens_laws", "test_structural_commands"]) {
  try { console.log(name, "=>", await m.value(name)); }
  catch (e) { console.log(name, "=> FAIL:", e.message.slice(0, 200)); }
}
