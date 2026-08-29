// Regression tests for the phantom-opener class in sync-module.
//
// `@tomlarkworthy/exporter-3` writes notebooks, so its own source contains literal
// `<script id="…">` openers and a second `<!-- Bootloader -->`. On 2026-08-18 that
// made `--insert-ok` splice 14 blocks INSIDE exporter-3 in
// lopecode-newsletter-002 (offsets +47,268 … +217,966 of a 132KB block), producing
// `syntax | exporter-3: Parse error` and 18 cascading missing-export findings.
//
//   bun test tests/tools/sync-module.test.ts
import { test, expect } from "bun:test";
import { writeFileSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blockSpans, inject, extractModuleContent, buildScriptBlock } from "../../tools/channel/sync-module.ts";

// A notebook whose exporter-3 block carries the phantoms verbatim.
const phantoms =
  `  const block = \`<script id="\${ id }" data-mime="\${ mime }">\`;\n` +
  `  out += '<script id="bootconf.json">' + JSON.stringify(conf) + '<\\/script>';\n` +
  `  out += '<!-- Bootloader -->';\n`;

const notebook = () =>
  `<html><body>\n` +
  `<script id="@tomlarkworthy/themes" type="text/plain" data-mime="application/javascript">\nconst t = 1;</script>\n\n` +
  `<!-- Bootloader -->\n` +
  `<script id="bootconf.json" type="text/plain" data-mime="application/json">\n{"mains":[]}</script>\n\n` +
  `<script id="@tomlarkworthy/exporter-3" type="text/plain" data-mime="application/javascript">\n${phantoms}</script>\n` +
  `</body></html>`;

const tmp = (html: string) => {
  const p = join(mkdtempSync(join(tmpdir(), "syncmod-")), "n.html");
  writeFileSync(p, html);
  return p;
};

test("blockSpans sees only top-level blocks, not exporter-3's literals", () => {
  const ids = blockSpans(notebook()).map((s) => s.id);
  expect(ids).toEqual(["@tomlarkworthy/themes", "bootconf.json", "@tomlarkworthy/exporter-3"]);
});

test("insert lands at the document marker, never inside exporter-3", () => {
  const p = tmp(notebook());
  const block = buildScriptBlock("@tomlarkworthy/new-mod", "const x = 1;");
  expect(inject(block, p, "@tomlarkworthy/new-mod", true)).toBe("inserted");

  const html = readFileSync(p, "utf8");
  const exp = blockSpans(html).find((s) => s.id === "@tomlarkworthy/exporter-3")!;
  const at = html.indexOf('<script id="@tomlarkworthy/new-mod"');
  expect(at).toBeGreaterThan(-1);
  expect(at < exp.start || at > exp.end).toBe(true);
  // and it is a real top-level block afterwards
  expect(blockSpans(html).map((s) => s.id)).toContain("@tomlarkworthy/new-mod");
});

test("a phantom bootconf.json is not mistaken for the real one", () => {
  // The real bootconf must be the one that parses; exporter-3 emits a lookalike.
  const body = extractModuleContent(notebook(), "bootconf.json")!;
  expect(() => JSON.parse(body)).not.toThrow();
});

test("update of an existing module rewrites the real block, not a phantom", () => {
  const p = tmp(notebook());
  const next = buildScriptBlock("@tomlarkworthy/themes", "const t = 2;");
  expect(inject(next, p, "@tomlarkworthy/themes", false)).toBe("updated");
  const html = readFileSync(p, "utf8");
  expect(extractModuleContent(html, "@tomlarkworthy/themes")).toBe("const t = 2;");
  expect(extractModuleContent(html, "@tomlarkworthy/exporter-3")).toBe(phantoms.replace(/\n$/, ""));
});

test("the write guard refuses a splice into another block", () => {
  const p = tmp(notebook());
  // A block whose id line is legitimate but whose body would land inside exporter-3
  // if the marker search picked the phantom: simulate by removing the real marker.
  writeFileSync(p, readFileSync(p, "utf8").replace("<!-- Bootloader -->\n<script id=\"bootconf.json\"", "<script id=\"bootconf.json\""));
  const block = buildScriptBlock("@tomlarkworthy/other", "const y = 1;");
  expect(() => inject(block, p, "@tomlarkworthy/other", true)).toThrow(/document-level/);
});

// 2026-08-18: removing @tomlarkworthy/notes from lopecode-newsletter-002 with a naive
// find() cut into markdown-wiki/lopecode-internal-networking.md, which *documents*
// `<script id="@tomlarkworthy/notes">` in prose. The doc lost 3,477 bytes mid-sentence
// and swallowed the next attachment's opener, so the DOM showed 12 of 13 attachments.
test("a block id quoted inside a doc attachment is not the block", () => {
  const html =
    `<script id="@tomlarkworthy/wiki/networking.md" type="text/plain" data-mime="text/markdown">\n` +
    `Modules are stored as <script id="@tomlarkworthy/notes"> blocks; importShim resolves them.</script>\n\n` +
    `<script id="@tomlarkworthy/notes" type="text/plain" data-mime="application/javascript">\nconst real = 1;</script>\n`;

  const ids = blockSpans(html).map((s) => s.id);
  expect(ids).toEqual(["@tomlarkworthy/wiki/networking.md", "@tomlarkworthy/notes"]);
  expect(extractModuleContent(html, "@tomlarkworthy/notes")).toBe("const real = 1;");
  // the naive search everyone reaches for finds the prose, 100+ bytes earlier
  expect(html.indexOf('<script id="@tomlarkworthy/notes"')).toBeLessThan(
    blockSpans(html).find((s) => s.id === "@tomlarkworthy/notes")!.start
  );
});
