// One-shot: switch robocoop-4 default theme parchment -> ocean-floor + set default layout.
// Surgical (regex on the active theme blocks + boot loader + bootconf); does NOT re-serialize modules.
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "lopebooks/notebooks/@tomlarkworthy_robocoop-4.html",
  "lopecode/notebooks/@tomlarkworthy_robocoop-4.html",
];

const BASE = "https://raw.githubusercontent.com/observablehq/notebook-kit/6c2ec69e1ac30dd329789524a849578b2df17945/src/styles/";

// New embedded CSS blocks (ocean-floor), byte-for-byte as the exporter would emit them.
const blkOcean =
`<script id="${BASE}theme-ocean-floor.css"
  type="text/plain"
  data-mime="text/css"
>@import url("./abstract-dark.css");

:root {
  --theme-foreground: #dcdcee;
  --theme-foreground-focus: #81a9f6;
  --theme-background-b: #0b0b16;
}
</script>`;
const blkAbstractDark =
`<script id="${BASE}abstract-dark.css"
  type="text/plain"
  data-mime="text/css"
>@import url("./syntax-dark.css");

:root {
  --theme-background-a: color-mix(in srgb, var(--theme-foreground) 4%, var(--theme-background-b));
  --theme-background: var(--theme-background-a);
  --theme-background-alt: var(--theme-background-b);
  --theme-foreground-alt: color-mix(in srgb, var(--theme-foreground) 90%, var(--theme-background-b));
  --theme-foreground-muted: color-mix(in srgb, var(--theme-foreground) 60%, var(--theme-background-b));
  --theme-foreground-faint: color-mix(in srgb, var(--theme-foreground) 50%, var(--theme-background-b));
  --theme-foreground-fainter: color-mix(in srgb, var(--theme-foreground) 30%, var(--theme-background-b));
  --theme-foreground-faintest: color-mix(in srgb, var(--theme-foreground) 14%, var(--theme-background-b));
  --theme-error: #e7040f;
  color-scheme: dark;
}
</script>`;
const blkSyntaxDark =
`<script id="${BASE}syntax-dark.css"
  type="text/plain"
  data-mime="text/css"
>:root {
  --syntax-link: var(--theme-foreground-focus);
  --syntax-keyword: #ffa657;
  --syntax-atom: #a5d6ff;
  --syntax-literal: #d2a8ff;
  --syntax-string: #7ee787;
  --syntax-comment: var(--theme-foreground-muted);
  --syntax-invalid: var(--theme-error);
  --syntax-definition: #79c0ff;
  --syntax-variable: var(--theme-foreground-alt);
  --syntax-meta: #ff7b72;
}
</script>`;

const NEW_HASH = "#view=C100(S50(@tomlarkworthy/robocoop-4,@tomlarkworthy/exporter-3))";

const reBlock = (file: string) =>
  new RegExp(`<script id="[^"]*${file.replace(/[.]/g, "\\.")}"[^>]*>[\\s\\S]*?</script>`);

function once(src: string, re: RegExp, label: string): RegExpMatchArray {
  const all = src.match(new RegExp(re.source, "g"));
  if (!all || all.length !== 1) throw new Error(`${label}: expected 1 match, got ${all ? all.length : 0}`);
  return src.match(re)!;
}

for (const f of FILES) {
  let s = readFileSync(f, "utf8");

  // 1) active embedded CSS blocks: parchment trio -> ocean-floor trio
  once(s, reBlock("theme-parchment.css"), `${f} theme block`);
  s = s.replace(reBlock("theme-parchment.css"), blkOcean);
  once(s, reBlock("abstract-light.css"), `${f} abstract block`);
  s = s.replace(reBlock("abstract-light.css"), blkAbstractDark);
  once(s, reBlock("syntax-light.css"), `${f} syntax block`);
  s = s.replace(reBlock("syntax-light.css"), blkSyntaxDark);

  // 2) boot loader adoptedStyleSheets imports (unique `", { with: { type: 'css' } }` suffix)
  const suffix = `", { with: { type: 'css' } }`;
  for (const [from, to] of [
    ["theme-parchment.css", "theme-ocean-floor.css"],
    ["abstract-light.css", "abstract-dark.css"],
    ["syntax-light.css", "syntax-dark.css"],
  ]) {
    const a = BASE + from + suffix, b = BASE + to + suffix;
    if (s.split(a).length - 1 !== 1) throw new Error(`${f} boot loader ${from}: not exactly 1`);
    s = s.replace(a, b);
  }

  // 3) bootconf default hash (anchor on #view= so we never match a non-view "hash":)
  const hashRe = /("hash":\s*")#view=[^"]*(")/;
  once(s, hashRe, `${f} bootconf hash`);
  s = s.replace(hashRe, `$1${NEW_HASH}$2`);

  // 4) ensure exporter-3 is a main (so the pane mounts). Guard on the 4-space mains-indent form
  // so we don't false-match the `"module @tomlarkworthy/exporter-3"` import.
  const mainLine = `    "@tomlarkworthy/exporter-3",`;
  if (!s.includes(mainLine)) {
    const mainsAnchor = `    "@tomlarkworthy/robocoop-4-hostbridge",`;
    if (s.split(mainsAnchor).length - 1 !== 1) throw new Error(`${f}: mains anchor not unique`);
    s = s.replace(mainsAnchor, mainsAnchor + `\n` + mainLine);
  }

  writeFileSync(f, s);
  console.log(`updated ${f}`);
}
console.log("done");
