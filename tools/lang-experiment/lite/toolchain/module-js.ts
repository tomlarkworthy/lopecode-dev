// The variables and imports of a notebook module block (the exporter's `export default function define`), read
// from its parse: each `$def(pid, name, inputs, _fn)` call with the text of `const _fn = ...`, and each
// `main.define(name, ["module M", "@variable"], (_, v) => v.import(remote?, local, _))`. The work is the cells of
// tc-modjs.ss.ts, through ss-toolchain.ts.
import { TOOLCHAIN } from "./ss-toolchain.ts";

export type ModuleVar = { pid: string; name: string | null; inputs: string[]; definition: string };
export type ModuleImport = { from: string; remote: string; local: string };
export const moduleJs = (src: string): { variables: ModuleVar[]; imports: ModuleImport[] } => TOOLCHAIN.moduleJs(src);
export const syntaxStub = (definition: string): string | null => TOOLCHAIN.syntaxStub(definition);
