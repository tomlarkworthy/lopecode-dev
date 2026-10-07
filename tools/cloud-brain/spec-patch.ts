/**
 * Splices spec-as-built.md into the @tomlarkworthy/cloud-brain-specs module of a notebook, as md cells after the cell `as_built`.
 *   bun tools/cloud-brain/spec-patch.ts <notebook.html> [...more]
 * The markdown is cut into cells at lines `<!-- cell: name -->`. Cells spliced by an earlier run are replaced.
 * Exported for build.ts, which runs it on the spec module at every build, after carryCells.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { findSpan } from "../lib/notebook-blocks.ts";

const HERE = import.meta.dir;
const OPEN = "// <as-built>", CLOSE = "// </as-built>";
const SPEC = "@tomlarkworthy/cloud-brain-specs";
const ANCHOR = /\n(\s*\$def\("[^"]+", "as_built",[^\n]*\n)/;

export function asBuiltCells(): { name: string; text: string }[] {
  // The short record for a reader outside the project. spec-as-built.md is the whole working record and is not shipped.
  const raw = readFileSync(resolve(HERE, "spec-as-built-short.md"), "utf8");
  return raw.split(/^<!-- cell: /m).slice(1).map((chunk) => {
    const end = chunk.indexOf(" -->");
    return { name: chunk.slice(0, end).trim(), text: chunk.slice(chunk.indexOf("\n", end) + 1).trim() };
  });
}

export function patchSpec(block: string): string {
  const strip = (s: string) => {
    for (let a = s.indexOf(OPEN); a >= 0; a = s.indexOf(OPEN)) s = s.slice(0, a) + s.slice(s.indexOf(CLOSE, a) + CLOSE.length + 1);
    return s;
  };
  let src = strip(block);
  const cells = asBuiltCells();
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const consts = cells.map((c, i) => `const _built_${i} = function _${c.name}(md){return(\nmd\`${esc(c.text)}\`\n)};`).join("\n");
  const defs = cells.map((c, i) => `  $def("_built_${i}", ${JSON.stringify(c.name)}, ["md"], _built_${i});`).join("\n");
  // The last one: the spec's prose quotes a module that has the same line.
  const at = src.lastIndexOf("\nexport default function define") + 1;
  if (at < 1 || !ANCHOR.test(src)) throw new Error("the spec module does not have the expected shape");
  src = src.slice(0, at) + `${OPEN}\n${consts}\n${CLOSE}\n` + src.slice(at);
  return src.replace(ANCHOR, (m) => `${m}${OPEN}\n${defs}\n${CLOSE}\n`);
}

/**
 * The cells a reviewer writes in the page (notes, the status) are not in the seed. They are taken from the module
 * of the previous build and added to the module compiled from the seed. `was` is a name the module had before.
 */
export function carryCells(src: string, from: string, opts: { name: string; was: string; keep: RegExp; drop?: RegExp; before: string }): string {
  const head = from.slice(0, from.lastIndexOf("\nexport default function define"));
  const defs = [...from.matchAll(/^\s*\$def\("([^"]+)", (?:null|"([^"]*)"), [^\n]*$/gm)].filter((m) => m[2] && opts.keep.test(m[2]) && !(opts.drop && opts.drop.test(m[2])));
  const consts: string[] = [], first: string[] = [], last: string[] = [];
  for (const [line, pid, name] of defs) {
    const at = head.indexOf(`\nconst ${pid} = `);
    if (at < 0) throw new Error(`the carried cell ${name} has no definition`);
    const ends = ["\nconst _", "\n// <"].map((e) => head.indexOf(e, at + 1)).filter((i) => i > 0);
    consts.push(head.slice(at + 1, ends.length ? Math.min(...ends) : head.length).trimEnd().replaceAll(opts.was, opts.name));
    (name.startsWith("annotation_") ? last : first).push("  " + line.trim());
  }
  const anchor = new RegExp(`\\n(\\s*\\$def\\("[^"]+", "${opts.before}",)`);
  const at = src.lastIndexOf("\nexport default function define") + 1;
  if (at < 1 || !anchor.test(src)) throw new Error("the spec module does not have the expected shape");
  src = src.slice(0, at) + consts.join("\n") + "\n" + src.slice(at);
  src = src.replace(anchor, (m) => "\n" + first.join("\n") + m);
  const end = src.lastIndexOf("\n  return main;");
  return src.slice(0, end) + "\n" + last.join("\n") + src.slice(end);
}

if (import.meta.main) {
  for (const file of process.argv.slice(2)) {
    const html = readFileSync(file, "utf8");
    const span = findSpan(html, SPEC);
    if (!span) throw new Error(`${file}: no ${SPEC} block`);
    writeFileSync(file, html.slice(0, span.start) + patchSpec(html.slice(span.start, span.end)) + html.slice(span.end));
    console.log(`${file}: ${asBuiltCells().length} as-built cells`);
  }
}
