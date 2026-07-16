const _qfpqvm = function _title(control,md){return(
md`# Inline editable \`md\` 

A drop in replacement for the existing markdown renderer function \`md\`. Clicking markdown *content* will now switch to editing mode, so you can edit text in-place. This provides a more natural, Notion-like, document editing experience, and avoids scrolling to the code when correcting larger texts. 

To adopt it you just need to import it, which naturally shadows the \`stdlib\` implementation.

~~~js
import {md} from "@tomlarkworthy/editable-md"
~~~

Template interpolation works! You can bring other notebook values into the text with \`\${<expr>}\`. For example, the value of the slider is: ${control}

After an update (keyboard shortcut SHIFT + ENTER), the markdown is parsed back into the tagged template representation and pushed back into the runtime. Runtime serializers like [exporter](https://observablehq.com/@tomlarkworthy/exporter-3) and [Lopecode](https://github.com/tomlarkworthy/lopecode) will pick up the changes next export.`
)};
const _1drzw1m = function _control(Inputs){return(
Inputs.range(undefined, {
  label: "value is bound to markdown document"
})
)};
const _t64jgr = (G, _) => G.input(_);
const _t5sezz = function _3(md){return(
md`## Value access to the markdown 

Access to the raw markdown is sometimes useful, the response is a HTML document for display, but on the root element is the property "markdown" which returns a promise to the markdown document, so you can now use \`md\` as an input.`
)};
const _1lfncpk = function _4(title){return(
title.markdown
)};
const _u4o7gp = function _5(md){return(
md`## Known Issues

- escaped tagged template literal lose their escaping if they are not in a code block. This is due to \`prosemirror.defaultMarkdownParser.parse(markdown)\` removing redundant escapes. We should probably make template placeholders a 1st class concept but as there is an easy work around of putting them in a code fence it is enough for now. (see [\`test_defaultMarkdownParser_preserves_escapes\`](#test_defaultMarkdownParser_preserves_escapes))`
)};
const _1z4iyw = function _md(editor_theme_css,prosemirror,Element,randstr,originalMd,markdownToMdTagged,compile,runtime,decompile,mdCellSourceToMarkdown,linkifyPastedUrl,invalidation)
{
  // Force the theme override stylesheet to be evaluated and inserted.
  editor_theme_css;
  // Rebuild the prosemirror menubar so the broken "Insert image" item is gone.
  // TODO: re-enable image insertion once we wire it through
  //       @tomlarkworthy/fileattachments. The default exampleSetup item prompts
  //       for a URL/data URL which isn't reachable from inside a lopecode
  //       notebook; a working version would attach the picked image as a
  //       file-attachment and emit an `${FileAttachment(...)}` placeholder.
  const menuItems = prosemirror.buildMenuItems(prosemirror.schema);
  const insertMenu = new prosemirror.Dropdown([menuItems.insertHorizontalRule].filter(Boolean), { label: 'Insert' });
  const menuContent = menuItems.inlineMenu.concat([[
      insertMenu,
      menuItems.typeMenu
    ]]).concat([[
      prosemirror.undoItem,
      prosemirror.redoItem
    ]]).concat(menuItems.blockMenu);
  // Copied and adjusted from exampleSetup.
  const blockQuoteRule = type => prosemirror.wrappingInputRule(/^\s*>\s$/, type);
  const orderedListRule = type => prosemirror.wrappingInputRule(/^(\d+)\.\s$/, type, m => ({ order: +m[1] }), (m, n) => n.childCount + n.attrs.order == +m[1]);
  const bulletListRule = type => prosemirror.wrappingInputRule(/^\s*([-+*])\s$/, type);
  const codeBlockRule = type => prosemirror.textblockTypeInputRule(/^```$/, type);
  const headingRule = (type, maxLevel) => prosemirror.textblockTypeInputRule(new RegExp('^(#{1,' + maxLevel + '})\\s$'), type, m => ({ level: m[1].length }));
  const buildEditorInputRules = schema => {
    const rules = [
      prosemirror.ellipsis,
      prosemirror.emDash
    ];
    let type;
    if (type = schema.nodes.blockquote)
      rules.push(blockQuoteRule(type));
    if (type = schema.nodes.ordered_list)
      rules.push(orderedListRule(type));
    if (type = schema.nodes.bullet_list)
      rules.push(bulletListRule(type));
    if (type = schema.nodes.code_block)
      rules.push(codeBlockRule(type));
    if (type = schema.nodes.heading)
      rules.push(headingRule(type, 6));
    return prosemirror.inputRules({ rules });
  };
  const editorPlugins = [
    buildEditorInputRules(prosemirror.schema),
    prosemirror.keymap(prosemirror.buildKeymap(prosemirror.schema)),
    prosemirror.keymap(prosemirror.baseKeymap),
    prosemirror.dropCursor(),
    prosemirror.gapCursor(),
    prosemirror.menuBar({
      floating: true,
      content: menuContent
    }),
    prosemirror.history(),
    new prosemirror.Plugin({ props: { attributes: { class: 'ProseMirror-example-setup-style' } } })
  ];
  const isInteractiveTarget = (event, root) => {
    if (!event || !root)
      return false;
    if (event.defaultPrevented)
      return true;
    if (event.button != null && event.button !== 0)
      return true;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
      return true;
    const t = event.target;
    if (!(t instanceof Element))
      return false;
    const interactiveSelector = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      'label',
      'summary',
      'details',
      '[contenteditable=\'true\']',
      '[data-md-noedit]',
      '[data-noedit]'
    ].join(',');
    const hit = t.closest(interactiveSelector);
    return !!(hit && root.contains(hit));
  };
  return (template, ...values) => {
    const id = randstr();
    const dom = originalMd(template, ...values);
    dom.id = id;
    // Scope the theme CSS overrides to our editor instances without
    // bumping specificity via !important.
    dom.classList.add('lope-editable-md');
    let view;
    let self;
    function saveAndRender() {
      const markdown = prosemirror.defaultMarkdownSerializer.serialize(view.state.doc);
      const template = markdownToMdTagged(markdown);
      const variables = compile(template);
      self._inputs = variables[0]._inputs.map(n => self._module._resolve(n));
      let _fn;
      eval('_fn = ' + variables[0]._definition.toString());
      self.define(self._name, variables[0]._inputs, _fn);
    }
    const selfPromise = new Promise(resolve => {
      setTimeout(() => {
        self = [...runtime._variables].find(v => v?._value?.id == id);
        if (!self)
          return;
        resolve(self);
        const listener = async event => {
          if (isInteractiveTarget(event, dom))
            return;
          // A click ending a drag-select would otherwise wipe the highlight.
          const sel = dom.ownerDocument && dom.ownerDocument.getSelection && dom.ownerDocument.getSelection();
          if (sel && !sel.isCollapsed && sel.anchorNode && sel.focusNode && dom.contains(sel.anchorNode) && dom.contains(sel.focusNode))
            return;
          dom.removeEventListener('click', listener);
          dom.addEventListener('focusout', lostFocus);
          const ojs_source = await decompile([self]);
          const markdown = mdCellSourceToMarkdown(ojs_source);
          const doc = prosemirror.defaultMarkdownParser.parse(markdown);
          const state = prosemirror.EditorState.create({
            doc,
            schema: prosemirror.schema,
            plugins: editorPlugins
          });
          dom.innerHTML = '';
          view = new prosemirror.EditorView(dom, {
            state,
            handleKeyDown(viewInstance, event) {
              if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault();
                lostFocus();
                return true;
              }
              return false;
            },
            handlePaste(viewInstance, event) {
              return linkifyPastedUrl(viewInstance, event);
            }
          });
          view.focus();
        };
        // prosemirror appends its prompts (link URL, image) to document.body, outside
        // dom, so focus entering one looks identical to the user leaving the editor.
        // Saving there tears down the view the prompt's callback still holds.
        const promptHasFocus = event => {
          const to = event && event.relatedTarget;
          if (to && to.closest && to.closest('.ProseMirror-prompt'))
            return true;
          return !!dom.ownerDocument.querySelector('.ProseMirror-prompt');
        };
        const lostFocus = event => {
          if (promptHasFocus(event))
            return;
          dom.removeEventListener('focusout', lostFocus);
          dom.addEventListener('click', listener);
          saveAndRender();
        };
        dom.addEventListener('click', listener);
        invalidation.then(() => {
          dom.removeEventListener('click', listener);
          dom.removeEventListener('focusout', lostFocus);
        });
      }, 0);
    });
    Object.defineProperty(dom, 'markdown', { get: () => selfPromise.then(self => decompile([self])).then(ojs_source => mdCellSourceToMarkdown(ojs_source)) });
    return dom;
  };
};
const _etlb83 = function _irToEditableText(){return(
function irToEditableText(ir) {
  let s = "";
  for (const p of ir.parts) {
    if (p.kind === "text") {
      s += p.text;
    } else {
      s += "${" + p.source + "}";
    }
  }
  return s;
}
)};
const _bpew19 = function _replaceArgPlaceholders()
{
  const argPlaceholderRegex = /\$\{ARG\$(\d+)\}/g;

  return (text, replacer) =>
    text.replace(argPlaceholderRegex, (_, index) => replacer(Number(index)));
};
const _n2jvwt = function _10(md){return(
md`## Source to markdown`
)};
const _vbx9g2 = function _test_mdCellSourceToMarkdown(mdCellSourceToMarkdown){return(
mdCellSourceToMarkdown(
  "title = md`foo ${'cool'}`"
)
)};
const _196gc4w = function _mdCellSourceToMarkdown(acorn,acorn_walk,escapeMarkdownInline){return(
function mdCellSourceToMarkdown(source) {
  const ast = acorn.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module"
  });

  let mdNode = null;

  acorn_walk.simple(ast, {
    TaggedTemplateExpression(node) {
      if (mdNode) return;
      if (node.tag.type === "Identifier" && node.tag.name === "md") {
        mdNode = node;
      }
    }
  });

  if (!mdNode) return null;

  const tpl = mdNode.quasi;
  const { quasis, expressions } = tpl;

  let out = "";

  for (let i = 0; i < quasis.length; i++) {
    const q = quasis[i];

    // 1. literal markdown chunk: use cooked text as-is
    const text =
      q.value && typeof q.value.cooked === "string" ? q.value.cooked : "";
    out += text.replaceAll("${", "\\${");

    // 2. interleaved JS expression as `${ ... }`
    // Markdown-escape the JS so a round trip through prosemirror's parser
    // (which strips escapes) hands back the exact source. tokenizeMarkdownTemplate unescapes.
    if (i < expressions.length) {
      const expr = expressions[i];
      const exprSource = source.slice(expr.start, expr.end);
      out += "${" + escapeMarkdownInline(exprSource) + "}";
    }
  }

  return out;
}
)};
const _1ubvqzm = function _13(md){return(
md`## Markdown to Source`
)};
const _1x56dhi = function _markdownToMdTagged(tokenizeMarkdownTemplate,escapeTemplateChunk){return(
function markdownToMdTagged(editableMarkdown) {
  const parts = tokenizeMarkdownTemplate(editableMarkdown);

  let out = "md`";

  for (const p of parts) {
    if (p.kind === "text") {
      out += escapeTemplateChunk(p.text);
    } else {
      out += "${" + p.source + "}";
    }
  }

  out += "`";
  return out;
}
)};
const _1060b9b = function _tokenizeMarkdownTemplate(unescapeMarkdownInline){return(
function tokenizeMarkdownTemplate(input) {
  const parts = [];
  let i = 0;
  let buf = "";
  while (i < input.length) {
    if (
      input[i] === "$" &&
      input[i + 1] === "{" &&
      (i === 0 || input[i - 1] !== "\\")
    ) {
      if (buf) {
        parts.push({ kind: "text", text: buf });
        buf = "";
      }
      i += 2;
      let depth = 1;
      const start = i;
      while (i < input.length && depth > 0) {
        const ch = input[i];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        i++;
      }
      if (depth !== 0) {
        throw new Error("Unbalanced ${...} in markdown template");
      }
      // The markdown serializer escapes its specials ([, ], *, ~, `, \) inside the
      // placeholder too, which would otherwise emit invalid JS into the tagged template.
      const exprSource = input.slice(start, i - 1);
      parts.push({ kind: "expr", source: unescapeMarkdownInline(exprSource.trim()) });
    } else {
      buf += input[i++];
    }
  }
  if (buf) {
    parts.push({ kind: "text", text: buf });
  }
  return parts;
}
)};
const _8wivof = function _escapeTemplateChunk(){return(
function escapeTemplateChunk(text) {
  let out = "";
  let i = 0;

  while (i < text.length) {
    // already-escaped placeholder \${...}
    if (text[i] === "\\" && text[i + 1] === "$" && text[i + 2] === "{") {
      out += "\\${";
      i += 3;
      continue;
    }

    // unescaped ${...} in text -> escape it so it stays literal
    if (text[i] === "$" && text[i + 1] === "{") {
      out += "\\${";
      i += 2;
      continue;
    }

    const ch = text[i++];
    if (ch === "\\") {
      out += "\\\\";
    } else if (ch === "`") {
      out += "\\`";
    } else {
      out += ch;
    }
  }

  return out;
}
)};
const _7pk3xw = function _isPasteableUrl(){return(
function isPasteableUrl(text) {
  if (typeof text !== "string") return false;
  const s = text.trim();
  if (!s || /\s/.test(s)) return false;
  return /^(https?:\/\/|mailto:)\S+$/i.test(s);
}
)};
const _2mqz8v = function _linkifyPastedUrl(prosemirror,isPasteableUrl){return(
// Pasting a URL over a selection links the selection instead of replacing it.
// Returns true when handled, so prosemirror skips its default paste.
function linkifyPastedUrl(view, event) {
  const linkType = prosemirror.schema.marks.link;
  if (!linkType) return false;
  const text = event.clipboardData && event.clipboardData.getData("text/plain");
  if (!isPasteableUrl(text)) return false;
  const { from, to, empty } = view.state.selection;
  if (empty) return false;
  view.dispatch(
    view.state.tr
      .addMark(from, to, linkType.create({ href: text.trim(), title: null }))
      .scrollIntoView()
  );
  return true;
}
)};
const _3kmqp1 = function _escapeMarkdownInline(){return(
// Mirrors the character set prosemirror's defaultMarkdownSerializer escapes inline,
// so escape/unescape are exact inverses across a parse+serialize round trip.
function escapeMarkdownInline(text) {
  return text.replace(/[\\`*~\[\]_]/g, (c) => "\\" + c);
}
)};
const _9wq3vz = function _unescapeMarkdownInline(){return(
// Reverses a markdown backslash escape of any ASCII punctuation (CommonMark rule),
// a superset of escapeMarkdownInline so serializer-added escapes are also removed.
function unescapeMarkdownInline(text) {
  return text.replace(/\\([!-\/:-@\[-`{-~])/g, "$1");
}
)};
const _150iump = function _randstr(){return(
function randstr(prefix)
{
    return Math.random().toString(36).replace('0.',prefix || '');
}
)};
const _2gy6uf = function _18(md){return(
md`## Tests`
)};
const _186tklp = function _escaped_code_block_ojs(){return(
"md`\\${...}`"
)};
const _pn6w19 = function _escaped_code_block_markdown(mdCellSourceToMarkdown,escaped_code_block_ojs){return(
mdCellSourceToMarkdown(escaped_code_block_ojs)
)};
const _upbu6g = function _test_mdCellSourceToMarkdown_escaped_placeholder(expect,mdCellSourceToMarkdown){return(
expect(
  mdCellSourceToMarkdown("md`\\${...}`")
).toBe("\\${...}")
)};
const _12yt2tt = function _test_markdownToMdTagged_escaped_placeholder(expect,markdownToMdTagged,compile)
{
  const MARKDOWN = "\\${...}";
  const EXPECTED_TEMPLATE = "md`\\${...}`";
  expect(markdownToMdTagged(MARKDOWN)).toBe(EXPECTED_TEMPLATE);
  compile(EXPECTED_TEMPLATE);
};
const _ina30a = function _test_escaped_placeholder_round_trip(mdCellSourceToMarkdown,expect,markdownToMdTagged)
{
  const cell = "title = md`\\${...}`";
  const markdown = mdCellSourceToMarkdown(cell);
  expect(markdown).toBe("\\${...}"); // runtime: "\${...}"

  const template = markdownToMdTagged(markdown);
  expect(template).toBe("md`\\${...}`"); // same as original tag
};
const _7bxk2q = function _test_placeholder_brackets_survive_editing(prosemirror,expect,mdCellSourceToMarkdown,markdownToMdTagged,compile)
{
  // The reported bug: markdown-special chars inside a ${...} placeholder were escaped
  // by the serializer and copied verbatim into the tagged template, yielding invalid JS.
  const CELL = "title = md`See ${aside('editable-md', ['@tomlarkworthy/editable-md'])} here`";
  const markdown = mdCellSourceToMarkdown(CELL);
  const doc = prosemirror.defaultMarkdownParser.parse(markdown);
  const serialized = prosemirror.defaultMarkdownSerializer.serialize(doc);
  const template = markdownToMdTagged(serialized);
  expect(template).toBe("md`See ${aside('editable-md', ['@tomlarkworthy/editable-md'])} here`");
  // compile swallows a syntax error into a cell with no inputs whose definition just
  // throws, so assert the placeholder was really parsed as an expression.
  const variables = compile(template);
  expect(variables[0]._inputs).toContain("aside");
};
const _4tzn8m = function _test_placeholder_round_trip_preserves_js(prosemirror,expect,escapeMarkdownInline,tokenizeMarkdownTemplate)
{
  const EXPRS = [
    "arr[0]",
    "a * b",
    "obj['key']",
    "x.replace(/\\[/g, '')",   // backslashes must not be eaten
    "d3.range(10).map(i => i ** 2)",
    "f(a, [b, c], {d})"
  ];
  for (const expr of EXPRS) {
    const markdown = "Text ${" + escapeMarkdownInline(expr) + "} end";
    const doc = prosemirror.defaultMarkdownParser.parse(markdown);
    const serialized = prosemirror.defaultMarkdownSerializer.serialize(doc);
    const recovered = tokenizeMarkdownTemplate(serialized).find(p => p.kind === "expr").source;
    expect(recovered).toBe(expr);
  }
  return EXPRS.length + " expressions round trip";
};
const _5vqw7d = function _test_escapeMarkdownInline_inverse(expect,escapeMarkdownInline,unescapeMarkdownInline){return(
expect(unescapeMarkdownInline(escapeMarkdownInline("a[0] * b~c `d` \\e"))).toBe("a[0] * b~c `d` \\e")
)};
const _9lnk1a = function _test_isPasteableUrl(expect,isPasteableUrl)
{
  for (const ok of ["https://x.dev", "http://a.b/c?d=1", "mailto:a@b.c", "  https://x.dev  "])
    expect(isPasteableUrl(ok)).toBe(true);
  for (const no of ["", "not a url", "hello world", "https://a b", "ftp://x.dev", null, undefined, 42])
    expect(isPasteableUrl(no)).toBe(false);
  return "url predicate ok";
};
const _9lnk2b = function _test_link_survives_round_trip(expect,mdCellSourceToMarkdown,prosemirror,markdownToMdTagged,compile)
{
  // A link is only useful if it survives serialize -> tagged template -> compile.
  const CELL = "title = md`see [the docs](https://example.com/a_b) here`";
  const markdown = mdCellSourceToMarkdown(CELL);
  const doc = prosemirror.defaultMarkdownParser.parse(markdown);
  const serialized = prosemirror.defaultMarkdownSerializer.serialize(doc);
  const template = markdownToMdTagged(serialized);
  expect(template).toBe("md`see [the docs](https://example.com/a_b) here`");
  expect(compile(template)[0]._inputs).toContain("md");
};
const _2dh7y5 = function _test_defaultMarkdownParser_preserves_escapes(prosemirror,expect)
{
  const result = prosemirror.defaultMarkdownParser.parse("\\${}");
  expect(result.content.content[0].content.content[0]).toEqual({
    text: "\\${}",
    type: "text"
  });
  return result;
};
const _mr4g6d = function _editor_theme_css(htl){return(
htl.html`<style>
/* Override prosemirror's bundled fixed-color CSS with theme variables so the
   inline editor's menubar follows the active lopecode theme.
   We win on specificity (.lope-editable-md .ProseMirror-menubar = 2 classes
   beats prosemirror's bundled .ProseMirror-menubar = 1 class), so no
   !important needed. --theme-background-raised may be empty in some themes
   (which kills the var() chain), so we use --theme-background as the
   primary token.
   TODO: .ProseMirror-prompt (link URL dialog) is appended to document.body
         and isn't reachable from our wrapper — leave it default for now. */
.lope-editable-md .ProseMirror-menubar {
  background: var(--theme-background, #fff);
  color: var(--theme-foreground-muted, #666);
  border-bottom-color: var(--theme-foreground-faintest, #c0c0c0);
}
.lope-editable-md .ProseMirror-menubar .ProseMirror-icon {
  color: var(--theme-foreground-muted, #666);
}
.lope-editable-md .ProseMirror-menubar .ProseMirror-icon:hover {
  background: var(--theme-foreground-faintest, #eee);
  color: var(--theme-foreground, currentColor);
}
.lope-editable-md .ProseMirror-menuseparator {
  border-right-color: var(--theme-foreground-faintest, #c0c0c0);
}
.lope-editable-md .ProseMirror-menu-disabled {
  color: var(--theme-foreground-faint, #ccc);
}
.lope-editable-md .ProseMirror-menu-active {
  background: var(--theme-foreground-faintest, #eee);
  color: var(--theme-foreground, currentColor);
}
.lope-editable-md .ProseMirror-menu-dropdown,
.lope-editable-md .ProseMirror-menu-submenu-label {
  color: var(--theme-foreground-muted, #666);
}
.lope-editable-md .ProseMirror-menu-dropdown-menu,
.lope-editable-md .ProseMirror-menu-submenu {
  background: var(--theme-background, #fff);
  border-color: var(--theme-foreground-faintest, #c0c0c0);
  color: var(--theme-foreground, inherit);
}
.lope-editable-md .ProseMirror-menu-dropdown-item:hover {
  background: var(--theme-foreground-faintest, #eee);
}
</style>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/prosemirror", async () => runtime.module((await import("/@tomlarkworthy/prosemirror.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  $def("_qfpqvm", "title", ["control","md"], _qfpqvm);  
  $def("_1drzw1m", "viewof control", ["Inputs"], _1drzw1m);  
  $def("_t64jgr", "control", ["Generators","viewof control"], _t64jgr);  
  $def("_t5sezz", null, ["md"], _t5sezz);  
  $def("_1lfncpk", null, ["title"], _1lfncpk);  
  $def("_u4o7gp", null, ["md"], _u4o7gp);  
  $def("_1z4iyw", "md", ["editor_theme_css","prosemirror","Element","randstr","originalMd","markdownToMdTagged","compile","runtime","decompile","mdCellSourceToMarkdown","linkifyPastedUrl","invalidation"], _1z4iyw);
  $def("_etlb83", "irToEditableText", [], _etlb83);  
  $def("_bpew19", "replaceArgPlaceholders", [], _bpew19);  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  $def("_n2jvwt", null, ["md"], _n2jvwt);  
  $def("_vbx9g2", "test_mdCellSourceToMarkdown", ["mdCellSourceToMarkdown"], _vbx9g2);  
  $def("_196gc4w", "mdCellSourceToMarkdown", ["acorn","acorn_walk","escapeMarkdownInline"], _196gc4w);
  $def("_1ubvqzm", null, ["md"], _1ubvqzm);  
  $def("_1x56dhi", "markdownToMdTagged", ["tokenizeMarkdownTemplate","escapeTemplateChunk"], _1x56dhi);  
  $def("_1060b9b", "tokenizeMarkdownTemplate", ["unescapeMarkdownInline"], _1060b9b);
  $def("_8wivof", "escapeTemplateChunk", [], _8wivof);
  $def("_7pk3xw", "isPasteableUrl", [], _7pk3xw);
  $def("_2mqz8v", "linkifyPastedUrl", ["prosemirror","isPasteableUrl"], _2mqz8v);
  $def("_3kmqp1", "escapeMarkdownInline", [], _3kmqp1);
  $def("_9wq3vz", "unescapeMarkdownInline", [], _9wq3vz);
  $def("_150iump", "randstr", [], _150iump);
  $def("_2gy6uf", null, ["md"], _2gy6uf);  
  $def("_186tklp", "escaped_code_block_ojs", [], _186tklp);  
  $def("_pn6w19", "escaped_code_block_markdown", ["mdCellSourceToMarkdown","escaped_code_block_ojs"], _pn6w19);  
  $def("_upbu6g", "test_mdCellSourceToMarkdown_escaped_placeholder", ["expect","mdCellSourceToMarkdown"], _upbu6g);  
  $def("_12yt2tt", "test_markdownToMdTagged_escaped_placeholder", ["expect","markdownToMdTagged","compile"], _12yt2tt);  
  $def("_ina30a", "test_escaped_placeholder_round_trip", ["mdCellSourceToMarkdown","expect","markdownToMdTagged"], _ina30a);  
  $def("_7bxk2q", "test_placeholder_brackets_survive_editing", ["prosemirror","expect","mdCellSourceToMarkdown","markdownToMdTagged","compile"], _7bxk2q);
  $def("_4tzn8m", "test_placeholder_round_trip_preserves_js", ["prosemirror","expect","escapeMarkdownInline","tokenizeMarkdownTemplate"], _4tzn8m);
  $def("_5vqw7d", "test_escapeMarkdownInline_inverse", ["expect","escapeMarkdownInline","unescapeMarkdownInline"], _5vqw7d);
  $def("_9lnk1a", "test_isPasteableUrl", ["expect","isPasteableUrl"], _9lnk1a);
  $def("_9lnk2b", "test_link_survives_round_trip", ["expect","mdCellSourceToMarkdown","prosemirror","markdownToMdTagged","compile"], _9lnk2b);
  $def("_2dh7y5", "test_defaultMarkdownParser_preserves_escapes", ["prosemirror","expect"], _2dh7y5);
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("originalMd", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("md", "originalMd", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("acorn_walk", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn_walk", _));  
  main.define("acorn", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn", _));  
  main.define("prosemirror", ["module @tomlarkworthy/prosemirror", "@variable"], (_, v) => v.import("prosemirror", _));  
  main.define("hide_menu_css", ["module @tomlarkworthy/prosemirror", "@variable"], (_, v) => v.import("hide_menu_css", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  $def("_mr4g6d", "editor_theme_css", ["htl"], _mr4g6d);
  return main;
}