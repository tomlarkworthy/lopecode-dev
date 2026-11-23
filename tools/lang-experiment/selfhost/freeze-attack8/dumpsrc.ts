// bun dumpsrc.ts <file exporting srcs or cands> <name>: compileModule's text of each cell (what runCells takes)
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const [f, name] = process.argv.slice(2);
const m = await import(new URL(f!, `file://${process.cwd()}/`).pathname);
const src = m.srcs ? m.srcs.find((s: any) => s[0] === name)?.[1] : m.cands.find((c: any) => c.name === name)?.src;
if (!src) throw new Error("no such program");
for (const v of compileModule(src, true, null)) console.log(`-- ${v.name}\n${v.definition}`);
