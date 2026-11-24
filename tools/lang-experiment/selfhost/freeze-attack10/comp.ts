// bun comp.ts '<src>': the compiled module text of a program (compileModule, no facts)
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const src = process.argv[2]!;
for (const v of compileModule(src, true, null)) console.log(`--- ${v.name}\n${v.definition}`);
