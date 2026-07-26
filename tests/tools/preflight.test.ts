// Regression tests for the browserless corpus gate. Every case here is a real
// false positive or real miss found while building it against the 221-notebook corpus.
//
//   bun test tests/tools/preflight.test.ts
import { test, expect } from "bun:test";
import { checkHtml } from "../../tools/lope-preflight.ts";
import { placeBefore } from "../../tools/lope-fix-attachment-order.ts";

const kinds = (html: string) => checkHtml(html).map((p) => p.kind);
const boot = (mains: string[]) =>
  `<script id="bootconf.json" type="text/plain" data-mime="application/json">\n${JSON.stringify({ mains })}</script>`;
const mod = (id: string, body: string) =>
  `<script id="${id}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${body}</script>`;
const att = (id: string, mime = "text/markdown") =>
  `<script id="${id}" type="text/plain" data-mime="${mime}">\nx</script>`;
// the exporter emits `new Map([<names>].map((name) => {...}))` — names only
const loader = (...names: string[]) =>
  `const fileAttachments = new Map([${names.map((n) => JSON.stringify(n)).join(",")}].map((name) => {\n  const module_name = "@a/b";\n  return [name, {url: 1}];\n}));`;

test("a clean notebook has no findings", () => {
  expect(kinds(boot(["@a/b"]) + mod("@a/b", "function define(){}"))).toEqual([]);
});

test("unparseable module source is reported", () => {
  expect(kinds(boot(["@a/b"]) + mod("@a/b", "function define({"))).toContain("syntax");
});

test("base64+gzip blocks hold bytes, not source, so are not parsed", () => {
  // 663 false `syntax` findings came from parsing vendored gzipped bundles
  const packed = `<script id="@a/b/lib.js.gz" type="text/plain"\n  data-mime="application/javascript"\n  data-encoding="base64+gzip"\n>\nH4sIAAAA!!!not-js</script>`;
  expect(kinds(boot(["@a/b"]) + packed + mod("@a/b", "function define(){}"))).toEqual([]);
});

test("a missing imported module is reported, but only inside the mains closure", () => {
  const live = boot(["@a/b"]) + mod("@a/b", `main.define("module @a/gone", () => 1);`);
  expect(kinds(live)).toContain("missing-import");
  // same module, not reachable from mains: the lazy runtime never instantiates it
  const lazy = boot(["@a/other"]) + mod("@a/other", "function define(){}") +
    mod("@a/b", `main.define("module @a/gone", () => 1);`);
  expect(kinds(lazy)).toContain("missing-import-lazy");
  expect(kinds(lazy)).not.toContain("missing-import");
});

test("Observable document-id imports and codegen templates are not block ids", () => {
  // 1577 false findings: `module 1` / `module d/<hex>@n` resolve via the importmap,
  // and `module ${m}` is exporter codegen inside a string literal
  const src = [
    'main.define("module 1", () => 1);',
    'main.define("module d/1a2b3c4d5e6f7a8b@942", () => 1);',
    "const gen = 'main.define(\"module ${ m }\")';",
  ].join("\n");
  expect(kinds(boot(["@a/b"]) + mod("@a/b", src))).toEqual([]);
});

test("an attachment emitted after its module violates the ordering rule", () => {
  const src = loader("doc.md");
  const after = boot(["@a/b"]) + mod("@a/b", src) + att("@a/b/doc.md");
  expect(kinds(after)).toEqual(["attachment-after-module"]);
  const before = boot(["@a/b"]) + att("@a/b/doc.md") + mod("@a/b", src);
  expect(kinds(before)).toEqual([]);
});

test("ordering applies to blocks a module reads off the DOM, not just its loader map", () => {
  // markdown-wiki finds its own docs by querySelectorAll, so they are never in a map
  const html = boot(["@a/b"]) + mod("@a/b", "function define(){}") + att("@a/b/undeclared.md");
  expect(kinds(html)).toEqual(["attachment-after-module"]);
});

test("a block reachable both ways is reported once", () => {
  const src = loader("doc.md");
  expect(kinds(boot(["@a/b"]) + mod("@a/b", src) + att("@a/b/doc.md")).length).toBe(1);
});

test("percent-encoded attachment ids match their loader-map name", () => {
  const src = loader("lib@5.js.gz");
  const html = boot(["@a/b"]) + att("@a/b/lib%405.js.gz") + mod("@a/b", src);
  expect(kinds(html)).toEqual([]);
});

test("a declared attachment with no block at all is reported missing", () => {
  const src = loader("gone.md");
  expect(kinds(boot(["@a/b"]) + mod("@a/b", src))).toContain("missing-attachment");
});

test("a bootconf main that is not embedded is reported", () => {
  expect(kinds(boot(["@a/absent"]))).toContain("missing-main");
});

test("duplicate block ids are reported", () => {
  const html = boot(["@a/b"]) + mod("@a/b", "function define(){}") + mod("@a/b", "function define(){}");
  expect(kinds(html)).toContain("duplicate");
});

// --------------------------------------------------------------------- reordering

test("placeBefore moves a stray block ahead of its owner and changes nothing else", () => {
  const before = boot(["@a/b"]) + mod("@a/b", "function define(){}") + att("@a/b/doc.md");
  const { html, moved } = placeBefore(before);
  expect(moved).toEqual(["@a/b/doc.md"]);
  expect(html.length).toBe(before.length);            // a pure permutation
  expect(html.indexOf("@a/b/doc.md")).toBeLessThan(html.indexOf('id="@a/b" '));
  expect(checkHtml(html)).toEqual([]);
});

test("placeBefore keeps the relative order of a group", () => {
  const before = boot(["@a/b"]) + mod("@a/b", "function define(){}") +
    att("@a/b/one.md") + att("@a/b/two.md") + att("@a/b/three.md");
  const { html } = placeBefore(before);
  expect(html.indexOf("one.md")).toBeLessThan(html.indexOf("two.md"));
  expect(html.indexOf("two.md")).toBeLessThan(html.indexOf("three.md"));
  expect(html.length).toBe(before.length);
});

test("placeBefore is idempotent and leaves compliant documents untouched", () => {
  const ok = boot(["@a/b"]) + att("@a/b/doc.md") + mod("@a/b", "function define(){}");
  expect(placeBefore(ok).moved).toEqual([]);
  expect(placeBefore(ok).html).toBe(ok);
  const fixed = placeBefore(boot(["@a/b"]) + mod("@a/b", "function define(){}") + att("@a/b/doc.md")).html;
  expect(placeBefore(fixed).moved).toEqual([]);
});

test("placeBefore ignores a block whose owner is not a module in this document", () => {
  const html = boot([]) + att("@nobody/here/doc.md");
  expect(placeBefore(html).moved).toEqual([]);
});
