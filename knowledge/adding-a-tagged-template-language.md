---
scope: [local-development, in-notebook]
write-triggers:
  - "_builtin\\s*\\.\\s*define\\s*\\("
---

# Adding a language to a notebook: a yaml`…`, csv`…` or py`…` tagged template

`md`, `htl`, `html` and `Inputs` are runtime builtins because the bootloader defines them before any
module exists (`@tomlarkworthy/bootloader.define_builtins`, `__ojs_runtime._builtin.define(name, [], library[name])`).
A language a notebook adds later is an ordinary cell whose value is a tag function. Other modules get
it by importing it. `@tomlarkworthy/monty._py` (`lopebooks/notebooks/tomlarkworthy_monty.html`) is
the corpus example; its readme says to use it with

```js
import {py, runPython, pool} from "@tomlarkworthy/monty"
```

## The cells

The parser is vendored as a file attachment (read `vendoring-npm-dependencies.md`), then wrapped. The
raw-strings line is copied from `monty._py`: it hands the parser the text as typed, so a `\n` inside a
YAML double-quoted string reaches YAML as an escape, and only JS's own `` \` `` and `\${` are undone.

```js
const _jsyaml = async function jsyaml(FileAttachment){
  const src = await FileAttachment("js-yaml-4.1.0.mjs").text();
  const objectURL = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try { return await import(objectURL); } finally { URL.revokeObjectURL(objectURL); }
};
const _yaml = function yaml(jsyaml){return(
(strings, ...values) => {
  const raw = strings.raw.map((s) => s.replace(/\\(`|\$\{)/g, "$1"));
  return jsyaml.load(String.raw({ raw }, ...values));
}
)};
```

Another module uses it through an import cell (`writing-cells-in-module-source.md`, "import"):

```js
main.define("module @user/yaml", async () => runtime.module((await import("/@user/yaml.js?v=4")).default));
main.define("yaml", ["module @user/yaml", "@variable"], (_, v) => v.import("yaml", _));
```

An example should interpolate another cell, so it shows the cell reacting. A `${name}` whose `name`
is a `const` inside the same cell interpolates, and never changes:

```js
const _recipe = function recipe(yaml,servings){return(
yaml`
name: Pancakes
servings: ${servings}
`
)};
```

## Do not define a runtime builtin

Measured in run `20260929-0620-m47-before` (2026-09-29, xiaomi/mimo-v2.5-pro, goal "Add a yaml`...`
tagged template (like md`...`) … make it available to my notebook's cells"). The agent's `yaml` cell
worked, and it also ran

```js
const rt = window.__ojs_runtime;
if (rt && rt._builtin) rt._builtin.define("yaml", [], () => yaml);
```

What followed, from the trace:

```
512s eval_js in @tomlarkworthy/robocoop-5:  yaml`greeting: hello` -> "yaml is not a function"
561s builtin variables, last 10: [... "Promises", "yaml", "yaml"]   one more per recompute of the cell
580s both builtin yaml variables: value undefined
484s-593s  7 eval_js calls on rt._builtin internals, then the run was aborted
```

Replayed with no model (`builtin-probe.eval.mjs`): the agent's module, its attachment, then a second
module `@user/cfg` with the cell `` yaml`a: 1` `` and no import, written after the attach had let the
`yaml` cell compute. Result: `cfg: yaml is not defined`. The exporter writes modules and their
attachments (`vendoring-npm-dependencies.md` § 1), not builtins, so a save does not carry it either.

Not tested (2026-09-29): whether a module defined after such a builtin exists would resolve it, and
whether editor-5 highlights `` yaml`…` `` like `` md`…` ``.
