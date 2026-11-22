// bun show-consumer.ts: the value of cell c (a consumer reading a's function twice in one run) for the consumer programs
import { progs } from "./progs.ts";
import { runCells } from "../proto/tree/lite/browser/run.ts";
process.on("unhandledRejection", () => {});
for (const p of progs.filter((p: any) => p.mech === "consumer")) {
  const prog = runCells(p.src, { tsx: true });
  await prog.settle(3000);
  console.log(`${p.name}: c = ${JSON.stringify(prog.value("c"))} status ${prog.status("c")}`);
  prog.dispose();
}
process.exit(0);
