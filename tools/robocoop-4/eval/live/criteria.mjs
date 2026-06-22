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
