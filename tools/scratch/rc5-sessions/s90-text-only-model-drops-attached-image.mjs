// Probe (rc5-train 20260929-0620-m74): an image a tool feeds in through ctx.attachImage must not break the
// session when the model takes text only. No model: the engine's own makeSession with a scripted client that
// answers like OpenRouter does for xiaomi/mimo-v2.5-pro (input_modalities ['text']): any request carrying an
// image_url part is refused with "404: No endpoints found that support image input" (curl, 2026-09-29).
// Turn 1: step 0 calls a registered tool that attaches a PNG; the turn must go on, and the model must be told
// the image was not shown. Turn 2 (plain text) must also go through: the image must not stay in the history.
// Turn 3: a 404 with no image left to drop is thrown after one call (no retry loop).
//   node tools/scratch/rc5-sessions/s90-text-only-model-drops-attached-image.mjs <notebook.html>      (run from the repo root)
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
    const inputs = msV._inputs.map(i => i._value);
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    const shot = { id: "probe_shot", description: "probe", parameters: { type: "object", properties: {} },
      execute: async (a, ctx) => { ctx.attachImage(PNG); return { output: "Screenshot attached; it is visible to you on your next step." }; } };
    H.byName("registerTool")(shot);
    await new Promise(r => setTimeout(r, 100));
    const calls = [];
    const script = [
      { tool_calls: [{ id: "c1", type: "function", function: { name: "probe_shot", arguments: "{}" } }] },
      { tool_calls: [{ id: "c2", type: "function", function: { name: "task_complete", arguments: JSON.stringify({ summary: "done" }) } }] },
    ];
    let k = 0;
    const hasImage = ms => ms.some(m => Array.isArray(m.content) && m.content.some(p => p && p.type === "image_url"));
    const client = {
      chat: async ({ messages }) => {
        const img = hasImage(messages);
        calls.push({ img, tail: messages.slice(-3).map(m => m.role + ": " + (typeof m.content === "string" ? m.content : JSON.stringify(m.content)).slice(0, 240)) });
        if (img) throw new Error("OpenRouter 404: No endpoints found that support image input");
        return { message: { role: "assistant", content: null, ...script[Math.min(k++, script.length - 1)] } };
      },
    };
    inputs[0] = client;
    const session = msV._definition(...inputs)();
    const res = {};
    try { const r = await session.send("probe turn 1"); res.turn1 = r.finishReason; } catch (e) { res.turn1 = "THREW " + e.message; }
    k = 1;
    try { const r = await session.send("probe turn 2"); res.turn2 = r.finishReason; } catch (e) { res.turn2 = "THREW " + e.message; }
    // Turn 3: the provider keeps refusing with no image left to drop — must throw, not loop.
    let always404 = false;
    const inner = client.chat;
    client.chat = async (a) => { if (always404) { calls3++; throw new Error("OpenRouter 404: No endpoints found that support image input"); } return inner(a); };
    let calls3 = 0; always404 = true;
    try { const r = await session.send("probe turn 3"); res.turn3 = r.finishReason; } catch (e) { res.turn3 = "THREW " + e.message.slice(0, 60); }
    res.turn3Calls = calls3;
    H.byName("unregisterTool")(shot.id, shot);
    const told = calls.some(c => !c.img && c.tail.some(t => /image/i.test(t) && /(not|no|cannot|can't|text[- ]only)/i.test(t) && !/visible to you on your next step\.?$/.test(t)));
    return { ...res, calls, toldNotShown: told };
  });
} finally {
  await close();
}
console.log(JSON.stringify(out, null, 1));
const pass = out.turn1 === "completed" && out.turn2 === "completed" && out.toldNotShown && /^THREW/.test(out.turn3) && out.turn3Calls === 1;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
