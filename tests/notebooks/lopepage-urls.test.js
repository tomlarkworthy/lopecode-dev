import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const NOTEBOOK = path.join(
  PROJECT_ROOT,
  "lopecode/notebooks/@tomlarkworthy_robocoop-2.html"
);

function sendCommand(repl, cmd) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timeout = setTimeout(() => {
      repl.stdout.removeListener("data", onData);
      reject(new Error(`sendCommand timed out for: ${JSON.stringify(cmd).slice(0, 100)}`));
    }, 30_000);
    const onData = (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          clearTimeout(timeout);
          repl.stdout.removeListener("data", onData);
          resolve(parsed);
          return;
        } catch {}
      }
    };
    repl.stdout.on("data", onData);
    repl.stdin.write(JSON.stringify(cmd) + "\n");
  });
}

// Build a sync IIFE that looks up functions by name from the runtime and runs body code.
// Body code should use `return JSON.stringify(...)` to return results.
// Function names become local variables in scope.
function evalFns(repl, fnNames, bodyCode) {
  const lookups = fnNames
    .map(
      (n) =>
        `for (const v of runtime._variables) { if (v._name === "${n}" && typeof v._value === "function") { ${n} = v._value; break; } }`
    )
    .join("\n");
  const decls = fnNames.map((n) => `let ${n};`).join("\n");
  return sendCommand(repl, {
    cmd: "eval",
    code: `(() => {
      const runtime = window.__ojs_runtime;
      ${decls}
      ${lookups}
      ${bodyCode}
    })()`,
  });
}

