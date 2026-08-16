// Post-export step: move @tomlarkworthy/tarot-deck's code block ahead of its 78 card scans.
//
// The deck is 1.56 MB of scans and 3 KB of code. exporter-3 emits a module's attachments
// first, because generate_define's prologue calls window.lopecode.contentSync while define()
// runs and contentSync cannot see a block the parser has not reached. That ordering is right
// for a module that reads FileAttachment. The deck does not — its cells fetch their own bytes
// with window.lopecode.dvfBytes, which awaits the block — so for this one module the prologue
// is dead code that costs a second: @tomlarkworthy/tarot imports the deck, module-map forces
// every `module X` variable at boot, and with the code block last the mount waits for the
// final byte of the file.
//
// So: verify nothing in the deck reads FileAttachment, drop the dead prologue, and put the
// code block first. Local, this file only — exporter-3 is untouched. Re-run by tarot-build.sh
// on every build; a save-in-place from the browser undoes it until the next build.
//
//   node tools/tarot-hoist-deck.mjs [notebook.html]
import fs from 'fs';

const NOTEBOOK = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const MODULE = '@tomlarkworthy/tarot-deck';

let html = fs.readFileSync(NOTEBOOK, 'utf8');

// --- block boundaries ---------------------------------------------------
// A linear walk, not a regex: exporter-3 carries a *template* of some blocks inside its own
// source, so an indexOf on the opening tag can land inside a payload. Every real block ends
// at a literal </script>, and a payload that contains one has it escaped as </scr\ipt>.
const blocks = [];
for (let i = html.indexOf('<script'); i >= 0; i = html.indexOf('<script', i)) {
  const open = html.indexOf('>', i);
  const close = html.indexOf('</script>', open);
  if (open < 0 || close < 0) throw new Error(`unterminated <script> at byte ${i}`);
  const id = /\bid="([^"]*)"/.exec(html.slice(i, open))?.[1] ?? null;
  let end = close + '</script>'.length;
  // The trailing <!--/--> is the end-of-block marker: __isComplete scans forward from the
  // <script> for it, so a block that loses its own marker is called complete as soon as the
  // *next* block's marker lands. It travels with the block.
  if (html.startsWith('<!--/-->', end)) end += '<!--/-->'.length;
  blocks.push({ id, start: i, end });
  i = close;
}

const code = blocks.filter((b) => b.id === MODULE);
if (code.length !== 1) throw new Error(`expected 1 ${MODULE} block, found ${code.length}`);
const files = blocks.filter((b) => b.id?.startsWith(MODULE + '/'));
if (!files.length) throw new Error(`no attachment blocks for ${MODULE}`);

const first = files[0];
if (first.start > code[0].start) {
  console.log(`already hoisted (${MODULE} code at byte ${code[0].start}, first scan at ${first.start})`);
  process.exit(0);
}

// --- drop the dead FileAttachment prologue ------------------------------
let source = html.slice(code[0].start, code[0].end);
const prologue = new RegExp(
  `\\n?  const fileAttachments = new Map\\(\\[[^\\]]*\\]\\.map\\(\\(name\\) => \\{\\n` +
  `    const module_name = "${MODULE}";\\n` +
  `[\\s\\S]*?\\n  \\}\\)\\);\\n` +
  `  main\\.builtin\\("FileAttachment", runtime\\.fileAttachments\\(name => fileAttachments\\.get\\(name\\)\\)\\);\\n`
);
if (!prologue.test(source)) throw new Error(`${MODULE}: FileAttachment prologue not found — has exporter-3 changed?`);
source = source.replace(prologue, '\n');
// The whole point of moving the block: nothing left in it may read an attachment at define
// time. There are two synchronous routes. FileAttachment is one, and a cell that uses it
// names it in its dependency array. contentSync is the other; the deck deliberately uses
// dvfBytes, which awaits the block. Both patterns are matched as calls, not as words — the
// module's own prose explains why it is arranged this way and says both names.
for (const [banned, pattern] of [
  ['FileAttachment', /\[[^\]]*"FileAttachment"/],
  ['contentSync', /lopecode\.contentSync\s*\(/]
]) if (pattern.test(source)) throw new Error(`${MODULE} still calls ${banned} — not safe to hoist`);

// --- move the code block ahead of the scans -----------------------------
const before = html.slice(0, first.start);
const between = html.slice(first.start, code[0].start);   // the 78 scan blocks
const after = html.slice(code[0].end);                    // trailing newline stays put
html = before + source + '\n' + between.replace(/\n+$/, '\n') + after;

fs.writeFileSync(NOTEBOOK, html);

const moved = html.indexOf(`<script id="${MODULE}"`);
console.log(`hoisted ${MODULE}: code block ${(code[0].start / 1048576).toFixed(2)} MB -> ` +
  `${(moved / 1048576).toFixed(2)} MB, ${files.length} scans follow it`);
