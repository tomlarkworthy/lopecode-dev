// rc5-train eval (20260929-0620-m44): the agent gives itself a dictionary tool and must USE it as a tool.
// In run 20260929-0620-m44-before the agent wrote @user/define-word registering `define_word` through
// registerTool, then never called define_word: it ran `define_word_tool.execute(...)` through eval_js five
// times and ended the turn claiming the tool is "available to the chat agent in future turns", which it
// had not observed. That tool was in its tool list from the step after the write.
//
// Scored on behaviour, whatever the agent names the module, the tool or its parameter:
//   setup.init records the tool ids present before the turn and wraps every tool registered LATER, so a
//   call that goes through the registry (the model's tool call) is logged, and eval_js calling the cell's
//   execute() directly is not. The network is a fixture (the real API returned 522 on 2026-09-29).
//   - registered: a new tool is in the registry after the turn and returns the fixture definition
//   - serendipity: turn 1 called the new tool (not eval_js) and it returned the fixture definition
//   - followup: turn 2 ("Now define petrichor") called the new tool and it returned the fixture definition

const S_DEF = "The faculty of making fortunate discoveries by accident.";
const P_DEF = "The distinctive scent which accompanies the first rain after a long warm dry spell.";
const entry = (word, pos, definition, example) => [{
  word, phonetic: "", phonetics: [],
  meanings: [{ partOfSpeech: pos, definitions: [{ definition, synonyms: [], antonyms: [], ...(example ? { example } : {}) }], synonyms: [], antonyms: [] }],
  license: { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0" },
  sourceUrls: ["https://en.wiktionary.org/wiki/" + word],
}];
const NOT_FOUND = { title: "No Definitions Found", message: "Sorry pal, we couldn't find definitions for the word you were looking for.", resolution: "You can try the search again at later time or head to the web instead." };

// runtime helper shared by init and collect
const RT = String.raw`const __vars = () => { const out = []; const seen = new Set(); for (const m of globalThis.__ojs_runtime.mains.values()) { const rt = m && m._runtime; if (!rt || seen.has(rt)) continue; seen.add(rt); for (const v of rt._variables) out.push(v); } return out; };
const __box = () => { const v = __vars().find(x => x._name === "toolsView" && x._value && "value" in x._value); return v && v._value; };`;

const INIT = String.raw`(async () => {
  ${RT}
  const t0 = Date.now();
  while (Date.now() - t0 < 20000 && !((__box()?.value?.length ?? 0) >= 10)) await new Promise(r => setTimeout(r, 250));
  const box = __box();
  const base = new Set((box.value || []).map(t => t && t.id));
  const calls = [];
  const wrapped = new WeakMap();
  let cur = box.value;
  const wrap = arr => (arr || []).map(t => {
    if (!t || base.has(t.id) || typeof t.execute !== "function") return t;
    let w = wrapped.get(t);
    if (!w) wrapped.set(t, w = { ...t, execute: async (a, c) => {
      const r = await t.execute(a, c);
      calls.push({ id: t.id, args: JSON.stringify(a ?? {}), output: String(r && r.output != null ? r.output : r) });
      return r;
    } });
    return w;
  });
  Object.defineProperty(box, "value", { configurable: true, enumerable: true, get: () => cur, set: arr => { cur = wrap(arr); } });
  cur = wrap(cur);
  globalThis.__rc5tDict = { base, calls };
})()`;

const COLLECT = String.raw`(async () => {
  ${RT}
  const { base, calls } = globalThis.__rc5tDict;
  const S = ${JSON.stringify(S_DEF)}, P = ${JSON.stringify(P_DEF)};
  const fresh = (__box()?.value || []).filter(t => t && !base.has(t.id));
  const called = (word, def) => {
    const hit = calls.find(c => new RegExp(word, "i").test(c.args) && c.output.includes(def));
    if (hit) return "ok";
    const tried = calls.filter(c => new RegExp(word, "i").test(c.args));
    return tried.length ? "the new tool was called for " + word + " but did not return the dictionary definition: " + tried[0].output.slice(0, 160)
      : "no call to a newly registered tool for " + word + " (registry calls: " + JSON.stringify(calls.map(c => c.id + " " + c.args)).slice(0, 200) + ")";
  };
  // judged before the registry probe below, whose own execute() calls go through the wrapper too
  const turnSerendipity = called("serendipity", S), turnFollowup = called("petrichor", P);
  let registered = "no tool was added to the registry (new ids: none)";
  for (const t of fresh) {
    const props = Object.keys(t.parameters?.properties ?? {});
    const key = (t.parameters?.required ?? [])[0] ?? props[0] ?? "word";
    let out = "";
    try { const r = await t.execute({ [key]: "serendipity" }, {}); out = String(r && r.output != null ? r.output : r); } catch (e) { out = "threw " + e.message; }
    if (out.includes(S)) { registered = "ok"; break; }
    registered = "new tool " + t.id + " did not return the dictionary definition: " + out.slice(0, 160);
  }
  return { registered, serendipity: turnSerendipity, followup: turnFollowup };
})()`;

const SOLUTION = `const _intro = function intro(md){return(
md\`# Dictionary tool
Registers \\\`define_word\\\` with the chat's tool registry (robocoop-5-tools).\`
)};
const _define_word = function define_word(){return(
{
  id: "define_word",
  description: "Look up an English word in the Free Dictionary API (api.dictionaryapi.dev) and return its definitions.",
  parameters: { type: "object", properties: { word: { type: "string", description: "The English word to define" } }, required: ["word"] },
  execute: async ({ word }) => {
    const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(String(word).trim().toLowerCase()));
    if (!res.ok) return { title: word, output: "No definition found for " + word + " (HTTP " + res.status + ")" };
    const data = await res.json();
    const lines = data.flatMap(e => e.meanings.flatMap(m => m.definitions.map(d => "(" + m.partOfSpeech + ") " + d.definition)));
    return { title: word, output: word + ":\\n" + lines.join("\\n") };
  }
}
)};
const _registration = function registration(registerTool,define_word,unregisterTool,invalidation)
{
  registerTool(define_word);
  invalidation.then(() => unregisterTool(define_word.id, define_word));
  return define_word.id;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_intro", "intro", ["md"], _intro);
  $def("_define_word", "define_word", [], _define_word);
  $def("_registration", "registration", ["registerTool","define_word","unregisterTool","invalidation"], _registration);
  main.define("module @tomlarkworthy/robocoop-5-tools", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-tools.js?v=4")).default));
  main.define("registerTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("registerTool", _));
  main.define("unregisterTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("unregisterTool", _));
  return main;
}
`;

export default {
  id: "rc5t-register-dictionary-tool",
  category: "rc5-train",
  question: "Give yourself a new tool: look up the definition of an English word from https://api.dictionaryapi.dev/api/v2/entries/en/<word>. Register it so you (the chat agent) can call it in later turns, then use it to define \"serendipity\".",
  followups: ["Now define \"petrichor\"."],
  setup: {
    routes: [
      // Playwright runs matching routes newest-first: the catch-all is registered first so the words win
      { url: "https://api.dictionaryapi.dev/api/v2/entries/**", status: 404, body: NOT_FOUND },
      { url: "https://api.dictionaryapi.dev/api/v2/entries/en/serendipity", body: entry("serendipity", "noun", S_DEF) },
      { url: "https://api.dictionaryapi.dev/api/v2/entries/en/petrichor", body: entry("petrichor", "noun", P_DEF) },
    ],
    init: INIT,
    collect: COLLECT,
  },
  criteria: [
    { name: "collected_equals", args: { key: "registered", equals: "ok" }, weight: 1 },
    // the defect: the registered tool was bypassed (eval_js on the cell) instead of called
    { name: "collected_equals", args: { key: "serendipity", equals: "ok" }, weight: 2 },
    // the goal's own claim: the tool is callable in a later turn
    { name: "collected_equals", args: { key: "followup", equals: "ok" }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/dictionary.js", content: SOLUTION }, settleMs: 1500 },
    { tool: "define_word", args: { word: "serendipity" } },
    { tool: "define_word", args: { word: "petrichor" } },
  ],
};
