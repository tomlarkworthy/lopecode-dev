export const meta = {
  name: 'build-robocoop-4',
  description: 'Build robocoop-4: an embedded coding agent on justbash (virtual fs) + OpenRouter, with a programmatic-assertion eval of notebook-manipulation tasks',
  phases: [
    { title: 'Understand', detail: 'parallel readers map justbash, robocoop-3, OpenRouter, fs<->notebook integration' },
    { title: 'Design', detail: 'judge panel: N architecture proposals -> score -> synthesize DESIGN.md + spec' },
    { title: 'Build', detail: 'implement node-runnable core (.mjs) + browser notebook modules + eval harness/tasks' },
    { title: 'Verify', detail: 'node syntax check + scripted-agent (no-API-key) eval dry run; report' },
  ],
}

// ---- shared context embedded so headless agents are not lost -------------------
const ROOT = '/Users/tom.larkworthy/dev/lopecode-dev'
const OUT = `${ROOT}/tools/robocoop-4`

const SUBSTRATE = `
You are building robocoop-4 inside the lopecode repo at ${ROOT}.
Read CLAUDE.md conventions: files go under tools/ (never /tmp); terse comments (default none);
lopecode cell format is \`const _name = function _name(dep1, md){ return( md\\\`...\\\` ) };\`.

SUBSTRATE FACTS (verify by reading the files named, do not trust blindly):
- justbash notebook: lopebooks/notebooks/@tomlarkworthy_justbash.html
- justbash modules + their exports:
  * @tomlarkworthy/just-bash (engine): Bash, InMemoryFs, MountableFs, defineCommand, getCommandNames
  * @tomlarkworthy/justbash-session: createSession(fs), createWorkspace(files), formatResult(res)
  * @tomlarkworthy/justbash-terminal: terminal(session) -> readline DOM widget rendering from session events
  * @tomlarkworthy/justbash-filesync: live fs<->runtime module sync
- just-bash npm v3.0.1 IS installed at tools/justbash-build/node_modules/just-bash (usable from node/bun).
  Node entry: import { Bash, InMemoryFs } from 'just-bash'. Browser entry: 'just-bash/browser' (79 cmds, no gzip).
  API: new Bash({fs, cwd, env}); exec(cmd, {cwd, env, stdin}) -> { stdout, stderr, exitCode, env }.
  exec is STATELESS (only the fs persists across calls); a shared InMemoryFs across Bash instances = multiple shells over one fs.
  justbash-session.createSession(fs) layers cwd/env statefulness on top (tracks result.env.PWD).
- robocoop lineage: lopecode/notebooks/@tomlarkworthy_robocoop-3.html imports @tomlarkworthy/robocoop-2,
  manipulates code via @tomlarkworthy/observablejs-toolchain, and does bespoke function-calling to
  api.openai.com/v1 and api.anthropic.com/v1. robocoop-4 REPLACES those two layers:
  (a) OpenRouter as the single model gateway, (b) the justbash virtual fs as the agent's read/manipulate surface.
- window.justbash bridge in the notebook exposes {run, exec, read, write, ls, snapshot, shells}.

ARCHITECTURE DECISIONS (fixed by the user, do not relitigate):
- Tool surface is BASH-CENTRIC: the agent gets ONE primary tool, \`bash\`, that runs a command string in a
  justbash session over an InMemoryFs (cat/grep/sed/ls/awk/etc.). No structured per-edit tools.
- Eval grading is PROGRAMMATIC ASSERTIONS only: each task ships expected post-state checks against the fs
  (file contents, presence/absence of identifiers, parses-without-syntax-error, etc.). No LLM judge.
- Model gateway is OpenRouter: POST https://openrouter.ai/api/v1/chat/completions, OpenAI-compatible
  chat-completions schema, Authorization: Bearer <OPENROUTER_API_KEY>, supports \`tools\`/\`tool_calls\`
  (function calling). Model ids look like \`anthropic/claude-opus-4\`, \`openai/gpt-4.1\`, etc.

CORE-LOGIC PORTABILITY RULE (critical): the agent loop, the bash tool, and the OpenRouter client must be
plain DOM-free .mjs modules under ${OUT}/ so the SAME code runs in (a) the node eval harness (using the
'just-bash' node package + InMemoryFs) and (b) the browser notebook (using window.justbash / the browser engine).
The OpenRouter client must accept a pluggable transport/fetch and an API key, and the agent loop must accept a
pluggable model client so the eval can inject a deterministic SCRIPTED client (no API key, no network) for self-test.
`

