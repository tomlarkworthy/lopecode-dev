const _34v8zc = function _title(md){return(
md`# Sticky

Make any view remember its value through source rewriting.

~~~js
import {sticky} from '@tomlarkworthy/sticky'

viewof cutoff = sticky(Inputs.range([0, 2000], {label: "cutoff", value: 440}), 440)
~~~

\`sticky(view, remembered)\` wraps any Observable view — \`Inputs.range\`, a custom knob, a pattern grid — without the view participating. The second argument is the persistence slot: at build time, if present, it is applied as \`view.value\`. When the view fires an \`input\` event (the Observable convention; \`Generators.input\` listens for the same), sticky rewrites that slot to \`JSON.stringify(view.value)\` and swaps the cell's definition **silently**. The live view already embodies the value; only the source needs to catch up. Export, diff, and reload all see the current value because it *is* source code.

The rewrite works on the cell's low-level representation: \`variable._definition\` is a plain JavaScript function, so its \`toString()\` is parsed with [acorn](https://observablehq.com/@tomlarkworthy/acorn-8-11-3), the slot argument's exact byte span is replaced, and the patched text is evaluated back into \`_definition\`. No decompile/compile round-trip: the commit is synchronous, only the literal changes (the rest of the cell keeps its formatting), and the sticky call is located by *identity* — the function's own position in \`variable._inputs\` names its local parameter — so import aliases work.

Rules:
- One sticky call per cell (the rewrite targets the first).
- Values must be JSON-serializable. Large or binary state (samples, buffers) belongs in file attachments, not here.
- The view must dispatch \`input\` when its value changes — the Observable convention, so any view that works with \`viewof\` already persists.`
)};
const _i2n6lv = function _sticky(runtime,acorn)
{
  return function sticky(view, remembered) {
    if (remembered !== undefined) {
      try {
        view.value = remembered;
      } catch (e) {
        console.warn('sticky: could not apply remembered value', e);
      }
    }
    const commit = () => {
      try {
        const self = [...runtime._variables].find(v => v._value === view);
        if (!self)
          return;
        // not (yet) a cell value; nothing to persist to
        const serialized = JSON.stringify(view.value);
        if (serialized === undefined) {
          console.warn('sticky: value not JSON-serializable; not persisted');
          return;
        }
        // the compiled definition is plain JS: function _name(dep, ...) {return (...)}
        const src = self._definition.toString();
        const fnNode = acorn.parseExpressionAt(src, 0, { ecmaVersion: 'latest' });
        // this sticky function is one of the cell's inputs; its positional
        // parameter is the local name of the call (imports may alias it)
        const idx = self._inputs.findIndex(i => i?._value === sticky);
        const alias = idx >= 0 && fnNode.params?.[idx]?.name || 'sticky';
        const re = new RegExp('\\b' + alias + '\\s*\\(', 'g');
        let m, newSrc = null;
        while (m = re.exec(src)) {
          let node;
          try {
            node = acorn.parseExpressionAt(src, m.index, { ecmaVersion: 'latest' });
          } catch {
            continue;  // matched inside a string/comment; try the next occurrence
          }
          if (node.type !== 'CallExpression' || node.callee?.name !== alias)
            continue;
          const args = node.arguments;
          newSrc = args.length >= 2 ? src.slice(0, args[args.length - 1].start) + serialized + src.slice(args[args.length - 1].end) : src.slice(0, node.end - 1) + ', ' + serialized + src.slice(node.end - 1);
          break;
        }
        if (!newSrc || newSrc === src)
          return;
        let _fn;
        eval('_fn = ' + newSrc);
        // silent definition swap: the live view already holds this value, so
        // recomputing would only rebuild identical DOM and lose focus/drag.
        // Inputs are untouched (a JSON literal has no dependencies); the runtime
        // reads _definition on the next compute and export decompiles it.
        self._definition = _fn;
      } catch (e) {
        console.warn('sticky: persist failed', e);
      }
    };
    // 'input' is the Observable view convention; commits are cheap and
    // idempotent (no-op when the literal already matches), so per-tick is fine
    view.addEventListener('input', commit);
    return view;
  };
};
const _1y7khtr = function _demo(md){return(
md`## Demo

Drag the slider: the cell's own source rewrites its second argument (open the cell editor to watch). Reload or export — the value is remembered. The echo below proves reactivity is untouched.`
)};
const _8f9efz = function _stickyDemo(sticky,Inputs){return(
sticky(Inputs.range([
  0,
  100
], {
  label: 'sticky demo',
  step: 1,
  value: 50
}))
)};
const _1jf7i4k = (G, _) => G.input(_);
const _1s73v7f = function _stickyDemoEcho(stickyDemo){return(
`stickyDemo = ${ stickyDemo }`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));
  $def("_34v8zc", "title", ["md"], _34v8zc);
  $def("_i2n6lv", "sticky", ["runtime","acorn"], _i2n6lv);
  $def("_1y7khtr", "demo", ["md"], _1y7khtr);
  $def("_8f9efz", "viewof stickyDemo", ["sticky","Inputs"], _8f9efz);
  $def("_1jf7i4k", "stickyDemo", ["Generators","viewof stickyDemo"], _1jf7i4k);
  $def("_1s73v7f", "stickyDemoEcho", ["stickyDemo"], _1s73v7f);
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  return main;
}