describe("@tomlarkworthy/lopepage-urls", () => {
  let repl;

  before(async () => {
    repl = spawn("node", [path.join(PROJECT_ROOT, "tools/lope-browser-repl.js")], {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const ready = await sendCommand(repl, { cmd: "status" });
    assert.ok(ready.ok, "REPL should be ready");

    const hash =
      "view=R100(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/lopepage-urls))";
    const load = await sendCommand(repl, {
      cmd: "load",
      notebook: NOTEBOOK,
      hash,
    });
    assert.ok(load.ok, "Notebook should load");

    // Wait for Observable runtime lazy eval to settle by polling a known variable
    for (let i = 0; i < 30; i++) {
      const check = await sendCommand(repl, {
        cmd: "eval",
        code: `(() => {
          const runtime = window.__ojs_runtime;
          for (const v of runtime._variables) {
            if (v._name === "parseViewDSL" && typeof v._value === "function") return "ready";
          }
          return "waiting";
        })()`,
      });
      if (check.ok && check.result?.value === "ready") break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }, { timeout: 120_000 });

  after(async () => {
    if (repl) {
      try { await sendCommand(repl, { cmd: "quit" }); } catch {}
      repl.kill();
    }
  });

  // --- parseViewDSL ---

  describe("parseViewDSL", () => {
    it("parses a simple module list", async () => {
      const res = await evalFns(repl, ["parseViewDSL"], `
        return JSON.stringify(parseViewDSL("@tomlarkworthy/slug,@owner/page"));
      `);
      assert.ok(res.ok, res.error);
      const ast = JSON.parse(res.result.value);
      assert.equal(ast.nodeType, "group");
      assert.equal(ast.children.length, 2);
      assert.equal(ast.children[0].slug, "@tomlarkworthy/slug");
      assert.equal(ast.children[1].slug, "@owner/page");
    });

    it("parses nested row/column/stack layout", async () => {
      const res = await evalFns(repl, ["parseViewDSL"], `
        return JSON.stringify(parseViewDSL("R100(C50(S50(@tomlarkworthy/a),S50(@tomlarkworthy/b)),S50(@tomlarkworthy/c))"));
      `);
      assert.ok(res.ok, res.error);
      const ast = JSON.parse(res.result.value);
      assert.equal(ast.nodeType, "group");
      assert.equal(ast.groupType, "R");
      assert.equal(ast.weight, 100);
      assert.equal(ast.children.length, 2);
      assert.equal(ast.children[0].groupType, "C");
      assert.equal(ast.children[1].groupType, "S");
    });

    it("handles view= prefix", async () => {
      const res = await evalFns(repl, ["parseViewDSL"], `
        const a = JSON.stringify(parseViewDSL("view=@tomlarkworthy/slug"));
        const b = JSON.stringify(parseViewDSL("@tomlarkworthy/slug"));
        return JSON.stringify({ equal: a === b });
      `);
      assert.ok(res.ok, res.error);
      const { equal } = JSON.parse(res.result.value);
      assert.ok(equal, "view= prefix should be stripped transparently");
    });

    it("returns empty group for null/empty input", async () => {
      const res = await evalFns(repl, ["parseViewDSL"], `
        return JSON.stringify(parseViewDSL(null));
      `);
      assert.ok(res.ok, res.error);
      const ast = JSON.parse(res.result.value);
      assert.equal(ast.nodeType, "group");
      assert.equal(ast.children.length, 0);
    });
  });

  // --- serializeGoldenDSL round-trip ---

  describe("serializeGoldenDSL", () => {
    it("round-trips through parse → convert → serialize", async () => {
      const res = await evalFns(repl, ["parseGoldenDSL", "serializeGoldenDSL"], `
        const input = "R100(S50(@tomlarkworthy/a,@tomlarkworthy/b),S50(@tomlarkworthy/c))";
        const gl = parseGoldenDSL(input);
        const output = serializeGoldenDSL(gl);
        const gl2 = parseGoldenDSL(output);
        const output2 = serializeGoldenDSL(gl2);
        return JSON.stringify({ output, output2, stable: output === output2 });
      `);
      assert.ok(res.ok, res.error);
      const { stable, output, output2 } = JSON.parse(res.result.value);
      assert.ok(stable, `Serialization should be stable: "${output}" vs "${output2}"`);
    });
  });

  // --- navHref ---

  describe("navHref", () => {
    it("generates #open= href for string target", async () => {
      const res = await evalFns(repl, ["navHref"], `
        return JSON.stringify({
          simple: navHref("@tomlarkworthy/foo"),
          withCell: navHref("@tomlarkworthy/foo#bar"),
          hashTarget: navHref("#anchor"),
        });
      `);
      assert.ok(res.ok, res.error);
      const { simple, withCell, hashTarget } = JSON.parse(res.result.value);
      assert.equal(simple, "#open=@tomlarkworthy/foo");
      assert.equal(withCell, "#open=@tomlarkworthy/foo#bar");
      assert.equal(hashTarget, "#anchor");
    });

    it("supports intent objects", async () => {
      const res = await evalFns(repl, ["navHref"], `
        return JSON.stringify({
          openIntent: navHref({ module: "@tomlarkworthy/foo", op: "open" }),
          closeIntent: navHref({ close: "@tomlarkworthy/foo" }),
          focusIntent: navHref({ focus: "@tomlarkworthy/foo", cell: "bar" }),
        });
      `);
      assert.ok(res.ok, res.error);
      const { openIntent, closeIntent, focusIntent } = JSON.parse(res.result.value);
      assert.equal(openIntent, "#open=@tomlarkworthy/foo");
      assert.equal(closeIntent, "#close=@tomlarkworthy/foo");
      assert.equal(focusIntent, "#focus=@tomlarkworthy/foo#bar");
    });
  });

  // --- linkTo ---

  describe("linkTo", () => {
    it("preserves existing view= hash parameter", async () => {
      const res = await evalFns(repl, ["linkTo"], `
        const result = linkTo("@tomlarkworthy/foo", {
          baseURI: "file:///test.html#view=S100(@tomlarkworthy/bar)",
          onObservable: false,
        });
        return JSON.stringify({ result });
      `);
      assert.ok(res.ok, res.error);
      const { result } = JSON.parse(res.result.value);
      assert.ok(result.includes("view="), "Should preserve view= param");
      assert.ok(result.includes("open="), "Should add open= param");
    });

    it("does NOT percent-encode DSL characters in hash", async () => {
      const res = await evalFns(repl, ["linkTo"], `
        const result = linkTo("@tomlarkworthy/foo", {
          baseURI: "file:///test.html#view=R100(S50(@tomlarkworthy/bar),S50(@tomlarkworthy/baz))",
          onObservable: false,
        });
        return JSON.stringify({ result });
      `);
      assert.ok(res.ok, res.error);
      const { result } = JSON.parse(res.result.value);

      const hash = result.slice(result.indexOf("#") + 1);
      assert.ok(!hash.includes("%28"), `Should not encode '(' as %28: ${hash}`);
      assert.ok(!hash.includes("%29"), `Should not encode ')' as %29: ${hash}`);
      assert.ok(!hash.includes("%40"), `Should not encode '@' as %40: ${hash}`);
      assert.ok(!hash.includes("%2C"), `Should not encode ',' as %2C: ${hash}`);
      assert.ok(!hash.includes("%2F"), `Should not encode '/' as %2F: ${hash}`);
      assert.ok(
        hash.includes("view=R100(S50(@tomlarkworthy/bar),S50(@tomlarkworthy/baz))"),
        `View DSL should be preserved verbatim: ${hash}`
      );
    });

    it("encoding round-trips with sync_layout_to_url style", async () => {
      const res = await evalFns(repl, ["linkTo", "parseGoldenDSL", "serializeGoldenDSL"], `
        const viewDSL = "R100(S50(@tomlarkworthy/module-selection),S25(@tomlarkworthy/editor-5),S25(@tomlarkworthy/lopepage-urls))";
        const url = linkTo("@tomlarkworthy/foo#cell", {
          baseURI: "file:///test.html#view=" + viewDSL,
          onObservable: false,
        });
        const hash = url.slice(url.indexOf("#") + 1);
        const params = new URLSearchParams(hash);
        const extractedView = params.get("view");
        return JSON.stringify({ originalDSL: viewDSL, extractedView, viewPreserved: extractedView === viewDSL });
      `);
      assert.ok(res.ok, res.error);
      const { viewPreserved, originalDSL, extractedView } = JSON.parse(res.result.value);
      assert.ok(
        viewPreserved,
        `linkTo should preserve view DSL verbatim. Original: "${originalDSL}", Extracted: "${extractedView}"`
      );
    });

    it("returns hash-only for same-page navigation", async () => {
      const res = await evalFns(repl, ["linkTo"], `
        const result = linkTo("@tomlarkworthy/foo", {
          baseURI: document.baseURI,
          onObservable: false,
        });
        return JSON.stringify({ result, startsWithHash: result.startsWith("#") });
      `);
      assert.ok(res.ok, res.error);
      const { result, startsWithHash } = JSON.parse(res.result.value);
      assert.ok(
        startsWithHash,
        `Same-page linkTo should return hash-only URL to avoid reload, got: ${result}`
      );
    });

    it("handles Observable context", async () => {
      const res = await evalFns(repl, ["linkTo"], `
        return JSON.stringify({
          module: linkTo("@tomlarkworthy/foo", { onObservable: true }),
          withCell: linkTo("@tomlarkworthy/foo#bar", { onObservable: true }),
          hashTarget: linkTo("#anchor", { onObservable: true }),
        });
      `);
      assert.ok(res.ok, res.error);
      const { module: mod, withCell, hashTarget } = JSON.parse(res.result.value);
      assert.equal(mod, "/@tomlarkworthy/foo");
      assert.equal(withCell, "/@tomlarkworthy/foo#bar");
      assert.equal(hashTarget, "#anchor");
    });
  });

  // --- extractNotebookAndCell ---

  describe("extractNotebookAndCell", () => {
    it("extracts from Observable URLs", async () => {
      const res = await evalFns(repl, ["extractNotebookAndCell"], `
        return JSON.stringify({
          plain: extractNotebookAndCell("https://observablehq.com/@tomlarkworthy/robocoop"),
          withCell: extractNotebookAndCell("https://observablehq.com/@tomlarkworthy/robocoop#on_prompt"),
          shortD: extractNotebookAndCell("https://observablehq.com/d/936eb1bc1db1ac62"),
        });
      `);
      assert.ok(res.ok, res.error);
      const { plain, withCell, shortD } = JSON.parse(res.result.value);
      assert.deepEqual(plain, { notebook: "@tomlarkworthy/robocoop", cell: null });
      assert.deepEqual(withCell, { notebook: "@tomlarkworthy/robocoop", cell: "on_prompt" });
      assert.deepEqual(shortD, { notebook: "d/936eb1bc1db1ac62", cell: null });
    });

    it("extracts from bare module references", async () => {
      const res = await evalFns(repl, ["extractNotebookAndCell"], `
        return JSON.stringify(extractNotebookAndCell("@tomlarkworthy/robocoop#on_prompt"));
      `);
      assert.ok(res.ok, res.error);
      const result = JSON.parse(res.result.value);
      assert.deepEqual(result, { notebook: "@tomlarkworthy/robocoop", cell: "on_prompt" });
    });
  });
});
