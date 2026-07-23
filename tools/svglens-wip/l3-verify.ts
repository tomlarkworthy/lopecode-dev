import { importNotebookModule } from "../notebook-import.ts";
const acorn = await import("../node_modules/acorn/dist/acorn.mjs");
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js", { overrides: { acorn } });
console.log(await m.value("test_tools_write_through_the_delta"));

// negative control: the law must actually fail when a tool writes outside the delta
const tools = await Promise.all(["toolDraw","toolPen","toolTransform","toolVertex","toolMove","toolMarquee","toolStructure"].map(n => m.value(n)));
const rogue = { id: "rogue", onPointerMove(ctx, e) { ctx.elems()[0].setAttribute("x", 1); } };
const cell = (await m.value("test_tools_write_through_the_delta"));
console.log("law value type:", typeof cell);
