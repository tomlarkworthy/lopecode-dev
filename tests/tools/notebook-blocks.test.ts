// The shared block locator and the block-level subcommands built on it.
//
// Every case here is a phantom-opener case: a module's own source legitimately
// contains `<script id="…">` (exporter-3 has ten, a doc attachment quotes one in
// prose), so a regex scan reports blocks that are not top-level — 2,947 of them
// across the 233-notebook corpus, 136 raw openers against 114 real blocks in
// lopecode-newsletter-002 alone.
//
//   bun test tests/tools/notebook-blocks.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blockSpans, findSpan, rawBlock, blockContent, blocks } from "../../tools/lib/notebook-blocks.ts";
import { cmdLsBlocks, cmdRmBlock, cmdStage } from "../../tools/lope-sync.ts";

// Three top-level blocks. The middle one is a writer module, so its source carries
// two phantom openers and escapes its own closer, exactly as exporter-3 does.
const phantoms =
  `  const block = \`<script id="\${ id }" data-mime="\${ mime }">\`;\n` +
  `  out += '<script id="bootconf.json">' + JSON.stringify(conf) + '<\\/script>';\n`;

const fixture =
  `<html><body>\n` +
  `<script id="bootconf.json" type="text/plain" data-mime="application/json">\n{"mains":["@a/writer"]}</script>\n\n` +
  `<script id="@a/writer" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${phantoms}</script>\n\n` +
  `<script id="@a/tail" type="text/plain" data-mime="application/javascript">\nconst t = 1;</script>\n` +
  `</body></html>`;

const capture = (fn: () => number): [number, string] => {
  const lines: string[] = [];
  const log = console.log, err = console.error;
  console.log = console.error = (...a: unknown[]) => { lines.push(a.join(" ")); };
  try { return [fn(), lines.join("\n")]; } finally { console.log = log; console.error = err; }
};

const tmpFile = (html: string, name = "n.html") => {
  const p = join(mkdtempSync(join(tmpdir(), "nbblocks-")), name);
  writeFileSync(p, html);
  return p;
};

test("blockSpans skips phantom openers inside a block", () => {
  expect(blockSpans(fixture).map((s) => s.id)).toEqual(["bootconf.json", "@a/writer", "@a/tail"]);
  // a regex sees five, three of which are inside @a/writer
  expect((fixture.match(/<script\s+id="/g) ?? []).length).toBe(5);
});

test("findSpan returns the real block, not the phantom that precedes it", () => {
  const span = findSpan(fixture, "bootconf.json")!;
  expect(span.start).toBe(fixture.indexOf('<script id="bootconf.json"'));
  // @a/writer quotes bootconf.json's opener too — that one is later and must not win
  expect(fixture.indexOf('<script id="bootconf.json"', span.end)).toBeGreaterThan(span.end);
  expect(blockContent(fixture, "bootconf.json")).toBe('{"mains":["@a/writer"]}');
});

test("blockContent strips exactly the exporter's leading newline", () => {
  expect(blockContent(fixture, "@a/tail")).toBe("const t = 1;");
  expect(blockContent(fixture, "@a/writer")).toBe(phantoms.replace(/\n$/, ""));
  expect(blockContent(fixture, "@a/missing")).toBeNull();
  expect(rawBlock(fixture, "@a/tail")!.endsWith("</script>")).toBe(true);
});

test("blocks() reports the opener attributes after the id", () => {
  const b = blocks(fixture).find((b) => b.id === "@a/writer")!;
  expect(b.attrs).toContain('data-mime="application/javascript"');
  expect(b.attrs).not.toContain("id=");
  expect(fixture.slice(b.start, b.end)).toBe(rawBlock(fixture, "@a/writer"));
});

test("ls-blocks lists only the three real blocks", () => {
  const [code, out] = capture(() => cmdLsBlocks(tmpFile(fixture), false));
  expect(code).toBe(0);
  expect(out).toContain("3 top-level block(s)");
});

test("rm-block dry-run spans the real block and takes its separator", () => {
  const p = tmpFile(fixture);
  const [code, out] = capture(() => cmdRmBlock(p, "@a/writer", false, false));
  expect(code).toBe(0);
  const span = findSpan(fixture, "@a/writer")!;
  // + 2 for the "\n\n" separator that inject/insertBefore writes after a block
  expect(out).toContain(`${span.start}-${span.end + 2}  ${span.end - span.start + 2} bytes`);
  expect(readFileSync(p, "utf8")).toBe(fixture); // dry run wrote nothing
});

test("rm-block --write removes the block and leaves the others intact", () => {
  const p = tmpFile(fixture);
  expect(capture(() => cmdRmBlock(p, "@a/writer", true, false))[0]).toBe(0);
  const after = readFileSync(p, "utf8");
  expect(blockSpans(after).map((s) => s.id)).toEqual(["bootconf.json", "@a/tail"]);
  expect(blockContent(after, "@a/tail")).toBe("const t = 1;");
});

test("rm-block refuses a duplicated id unless --all", () => {
  const dup = fixture + `\n<script id="@a/tail" type="text/plain" data-mime="application/javascript">\nconst t = 2;</script>\n`;
  const p = tmpFile(dup);
  const [code, out] = capture(() => cmdRmBlock(p, "@a/tail", true, false));
  expect(code).toBe(1);
  expect(out).toContain("occurs 2 times");
  expect(readFileSync(p, "utf8")).toBe(dup);
  expect(capture(() => cmdRmBlock(p, "@a/tail", true, true))[0]).toBe(0);
  expect(blockSpans(readFileSync(p, "utf8")).map((s) => s.id)).toEqual(["bootconf.json", "@a/writer"]);
});

// --------------------------------------------------------------------- stage

const repo = (html: string) => {
  const dir = mkdtempSync(join(tmpdir(), "nbstage-"));
  const p = join(dir, "n.html");
  writeFileSync(p, html);
  const git = (...a: string[]) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("add", "n.html");
  git("commit", "-qm", "base");
  return { dir, p, git };
};

test("stage commits only the module's block to the index", () => {
  const { p, git } = repo(fixture);
  writeFileSync(p, fixture.replace("const t = 1;", "const t = 42;"));
  const [code, out] = capture(() => cmdStage("@a/tail", p));
  expect(code).toBe(0);
  expect(out).toContain("Staged @a/tail");
  expect(git("diff", "--cached", "--name-only").trim()).toBe("n.html");
  expect(git("show", ":n.html")).toContain("const t = 42;");
  expect(git("status", "--porcelain").trim()).toBe("M  n.html"); // nothing left unstaged
});

test("stage refuses when bytes outside the block differ", () => {
  const { p, git } = repo(fixture);
  writeFileSync(p, fixture.replace("const t = 1;", "const t = 42;").replace("<html><body>", "<html><body><!-- x -->"));
  const [code, out] = capture(() => cmdStage("@a/tail", p));
  expect(code).toBe(1);
  expect(out).toContain("BEFORE the @a/tail block");
  expect(git("diff", "--cached", "--name-only").trim()).toBe(""); // index untouched
});

test("stage is a no-op when the block matches HEAD", () => {
  const { p, git } = repo(fixture);
  const [code, out] = capture(() => cmdStage("@a/tail", p));
  expect(code).toBe(0);
  expect(out).toContain("unchanged from HEAD");
  expect(git("diff", "--cached", "--name-only").trim()).toBe("");
});
