// bun appendix.ts > silent-programs.txt: the full source of every program silent in out-b.txt, with its drive line
import { readFileSync } from "node:fs";
const out = readFileSync("out-b.txt", "utf8").split("\n");
const silent = out.filter((l) => l.startsWith("SILENT ")).map((l) => l.slice(7));
const lineOf = (n: string) => { const i = out.findIndex((l) => l.startsWith(`== ${n}:`)); return out.slice(i + 1, i + 4).filter((l) => l.includes("drive ->") || l.includes("CHANGED")).map((l) => l.trim()).join(" | "); };
for (const s of silent) {
  const [f, name] = s.split(":") as [string, string];
  const { cands } = await import(`./${f}`);
  const c = cands.find((x: any) => x.name === name);
  console.log(`### ${name} (${f})\n\`\`\`\n${c.src}\n\`\`\`\nB: ${lineOf(s)}\n`);
}
