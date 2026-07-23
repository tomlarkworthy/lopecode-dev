import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");

const cmds = await m.value("svgCommands");
console.log("commands:", cmds.map((c: any) => `${c.id}${c.key ? " (" + c.key + ")" : ""}`).join(", "));

const groupElements = await m.value("groupElements");
const ungroupElements = await m.value("ungroupElements");
const ungroupBlockers = await m.value("ungroupBlockers");
const copyMarkup = await m.value("copyMarkup");
const pasteMarkup = await m.value("pasteMarkup");
const freshenIds = await m.value("freshenIds");
const idsIn = await m.value("idsIn");
const offsetMarkup = await m.value("offsetMarkup");

const SRC = `<svg viewBox="0 0 100 100">
  <!-- the house -->
  <rect x="10" y="20" width="30" height="40" fill="#5B7A5E"/>
  <circle cx="70" cy="30" r="12" fill="#F5B840"/>
  <polygon points="10,90 30,70 50,90" fill="#8B4A3A"/>
</svg>`;

console.log("\n--- group [0,1] + [0,2] ---");
const g = groupElements(SRC, [[0, 1], [0, 2]]);
console.log(g);

console.log("\n--- ungroup it back ---");
const u = ungroupElements(g, [0, 1]);
console.log(u);
console.log("round trip modulo whitespace:",
  u.replace(/\s+/g, " ") === SRC.replace(/\s+/g, " "), "| byte-identical:", u === SRC);

console.log("\n--- ungroup pushes a transform down ---");
const T = `<svg viewBox="0 0 100 100">
  <g transform="translate(5 5)">
    <rect x="1" y="2" width="3" height="4"/>
    <circle cx="9" cy="9" r="1" transform="rotate(10)"/>
  </g>
</svg>`;
console.log(ungroupElements(T, [0, 0]));

console.log("\n--- blockers ---");
console.log("bare g   :", ungroupBlockers(`<svg><g><rect/></g></svg>`, [0, 0]));
console.log("g opacity:", ungroupBlockers(`<svg><g opacity="0.5"><rect/></g></svg>`, [0, 0]));
console.log("a rect   :", ungroupBlockers(SRC, [0, 0]));

console.log("\n--- copy / paste-in-place ---");
const clip = copyMarkup(SRC, [[0, 0]]);
console.log("payload:", JSON.stringify(clip));
const pasted = pasteMarkup(SRC, [0], null, clip);
console.log(pasted);
console.log("the original is untouched:", pasted.includes(clip[0]));

console.log("\n--- id fixup ---");
const IDS = `<svg><defs><linearGradient id="grad"/></defs><rect id="r" fill="url(#grad)"/></svg>`;
const both = copyMarkup(IDS, [[0, 0], [0, 1]]);
console.log(freshenIds(both, idsIn(IDS)));
console.log("outward reference is left alone:",
  freshenIds([`<rect fill="url(#grad)"/>`], idsIn(IDS)));

console.log("\n--- offset ---");
console.log(offsetMarkup(`<rect x="1" y="2"/>`, 8, 8));
console.log(offsetMarkup(`<rect transform="translate(2 3) rotate(9)"/>`, 8, 8));
