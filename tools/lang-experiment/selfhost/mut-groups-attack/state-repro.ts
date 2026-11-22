// bun state-repro.ts: the smallest state program, run as the harness runs it; the state cell is rejected at run time
import { runCells } from "../mut-groups/base/lite/browser/run.ts";
const p = runCells(`const s = () => state([1]);
const a = (s: State<number[]>) => action(() => {
  s.set([2]);
});
const v = (s: number[]) => s;`, { tsx: true });
await p.settle(1000);
console.log(p.status("s"), p.error("s"), p.status("a"), p.status("v"));
p.dispose();
