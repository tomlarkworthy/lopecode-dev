const p0 = function _anonymous(md) {return (md`# How I code: The Claude Code Virtual Monorepo Pattern`);};
const p1 = function _anonymous(md,externalLink) {return (md`I work across a dozen repositories at once: my own projects, and the upstream libraries I depend on and occasionally patch. A coding agent is only as good as what it can see, and it sees the world as a filesystem. So I assemble every repository I care about into one tree, at ${ externalLink('tomlarkworthy/lopecode-dev', 'https://github.com/tomlarkworthy/lopecode-dev') }, and run a single Claude Code session at the root. Three layers of plain git make this work.`);};
const _diagram = function _diagram(htl) {
    const W = 720, H = 300;
    const box = (x, y, w, h, fill, stroke) => htl.svg`<rect x="${ x }" y="${ y }" width="${ w }" height="${ h }" rx="7" fill="${ fill }" stroke="${ stroke }" stroke-width="1.2"/>`;
    const label = (x, y, t, weight = 600, size = 13, op = 1) => htl.svg`<text x="${ x }" y="${ y }" text-anchor="middle" font-size="${ size }" font-weight="${ weight }" fill="currentColor" fill-opacity="${ op }">${ t }</text>`;
    const C = { root: '#6f9ed6', mine: '#7fbf7f', vendor: '#c9a86a', tree: '#b57fc9' };
    return htl.svg`<svg viewBox="0 0 ${ W } ${ H }" style="max-width:${ W }px;width:100%;height:auto;color:inherit;font-family:system-ui,-apple-system,sans-serif">
    ${ box(W / 2 - 130, 12, 260, 40, C.root + '22', C.root) }
    ${ label(W / 2, 30, 'lopecode-dev  (agentic root)', 700, 14) }
    ${ label(W / 2, 46, 'one Claude Code session, greps across everything', 400, 10.5, 0.65) }
    <line x1="${ W / 2 }" x2="${ W / 2 }" y1="52" y2="78" stroke="currentColor" stroke-opacity="0.35"/>
    ${ label(W / 2, 96, 'git submodules pin every dependency', 600, 12, 0.85) }
    ${ box(40, 116, 300, 62, C.mine + '22', C.mine) }
    ${ label(190, 136, 'my repos', 700, 12) }
    ${ label(190, 154, 'lopecode · lopebooks · lopecode.com', 400, 10.5, 0.7) }
    ${ label(190, 169, 'lopecode-videos', 400, 10.5, 0.7) }
    ${ box(380, 116, 300, 62, C.vendor + '22', C.vendor) }
    ${ label(530, 136, 'vendor/  (upstream sources)', 700, 12) }
    ${ label(530, 154, 'observable-runtime · notebook-kit', 400, 10.5, 0.7) }
    ${ label(530, 169, 'golden-layout · paseo · mempalace', 400, 10.5, 0.7) }
    <line x1="190" x2="190" y1="178" y2="212" stroke="currentColor" stroke-opacity="0.35"/>
    <line x1="530" x2="530" y1="178" y2="212" stroke="currentColor" stroke-opacity="0.35"/>
    ${ box(40, 214, 640, 62, C.tree + '18', C.tree) }
    ${ label(360, 234, 'git worktrees branch off any submodule', 700, 12) }
    ${ label(360, 252, 'isolated feature branches, prepared as clean reviewable commits', 400, 10.5, 0.7) }
    ${ label(360, 267, 'worktrees/atproto-7a · .claude/worktrees/lopepage-2', 400, 10, 0.6) }
  </svg>`;
};
const p2 = function _anonymous(md) {return (md`## 1. Submodules assemble the monorepo`);};
const p3 = function _anonymous(md,externalLink) {return (md`The root repo owns almost no code. It is a manifest: ${ externalLink('.gitmodules', 'https://github.com/tomlarkworthy/lopecode-dev/blob/main/.gitmodules') } pins every repository I develop against at an exact commit. My own projects sit at the top level; everything I depend on but did not write lives under \`vendor/\`. Cloning the root with \`--recurse-submodules\` reconstructs the entire working set as one flat, greppable tree. The agent reads a bug in \`vendor/notebook-kit\` and its consumer in \`lopecode\` in the same breath.`);};
const p4 = function _anonymous(md) {return (md`## 2. Worktrees prepare the commits`);};
const p5 = function _anonymous(md,externalLink) {return (md`A submodule checked out at the root is a shared surface, so I never prepare a commit there directly. Each unit of work gets its own ${ externalLink('git worktree', 'https://git-scm.com/docs/git-worktree') } off the relevant submodule, on its own branch. The agent builds, tests, and stages the change in isolation, then hands back a single clean diff to review. Half-finished refactors never collide, and a branch that goes nowhere is one \`worktree remove\` away from gone.`);};
const p6 = function _anonymous(md) {return (md`## 3. One agentic root`);};
const p7 = function _anonymous(md,externalLink) {return (md`Claude Code runs once, at the root, and treats the whole graph as ordinary files: grep across repos, read any upstream, edit any layer. A ${ externalLink('CLAUDE.md', 'https://github.com/tomlarkworthy/lopecode-dev/blob/main/CLAUDE.md') } at the root orients it — what the repos are, which tools to reach for, where the source of truth lives. No cross-repo API, no context juggling: the pattern scales the same way to upstream dependencies as it does to my own code.`);};
const p8 = function _anonymous(md) {return (md`## The post is the pattern`);};
const p9 = function _anonymous(md,externalLink) {return (md`This page is a single self-contained ${ externalLink('lopecode', 'https://github.com/tomlarkworthy/lopecode') } notebook living in \`lopebooks/\`, one of the submodules above. It is editable in place — press SHIFT + ENTER on any paragraph — and it publishes itself to atproto. The repo that documents the pattern is a node inside the pattern it documents.`);};
const _external_link_svg = function _external_link_svg(htl) {return (htl.svg`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="0.9em"
  height="0.9em"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
  <path d="M11 13l9 -9" />
  <path d="M15 4h5v5" />
</svg>`);};
const _externalLink = function _externalLink(external_link_svg,htl) {return ((label, href, {
    title = 'Opens in a new tab'
} = {}) => {
    const icon = external_link_svg.cloneNode(true);
    icon.setAttribute('aria-hidden', 'true');
    return htl.html`<a
    href=${ href }
    target="_blank"
    rel="noopener noreferrer"
    title=${ title }
  >${ label }${ icon }</a>`;
});};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  $def("p0", "p0", ["md"], p0);
  $def("p1", null, ["md","externalLink"], p1);
  $def("_diagram", "diagram", ["htl"], _diagram);
  $def("p2", null, ["md"], p2);
  $def("p3", null, ["md","externalLink"], p3);
  $def("p4", null, ["md"], p4);
  $def("p5", null, ["md","externalLink"], p5);
  $def("p6", null, ["md"], p6);
  $def("p7", null, ["md","externalLink"], p7);
  $def("p8", null, ["md"], p8);
  $def("p9", null, ["md","externalLink"], p9);
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  $def("_9yd8ub", "external_link_svg", ["htl"], _external_link_svg);
  $def("_mhp8n4", "externalLink", ["external_link_svg","htl"], _externalLink);
  return main;
}
