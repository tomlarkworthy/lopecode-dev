/**
 * Behavioral test for exporter module pure functions.
 *
 * Tests the code-generation pipeline by extracting cell definitions from the
 * disassembled module and running them directly in Node.js.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The exporter module is an Observable notebook definition.
// We can extract the const declarations and evaluate them to get the pure functions.
const exporterSource = fs.readFileSync(
  path.join(__dirname, "../notebooks/@tomlarkworthy/exporter-2/modules/@tomlarkworthy/exporter.js"),
  "utf-8"
);

// Helper: extract a named const function from the module source and evaluate it.
// Observable cells are like: const _name = function _name(dep1, dep2){return( ... )};
// For zero-dependency cells the pattern is: const _name = function _name(){return( ... )};
function extractCell(source, cellName) {
  // Match: const _<cellName> = function _<cellName>(...){return(
  const pattern = new RegExp(
    `const _${cellName} = function _${cellName}\\(([^)]*)\\)\\{return\\(([\\s\\S]*?)\\n\\)\\};`,
    "m"
  );
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Cell not found: ${cellName}`);
  }
  const deps = match[1].trim();
  const body = match[2];
  if (deps === "") {
    // Zero-dependency cell: evaluate the body directly
    return eval(`(${body})`);
  }
  // Return the factory function for cells with deps
  return { deps: deps.split(",").map((d) => d.trim()), body };
}

// Extract pure (zero-dep) cells
const escapeScriptTags = extractCell(exporterSource, "escapeScriptTags");
const rewriteImports = extractCell(exporterSource, "rewriteImports");
const getCompactISODate = extractCell(exporterSource, "getCompactISODate");
const isLiveImport = extractCell(exporterSource, "isLiveImport");

// compareDefines has a special format (prompt object && function)
// Extract it manually
const compareDefinesMatch = exporterSource.match(
  /const _compareDefines = function _compareDefines\(\)\{return\(\n\{[\s\S]*?\} &&\n\s*(\/\*\*[\s\S]*?function compareDefines[\s\S]*?\n\s*\})\n\)\};/
);
const compareDefines = compareDefinesMatch
  ? eval(`(${compareDefinesMatch[1]})`)
  : null;

describe("escapeScriptTags", () => {
  it("escapes </script in source code", () => {
    const input = 'console.log("</script>");';
    const result = escapeScriptTags(input);
    assert.equal(result, 'console.log("</scr\\ipt>");');
  });

  it("handles multiple occurrences", () => {
    const input = "</script></script>";
    const result = escapeScriptTags(input);
    assert.equal(result, "</scr\\ipt></scr\\ipt>");
  });

  it("leaves non-matching content untouched", () => {
    const input = "const x = 42;";
    assert.equal(escapeScriptTags(input), input);
  });
});

describe("rewriteImports", () => {
  it("rewrites versioned import paths to clean module names", () => {
    const module = {
      source: 'import foo from "@tomlarkworthy/view.js?v=4";',
      imports: ["@tomlarkworthy/view"],
    };
    const result = rewriteImports(module);
    assert.equal(result, 'import foo from "@tomlarkworthy/view";');
  });

  it("rewrites paths with leading slash", () => {
    const module = {
      source: 'import foo from "/@tomlarkworthy/exporter.js?v=4";',
      imports: ["@tomlarkworthy/exporter"],
    };
    const result = rewriteImports(module);
    assert.equal(result, 'import foo from "@tomlarkworthy/exporter";');
  });

  it("handles multiple imports", () => {
    const module = {
      source: [
        'import a from "/@tomlarkworthy/view.js?v=4";',
        'import b from "@tomlarkworthy/testing.js?v=4";',
      ].join("\n"),
      imports: ["@tomlarkworthy/view", "@tomlarkworthy/testing"],
    };
    const result = rewriteImports(module);
    assert.ok(result.includes('"@tomlarkworthy/view"'));
    assert.ok(result.includes('"@tomlarkworthy/testing"'));
    assert.ok(!result.includes("?v=4"));
  });
});

describe("getCompactISODate", () => {
  it("returns a compact ISO date string", () => {
    const result = getCompactISODate();
    // Format: YYYYMMDDTHHMMSSz
    assert.match(result, /^\d{8}T\d{6}Z$/);
  });
});

describe("isLiveImport", () => {
  it("detects live import variables", () => {
    const variable = {
      _definition: function () {
        return "observablehq--inspect observablehq--import";
      },
    };
    assert.equal(isLiveImport(variable), true);
  });

  it("rejects non-import variables", () => {
    const variable = {
      _definition: function () {
        return 42;
      },
    };
    assert.equal(isLiveImport(variable), false);
  });
});

// --- Cells with dependencies, built by injecting mocks ---

// Helper: extract a cell with deps and call its factory with provided values
function buildCell(source, cellName, depValues) {
  const result = extractCell(source, cellName);
  if (typeof result !== "object" || !result.deps) {
    return result; // zero-dep, already evaluated
  }
  const { deps, body } = result;
  const fn = new Function(...deps, `return (\n${body}\n)`);
  return fn(...deps.map((d) => depValues[d]));
}

const arrayBufferToBase64 = extractCell(exporterSource, "arrayBufferToBase64");
const builtin_def = extractCell(exporterSource, "builtin_def");

// CSS.escape polyfill
const CSS_shim = {
  escape: (s) => s.replace(/([^\w-])/g, "\\$1"),
};

// Build lopemodule: (CSS, arrayBufferToBase64, escapeScriptTags, rewriteImports) => async fn
const lopemodule = buildCell(exporterSource, "lopemodule", {
  CSS: CSS_shim,
  arrayBufferToBase64,
  escapeScriptTags,
  rewriteImports,
});

// Mocks for lopebook deps
const inspector_css = { outerHTML: "<style>/* inspector */</style>" };
const decompress_sledfile = async (file) => `blob:fake/${file}`;