const UNDERSTAND_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'summary', 'contracts', 'gotchas'],
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: '3-6 sentence map of this area' },
    contracts: {
      type: 'array',
      description: 'concrete APIs/signatures robocoop-4 will call or implement',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'signature', 'notes'],
        properties: { name: { type: 'string' }, signature: { type: 'string' }, notes: { type: 'string' } },
      },
    },
    gotchas: { type: 'array', items: { type: 'string' } },
  },
}

const PROPOSAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['approach', 'agentLoop', 'bashTool', 'openrouterClient', 'fsNotebookMapping', 'fileLayout', 'risks'],
  properties: {
    approach: { type: 'string', description: 'one-line angle of this proposal' },
    agentLoop: { type: 'string', description: 'how the tool-use loop works: messages, tool_calls, stop condition, max steps' },
    bashTool: { type: 'string', description: 'the bash tool JSON schema + how it maps to a justbash session/exec' },
    openrouterClient: { type: 'string', description: 'request/response shape, auth, tool-calling, pluggable fetch/key' },
    fsNotebookMapping: { type: 'string', description: 'how notebook modules/cells are laid out as files in the InMemoryFs the agent edits, and how edits flow back' },
    fileLayout: { type: 'array', items: { type: 'string' }, description: 'planned files under tools/robocoop-4/' },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['scores', 'winnerIndex', 'graftFromOthers'],
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['proposalIndex', 'score', 'rationale'],
        properties: { proposalIndex: { type: 'integer' }, score: { type: 'number' }, rationale: { type: 'string' } },
      },
    },
    winnerIndex: { type: 'integer' },
    graftFromOthers: { type: 'array', items: { type: 'string' }, description: 'best ideas to graft from non-winners' },
  },
}

const SPEC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['designPath', 'fileLayout', 'bashToolSchema', 'evalTaskIdeas'],
  properties: {
    designPath: { type: 'string' },
    fileLayout: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['path', 'purpose', 'exports'],
        properties: { path: { type: 'string' }, purpose: { type: 'string' }, exports: { type: 'array', items: { type: 'string' } } },
      },
    },
    bashToolSchema: { type: 'string', description: 'the exact JSON tool schema for the bash tool' },
    evalTaskIdeas: { type: 'array', items: { type: 'string' }, description: '6-10 simple notebook-manipulation task ideas' },
  },
}

const WRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'exports', 'lines', 'notes'],
  properties: {
    path: { type: 'string' }, exports: { type: 'array', items: { type: 'string' } },
    lines: { type: 'integer' }, notes: { type: 'string' },
  },
}

const EVAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['runnerPath', 'taskCount', 'tasks'],
  properties: {
    runnerPath: { type: 'string' },
    taskCount: { type: 'integer' },
    tasks: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'intent'],
        properties: { id: { type: 'string' }, intent: { type: 'string' } },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['syntaxOk', 'mockEvalRan', 'passed', 'failed', 'issues', 'commandToRunRealEval'],
  properties: {
    syntaxOk: { type: 'boolean' },
    mockEvalRan: { type: 'boolean' },
    passed: { type: 'integer' },
    failed: { type: 'integer' },
    issues: { type: 'array', items: { type: 'string' } },
    commandToRunRealEval: { type: 'string' },
  },
}

