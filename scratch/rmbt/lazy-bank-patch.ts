import { readFileSync, writeFileSync } from "fs";
const P = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(P, "utf8");
const before = (s.match(/\$def\(/g) || []).length;
if (before !== 178) throw new Error("$def count " + before + ", expected 178");

const CELL = `const _hexbanklazy = async function _hexFrameBank(runtime, importShim)
{
  // lazy: a static import of this module holds the whole page mount until its
  // 8.6MB of frames have streamed (8.7s -> 4.6s at 1.7MB/s, measured 2026-08-13)
  const { default: define } = await importShim("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4");
  return runtime.module(define).value("hexFrameBank");
};
`;
const anchor = "\nexport default function define(";
if (!s.includes(anchor)) throw new Error("export default not found");
s = s.replace(anchor, "\n" + CELL + anchor);

const MOD = `  main.define("module @tomlarkworthy/coded-landmark-tracking-data", async () => runtime.module((await import("/@tomlarkworthy/coded-landmark-tracking-data.js?v=4")).default));`;
const IMP = `  main.define("hexFrameBank", ["module @tomlarkworthy/coded-landmark-tracking-data", "@variable"], (_, v) => v.import("hexFrameBank", _));`;
for (const x of [MOD, IMP]) if (!s.includes(x)) throw new Error("not found: " + x.slice(0, 60));
s = s.replace(MOD + "  \n", "");
s = s.replace(MOD + "\n", "");
s = s.replace(IMP, `  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));
  $def("_hexbanklazy", "hexFrameBank", ["runtime","importShim"], _hexbanklazy);`);

if (s.includes("coded-landmark-tracking-data\", \"@variable\"")) throw new Error("static import survived");
const after = (s.match(/\$def\(/g) || []).length;
if (after !== 179) throw new Error("$def count now " + after + ", expected 179");
if (!s.includes(`main.builtin("FileAttachment"`)) throw new Error("FileAttachment builtin lost");
writeFileSync(P, s);
console.log("patched; $def", before, "->", after);
