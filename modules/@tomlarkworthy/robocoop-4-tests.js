// @tomlarkworthy/robocoop-4-tests — in-notebook test_* cells for the agent core.
//
// The notebook is canonical for tests too: these test_* cells are scanned/run by
// @tomlarkworthy/tests (throw = fail). Node CI loads this HTML and runs them headlessly via
// loadNotebook + runTests('test_rc4_'), mirroring observablejs-toolchain.test.js. Core functions
// are imported from @tomlarkworthy/robocoop-4-core; the fs test uses a real just-bash workspace
// (createWorkspace from justbash-session) so it exercises actual sed/cat in both environments.

const _title = function _title(md){return(
md`# robocoop-4-tests
Reactive \`test_rc4_*\` cells over the literate core. Throw to fail. Run via \`@tomlarkworthy/tests\`
in-browser, or \`loadNotebook + runTests('test_rc4_')\` in node CI.`
)};

// rc4_assert — tiny throw-on-false helper shared by the test cells.
const _rc4_assert = function _rc4_assert(){return(
  function rc4_assert(cond, msg){ if(!cond) throw new Error("assert failed: " + (msg||"")); return true; }
)};

// rc4_recordClient — wraps a scripted client to record the tool names offered to the model each step.
const _rc4_recordClient = function _rc4_recordClient(createScriptedClient){return(
  function rc4_recordClient(steps){
    const inner = createScriptedClient(steps);
    const offered = [];
    return { offered, chat: async (req) => { offered.push((req.tools||[]).map(t=>t.function.name)); return inner.chat(req); } };
  }
)};

// rc4_simpleTool — quick zero-arg tool factory for the registry tests.
const _rc4_simpleTool = function _rc4_simpleTool(defineTool){return(
  function rc4_simpleTool(id, output, onRun){
    return defineTool({ id, description:id, parameters:{type:"object",properties:{},additionalProperties:false},
      execute: async () => { if(onRun) onRun(); return { output }; } });
  }
)};

const _test_rc4_truncate = function _test_rc4_truncate(rc4_assert, truncate){
  rc4_assert(truncate("abc", 0) === "abc", "no limit passes through");
  const big = truncate("x".repeat(100), 20);
  rc4_assert(big.length < 100 && /truncated/.test(big), "long text capped with marker");
  return "ok";
};

const _test_rc4_formatResult = function _test_rc4_formatResult(rc4_assert, formatResult){
  rc4_assert(formatResult({stdout:"a\n",stderr:"",exitCode:0}) === "a", "trims trailing newline");
  rc4_assert(/\[exit 1\]/.test(formatResult({stdout:"",stderr:"boom",exitCode:1})), "non-zero exit appended");
  rc4_assert(formatResult(null) === "(no output)", "null → placeholder");
  return "ok";
};

const _test_rc4_defineTool = async function _test_rc4_defineTool(rc4_assert, defineTool){
  let threw=false; try { defineTool({description:"x",parameters:{},execute:()=>{}}); } catch { threw=true; }
  rc4_assert(threw, "missing id throws");
  const t = defineTool({id:"boom",description:"d",parameters:{type:"object",properties:{}},execute:async()=>{throw new Error("kaboom");}});
  const r = await t.execute({}, {});
  rc4_assert(/Error: kaboom/.test(r.output), "thrown error becomes output, not reject");
  return "ok";
};

const _test_rc4_session_persists = async function _test_rc4_session_persists(rc4_assert, createAgentSession, createScriptedClient){
  const client = createScriptedClient([{content:"hi"},{content:"again"}]);
  const s = createAgentSession({ client, tools:[], systemPrompt:"SP", model:"m" });
  await s.send("first"); await s.send("second");
  rc4_assert(s.messages.map(m=>m.role).join(",") === "system,user,assistant,user,assistant", "roles persist across turns");
  rc4_assert(s.messages.filter(m=>m.role==="system").length === 1, "single system message");
  return "ok";
};

