const _63mt5v = function _anonymous(md) {return (md`# justbash 🐚

A sandboxed **bash environment inside a notebook**, built on [just-bash](https://justbash.dev). Two shells share one in-memory filesystem — one for you, one for an LLM — so an agent can manipulate files with ordinary shell commands while you watch and join in. No host access, no \`eval\`: just-bash *parses* bash and runs ~80 coreutils-style commands against a virtual fs.`);};
const _1r9kr44 = function _workspace(createWorkspace) {return (createWorkspace({
    '/project/README.md': '# demo project\n\nEdit me from either shell \u2014 both see the same files.\n',
    '/project/data/users.csv': 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCarol,41,SF\n',
    '/project/notes.txt': 'todo: count the users\ntodo: greet the world\n'
}, { cwd: '/project' }));};
const _ajjwu0 = function _userShell(workspace) {return (workspace.spawn({
    label: 'you',
    cwd: '/project'
}));};
const _1fq9hza = function _agentShell(workspace) {return (workspace.spawn({
    label: 'agent',
    cwd: '/project'
}));};
const _1wt5x0w = function _fileBrowser() {return (function fileBrowser(workspace, opts = {}) {
    const SYS = [
        '/bin',
        '/usr',
        '/dev',
        '/proc',
        '/etc',
        '/tmp',
        '/var',
        '/root',
        '/home'
    ];
    const isUser = p => p !== '/' && !SYS.some(s => p === s || p.startsWith(s + '/'));
    if (!document.getElementById('jb-files-style')) {
        const s = document.createElement('style');
        s.id = 'jb-files-style';
        s.textContent = `
.jb-files{display:flex;flex-direction:column;height:100%;min-height:200px;background:#0d1117;color:#c9d1d9;
  font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;border:1px solid #30363d;border-radius:8px;overflow:hidden}
.jb-files-header{padding:5px 10px;background:#161b22;border-bottom:1px solid #30363d;color:#8b949e;font-size:11px;
  text-transform:uppercase;letter-spacing:.04em}
.jb-files-body{flex:1 1 auto;display:flex;min-height:0}
.jb-files-list{flex:0 0 45%;overflow:auto;border-right:1px solid #21262d;padding:4px 0}
.jb-files-preview{flex:1 1 auto;overflow:auto;padding:8px 10px;white-space:pre-wrap;word-break:break-word;color:#c9d1d9}
.jb-file{padding:2px 10px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
.jb-file:hover{background:#161b22}
.jb-file.sel{background:#1f6feb33}
.jb-file .sz{color:#6e7681}
.jb-file.dir .nm{color:#79c0ff}
.jb-empty{color:#6e7681;padding:8px 10px}`;
        document.head.appendChild(s);
    }
    const header = document.createElement('div');
    header.className = 'jb-files-header';
    header.textContent = 'shared filesystem';
    const list = document.createElement('div');
    list.className = 'jb-files-list';
    const preview = document.createElement('pre');
    preview.className = 'jb-files-preview';
    preview.textContent = 'select a file \u2192';
    const body = document.createElement('div');
    body.className = 'jb-files-body';
    body.append(list, preview);
    const root = document.createElement('div');
    root.className = 'jb-files';
    root.append(header, body);
    let selected = null;
    const showPreview = async path => {
        selected = path;
        try {
            preview.textContent = await workspace.fs.readFile(path) || '(empty)';
        } catch (e) {
            preview.textContent = String(e.message || e);
        }
        for (const n of list.children)
            n.classList.toggle('sel', n.dataset.path === path);
    };
    const render = async () => {
        const fs = workspace.fs;
        const dirs = new Set(), files = [];
        for (const p of fs.getAllPaths()) {
            if (!isUser(p))
                continue;
            let st;
            try {
                st = await fs.stat(p);
            } catch (e) {
                continue;
            }
            if (st.isDirectory)
                dirs.add(p);
            else
                files.push({
                    p,
                    size: st.size
                });
        }
        const rows = [
            ...[...dirs].sort().map(p => ({
                p,
                dir: true
            })),
            ...files.sort((a, b) => a.p.localeCompare(b.p))
        ];
        list.textContent = '';
        if (!rows.length) {
            const e = document.createElement('div');
            e.className = 'jb-empty';
            e.textContent = '(no files yet)';
            list.append(e);
        }
        for (const r of rows) {
            const row = document.createElement('div');
            row.className = 'jb-file' + (r.dir ? ' dir' : '');
            row.dataset.path = r.p;
            const nm = document.createElement('span');
            nm.className = 'nm';
            nm.textContent = (r.dir ? '\uD83D\uDCC1 ' : '\uD83D\uDCC4 ') + r.p;
            const sz = document.createElement('span');
            sz.className = 'sz';
            sz.textContent = r.dir ? '' : r.size + 'b';
            row.append(nm, sz);
            if (r.p === selected)
                row.classList.add('sel');
            if (!r.dir)
                row.addEventListener('click', () => showPreview(r.p));
            list.append(row);
        }
        if (selected && files.some(f => f.p === selected))
            showPreview(selected);
    };
    render();
    workspace.onChange(() => render());
    workspace.onSpawn(() => render());
    return root;
});};
const _108lpss = function _app(terminal,userShell,agentShell,fileBrowser,workspace) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:340px 260px;gap:10px;max-width:980px';
    const you = terminal(userShell, { title: 'you \u2014 type commands here' });
    const agent = terminal(agentShell, { title: 'agent \u2014 driven via window.justbash' });
    const files = fileBrowser(workspace);
    files.style.gridColumn = '1 / 3';
    grid.append(you, agent, files);
    return grid;
};
const _fu6qo5 = function _justbashBridge(workspace,userShell,agentShell,formatResult) {
    const api = {
        workspace,
        shells: {
            you: userShell,
            agent: agentShell
        },
        // Run a command on the agent shell (default) and get LLM-friendly text back.
        async run(cmd, shell = agentShell) {
            return formatResult(await shell.run(cmd));
        },
        // Raw ExecResult {stdout, stderr, exitCode, env}.
        async exec(cmd, shell = agentShell) {
            return shell.run(cmd);
        },
        read: path => workspace.fs.readFile(path),
        write: (path, content) => workspace.fs.writeFile(path, content),
        ls: (path = '/project') => workspace.fs.readdir(path),
        snapshot: () => workspace.snapshot()
    };
    window.justbash = api;
    const panel = document.createElement('div');
    panel.style.cssText = 'max-width:980px;border:1px solid #30363d;border-radius:8px;padding:12px 14px;background:#0d1117;color:#c9d1d9;font:13px/1.6 ui-monospace,Menlo,monospace';
    const h = document.createElement('div');
    h.style.cssText = 'color:#7ee787;margin-bottom:6px';
    h.textContent = '\u25CF window.justbash is live \u2014 an agent on the pairing channel can drive the right-hand shell';
    const last = document.createElement('div');
    last.style.cssText = 'color:#8b949e;min-height:1.6em';
    last.textContent = 'last agent command: \u2014';
    agentShell.onChange(ev => {
        if (ev.type === 'done')
            last.textContent = 'last agent command: ' + ev.entry.cmdline + '  [exit ' + ev.entry.exitCode + ']';
    });
    panel.append(h, last);
    return panel;
};
const _rnlbp3 = function _anonymous(md) {return (md`## Connecting an LLM

The interface is just the runtime. The bridge above publishes \`window.justbash\`, so an agent paired through the **claude-code-pairing** channel drives the shell with one \`eval_code\` call:

\`\`\`js
await window.justbash.run("cd /project && wc -l data/users.csv")
// → "4 data/users.csv"
\`\`\`

Because the terminal renders from the *session's* events, every command the agent runs appears in the right-hand terminal in real time — the human sees exactly what the agent did, and can reply in the left-hand shell over the same files. Other entry points on \`window.justbash\`:

| call | does |
|---|---|
| \`run(cmd, shell?)\` | run a command, get LLM-friendly text |
| \`exec(cmd, shell?)\` | raw \`{stdout, stderr, exitCode}\` |
| \`read(path)\` / \`write(path, txt)\` | direct fs access |
| \`ls(path)\` / \`snapshot()\` | list a dir / dump the whole tree |
| \`shells.you\` / \`shells.agent\` | the two sessions |

This is the idiomatic shape for lopecode: no bespoke transport, no API keys in the notebook — the agent already has an \`eval_code\` channel, and the shell is just an object on \`window\`.`);};
const _7379vm = function _anonymous(md) {return (md`## How it works

Three modules, each doing one thing:

- [**@tomlarkworthy/just-bash**](@tomlarkworthy/just-bash) — *engine*. Loads the just-bash browser build and re-exports \`Bash\`, \`InMemoryFs\`, \`MountableFs\`. ~80 commands, no host access.
- [**@tomlarkworthy/justbash-session**](@tomlarkworthy/justbash-session) — *state*. \`createSession\` turns just-bash's stateless \`exec\` into a shell with persistent \`cwd\`/\`env\`; \`createWorkspace\` is one filesystem shared by many sessions and an aggregate event bus.
- [**@tomlarkworthy/justbash-terminal**](@tomlarkworthy/justbash-terminal) — *view*. \`terminal(session)\` is a readline DOM widget that renders from session events.

This notebook composes them: one \`workspace\`, two shells (\`you\` + \`agent\`), two terminals, a reactive file browser, and the \`window.justbash\` bridge. A write in either shell is instantly visible to the other and to the browser — that is "multiple shells over a common filesystem".

\`\`\`
                 ┌─────────────┐   eval_code   ┌──────────┐
   you (kbd) ───▶│ userShell   │◀──────────────│   LLM    │
                 │             │               └────┬─────┘
                 │  workspace  │   window.justbash  │
   agent ───────▶│  (InMemoryFs)│◀─────────────────┘
                 └──────┬──────┘
                        ▼
                 file browser + terminals (render from session events)
\`\`\``);};
const _20tt5b = function _anonymous(md) {return (md`## Imports`);};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_63mt5v", null, ["md"], _63mt5v);  
  $def("_1r9kr44", "workspace", ["createWorkspace"], _1r9kr44);  
  $def("_ajjwu0", "userShell", ["workspace"], _ajjwu0);  
  $def("_1fq9hza", "agentShell", ["workspace"], _1fq9hza);  
  $def("_1wt5x0w", "fileBrowser", [], _1wt5x0w);  
  $def("_108lpss", "app", ["terminal","userShell","agentShell","fileBrowser","workspace"], _108lpss);  
  $def("_fu6qo5", "justbashBridge", ["workspace","userShell","agentShell","formatResult"], _fu6qo5);  
  $def("_rnlbp3", null, ["md"], _rnlbp3);  
  $def("_7379vm", null, ["md"], _7379vm);  
  $def("_20tt5b", null, ["md"], _20tt5b);  
  main.define("module @tomlarkworthy/justbash-session", async () => runtime.module((await import("/@tomlarkworthy/justbash-session.js?v=4")).default));  
  main.define("module @tomlarkworthy/justbash-terminal", async () => runtime.module((await import("/@tomlarkworthy/justbash-terminal.js?v=4")).default));
  main.define("createWorkspace", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("createWorkspace", _));
  main.define("formatResult", ["module @tomlarkworthy/justbash-session", "@variable"], (_, v) => v.import("formatResult", _));
  main.define("terminal", ["module @tomlarkworthy/justbash-terminal", "@variable"], (_, v) => v.import("terminal", _));
  return main;
}