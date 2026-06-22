// Criterion registry for the robocoop-4 live eval harness.
// Every criterion is pure over a WorldSnapshot: (snapshot, args) => { score, pass, feedback }.
// See CONTRACT.md for the snapshot shape and the catalog.

const ok = (feedback) => ({ score: 1, pass: true, feedback });
const fail = (feedback) => ({ score: 0, pass: false, feedback });

// --- shared helpers ---------------------------------------------------------

// Find a module's variable record by name (skips anonymous when name given).
function findVariable(snapshot, moduleId, name) {
  const mod = snapshot.modules?.[moduleId];
  if (!mod) return null;
  return mod.variables.find((v) => v.name === name) || null;
}

// A module's source: the joined live-module cell sources, else the workspace file /notebook/<id>.js
// (the agent writes module files there; a NEW module never becomes live, so the file is the only copy).
// Returns null only when neither exists.
function moduleSourceText(snapshot, id) {
  const mod = snapshot.modules?.[id];
  if (mod) return mod.variables.map((v) => v.source || "").join("\n");
  const file = snapshot.files?.["/notebook/" + id + ".js"];
  return file != null ? file : null;
}

// Concatenated assistant text across the conversation turn.
function assistantText(snapshot) {
  return (snapshot.conversation || [])
    .filter((m) => m.role === "assistant" && typeof m.content === "string")
    .map((m) => m.content)
    .join("\n");
}

// Target resolver: file -> module+var -> assistant text. Returns { text, label }
// or null when the named target cannot be located.
function resolveTarget(snapshot, args = {}) {
  if (args.file != null) {
    const text = snapshot.files?.[args.file];
    if (text == null) return null;
    return { text, label: `file ${args.file}` };
  }
  if (args.module != null && args.var != null) {
    const v = findVariable(snapshot, args.module, args.var);
    if (!v) return null;
    return { text: v.source || "", label: `${args.module}:${args.var}` };
  }
  return { text: assistantText(snapshot), label: "assistant answer" };
}

function countChar(str, ch) {
  let n = 0;
  for (let i = 0; i < str.length; i++) if (str[i] === ch) n++;
  return n;
}

function wordCount(str) {
  const m = str.match(/\S+/g);
  return m ? m.length : 0;
}

// Strip top-level import/export statements so a source fragment can be wrapped
// in `new Function` for a parse check.
function stripModuleSyntax(src) {
  return src
    .replace(/^\s*import\s.*?(;|$)/gm, "")
    .replace(/^\s*export\s+(default\s+)?/gm, "");
}

// Given a regex match `m` positioned at `function …(params){`, return {params, body} by brace-matching.
function fnParamsBody(text, m) {
  const params = m[1].split(",").map((s) => s.trim().split("=")[0].trim()).filter(Boolean);
  let i = m.index + m[0].length - 1, depth = 0;
  const start = i;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return { params, body: text.slice(start + 1, i - 1) };
}

// Extract a named cell as an evaluable {params, body} from a workspace module file. Handles BOTH shapes
// the agent produces: (1) the PROJECTED host_sync format — `// ⟦cell⟧ … name=<n> inputs=a,b` header then
// a body that is either a `function …(){…}` or a raw expression (tolerant of marker glyph variants);
// (2) the compiled lopecode form `function name(params){…}`. Returns null when the named cell isn't found.
function extractCell(text, name) {
  const markerRe = /\/\/[ \t]*[⟦⦅[][ \t]*cell[ \t]*[⟧⦆\]][ \t]*/g;
  if (markerRe.test(text)) {
    for (const chunk of text.split(markerRe).slice(1)) {
      const nl = chunk.indexOf("\n");
      const header = nl >= 0 ? chunk.slice(0, nl) : chunk;
      const body = (nl >= 0 ? chunk.slice(nl + 1) : "").replace(/\s+$/, "");
      const hm = header.match(/name=(\S+)/);
      if (!hm || hm[1] !== name) continue;
      const fm = body.match(/^\s*(?:async\s+)?function\s+_?\w*\s*\(([^)]*)\)\s*\{/);
      if (fm) return fnParamsBody(body, fm);
      const im = header.match(/inputs=(\S*)/);
      const inputs = im && im[1] ? im[1].split(",").filter(Boolean) : [];
      // A projected body is the cell's source. Per Observable convention a leading `{` is a STATEMENT
      // block (its own `return`), not an object literal — so use it as the function body directly.
      // Anything else is an expression → wrap in `return (...)`.
      const stripped = body.replace(/^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, "").trim();
      if (stripped.startsWith("{")) {
        const open = body.indexOf("{"), close = body.lastIndexOf("}");
        return { params: inputs, body: body.slice(open + 1, close) };
      }
      return { params: inputs, body: "return (\n" + body + "\n);" };
    }
    return null; // marker present but this cell not found
  }
  const m = new RegExp("function\\s+_?" + escapeRe(name) + "\\b\\s*\\(([^)]*)\\)\\s*\\{").exec(text);
  return m ? fnParamsBody(text, m) : null;
}

