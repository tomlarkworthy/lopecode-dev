// Probe (rc5-train 20260929-0620-m44): a tool registered mid-session must be announced to the agent.
// No model: builds a session from the engine's own makeSession with a scripted client. Turn 1, step 0
// reads a file; before step 1 a tool is registered through robocoop-5-tools registerTool (as a user
// module's cell would). The messages the client receives at step 1 must carry a notice naming the new
// tool; turn 2, after unregistering, must name its removal; a step with no change must say nothing.
//   node tools/scratch/rc5-sessions/s72-tools-change-notice.mjs <notebook.html>   (run from the repo root)
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
let out;
try {
  out = await page.evaluate(async () => {
    const H = window.__nbHelpers;
    ["toolsView", "hostSetup", "makeSession", "registerTool"].forEach(n => H.force(n));
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10 && typeof H.byName("makeSession") === "function")) await new Promise(r => setTimeout(r, 300));
    const msV = H.allVars().find(v => v._name === "makeSession" && v._definition?.name === "_makeSession");
    // same cell, a scripted client in place of `client`
    const inputs = msV._inputs.map(i => i._value);
    const seen = [];
    let n = 0, prevLen = 0;
    const script = [
      { tool_calls: [{ id: "c1", type: "function", function: { name: "read_file", arguments: JSON.stringify({ file_path: "/content/bootconf.json", limit: 2 }) } }] },
      { tool_calls: [{ id: "c2", type: "function", function: { name: "read_file", arguments: JSON.stringify({ file_path: "/content/bootconf.json", limit: 2 }) } }] },
      { tool_calls: [{ id: "c3", type: "function", function: { name: "task_complete", arguments: JSON.stringify({ summary: "done" }) } }] },
      { tool_calls: [{ id: "c4", type: "function", function: { name: "task_complete", arguments: JSON.stringify({ summary: "done" }) } }] },
    ];
    const register = H.byName("registerTool"), unregister = H.byName("unregisterTool");
    const probeTool = { id: "probe_lookup", description: "probe", parameters: { type: "object", properties: {} }, execute: async () => ({ output: "x" }) };
    const client = {
      chat: async ({ messages, tools }) => {
        const step = n++;
        const fresh = messages.slice(prevLen);
        prevLen = messages.length;
        seen.push({ step, notices: fresh.filter(m => m.role === "system" && /^Watch updates/.test(m.content)).map(m => m.content), toolNames: tools.map(t => t.function?.name) });
        if (step === 0) register(probeTool);   // registered while step 0's tool runs
        return { message: { role: "assistant", content: null, ...script[Math.min(step, script.length - 1)] } };
      },
    };
    inputs[0] = client;
    const session = msV._definition(...inputs)();
    await session.send("probe turn 1");
    unregister(probeTool.id, probeTool);
    await new Promise(r => setTimeout(r, 50));
    await session.send("probe turn 2");
    const all = seen.map(s => ({ step: s.step, notice: s.notices.join(" | ").slice(0, 300), offered: s.toolNames.includes("probe_lookup") }));
    const hasAdd = s => /probe_lookup/.test(s.notice) && /\+/.test(s.notice);
    return {
      steps: all,
      offeredAtStep1: all[1]?.offered === true,
      announcedAtStep1: !!all[1] && hasAdd(all[1]),
      quietAtStep0: !!all[0] && !/tools =/.test(all[0].notice),
      quietAtStep2: !!all[2] && !/tools =/.test(all[2].notice),
      removalAnnounced: !!all[3] && /probe_lookup/.test(all[3].notice) && !all[3].offered,
    };
  });
} finally {
  await close();
}
console.log(JSON.stringify(out, null, 1));
const pass = out.offeredAtStep1 && out.announcedAtStep1 && out.quietAtStep0 && out.quietAtStep2 && out.removalAnnounced;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
