const p0 = function _anonymous(md) {return (md`# Getting Claude Code like performance in a custom harness`);};
const p1 = function _anonymous(md,externalLink) {return (md`I have been researching and developing a custom coding harness since before Claude Code existed (${ externalLink('Hacker News, Nov 2023', 'https://news.ycombinator.com/item?id=38183641') }). I thought it would be cool if coding assistants lived inside notebooks. I still think that is cool, but I observed that even though I kept upgrading the LLM and harness (robocoop-2, robocoop-3), my Notebook helper never got as good at coding as Claude Code on traditional codebases. This left the question of why? Was it the task? Was it the prompt? Was it the harness? I found that minor details in how the LLM is interfaced to the coding task have massive effects on performance.`);};
const p2 = function _anonymous(md) {return (md`A big clue came in Feb when I threw in the towel and wired Claude Code directly up to the Notebook environment. It did not work that well when I gave it tools to call to edit the notebook. It was only after I serialized notebooks as vanilla JavaScript files on a local filesystem that it suddenly became amazing at notebook development and my productivity skyrocketed. This showed that the same foundational model, in the same programming domain, but with a different harness had radically different productivity. There was something wrong with how the LLM used the tools. Exactly what was wrong is the topic of this report.`);};
const p3 = function _anonymous(htl) {
    const arms = [
        {
            label: 'Structured',
            sub: 'off-distribution',
            mimo: 24,
            sonnet: 22.7
        },
        {
            label: 'Bash',
            sub: 'sed / heredoc',
            mimo: 22.7,
            sonnet: 16.3
        },
        {
            label: 'Broken',
            sub: 'Std Tools, reformat',
            mimo: 19.3,
            sonnet: 18
        },
        {
            label: 'Aligned',
            sub: 'Std Tools + /src',
            mimo: 10.3,
            sonnet: 8
        }
    ];
    const W = 700, H = 400, m = {
            t: 56,
            r: 16,
            b: 72,
            l: 44
        };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxV = 26;
    const y = v => (1 - v / maxV) * ih;
    const groupW = iw / arms.length;
    const barW = groupW * 0.3;
    const C = {
        mimo: '#6f9ed6',
        sonnet: '#f58518'
    };
    const ticks = [
        0,
        5,
        10,
        15,
        20,
        25
    ];
    const grid = ticks.map(t => htl.svg`<g transform="translate(0,${ y(t) })">
    <line x1="0" x2="${ iw }" stroke="currentColor" stroke-opacity="0.13"/>
    <text x="-8" dy="0.32em" text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.55">${ t }</text></g>`);
    const groups = arms.map((d, i) => {
        const cx = i * groupW + groupW / 2;
        return htl.svg`<g>
      <rect x="${ cx - barW - 3 }" y="${ y(d.mimo) }" width="${ barW }" height="${ ih - y(d.mimo) }" fill="${ C.mimo }" rx="2"/>
      <rect x="${ cx + 3 }" y="${ y(d.sonnet) }" width="${ barW }" height="${ ih - y(d.sonnet) }" fill="${ C.sonnet }" rx="2"/>
      <text x="${ cx - barW / 2 - 3 }" y="${ y(d.mimo) - 6 }" text-anchor="middle" font-size="12" fill="${ C.mimo }" font-weight="700">${ d.mimo }</text>
      <text x="${ cx + barW / 2 + 3 }" y="${ y(d.sonnet) - 6 }" text-anchor="middle" font-size="12" fill="${ C.sonnet }" font-weight="700">${ d.sonnet }</text>
      <text x="${ cx }" y="${ ih + 20 }" text-anchor="middle" font-size="13" fill="currentColor" font-weight="600">${ d.label }</text>
      <text x="${ cx }" y="${ ih + 36 }" text-anchor="middle" font-size="10.5" fill="currentColor" fill-opacity="0.6">${ d.sub }</text>
    </g>`;
    });
    return htl.svg`<svg viewBox="0 0 ${ W } ${ H }" style="max-width:${ W }px;width:100%;height:auto;color:inherit;font-family:system-ui,-apple-system,sans-serif">
    <text x="${ W / 2 }" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">Mean steps to complete the task</text>
    <text x="${ W / 2 }" y="40" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity="0.6">lower is more efficient · 4 editing surfaces × 2 models · N=3 each</text>
    <g transform="translate(${ m.l },${ m.t })">
      ${ grid }
      ${ groups }
      <line x1="0" x2="0" y1="0" y2="${ ih }" stroke="currentColor" stroke-opacity="0.35"/>
      <line x1="0" x2="${ iw }" y1="${ ih }" y2="${ ih }" stroke="currentColor" stroke-opacity="0.35"/>
    </g>
    <g transform="translate(${ m.l + iw / 2 - 115 },${ H - 14 })" font-size="12.5" fill="currentColor">
      <rect x="0" y="-11" width="13" height="13" fill="${ C.mimo }" rx="2"/><text x="19" y="0">mimo-v2.5-pro</text>
      <rect x="120" y="-11" width="13" height="13" fill="${ C.sonnet }" rx="2"/><text x="139" y="0">claude-sonnet-4.6</text>
    </g>
  </svg>`;
};
const p4 = function _anonymous(md) {return (md`# Necessary but not sufficient: Bash`);};
const _blogTerminal = function _blogTerminal(htl,terminal,rc4_agentShell) {
    const root = htl.html`<div style="border:1px solid #30363d;border-radius:8px;height:35vh;min-height:240px;overflow:hidden;margin:8px 0"></div>`;
    root.append(terminal(rc4_agentShell, { title: 'the agent\'s shared shell — try a command' }));
    return root;
};
const p5 = function _anonymous(md,externalLink) {return (md`My initial thought was it was the filesystem. I should pose the problem as editing JavaScript files, and let it use familiar Linux tools through Bash. Vercel has the amazing ${ externalLink('just-bash', 'https://github.com/vercel-labs/just-bash') } AI project so I assume they think the same thing.

Agents only "see" the environment through their tools. Claude Code accesses the filesystem through bash. Because every frontier model trains on ${ externalLink('Terminal Bench 2.0', 'https://github.com/laude-institute/terminal-bench') }, a Linux system environment, it seemed likely that they are well trained on bash, so maybe if my coding agent did notebook programming through bash, like Claude Code, it would be more performant.`);};
const p6 = function _anonymous(md) {return (md`I observed agents can use bash tools like sed/awk/jq from pretrained knowledge. They really know bash. However, overall performance improved perhaps only by 10 or 15%, not as big as I had hoped.`);};
const p7 = function _anonymous(md) {return (md`Taking a closer look at the traces, agents have to edit files with sed or heredoc, and they often trip up over escaping. Claude does not code like this! Claude Code sometimes uses grep to search, but actual file edits are not done through bash but through a specialized tool.`);};
const p8 = function _blog8(md){return(
md`# Read/Write/Edit tool`
)};
const p9 = function _anonymous(md) {return (md`The missing piece was Claude Code's primary file editing tools (Read/Write/Edit). These use plain strings to manipulate files on the filesystem. In my initial implementation, file edits would instantly update the Notebook and apply a needed code transformation. I found the bot would abandon delta edits if the file changed underfoot and would switch to whole-file replacement instead. It wasn't until I adjusted where the code transformation occurs that I saw *another* leap in performance. So to get full Read/Write/Edit delta editing performance the targeted files must preserve byte consistency across edits.`);};
const p10 = function _anonymous(md) {return (md`The final \`robocoop-4\` architecture is a virtual filesystem containing a \`/src\` of JavaScript ESM modules that define notebooks. On an edit, the src is compiled into a notebook that is delta patched into the running notebook. It's an extremely convoluted architecture compared to a custom tool that edits cells live, but the results speak for themselves. These results carry across to non-Anthropic models.`);};
const p11 = function _blog11(md){return(
md`| arm | distribution / contract | mimo | sonnet-4.6 |
|-----|-------------------------|-----:|-----------:|
| **Structured** | off-distribution semantic API (\`define_variable\` & friends) | **24.0** | **22.7** |
| **Bash** | on-distribution shell (sed/heredoc) | 22.7 | 16.3 |
| **Std Tools (broken contract)** | Read/Write/Edit, file reformatted between read+edit | 19.3 | 18.0 |
| **Std Tools (aligned)** | Read/Write/Edit + byte-stable \`/src\` | **10.3** | **8.0** |`
)};
const p12 = function _anonymous(md) {return (md`Results come from the "long-edit" questions in the eval, which evaluate asking for a toy application and then asking for modifications. Each number is the mean steps over 3 runs.`);};
const p13 = function _anonymous(md) {return (md`# Details Matter`);};
const _blogRobocoop = function _blogRobocoop(htl,robocoop_4) {
    const root = htl.html`<div style="border:1px solid #30363d;border-radius:8px;height:70vh;min-height:400px;overflow:hidden;margin:8px 0"></div>`;
    root.append(robocoop_4);
    return root;
};
const p14 = function _anonymous(md,aside) {return (md`This blog post is in the notebook environment and \`robocoop-4\` is implemented in userspace. You can execute commands in its shared shell using the terminal above, and with an OpenRouter key robocoop can edit *this* blog post live. Live modifications can be serialized back to a single file you can download with ${ aside('exporter-3') }. The included ${ aside('butter-synth') } notebook was one of the first notebooks I vibed with the new robocoop-4 using MiMo v2.5-pro, and I have included it in the bundle so you can enjoy its cool sounds.`);};
const _aside = function _aside(htl) {return (module_name => htl.html`<a href="#view=R100(S50(@tomlarkworthy/why-claude-code-codes-well),S50(@tomlarkworthy/${ module_name.toLowerCase() }))">${ module_name }</a>`);};
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
  $def("p2", null, ["md"], p2);
  $def("p3", null, ["htl"], p3);
  $def("p4", null, ["md"], p4);
  $def("_stc549", "blogTerminal", ["htl","terminal","rc4_agentShell"], _blogTerminal);
  $def("p5", null, ["md","externalLink"], p5);
  $def("p6", null, ["md"], p6);
  $def("p7", null, ["md"], p7);
  $def("p8", null, ["md"], p8);
  $def("p9", null, ["md"], p9);
  $def("p10", null, ["md"], p10);
  $def("p11", null, ["md"], p11);
  $def("p12", null, ["md"], p12);
  $def("p13", null, ["md"], p13);
  $def("_h30zu7", "blogRobocoop", ["htl","robocoop_4"], _blogRobocoop);
  $def("p14", null, ["md","aside"], p14);
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("module @tomlarkworthy/robocoop-4-bash-terminal", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-terminal.js?v=4")).default));
  main.define("terminal", ["module @tomlarkworthy/robocoop-4-bash-terminal", "@variable"], (_, v) => v.import("terminal", _));
  main.define("module @tomlarkworthy/robocoop-4-engine", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-engine.js?v=4")).default));
  main.define("rc4_agentShell", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("rc4_agentShell", _));
  main.define("module @tomlarkworthy/robocoop-4", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4.js?v=4")).default));
  main.define("robocoop_4", ["module @tomlarkworthy/robocoop-4", "@variable"], (_, v) => v.import("robocoop_4", _));
  $def("_nmxixw", "aside", ["htl"], _aside);
  $def("_9yd8ub", "external_link_svg", ["htl"], _external_link_svg);
  $def("_mhp8n4", "externalLink", ["external_link_svg","htl"], _externalLink);
  return main;
}