// Minimal stand-ins for runtime-provided libraries so a cell that uses them can be evaluated in node
// (we only need the methods the eval prompts exercise). Keyed by the cell's input parameter name.
const LIB_STUBS = {
  d3: {
    sum: (a) => a.reduce((x, y) => x + (+y), 0),
    max: (a) => Math.max(...a),
    min: (a) => Math.min(...a),
    mean: (a) => a.reduce((x, y) => x + y, 0) / a.length,
    extent: (a) => [Math.min(...a), Math.max(...a)],
    median: (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
  },
};

// Evaluate a named cell from a module file, resolving its inputs the way the runtime would: an explicitly
// provided input wins; then a library stub; then a SIBLING cell of that name in the same file (recursively,
// with a cycle guard) — so an agent that decomposes work into reactive cells (e.g. `scores` + `topThree`)
// is graded correctly instead of penalised. Returns { value } or { error }. Sync cells only.
function resolveCellValue(text, name, inputs = {}, seen = new Set()) {
  if (seen.has(name)) return { error: `dependency cycle at ${name}` };
  seen.add(name);
  const cell = extractCell(text, name);
  if (!cell) return { error: `cell ${name} not found` };
  let fn;
  try { fn = new Function(...cell.params, cell.body); }
  catch (e) { return { error: `cell ${name} does not compile: ${e.message}` }; }
  const callArgs = [];
  for (const p of cell.params) {
    if (p in inputs) { callArgs.push(inputs[p]); continue; }
    if (p in LIB_STUBS) { callArgs.push(LIB_STUBS[p]); continue; }
    const sib = resolveCellValue(text, p, inputs, new Set(seen));
    callArgs.push(sib.error ? undefined : sib.value);
  }
  let value;
  try { value = fn(...callArgs); }
  catch (e) { return { error: `cell ${name} threw: ${e.message}` }; }
  if (value && typeof value.then === "function") return { error: `cell ${name} is async; sync only` };
  return { value };
}

const deepEq = (a, b) =>
  (a && typeof a === "object") || (b && typeof b === "object")
    ? JSON.stringify(a) === JSON.stringify(b)
    : String(a) === String(b);

// --- criteria ---------------------------------------------------------------

export const CRITERIA = {
  contains_string(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for needle "${args.needle}"`);
    const hay = args.ignoreCase ? t.text.toLowerCase() : t.text;
    const needle = args.ignoreCase ? String(args.needle).toLowerCase() : String(args.needle);
    return hay.includes(needle)
      ? ok(`${t.label} contains "${args.needle}"`)
      : fail(`${t.label} missing "${args.needle}"`);
  },

  not_contains_string(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for needle "${args.needle}"`);
    const hay = args.ignoreCase ? t.text.toLowerCase() : t.text;
    const needle = args.ignoreCase ? String(args.needle).toLowerCase() : String(args.needle);
    return hay.includes(needle)
      ? fail(`${t.label} unexpectedly contains "${args.needle}"`)
      : ok(`${t.label} does not contain "${args.needle}"`);
  },

  uses_identifier(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for identifier "${args.ident}"`);
    const re = new RegExp(`\\b${escapeRe(args.ident)}\\b`);
    return re.test(t.text)
      ? ok(`${t.label} uses identifier ${args.ident}`)
      : fail(`${t.label} missing identifier ${args.ident}`);
  },

  does_compile(snapshot, args) {
    // Whole-module form: live module -> pass iff no variable in error; else parse the workspace file.
    if (args.module != null && args.var == null && args.file == null) {
      const mod = snapshot.modules?.[args.module];
      if (mod) {
        const bad = mod.variables.filter((v) => v.hasError);
        return bad.length
          ? fail(`${args.module} has ${bad.length} variable(s) in error`)
          : ok(`${args.module} has no variables in error`);
      }
      const src = moduleSourceText(snapshot, args.module);
      if (src == null) return fail(`module ${args.module} not found (no live module or workspace file)`);
      try { new Function(stripModuleSyntax(src)); return ok(`${args.module} workspace file parses`); }
      catch (e) { return fail(`${args.module} workspace file parse error: ${e.message}`); }
    }
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found to compile`);
    try {
      // eslint-disable-next-line no-new-func
      new Function(stripModuleSyntax(t.text));
      return ok(`${t.label} parses`);
    } catch (e) {
      return fail(`${t.label} parse error: ${e.message}`);
    }
  },

  balanced_braces(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for brace check`);
    const pairs = [["{", "}"], ["(", ")"], ["[", "]"]];
    const unbalanced = pairs.filter(([a, b]) => countChar(t.text, a) !== countChar(t.text, b));
    return unbalanced.length
      ? fail(`${t.label} unbalanced ${unbalanced.map(([a, b]) => a + b).join(",")}`)
      : ok(`${t.label} braces balanced`);
  },

  no_var_keyword(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for var-keyword check`);
    return /\bvar\b/.test(t.text)
      ? fail(`${t.label} uses var keyword`)
      : ok(`${t.label} has no var keyword`);
  },

  has_doc_comment(snapshot, args) {
    const src = moduleSourceText(snapshot, args.module);
    if (src == null) return fail(`module ${args.module} not found (no live module or /notebook/${args.module}.js)`);
    const has = src.includes("md`") || /\/\//.test(src) || /\/\*/.test(src);
    return has
      ? ok(`${args.module} has documentation (md\` or comment)`)
      : fail(`${args.module} has no md\` or comment`);
  },

  min_words(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for word count`);
    const words = wordCount(t.text);
    const count = args.count || 1;
    const score = Math.min(words / count, 1);
    return {
      score,
      pass: words >= count,
      feedback: `${t.label} has ${words} words (need ${count})`,
    };
  },

  answer_contains(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for answer "${args.needle}"`);
    const hay = args.ignoreCase ? t.text.toLowerCase() : t.text;
    const needle = args.ignoreCase ? String(args.needle).toLowerCase() : String(args.needle);
    return hay.includes(needle)
      ? ok(`${t.label} answer contains "${args.needle}"`)
      : fail(`${t.label} answer missing "${args.needle}"`);
  },

  file_exists(snapshot, args) {
    return snapshot.files && Object.prototype.hasOwnProperty.call(snapshot.files, args.path)
      ? ok(`file ${args.path} exists`)
      : fail(`file ${args.path} absent`);
  },

  file_absent(snapshot, args) {
    return snapshot.files && Object.prototype.hasOwnProperty.call(snapshot.files, args.path)
      ? fail(`file ${args.path} still present`)
      : ok(`file ${args.path} absent`);
  },

  module_exists(snapshot, args) {
    return snapshot.modules && Object.prototype.hasOwnProperty.call(snapshot.modules, args.id)
      ? ok(`module ${args.id} exists`)
      : fail(`module ${args.id} absent`);
  },

  module_absent(snapshot, args) {
    return snapshot.modules && Object.prototype.hasOwnProperty.call(snapshot.modules, args.id)
      ? fail(`module ${args.id} still present`)
      : ok(`module ${args.id} absent`);
  },

  variable_defined(snapshot, args) {
    const v = findVariable(snapshot, args.module, args.name);
    return v && v.name
      ? ok(`${args.module}:${args.name} defined`)
      : fail(`${args.module}:${args.name} not defined`);
  },

  variable_no_error(snapshot, args) {
    const mod = snapshot.modules?.[args.module];
    if (!mod) return fail(`module ${args.module} not found`);
    if (args.name != null) {
      const v = findVariable(snapshot, args.module, args.name);
      if (!v) return fail(`${args.module}:${args.name} not found`);
      return v.hasError
        ? fail(`${args.module}:${args.name} error: ${v.error}`)
        : ok(`${args.module}:${args.name} no error`);
    }
    const bad = mod.variables.filter((v) => v.hasError);
    return bad.length
      ? fail(`${args.module} has ${bad.length} variable(s) in error`)
      : ok(`${args.module} has no variables in error`);
  },

  // Deterministically compile+run a named cell FROM THE WORKSPACE FILE and check its return value.
  // Independent of host_apply / the live runtime (robocoop-2's scoring approach), so it isn't flaky
  // when the agent writes correct code but doesn't deploy it. Synchronous cells only; injects
  // LIB_STUBS for known library params (e.g. d3) and `inputs` for the rest.
  cell_evaluates(snapshot, args) {
    const text = args.file != null ? snapshot.files?.[args.file] : null;
    if (text == null) return fail(`file ${args.file} not found for cell_evaluates`);
    // Resolves intra-module cell deps from the file (rewards reactive decomposition); explicit
    // args.inputs still override (e.g. to prove a derived cell isn't a constant by feeding two values).
    const r = resolveCellValue(text, args.name, args.inputs || {});
    if (r.error) return fail(r.error + ` (in ${args.file})`);
    return deepEq(r.value, args.equals)
      ? ok(`${args.name} evaluates to ${JSON.stringify(args.equals)}`)
      : fail(`${args.name} evaluated to ${JSON.stringify(r.value)}, expected ${JSON.stringify(args.equals)}`);
  },

  // Compile a cell whose VALUE is a function (e.g. `const nthPrime = function nthPrime(){return( n => … )}`)
  // and call it with each {args, equals} case. Strong anti-hardcode: the agent must implement the general
  // function, not memorise one output. Sync only; injects LIB_STUBS for any extra params.
  cell_fn_evaluates(snapshot, args) {
    const text = args.file != null ? snapshot.files?.[args.file] : null;
    if (text == null) return fail(`file ${args.file} not found for cell_fn_evaluates`);
    const cell = extractCell(text, args.name);
    if (!cell) return fail(`cell ${args.name} not found in ${args.file}`);
    let outer;
    try { outer = new Function(...cell.params, cell.body); }
    catch (e) { return fail(`cell ${args.name} does not compile: ${e.message}`); }
    let fn;
    try { fn = outer(...cell.params.map((p) => LIB_STUBS[p])); }
    catch (e) { return fail(`cell ${args.name} threw building the fn: ${e.message}`); }
    if (typeof fn !== "function") return fail(`cell ${args.name} is not a function (${typeof fn})`);
    for (const c of args.cases || []) {
      let got;
      try { got = fn(...(c.args || [])); }
      catch (e) { return fail(`${args.name}(${JSON.stringify(c.args)}) threw: ${e.message}`); }
      if (!deepEq(got, c.equals))
        return fail(`${args.name}(${JSON.stringify(c.args)}) = ${JSON.stringify(got)}, expected ${JSON.stringify(c.equals)}`);
    }
    return ok(`${args.name} satisfies ${(args.cases || []).length} case(s)`);
  },

  // A live variable's RENDERED output (valuePreview = outerHTML for DOM, else stringified value) contains
  // a substring. Use to check that an edit to an EXISTING live module actually took effect in the runtime
  // (e.g. exporter-3's title now renders the new text), not just that the source file changed.
  live_value_contains(snapshot, args) {
    const v = findVariable(snapshot, args.module, args.name);
    if (!v) return fail(`${args.module}:${args.name} not found live`);
    if (v.hasError) return fail(`${args.module}:${args.name} error: ${v.error}`);
    const hay = String(v.valuePreview ?? "");
    return hay.includes(String(args.needle))
      ? ok(`${args.module}:${args.name} live value contains "${args.needle}"`)
      : fail(`${args.module}:${args.name} live value lacks "${args.needle}" (${hay.slice(0, 80)})`);
  },

  // ANY live variable's SOURCE (_definition) in the module contains the needle. jbApply rewrites
  // _definition on apply, so this proves the edit reached the LIVE runtime — distinct from a file-only
  // write (the clobber-safety would leave the agent's file edited even if apply failed). Anonymous-cell
  // safe (no name needed).
  module_source_contains(snapshot, args) {
    const mod = snapshot.modules?.[args.module];
    if (!mod) return fail(`module ${args.module} not found live`);
    const hit = mod.variables.some((v) => String(v.source ?? "").includes(String(args.needle)));
    return hit
      ? ok(`${args.module} live source contains "${args.needle}"`)
      : fail(`${args.module} live source lacks "${args.needle}" (edit not applied to runtime?)`);
  },

  // ANY live variable in the module renders/contains the needle. For editing existing modules whose
  // target cell is anonymous (md titles, display cells) and so can't be addressed by name.
  module_renders_contains(snapshot, args) {
    const mod = snapshot.modules?.[args.module];
    if (!mod) return fail(`module ${args.module} not found live`);
    const hit = mod.variables.some((v) => !v.hasError && String(v.valuePreview ?? "").includes(String(args.needle)));
    return hit
      ? ok(`${args.module} renders "${args.needle}" somewhere`)
      : fail(`${args.module} renders nothing containing "${args.needle}"`);
  },

  variable_equals(snapshot, args) {
    const v = findVariable(snapshot, args.module, args.name);
    if (!v) return fail(`${args.module}:${args.name} not found`);
    const actual = String(v.valuePreview);
    const expected = String(args.equals);
    return actual === expected
      ? ok(`${args.module}:${args.name} === ${expected}`)
      : fail(`${args.module}:${args.name} is ${actual}, expected ${expected}`);
  },

  renders_svg(snapshot, args) {
    const v = findVariable(snapshot, args.module, args.name);
    if (!v) return fail(`${args.module}:${args.name} not found`);
    const svg = v.isSvg || (typeof v.valuePreview === "string" && v.valuePreview.includes("<svg"));
    return svg
      ? ok(`${args.module}:${args.name} renders svg`)
      : fail(`${args.module}:${args.name} is not svg (${v.valueType})`);
  },

  // The variable's live value is a DOM element (UI construction actually rendered, not just source).
  renders_element(snapshot, args) {
    const v = findVariable(snapshot, args.module, args.name);
    if (!v) return fail(`${args.module}:${args.name} not found`);
    if (v.hasError) return fail(`${args.module}:${args.name} error: ${v.error}`);
    const isEl = /Element$/.test(v.valueType || "") ||
      /^\s*</.test(String(v.valuePreview ?? ""));
    return isEl
      ? ok(`${args.module}:${args.name} rendered a DOM element (${v.valueType})`)
      : fail(`${args.module}:${args.name} is not an element (${v.valueType})`);
  },

  uses_plot(snapshot, args) {
    const t = resolveTarget(snapshot, args);
    if (!t) return fail(`target not found for Plot. reference`);
    return t.text.includes("Plot.")
      ? ok(`${t.label} references Plot.`)
      : fail(`${t.label} missing Plot.`);
  },

  no_runtime_errors(snapshot) {
    const errs = snapshot.errors || [];
    return errs.length
      ? fail(`${errs.length} runtime error(s): ${errs[0]}`)
      : ok(`no runtime errors`);
  },

  tool_used(snapshot, args) {
    const min = args.minTimes ?? 1;
    const n = (snapshot.toolCalls || []).filter((c) => c.name === args.name).length;
    return n >= min
      ? ok(`tool ${args.name} used ${n}x (need ${min})`)
      : fail(`tool ${args.name} used ${n}x (need ${min})`);
  },

  tool_not_used(snapshot, args) {
    const n = (snapshot.toolCalls || []).filter((c) => c.name === args.name).length;
    return n === 0
      ? ok(`tool ${args.name} not used`)
      : fail(`tool ${args.name} used ${n}x`);
  },

  max_steps(snapshot, args) {
    return snapshot.steps <= args.n
      ? ok(`steps ${snapshot.steps} <= ${args.n}`)
      : fail(`steps ${snapshot.steps} > ${args.n}`);
  },

  // A bash tool-call whose command matches the regex `pattern` ran at least `minTimes`. The agent's
  // only tool is `bash`, so this is how we assert a specific shell capability (sed, grep, …) was used.
  bash_command_matches(snapshot, args) {
    const re = new RegExp(args.pattern, args.flags || "");
    const min = args.minTimes ?? 1;
    const cmds = (snapshot.toolCalls || [])
      .filter((c) => c.name === "bash")
      .map((c) => (c.arguments && (c.arguments.command ?? c.arguments.raw)) || "");
    const n = cmds.filter((cmd) => re.test(cmd)).length;
    return n >= min
      ? ok(`${n} bash command(s) match /${args.pattern}/ (need ${min})`)
      : fail(`no bash command matched /${args.pattern}/ (ran: ${cmds.map((c) => c.slice(0, 30)).join(" | ") || "none"})`);
  },

  // The agent asked a clarifying question instead of fabricating: its LAST assistant message contains
  // a "?". Anti-hallucination check for impossible/under-specified prompts.
  asks_clarification(snapshot) {
    const asst = (snapshot.conversation || []).filter((m) => m.role === "assistant" && typeof m.content === "string" && m.content.trim());
    const last = asst.length ? asst[asst.length - 1].content : "";
    return /\?/.test(last)
      ? ok(`final reply asks a clarifying question`)
      : fail(`final reply has no clarifying question ("?"): ${JSON.stringify(last.slice(0, 80))}`);
  },
};

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function runCriterion(name, snapshot, args = {}) {
  const fn = CRITERIA[name];
  if (!fn) throw new Error(`unknown criterion: ${name}`);
  if (snapshot.ok === false) {
    return { score: 0, pass: false, feedback: "run failed: " + snapshot.error };
  }
  return fn(snapshot, args);
}