// THE headline behaviour: a tool registered mid-conversation is offered + called on the next turn.
const _test_rc4_session_live_tool_add = async function _test_rc4_session_live_tool_add(rc4_assert, createAgentSession, rc4_recordClient, rc4_simpleTool){
  let extraRan=false; let registry=[rc4_simpleTool("noop","NOOP")];
  const client = rc4_recordClient([
    {content:"ready"},
    {tool_calls:[{id:"x1",name:"extra",arguments:{}}]},
    {content:"done"}
  ]);
  const s = createAgentSession({ client, toolsProvider:()=>registry, model:"m" });
  await s.send("hello");
  rc4_assert(JSON.stringify(client.offered[0])==='["noop"]', "only base tool before register");
  registry = registry.concat([rc4_simpleTool("extra","EXTRA-OK",()=>{extraRan=true;})]);
  await s.send("use extra");
  rc4_assert(client.offered.some(o=>o.includes("extra")), "new tool offered next turn");
  rc4_assert(extraRan, "new tool executed");
  rc4_assert(s.messages.some(m=>m.role==="tool"&&/EXTRA-OK/.test(m.content)), "tool reply threaded back");
  return "ok";
};

const _test_rc4_session_unknown_tool = async function _test_rc4_session_unknown_tool(rc4_assert, createAgentSession, createScriptedClient, rc4_simpleTool){
  const client = createScriptedClient([{tool_calls:[{id:"u1",name:"ghost",arguments:{}}]},{content:"ok"}]);
  const s = createAgentSession({ client, tools:[rc4_simpleTool("real","R")], model:"m" });
  const r = await s.send("go");
  rc4_assert(r.finishReason==="stop", "loop completes");
  rc4_assert(s.messages.some(m=>m.role==="tool"&&m.tool_call_id==="u1"&&/unknown tool ghost/.test(m.content)), "unknown tool → error reply");
  return "ok";
};

const _test_rc4_session_abort = async function _test_rc4_session_abort(rc4_assert, createAgentSession, createScriptedClient, rc4_simpleTool){
  const client = createScriptedClient([{tool_calls:[{id:"a1",name:"noop",arguments:{}}]},{content:"should-not-reach"}]);
  const s = createAgentSession({ client, tools:[rc4_simpleTool("noop","N")], model:"m" });
  const r = await s.send("go", { onToolResult: () => s.abort() });
  rc4_assert(r.finishReason==="aborted", "abort stops the loop");
  rc4_assert(!s.messages.some(m=>m.content==="should-not-reach"), "no further model turn");
  return "ok";
};

// Explicit-completion + nudge: a bare-text stall is NOT terminal — it is nudged; a real tool resets the
// stall counter; task_complete ends the turn with finishReason "completed" and a visible summary.
const _test_rc4_session_complete_and_nudge = async function _test_rc4_session_complete_and_nudge(rc4_assert, createAgentSession, createScriptedClient, rc4_simpleTool){
  const client = createScriptedClient([
    { content:"let me think about this" },                                   // bare text → nudge, not done
    { tool_calls:[{ id:"t1", name:"noop", arguments:{} }] },                 // real action → stalls reset
    { tool_calls:[{ id:"c1", name:"task_complete", arguments:{ summary:"all done" } }] }
  ]);
  const s = createAgentSession({ client, tools:[rc4_simpleTool("noop","N")], model:"m",
    completeToolName:"task_complete", stallNudgeLimit:1 });
  const r = await s.send("go");
  rc4_assert(r.finishReason==="completed", "ends via task_complete, finishReason completed");
  rc4_assert(s.messages.some(m=>m.role==="system"&&/without calling a tool/.test(m.content)), "bare turn was nudged");
  rc4_assert(s.messages.some(m=>m.role==="tool"&&m.content==="N"), "real tool ran after the nudge");
  rc4_assert(s.messages.some(m=>m.role==="tool"&&m.tool_call_id==="c1"&&m.content==="ok"), "task_complete got a tool reply");
  rc4_assert(s.messages.some(m=>m.role==="assistant"&&m.content==="all done"), "summary surfaced as final message");
  return "ok";
};