// ============================ PHASE 1: UNDERSTAND ============================
phase('Understand')
const AREAS = [
  { key: 'justbash', prompt: `Map the justbash substrate robocoop-4's bash tool will run on. Read lopebooks/notebooks/@tomlarkworthy_justbash.html (grep for the four module <script> ids; do NOT dump the whole 2.7MB file) and tools/justbash-build/ (filesync-adapter.mjs, smoke*.mjs, package.json) and the installed package at tools/justbash-build/node_modules/just-bash (its package.json "exports", and a quick look at the node entry's named exports). Confirm: how to construct a Bash + InMemoryFs in NODE, the exact exec() signature and that it is stateless, how createSession adds statefulness, and what the window.justbash bridge exposes. Report the concrete contracts robocoop-4's bash tool will call.` },
  { key: 'robocoop-3', prompt: `Map robocoop-3 so robocoop-4 carries forward what works and replaces the two layers we are swapping. From lopecode/notebooks/@tomlarkworthy_robocoop-3.html extract ONLY the @tomlarkworthy/robocoop-3 and @tomlarkworthy/robocoop-2 module <script> blocks (grep by id, decode if base64). Identify: the agent/tool-use loop shape, the system prompt strategy, how it currently reads+edits cells (observablejs-toolchain), how it calls openai/anthropic and parses tool calls, and the UI surface (chat panel). Report contracts to reuse and the exact seams where OpenRouter (model) and justbash-fs (manipulation) replace the old code.` },
  { key: 'openrouter', prompt: `Define the OpenRouter client contract for robocoop-4. Use WebFetch on https://openrouter.ai/api/v1 docs and https://openrouter.ai/docs/api-reference/chat-completion if reachable; otherwise rely on the known fact that OpenRouter is OpenAI-chat-completions compatible. Specify precisely: endpoint, required headers (Authorization Bearer, optional HTTP-Referer/X-Title), the request body for a tool-calling turn (messages, tools[], tool_choice), the response shape (choices[].message.tool_calls[] with id/function.name/function.arguments, finish_reason), how to send tool results back (role:'tool', tool_call_id), and streaming vs non-streaming. The client must take a pluggable fetch and apiKey (env OPENROUTER_API_KEY in node). List 3 good default model ids for a coding agent.` },
  { key: 'integration', prompt: `Define how robocoop-4's virtual fs maps to a real lopecode notebook and how it ships. Read knowledge/how-file-attachments-work.md (skim), knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md (the sync-module + jumpgate workflow), and the justbash-filesync notes in tools/justbash-build/filesync-adapter.mjs. Report: (a) a layout for representing a notebook's modules/cells as files in the InMemoryFs the agent edits (e.g. /notebook/@user/module.js), (b) how an edited file flows back to the live runtime (filesync pattern) for the browser notebook, (c) how the eval instead seeds + reads the fs purely in node with no runtime. Note the exporter-3 / cross-module-import drop gotcha if relevant.` },
]
const understand = (await parallel(AREAS.map(a => () =>
  agent(`${SUBSTRATE}\n\nYOUR TASK (area=${a.key}): ${a.prompt}`, { label: `understand:${a.key}`, phase: 'Understand', schema: UNDERSTAND_SCHEMA })
))).filter(Boolean)

const understandDigest = understand.map(u =>
  `### ${u.area}\n${u.summary}\nContracts:\n${u.contracts.map(c => `- ${c.name}: ${c.signature} — ${c.notes}`).join('\n')}\nGotchas:\n${u.gotchas.map(g => `- ${g}`).join('\n')}`
).join('\n\n')

// ============================ PHASE 2: DESIGN ============================
phase('Design')
const ANGLES = [
  'minimal-first: smallest agent loop that can pass the eval; bash tool + one model client, nothing speculative',
  'robustness-first: explicit step budget, tool-result truncation, error-recovery prompting, deterministic replay seam for the scripted client',
  'notebook-native-first: optimize the fs<->notebook mapping and the live filesync round-trip so the same core powers the browser UI cleanly',
]
const proposals = (await parallel(ANGLES.map((angle, i) => () =>
  agent(`${SUBSTRATE}\n\nUNDERSTAND DIGEST:\n${understandDigest}\n\nPropose a robocoop-4 architecture from this angle: "${angle}". Be concrete and buildable; every file you list goes under ${OUT}/. Keep the agent loop, bash tool, and OpenRouter client DOM-free and node-runnable.`,
    { label: `design:proposal-${i}`, phase: 'Design', schema: PROPOSAL_SCHEMA })
))).filter(Boolean)

const proposalText = proposals.map((p, i) =>
  `## Proposal ${i} (${p.approach})\n- agentLoop: ${p.agentLoop}\n- bashTool: ${p.bashTool}\n- openrouterClient: ${p.openrouterClient}\n- fsNotebookMapping: ${p.fsNotebookMapping}\n- fileLayout: ${p.fileLayout.join(', ')}\n- risks: ${p.risks.join('; ')}`
).join('\n\n')

const judges = (await parallel(['correctness/buildability', 'eval-fitness (will it pass programmatic notebook-manip tasks?)', 'simplicity/maintainability'].map(lens => () =>
  agent(`Judge these robocoop-4 proposals through the lens: ${lens}.\n\n${proposalText}\n\nScore each 0-10 and pick a winner index. List concrete ideas worth grafting from non-winners.`,
    { label: `design:judge`, phase: 'Design', schema: JUDGE_SCHEMA })
))).filter(Boolean)

