// verifyShell: the shell with the boot list cut to brain-shell (build.ts writes it as .emitted/verify.html).
//
//   bun test ./tests/tools/verify-shell.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blockSpans, blockContent } from "../../tools/lib/notebook-blocks.ts";
import { verifyShell, VERIFY_MAINS } from "../../tools/cloud-brain/verify-shell.ts";

const b = (id: string, text: string) => `<script id="${id}" \n  type="text/plain"\n  data-mime="x"\n>\n${text}</script>`;
const conf = {
  mains: ["@tomlarkworthy/lopepage-2", "@tomlarkworthy/svg-lens", "@tomlarkworthy/brain-shell", "@tomlarkworthy/tests"],
  hash: "#view=C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/brain-shell))",
  headless: true,
};
// A writer module carries a look-alike of the block and escapes its own closer, as exporter-3 does.
const writer = `out += '<script id="bootconf.json">' + JSON.stringify({ mains: ["@a/phantom"] }) + '<\\/script>';\n`;
const shell = ["<html><head><title>Cloud Brain</title>", b("@a/writer", writer), b("bootconf.json", JSON.stringify(conf, null, 2) + "\n"), b("@tomlarkworthy/svg-lens", "S"), b("@tomlarkworthy/brain-shell", "B"), "</head></html>"].join("\n");

test("the boot list is brain-shell and nothing else", () => {
  expect(VERIFY_MAINS).toEqual(["@tomlarkworthy/brain-shell"]);
  expect(JSON.parse(blockContent(verifyShell(shell), "bootconf.json")!).mains).toEqual(["@tomlarkworthy/brain-shell"]);
});

test("every other key of bootconf.json is as it was", () => {
  const made = JSON.parse(blockContent(verifyShell(shell), "bootconf.json")!);
  expect(made).toEqual({ ...conf, mains: ["@tomlarkworthy/brain-shell"] });
  expect(Object.keys(made)).toEqual(Object.keys(conf));
});

test("no block is added, removed or changed but bootconf.json", () => {
  const out = verifyShell(shell);
  expect(blockSpans(out).map((s) => s.id)).toEqual(blockSpans(shell).map((s) => s.id));
  for (const id of ["@a/writer", "@tomlarkworthy/svg-lens", "@tomlarkworthy/brain-shell"]) expect(blockContent(out, id)).toBe(blockContent(shell, id));
  // The look-alike inside @a/writer is that block's text and stays.
  expect(out).toContain(`JSON.stringify({ mains: ["@a/phantom"] })`);
  // Outside the block the file is the same, byte for byte.
  const cut = (h: string) => { const s = blockSpans(h).find((x) => x.id === "bootconf.json")!; return [h.slice(0, s.start), h.slice(s.end)]; };
  expect(cut(out)).toEqual(cut(shell));
  // The opener keeps its attributes.
  expect(out).toContain(`<script id="bootconf.json" \n  type="text/plain"\n  data-mime="x"\n>\n{`);
});

test("made again from its own output it is the same file", () => {
  const once = verifyShell(shell);
  expect(verifyShell(once)).toBe(once);
});

test("a file that could not give a verdict is refused", () => {
  expect(() => verifyShell("<html></html>")).toThrow(/no bootconf\.json/);
  // brain-shell not in the file: the page would boot nothing.
  const without = ["<html>", b("bootconf.json", JSON.stringify(conf)), b("@tomlarkworthy/svg-lens", "S"), "</html>"].join("\n");
  expect(() => verifyShell(without)).toThrow(/no block @tomlarkworthy\/brain-shell/);
});

test("build.ts writes it beside the shell, from the shell", () => {
  const build = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/build.ts"), "utf8");
  expect(build).toContain(`writeFileSync(resolve(HERE, ".emitted/shell.html"), text);`);
  expect(build).toContain(`writeFileSync(resolve(HERE, ".emitted/verify.html"), verifyShell(text));`);
});