// Soft fallback: a model that keeps narrating without acting still terminates after stallNudgeLimit nudges.
const _test_rc4_session_nudge_fallback = async function _test_rc4_session_nudge_fallback(rc4_assert, createAgentSession, createScriptedClient){
  const client = createScriptedClient([{content:"a"},{content:"b"},{content:"c"},{content:"d"}]);
  const s = createAgentSession({ client, tools:[], model:"m", completeToolName:"task_complete", stallNudgeLimit:1 });
  const r = await s.send("go");
  rc4_assert(r.finishReason==="stop", "falls back to stop, no infinite loop");
  rc4_assert(s.messages.filter(m=>m.role==="system").length===1, "exactly one nudge before giving up");
  rc4_assert(r.steps<=3, "terminated promptly (≤3 steps), not run to the cap: " + r.steps);
  return "ok";
};

// Watch streaming: noticesProvider is drained at the top of each step and injected as a system message, so
// out-of-band updates (e.g. watched-variable changes) reach the model automatically.
const _test_rc4_session_watch_notices = async function _test_rc4_session_watch_notices(rc4_assert, createAgentSession, createScriptedClient, rc4_simpleTool){
  let queued = ["@user/m:total = 99"];                 // a pending watch update, delivered once
  const noticesProvider = () => { const out = queued; queued = []; return out; };
  const client = createScriptedClient([{tool_calls:[{id:"t1",name:"noop",arguments:{}}]},{content:"done"}]);
  const s = createAgentSession({ client, tools:[rc4_simpleTool("noop","N")], model:"m", noticesProvider });
  await s.send("go");
  rc4_assert(s.messages.some(m=>m.role==="system"&&/Watch updates/.test(m.content)&&/@user\/m:total = 99/.test(m.content)), "watch notice streamed into the loop");
  return "ok";
};

// A client.chat failure (e.g. OpenRouter 402 out-of-credits) must PROPAGATE out of send() so the UI can
// surface it — silent swallowing makes the agent look broken.
const _test_rc4_session_surfaces_client_error = async function _test_rc4_session_surfaces_client_error(rc4_assert, createAgentSession, rc4_simpleTool){
  const client = { async chat(){ throw new Error("OpenRouter 402: This request requires more credits"); } };
  const s = createAgentSession({ client, tools:[rc4_simpleTool("noop","N")], model:"m" });
  let caught = null;
  try { await s.send("go"); } catch (e) { caught = e; }
  rc4_assert(caught && /402: This request requires more credits/.test(caught.message), "client.chat error propagates out of send()");
  return "ok";
};

// Malformed-tool-call recovery: a provider (e.g. Gemini) can reject the model's OWN tool call upstream and
// return an EMPTY assistant turn (finish_reason 'error' / native 'MALFORMED_FUNCTION_CALL', content null, no
// tool_calls). That null message must NOT be pushed to history (it poisons later turns); instead the step is
// retried with a targeted nudge, and the loop recovers.
const _test_rc4_session_malformed_recovers = async function _test_rc4_session_malformed_recovers(rc4_assert, createAgentSession, createScriptedClient, rc4_simpleTool){
  const client = createScriptedClient([
    { finish_reason:"error", native_finish_reason:"MALFORMED_FUNCTION_CALL" },   // provider-rejected, empty turn
    { tool_calls:[{ id:"r1", name:"noop", arguments:{} }] },                     // model recovers, acts
    { content:"done", finish_reason:"stop" }
  ]);
  const s = createAgentSession({ client, tools:[rc4_simpleTool("noop","N")], model:"m" });
  const r = await s.send("go");
  rc4_assert(!s.messages.some(m=>m.role==="assistant"&&m.content==null&&!m.tool_calls), "null-content malformed turn was NOT pushed to history");
  rc4_assert(s.messages.some(m=>m.role==="system"&&/malformed function call/.test(m.content)), "a targeted malformed nudge was injected");
  rc4_assert(s.messages.some(m=>m.role==="tool"&&m.content==="N"), "loop recovered and ran the real tool");
  return "ok";
};

