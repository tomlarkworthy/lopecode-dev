#!/usr/bin/env bun
// Build variants of the dumped kernel by swapping whole top-level `const NAME = ...;`
// definitions for candidate replacements. Textual, so a variant cannot drift from
// the kernel it was built from, and the swap is exactly what would be pushed to
// the notebook cell if it wins.
import { readFileSync, writeFileSync, existsSync } from "fs";

const replace = (src: string, name: string, body: string) => {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`const ${name} = `));
  if (start < 0) throw new Error(`no top-level const ${name}`);
  let end = start;
  while (end < lines.length && lines[end] !== "};" && lines[end] !== "}") end++;
  if (end >= lines.length) throw new Error(`no close for ${name}`);
  return [...lines.slice(0, start), body.trimEnd(), ...lines.slice(end + 1)].join("\n");
};

const COUNT_LEAVES = ["templateAtOffset", "fitMobiusLS", "dpAlignFast", "xFromK", "crossRatio"];

const build = (out: string, patches: string[], counting = false) => {
  let src = readFileSync("scratch/rmbt/kernel.js", "utf8");
  for (const p of patches) {
    const file = `scratch/rmbt/patches/${p}.js`;
    if (!existsSync(file)) throw new Error(`missing patch ${file}`);
    src = replace(src, p, readFileSync(file, "utf8"));
  }
  if (counting) {
    for (const n of COUNT_LEAVES)
      src = src.replace(`const ${n} = function ${n}(`, `const ${n}_raw = function ${n}_raw(`);
    src += `
export const __C = { ${COUNT_LEAVES.map((n) => `${n}: 0`).join(", ")}, mobPts: 0, dpCells: 0 };
export const __reset = () => { for (const k in __C) __C[k] = 0; };
const templateAtOffset = (t, d) => { __C.templateAtOffset++; return templateAtOffset_raw(t, d); };
const fitMobiusLS = (p) => { __C.fitMobiusLS++; __C.mobPts += p.length; return fitMobiusLS_raw(p); };
const dpAlignFast = (t, N, s, M, g, m) => { __C.dpAlignFast++; __C.dpCells += N * M; return dpAlignFast_raw(t, N, s, M, g, m); };
const xFromK = (a, b) => { __C.xFromK++; return xFromK_raw(a, b); };
const crossRatio = (a, b, c, d) => { __C.crossRatio++; return crossRatio_raw(a, b, c, d); };
`;
  }
  writeFileSync(out, src);
  console.log("wrote", out);
};

const args = process.argv.slice(2);
const counting = args.includes("--count");
const patches = args.filter((a) => !a.startsWith("--"));
build(counting ? "scratch/rmbt/kernel-count.js" : "scratch/rmbt/kernel-opt.js", patches, counting);
