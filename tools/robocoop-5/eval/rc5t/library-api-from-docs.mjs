// rc5-train w4 (20260927-2340): the agent called a library's playback API from memory, failed three times,
// probed the minified bundle, then replaced the library's synth with a hand-written OscillatorNode loop.
// Fix: knowledge/researching-libraries-and-apis.md (+ write-trigger on a CDN import()).
const WIKI = "/content/@tomlarkworthy/markdown-wiki/researching-libraries-and-apis.md";
const FILE = "/src/@user/twinkle.js";
const ESM = "https://cdn.jsdelivr.net/npm/abcjs@6.7.1/+esm";

const skeleton = `const _intro = function intro(md){return( md\`# Twinkle\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  return main;
}
`;

// Call sequence taken from abcjs@6.7.1 types/index.d.ts: MidiBuffer.init({visualObj, audioContext}) -> prime() -> start().
const SOLUTION = `const _intro = function intro(md){return( md\`# Twinkle Twinkle Little Star\` )};
const _abcjs = async function abcjs(FileAttachment){return( await import(await FileAttachment("abcjs-6.7.1.esm.js").url()) )};
const _tune = function tune(){return( \`X:1
T:Twinkle Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |]\` )};
const _sheet = function sheet(html,abcjs,tune)
{
  const score = html\`<div></div>\`;
  const visualObj = abcjs.renderAbc(score, tune)[0];
  const button = html\`<button>Play</button>\`;
  let ctx, synth;
  button.onclick = async () => {
    if (synth) { synth.stop(); synth = null; button.textContent = "Play"; return; }
    ctx ??= new AudioContext();
    synth = new abcjs.synth.CreateSynth();
    await synth.init({ visualObj, audioContext: ctx });
    await synth.prime();
    synth.start();
    button.textContent = "Stop";
  };
  return html\`<div>\${score}\${button}</div>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_abcjs", "abcjs", ["FileAttachment"], _abcjs);
  $def("_tune", "tune", [], _tune);
  $def("_sheet", "sheet", ["html","abcjs","tune"], _sheet);
  return main;
}
`;

export default {
  id: "rc5t-library-api-from-docs",
  category: "rc5-train",
  question:
    "Typeset 'Twinkle Twinkle Little Star' as sheet music in this notebook, and let me play it. " +
    "Put it in a new module @user/twinkle.",
  criteria: [
    { name: "module_exists", args: { id: "@user/twinkle" }, weight: 1 },
    { name: "module_renders_contains", args: { module: "@user/twinkle", needle: "<svg" }, weight: 2 },
    // a playback path exists (abcjs.synth, Tone.Synth, ...); the live preview is cut at 600 chars, so a
    // button placed after the SVG cannot be seen there
    { name: "contains_string", args: { file: FILE, needle: "synth", ignoreCase: true }, weight: 1 },
    // the defect: playback hand-written instead of using the library's synth
    { name: "not_contains_string", args: { file: FILE, needle: "createOscillator" }, weight: 3 },
    // the defect's cause: API calls guessed from memory (read_file results, e.g. this wiki page, are excluded)
    { name: "no_tool_result_matches", args: { pattern: "^(?!\\s+1\\t)[\\s\\S]*(is not a function|Must pass in either)" }, weight: 2 },
    { name: "variable_no_error", args: { module: "@user/twinkle" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: WIKI } },
    {
      tool: "eval_js",
      args: {
        module: "@tomlarkworthy/fileattachments",
        code:
          `const meta = await (await fetch("https://data.jsdelivr.com/v1/packages/npm/abcjs")).json();\n` +
          `const dts = await (await fetch("https://cdn.jsdelivr.net/npm/abcjs@6.7.1/types/index.d.ts")).text();\n` +
          `return { latest: meta.tags.latest, api: dts.split("\\n").filter(l => /^\\s*(init|prime|start)\\(/.test(l)).join("\\n") };`,
      },
    },
    { tool: "write_file", args: { file_path: FILE, content: skeleton } },
    {
      tool: "eval_js",
      args: {
        module: "@tomlarkworthy/fileattachments",
        code:
          `const pkgText = await (await fetch(${JSON.stringify(ESM)})).text();\n` +
          `const pkgFile = new File([pkgText], "abcjs-6.7.1.esm.js", { type: "text/javascript" });\n` +
          `await setFileAttachment(pkgFile, window.__ojs_runtime.mains.get("@user/twinkle"));\n` +
          `return "attached " + pkgText.length;`,
      },
    },
    { tool: "write_file", args: { file_path: FILE, content: SOLUTION }, settleMs: 3000 },
  ],
};
