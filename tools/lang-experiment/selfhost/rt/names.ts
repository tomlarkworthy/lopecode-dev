// The generated modules' named variables and which are SoundScript (ss language tag). bun selfhost/rt/names.ts
import { compiler } from "../../../spec-notebook.ts";
import { generate, ENTRY } from "../../lite/soundscript/ts-cells.ts";
import { langOf } from "../../lite/toolchain/ss-toolchain.ts";
const { compile, dispose } = await compiler();
const g = generate(compile, Object.keys(await import(ENTRY)).filter((k) => k !== "default").sort());
dispose();
for (const m of ["runtime", "checker"] as const) {
  const vs = g[m].flatMap((src) => compile(src)).filter((v: any) => v._name);
  const ss = vs.filter((v: any) => langOf(String(v._definition)) === "ss");
  console.log(`${m}: ${g[m].length} cells, ${vs.length} named, ${ss.length} SoundScript: ${ss.map((v: any) => `${v._name}[${(v._inputs ?? []).join(",")}]`).join(" ")}`);
}
