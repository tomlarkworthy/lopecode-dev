// compileCell, and the compiled form of an `import type` statement, which the shipped toolchain refuses
// ("unsupported top-level statement (ImportDeclaration)"): a variable that holds the statement in its header,
// as a type cell does (`void /*{lang:"ss"}*//*ss^{"d":...}*/0`), so decompileVariable recovers it unchanged.
import { parse } from "../../lite/parse.ts";
import { compileCell, LANG, type Context } from "../../lite/toolchain/ss-toolchain.ts";

export function importTypeLocals(text: string): string[] | null {
  let st: any;
  try { const b = parse(text).program.body; if (b.length !== 1) return null; st = b[0]; } catch { return null; }
  if (st.type !== "ImportDeclaration" || st.importKind !== "type") return null;
  return st.specifiers.map((s: any) => s.local.name);
}
export function compileTi(text: string, ctx: Context, key: string | null = null) {
  const locals = importTypeLocals(text);
  if (locals === null) return compileCell(text, true, ctx, key);
  const name = `$ss$import$${locals.join("$")}`;
  const header = `/*ss^${JSON.stringify({ d: text }).replaceAll("*/", "*\\/")}*/`;
  return [{ name, inputs: [] as string[], definition: `function _${name}() {return (void ${LANG}${header}0);}` }];
}
