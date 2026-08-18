import { readFileSync, readdirSync } from "node:fs";
const dir = process.argv[2];
const rows = [];
for (const f of readdirSync(dir).sort()) {
  const t = JSON.parse(readFileSync(dir + "/" + f, "utf8"));
  let specWrites = 0, solWrites = 0, scPass = 0, scFail = 0, rej = 0, waivers = [], ungrounded = 0, guardNoTool = 0;
  const conv = t.conversation || [];
  for (const m of conv) {
    if (m.role === "assistant" && m.tool_calls) for (const c of m.tool_calls) {
      let a = {}; try { a = JSON.parse(c.function.arguments); } catch {}
      const fp = a.file_path || "";
      if (/write_file|edit_file/.test(c.function.name)) {
        if (/spec\.js$/.test(fp)) specWrites++;
        else if (/solution\.js$/.test(fp)) solWrites++;
      }
      if (c.function.name === "task_complete" && /SPEC-WAIVER/.test(String(a.summary || ""))) waivers.push(String(a.summary));
    }
    if (m.role === "tool") {
      const s = String(m.content || "");
      if (/✓ spec scorecard/.test(s)) scPass++;
      if (/spec scorecard \d+\/\d+ FAILING/.test(s)) scFail++;
      if (/REJECTED: the spec scorecard/.test(s)) rej++;
      if (/UNGROUNDED/.test(s)) ungrounded++;
      if (/REJECTED: you have made NO tool calls/.test(s)) guardNoTool++;
    }
  }
  rows.push({ f, steps: t.steps, pass: t.pass, specWrites, solWrites, scPass, scFail, rej, ungrounded, guardNoTool, waivers });
}
for (const r of rows) console.log(`${r.f.padEnd(24)} steps=${String(r.steps).padStart(2)} pass=${r.pass} specW=${r.specWrites} solW=${r.solWrites} sc✓=${r.scPass} scFAIL=${r.scFail} REJ=${r.rej} ungrounded=${r.ungrounded} noToolGuard=${r.guardNoTool}${r.waivers.length ? " WAIVER!" : ""}`);
for (const r of rows) for (const w of r.waivers) console.log("\n--- WAIVER in " + r.f + ":\n" + w.slice(0, 1200));