const spec = await agent(
  `${SUBSTRATE}\n\nUNDERSTAND DIGEST:\n${understandDigest}\n\nPROPOSALS:\n${proposalText}\n\nJUDGE VERDICTS:\n${JSON.stringify(judges)}\n\n`
  + `Synthesize ONE final design. Pick the strongest proposal as the spine and graft the best ideas from the others. `
  + `WRITE the design to ${OUT}/DESIGN.md (create the dir). The DESIGN.md must include: the bash tool JSON schema, the OpenRouter client interface, the agent-loop pseudocode (with step budget + scripted-client seam), the fs<->notebook file layout, and the planned file list with one-line purposes. `
  + `Then return the structured spec. fileLayout must be the concrete list of files to build under ${OUT}/, and evalTaskIdeas must be 6-10 SIMPLE notebook-manipulation tasks gradable by programmatic fs assertions (e.g. rename a cell identifier, add a markdown cell, fix a syntax error, change a numeric literal, add an import, delete a cell, reorder so X precedes Y).`,
  { label: 'design:synthesize', phase: 'Design', schema: SPEC_SCHEMA })

const specText = `DESIGN at ${spec.designPath}\nFILES:\n${spec.fileLayout.map(f => `- ${f.path} :: ${f.purpose} :: exports {${f.exports.join(', ')}}`).join('\n')}\n\nBASH TOOL SCHEMA:\n${spec.bashToolSchema}\n\nEVAL TASK IDEAS:\n${spec.evalTaskIdeas.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

// ============================ PHASE 3: BUILD ============================
// Core .mjs, notebook modules, and eval harness all depend on the agreed spec
// (not on each other's implementations), so build them concurrently.
phase('Build')

const CORE_COMPONENTS = [
  { key: 'openrouter-client', file: `${OUT}/openrouter-client.mjs`, brief: `Build the OpenRouter chat-completions client per DESIGN.md. DOM-free .mjs. export an async function (e.g. createOpenRouterClient({apiKey, fetch, model, baseUrl})) returning {chat(messages, tools, opts)} that returns the assistant message incl. tool_calls. Read apiKey from arg or process.env.OPENROUTER_API_KEY. Pluggable fetch (default globalThis.fetch). Handle finish_reason and tool_calls parsing (function.arguments is a JSON string -> parse). No streaming needed for v1 but leave a clear seam.` },
  { key: 'bash-tool', file: `${OUT}/bash-tool.mjs`, brief: `Build the single bash tool per DESIGN.md. DOM-free .mjs. export the tool JSON schema (name 'bash', one string param 'command') AND an executor factory (e.g. makeBashTool(session)) that runs a command in a justbash session and returns {stdout, stderr, exitCode} formatted as a compact string for the model. It must accept an injected session/exec so it works with both the node 'just-bash' package and the browser window.justbash. Truncate huge output sensibly.` },
  { key: 'agent-loop', file: `${OUT}/agent-loop.mjs`, brief: `Build the tool-use agent loop per DESIGN.md. DOM-free .mjs. export async runAgent({client, tools, system, task, maxSteps, onEvent}). Loop: send messages -> if assistant returns tool_calls, execute each via the matching tool executor, append role:'tool' results, repeat; stop when no tool_calls or maxSteps hit. client is pluggable (real OpenRouter OR a deterministic scripted client). Emit onEvent for each step/tool-call so the browser terminal and the eval can observe. Return {messages, steps, stopReason}.` },
  { key: 'notebook-modules', file: `${OUT}/notebook-modules.js`, brief: `Author the lopecode notebook module SOURCE for robocoop-4 as a single annotated .js file containing each cell in lopecode cell format (const _name = function _name(deps){...}). Modules: @tomlarkworthy/robocoop-4 (main: chat UI panel + system prompt + wiring to the .mjs core via dynamic import, a viewof for the OpenRouter API key, model picker, and the justbash session/fs). Reuse @tomlarkworthy/justbash-session + justbash-terminal for the shell view and @tomlarkworthy/claude-code-pairing patterns where helpful. This is SOURCE for later live-assembly via the pairing channel — do not try to embed into HTML. Add a header comment block explaining how to assemble it (create_module + define_cell, or sync into a justbash-based notebook).` },
]

const evalBuild = [
  { key: 'eval-harness', file: `${OUT}/eval/run-eval.mjs`, brief: `Build the node eval runner per DESIGN.md at ${OUT}/eval/run-eval.mjs. For each task: build a fresh InMemoryFs from the 'just-bash' node package (import from ${ROOT}/tools/justbash-build/node_modules/just-bash), seed it with the task's starting files, build a justbash session, build the bash tool (../bash-tool.mjs) and agent loop (../agent-loop.mjs). Default mode uses a SCRIPTED client (deterministic, replays the task's recorded tool-call commands) so it runs with NO API key. If OPENROUTER_API_KEY is set and --real is passed, use the real ../openrouter-client.mjs. After the run, execute the task's programmatic assertions against the final fs and print a pass/fail table + exit code. Make it runnable: 'node tools/robocoop-4/eval/run-eval.mjs'. Each assertion is a pure predicate over (fs, finalState). Keep it dependency-light (node built-ins + just-bash only).` },
  { key: 'eval-tasks', file: `${OUT}/eval/tasks/`, brief: `Author 6-10 SIMPLE notebook-manipulation eval tasks per the spec's evalTaskIdeas, as data files under ${OUT}/eval/tasks/ (one file per task or a single tasks.mjs exporting an array). Each task = {id, intent, seedFiles: {path: contents}, prompt (the natural-language instruction the agent receives), assertions: [fn(fs)->{ok,msg}], scriptedCommands: [bash strings] for the no-API-key mock run}. Seed files are tiny lopecode-format module .js snippets. Cover: rename a cell identifier across the file, add a markdown cell, fix a deliberate syntax error so it parses, change a numeric literal, add an import line, delete a cell, reorder two cells. Assertions must be deterministic fs checks (string presence/absence, parses via a lightweight check, line order). scriptedCommands must actually satisfy the assertions when replayed (so the mock eval goes green).` },
]

