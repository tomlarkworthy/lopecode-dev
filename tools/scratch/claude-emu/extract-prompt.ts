#!/usr/bin/env bun
// Build CLAUDE.md for the browser-native session out of EXISTING canonical content, by
// running the real cells (tip 17: import notebook code, never copy it):
//   @tomlarkworthy/robocoop-5-engine  cell `systemPrompt`  — the notebook/cell authoring prompt
//   @tomlarkworthy/markdown-wiki      cell `wiki_index`    — the knowledge-doc index prose
// Emits claude-md.json for build-notebook.mjs. Also returns the wiki doc block ids so the
// build can embed them, since wiki_index points at /content/<id> and a dangling index is
// worse than none.
import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { importNotebookModule } from "../../notebook-import.ts";

const HERE = import.meta.dir;
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks";
const RC5 = NB + "/@tomlarkworthy_robocoop-5.html";
const WIKI = NB + "/@tomlarkworthy_markdown-wiki.html";

const getModule = (nb: string, id: string, out: string) => {
  const src = execSync(`bun /Users/tom.larkworthy/dev/lopecode-dev/tools/lope-reader.ts ${nb} --get-module ${id}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(out, src);
  return out;
};

// ---- the authoring prompt, from the live cell ----
const enginePath = getModule(RC5, "@tomlarkworthy/robocoop-5-engine", HERE + "/.rc5-engine.js");
const engine = await importNotebookModule(enginePath);
const systemPrompt = String(await engine.value("systemPrompt"));
engine.dispose();

// ---- the wiki docs, straight out of the wiki notebook's blocks ----
const wikiHtml = readFileSync(WIKI, "utf8");
const docs: Record<string, string> = {};
const re = /<script\s+id="(@tomlarkworthy\/markdown-wiki\/[^"]+)"([^>]*)>([\s\S]*?)<\/script>/g;
for (let m; (m = re.exec(wikiHtml)); ) {
  const [, id, attrs, body] = m;
  if (/data-encoding="base64"/.test(attrs)) { docs[id] = Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8"); continue; }
  docs[id] = body;
}
const names = Object.keys(docs).map((id) => id.replace("@tomlarkworthy/markdown-wiki/", ""));

// ---- the index prose, from the real cell, fed the summaries it expects ----
const firstLine = (t: string) => (t.split("\n").find((l) => l.trim()) || "").replace(/^#+\s*/, "").trim();
const wikiPath = getModule(WIKI, "@tomlarkworthy/markdown-wiki", HERE + "/.wiki.js");
const wiki = await importNotebookModule(wikiPath, {
  overrides: {
    wiki_register: 0, // DOM side-effect cell; nothing to register headless
    wiki_summaries: names.map((name) => ({ name, summary: firstLine(docs["@tomlarkworthy/markdown-wiki/" + name]) })),
  },
});
const wikiIndex = String(await wiki.value("wiki_index"));
wiki.dispose();

writeFileSync(HERE + "/claude-md.json", JSON.stringify({ systemPrompt, wikiIndex, docs }, null, 0));
console.log("systemPrompt:", systemPrompt.length, "chars");
console.log("wikiIndex   :", wikiIndex.length, "chars,", names.length, "docs");
console.log("docs        :", (JSON.stringify(docs).length / 1024).toFixed(0), "KB");
console.log(wikiIndex.split("\n").slice(0, 3).join("\n"));
