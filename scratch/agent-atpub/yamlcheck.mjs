import YAML from "./../../tools/paseo-run/node_modules/yaml/dist/index.js";
import { readFileSync } from "fs";
for (const p of process.argv.slice(2)) {
  const d = YAML.parse(readFileSync(p, "utf8"));
  const job = d.jobs.publish;
  console.log(p, "OK · on:", JSON.stringify(d.on ?? d[true]), "· concurrency:", JSON.stringify(d.concurrency),
    "· steps:", job.steps.length, job.steps.map(s => s.name ?? s.uses).join(" | "));
}
