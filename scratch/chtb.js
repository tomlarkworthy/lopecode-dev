const p0 = function _anonymous(md) {return (md`# Getting Claude Code like performance in a custom harness`);};
const p1 = function _anonymous(md,externalLink) {return (md`I have been researching and developing custom coding harnesses before Claude Code existed (${ externalLink('Hackernews, Nov 2023', 'https://news.ycombinator.com/item?id=38183641') }). I thought it would be cool if coding assistants lived inside notebooks. I still think that is cool, but I observed that even though I kept upgrading the LLM and harness \\[${ externalLink('roboco-op 2', 'https://observablehq.com/@tomlarkworthy/robocoop-2') }, ${ externalLink('roboco-op 3', 'https://observablehq.com/@tomlarkworthy/robocoop-3') }), my Notebook helpers just never got as good as Claude Code. This left the question of why? Was it the task, is notebook programming too off distribution? Was it the prompt, do I need to explain the task better? Or was it the harness? I have recently found that minor details in how the LLM is interfaced causes massive effects on performance.`);};
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
const p2 = function _anonymous(md,aside) {return (md`## The Discovery

A big clue came in Feb when I threw in the towel and wired Claude Code directly up to the Notebook environment\\[${ aside('claude-code-pairing') }\\]. It did not work that well when I gave it tools to call to edit the notebook. It was only after I serialized notebooks as vanilla JavaScript files on a local filesystem \\[${ aside('file-sync') }\\] that it suddenly became amazing at notebook development. My productivity skyrocketed.`);};
const _kc9m7aa = function _commit_velocity_plot(Plot) {
    const commit_velocity_data = [
        {
            repo: 'lopebooks',
            week: '2025-12-01',
            commits: 10
        },
        {
            repo: 'lopebooks',
            week: '2025-12-08',
            commits: 2
        },
        {
            repo: 'lopebooks',
            week: '2025-12-15',
            commits: 2
        },
        {
            repo: 'lopebooks',
            week: '2025-12-22',
            commits: 12
        },
        {
            repo: 'lopebooks',
            week: '2026-01-05',
            commits: 2
        },
        {
            repo: 'lopebooks',
            week: '2026-01-12',
            commits: 2
        },
        {
            repo: 'lopebooks',
            week: '2026-01-19',
            commits: 8
        },
        {
            repo: 'lopebooks',
            week: '2026-01-26',
            commits: 8
        },
        {
            repo: 'lopebooks',
            week: '2026-02-16',
            commits: 2
        },
        {
            repo: 'lopebooks',
            week: '2026-03-16',
            commits: 32
        },
        {
            repo: 'lopebooks',
            week: '2026-03-23',
            commits: 31
        },
        {
            repo: 'lopebooks',
            week: '2026-03-30',
            commits: 27
        },
        {
            repo: 'lopebooks',
            week: '2026-04-06',
            commits: 34
        },
        {
            repo: 'lopebooks',
            week: '2026-04-13',
            commits: 23
        },
        {
            repo: 'lopebooks',
            week: '2026-04-20',
            commits: 27
        },
        {
            repo: 'lopebooks',
            week: '2026-04-27',
            commits: 17
        },
        {
            repo: 'lopebooks',
            week: '2026-05-04',
            commits: 5
        },
        {
            repo: 'lopebooks',
            week: '2026-05-11',
            commits: 20
        },
        {
            repo: 'lopecode',
            week: '2025-11-24',
            commits: 4
        },
        {
            repo: 'lopecode',
            week: '2025-12-01',
            commits: 2
        },
        {
            repo: 'lopecode',
            week: '2025-12-15',
            commits: 2
        },
        {
            repo: 'lopecode',
            week: '2025-12-22',
            commits: 8
        },
        {
            repo: 'lopecode',
            week: '2026-01-05',
            commits: 1
        },
        {
            repo: 'lopecode',
            week: '2026-01-12',
            commits: 15
        },
        {
            repo: 'lopecode',
            week: '2026-01-19',
            commits: 7
        },
        {
            repo: 'lopecode',
            week: '2026-01-26',
            commits: 6
        },
        {
            repo: 'lopecode',
            week: '2026-02-02',
            commits: 2
        },
        {
            repo: 'lopecode',
            week: '2026-02-16',
            commits: 41
        },
        {
            repo: 'lopecode',
            week: '2026-02-23',
            commits: 2
        },
        {
            repo: 'lopecode',
            week: '2026-03-02',
            commits: 8
        },
        {
            repo: 'lopecode',
            week: '2026-03-16',
            commits: 29
        },
        {
            repo: 'lopecode',
            week: '2026-03-23',
            commits: 7
        },
        {
            repo: 'lopecode',
            week: '2026-03-30',
            commits: 17
        },
        {
            repo: 'lopecode',
            week: '2026-04-06',
            commits: 9
        },
        {
            repo: 'lopecode',
            week: '2026-04-13',
            commits: 1
        },
        {
            repo: 'lopecode',
            week: '2026-04-20',
            commits: 15
        },
        {
            repo: 'lopecode',
            week: '2026-04-27',
            commits: 57
        },
        {
            repo: 'lopecode',
            week: '2026-05-04',
            commits: 43
        },
        {
            repo: 'lopecode',
            week: '2026-05-11',
            commits: 60
        },
        {
            repo: 'lopecode-dev',
            week: '2026-01-19',
            commits: 49
        },
        {
            repo: 'lopecode-dev',
            week: '2026-02-23',
            commits: 1
        },
        {
            repo: 'lopecode-dev',
            week: '2026-03-09',
            commits: 7
        },
        {
            repo: 'lopecode-dev',
            week: '2026-03-16',
            commits: 47
        },
        {
            repo: 'lopecode-dev',
            week: '2026-03-23',
            commits: 46
        },
        {
            repo: 'lopecode-dev',
            week: '2026-03-30',
            commits: 29
        },
        {
            repo: 'lopecode-dev',
            week: '2026-04-06',
            commits: 35
        },
        {
            repo: 'lopecode-dev',
            week: '2026-04-13',
            commits: 15
        },
        {
            repo: 'lopecode-dev',
            week: '2026-04-20',
            commits: 36
        },
        {
            repo: 'lopecode-dev',
            week: '2026-04-27',
            commits: 77
        },
        {
            repo: 'lopecode-dev',
            week: '2026-05-04',
            commits: 51
        },
        {
            repo: 'lopecode-dev',
            week: '2026-05-11',
            commits: 59
        }
    ].map(d => ({
        ...d,
        week: new Date(d.week)
    }));
    return Plot.plot({
        title: 'Commits per week (2025-11-17 \u2192 2026-05-17)',
        width: 720,
        height: 280,
        marginLeft: 40,
        marginBottom: 40,
        x: {
            label: 'Week',
            type: 'time'
        },
        y: {
            label: 'Commits',
            grid: true
        },
        color: { legend: true },
        marks: [
            Plot.rectY(commit_velocity_data, {
                x: 'week',
                y: 'commits',
                fill: 'repo',
                interval: 'week',
                tip: true
            }),
            Plot.ruleY([0])
        ]
    });
};
const _bkqr3ks = function _anonymous(md) {return (md`This showed that the same foundational model, in the same programming domain, but with a different harness had radically different productivity. There was something wrong with how the LLM used the tools. I decide to just try and copy how Claude Code is interfaced with code to see if I could get performance gains.`);};
const p4 = function _anonymous(md) {return (md`# Necessary but not sufficient: Bash`);};
const _stc549 = function _blogTerminal(htl,terminal,rc4_agentShell) {
    const root = htl.html`<div style="border:1px solid #30363d;border-radius:8px;height:35vh;min-height:240px;overflow:hidden;margin:8px 0"></div>`;
    root.append(terminal(rc4_agentShell, { title: 'the agent\'s shared shell — try a command' }));
    return root;
};
const p5 = function _anonymous(md,externalLink) {return (md`My initial thought was it was the filesystem. I should pose the problem as editing JavaScript files, and let it use familiar Linux tools through Bash. Vercel has the amazing ${ externalLink('just-bash', 'https://github.com/vercel-labs/just-bash') } AI project which create a virtual bash environment in software that can be hosted in the browser. 

Agents only "experience" the environment through their tools. If we are able to mimic the environment well enough, the LLM will not be able to tell the difference. Claude Code generally accesses the filesystem through bash. Because every frontier model trains on ${ externalLink('Terminal Bench 2.0', 'https://github.com/laude-institute/terminal-bench') }, a Linux system environment, it seemed likely that they are well trained on bash, so maybe if my coding agent did notebook programming through bash, like Claude Code, it would be more performant.`);};
const _i4dqdyo = function _anonymous(Plot) {
    const runs = [
        {
            arm: 'Structured semantic API',
            model: 'mimo v2.5-pro',
            steps: 31
        },
        {
            arm: 'Structured semantic API',
            model: 'mimo v2.5-pro',
            steps: 10
        },
        {
            arm: 'Structured semantic API',
            model: 'mimo v2.5-pro',
            steps: 31
        },
        {
            arm: 'Structured semantic API',
            model: 'sonnet-4.6',
            steps: 27
        },
        {
            arm: 'Structured semantic API',
            model: 'sonnet-4.6',
            steps: 21
        },
        {
            arm: 'Structured semantic API',
            model: 'sonnet-4.6',
            steps: 20
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'mimo v2.5-pro',
            steps: 16
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'mimo v2.5-pro',
            steps: 21
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'mimo v2.5-pro',
            steps: 31
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'sonnet-4.6',
            steps: 13
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'sonnet-4.6',
            steps: 14
        },
        {
            arm: 'Bash (sed/heredoc)',
            model: 'sonnet-4.6',
            steps: 22
        }
    ];
    return Plot.plot({
        title: 'Bash vs structured tools: steps to complete long-store-to-checkout',
        subtitle: 'N=3 per arm, every run passes \u2014 bars are mean steps (lower is better), dots the individual runs',
        width: 720,
        height: 280,
        marginLeft: 40,
        marginBottom: 40,
        fx: {
            label: null,
            domain: [
                'Structured semantic API',
                'Bash (sed/heredoc)'
            ]
        },
        x: { axis: null },
        y: {
            label: 'steps',
            grid: true
        },
        color: { legend: true },
        marks: [
            Plot.barY(runs, Plot.groupX({ y: 'mean' }, {
                fx: 'arm',
                x: 'model',
                y: 'steps',
                fill: 'model',
                tip: true
            })),
            Plot.dot(runs, {
                fx: 'arm',
                x: 'model',
                y: 'steps',
                fill: 'currentColor',
                r: 2.5
            }),
            Plot.ruleY([0])
        ]
    });
};
const p6 = function _anonymous(md) {return (md`I observed agents can use bash tools like sed/awk/jq just from pretrained knowledge. They really know bash! However, the gains over the structured tool surface were modest and inconsistent across models (roughly 5% for mimo, 30% for sonnet, above), not as big as I had hoped, and not worth the complexity of simulating bash.`);};
const p7 = function _anonymous(md) {return (md`Taking a closer look at the traces, agents have to edit files with sed or heredoc, and they often trip up over escaping. Claude does not code like this! Claude Code sometimes uses grep to search, but actual file edits are not done through bash but through specialized tool.`);};
const p8 = function _anonymous(md) {return (md`# Claude's Read/Write/Edit tool`);};
const p9 = function _anonymous(md) {return (md`The missing piece was Claude Code's primary file editing tools (Read/Write/Edit). These use plain strings to manipulate files on the filesystem. In my initial implementation, file edits would instantly update the Notebook and apply a needed code transformation. I found the bot would abandon delta edits if the file changed underfoot and would switch to whole-file replacement instead. It wasn't until I adjusted where the code transformation occurs that I saw *another* leap in performance. So to get full Read/Write/Edit delta editing performance the targeted files must preserve byte consistency across edits.`);};
const p11 = function _blog11(md){return(
md`| arm | distribution / contract | mimo | sonnet-4.6 |
|-----|-------------------------|-----:|-----------:|
| **Structured** | off-distribution semantic API (\`define_variable\` & friends) | **24.0** | **22.7** |
| **Bash** | on-distribution shell (sed/heredoc) | 22.7 | 16.3 |
| **Std Tools (broken contract)** | Read/Write/Edit, file reformatted between read+edit | 19.3 | 18.0 |
| **Std Tools (aligned)** | Read/Write/Edit + byte-stable \`/src\` | **10.3** | **8.0** |`
)};
const p12 = function _anonymous(md) {return (md`Results come from the "long-edit" questions in the eval, which evaluate asking for a toy application and then asking for modifications. Each number is the mean steps over 3 runs.`);};
const p13 = function _anonymous(md,externalLink) {return (md`Armin Ronacher reached the same conclusion from the opposite direction in ${ externalLink('Better Models, Worse Tools', 'https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/') }: newer Anthropic models emit malformed tool calls against non-Claude-Code schemas, likely because reinforcement learning inside a forgiving harness implicitly punishes alternatives. Tool schemas are not neutral. The ladder above measures the same effect as an efficiency tax, and shows it is not Anthropic-specific. It also sharpens with model strength: sonnet-4.6 runs the aligned arm at a dead-consistent 8 steps but pays 2.8× on the structured arm, a wider spread than mimo's 2.3×. Capability gains are partly specialization to the training harness. If you cannot align your harness with the training distribution, strict schema decoding fixes the syntax half of the problem, but not the contract half.`);};
const p10 = function _anonymous(md) {return (md`## The new \`robocoop-4\` architecture

The latest \`robocoop-4\` architecture is a virtual filesystem containing a \`/src\` of JavaScript ESM modules that define notebooks. On an edit, the src is compiled into a notebook that is delta patched into the running notebook. It's an extremely convoluted architecture compared to a custom tool that edits cells live, but the results speak for themselves. These results carry across to non-Anthropic models.`);};
const _dxyt80d = function _anonymous(htl) {return (htl.html`<figure style="margin:16px 0">
<svg viewBox="0 0 760 250" style="max-width:100%;height:auto;font-family:inherit;display:block" role="img" aria-label="robocoop-4 architecture: the agent edits /src, which delta-patches the live runtime; the runtime is decompiled back into /notebook">
  <defs>
    <marker id="rc4-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="580" y="66" width="176" height="116" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-dasharray="3 3"/>
  <g stroke="currentColor" fill="currentColor" fill-opacity="0.06">
    <rect x="10"  y="95"  width="150" height="60" rx="8"/>
    <rect x="290" y="30"  width="180" height="56" rx="8"/>
    <rect x="290" y="164" width="180" height="56" rx="8"/>
    <rect x="600" y="95"  width="150" height="60" rx="8"/>
  </g>
  <g fill="currentColor" text-anchor="middle" font-size="13" font-weight="600">
    <text x="85"  y="120">Agent</text>
    <text x="380" y="52">/src</text>
    <text x="380" y="186">/notebook</text>
    <text x="675" y="120">Live notebook</text>
  </g>
  <g fill="currentColor" fill-opacity="0.7" text-anchor="middle" font-size="10.5">
    <text x="85"  y="138">bash · Read/Write/Edit</text>
    <text x="380" y="70">editable, byte-stable</text>
    <text x="380" y="204">auto-formatted mirror</text>
    <text x="675" y="138">Observable runtime</text>
    <text x="668" y="82" font-style="italic">executing JavaScript</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#rc4-arrow)">
    <path d="M 160 108 L 284 62"/>
    <path d="M 470 62 L 596 104"/>
    <path d="M 596 148 L 476 190" stroke-dasharray="4 3"/>
    <path d="M 286 190 L 162 144"/>
  </g>
  <g fill="currentColor" fill-opacity="0.7" font-size="10.5">
    <text x="196" y="60">write / edit</text>
    <text x="495" y="60">compile + patch</text>
    <text x="500" y="194">decompile</text>
    <text x="192" y="194">read</text>
  </g>
  <text x="380" y="240" fill="currentColor" fill-opacity="0.7" text-anchor="middle" font-size="10.5">every runtime change is decompiled back into /notebook, so it always reflects live state (human edits included)</text>
</svg>
</figure>`);};
const _vr4he5k = function _anonymous(md) {return (md`## Roboco-op 4 with Demo Module

Roboco-op 4 is BYOK through OpenRouter. Demo mode works on MiMo v2.5, which is amazing value for money
`);};
const _h30zu7 = function _blogRobocoop(htl,robocoop_4) {
    const root = htl.html`<div style="border:1px solid #30363d;border-radius:8px;height:70vh;min-height:400px;overflow:hidden;margin:8px 0"></div>`;
    root.append(robocoop_4);
    return root;
};
const p14 = function _anonymous(md,aside) {return (md`## Local-first Malleable Agent Harness

Live changes made by human or bot can be serialized to a single HTML file with ${ aside('exporter-3') } short linked in the burger menu in the top left. The included ${ aside('butter-synth') } notebook was one of the first notebooks I vibed with the new robocoop-4 using MiMo v2.5-pro, and I have included it in the bundle so you can enjoy its cool sounds. CMD + K opens the command menu`);};
const _nmxixw = function _aside(htl) {return (module_name => htl.html`<a href="#open=@tomlarkworthy/${ module_name.toLowerCase() }">${ module_name }</a>`);};
const _9yd8ub = function _external_link_svg(htl) {return (htl.svg`<svg
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
const _mhp8n4 = function _externalLink(external_link_svg,htl) {return ((label, href, {
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
  $def("p3", null, ["htl"], p3);  
  $def("p2", null, ["md","aside"], p2);  
  $def("_kc9m7aa", "commit_velocity_plot", ["Plot"], _kc9m7aa);  
  $def("_bkqr3ks", null, ["md"], _bkqr3ks);  
  $def("p4", null, ["md"], p4);  
  $def("_stc549", "blogTerminal", ["htl","terminal","rc4_agentShell"], _stc549);  
  $def("p5", null, ["md","externalLink"], p5);  
  $def("_i4dqdyo", null, ["Plot"], _i4dqdyo);  
  $def("p6", null, ["md"], p6);  
  $def("p7", null, ["md"], p7);  
  $def("p8", null, ["md"], p8);  
  $def("p9", null, ["md"], p9);  
  $def("p11", null, ["md"], p11);  
  $def("p12", null, ["md"], p12);  
  $def("p13", null, ["md","externalLink"], p13);  
  $def("p10", null, ["md"], p10);  
  $def("_dxyt80d", null, ["htl"], _dxyt80d);  
  $def("_vr4he5k", null, ["md"], _vr4he5k);  
  $def("_h30zu7", "blogRobocoop", ["htl","robocoop_4"], _h30zu7);  
  $def("p14", null, ["md","aside"], p14);  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));  
  main.define("module @tomlarkworthy/robocoop-4-bash-terminal", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-terminal.js?v=4")).default));  
  main.define("terminal", ["module @tomlarkworthy/robocoop-4-bash-terminal", "@variable"], (_, v) => v.import("terminal", _));  
  main.define("module @tomlarkworthy/robocoop-4-engine", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-engine.js?v=4")).default));  
  main.define("rc4_agentShell", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("rc4_agentShell", _));  
  main.define("module @tomlarkworthy/robocoop-4", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4.js?v=4")).default));  
  main.define("robocoop_4", ["module @tomlarkworthy/robocoop-4", "@variable"], (_, v) => v.import("robocoop_4", _));  
  $def("_nmxixw", "aside", ["htl"], _nmxixw);  
  $def("_9yd8ub", "external_link_svg", ["htl"], _9yd8ub);  
  $def("_mhp8n4", "externalLink", ["external_link_svg","htl"], _mhp8n4);
  return main;
}
