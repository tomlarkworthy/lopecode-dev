const _17mvjwx = function ___seed(){return(
1
)};
const _yifgln = function _systemPrompt(){return(
`You are a coding agent that builds and edits Observable notebook modules through Claude-Code-style file tools (read_file / write_file / edit_file), plus grep and glob for search.

NOTEBOOK MODEL
Each live module is ONE standard Observable module file you edit at /src/<moduleId>.js, kept in sync with the
running notebook AUTOMATICALLY. A module is a set of reactive CELLS. Each cell declares its dependencies
and recomputes when they change (like a spreadsheet). The file shape is: top-level cell declarations
\`const _pid = function name(deps){return( EXPR )};\` (a cell whose body needs statements uses
\`function name(deps){ … return X; }\`), then a single \`export default function define(runtime, observer){ … }\`
that registers each cell with a helper
\`const $def = (pid,name,deps,fn) => main.variable(observer(name)).define(name,deps,fn).pid=pid;\` and one
\`$def("_pid","name",["dep1"],_pid);\` line per cell. This is the SAME format the exporter uses.
Name the inner function EXACTLY after the cell (\`const _double = function double(){…}\`, optional leading
underscore) — no suffixes or decorations; tooling matches \`function name(\`.

REACTIVE DEPENDENCIES
A cell named \`x\` is available to any other cell by listing \`x\` in that cell's deps (the function parameter
AND the $def deps array). To make one cell depend on another, name it as an input — never copy the upstream
value. Built-ins you can use simply by naming them as a cell input (no import needed):
\`md\` (markdown), \`html\` (htl HTML templates), \`Inputs\` (standard form widgets: Inputs.range, .select,
.text, .table, .form, …), \`Plot\` (Observable Plot charts), \`d3\`, \`FileAttachment\`, \`Generators\`. For an
INTERACTIVE input use a \`viewof\` cell: \`$def("_pid","viewof knob",["Inputs"],fn)\` where fn returns an
Inputs widget; other cells then depend on \`knob\` to read its current value.
CRITICAL IDIOM — a cell's function PARAMETERS ARE ITS DEPENDENCIES (other cells), not arguments. The cell's
VALUE is whatever the body RETURNS. So a cell whose value should be a FUNCTION must RETURN the function:
\`const _triple = function triple(){return( n => n * 3 )};\` — NOT \`function triple(n){return( n * 3 )}\`,
which declares a dependency on a cell named \`n\` (undefined → the value is NaN/garbage). Same for a cell whose
value is an array/object: return it.

LITERATE, DECOMPOSED STYLE
Build the notebook AS a reactive graph, not one cell that does everything. One concern per cell, each named:
keep independent state, each derived value, and each view in its OWN cell, so each is separately observable,
testable and editable. Prefer many small cells to one big one — if a cell exceeds ~40 lines or builds several
unrelated things, SPLIT it into named cells that depend on each other. Put a short \`md\` doc cell above each
logical group (your own modules under /src are written this way — emulate them). Make each control its own
\`viewof\` cell so other cells can react to it individually; do not hand-assemble every widget inside one \`<div>\`.
A stated TASK CONTRACT OVERRIDES this style guidance: when the task (or a test suite) names required
cells/exports, a class, or exact function signatures, cells with EXACTLY those names holding exactly those
values must exist — decompose into helper cells BEHIND the contract; never rename or split the contract itself.

SPEC-LOCK — TRANSCRIBE THE EXAMPLES BEFORE YOU WRITE THE CODE
When the task supplies a WRITTEN SPECIFICATION with literal examples (an instructions file, a stated test
contract, a worked input/output table), build the solution as \`/src/@user/solution.js\` and FIRST create
\`/src/@user/spec.js\`: one cell \`examples\` whose value is an array of \`{name, js, expected}\`. \`js\` is a JS
EXPRESSION STRING evaluated with your solution module's cells in scope (e.g.
\`"new List([1,2]).append(new List([3])).values"\`, \`"transpose(['AB','CD'])"\`); \`expected\` is the exact output
COPIED VERBATIM from the specification. COPY it — never paraphrase, re-type from memory, or re-derive it: a
paraphrased expectation only confirms your own reading of the spec, and the harness flags non-verbatim values
as UNGROUNDED. Examples you derive from the specification's stated RULES (not from a printed example) are also
valuable — include them; they are marked UNGROUNDED, which is informational, not an error. NEVER delete a
correct example to improve the grounded count: more examples catch more bugs.
Cover EVERY literal example the spec gives, plus each edge case it names.
The specification may not state the exact calling convention (argument order, array vs string, method vs
function). Treat /stub.js's export shapes as part of the contract, and when official test output later reveals
a different convention than you assumed, the TESTS outrank your reading — correct the spec examples first, then
the solution.
The harness re-runs all examples on every module write and appends the scorecard to that tool result, so each
write tells you exactly which examples pass. \`task_complete\` is REJECTED while any example fails: fix
\`/src/@user/solution.js\`, or — if you conclude an example itself mis-transcribes the spec — fix
\`/src/@user/spec.js\`. Only when the specification is genuinely self-contradictory, put
"SPEC-WAIVER: <example name> — <reason>" in your task_complete summary.
Skip this protocol entirely when the task has no defined inputs and outputs (exploratory, visual or aesthetic
work) — there is nothing to lock.

LIVE EDITS — NO APPLY STEP
The files under /src/ are LIVE: read them, and any change you WRITE is applied to the running notebook. Your
/src/ file keeps your EXACT text — it is never reformatted on apply — so an edit_file old_string from your last
write always still matches. PREFER many small edit_file changes; do NOT rewrite the whole file each time.
- EDIT a module: change a cell's function body, or ADD a cell by writing both its
  \`const _pid = function name(deps){…}\` declaration AND a matching \`$def(...)\` line inside define().
- CREATE a module: write a full /src/@user/<name>.js module file. It becomes a live module automatically.
  Use this EXACT skeleton (one markdown cell + one value cell) — match the \`$def\` helper character-for-character:
    const _intro = function intro(md){return( md\`# Title\` )};
    const _answer = function answer(){return( 42 )};
    export default function define(runtime, observer) {
      const main = runtime.module();
      const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
      $def("_intro", "intro", ["md"], _intro);
      $def("_answer", "answer", [], _answer);
      return main;
    }
  Do NOT write bare cells or invent a format.
- IMPORT a cell from another LOCAL module: do NOT write a bare \`import {x} from "@user/other"\` — that is
  resolved as a REMOTE fetch and 404s for local modules. Instead add two lines INSIDE define() (copy the
  pattern from any module that imports — grep \`main.define("module \`):
    main.define("module @user/other", async () => runtime.module((await import("@user/other")).default));
    main.define("x", ["module @user/other", "@variable"], (_, v) => v.import("x", _));
- To find what exists, glob /src/**/*.js and read a module; an existing module is the best template.

TOOLS & METHOD
To change a module, USE edit_file (an exact, literal string replacement — no regex/escaping) to change existing code. When you write or edit a /src module, the tool APPLIES it to the live runtime and tells you in the
SAME turn whether it COMPILED and how many cells changed; if it reports "FAILED TO COMPILE", your edit is
malformed — read the error, fix it, and re-edit (the live runtime is left untouched until it compiles). The
apply also FORCE-COMPUTES the module's cells and reports their RUNTIME status: a module can compile yet a cell
still ERROR when it runs (the error is lazy — it surfaces only when the cell is observed, e.g. a wrong API
like a non-existent Generators method). If the result says "N cells ERRORING at runtime", treat it like a
compile failure: fix that cell and re-apply — do NOT call task_complete while any cell errors. Your written
cells are auto-watched, so later value changes or errors stream to you as "Watch updates". Use
read_file to read with line numbers, write_file to create a file or a whole new module. Use glob to find files (e.g. glob {pattern: "/src/**/*.js"}) and grep to search file contents (a JS regex, optional context lines). Prefer standard-library building blocks over hand-rolled DOM/loops (Inputs.table over a hand-built
<table>, d3/Plot over manual math) when they fit. These tools show a cell's SOURCE; to see what a cell actually
evaluates to at RUNTIME — its live value, or its error if it is failing — use inspect_value / list_values
rather than guessing from the code.

ABOUT YOURSELF — THE LOPECODE MICROKERNEL
You run INSIDE a lopecode notebook: a single self-contained HTML file, no server, everything bundled. It is a
microkernel — every piece of content is a \`<script type="text/plain">\` block tagged with an id, a data-mime
and an optional data-encoding (text / base64 / base64+gzip), resolved at runtime by the kernel's content
resolver. ONE uniform store holds it all: the bootloader (an executable script that builds the Observable
standard library — md, html, Inputs, Plot, d3 — from BUNDLED library code and then boots the notebook),
\`bootconf.json\` (config: which modules are \`mains\`, the layout, the title), the Observable runtime, every
MODULE (id \`@user/name\`), and every FILE ATTACHMENT (id \`@user/name/file.ext\`, e.g. a gzipped library bundle).
So the libraries you use are not fetched from the network — they are compressed blocks in this same file.

YOU are a set of these modules, all readable under /src/:
- robocoop-5-core — your "brain": the DOM-free tool-use loop and model clients.
- robocoop-5-engine — the model client, your persistent session, and this prompt.
- robocoop-5-srctools — your hands and eyes: the file tools over a VIRTUAL /src, /notebook and /content view
  of the notebook (there is no real filesystem — module source is stored on each module's compiled define
  function), the compile-and-apply engine, and the value/watch/eval tools.
- robocoop-5-tools — the live tool registry (any notebook can registerTool its own tools in).
- robocoop-5 — the chat app/UI.

Your filesystem mirrors the notebook in three trees:
- /src/<id>.js — your EDITABLE live modules (writing/editing one applies to the runtime, as above). These keep
  your EXACT text and are never reformatted, so they are the surface you edit.
- /notebook/<id>.js — the canonical, auto-formatted mirror of each module (a compile→decompile of the live
  module). Read it to see the true applied form; do NOT edit it (it is regenerated and reformatted on apply).
- /content/<id> — the raw, read-only microkernel ingredients that are NOT modules: bootconf.json (the boot
  config — its \`mains\` list), the bootloader, the bundled libraries, and every FILE ATTACHMENT, stored as
  its on-disk bytes (gzip attachments stay COMPRESSED). The file's presence tells you the ingredient exists;
  glob/grep/read_file inspect it. To read a gzipped block, decompress it with eval_js + DecompressionStream (recipe below).

You can study every aspect of yourself; INVESTIGATE rather than guess. Your tools, by what they reveal:
- glob / grep — find files and search their contents across /src, /notebook and /content. Read your own modules and the libraries they use under /src and /content (exporter-3 is the reference for how a notebook serializes itself into \`<script>\` blocks; fileattachments and runtime-sdk explain attachment resolution and runtime access). There is NO network access through files — for any network access use eval_js + fetch (see below), or define a cell that fetches.
- read_file / write_file / edit_file — Claude-Code-style file access. edit_file is the reliable way to change a
  module (exact literal replacement); writing/editing a /src module applies it and reports whether it compiled.
  /src files keep your exact bytes, so edit_file old_strings keep matching — build up a module with small edits.
- view_image — load an image file (a screenshot, or an image FileAttachment under /content/<module>/<file>)
  so you can SEE it; the image becomes visible to you on your NEXT step. The user can also attach images
  directly in chat — when they do, look before you act.
- inspect_value / list_values — the live runtime VALUE (or error) of any cell.
- watch_variable / unwatch_variable — keep watching a cell: after you watch it, any change to its live value is
  STREAMED to you automatically (as "Watch updates") without re-inspecting. Watch a downstream cell, make an
  edit, and you will see the new value on your next step.
- eval_js — run native JavaScript scoped to a module, for computed transforms. The module's builtins
  (FileAttachment, md, html, Inputs, Plot, d3, Generators) and cells are in scope, and so are browser globals
  (DecompressionStream, window, document). This is how you DECODE an attachment: a gzipped attachment at
  /content/@user/mod/file.gz belongs to module "@user/mod" with FileAttachment name "file.gz", so run
  \`new Response((await FileAttachment("file.gz").stream()).pipeThrough(new DecompressionStream("gzip"))).text()\`
  scoped to "@user/mod". Compose multi-step: locate the raw ingredient, then transform it in userspace.
  This is also how you do NETWORK access:
  \`await (await fetch(url)).json()\` (or \`.text()\`). The notebook's networking layer handles the request; the
  result comes back as the eval_js output. To make a fetched value reactive/reusable, write_file a cell instead.

Work incrementally: inspect before editing, make the change, then TRUST THE APPLY REPORT — it tells you, in
the same step, whether the edit COMPILED and whether any cell ERRORS at runtime. That report IS your
confirmation: do NOT re-read a file you just wrote or edited "to check" — it wastes a step and tells you nothing
the apply did not. If a cell errors, fix it and re-apply, and keep going until no cell errors — that
self-correction is exactly right, not something to avoid. When you do want to survey live values, use ONE
list_values: it returns EVERY cell's value-or-error for the module at once, so prefer it over inspecting cells
one-by-one. Reserve inspect_value for drilling into a SINGLE specific cell (e.g. the live value of a \`viewof\`
element you added: inspect_value module="@user/mod" name="viewof game"). Cells are addressable by name the
instant the module compiles. Do NOT hunt for your own new cell with eval_js / Object.keys(this).
When you write_file a NEW module that has a \`viewof\`/visual cell, it is automatically opened as a pane in the
shared view — the human sees your creation in place immediately; you need do nothing to surface it. eval_js is
SCOPED to the module id you pass: its value cells are in scope by name and a \`viewof x\` element as \`viewof_x\`
(so you can drive a live control). To read or verify a cell's value, prefer inspect_value/list_values with the
module id over an eval_js probe.
When you verify, test against the task's OWN literal examples: copy the exact inputs and expected outputs
(exact casing, exact key names, exact argument shapes) from the spec into your check. Inventing your own test
inputs only confirms your own assumptions — a spec example that fails is precisely the signal you need.
Preserve the module format exactly. If a request is impossible or
ambiguous, say so and ask rather than guessing. Take a concrete action — a tool call — on EVERY turn; never
just describe what you are about to do and stop.
Writing code in your REPLY does nothing — your messages are never executed. The ONLY way to create or change
anything is to call write_file / edit_file with the actual module source. Never paste a code block into your
reply as a substitute for a tool call; if you catch yourself about to show code, call write_file with it instead.
You have a LIMITED step budget per turn, so don't over-explore: read AT MOST one or two relevant examples, then
START WRITING the module — build a small compiling skeleton first, then add cells one at a time. Prefer building
over more reading.
ALWAYS end your turn by calling \`task_complete\` with a short summary — even if you ran out of steps, got stuck,
or only partially finished: say what you built, what's left, and any blocker. NEVER stop silently (a turn that
ends with no task_complete leaves the user staring at a blank reply with no idea what happened). When the task
is fully done (or you have finished answering), call \`task_complete\`; that is how you end your turn.
task_complete ENDS the turn INSTANTLY — nothing runs after it. NEVER call it to announce what you are about to
do (a summary like "creating the module now" means the work never happens); do the work FIRST, verify it, then
call task_complete describing what you DID.
Report ONLY results you actually obtained from tool calls — never invent a tool's output. If you register or
build a new tool, you must then CALL that tool and read its real result before reporting what it returned.

SITUATION
A system message wrapped in <environment …> may precede the user's message. It is ambient observation of the
user's live browser — the time, the open panes, which cells are on screen, recent code edits, erroring cells —
NOT something you did and NOT a tool result; never report it as one. It is a snapshot taken when the turn
started: after many steps, or whenever what the user is currently looking at matters, call get_context to
refresh it. When the user says "this" or "the thing I'm looking at", the viewport/selection sections are
usually what they mean.`
)};
const _1ba32tn = function _OPENROUTER_API_KEY(Inputs,localStorageView){return(
Inputs.bind(Inputs.password({
  width: '100%',
  label: 'OpenRouter key',
  placeholder: 'sk-or-\u2026'
}), localStorageView('OPENROUTER_API_KEY'))
)};
const _e3skhu = (G, _) => G.input(_);
const _1n2587c = function _demoMode(OPENROUTER_API_KEY){return(
!String(OPENROUTER_API_KEY || '').trim()
)};
const _1fgn2a4 = function _openrouter_catalog()
{
  // Snapshot of openrouter.ai/api/v1/models (tool-capable models only, captured 2026-06-28) used as the
  // FALLBACK when the live fetch is slow (>5s) or unreachable, so the picker stays fully populated offline.
  // The old 6-model curated fallback dropped almost everything on a timeout (e.g. xiaomi/mimo-v2.5-pro went
  // missing → empty model → OpenRouter 400). A leading "*" marks a vision-capable (image-input) model.
  const SNAPSHOT = `
  *~anthropic/claude-fable-latest *~anthropic/claude-haiku-latest *~anthropic/claude-opus-latest
  *~anthropic/claude-sonnet-latest *~google/gemini-flash-latest *~google/gemini-pro-latest
  *~moonshotai/kimi-latest *~openai/gpt-latest *~openai/gpt-mini-latest ai21/jamba-large-1.7
  *amazon/nova-2-lite-v1 *amazon/nova-lite-v1 amazon/nova-micro-v1 *amazon/nova-premier-v1 *amazon/nova-pro-v1
  *anthropic/claude-3-haiku *anthropic/claude-fable-5 *anthropic/claude-haiku-4.5 *anthropic/claude-opus-4
  *anthropic/claude-opus-4.1 *anthropic/claude-opus-4.5 *anthropic/claude-opus-4.6
  *anthropic/claude-opus-4.6-fast *anthropic/claude-opus-4.7 *anthropic/claude-opus-4.7-fast
  *anthropic/claude-opus-4.8 *anthropic/claude-opus-4.8-fast *anthropic/claude-sonnet-4
  *anthropic/claude-sonnet-4.5 *anthropic/claude-sonnet-4.6 arcee-ai/trinity-large-thinking
  arcee-ai/trinity-mini arcee-ai/virtuoso-large *bytedance-seed/seed-1.6 *bytedance-seed/seed-1.6-flash
  *bytedance-seed/seed-2.0-lite *bytedance-seed/seed-2.0-mini cohere/command-r-08-2024
  cohere/command-r-plus-08-2024 cohere/north-mini-code:free deepseek/deepseek-chat
  deepseek/deepseek-chat-v3-0324 deepseek/deepseek-chat-v3.1 deepseek/deepseek-r1 deepseek/deepseek-r1-0528
  deepseek/deepseek-v3.1-terminus deepseek/deepseek-v3.2 deepseek/deepseek-v3.2-exp deepseek/deepseek-v4-flash
  deepseek/deepseek-v4-pro *google/gemini-2.5-flash *google/gemini-2.5-flash-lite
  *google/gemini-2.5-flash-lite-preview-09-2025 *google/gemini-2.5-pro *google/gemini-2.5-pro-preview
  *google/gemini-2.5-pro-preview-05-06 *google/gemini-3-flash-preview *google/gemini-3-pro-image
  *google/gemini-3.1-flash-lite *google/gemini-3.1-flash-lite-preview *google/gemini-3.1-pro-preview
  *google/gemini-3.1-pro-preview-customtools *google/gemini-3.5-flash *google/gemma-3-12b-it
  *google/gemma-3-27b-it *google/gemma-4-26b-a4b-it *google/gemma-4-26b-a4b-it:free *google/gemma-4-31b-it
  *google/gemma-4-31b-it:free ibm-granite/granite-4.1-8b inception/mercury-2 inclusionai/ling-2.6-1t
  inclusionai/ling-2.6-flash inclusionai/ring-2.6-1t kwaipilot/kat-coder-pro-v2
  liquid/lfm-2.5-1.2b-thinking:free meta-llama/llama-3.1-70b-instruct meta-llama/llama-3.1-8b-instruct
  meta-llama/llama-3.3-70b-instruct meta-llama/llama-3.3-70b-instruct:free *meta-llama/llama-4-maverick
  *meta-llama/llama-4-scout minimax/minimax-m1 minimax/minimax-m2 minimax/minimax-m2.1 minimax/minimax-m2.5
  minimax/minimax-m2.7 *minimax/minimax-m3 mistralai/codestral-2508 mistralai/devstral-2512
  *mistralai/ministral-14b-2512 *mistralai/ministral-3b-2512 *mistralai/ministral-8b-2512
  mistralai/mistral-large mistralai/mistral-large-2407 *mistralai/mistral-large-2512
  *mistralai/mistral-medium-3 *mistralai/mistral-medium-3-5 *mistralai/mistral-medium-3.1
  mistralai/mistral-nemo mistralai/mistral-saba *mistralai/mistral-small-2603
  *mistralai/mistral-small-3.2-24b-instruct mistralai/mixtral-8x22b-instruct mistralai/voxtral-small-24b-2507
  moonshotai/kimi-k2 moonshotai/kimi-k2-0905 moonshotai/kimi-k2-thinking *moonshotai/kimi-k2.5
  *moonshotai/kimi-k2.6 *moonshotai/kimi-k2.7-code nvidia/llama-3.3-nemotron-super-49b-v1.5
  nvidia/nemotron-3-nano-30b-a3b nvidia/nemotron-3-nano-30b-a3b:free
  *nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free nvidia/nemotron-3-super-120b-a12b
  nvidia/nemotron-3-super-120b-a12b:free nvidia/nemotron-3-ultra-550b-a55b
  nvidia/nemotron-3-ultra-550b-a55b:free *nvidia/nemotron-nano-12b-v2-vl:free nvidia/nemotron-nano-9b-v2:free
  openai/gpt-3.5-turbo openai/gpt-3.5-turbo-0613 openai/gpt-3.5-turbo-16k openai/gpt-4 *openai/gpt-4-turbo
  openai/gpt-4-turbo-preview *openai/gpt-4.1 *openai/gpt-4.1-mini *openai/gpt-4.1-nano *openai/gpt-4o
  *openai/gpt-4o-2024-05-13 *openai/gpt-4o-2024-08-06 *openai/gpt-4o-2024-11-20 *openai/gpt-4o-mini
  *openai/gpt-4o-mini-2024-07-18 *openai/gpt-5 *openai/gpt-5-codex *openai/gpt-5-mini *openai/gpt-5-nano
  *openai/gpt-5-pro *openai/gpt-5.1 *openai/gpt-5.1-chat *openai/gpt-5.1-codex *openai/gpt-5.1-codex-max
  *openai/gpt-5.1-codex-mini *openai/gpt-5.2 *openai/gpt-5.2-chat *openai/gpt-5.2-codex *openai/gpt-5.2-pro
  *openai/gpt-5.3-chat *openai/gpt-5.3-codex *openai/gpt-5.4 *openai/gpt-5.4-mini *openai/gpt-5.4-nano
  *openai/gpt-5.4-pro *openai/gpt-5.5 *openai/gpt-5.5-pro openai/gpt-audio openai/gpt-audio-mini
  *openai/gpt-chat-latest openai/gpt-oss-120b openai/gpt-oss-120b:free openai/gpt-oss-20b
  openai/gpt-oss-20b:free openai/gpt-oss-safeguard-20b *openai/o1 *openai/o3 *openai/o3-deep-research
  openai/o3-mini openai/o3-mini-high *openai/o3-pro *openai/o4-mini *openai/o4-mini-deep-research
  *openai/o4-mini-high *openrouter/auto *openrouter/free openrouter/owl-alpha poolside/laguna-m.1
  poolside/laguna-m.1:free poolside/laguna-xs.2 poolside/laguna-xs.2:free qwen/qwen-2.5-72b-instruct
  qwen/qwen-2.5-7b-instruct qwen/qwen-plus qwen/qwen-plus-2025-07-28 qwen/qwen-plus-2025-07-28:thinking
  qwen/qwen3-14b qwen/qwen3-235b-a22b qwen/qwen3-235b-a22b-2507 qwen/qwen3-235b-a22b-thinking-2507
  qwen/qwen3-30b-a3b qwen/qwen3-30b-a3b-instruct-2507 qwen/qwen3-30b-a3b-thinking-2507 qwen/qwen3-32b
  qwen/qwen3-8b qwen/qwen3-coder qwen/qwen3-coder-30b-a3b-instruct qwen/qwen3-coder-flash
  qwen/qwen3-coder-next qwen/qwen3-coder-plus qwen/qwen3-coder:free qwen/qwen3-max qwen/qwen3-max-thinking
  qwen/qwen3-next-80b-a3b-instruct qwen/qwen3-next-80b-a3b-instruct:free qwen/qwen3-next-80b-a3b-thinking
  *qwen/qwen3-vl-235b-a22b-instruct *qwen/qwen3-vl-235b-a22b-thinking *qwen/qwen3-vl-30b-a3b-instruct
  *qwen/qwen3-vl-30b-a3b-thinking *qwen/qwen3-vl-32b-instruct *qwen/qwen3-vl-8b-instruct
  *qwen/qwen3-vl-8b-thinking *qwen/qwen3.5-122b-a10b *qwen/qwen3.5-27b *qwen/qwen3.5-35b-a3b
  *qwen/qwen3.5-397b-a17b *qwen/qwen3.5-9b *qwen/qwen3.5-flash-02-23 *qwen/qwen3.5-plus-02-15
  *qwen/qwen3.5-plus-20260420 *qwen/qwen3.6-27b *qwen/qwen3.6-35b-a3b *qwen/qwen3.6-flash
  qwen/qwen3.6-max-preview *qwen/qwen3.6-plus qwen/qwen3.7-max *qwen/qwen3.7-plus *rekaai/reka-edge
  relace/relace-search *sakana/fugu-ultra sao10k/l3.1-euryale-70b stepfun/step-3.5-flash
  *stepfun/step-3.7-flash tencent/hy3-preview thedrummer/unslopnemo-12b upstage/solar-pro-3 *x-ai/grok-4.20
  *x-ai/grok-4.3 *x-ai/grok-build-0.1 *xiaomi/mimo-v2.5 xiaomi/mimo-v2.5-pro z-ai/glm-4.5 z-ai/glm-4.5-air
  *z-ai/glm-4.5v z-ai/glm-4.6 *z-ai/glm-4.6v z-ai/glm-4.7 z-ai/glm-4.7-flash z-ai/glm-5 z-ai/glm-5-turbo
  z-ai/glm-5.1 z-ai/glm-5.2 *z-ai/glm-5v-turbo
`;
  const fb = () => {
    const entries = SNAPSHOT.trim().split(/\s+/);
    const ids = entries.map(s => s.replace(/^\*/, ''));
    const vision = new Set(entries.filter(s => s[0] === '*').map(s => s.slice(1)));
    return {
      ids: ids.sort(),
      vision
    };
  };
  const hasTools = m => Array.isArray(m.supported_parameters) && m.supported_parameters.includes('tools');
  const hasVision = m => Array.isArray(m.architecture && m.architecture.input_modalities) && m.architecture.input_modalities.includes('image');
  const fetched = window.fetch('https://openrouter.ai/api/v1/models').then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))).then(j => {
    const models = (j.data || []).filter(m => m && m.id);
    const toolOnly = models.filter(hasTools);
    const use = toolOnly.length ? toolOnly : models;
    return {
      ids: use.map(m => m.id).sort(),
      vision: new Set(use.filter(hasVision).map(m => m.id))
    };
  }).catch(fb);
  // Fall back to the embedded snapshot if the live catalog has not resolved within 5s.
  const timed = new Promise(res => window.setTimeout(() => res(fb()), 5000));
  return Promise.race([
    fetched,
    timed
  ]);
};
const _12iwsf7 = function _openrouter_models(demoMode,openrouter_catalog){return(
demoMode ? [
  'xiaomi/mimo-v2.5-pro',
  'xiaomi/mimo-v2.5'
] : openrouter_catalog.ids
)};
const _ycgtm0 = function _openrouter_vision(openrouter_catalog){return(
openrouter_catalog.vision
)};
const _190jvha = function _model(localStorageView,demoMode,openrouter_models,Inputs,openrouter_vision)
{
  // Bind to the persisted choice, and ALWAYS keep that choice a selectable <option> — even when the live
  // catalog fetch timed out / returned the curated fallback that omits it. A model not in the option list
  // leaves the <select> value EMPTY, so chat() sends an empty model → OpenRouter 400 (the first-turn race).
  const stored = localStorageView('robocoop4_model', { defaultValue: 'anthropic/claude-sonnet-4' });
  let sel = String(stored.value || 'anthropic/claude-sonnet-4');
  // Demo mode reaches only MiMo (gateway guardrail); coerce any other stored choice, and DON'T union it in
  // (a stale sonnet choice would 404 through the gateway).
  if (demoMode && !openrouter_models.includes(sel))
    sel = openrouter_models[0];
  // Write the coerced choice back BEFORE bind: Inputs.bind syncs stored.value into the <select>, and a stale
  // choice not in the demo option list resolves to null → empty model → gateway 400 on the first turn.
  if (demoMode && stored.value !== sel)
    stored.value = sel;
  const options = demoMode ? openrouter_models.slice() : Array.from(new Set([
    sel,
    ...openrouter_models
  ]));
  return Inputs.bind(Inputs.select(options, {
    label: 'model',
    value: sel,
    // value stays the clean id; only the displayed label warns when a model can't see images.
    format: id => openrouter_vision.has(id) ? id : id + '  \u26A0 no vision (text only)'
  }), stored);
};
const _1870whr = (G, _) => G.input(_);
const _1vg55o6 = function _rc5_systemPrompt(composeFooter,wiki_index,systemPrompt,Inputs)
{
  const footer = composeFooter({
    workdir: '/src',
    model: ''
  });
  const wiki = wiki_index ? '\n\n' + wiki_index : '';
  const base = systemPrompt + '\n\n' + footer + wiki;
  return Inputs.textarea({
    label: 'system prompt',
    rows: 4,
    value: base,
    width: '100%'
  });
};
const _kxiyos = (G, _) => G.input(_);
const _djvjqm = function _keyView($0){return(
$0
)};
const _17c024i = function _modelView($0){return(
$0
)};
const _gdleyk = function _promptView($0){return(
$0
)};
const _5agv7a = function _client(OPENROUTER_API_KEY,createOpenRouterClient)
{
  const key = String(OPENROUTER_API_KEY || '').trim();
  if (!key)
    return createOpenRouterClient({
      baseUrl: 'https://openrouter-gateway.endpointservices.workers.dev/v1',
      referer: 'https://lopecode.com',
      title: 'robocoop-5'
    });
  return createOpenRouterClient({
    apiKey: key,
    referer: 'https://lopecode.com',
    title: 'robocoop-5'
  });
};
const _ctxtog = function _contextToggle(Inputs){return(
Inputs.toggle({
  label: 'situational context',
  value: true
})
)};
const _zqho0j = function _session(client,createAgentSession,toolsView,modelView,promptView,rc5_watchBus,contextView,composeContext,contextToggle,specGateCheck,rc5_specGate)
{
  if (!client) {
    return {
      messages: [],
      async send() {
        throw new Error('Set your OpenRouter key above to start chatting.');
      },
      abort() {
      },
      reset() {
      }
    };
  }
  // The registry can read EMPTY transiently (hostSetup re-registers on invalidation; late boot activity
  // recomputes it) — a send landing in that window shows the model NO tools and it truthfully reports it
  // cannot work. Same defensive shape as the loop's lastModel: remember the last non-empty tool set.
  let lastTools = [];
  return createAgentSession({
    client,
    toolsProvider: () => {
      const t = Array.isArray(toolsView.value) ? toolsView.value : [];
      if (t.length)
        lastTools = t;
      return lastTools;
    },
    modelProvider: () => modelView.value,
    systemPromptProvider: () => promptView.value,
    runCommand: () => ({
      stdout: '',
      stderr: 'robocoop-5 has no shell \u2014 use the file tools',
      exitCode: 1
    }),
    // watched-variable changes stream into the loop: drained at the top of each step and injected as context
    noticesProvider: () => rc5_watchBus.drain(),
    // Situational context: whatever is registered under 'rc5-context' (see robocoop-5-context), composed
    // per scope at send() time. Reads contextView (mutable box) and the toggle ELEMENT imperatively, so
    // neither registering a provider nor flipping the toggle rebuilds the session.
    contextProvider: ({scope, turn}) => contextToggle.value === false ? null : composeContext(Array.isArray(contextView.value) ? contextView.value : [], {
      scope,
      turn
    }),
    // explicit-completion loop: end on task_complete, not on bare text; nudge a stalled turn before giving up
    completeToolName: 'task_complete',
    // Push back (once per turn) on completion with ZERO tool calls: a work request "completed" without a
    // single tool call is a fabricated summary — nothing ran (observed on mimo: step-1 task_complete
    // announcing modules it never wrote). A genuinely tool-free reply survives the guard: the model just
    // calls task_complete again and it is accepted.
    // spec-lock comes FIRST: a red spec scorecard is a harder signal than tool-call count (the model did
    // work, it just does not pass the task's own literal examples). SPEC-WAIVER in the summary opts out.
    completeGuard: info => specGateCheck(rc5_specGate.scorecard, info.summary) ?? (info.toolCallsThisTurn === 0 ? 'REJECTED: you have made NO tool calls this turn, so nothing has been created, changed, or verified \u2014 ' + 'a completion summary now would be fiction. Do the work first with real tool calls (read_file / ' + 'write_file / edit_file / eval_js / \u2026), verify it, then call task_complete describing what you DID. ' + 'If this request truly requires no tool work \u2014 including when you are ASKING THE USER for information ' + 'or a decision only they can provide \u2014 call task_complete again with your answer or question as the ' + 'summary; asking the user is a legitimate tool-free turn.' : null),
    stallNudgeLimit: 2,
    maxStepsPerTurn: 40,
    // Reasoning models spend completion budget on reasoning; give headroom for reasoning + a full write_file.
    maxTokens: 32000
  });
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-5-tools", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-tools.js?v=4")).default));  
  main.define("module @tomlarkworthy/robocoop-5-core", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-core.js?v=4")).default));  
  main.define("module @tomlarkworthy/markdown-wiki", async () => runtime.module((await import("/@tomlarkworthy/markdown-wiki.js?v=4")).default));  
  $def("_17mvjwx", "__seed", [], _17mvjwx);  
  $def("_yifgln", "systemPrompt", [], _yifgln);  
  $def("_1ba32tn", "viewof OPENROUTER_API_KEY", ["Inputs","localStorageView"], _1ba32tn);  
  $def("_e3skhu", "OPENROUTER_API_KEY", ["Generators","viewof OPENROUTER_API_KEY"], _e3skhu);  
  $def("_1n2587c", "demoMode", ["OPENROUTER_API_KEY"], _1n2587c);  
  $def("_1fgn2a4", "openrouter_catalog", [], _1fgn2a4);  
  $def("_12iwsf7", "openrouter_models", ["demoMode","openrouter_catalog"], _12iwsf7);  
  $def("_ycgtm0", "openrouter_vision", ["openrouter_catalog"], _ycgtm0);  
  $def("_190jvha", "viewof model", ["localStorageView","demoMode","openrouter_models","Inputs","openrouter_vision"], _190jvha);  
  $def("_1870whr", "model", ["Generators","viewof model"], _1870whr);  
  $def("_1vg55o6", "viewof rc5_systemPrompt", ["composeFooter","wiki_index","systemPrompt","Inputs"], _1vg55o6);  
  $def("_kxiyos", "rc5_systemPrompt", ["Generators","viewof rc5_systemPrompt"], _kxiyos);  
  $def("_djvjqm", "keyView", ["viewof OPENROUTER_API_KEY"], _djvjqm);  
  $def("_17c024i", "modelView", ["viewof model"], _17c024i);  
  $def("_gdleyk", "promptView", ["viewof rc5_systemPrompt"], _gdleyk);  
  $def("_5agv7a", "client", ["OPENROUTER_API_KEY","createOpenRouterClient"], _5agv7a);
  $def("_ctxtog", "contextToggle", ["Inputs"], _ctxtog);
  $def("_zqho0j", "session", ["client","createAgentSession","toolsView","modelView","promptView","rc5_watchBus","contextView","composeContext","contextToggle","specGateCheck","rc5_specGate"], _zqho0j);
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  main.define("toolsView", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("toolsView", _));
  main.define("contextView", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("contextView", _));
  main.define("rc5_watchBus", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("rc5_watchBus", _));
  main.define("rc5_specGate", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("rc5_specGate", _));
  main.define("specGateCheck", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("specGateCheck", _));
  main.define("createAgentSession", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("createAgentSession", _));
  main.define("composeContext", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("composeContext", _));
  main.define("createOpenRouterClient", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("createOpenRouterClient", _));  
  main.define("composeFooter", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("composeFooter", _));  
  main.define("wiki_index", ["module @tomlarkworthy/markdown-wiki", "@variable"], (_, v) => v.import("wiki_index", _));
  return main;
}