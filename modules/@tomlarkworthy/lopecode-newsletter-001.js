const _1brt2lp = function _anonymous(md) {return (md`# Lopecode News Issue #1

## things are getting serious!

There has been a ton of stuff added to Lopecode recently. Lopecode’s mission is to provide an immortal computational medium for writing and sharing computational ideas *i.e.* blogging with code, so it’s about time I wrote a computational blog post! This *is* that blog post.`);};
const _n38uwlu = function _anonymous(html) {return (html`<lite-youtube videoid="-raKCLC3TaY" playlabel="Play: Crayon Physics Deluxe - Trailer HD"></lite-youtube>`);};
const _9vjzf6y = function _anonymous(md) {return (md`### What is Lopecode anyway?

There is industrial software… giant databases, millions of lines of code, complex build chains, operational monitoring. Code that runs real-world processes. I work on that stuff for my day job. Then there is code that extends your mind, as a tool-for-thought, for exploratory programming, prototypes. Code that represents ideas. *That* is the fun programming I like to do… Lopecode is for ideation.

Thinking and discovering has value when we communicate the findings to others. Lopecode helps with the transport and communication of computational ideas. It is a literate programming environment that gets rid of all the complexities of industrial programming, so you can focus on ideas, and wraps them up in a single HTML file you can easily share without burdening readers with any complexity of running it. Lopecode documents are entirely self-contained reading and publishing systems that can be double-clicked to open, uploaded to static hosting or (as we see later) shared on ATProto.`);};
const _rn5k0bn = function _theta1(Inputs) {return (Inputs.range([
    -180,
    180
], {
    label: 'θ1 (base)',
    step: 1,
    value: 90
}));};
const _uhbwsd0 = function _theta2(Inputs) {return (Inputs.range([
    -180,
    180
], {
    label: 'θ2 (elbow)',
    step: 1,
    value: -45
}));};
const _gsv1pij = (G, _) => G.input(_);
const _yb00kg7 = (G, _) => G.input(_);
const _gv4hq3o = function _theta3(Inputs) {return (Inputs.range([
    -180,
    180
], {
    label: 'θ3 (wrist)',
    step: 1,
    value: -60
}));};
const _r2brej6 = (G, _) => G.input(_);
const _9p79gd8 = function _robotArm(theta1,theta2,theta3,htl,anchor) {
    const L1 = 100, L2 = 80, L3 = 60;
    const ox = 200, oy = 300;
    const r1 = theta1 * Math.PI / 180;
    const r2 = r1 + theta2 * Math.PI / 180;
    const r3 = r2 + theta3 * Math.PI / 180;
    const j1x = ox + L1 * Math.cos(r1);
    const j1y = oy - L1 * Math.sin(r1);
    const j2x = j1x + L2 * Math.cos(r2);
    const j2y = j1y - L2 * Math.sin(r2);
    const ex = j2x + L3 * Math.cos(r3);
    const ey = j2y - L3 * Math.sin(r3);
    return htl.svg`<svg width="640" height="400" viewBox="0 0 400 400" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1a2e"/>
        <stop offset="100%" stop-color="#16213e"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="75%" r="40%">
        <stop offset="0%" stop-color="#0f3460" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    
    <rect width="640" height="400" fill="url(#bg)"/>
    <rect width="640" height="400" fill="url(#glow)"/>
    
    <!-- Grid dots -->
    ${ Array.from({ length: 20 }, (_, i) => Array.from({ length: 20 }, (_, j) => htl.svg`<circle cx="${ i * 20 + 10 }" cy="${ j * 20 + 10 }" r="0.5" fill="#ffffff" fill-opacity="0.1"/>`)).flat() }

    <!-- Angle arcs -->
    ${ [
        {
            cx: ox,
            cy: oy,
            r: 40,
            aStart: 0,
            aEnd: r1,
            theta: theta1,
            label: 'θ\u2081',
            color: '#e74c3c'
        },
        {
            cx: j1x,
            cy: j1y,
            r: 30,
            aStart: r1,
            aEnd: r2,
            theta: theta2,
            label: 'θ\u2082',
            color: '#f39c12'
        },
        {
            cx: j2x,
            cy: j2y,
            r: 24,
            aStart: r2,
            aEnd: r3,
            theta: theta3,
            label: 'θ\u2083',
            color: '#2ecc71'
        }
    ].map(({cx, cy, r, aStart, aEnd, theta, label, color}) => {
        const sx = cx + r * Math.cos(aStart);
        const sy = cy - r * Math.sin(aStart);
        const ax = cx + r * Math.cos(aEnd);
        const ay = cy - r * Math.sin(aEnd);
        const delta = aEnd - aStart;
        const sweep = delta > 0 ? 0 : 1;
        const large = Math.abs(delta) > Math.PI ? 1 : 0;
        const midA = (aStart + aEnd) / 2;
        const lr = r + 16;
        const lx = cx + lr * Math.cos(midA);
        const ly = cy - lr * Math.sin(midA);
        const refLen = r + 10;
        const rx = cx + refLen * Math.cos(aStart);
        const ry = cy - refLen * Math.sin(aStart);
        const endTickLen = 6;
        const tx1 = cx + (r - endTickLen / 2) * Math.cos(aEnd);
        const ty1 = cy - (r - endTickLen / 2) * Math.sin(aEnd);
        const tx2 = cx + (r + endTickLen / 2) * Math.cos(aEnd);
        const ty2 = cy - (r + endTickLen / 2) * Math.sin(aEnd);
        return htl.svg`<g style="pointer-events:none;">
            <line x1="${ cx }" y1="${ cy }" x2="${ rx }" y2="${ ry }" stroke="${ color }" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 3"/>
            <path d="M ${ sx } ${ sy } A ${ r } ${ r } 0 ${ large } ${ sweep } ${ ax } ${ ay }" fill="none" stroke="${ color }" stroke-opacity="0.75" stroke-width="1.4" stroke-dasharray="3 2.5" stroke-linecap="round"/>
            <line x1="${ tx1 }" y1="${ ty1 }" x2="${ tx2 }" y2="${ ty2 }" stroke="${ color }" stroke-opacity="0.85" stroke-width="1.25" stroke-linecap="round"/>
            <text x="${ lx }" y="${ ly }" fill="${ color }" font-size="11" font-family="ui-monospace, monospace" font-weight="600" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#0a1424" stroke-width="3" stroke-linejoin="round">${ label }=${ Math.round(theta) }°</text>
        </g>`;
    }) }

    <!-- Base mount (tapered) -->
    <path d="M ${ ox - 40 } ${ oy + 30 } L ${ ox - 22 } ${ oy - 1 } A 4 4 0 0 1 ${ ox - 18 } ${ oy - 5 } L ${ ox + 18 } ${ oy - 5 } A 4 4 0 0 1 ${ ox + 22 } ${ oy - 1 } L ${ ox + 40 } ${ oy + 30 } Z" fill="#2c3e50" stroke="#34495e" stroke-width="1.5" stroke-linejoin="round" filter="url(#shadow)"/>
    <line x1="${ ox - 28 }" y1="${ oy + 15 }" x2="${ ox + 28 }" y2="${ oy + 15 }" stroke="#1a2332" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="${ ox }" cy="${ oy }" r="12" fill="#34495e" stroke="#e74c3c" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 1 (upper) -->
    <line x1="${ ox }" y1="${ oy }" x2="${ j1x }" y2="${ j1y }" stroke="#e74c3c" stroke-width="10" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ ox }" y1="${ oy }" x2="${ j1x }" y2="${ j1y }" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Joint 1 (elbow) -->
    <circle cx="${ j1x }" cy="${ j1y }" r="9" fill="#2c3e50" stroke="#f39c12" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 2 (forearm) -->
    <line x1="${ j1x }" y1="${ j1y }" x2="${ j2x }" y2="${ j2y }" stroke="#f39c12" stroke-width="8" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ j1x }" y1="${ j1y }" x2="${ j2x }" y2="${ j2y }" stroke="#e67e22" stroke-width="5" stroke-linecap="round"/>
    
    <!-- Joint 2 (wrist) -->
    <circle cx="${ j2x }" cy="${ j2y }" r="7" fill="#2c3e50" stroke="#2ecc71" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 3 (hand) -->
    <line x1="${ j2x }" y1="${ j2y }" x2="${ ex }" y2="${ ey }" stroke="#2ecc71" stroke-width="6" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ j2x }" y1="${ j2y }" x2="${ ex }" y2="${ ey }" stroke="#27ae60" stroke-width="3.5" stroke-linecap="round"/>
    
    <!-- End effector -->
    <circle cx="${ ex }" cy="${ ey }" r="8" fill="#3498db" stroke="#fff" stroke-width="2.5" filter="url(#shadow)"/>
    <circle cx="${ ex }" cy="${ ey }" r="3" fill="#fff"/>
    
    <!-- Anchors -->
    ${ anchor('end-effector', {
        x: ex,
        y: ey
    }) }
    ${ anchor('elbow', {
        x: j1x,
        y: j1y
    }) }
    ${ anchor('wrist', {
        x: j2x,
        y: j2y
    }) }
  </svg>`;
};
const _dva3cmt = function _anonymous(svgEditor,newsletter) {return (svgEditor({
    target: 'robotArm',
    module: newsletter
}));};
const _udpwifc = function _anonymous(md,externalLink) {return (md`### Current State of Lopecode

Lopecode is still *exceedingly* alpha. I had to fix *umpteen* bugs to write this post. That said, its usability in the last month has increased enough that I no longer author documents primarily on ${ externalLink('ObservableHQ.com', 'https://observablehq.com') } (Lopecode documents are Observable 1.0 notebooks with a different serving architecture).

Lots of time has been spent on improving productivity and ergonomics of Lopecode and it is slowly beginning to pay off (for me at least). I do not expect it to be that easy for other people to use yet, but it is improving rapidly and I encourage you to submit ${ externalLink('issues', 'https://github.com/tomlarkworthy/lopecode/issues') } to the repository hosted on ${ externalLink('Github', 'https://github.com/tomlarkworthy/lopecode') }.

Thank you ${ externalLink('btheado', 'https://github.com/btheado') } for submitting issues. Now let's go through what recently shipped and why it is useful.`);};
const _wpyovlw = function _anonymous(md,aside) {return (md`### Claude Code Pairing Module

The biggest uplift in productivity has been bringing Claude Code to bear on the Lopecode codebase with the ${ aside('claude-code-pairing') } module.`);};
const _r0z3ii0 = function _commit_velocity_data() {return ([
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
})));};
const _ed6y7y = function _commit_velocity_plot(Plot,commit_velocity_data) {return (Plot.plot({
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
}));};
const _j620h5k = function _anonymous(md,aside,externalLink) {return (md`The ${ aside('claude-code-pairing') } module connects Claude Code CLI to the live notebook environment via a ${ externalLink('Channel', 'https://code.claude.com/docs/en/channels') } server, allowing the notebook-hosted chat to proxy communications to a local Claude Code session. When Claude Code connects, the notebook communicates a dynamic list of MCP tools which include tools to edit the notebook.

While Claude Code can do tactical edits quite well, I found it was not as effective as it usually is. I concluded that having LLMs code through MCP tools is not natural for them and consequently they take a hit on effectiveness. So I tried presenting notebooks in a more traditional coding way.`);};
const _c5lnsdb = function _anonymous(md,aside,externalLink) {return (md`### Bidirectional file disassembly: ${ aside('file-sync') }

I wanted Claude Code to work with the running notebook because then it can read runtime values. However, it was clear that this is not a typical coding setup for Claude to work with, so I gave it an *additional* option of working with notebooks on disk.

Lopecode documents are quite large HTML files (2MB) and Claude Code cannot work well with them. But really, they are a bunch of vanilla JavaScript files and static assets, things Claude Code *is* familiar with. So to make Lopecode documents more familiar to Claude, I added the ${ aside('file-sync') } module. This uses Chrome's ${ externalLink('File System Access API', 'https://developer.chrome.com/docs/capabilities/web-apis/file-system-access') } to disassemble the runtime into individual files live, and listen to changes and resynchronize back into the runtime on disk changes. This lets the Claude Code CLI edit the notebook using its normal file-based tools while a human experiences the notebook changes in the browser live.

Claude gets the best of all worlds: it can edit on disk but also debug on the live environment using MCP.`);};
const _b2em38u = function _anonymous(md) {return (md`## Authoring improvements

AI is not the main focus of Lopecode. It is a useful tool that cannot be ignored, but the purpose is to produce easy-to-digest computational or data-driven knowledge for humans (and machines?).

`);};
const _yguyjp7 = function _anonymous(md,aside) {return (md`### CMD + K Command bar

As I worked more in Lopecode natively, I found it hard to find modules and cells. The ${ aside('command-palette') } module adds a CMD + K shortcut that will search for code or modules and open them. It has a reactive plugin system too so other modules can add their own shortcuts.`);};
const _t05ccss = function _anonymous(md,aside,externalLink) {return (md`### Local change history

Notebooks no longer lose their edits on page refresh! This functionality is provided by ${ aside('local-change-history') }. Every variable is tagged with a persistent id that is remembered across serializations. On every cell mutation, the change is recorded in an ${ externalLink('isomorphic git', 'https://github.com/isomorphic-git/isomorphic-git') }, stored in IndexedDB and replayed on load.

If you ever lose important edits, it's worth downloading the history as a zip.

`);};
const _dmce0tu = function _anonymous(md,aside) {return (md`### Reactive Theming

Lots of work was spent refactoring out theme support from ${ aside('exporter-3') } into a stand-alone module ${ aside('themes') }, so that it was easier to digest by other modules. That new focused module is able to switch the theme reactively. Give it a try! With a stand-alone module, it's easy to find all the theme variables.

`);};
const _vy62tn9 = function _anonymous(Inputs,themes,current_theme,$0) {return (Inputs.bind(Inputs.select(themes, {
    label: 'Theme',
    value: current_theme || themes.get('near-midnight')
}), $0));};
const _48kou1s = function _lsp(md,aside) {return (md`### LSP Integration

Code cells have Language Server Protocol support. Although the language is not typed, we sniff the runtime and provide tips based on runtime reflection. The integration lives in ${ aside('editor-5') }.

We currently use the Observable lezer repository for the grammar (${ aside('observablehq-lezer') }), although I think it is out-of-date because we sometimes get incorrect suggestions. Definitely more work is needed here, but even in its partially working state, it is quite helpful for finding the names of things.`);};
const _d09xm12 = function _anonymous(md,aside) {return (md`### Inputs documentation

One of the most-used parts of the standard library is the Standard Inputs. This now has some reference documentation and some basic examples in ${ aside('inputs-reference') }.
`);};
const _2yvharp = function _anonymous(md,aside) {return (md`### Native browser tabs

The ${ aside('lopepage') } module is responsible for providing the framing for the multi-notebook view. Previously we could only display notebooks/modules, but support has been added for opening any ${ aside('fileattachments') } using the native browser viewer — this means PDFs (and video, etc.)! The motivation is that I would sometimes like to replicate a paper and it would be helpful to have the PDF open next to the implementation.

Try it: ${ aside('lopecode-newsletter-001/sample.pdf') }`);};
const _206z05s = function _anonymous(md) {return (md`### Drag and Copy Module Source from Tabs

The docked tab that holds a notebook, in some way, is a symbol for that notebook. To that end I have started experimenting with dragging docks out of the app and into the operating system. If you do that on Chrome, it will create the JavaScript file of that module, so that you can pull the implementation out of the document bundle. You can also now do the reverse and drag JavaScript sources into the docked headers, and bring external modules *into* the bundle.

The need for moving source code between documents became more acute after adding ATProto support.`);};
const _1rr66cn = function _anonymous(md,aside) {return (md`## ATProto publishing

Lopecode has been deliberately avoiding Cloud services and the internet in general. The whole point of Lopecode is that these documents work without internet or even local web-servers because network dependencies create bitrot. However, once I looked beyond Bluesky and understood what ATProto actually did, it became obvious that *this* kind of networking was a huge fit for Lopecode for several reasons.

First, decentralization: you can bring your own storage and move your data around.

Second, app data can access any other app's data, which suits Lopecode's orthogonal architecture of loosely cooperating modules.

Third, the ATProto storage primitive is Blobs with MIME types, which is *exactly* the same representation as Lopecode modules and fileattachments. Thus there was an almost self-evident way to map Lopecode documents to ATProto storage primitives.

To login to ATProto from Lopecode you use ${ aside('at-login') }, to publish you use ${ aside('at-write') }.

`);};
const _kcjkry3 = function _anonymous(md,externalLink) {return (md`### \`lopecode.com\`

So that brings me to ${ externalLink('lopecode.com', 'https://lopecode.com') }. I finally registered a domain, the thing I have consciously not done for a long time. I needed a domain to host the ATProto lexicon \`com.lopecode.bundle\` from, and also to act as a bridge for OAuth login. I do not particularly like that I had to do this, but it provides the best experience on ATProto. If ${ externalLink('lopecode.com', 'https://lopecode.com') } disappears, you can still log in with an app password, and you still own all your documents on your PDS, so I do not feel it creates a huge lock-in.

Currently ${ externalLink('lopecode.com', 'https://lopecode.com') } hosts a feed of all published notebooks and you can browse other people's notebooks, download them etc. It's quite primitive at the moment but I love that with ATProto the existing Bluesky social graphs can be reused. The thing I most loved about the Observable experience was the community, and this was something I could not replicate, but with ATProto you can provide some of those affordances without actually hosting much infrastructure.

The only real infrastructure I now host is a Cloudflare Worker running ${ externalLink('Flo-bit', 'https://bsky.app/profile/flo-bit.dev') }'s ${ externalLink('contrail', 'https://github.com/flo-bit/contrail') }, which is an off-the-shelf lexicon indexer. This allows you to scoop all notebook publications from the network so you can provide services like feeds. If that service were to disappear, the feed would break, but all the notebooks would still be in their author's PDS and you could rebuild your own indexing service because the data stored under the \`com.lopecode.*\` lexicon is NOT stored on infrastructure I own but instead distributed across PDSs. I really love the way ATProto works.`);};
const _ulfoj76 = function _anonymous(md,externalLink,aside) {return (md`### Exporter-3 Upgrades

I have completed a migration from ${ externalLink('exporter-2', 'https://observablehq.com/@tomlarkworthy/exporter-2') } to ${ aside('exporter-3') }, the next generation in runtime serialization. ${ externalLink('Exporter-2', 'https://observablehq.com/@tomlarkworthy/exporter-2') } was ObservableJS based, meaning it read high level cells and then serialized them. ${ aside('Exporter-3') } works on the low level representation and serializes runtime functions directly without a toolchain step. This decouples the serialization technology from the primary notebook language we observe, allowing other languages to be used in the future.

${ aside('Exporter-3') } is the most foundational userspace module in Lopecode. Its primary purpose was to save runtimes as a single HTML file, but we have refactored it a bit recently to expose its ability to serialize individual modules as well. Exporter-3 is used in a ton of places; its logic drives ${ aside('file-sync') }, ${ aside('at-write') }, ${ aside('at-read') } and ${ aside('lopepage') } module dragging.

The new toolchain-less version is faster *and* smaller.`);};
const _afoxy0t = function _anonymous(md) {return (md`## Fun things

All work and no play makes Jack a dull boy. There is no point making a computational blogging platform if you don't do computational experiments!`);};
const _k4yosc = function _anonymous(md,aside) {return (md`### Parametric SVG Editor

Still very much in ideation phase but I am thinking about how to make authoring interactive visualizations easier by adding anchors to SVG and driving them with a constraint solver ${ aside('parametric-svg') }. Shift-click to lock a constraint!`);};
const _lvux8s5 = function _trunkLength(Inputs) {return (Inputs.range([
    20,
    160
], {
    label: 'trunkLength',
    step: 1,
    value: 80
}));};
const _od1pw0w = (G, _) => G.input(_);
const _6i6peoy = function _treeSvg(branchAngles,lengthDecay,trunkLength,branchThickness,htl,anchor) {
    const w = 400, h = 400;
    const angles = branchAngles;
    const maxDepth = angles.length;
    const decay = lengthDecay;
    const trunk = trunkLength;
    const thick = branchThickness;
    const t = Math.min(1, Math.max(0, (thick - 1) / 49));
    const lerp = (a, b) => a + (b - a) * t;
    const rgb = (c1, c2) => `rgb(${ Math.round(lerp(c1[0], c2[0])) },${ Math.round(lerp(c1[1], c2[1])) },${ Math.round(lerp(c1[2], c2[2])) })`;
    const skyTop = rgb([
        135,
        206,
        235
    ], [
        6,
        8,
        28
    ]);
    const skyMid = rgb([
        195,
        225,
        245
    ], [
        20,
        26,
        60
    ]);
    const skyBot = rgb([
        235,
        245,
        255
    ], [
        42,
        48,
        92
    ]);
    const ground = rgb([
        74,
        48,
        32
    ], [
        14,
        10,
        22
    ]);
    const trunkCol = rgb([
        58,
        37,
        21
    ], [
        22,
        14,
        26
    ]);
    const leafCol = rgb([
        102,
        176,
        68
    ], [
        38,
        72,
        60
    ]);
    const tipCol = rgb([
        123,
        196,
        88
    ], [
        58,
        112,
        84
    ]);
    const horizon = h - 35;
    const arcCx = w / 2;
    const arcCy = horizon;
    const arcR = w * 0.42;
    const sunAngle = Math.PI / 2 + t * Math.PI;
    const moonAngle = sunAngle + Math.PI;
    const sunX = arcCx - arcR * Math.cos(sunAngle);
    const sunY = arcCy - arcR * Math.sin(sunAngle);
    const moonX = arcCx - arcR * Math.cos(moonAngle);
    const moonY = arcCy - arcR * Math.sin(moonAngle);
    const moonOp = t.toFixed(3);
    const stars = Array.from({ length: 45 }, (_, i) => {
        const x = (i * 53 + 17) % w;
        const y = (i * 29 + 7) % (h - 80);
        const r = 0.4 + i * 7 % 3 * 0.35;
        const tw = 0.55 + i * 11 % 5 * 0.09;
        return {
            x,
            y,
            r,
            tw
        };
    });
    const segments = [];
    const tips = [];
    const joints = [];
    function branch(x, y, angle, depth, len) {
        const rad = angle * Math.PI / 180;
        const x2 = x + Math.cos(rad) * len;
        const y2 = y - Math.sin(rad) * len;
        const sw = Math.max(0.5, thick * Math.pow(decay, depth));
        segments.push({
            x1: x,
            y1: y,
            x2,
            y2,
            sw
        });
        if (depth >= maxDepth) {
            tips.push({
                x: x2,
                y: y2,
                i: tips.length
            });
            return;
        }
        joints.push({
            x: x2,
            y: y2,
            i: joints.length
        });
        const a = angles[depth];
        branch(x2, y2, angle + a, depth + 1, len * decay);
        branch(x2, y2, angle - a, depth + 1, len * decay);
    }
    const baseX = w / 2, baseY = h - 30;
    branch(baseX, baseY, 90, 0, trunk);
    const thickAnchorX = baseX + thick * 3;
    const thickAnchorY = baseY;
    return htl.svg`<svg width="${ w }" height="${ h }" viewBox="0 0 ${ w } ${ h }" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${ skyTop }"/>
        <stop offset="60%" stop-color="${ skyMid }"/>
        <stop offset="100%" stop-color="${ skyBot }"/>
      </linearGradient>
      <radialGradient id="sunglow">
        <stop offset="0%" stop-color="#fff6c0" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#ffcc55" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <clipPath id="skyclip">
        <rect width="${ w }" height="${ horizon }"/>
      </clipPath>
    </defs>
    <rect width="${ w }" height="${ h }" fill="url(#sky)"/>
    ${ stars.map(s => htl.svg`<circle cx="${ s.x }" cy="${ s.y }" r="${ s.r }" fill="#fff" opacity="${ (moonOp * s.tw).toFixed(3) }"/>`) }
    <g clip-path="url(#skyclip)">
      <circle cx="${ sunX }" cy="${ sunY }" r="80" fill="url(#sunglow)"/>
      <circle cx="${ sunX }" cy="${ sunY }" r="16" fill="#fff8d0"/>
      <circle cx="${ moonX }" cy="${ moonY }" r="18" fill="#f4f4ff"/>
      <circle cx="${ moonX + 6 }" cy="${ moonY - 3 }" r="15" fill="${ skyTop }"/>
    </g>
    <rect x="0" y="${ horizon }" width="${ w }" height="${ h - horizon }" fill="${ ground }"/>
    ${ segments.map(s => htl.svg`<line x1="${ s.x1 }" y1="${ s.y1 }" x2="${ s.x2 }" y2="${ s.y2 }" stroke="${ trunkCol }" stroke-width="${ s.sw }" stroke-linecap="round"/>`) }
    ${ joints.map(j => htl.svg`<circle cx="${ j.x }" cy="${ j.y }" r="3" fill="${ leafCol }" opacity="0.6"/>`) }
    ${ tips.map(tp => htl.svg`<circle cx="${ tp.x }" cy="${ tp.y }" r="4" fill="${ tipCol }" opacity="0.85"/>`) }
    <line x1="${ baseX }" y1="${ baseY }" x2="${ thickAnchorX }" y2="${ thickAnchorY }" stroke="#a86" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>
    <circle cx="${ thickAnchorX }" cy="${ thickAnchorY }" r="4" fill="#c96" opacity="0.7"/>
    ${ joints.map(j => anchor(`joint-${ j.i }`, {
        x: j.x,
        y: j.y
    })) }
    ${ tips.map(tp => anchor(`tip-${ tp.i }`, {
        x: tp.x,
        y: tp.y
    })) }
    ${ anchor('thickness', {
        x: thickAnchorX,
        y: thickAnchorY
    }) }
    ${ anchor('sun', {
        x: sunX,
        y: sunY
    }) }
    ${ anchor('moon', {
        x: moonX,
        y: moonY
    }) }
  </svg>`;
};
const _16z8hf2 = function _branchAngles(vector) {return (vector([
    5,
    80
], {
    variate: true,
    value: [
        35,
        30,
        25
    ],
    label: 'branch angle per depth',
    step: 0.01
}));};
const _ba_get = (G, _) => G.input(_);
const _1oco7nj = function _lengthDecay(Inputs) {return (Inputs.range([
    0.3,
    2
], {
    label: 'lengthDecay',
    step: 0.01,
    value: 0.65
}));};
const _ld_get = (G, _) => G.input(_);
const _coyzcc = function _branchThickness(Inputs) {return (Inputs.range([
    1.1,
    49.9
], {
    label: 'branchThickness',
    step: 0.5,
    value: 3
}));};
const _bt_get = (G, _) => G.input(_);
const _6j9pvkk = function _treeEditor(svgEditor,newsletter) {return (svgEditor({
    target: 'treeSvg',
    module: newsletter
}));};
const _a7vhrh2 = function _anonymous(md,externalLink,aside) {return (md`### ${ externalLink('Feelings of Computing', 'https://feelingof.com/') } Demos

I demoed the ${ aside('parametric-svg') } at ${ externalLink('Feelings of Computing', 'https://feelingof.com/') } alongside ${ externalLink('Ivan Reese', 'https://ivanish.ca/') } demoing Ink and Switch's ${ externalLink('Tenfold', 'https://www.inkandswitch.com/project/tenfold/') }, and ${ externalLink('Eli Mellen', 'https://eli.li/') } presenting ${ externalLink('Kiki', 'https://eli.li/kiki') }. You can watch the demos on YouTube below, and embedded links to the other cool demos follow.`);};
const _9ablttp = function __9ablttp(html,lite_youtube_css) {return (html`${ lite_youtube_css }<lite-youtube style="height: 480px" videoid="TZI93QuvetA" playlabel="Feeling of Computing presentations" style="display:block;max-width:720px;margin:1em 0;"></lite-youtube>`);};
const _folmnyd = function __folmnyd(md) {return (md`### Tenfold`);};
const _33e9fup = function _anonymous(html) {
    const frame = () => html`<iframe width="100%" height="480px" src="https://www.inkandswitch.com/"></iframe>`;
    const wrap = html`<div style="margin:1em 0;"><button style="padding:0.6em 1.1em; cursor:pointer; border-radius:6px; border:1px solid var(--theme-foreground-faintest); background:var(--theme-background-alt); color:var(--theme-foreground); font:inherit;">▶ Load the Tenfold demo (reactive audio)</button></div>`;
    const btn = wrap.querySelector('button');
    btn.onclick = () => wrap.replaceChildren(frame());
    return wrap;
};
const _mp797yc = function _anonymous(md,externalLink) {return (md`### ${ externalLink('Kiki', 'https://eli.li/kiki') }`);};
const _ckngqf2 = function _anonymous(html) {
    const frame = () => html`<iframe width="100%" height="480px" src="https://smallandnearlysilent.com/kiki/" loading="lazy"></iframe>`;
    const wrap = html`<div style="margin:1em 0;"><button style="padding:0.6em 1.1em; cursor:pointer; border-radius:6px; border:1px solid var(--theme-foreground-faintest); background:var(--theme-background-alt); color:var(--theme-foreground); font:inherit;">▶ Load the Kiki demo</button></div>`;
    const btn = wrap.querySelector('button');
    btn.onclick = () => wrap.replaceChildren(frame());
    return wrap;
};
const _1q3uajj = function _anonymous(md,externalLink) {return (md`### Embedded Linux?

I wondered if putting Linux inside Lopecode might be a path to putting Claude Code fully inside Lopecode. To that end the first experiment was simulating a 32-bit RISC-V processor and booting Linux, called ${ externalLink('linux-sbc', 'https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_linux-sbc.html') }. I won't include it in this newsletter because the binary is a few megabytes. Although I got it working, the network stack didn't work and I subsequently realized a 32-bit RISC-V architecture is quite unusual and not a path of least resistance to running off-the-shelf Linux applications. ${ externalLink('Linux-sbc', 'https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_linux-sbc.html') } differs from ${ externalLink('JSLinux', 'https://bellard.org/jslinux/') } in being a plain JavaScript main-thread interpreter rather than a ${ externalLink('WASM', 'https://webassembly.org/') } emulator. Also it was quite slow to boot (15 seconds).

So I took a deeper look at JSLinux. How does it boot so fast? (answer: better boot firmware) And how does it efficiently simulate 64-bit architectures? (answer: WASM datatypes). How does it get the network stack running? (answer: Virtio device websocketing out to a hosted proxy service \\[${ externalLink('1', 'https://bellard.org/jslinux/tech.html') }\\]).

The networking strategy of using a web-hosted proxy that JSLinux does, doesn't suit the offline-first style of Lopecode, but using WASM as a processor emulator and the slick firmware was genuinely better than my first attempt, so I started working on ${ externalLink('linux-emu', 'https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_linux-emu.html') } which gets a modern Linux kernel working with JSLinux ideas. The same virtio trick for networking is used but instead of a proxy, the webpage itself forwards HTTP traffic and DNS lookups. The drawback is the requests are subject to browser restrictions (e.g., no general TCP, same-origin policy etc.) but now the networking works without a relay! It also boots in under 1 second. This version is about 6MB and much more space would be needed to run Claude Code so I moved on from those experiments but it was quite a fun learning experience that I might return to.`);};
const _y25k9yr = function _anonymous(md,aside,externalLink) {return (md`## Coming soon!

I am working on the next version of the real-time ${ aside('debugger-2') }, which will give a deeper view into runtime behavior, useful for performance tuning. The excessive parallelism of Observable Runtime can be exploited for high-performance simulations.

Further investment in UX is needed. Especially around adding cells, getting started and managing bundles. Inline documentation in the style of QuickBasic would be nice. Observable will be adding Notebook 2.0 syntax to the website soon, so I hope Lopecode will be able to follow that too, preliminary work so far has shown it is perhaps easier to do than Notebook 1.0 syntax.

I also expect to spend significant time improving the \`com.lopecode.*\` lexicon to make sharing, remixing and publishing work easier on ATProto. Stay tuned!

Follow along on ${ externalLink('Bluesky', 'https://bsky.app/profile/larkworthy.bsky.social') }, or on the ${ externalLink('GitHub repo lopecode', 'https://github.com/tomlarkworthy/lopecode') }.`);};
const _vjga0cn = function _aside(html) {return (module_name => html`<a href="#view=R100(@tomlarkworthy/lopecode-newsletter-001,S50(@tomlarkworthy/${ module_name.toLowerCase() }))">${ module_name }</a>`);};
const _y0e9f5b = function _external_link_svg(svg) {return (svg`<svg
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
const _12fhni2 = function _externalLink(external_link_svg,htl) {return ((label, href, {
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
const _624q5r = function _anonymous(apply_theme) {return (apply_theme);};
const _hs3ji3 = function _header_styles(htl) {return (htl.html`<style>
  /* Newsletter header palette — reuses theme tokens so colors track the active theme */
  .lm_content h1 { color: var(--theme-foreground-focus); }
  .lm_content h2 {
    color: var(--syntax-keyword);
    border-bottom: 1px solid var(--theme-foreground-faintest);
    padding-bottom: 0.25em;
  }
  .lm_content h3 { color: var(--syntax-string); }
  .lm_content h4 { color: var(--syntax-variable); }
</style>`);};
const _7bg6ng7 = function _newsletter(thisModule) {return (thisModule());};
const _niqhnxx = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["sample.pdf"].map((name) => {
    const module_name = "@tomlarkworthy/lopecode-newsletter-001";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_1brt2lp", "header", ["md"], _1brt2lp);  
  $def("_n38uwlu", null, ["html"], _n38uwlu);  
  $def("_9vjzf6y", null, ["md"], _9vjzf6y);  
  $def("_rn5k0bn", "viewof theta1", ["Inputs"], _rn5k0bn);  
  $def("_uhbwsd0", "viewof theta2", ["Inputs"], _uhbwsd0);  
  $def("_gsv1pij", "theta2", ["Generators","viewof theta2"], _gsv1pij);  
  $def("_yb00kg7", "theta1", ["Generators","viewof theta1"], _yb00kg7);  
  $def("_gv4hq3o", "viewof theta3", ["Inputs"], _gv4hq3o);  
  $def("_r2brej6", "theta3", ["Generators","viewof theta3"], _r2brej6);  
  $def("_9p79gd8", "robotArm", ["theta1","theta2","theta3","htl","anchor"], _9p79gd8);  
  $def("_dva3cmt", "_dva3cmt", ["svgEditor","newsletter"], _dva3cmt);  
  $def("_udpwifc", null, ["md","externalLink"], _udpwifc);  
  $def("_wpyovlw", null, ["md","aside"], _wpyovlw);  
  $def("_r0z3ii0", "commit_velocity_data", [], _r0z3ii0);  
  $def("_ed6y7y", "commit_velocity_plot", ["Plot","commit_velocity_data"], _ed6y7y);  
  $def("_j620h5k", null, ["md","aside","externalLink"], _j620h5k);  
  $def("_c5lnsdb", null, ["md","aside","externalLink"], _c5lnsdb);  
  $def("_b2em38u", null, ["md"], _b2em38u);  
  $def("_yguyjp7", null, ["md","aside"], _yguyjp7);  
  $def("_t05ccss", null, ["md","aside","externalLink"], _t05ccss);  
  $def("_dmce0tu", null, ["md","aside"], _dmce0tu);  
  $def("_vy62tn9", null, ["Inputs","themes","current_theme","viewof theme_assets"], _vy62tn9);  
  $def("_48kou1s", "lsp", ["md","aside"], _48kou1s);  
  $def("_d09xm12", null, ["md","aside"], _d09xm12);  
  $def("_2yvharp", null, ["md","aside"], _2yvharp);  
  $def("_206z05s", null, ["md"], _206z05s);  
  $def("_1rr66cn", null, ["md","aside"], _1rr66cn);  
  $def("_kcjkry3", null, ["md","externalLink"], _kcjkry3);  
  $def("_ulfoj76", null, ["md","externalLink","aside"], _ulfoj76);  
  $def("_afoxy0t", "_afoxy0t", ["md"], _afoxy0t);  
  $def("_k4yosc", null, ["md","aside"], _k4yosc);  
  $def("_lvux8s5", "viewof trunkLength", ["Inputs"], _lvux8s5);  
  $def("_od1pw0w", "trunkLength", ["Generators","viewof trunkLength"], _od1pw0w);  
  $def("_6i6peoy", "treeSvg", ["branchAngles","lengthDecay","trunkLength","branchThickness","htl","anchor"], _6i6peoy);  
  $def("_16z8hf2", "viewof branchAngles", ["vector"], _16z8hf2);  
  $def("_ba_get", "branchAngles", ["Generators","viewof branchAngles"], _ba_get);  
  $def("_1oco7nj", "viewof lengthDecay", ["Inputs"], _1oco7nj);  
  $def("_ld_get", "lengthDecay", ["Generators","viewof lengthDecay"], _ld_get);  
  $def("_coyzcc", "viewof branchThickness", ["Inputs"], _coyzcc);  
  $def("_bt_get", "branchThickness", ["Generators","viewof branchThickness"], _bt_get);  
  $def("_6j9pvkk", "treeEditor", ["svgEditor","newsletter"], _6j9pvkk);  
  $def("_a7vhrh2", null, ["md","externalLink","aside"], _a7vhrh2);  
  $def("_9ablttp", "_9ablttp", ["html","lite_youtube_css"], _9ablttp);  
  $def("_folmnyd", "_folmnyd", ["md"], _folmnyd);  
  $def("_33e9fup", null, ["html"], _33e9fup);  
  $def("_mp797yc", null, ["md","externalLink"], _mp797yc);  
  $def("_ckngqf2", "_ckngqf2", ["html"], _ckngqf2);  
  $def("_1q3uajj", null, ["md","externalLink"], _1q3uajj);  
  $def("_y25k9yr", null, ["md","aside","externalLink"], _y25k9yr);  
  $def("_vjga0cn", "aside", ["html"], _vjga0cn);  
  $def("_y0e9f5b", "external_link_svg", ["svg"], _y0e9f5b);  
  $def("_12fhni2", "externalLink", ["external_link_svg","htl"], _12fhni2);  
  $def("_624q5r", "_qnu24wi", ["apply_theme"], _624q5r);  
  $def("_hs3ji3", "header_styles", ["htl"], _hs3ji3);  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_7bg6ng7", "viewof newsletter", ["thisModule"], _7bg6ng7);  
  $def("_niqhnxx", "newsletter", ["Generators","viewof newsletter"], _niqhnxx);  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("module @tomlarkworthy/parametric-svg", async () => runtime.module((await import("/@tomlarkworthy/parametric-svg.js?v=4")).default));  
  main.define("svgEditor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("svgEditor", _));  
  main.define("anchor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("anchor", _));  
  main.define("module @tomlarkworthy/themes", async () => runtime.module((await import("/@tomlarkworthy/themes.js?v=4")).default));  
  main.define("viewof theme_assets", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("viewof theme_assets", _));  
  main.define("current_theme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("current_theme", _));  
  main.define("themes", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("themes", _));  
  main.define("apply_theme", ["module @tomlarkworthy/themes", "@variable"], (_, v) => v.import("apply_theme", _));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));  
  main.define("module @tomlarkworthy/lite-youtube-embed", async () => runtime.module((await import("/@tomlarkworthy/lite-youtube-embed.js?v=4")).default));  
  main.define("lite_youtube_css", ["module @tomlarkworthy/lite-youtube-embed", "@variable"], (_, v) => v.import("lite_youtube_css", _));  
  main.define("vector", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("vector", _));
  return main;
}