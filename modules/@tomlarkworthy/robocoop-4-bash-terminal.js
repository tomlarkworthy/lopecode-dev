const _1tl38vm = function _anonymous(md) {return (md`# @tomlarkworthy/robocoop-4-bash-terminal

A line-oriented terminal widget over a [\`justbash-session\`](@tomlarkworthy/robocoop-4-bash-session). just-bash is batch \`exec\` (no PTY/streaming), so the natural UI is readline: type a command, press Enter, see the result.

\`terminal(session, {title})\` returns a DOM element. It renders **purely from the session's change events**, so commands an LLM runs through the same session show up in the terminal exactly like the ones a human types. Command output is written with \`textContent\` (never \`innerHTML\`) so program output can't inject markup. ↑/↓ walk history; the prompt tracks the live \`cwd\`.`);};
const _usttt7 = function _terminal() {return (function terminal(session, opts = {}) {
    if (!document.getElementById('jb-term-style')) {
        const s = document.createElement('style');
        s.id = 'jb-term-style';
        s.textContent = `
.jb-term{display:flex;flex-direction:column;height:100%;min-height:240px;background:#0d1117;color:#c9d1d9;
  font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border:1px solid #30363d;border-radius:8px;overflow:hidden}
.jb-term-header{flex:0 0 auto;padding:5px 10px;background:#161b22;border-bottom:1px solid #30363d;color:#8b949e;font-size:11px;
  letter-spacing:.04em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
.jb-term-scroll{flex:1 1 auto;overflow:auto;padding:8px 10px;white-space:pre-wrap;word-break:break-word;user-select:text;-webkit-user-select:text;cursor:text}
.jb-block{margin:0 0 2px}
.jb-cmd{color:#e6edf3}
.jb-ps1-mini{color:#7ee787}
.jb-term .jb-out{margin:0 0 6px;padding:0;border:0;border-radius:0;background:none;color:inherit;white-space:pre-wrap;word-break:break-word;font:inherit}
.jb-err{color:#ff7b72}
.jb-exit{color:#d29922}
.jb-term-row{flex:0 0 auto;display:flex;align-items:center;padding:6px 10px;border-top:1px solid #21262d;background:#0d1117}
.jb-term-ps1{color:#7ee787;white-space:pre}
.jb-term-input{flex:1 1 auto;background:transparent;border:0;outline:0;color:#e6edf3;font:inherit;padding:0}
`;
        document.head.appendChild(s);
    }
    const header = document.createElement('div');
    header.className = 'jb-term-header';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = opts.title || 'shell ' + (session.label || session.id);
    const hint = document.createElement('span');
    hint.textContent = '\u2191\u2193 history';
    header.append(titleSpan, hint);
    const scroll = document.createElement('div');
    scroll.className = 'jb-term-scroll';
    const ps1Label = document.createElement('span');
    ps1Label.className = 'jb-term-ps1';
    const input = document.createElement('input');
    input.className = 'jb-term-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'shell input');
    const row = document.createElement('div');
    row.className = 'jb-term-row';
    row.append(ps1Label, input);
    const root = document.createElement('div');
    root.className = 'jb-term';
    root.append(header, scroll, row);
    const ps1For = cwd => (session.label ? session.label + ':' : '') + cwd + ' $ ';
    const refreshPrompt = () => {
        ps1Label.textContent = ps1For(session.cwd);
    };
    const atBottom = () => scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40;
    const toBottom = () => {
        scroll.scrollTop = scroll.scrollHeight;
    };
    const nodes = new WeakMap();
    const renderStart = entry => {
        const stick = atBottom();
        const block = document.createElement('div');
        block.className = 'jb-block';
        const cmdLine = document.createElement('div');
        cmdLine.className = 'jb-cmd';
        const ps = document.createElement('span');
        ps.className = 'jb-ps1-mini';
        ps.textContent = ps1For(entry.cwdBefore);
        const cmd = document.createElement('span');
        cmd.textContent = entry.cmdline;
        cmdLine.append(ps, cmd);
        const out = document.createElement('pre');
        out.className = 'jb-out';
        block.append(cmdLine, out);
        nodes.set(entry, out);
        scroll.append(block);
        if (stick)
            toBottom();
    };
    const renderDone = entry => {
        const out = nodes.get(entry);
        if (!out)
            return;
        const stick = atBottom();
        out.textContent = '';
        if (entry.stdout) {
            const s = document.createElement('span');
            s.textContent = entry.stdout;
            out.append(s);
        }
        if (entry.stderr) {
            const s = document.createElement('span');
            s.className = 'jb-err';
            s.textContent = entry.stderr;
            out.append(s);
        }
        if (entry.exitCode !== 0) {
            const s = document.createElement('span');
            s.className = 'jb-exit';
            s.textContent = `[exit ${ entry.exitCode }]`;
            out.append(s);
        }
        if (!out.childNodes.length)
            out.remove();
        refreshPrompt();
        if (stick)
            toBottom();
    };
    for (const e of session.transcript) {
        renderStart(e);
        if (!e.running)
            renderDone(e);
    }
    refreshPrompt();
    session.onChange(ev => ev.type === 'start' ? renderStart(ev.entry) : renderDone(ev.entry));
    const hist = [];
    let hi = -1;
    input.addEventListener('keydown', async e => {
        if (e.key === 'Enter') {
            const line = input.value;
            if (!line.trim()) {
                input.value = '';
                return;
            }
            hist.push(line);
            hi = hist.length;
            input.value = '';
            input.disabled = true;
            try {
                await session.run(line);
            } finally {
                input.disabled = false;
                input.focus();
            }
        } else if (e.key === 'ArrowUp') {
            if (hi > 0) {
                hi--;
                input.value = hist[hi];
            }
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (hi < hist.length - 1) {
                hi++;
                input.value = hist[hi];
            } else {
                hi = hist.length;
                input.value = '';
            }
            e.preventDefault();
        }
    });
    root.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT')
            return;
        if (window.getSelection && String(window.getSelection()))
            return;
        input.focus();
    });
    root.addEventListener('paste', e => {
        const cd = e.clipboardData || window.clipboardData;
        if (!cd)
            return;
        const text = cd.getData('text');
        if (text == null)
            return;
        e.preventDefault();
        const oneLine = text.replace(/\r?\n/g, ' ').replace(/\s+$/, '');
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        input.value = input.value.slice(0, start) + oneLine + input.value.slice(end);
        const caret = start + oneLine.length;
        input.focus();
        input.setSelectionRange(caret, caret);
    });
    return root;
});};
const _1r6ujjx = function _demoTerminal(createWorkspace,terminal) {
    const ws = createWorkspace({ '/welcome.txt': 'justbash-terminal \u2014 try:\n  ls -la\n  cat welcome.txt\n  echo hello | rev\n  seq 1 100 | awk \'{s+=$1} END{print s}\'\n  mkdir notes && cd notes && pwd\n' });
    const sh = ws.spawn({
        label: 'demo',
        cwd: '/'
    });
    const el = terminal(sh, { title: 'justbash-terminal demo' });
    el.style.height = '320px';
    return el;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1tl38vm", null, ["md"], _1tl38vm);  
  $def("_usttt7", "terminal", [], _usttt7);  
  main.define("module @tomlarkworthy/robocoop-4-bash-session", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-bash-session.js?v=4")).default));  
  main.define("createWorkspace", ["module @tomlarkworthy/robocoop-4-bash-session", "@variable"], (_, v) => v.import("createWorkspace", _));  
  $def("_1r6ujjx", "demoTerminal", ["createWorkspace","terminal"], _1r6ujjx);
  return main;
}