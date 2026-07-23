import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
for (const t of ["test_group_ungroup", "test_copy_paste", "test_align_commands"])
  console.log(await m.value(t));