// Malformed fallback: if a provider keeps returning malformed/empty turns, the loop terminates (finishReason
// 'error') after malformedRetryLimit retries instead of spinning to the step cap.
const _test_rc4_session_malformed_fallback = async function _test_rc4_session_malformed_fallback(rc4_assert, createAgentSession, createScriptedClient){
  const bad = { finish_reason:"error", native_finish_reason:"MALFORMED_FUNCTION_CALL" };
  const client = createScriptedClient([bad,bad,bad,bad,bad,bad]);
  const s = createAgentSession({ client, tools:[], model:"m", malformedRetryLimit:2 });
  const r = await s.send("go");
  rc4_assert(r.finishReason==="error", "terminates with finishReason error after the retry limit");
  rc4_assert(r.steps<=4, "did not run to the step cap: " + r.steps);
  return "ok";
};

// Visual prompting: send({text, images}) builds an OpenAI multimodal user message so a vision model sees it.
const _test_rc4_session_send_images = async function _test_rc4_session_send_images(rc4_assert, createAgentSession, createScriptedClient){
  const client = createScriptedClient([{ content: "ok", finish_reason: "stop" }]);
  const s = createAgentSession({ client, tools: [], model: "m" });
  await s.send({ text: "what is this", images: ["data:image/png;base64,iVBOR"] });
  const u = s.messages.find((m) => m.role === "user");
  rc4_assert(Array.isArray(u.content), "user content is a parts array when images are attached");
  rc4_assert(u.content.some((p) => p.type === "text" && /what is this/.test(p.text)), "text part present");
  rc4_assert(u.content.some((p) => p.type === "image_url" && /data:image/.test(p.image_url.url)), "image part present");
  return "ok";
};

