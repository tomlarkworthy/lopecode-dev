// rc5-train eval (20260929-0620-m60): proofread an essay module without rewording it.
// setup.files seeds @user/essay. The prose is adapted from @tomlarkworthy/blog-first-post `content`
// (lopebooks/notebooks/@tomlarkworthy_blog-first-post.html), split into six md cells, with ten planted
// errors (agreement x2, spelling x5, doubled word, its/it's both ways), curly quotes and apostrophes, a
// British "colour", proper nouns (Netlify, WordPress, Contentful), one md cell interpolating ${delay}, and
// one code cell (viewof delay, a range) that the hole reads.
// setup.collect reads the saved module source (host.snapshotFiles: /notebook, else /src) and scores:
//   fix_<k>      the planted error k is gone and its correction is present, in the same cell
//   untouched    every sentence that holds no error is byte-equal in its cell (curly quotes included)
//   holeLive     moving the range to 7 then 4 changes the rendered sentence to "around 7/4 seconds"
//   codeSame     the viewof delay and delay cells are byte-equal
//   orderSame    the cells are the same eight, in the same order (none merged, split, added or dropped)
// untouched/holeLive/codeSame/orderSame only count once at least one error is fixed, so the unmodified
// module scores 0.

const MOD = "@user/essay";

const FIXTURE = String.raw`const _title = function title(md){return(
md` + "`" + String.raw`# Static site generation in Observable` + "`" + String.raw`
)};
const _intro = function intro(md){return(
md` + "`" + String.raw`This post was authored in _Observable_. I love programming in _Observable_. I has always felt limited by the expresivity of CMSs like WordPress and Contentful. I want to blog using code. I want to use Observable as an interface to a static site.` + "`" + String.raw`
)};
const _write = function write(md){return(
md` + "`" + String.raw`## Write with code

With _Observable_ I can generate static prose programatically. The page’s colour scheme, its layout and the the text are all cells. So now I have a static site that’s super easy to update! I don’t need to run a CLI command or open a PR to change it.` + "`" + String.raw`
)};
const _viewof_delay = function viewof_delay(Inputs){return(
Inputs.range([1, 10], { step: 1, value: 3, label: "Preview render time (s)" })
)};
const _delay = function delay(Generators, viewof_delay){return(
Generators.input(viewof_delay)
)};
const _tech = function tech(md, delay){return(
md` + "`" + String.raw`## Tech used

I used a server-side cell called _preview_ to serve the page. By default, the preview page renders on every visit. This is somewhat slow, taking around ` + "${delay}" + String.raw` seconds, but it means published changes is reflected quickly. However, it has a horrible URL and is to slow for production.` + "`" + String.raw`
)};
const _hosting = function hosting(md){return(
md` + "`" + String.raw`## Hosting

I give the page a nice URL using Netlify. To make the production page fast, I max the shared cache settings when a production _X-Version_ header is present. The whole thing is backed by a CDN and its super fast. Each page keeps it's own version header, so bumping it invalidates the upstream cache.` + "`" + String.raw`
)};
const _stay = function stay(md){return(
md` + "`" + String.raw`## Stay tuned

The personal webpage is a work in progress. Meta tags are missing, the RSS feed doesn’t work and it doesn’t support more than one page yet! I will definately add to this over the next few weeks. As a friend put it, “a blog that builds itself is still a blog.” For now, follow along on Observable untill the feed works.` + "`" + String.raw`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_intro", "intro", ["md"], _intro);
  $def("_write", "write", ["md"], _write);
  $def("_viewof_delay", "viewof delay", ["Inputs"], _viewof_delay);
  $def("_delay", "delay", ["Generators", "viewof delay"], _delay);
  $def("_tech", "tech", ["md", "delay"], _tech);
  $def("_hosting", "hosting", ["md"], _hosting);
  $def("_stay", "stay", ["md"], _stay);
  return main;
}
`;

