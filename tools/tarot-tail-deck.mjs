// Emit the card deck last.
//
// exporter-3 orders blocks smallest-first so each unblocks the parser sooner, but it puts
// bootconf-declared mains ahead of everything else regardless of size. tarot-deck has to be
// a main (nothing statically imports it, and an unimported module is pruned), and at 2.1 MB
// it is the largest block in the file — so it lands at 1.9 MB and pushes the entire editor
// stack behind it. lopepage-2 does not mount until the editor's last block arrives, so the
// deck delays the app even though the app never waits on the deck.
//
// Measured at 2 MB/s, moving the group to the tail:
//
//   lopepage-2 mounts   3342ms -> 2321ms
//   card faces          3344ms -> 3022ms   (the deck now arrives last, as it should)
//
// The attachments keep their document order ahead of their module: the generated loader
// calls contentSync synchronously inside define() and cannot wait for an unstreamed block.
//
// This is a post-processing step because the ordering rule lives in exporter-3, which
// writes every notebook in the corpus. A save-in-place from the browser undoes it.
import fs from 'fs';

const SRC = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const OUT = process.argv[3] || SRC;
let html = fs.readFileSync(SRC, 'utf8');

function blocks(h) {
  const out = [];
  let i = 0;
  for (;;) {
    const open = h.indexOf('<script', i);
    if (open < 0) return out;
    const gt = h.indexOf('>', open);
    const close = h.indexOf('</script>', gt);
    if (gt < 0 || close < 0) return out;
    const end = close + '</script>'.length;
    const id = /id="([^"]*)"/.exec(h.slice(open, gt + 1));
    out.push({ start: open, end, id: id ? id[1] : null });
    i = end;
  }
}

const DECK = '@tomlarkworthy/tarot-deck';
const isDeck = (b) => b.id === DECK || (b.id || '').startsWith(DECK + '/');
const group = blocks(html).filter(isDeck);
if (!group.length) throw new Error('no deck blocks');
// attachments must still precede their module, so keep document order within the group
const moved = group.map((b) => html.slice(b.start, b.end));
for (const b of [...group].sort((a, c) => c.start - a.start)) html = html.slice(0, b.start) + html.slice(b.end);

const sentinel = blocks(html).filter((b) => b.id === 'streaming_sentinel').pop();
if (!sentinel) throw new Error('no streaming_sentinel');
html = html.slice(0, sentinel.start) + moved.join('\n') + '\n' + html.slice(sentinel.start);

fs.writeFileSync(OUT, html);
const map = blocks(html);
const at = (id) => {
  const b = map.find((x) => x.id === id);
  return b ? (b.start / 1048576).toFixed(3) : '  ?  ';
};
console.log(`moved ${group.length} deck blocks to the tail -> ${OUT} (${(html.length / 1048576).toFixed(2)} MB)`);
for (const id of ['@tomlarkworthy/tarot', '@tomlarkworthy/editor-5', '@tomlarkworthy/codemirror-6-v2', DECK, 'streaming_sentinel'])
  console.log(`  ${at(id).padStart(7)} MB  ${id}`);