// A tool calling ctx.attachImage feeds an image into the conversation as a user image-message (view_image path).
const _test_rc4_session_attach_image_tool = async function _test_rc4_session_attach_image_tool(rc4_assert, createAgentSession, createScriptedClient){
  const viewer = { id: "viewer", description: "view", parameters: { type: "object", properties: {} }, execute: async (a, ctx) => { ctx.attachImage("data:image/png;base64,ZZZ"); return { output: "loaded" }; } };
  const client = createScriptedClient([
    { tool_calls: [{ id: "t1", name: "viewer", arguments: {} }] },
    { content: "I see it", finish_reason: "stop" },
  ]);
  const s = createAgentSession({ client, tools: [viewer], model: "m" });
  await s.send("look at the asset");
  const imgMsg = s.messages.find((m) => m.role === "user" && Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"));
  rc4_assert(imgMsg, "tool-attached image delivered as a user image-message");
  rc4_assert(/ZZZ/.test(imgMsg.content[0].image_url.url), "correct image url injected by the tool");
  return "ok";
};

// fs test: real just-bash workspace + bash tool. The scripted client sed-renames a seeded module.
const _test_rc4_fs_rename = async function _test_rc4_fs_rename(rc4_assert, createAgentSession, createScriptedClient, createBashTool, createWorkspace){
  const ws = createWorkspace({ "/notebook/@user/mod.js": "const _x = function _x(){return( foo )};\n" });
  const sh = ws.spawn({ cwd: "/notebook" });
  const client = createScriptedClient([
    { tool_calls:[{ id:"s1", name:"bash", arguments:{ command:"sed -i 's/\\bfoo\\b/bar/g' /notebook/@user/mod.js" } }] },
    { content:"renamed" }
  ]);
  const s = createAgentSession({ client, tools:[createBashTool()], model:"m", runCommand: (cmd)=>sh.run(cmd) });
  await s.send("rename foo to bar");
  const after = await ws.fs.readFile("/notebook/@user/mod.js");
  const text = typeof after === "string" ? after : new TextDecoder().decode(after);
  rc4_assert(/\bbar\b/.test(text) && !/\bfoo\b/.test(text), "foo renamed to bar in the file: " + text);
  return "ok";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("rc4ts_title", null, ["md"], _title);

  // Imports from the literate core.
  main.define("module @tomlarkworthy/robocoop-4-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-core.js?v=4")).default));
  for (const n of ["truncate","formatResult","defineTool","createBashTool","createScriptedClient","createAgentSession"]) {
    main.define(n, ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import(n, _));
  }
  // Real just-bash workspace for the fs test.
  main.define("module @tomlarkworthy/robocoop-4-bash-session", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-session.js?v=4")).default));
  main.define("createWorkspace", ["module @tomlarkworthy/robocoop-4-bash-session", "@variable"], (_, v) => v.import("createWorkspace", _));

  $def("rc4ts_assert", "rc4_assert", [], _rc4_assert);
  $def("rc4ts_recordClient", "rc4_recordClient", ["createScriptedClient"], _rc4_recordClient);
  $def("rc4ts_simpleTool", "rc4_simpleTool", ["defineTool"], _rc4_simpleTool);

  $def("rc4ts_t_truncate", "test_rc4_truncate", ["rc4_assert","truncate"], _test_rc4_truncate);
  $def("rc4ts_t_formatResult", "test_rc4_formatResult", ["rc4_assert","formatResult"], _test_rc4_formatResult);
  $def("rc4ts_t_defineTool", "test_rc4_defineTool", ["rc4_assert","defineTool"], _test_rc4_defineTool);
  $def("rc4ts_t_persists", "test_rc4_session_persists", ["rc4_assert","createAgentSession","createScriptedClient"], _test_rc4_session_persists);
  $def("rc4ts_t_livetool", "test_rc4_session_live_tool_add", ["rc4_assert","createAgentSession","rc4_recordClient","rc4_simpleTool"], _test_rc4_session_live_tool_add);
  $def("rc4ts_t_unknown", "test_rc4_session_unknown_tool", ["rc4_assert","createAgentSession","createScriptedClient","rc4_simpleTool"], _test_rc4_session_unknown_tool);
  $def("rc4ts_t_abort", "test_rc4_session_abort", ["rc4_assert","createAgentSession","createScriptedClient","rc4_simpleTool"], _test_rc4_session_abort);
  $def("rc4ts_t_complete_nudge", "test_rc4_session_complete_and_nudge", ["rc4_assert","createAgentSession","createScriptedClient","rc4_simpleTool"], _test_rc4_session_complete_and_nudge);
  $def("rc4ts_t_nudge_fallback", "test_rc4_session_nudge_fallback", ["rc4_assert","createAgentSession","createScriptedClient"], _test_rc4_session_nudge_fallback);
  $def("rc4ts_t_watch_notices", "test_rc4_session_watch_notices", ["rc4_assert","createAgentSession","createScriptedClient","rc4_simpleTool"], _test_rc4_session_watch_notices);
  $def("rc4ts_t_client_error", "test_rc4_session_surfaces_client_error", ["rc4_assert","createAgentSession","rc4_simpleTool"], _test_rc4_session_surfaces_client_error);
  $def("rc4ts_t_malformed_recovers", "test_rc4_session_malformed_recovers", ["rc4_assert","createAgentSession","createScriptedClient","rc4_simpleTool"], _test_rc4_session_malformed_recovers);
  $def("rc4ts_t_malformed_fallback", "test_rc4_session_malformed_fallback", ["rc4_assert","createAgentSession","createScriptedClient"], _test_rc4_session_malformed_fallback);
  $def("rc4ts_t_send_images", "test_rc4_session_send_images", ["rc4_assert","createAgentSession","createScriptedClient"], _test_rc4_session_send_images);
  $def("rc4ts_t_attach_image", "test_rc4_session_attach_image_tool", ["rc4_assert","createAgentSession","createScriptedClient"], _test_rc4_session_attach_image_tool);
  $def("rc4ts_t_fs_rename", "test_rc4_fs_rename", ["rc4_assert","createAgentSession","createScriptedClient","createBashTool","createWorkspace"], _test_rc4_fs_rename);

  return main;
}