const built = (await parallel([
  ...CORE_COMPONENTS.map(c => () =>
    agent(`${SUBSTRATE}\n\nSPEC:\n${specText}\n\nFIRST read ${spec.designPath} for the agreed interfaces, then BUILD: ${c.brief}\nWrite the file to ${c.file}. Keep imports/exports exactly matching the DESIGN so sibling files interlock. Return the structured result.`,
      { label: `build:${c.key}`, phase: 'Build', schema: WRITE_SCHEMA })
  ),
  ...evalBuild.map(c => () =>
    agent(`${SUBSTRATE}\n\nSPEC:\n${specText}\n\nFIRST read ${spec.designPath} for the agreed interfaces (bash tool, agent loop, client), then BUILD: ${c.brief}\nReturn the structured result (use EVAL fields if you are the harness/tasks builder, else WRITE fields).`,
      { label: `build:${c.key}`, phase: 'Build', schema: c.key === 'eval-harness' || c.key === 'eval-tasks' ? EVAL_SCHEMA : WRITE_SCHEMA })
  ),
])).filter(Boolean)

// ============================ PHASE 4: VERIFY ============================
phase('Verify')
const verify = await agent(
  `${SUBSTRATE}\n\nThe robocoop-4 core, notebook module source, and eval harness/tasks were just written under ${OUT}/.\n`
  + `VERIFY end-to-end WITHOUT any API key or browser:\n`
  + `1. node --check every .mjs/.js file under ${OUT}/ (and report any syntax errors).\n`
  + `2. Run the eval in mock/scripted mode: 'node ${OUT}/eval/run-eval.mjs' (it must use the scripted client, no network). Capture pass/fail counts.\n`
  + `3. If something is broken (missing export, wrong import path, scripted commands that don't satisfy assertions, just-bash import path wrong), FIX it directly with minimal edits and re-run until the mock eval is green or you have a precise blocker.\n`
  + `Report syntaxOk, whether the mock eval ran, passed/failed counts, any remaining issues, and the exact command to run the REAL eval (with OPENROUTER_API_KEY and --real).`,
  { label: 'verify:mock-eval', phase: 'Verify', schema: VERIFY_SCHEMA })

await agent(
  `Write ${OUT}/STATUS.md summarizing robocoop-4 as built: the architecture (one paragraph), the file map under tools/robocoop-4/ with one-line purposes, how to run the mock eval and the real eval, the eval task list, what's DONE vs what still needs the human (live notebook assembly via the pairing channel, real-model eval run), and known gaps. Keep it terse and factual per CLAUDE.md. Base it on this verify result: ${JSON.stringify(verify)} and these built files: ${JSON.stringify(built)}.`,
  { label: 'verify:status', phase: 'Verify' })

return {
  design: spec.designPath,
  coreFiles: built.filter(b => b && b.path).map(b => b.path),
  eval: built.find(b => b && b.runnerPath) || null,
  verify,
  status: `${OUT}/STATUS.md`,
}
