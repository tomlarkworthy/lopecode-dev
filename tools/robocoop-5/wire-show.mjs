// Prints the messages the notebook added (system/tool/user), from the last request of a wire-snapshot --raw dump.
import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync(process.argv[2], "utf8"));
const max = +(process.argv[3] ?? 600);
const bodies = r.bodies ?? r;
const seen = new Set(); let n = 0;
for (const [i, b] of bodies.entries()) for (const [j, m] of b.messages.entries()) {
  const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
  const key = j + "|" + m.role + "|" + c + JSON.stringify(m.tool_calls ?? "");
  if (seen.has(key) || j === 0) continue; seen.add(key);
  const call = m.tool_calls ? " CALL " + m.tool_calls.map((t) => t.function.name + " " + t.function.arguments.slice(0, 90)).join(" | ") : "";
  console.log(`--- req ${i} msg ${j} ${m.role} (${(c ?? "").length})${call}`);
  if (c && c !== "null") console.log(c.length > max ? c.slice(0, max) + " …[+" + (c.length - max) + "]" : c);
}
