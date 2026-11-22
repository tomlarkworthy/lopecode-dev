// Type erasure over the typed tree, for the browser where Bun.Transpiler is absent.
// Covers what the specification (@tomlarkworthy/soundscript-spec) allows in cells.ts: annotations, type parameters and arguments, type
// aliases, interfaces, `import type`, `as const`, optional-parameter `?`, and `export`. The work is the cell tcErase
// (lite/toolchain/tc-cuts.ss.ts), through ss-toolchain.ts.
import { TOOLCHAIN } from "../toolchain/ss-toolchain.ts";

export const erase = (src: string): string => TOOLCHAIN.erase(src);
