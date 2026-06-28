// Re-apply robocoop-4 local-only customizations that a full re-export drops:
//   - ocean-floor theme (active embedded CSS blocks + boot adoptedStyleSheets loader)
//   - bootconf tick=messageChannel (runtime steps in background tabs)
// Does NOT touch the bootconf hash / mains (preserves the current R100 layout) and
// does NOT re-serialize modules. Surgical regex; throws if an anchor isn't unique.
// With the tick-aware exporter-3 now in the bundle, future re-exports should preserve
// these — this is the one-time restore after they were lost by re-export e0ef730.
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "lopebooks/notebooks/@tomlarkworthy_robocoop-4.html",
  "lopecode/notebooks/@tomlarkworthy_robocoop-4.html",
];

const BASE = "https://raw.githubusercontent.com/observablehq/notebook-kit/6c2ec69e1ac30dd329789524a849578b2df17945/src/styles/";

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

const reBlock = (file: string) =>
  new RegExp(`<script id="[^"]*${file.replace(/[.]/g, "\\.")}"[^>]*>[\\s\\S]*?</script>`);

function expectOnce(src: string, re: RegExp, label: string) {
  const all = src.match(new RegExp(re.source, "g"));
  if (!all || all.length !== 1) throw new Error(`${label}: expected 1 match, got ${all ? all.length : 0}`);
}

for (const f of FILES) {
  let s = readFileSync(f, "utf8");

  // 1) active embedded CSS blocks: parchment trio -> ocean-floor trio
  expectOnce(s, reBlock("theme-parchment.css"), `${f} theme block`);
  s = s.replace(reBlock("theme-parchment.css"), blkOcean);
  expectOnce(s, reBlock("abstract-light.css"), `${f} abstract block`);
  s = s.replace(reBlock("abstract-light.css"), blkAbstractDark);
  expectOnce(s, reBlock("syntax-light.css"), `${f} syntax block`);
  s = s.replace(reBlock("syntax-light.css"), blkSyntaxDark);

  // 2) boot loader adoptedStyleSheets imports
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

  // 3) bootconf tick=messageChannel (insert after the headless field; preserves hash/mains)
  if (!/"tick":\s*"messageChannel"/.test(s)) {
    const anchor = `"headless": true`;
    if (s.split(anchor).length - 1 !== 1) throw new Error(`${f}: headless anchor not unique`);
    s = s.replace(anchor, `"headless": true,\n    "tick": "messageChannel"`);
  }

  writeFileSync(f, s);
  console.log(`restored ${f}`);
}
console.log("done");
