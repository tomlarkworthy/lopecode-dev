const _1mp2lj3 = () => 1;
const _iq33xi = function _anonymous(md) {return (md`# @tomlarkworthy/robocoop-4-bash-session

Turns just-bash's *stateless* \`exec\` into *stateful shell sessions* that share a common filesystem.

just-bash isolates every \`exec()\` call: \`cd\`, \`export\`, and shell functions do **not** persist between calls — only filesystem writes do. An interactive shell needs persistence, so a session tracks \`cwd\` and \`env\` in JS and threads them through each call. After a command, the new working directory is read back from the returned \`env.PWD\` and the full env is carried forward.

A **workspace** is one \`InMemoryFs\` with any number of sessions over it — that is how "multiple shells over a common filesystem" works: a write in one shell is immediately visible to \`ls\`/\`cat\` in another.`);};
const _r6rzfi = function _createSession(InMemoryFs,Bash) {return (function createSession(fs = new InMemoryFs(), opts = {}) {
    const shell = new Bash({
        fs,
        cwd: opts.cwd || '/',
        env: opts.env || {}
    });
    let state = {
        cwd: opts.cwd || '/',
        env: { ...opts.env || {} }
    };
    const transcript = [];
    const listeners = new Set();
    const emit = ev => {
        for (const l of listeners)
            try {
                l(ev);
            } catch (e) {
            }
    };
    const session = {
        id: opts.id || 'sh-' + Math.random().toString(36).slice(2, 7),
        label: opts.label || null,
        fs,
        transcript,
        get cwd() {
            return state.cwd;
        },
        get env() {
            return state.env;
        },
        // Subscribe to {type:"start"|"done", entry, session}. Returns an unsubscribe fn.
        onChange(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        // Run a command line, persisting cwd + env for the next call. Resolves to the
        // just-bash ExecResult {stdout, stderr, exitCode, env}.
        async run(cmdline) {
            const entry = {
                cmdline,
                cwdBefore: state.cwd,
                ts: Date.now(),
                running: true
            };
            transcript.push(entry);
            emit({
                type: 'start',
                entry,
                session
            });
            let res;
            try {
                res = await shell.exec(cmdline, {
                    cwd: state.cwd,
                    env: state.env
                });
            } catch (err) {
                res = {
                    stdout: '',
                    stderr: err && err.message || String(err),
                    exitCode: 1,
                    env: state.env
                };
            }
            if (res.env)
                state = {
                    cwd: res.env.PWD || state.cwd,
                    env: res.env
                };
            Object.assign(entry, {
                stdout: res.stdout,
                stderr: res.stderr,
                exitCode: res.exitCode,
                cwdAfter: state.cwd,
                running: false
            });
            emit({
                type: 'done',
                entry,
                session
            });
            return res;
        }
    };
    return session;
});};
const _mboepg = function _createWorkspace(InMemoryFs,createSession) {return (function createWorkspace(initialFiles = {}, opts = {}) {
    const fs = new InMemoryFs(initialFiles);
    const sessions = [];
    const spawnListeners = new Set();
    const changeListeners = new Set();
    const emitSpawn = ev => {
        for (const l of spawnListeners)
            try {
                l(ev);
            } catch (e) {
            }
    };
    const emitChange = ev => {
        for (const l of changeListeners)
            try {
                l(ev);
            } catch (e) {
            }
    };
    return {
        fs,
        sessions,
        // New session created: {type:"spawn", session}.
        onSpawn(fn) {
            spawnListeners.add(fn);
            return () => spawnListeners.delete(fn);
        },
        // Aggregated command events from every session over this fs: {type:"start"|"done", entry, session}.
        onChange(fn) {
            changeListeners.add(fn);
            return () => changeListeners.delete(fn);
        },
        // Open a new shell over the shared filesystem.
        spawn(sessionOpts = {}) {
            const s = createSession(fs, {
                cwd: opts.cwd || '/',
                ...sessionOpts
            });
            s.onChange(ev => emitChange(ev));
            sessions.push(s);
            emitSpawn({
                type: 'spawn',
                session: s
            });
            return s;
        },
        // Read the whole tree as {path: contents} — handy for syncing fs ⇄ notebook.
        async snapshot() {
            const out = {};
            for (const p of fs.getAllPaths()) {
                try {
                    const st = await fs.stat(p);
                    if (st.isFile)
                        out[p] = await fs.readFile(p);
                } catch (e) {
                }
            }
            return out;
        }
    };
});};
const _z3qrf1 = function _formatResult() {return (function formatResult(res) {
    // Render an ExecResult the way you'd feed it back to an LLM: stdout, then any
    // stderr, then a non-zero exit note. Trailing newline trimmed for compactness.
    const parts = [];
    if (res.stdout)
        parts.push(res.stdout.replace(/\n$/, ''));
    if (res.stderr)
        parts.push(res.stderr.replace(/\n$/, ''));
    let text = parts.join('\n');
    if (res.exitCode !== 0)
        text += (text ? '\n' : '') + `[exit ${ res.exitCode }]`;
    return text || '(no output)';
});};
const _7jyfck = async function _sessionSmoke(createWorkspace,formatResult) {
    const ws = createWorkspace({ '/work/readme.md': '# shared\n' });
    const a = ws.spawn({
        cwd: '/work',
        label: 'A'
    });
    const b = ws.spawn({
        cwd: '/work',
        label: 'B'
    });
    await a.run('mkdir -p logs && cd logs');
    // cd persists across calls
    const pwd = await a.run('pwd');
    // -> /work/logs
    await a.run('echo \'hi from A\' > /work/note.txt');
    const seen = await b.run('cat note.txt');
    // B sees A's write
    return {
        persistentCwd: a.cwd,
        pwdOutput: pwd.stdout.trim(),
        bReadsAfile: formatResult(seen),
        sharedFiles: ws.fs.getAllPaths().filter(p => p.startsWith('/work'))
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1mp2lj3", "__seed", [], _1mp2lj3);  
  $def("_iq33xi", null, ["md"], _iq33xi);  
  main.define("module @tomlarkworthy/robocoop-4-bash", async () => runtime.module((await import("/@tomlarkworthy/robocoop-4-bash.js?v=4")).default));  
  main.define("Bash", ["module @tomlarkworthy/robocoop-4-bash", "@variable"], (_, v) => v.import("Bash", _));  
  main.define("InMemoryFs", ["module @tomlarkworthy/robocoop-4-bash", "@variable"], (_, v) => v.import("InMemoryFs", _));  
  $def("_r6rzfi", "createSession", ["InMemoryFs","Bash"], _r6rzfi);  
  $def("_mboepg", "createWorkspace", ["InMemoryFs","createSession"], _mboepg);  
  $def("_z3qrf1", "formatResult", [], _z3qrf1);  
  $def("_7jyfck", "sessionSmoke", ["createWorkspace","formatResult"], _7jyfck);
  return main;
}