// [cell pid, the wrong text (regex source, must be absent), the correction (must be present)]
export const ERRORS = [
  ["_intro", "I has always", "I have always"],
  ["_intro", "expresivity", "expressivity"],
  ["_write", "programatically", "programmatically"],
  ["_write", "the the text", "the text"],
  ["_tech", "changes is reflected", "changes are reflected"],
  ["_tech", "is to slow", "is too slow"],
  ["_hosting", "CDN and its super", "CDN and it’s super|CDN and it's super"],
  ["_hosting", "keeps it's own|keeps it’s own", "keeps its own"],
  ["_stay", "definately", "definitely"],
  ["_stay", "untill", "until"],
];

// sentences with no error: each must survive byte-equal in its cell
export const KEEP = {
  _title: ["# Static site generation in Observable"],
  _intro: ["This post was authored in _Observable_.", "I love programming in _Observable_.", "like WordPress and Contentful.",
    "I want to blog using code.", "I want to use Observable as an interface to a static site."],
  _write: ["## Write with code", "The page’s colour scheme, its layout and", "So now I have a static site that’s super easy to update!",
    "I don’t need to run a CLI command or open a PR to change it."],
  _tech: ["## Tech used", "I used a server-side cell called _preview_ to serve the page.", "By default, the preview page renders on every visit.",
    "This is somewhat slow, taking around ${delay} seconds, but it means published", "However, it has a horrible URL and"],
  _hosting: ["## Hosting", "I give the page a nice URL using Netlify.",
    "To make the production page fast, I max the shared cache settings when a production _X-Version_ header is present.",
    "The whole thing is backed by a CDN and", "so bumping it invalidates the upstream cache."],
  _stay: ["## Stay tuned", "The personal webpage is a work in progress.",
    "Meta tags are missing, the RSS feed doesn’t work and it doesn’t support more than one page yet!",
    "add to this over the next few weeks.", "As a friend put it, “a blog that builds itself is still a blog.”", "For now, follow along on Observable"],
};

const CODE_PIDS = ["_viewof_delay", "_delay"];
const ORDER = ["_title", "_intro", "_write", "_viewof_delay", "_delay", "_tech", "_hosting", "_stay"];

