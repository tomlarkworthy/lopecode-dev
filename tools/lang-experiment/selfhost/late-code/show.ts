// bun selfhost/late-code/show.ts <job key>...: print a job's cell text with line numbers
import { jobs } from "./corpus.ts";
const want = new Set(process.argv.slice(2));
for (const j of jobs()) if (want.has(j.key)) { console.log(`== ${j.key}`); (j.src?.cells ?? "").split("\n").forEach((l, i) => console.log(`${String(i + 1).padStart(3)} ${l}`)); }
