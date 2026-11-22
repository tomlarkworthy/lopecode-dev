// bun show-compiled.ts <batch.ts> <name>: the compiled definition of each cell of one candidate (tc-build), to show which take out(v, 1)
import { compileModule } from "../../lite/toolchain/ss-toolchain.ts";
const { attacks } = await import(new URL(process.argv[2]!, `file://${process.cwd()}/`).pathname);
const a = attacks.find((x: { name: string }) => x.name === process.argv[3]);
for (const v of compileModule(a.src, true)) console.log(`${v.name} [${v.inputs.join(",")}]: ${v.definition.replace(/\/\*[^*]*\*\//g, "").slice(0, 400)}`);
