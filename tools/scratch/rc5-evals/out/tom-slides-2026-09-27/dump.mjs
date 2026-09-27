import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("./session.js", import.meta.url), "utf8");
const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
const defs = [];
const main = { variable: () => ({ define: (n, d, f) => { defs.push([n, d, f]); return { pid: null }; } }), define: () => {} };
mod.default({ module: () => main, fileAttachments: () => {} }, () => null);
const turns = defs.filter(([n]) => typeof n === "string" && n.startsWith("turn_")).map(([n, d, f]) => f()).sort((a, b) => a.created.localeCompare(b.created));
writeFileSync(new URL("./turns.json", import.meta.url), JSON.stringify(turns, null, 1));
for (const t of turns) {
  console.log(`\n=== ${t.id} ${t.created} -> ${t.completed} ${t.status} ${t.error ?? ""}`);
  for (const m of t.messages) {
    const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (m.role === "assistant") {
      const calls = (m.tool_calls || []).map(x => { let a = x.function.arguments; try { const o = JSON.parse(a); a = o.code ? "code: " + o.code : JSON.stringify(o); } catch {} return x.function.name + " " + a.replace(/\s+/g, " ").slice(0, 260); });
      console.log(`A${m.reasoning ? "[r" + m.reasoning.length + "]" : ""} ${String(c ?? "").replace(/\s+/g, " ").slice(0, 300)} ${calls.map(x => "\n   >> " + x).join("")}`);
    } else if (m.role === "tool") console.log(`   <- ${String(c).replace(/\s+/g, " ").slice(0, 260)}`);
    else console.log(`${m.role[0].toUpperCase()} ${String(c).replace(/\s+/g, " ").slice(0, 400)}`);
  }
}
