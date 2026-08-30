import { readFileSync, writeFileSync } from "fs";
const P = "modules/@tomlarkworthy/exporter-3.js";
let s = readFileSync(P, "utf8");
const sub = (a: string, b: string) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`${n} matches for: ${JSON.stringify(a.slice(0, 60))}`);
  s = s.replace(a, b);
};

// 1-4: every streamed block closes with a marker only the parser can write.
sub(">${ source }</scr\\ipt>`\n)};\nconst _19eucuj",
    ">${ source }</scr\\ipt><!--/-->`\n)};\nconst _19eucuj");
sub("${ source }\n</scr\\ipt>`\n)};\nconst _bwex58",
    "${ source }\n</scr\\ipt><!--/-->`\n)};\nconst _bwex58");
sub("${ data64 }\n</scr\\ipt>`;  // return `<script type=\"lope-file\"",
    "${ data64 }\n</scr\\ipt><!--/-->`;  // return `<script type=\"lope-file\"");
sub("}\n</scr` + `ipt>`;\n  // Prerender:",
    "}\n</scr` + `ipt><!--/-->`;\n  // Prerender:");

// 5: the reader.
sub(`  function __isComplete(el) { return !!el && (el.nextSibling != null || !window.__lopeStreaming); }`,
`  // A block that is still streaming is the last child of <body>, so anything boot appends there
  // becomes its nextSibling and a bare sibling test calls a half-written block complete (measured
  // 2026-08-13: a 36990 of 97815 char read of @tomlarkworthy/annotate, sibling div.lp2-menu, which
  // then failed to parse). Only the parser writes the end marker; appended nodes sit in between it
  // and the block, so scan forward. A block without a marker simply waits for end of stream.
  function __isComplete(el) {
    if (!el) return false;
    if (!window.__lopeStreaming) return true;
    for (var n = el.nextSibling; n; n = n.nextSibling)
      if (n.nodeType === 8 && n.data === "/") return true;
    return false;
  }`);

writeFileSync(P, s);
console.log("patched 5 sites");