// Build lopebook: (inspector_css, lopemodule, decompress_sledfile, builtin_def) => async fn
const lopebook = buildCell(exporterSource, "lopebook", {
  inspector_css,
  lopemodule,
  decompress_sledfile,
  builtin_def,
});

describe("lopebook serialization", () => {
  it("produces valid HTML from a minimal bundle", async () => {
    const moduleSource = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], function(md) { return md\`# Hello\`; });
  return main;
}`;

    const bundle = {
      url: "@test/hello-world",
      modules: new Map([
        [
          "@test/hello-world",
          {
            url: "@test/hello-world",
            imports: [],
            fileAttachments: new Map(),
            source: moduleSource,
          },
        ],
      ]),
    };

    const html = await lopebook(bundle, {
      style: "<style>body{}</style>",
      title: "Test Notebook",
      headless: false,
    });

    // Structural assertions
    assert.ok(html.includes("<!DOCTYPE html>"), "has doctype");
    assert.ok(html.includes("<title>Test Notebook</title>"), "has title");
    assert.ok(
      html.includes("<style>/* inspector */</style>"),
      "has inspector css"
    );
    assert.ok(
      html.includes('script type="lope-module"'),
      "has lope-module script"
    );
    assert.ok(
      html.includes('id="@test/hello-world"'),
      "module has correct id"
    );
    assert.ok(
      html.includes('import define from "@test/hello-world"'),
      "bootloader imports main module"
    );
    assert.ok(
      html.includes("Inspector.into(document.body)"),
      "uses visible inspector"
    );
    assert.ok(
      html.includes("decompress_sledfile"),
      "bootloader includes decompress function"
    );
    assert.ok(
      html.includes("window.onload"),
      "bootloader has onload handler"
    );
  });

  it("supports headless mode", async () => {
    const bundle = {
      url: "@test/headless",
      modules: new Map([
        [
          "@test/headless",
          {
            url: "@test/headless",
            imports: [],
            fileAttachments: new Map(),
            source: "export default function define() {}",
          },
        ],
      ]),
    };

    const html = await lopebook(bundle, {
      style: "",
      title: "Headless",
      headless: true,
    });

    assert.ok(
      html.includes("Inspector.into(document.createElement('div'))"),
      "uses hidden inspector in headless mode"
    );
    assert.ok(
      !html.includes("Inspector.into(document.body)"),
      "does not use visible inspector"
    );
  });

  it("includes file attachments as lope-file scripts", async () => {
    // Provide a module with a file attachment
    // lopemodule will try document.querySelector (returns null via shim),
    // then fall back to fetch. We mock fetch for this test.
    const originalFetch = globalThis.fetch;
    const fakeContent = new TextEncoder().encode("fake-file-content");
    globalThis.fetch = async () => ({
      arrayBuffer: async () => fakeContent.buffer,
      headers: { get: () => "text/plain" },
    });

    // Minimal document.querySelector shim
    const origDoc = globalThis.document;
    globalThis.document = { querySelector: () => null };

    try {
      const bundle = {
        url: "@test/with-files",
        modules: new Map([
          [
            "@test/with-files",
            {
              url: "@test/with-files",
              imports: [],
              fileAttachments: new Map([
                [
                  "data.txt",
                  {
                    url: "https://example.com/data.txt",
                    mimeType: "text/plain",
                  },
                ],
              ]),
              source: "export default function define() {}",
            },
          ],
        ]),
      };

      const html = await lopebook(bundle, {
        style: "",
        title: "With Files",
        headless: true,
      });

      assert.ok(
        html.includes('script type="lope-file"'),
        "has lope-file script"
      );
      assert.ok(
        html.includes('module="@test/with-files"'),
        "lope-file has module attr"
      );
      assert.ok(
        html.includes('file="data.txt"'),
        "lope-file has file attr"
      );
      assert.ok(
        html.includes('mime="text/plain"'),
        "lope-file has mime attr"
      );
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.document = origDoc;
    }
  });
});

describe("compareDefines", { skip: !compareDefines }, () => {
  it("finds no differences for identical defines", () => {
    const define = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("foo")).define("foo", [], _foo);
  return main;
}`;
    const result = compareDefines(define, define);
    assert.equal(result.errors, 0);
    assert.deepEqual(result.extraLines, []);
    assert.deepEqual(result.missingLines, []);
  });

  it("detects extra and missing lines", () => {
    const define1 = `line_a\nline_b\nline_c`;
    const define2 = `line_a\nline_d`;
    const result = compareDefines(define1, define2);
    assert.ok(result.extraLines.includes("line_b"));
    assert.ok(result.extraLines.includes("line_c"));
    assert.ok(result.missingLines.includes("line_d"));
    assert.equal(result.errors, 3);
  });

  it("normalizes anonymous cell names", () => {
    const define1 = `main.variable(observer()).define(["md"], _0);`;
    const define2 = `main.variable(observer()).define(["md"], _5);`;
    const result = compareDefines(define1, define2);
    assert.equal(result.errors, 0);
  });
});
