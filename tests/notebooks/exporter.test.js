/**
 * Behavioral test for exporter-2 module pure functions.
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
  path.join(__dirname, "../../notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/exporter-2.js"),
  "utf-8"
);

// Helper: extract a named const function from the module source and evaluate it.
// In exporter-2, const names are hashed: const _72pqco = function _escapeScriptTags(...){return(
// We match by function name which stays stable.
function extractCell(source, cellName) {
  const pattern = new RegExp(
    `const _\\w+ = function _${cellName}\\(([^)]*)\\)\\{return\\(([\\s\\S]*?)\\n\\)\\};`,
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

// Extract pure (zero-dep) cells
const escapeScriptTags = extractCell(exporterSource, "escapeScriptTags");
const getCompactISODate = extractCell(exporterSource, "getCompactISODate");
const isLiveImport = extractCell(exporterSource, "isLiveImport");
const inlineModule = extractCell(exporterSource, "inlineModule");
const arrayBufferToBase64 = extractCell(exporterSource, "arrayBufferToBase64");

// compareDefines was removed in exporter-2

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

describe("getCompactISODate", () => {
  it("returns a compact ISO date string", () => {
    const result = getCompactISODate();
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

describe("inlineModule", () => {
  it("wraps source in a script tag with correct id and mime", () => {
    const result = inlineModule("@test/mod", "const x = 1;");
    assert.ok(result.includes('id="@test/mod"'));
    assert.ok(result.includes('type="text/plain"'));
    assert.ok(result.includes('data-mime="application/javascript"'));
    assert.ok(result.includes("const x = 1;"));
  });

  it("supports custom mime type", () => {
    const result = inlineModule("style.css", "body{}", { mime: "text/css" });
    assert.ok(result.includes('data-mime="text/css"'));
  });

  it("supports data-main attribute", () => {
    const result = inlineModule("@test/main", "code", { main: true });
    assert.ok(result.includes("data-main"));
  });
});

// CSS.escape polyfill
const CSS_shim = {
  escape: (s) => s.replace(/([^\w-])/g, "\\$1"),
};

// Build lopemodule: (TRACE_MODULE, CSS, arrayBufferToBase64, inlineModule, escapeScriptTags) => async fn
const lopemodule = buildCell(exporterSource, "lopemodule", {
  TRACE_MODULE: null,
  CSS: CSS_shim,
  arrayBufferToBase64,
  inlineModule,
  escapeScriptTags,
});

describe("lopemodule", () => {
  it("serializes a module without file attachments", async () => {
    const origDoc = globalThis.document;
    globalThis.document = { querySelector: () => null };
    try {
      const module = {
        url: "@test/hello",
        imports: [],
        fileAttachments: new Map(),
        source: "export default function define() {}",
      };
      const result = await lopemodule(module);
      assert.ok(result.includes('id="@test/hello"'), "has module id");
      assert.ok(result.includes("export default function define() {}"), "has source");
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("serializes file attachments with stable id (not blob URL)", async () => {
    const originalFetch = globalThis.fetch;
    const fakeContent = new TextEncoder().encode("fake-file-content");
    globalThis.fetch = async () => ({
      arrayBuffer: async () => fakeContent.buffer,
      headers: { get: () => "text/plain" },
    });
    const origDoc = globalThis.document;
    globalThis.document = { querySelector: () => null };

    try {
      const module = {
        url: "@test/with-files",
        imports: [],
        fileAttachments: new Map([
          [
            "data.txt",
            {
              url: "blob:https://example.com/random-uuid-here",
              mimeType: "text/plain",
            },
          ],
        ]),
        source: "export default function define() {}",
      };
      const result = await lopemodule(module);
      // Issue #8: file attachment id should be stable module/filename, not blob URL
      assert.ok(
        result.includes('id="@test/with-files/data.txt"'),
        "file attachment uses stable id (module/filename)"
      );
      assert.ok(
        !result.includes("blob:"),
        "no blob URLs in output"
      );
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.document = origDoc;
    }
  });
});

