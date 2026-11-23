// bun dump.ts <set.ts> <name>: the compiled definition of each cell of one program, as runCells takes it (compileModule)
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const [f, name] = process.argv.slice(2);
const { cands } = await import(new URL(f!, `file://${process.cwd()}/`).pathname);
const p = cands.find((c: any) => c.name === name);
for (const v of compileModule(p.src, true, null)) console.log(`-- ${v.name}\n${v.definition}`);