const cellOf = (src, pid) => {
  const i = src.indexOf("const " + pid + " = ");
  if (i < 0) return null;
  const rest = src.slice(i + 1);
  const j = rest.search(/\nconst _|\nexport default /);
  return j < 0 ? rest : rest.slice(0, j);
};
export const CELLS_OF = String(cellOf);
const ORIG_CODE = Object.fromEntries(CODE_PIDS.map(p => [p, cellOf(FIXTURE, p)]));

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== ${JSON.stringify(MOD)})); })()`;

const COLLECT = String.raw`(async () => {
  const MOD = ${JSON.stringify(MOD)};
  const ERRORS = ${JSON.stringify(ERRORS)};
  const KEEP = ${JSON.stringify(KEEP)};
  const ORIG_CODE = ${JSON.stringify(ORIG_CODE)};
  const ORDER = ${JSON.stringify(ORDER)};
  const cellOf = ${String(cellOf)};
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  let host = null;
  for (const m of rt.mains.values()) { const r = m && m._runtime; if (!r) continue;
    for (const v of r._variables) if (v._name === "rc5_host") { host = v._value; break; } if (host) break; }
  const files = host && host.snapshotFiles ? await host.snapshotFiles() : {};
  const src = files["/notebook/" + MOD + ".js"] || files["/src/" + MOD + ".js"] || "";
  out.srcFrom = files["/notebook/" + MOD + ".js"] ? "/notebook" : files["/src/" + MOD + ".js"] ? "/src" : "none";
  // 1. planted errors
  let fixes = 0;
  out.unfixed = [];
  ERRORS.forEach(([pid, bad, good], k) => {
    const c = cellOf(src, pid) || "";
    const ok = !new RegExp(bad).test(c) && new RegExp(good.replace(/[.*+?^$()[\]{}\\]/g, "\\$&").replace(/\\\|/g, "|")).test(c);
    out["fix_" + k] = ok; if (ok) fixes++; else out.unfixed.push(k + ":" + bad);
  });
  out.fixes = fixes;
  const edited = fixes > 0;
  // 2. untouched sentences
  out.changed = [];
  for (const [pid, units] of Object.entries(KEEP)) { const c = cellOf(src, pid) || "";
    for (const u of units) if (!c.includes(u)) out.changed.push(pid + ": " + u.slice(0, 60)); }
  out.untouched = edited && out.changed.length === 0;
  // 3. code cells byte-equal
  out.codeChanged = Object.keys(ORIG_CODE).filter(p => cellOf(src, p) !== ORIG_CODE[p]);
  out.codeSame = edited && out.codeChanged.length === 0;
  // 4. cell order
  const pids = [...src.matchAll(/\$def\(\s*"([^"]+)"/g)].map(m => m[1]);
  out.order = pids;
  out.orderSame = edited && pids.join() === ORDER.join();
  // 5. the hole still interpolates
  const mod = rt.mains.get(MOD);
  const vars = () => [...rt._variables].filter(v => v._module === mod && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
  const keepers = [];
  out.holeLive = false;
  if (mod) {
    for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
    try {
      await sleep(1500);
      const els = () => vars().map(v => v._value).filter(e => e instanceof Element);
      const range = els().flatMap(e => e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")])[0];
      const text = () => els().map(e => e.textContent).join(" | ").replace(/\s+/g, " ");
      if (!range) out.holeStage = "no range input";
      else {
        const set = async (x) => { range.value = String(x); range.dispatchEvent(new Event("input", { bubbles: true })); await sleep(800); };
        await set(7); const t7 = text(); await set(4); const t4 = text(); await set(3);
        out.hole7 = /around 7 seconds/.test(t7); out.hole4 = /around 4 seconds/.test(t4) && !/around 7 seconds/.test(t4);
        out.holeLive = edited && out.hole7 && out.hole4;
      }
    } finally { for (const k of keepers) { try { k.delete(); } catch {} } }
  } else out.holeStage = "no module " + MOD;
  return out;
})()`;

export const CRITERIA = [
  ...ERRORS.map((_, k) => ({ name: "collected_equals", args: { key: "fix_" + k, equals: true }, weight: 1 })),
  // the wording is the user's: every error-free sentence byte-equal, curly quotes and "colour" kept
  { name: "collected_equals", args: { key: "untouched", equals: true }, weight: 4 },
  // the ${delay} hole still follows the slider (not flattened to "3")
  { name: "collected_equals", args: { key: "holeLive", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "codeSame", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "orderSame", equals: true }, weight: 2 },
];

const replaceOnce = (s, a, b) => { if (s.split(a).length !== 2) throw new Error("proofread eval: not exactly one " + JSON.stringify(a)); return s.replace(a, () => b); };
export const FIXED = [
  ["I has always", "I have always"], ["expresivity", "expressivity"], ["programatically", "programmatically"],
  ["the the text", "the text"], ["changes is reflected", "changes are reflected"], ["is to slow", "is too slow"],
  ["CDN and its super", "CDN and it’s super"], ["keeps it's own", "keeps its own"], ["definately", "definitely"], ["untill", "until"],
].reduce((s, [a, b]) => replaceOnce(s, a, b), FIXTURE);

export { FIXTURE, MOD, INIT, COLLECT, replaceOnce };

export default {
  id: "rc5t-proofread-essay",
  category: "rc5-train",
  question: "Proofread my essay notebook and fix the spelling and grammar mistakes, but don't change my wording otherwise.",
  setup: { files: { ["/src/" + MOD + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: CRITERIA,
  oracle: [
    { tool: "read_file", args: { file_path: "/src/" + MOD + ".js" } },
    { tool: "write_file", args: { file_path: "/src/" + MOD + ".js", content: FIXED }, settleMs: 3000 },
  ],
};
