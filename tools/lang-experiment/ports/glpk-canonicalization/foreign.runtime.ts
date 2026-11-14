// mathjs 15.2.0, loaded as baseline/baseline.ts and @tomlarkworthy/mathjs _math load it, and the two
// node constructors as plain functions. Nothing of the module's own logic lives here.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(HERE, "../../baseline/node_modules/mathjs/lib/browser/math.js"), "utf8");
const mod: { exports: any } = { exports: {} };
new Function("module", "exports", src)(mod, mod.exports);
export const math = mod.exports;
if (math.version !== "15.2.0") throw new Error(`mathjs ${math.version}, expected 15.2.0`);

export default {
  math,
  OperatorNode: (op: string, fn: string, args: unknown[], implicit?: boolean, isPercentage?: boolean) =>
    new math.OperatorNode(op, fn, args, implicit, isPercentage),
  ConstantNode: (value: unknown) => new math.ConstantNode(value),
};
