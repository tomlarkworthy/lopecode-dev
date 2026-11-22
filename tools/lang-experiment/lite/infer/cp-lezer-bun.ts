// bun only: `codemirror` as the notebook has it, for cp-lezer.ts. The attachment codemirror_javascript@5.js.gz of
// @tomlarkworthy/codemirror-6-v2 in the build's input (lopecode/notebooks/quick_start.html), gunzipped once to
// soundscript/.scratch under its hash and loaded on the first read. In the notebook the checker module imports
// `codemirror` from @tomlarkworthy/codemirror-6-v2 instead (soundscript/ts-cells.ts), and this file is not a cell.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { blockContent } from "../../../lib/notebook-blocks.ts";

const NOTEBOOK = join(import.meta.dir, "../../../../lopecode/notebooks/quick_start.html");
const ID = "@tomlarkworthy/codemirror-6-v2/codemirror_javascript%405.js.gz";
let lib: { tsxLanguage: unknown; typescriptLanguage: unknown } | null = null;
function load() {
  if (lib) return lib;
  const b64 = blockContent(readFileSync(NOTEBOOK, "utf8"), ID);
  if (b64 === null) throw new Error(`${NOTEBOOK} has no ${ID}`);
  const file = join(import.meta.dir, `../soundscript/.scratch/codemirror_javascript-${Bun.hash(b64).toString(36)}.js`);
  if (!existsSync(file)) {
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, Bun.gunzipSync(Buffer.from(b64.trim(), "base64")));
  }
  return (lib = createRequire(import.meta.url)(file));
}
export const codemirror = { get tsxLanguage() { return load().tsxLanguage; }, get typescriptLanguage() { return load().typescriptLanguage; } };
