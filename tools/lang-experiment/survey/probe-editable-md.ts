// Hand-check of classify.ts on @tomlarkworthy/editable-md (predicted 21% Y by lines). Same harness as
// probe-lopepage-urls.ts.
import { checkSources, type Sources } from "../lite/core.ts";
const nb = (cells: string, outside: { name: string; view?: boolean }[] = []): Sources => ({ cells, tsx: true, outside });
const report = (id: string, note: string, src: Sources) => {
  const r = checkSources(src);
  const mod = r.module.map((e: any) => `module [${e.rule}] ${e.msg}`);
  const cells = r.cells.map((x: any) => `${x.name}: ${x.status}${x.errors?.length ? " " + x.errors.map((e: any) => `[${e.rule}] L${e.line} ${e.msg}`).join("; ") : ""}`);
  console.log(`${id} ${note}\n   ${[...mod, ...cells].join("\n   ")}`);
};

// E1 predicted Y, Y, N(FN: expect): escape/unescape and their inverse test
report("E1", "escapeMarkdownInline, unescapeMarkdownInline (Y); the test with the imported expect", nb(String.raw`
const escapeMarkdownInline = () => function escapeMarkdownInline(text: string): string { return text.replace(/[\\` + "`" + String.raw`*~\[\]_|]/g, (c) => "\\" + c); };
const unescapeMarkdownInline = () => function unescapeMarkdownInline(text: string): string { return text.replace(/\\([!-\/:-@\[-` + "`" + String.raw`{-~])/g, '$1'); };
const test_escapeMarkdownInline_inverse = (expect: (v: string) => { toBe: (w: string) => void }, unescapeMarkdownInline, escapeMarkdownInline) =>
  expect(unescapeMarkdownInline(escapeMarkdownInline('a[0] * b~c d \\e'))).toBe('a[0] * b~c d \\e');`, [{ name: "expect" }]));
report("E1b", "the same test with expect(...).toBe rewritten as a throw", nb(String.raw`
const escapeMarkdownInline = () => function escapeMarkdownInline(text: string): string { return text.replace(/[\\*~\[\]_|]/g, (c) => "\\" + c); };
const unescapeMarkdownInline = () => function unescapeMarkdownInline(text: string): string { return text.replace(/\\([!-\/:-@\[-~])/g, '$1'); };
const test_escapeMarkdownInline_inverse = (unescapeMarkdownInline, escapeMarkdownInline) => {
  const s = 'a[0] * b~c d \\e';
  const got = unescapeMarkdownInline(escapeMarkdownInline(s));
  if (got !== s) throw new Error("got " + got);
  return got;
};`));

// E2 predicted Y: tokenizeMarkdownTemplate builds an array with push
report("E2", "tokenizeMarkdownTemplate: parts.push on a local, input[i] indexing", nb(String.raw`
type Part = { readonly kind: "text"; readonly text: string } | { readonly kind: "expr"; readonly source: string };
const unescapeMarkdownInline = () => (text: string): string => text;
const tokenizeMarkdownTemplate = (unescapeMarkdownInline) => function tokenizeMarkdownTemplate(input: string): Part[] {
  const parts = mut<Part[]>([]);
  let i = 0;
  let buf = '';
  while (i < input.length) {
    if (input.charAt(i) === '$' && input.charAt(i + 1) === '{' && (i === 0 || input.charAt(i - 1) !== '\\')) {
      if (buf) { parts.push({ kind: 'text', text: buf }); buf = ''; }
      i += 2;
      let depth = 1;
      const start = i;
      while (i < input.length && depth > 0) { const ch = input.charAt(i); if (ch === '{') depth++; else if (ch === '}') depth--; i++; }
      if (depth !== 0) throw new Error('Unbalanced placeholder in markdown template');
      parts.push({ kind: 'expr', source: unescapeMarkdownInline(input.slice(start, i - 1).trim()) });
    } else {
      buf += input.charAt(i++);
    }
  }
  if (buf) parts.push({ kind: 'text', text: buf });
  return freeze(parts);
};`));

// E3 predicted Y (classify.ts missed Math.random): randstr
report("E3", "randstr verbatim (Math.random)", nb(`
const randstr = () => function randstr(prefix: string): string { return Math.random().toString(36).replace('0.', prefix || ''); };`));
report("E3b", "randstr with the random capability", nb(`
const randstr = (random: Random) => function randstr(prefix: string): string { return random().toString(36).replace('0.', prefix || ''); };`));

// E4 predicted N (JSX): editor_theme_css is a <style> element
report("E4", "editor_theme_css as JSX <style>", nb(`
const editor_theme_css = () => <style>{".lope-editable-md .ProseMirror-menubar { background: var(--theme-background, #fff); }"}</style>;`));
report("E4b", "editor_theme_css as a CSS string (an OJS helper would wrap it in <style>)", nb(`
const editor_theme_css_text = () => ".lope-editable-md .ProseMirror-menubar { background: var(--theme-background, #fff); }";`));

// E5 predicted N (FN): escaped_code_block_markdown calls mdCellSourceToMarkdown, which stays OJS (acorn)
report("E5", "escaped_code_block_markdown calls the OJS mdCellSourceToMarkdown", nb(`
const escaped_code_block_ojs = () => "md\`x\`";
const escaped_code_block_markdown = (mdCellSourceToMarkdown: (s: string) => string, escaped_code_block_ojs) => mdCellSourceToMarkdown(escaped_code_block_ojs);`, [{ name: "mdCellSourceToMarkdown" }]));

// E6 E1's escapeMarkdownInline failed on String.replace with a function replacement: is it the missing annotation?
report("E6", "replace(regex, (c: string) => ...) with the parameter annotated", nb(String.raw`
const escapeMarkdownInline = () => function escapeMarkdownInline(text: string): string { return text.replace(/[\\*~\[\]_|]/g, (c: string) => "\\" + c); };`));
report("E6b", "replaceAll / split-join form without a callback", nb(String.raw`
const escapeMarkdownInline = () => function escapeMarkdownInline(text: string): string { return text.replace(/([\\*~\[\]_|])/g, "\\$1"); };`));
