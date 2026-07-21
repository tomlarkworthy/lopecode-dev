const _1f8tza = function _1(md){return(
md`# Local Change History

`
)};
const _jueqgn = function _temporal(Inputs){return(
Inputs.select([
  'temporal',
  'discrete'
], {
  label: 'y-axis',
  value: 'discrete'
})
)};
const _d0qi2e = (G, _) => G.input(_);
const _144mq5h = function _rewind(Plot,width,temporal,history,d3,timeline){return(
Plot.plot({
  marginLeft: 200,
  width,
  y: {
    type: temporal == 'temporal' ? 'time' : 'point',
    reverse: true,
    tickFormat: f => new Date(f)
  },
  marks: [
    ...history.length ? [Plot.ruleY([d3.max(history, d => d.t)], { stroke: 'green' })] : [],
    Plot.ruleX(history, {
      x: h => h.pid,
      strokeDasharray: [
        1,
        10
      ]
    }),
    Plot.dot(history, {
      x: h => h.pid,
      y: 't',
      symbol: 'op',
      stroke: h => h.pid,
      channels: {
        name: '_name',
        definition: '_definition'
      },
      tip: {
        format: {
          y: false,
          symbol: true,
          stroke: false,
          x: false,
          name: true
        }
      }
    }),
    Plot.ruleY(temporal == 'temporal' ? timeline : history.map(e => e.t), Plot.pointerY({ stroke: 'red' }))
  ]
})
)};
const _apj797 = (G, _) => G.input(_);
const _1gj4pod = function _selectedChanges(Inputs,history,html){return(
Inputs.table(history, {
  columns: [
    't',
    'op',
    'source',
    '_name',
    '_inputs',
    '_definition'
  ],
  format: {
    t: t => new Date(t).toISOString(),
    _definition: d => d.toString(),
    _inputs: i => html`<details><summary>${ i.length }</summary>${ i.map(i => html`${ i }<br>`) }`,
    source: s => ({
      runtime: '\uD83D\uDCD3',
      git: '\uD83D\uDCBE'
    }[s]),
    op: t => ({
      upd: '\u270D️',
      del: '\u2421',
      new: '\uD83C\uDD95',
      init: '\uD83C\uDFC1'
    }[t])
  },
  layout: 'auto',
  sort: 't',
  reverse: true,
  required: false
})
)};
const _1a64yt8 = (G, _) => G.input(_);
const _1mf9ijy = function _5(rewind,Inputs,rewindToTime,md){return(
rewind ? Inputs.button(`rewind to ${ new Date(rewind).toISOString() }`, { reduce: () => rewindToTime(rewind) }) : md`⚠️ pick a time to rewind`
)};
const _wosvzm = function _6(selectedChanges,Inputs,revertVariables,md){return(
selectedChanges.length ? Inputs.button('revert variables', { reduce: () => revertVariables(selectedChanges) }) : md`⚠️ select some variables to revert individual cells`
)};
const _14zrzgj = function _7(md){return(
md`## History Data Model

The primary data is history with an array of history entries. Each has the following fields.

~~~js
{
  t   // epoch time
  op  // operation: new, del, upd
  pid // variable persistent id (see runtime-sdk, persists across exports)
  source // runtime, module, git
  provenance // additional write metadata

  // Then we serialize new fields on the variable
  _name,      // string or null
  _inputs,    // array of strings
  _definition // is the toString not a live reference
}
~~~
`
)};
const _816qai = function _8(md){return(
md`## Isomorphic Git

Changes are saved to a IndexDB filesystem (lightning-fs) in a git repository (ismorphic-git).

Layout
 - one IndexDB filesystem (lopecode_history)
 - one repository per _notebook_
 - one branch per host \`url\` (e.g. a blob:// in the case of tab forks)
 - one subdirectory per module
 - one file per variable, contents is the \`_definition\`

So, everytime you fork a notebook into a new tab, you create a new host url (branch) and a new history branch.

~~~
lopecode-js
   - repo: notebook1
      branch: blob://984i4opipoi
        dir: /modules/<module>
                - <pid>.js:  (cell definition)
                - <pid>.json (cell metadata: name and inputs)
  
~~~

Git is quite slow to lookup file changes within a commit, so each commit message contains a JSON structured summary of what changed which can be parsed much quicker than accessing the object store.


### Stateless Git

We avoid "checkouts" and other staging concepts because the filesystem is shared across tabs and can therefore clash. 

Two tabs will work on different branches, but they share a IndexDB filesystem, therefore each other's histories are visible.
`
)};
const _j5krmo = function _9(md){return(
md`## Replay and Save Algorithm

On page refresh, the notebook will load in a state that does not have the latest changes, so we need to replay to catch up.

We want to display the full history of all changes, so we also need to scan the git history.

We also want to capture any future changes and save them for git. We have to be careful that we don't accidentally capture our own replays as new changes.


1. Replay latest git values to notebook
   tag definition with provenance (historical timestamp, source: git)
3. Scan git message history to figure out the git sourced change log (including historical timestamps).
4. *add a listener for *new changes* made to the runtime
   - on change, commit to git, if it did not come from git`
)};
const _i8mm9n = function _10(md){return(
md`## Persistent Variable IDs

Variables \`definitions\` are tagged with a persistent id (pid) so we can track what change applies to what variable. This does not work on Observablehq.com, which has a first party history feature anyway. This work only makes sense in the context of [Lopecode](https://github.com/tomlarkworthy/lopecode), if you want to try it out, you can convert his notebook to Lopecode <a href="https://observablehq.com/@tomlarkworthy/jumpgate?source=https://observablehq.com/d/50857b98f55745c3&export_state=%7B%22hash%22%3A%22%23view%3Dd%2F50857b98f55745c3%22%2C%22headless%22%3Atrue%2C%22title%22%3A%22d%2F50857b98f55745c3%22%7D&git_url=https%3A%2F%2Fgithub.com%2Ftomlarkworthy%2Flopecode&load_source=true&commit=false" target="_blank"> with Jumpgate</a>`
)};
const _2tivts = function _11(md){return(
md`## Git Replay

`
)};
const _el289t = async function _git_commits(listCommits,config){return(
(await listCommits(config)).map(v => ({
  ...v,
  summary: JSON.parse(v.commit.message)
}))
)};
const _9rw7im = function _relevant_git_commits(git_commits)
{
  const commits = Array.isArray(git_commits) ? git_commits : [];
  const seen = new Set();
  const keptNewestFirst = [];
  const coercePaths = summary => {
    const out = [];
    const push = v => {
      if (v == null)
        return;
      if (Array.isArray(v))
        for (const x of v)
          push(x);
      else if (typeof v === 'string')
        out.push(v);
    };
    if (Array.isArray(summary)) {
      push(summary);
      return out;
    }
    if (summary && typeof summary === 'object') {
      push(summary.new);
      push(summary.upd);
      push(summary.del);
      return out;
    }
    if (typeof summary === 'string') {
      try {
        return coercePaths(JSON.parse(summary));
      } catch {
        return out;
      }
    }
    return out;
  };
  for (const h of commits) {
    const paths = coercePaths(h?.summary ?? h?.commit?.message).filter(p => typeof p === 'string');
    if (paths.length === 0)
      continue;
    let useful = false;
    for (const p of paths) {
      if (!seen.has(p)) {
        useful = true;
        break;
      }
    }
    if (!useful)
      continue;
    keptNewestFirst.push({
      ...h,
      _paths: paths
    });
    for (const p of paths)
      seen.add(p);
  }
  return keptNewestFirst;
};
const _zgm5j8 = function _notebookCreationTime(git_commits)
{
  const timesSec = (git_commits ?? []).map(h => h?.commit?.committer?.timestamp ?? h?.commit?.author?.timestamp ?? null).filter(t => t != null);
  if (timesSec.length)
    return Math.min(...timesSec) * 1000 - 1000;
  return Date.now() - 1000;
};
const _1j8x1tu = function _parseGitMessage(){return(
function parseGitMessage(message) {
  let payload = message;
  if (typeof payload === 'string')
    payload = JSON.parse(payload);
  const parseGitPath = path => {
    if (typeof path !== 'string')
      throw new Error('parseGitMessage: path must be a string');
    const normalized = path.startsWith('/') ? path : `/${ path }`;
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length < 4)
      throw new Error(`parseGitMessage: path too short to contain notebook/module/pid: ${ path }`);
    const notebook = `/${ parts[0] }/${ parts[1] }`;
    const filename = parts[parts.length - 1];
    const module = parts.slice(2, -1).join('/');
    const m = filename.match(/^(.*?)(?:\.([^.]+))?$/);
    const pid = m?.[1] ?? filename;
    const ext = m?.[2] ?? '';
    return {
      path,
      notebook,
      module,
      pid,
      ext,
      filename
    };
  };
  if (Array.isArray(payload)) {
    return payload.map(p => ({
      ...parseGitPath(p),
      op: 'upd'
    }));
  }
  if (payload && typeof payload === 'object') {
    const out = [];
    const pushAll = (op, arr) => {
      if (arr == null)
        return;
      const list = Array.isArray(arr) ? arr : [arr];
      for (const p of list)
        out.push({
          ...parseGitPath(p),
          op
        });
    };
    pushAll('new', payload.new);
    pushAll('upd', payload.upd);
    pushAll('del', payload.del);
    return out;
  }
  throw new Error('parseGitMessage: unsupported commit message shape (expected array or {new,upd,del})');
}
)};
const _1r7lx5s = function _GitEntry(ensure_repo,git,fs){return(
class GitEntry {
  constructor({repo, branch, oid, pid, module, notebook, op = 'upd', source = 'git', t = null} = {}) {
    if (!repo)
      throw new Error('GitEntry: repo is required');
    if (!branch)
      throw new Error('GitEntry: branch is required');
    if (!oid)
      throw new Error('GitEntry: oid is required');
    if (!pid)
      throw new Error('GitEntry: pid is required');
    if (!module)
      throw new Error('GitEntry: module is required');
    this.repo = repo;
    this.branch = branch;
    this.oid = oid;
    this.pid = pid;
    this.module = module;
    this.notebook = notebook;
    this.op = op;
    this.source = source;
    this.t = t;
    this.__loaded = null;
    this.__loadPromise = null;
  }
  async __readTextAtCommit(filepath) {
    await ensure_repo({ repo: this.repo });
    try {
      const {object} = await git.readObject({
        fs,
        dir: this.repo,
        oid: this.oid,
        filepath
      });
      if (typeof object === 'string')
        return object;
      if (object == null)
        return '';
      if (object instanceof Uint8Array)
        return new TextDecoder('utf-8').decode(object);
      if (ArrayBuffer.isView(object))
        return new TextDecoder('utf-8').decode(object);
      if (object instanceof ArrayBuffer)
        return new TextDecoder('utf-8').decode(new Uint8Array(object));
      return String(object);
    } catch (err) {
      const msg = err?.message || '';
      const code = err?.code || err?.name || '';
      if (code === 'NotFoundError' || code === 'ResolveRefError' || msg.includes('ENOENT') || msg.includes('NotFoundError'))
        return '';
      throw err;
    }
  }
  async __load() {
    const base = `${ this.module }/${ this.pid }`;
    const [jsSrc, jsonSrc] = await Promise.all([
      this.__readTextAtCommit(`${ base }.js`),
      this.__readTextAtCommit(`${ base }.json`)
    ]);
    let meta = {};
    try {
      meta = jsonSrc ? JSON.parse(jsonSrc) : {};
    } catch {
      meta = {};
    }
    return {
      _name: meta?.name ?? null,
      _inputs: Array.isArray(meta?.inputs) ? meta.inputs : [],
      _definition: jsSrc || '',
      _js: jsSrc,
      _json: jsonSrc
    };
  }
  _ensureLoaded() {
    if (this.__loaded)
      return Promise.resolve(this.__loaded);
    if (!this.__loadPromise)
      this.__loadPromise = this.__load().then(d => this.__loaded = d);
    return this.__loadPromise;
  }
  get _name() {
    return this._ensureLoaded().then(d => d._name);
  }
  get _inputs() {
    return this._ensureLoaded().then(d => d._inputs);
  }
  get _definition() {
    return this._ensureLoaded().then(d => d._definition);
  }
  materialize() {
    return this._ensureLoaded().then(d => ({
      source: this.source,
      op: this.op,
      t: this.t,
      pid: this.pid,
      module: this.module,
      notebook: this.notebook,
      oid: this.oid,
      repo: this.repo,
      branch: this.branch,
      _name: d._name,
      _inputs: d._inputs,
      _definition: d._definition
    }));
  }
}
)};
const _yngfrp = function _replay_pid_map(){return(
new Map()
)};
const _19c2k49 = function _replayGitEntries(modules,getVariableByPersistentId,runtime,replay_pid_map,GitEntry,realize,tag){return(
async function replayGitEntries(gitEntries, {
  defaultModule = 'main'
} = {}) {
  const entries = Array.isArray(gitEntries) ? gitEntries : [];
  const moduleByName = new Map();
  if (modules instanceof Map)
    for (const [m, meta] of modules)
      if (meta?.name)
        moduleByName.set(meta.name, m);
  const defaultRuntimeModule = moduleByName.get(defaultModule) ?? moduleByName.get('main') ?? (modules instanceof Map ? modules.keys().next().value : null) ?? null;
  const ensureVariable = (pid, moduleName) => {
    const existing = getVariableByPersistentId(pid, runtime) ?? replay_pid_map.get(pid) ?? null;
    if (existing)
      return {
        variable: existing,
        created: false,
        module: null
      };
    const mod = moduleByName.get(moduleName) ?? defaultRuntimeModule;
    if (!mod)
      return {
        variable: null,
        created: false,
        module: null,
        reason: 'module not found'
      };
    const v = mod.variable();
    replay_pid_map.set(pid, v);
    return {
      variable: v,
      created: true,
      module: mod
    };
  };
  const results = [];
  for (const e0 of entries) {
    const e = e0 instanceof GitEntry ? e0 : null;
    if (!e) {
      results.push({
        ok: false,
        reason: 'not a GitEntry',
        entry: e0
      });
      continue;
    }
    const pid = e.pid ?? null;
    const op = e.op ?? 'upd';
    const moduleName = e.module ?? defaultModule;
    if (!pid) {
      results.push({
        ok: false,
        op,
        reason: 'missing pid',
        entry: e
      });
      continue;
    }
    if (op === 'del') {
      const v = getVariableByPersistentId(pid, runtime) ?? replay_pid_map.get(pid) ?? null;
      if (v) {
        try {
          v.delete?.();
          replay_pid_map.delete(pid);
          results.push({
            ok: true,
            pid,
            op,
            action: 'delete',
            had: true
          });
        } catch (err) {
          results.push({
            ok: false,
            pid,
            op,
            action: 'delete',
            had: true,
            reason: String(err?.message ?? err)
          });
        }
      } else {
        results.push({
          ok: true,
          pid,
          op,
          action: 'delete',
          had: false
        });
      }
      continue;
    }
    const {
      variable,
      created,
      reason: createReason
    } = ensureVariable(pid, moduleName);
    if (!variable) {
      results.push({
        ok: false,
        pid,
        op,
        reason: createReason ?? 'could not create/locate variable',
        module: moduleName
      });
      continue;
    }
    let mat;
    try {
      mat = await e.materialize();
    } catch (err) {
      results.push({
        ok: false,
        pid,
        op,
        reason: 'materialize failed: ' + String(err?.message ?? err),
        module: moduleName
      });
      continue;
    }
    let defRaw = null;
    try {
      defRaw = (await realize([mat?._definition ?? ''], runtime))[0] ?? null;
    } catch {
      defRaw = null;
    }
    if (!defRaw) {
      results.push({
        ok: false,
        pid,
        op,
        reason: 'could not realize definition',
        module: moduleName
      });
      continue;
    }
    const prov = {
      source: e.source ?? 'git',
      repo: e.repo ?? null,
      branch: e.branch ?? null,
      oid: e.oid ?? null,
      t: e.t ?? mat?.t ?? Date.now(),
      pid
    };
    const def = tag(defRaw, prov);
    const name = ((typeof mat?._name === 'string' && mat._name.length) ? mat._name : null) ?? pid;
    const inputs = Array.isArray(mat?._inputs) ? mat._inputs : [];
    try {
      variable.define(name, inputs, def);
      results.push({
        ok: true,
        pid,
        op,
        action: 'define',
        name,
        inputs,
        module: moduleName,
        created
      });
    } catch (err) {
      results.push({
        ok: false,
        pid,
        op,
        action: 'define',
        name,
        inputs,
        module: moduleName,
        created,
        reason: String(err?.message ?? err)
      });
    }
  }
  return results;
}
)};
const _7hpmkx = function _replayGitCommits(config,parseGitMessage,moduleBaseHash,GitEntry,replayGitEntries){return(
async function replayGitCommits(commits, {repo = config?.repo, branch = config?.branch, order = 'oldest-first'} = {}) {
  const list = Array.isArray(commits) ? commits : [];
  const ordered = order === 'newest-first' ? list.slice() : order === 'oldest-first' ? list.slice().reverse() : list.slice();
  const entries = [];
  const skippedModules = new Set();
  for (const h of ordered) {
    const msg = h?.commit?.message ?? h?.summary ?? null;
    if (!msg)
      continue;
    let parsed;
    let rawPayload;
    try {
      rawPayload = typeof msg === 'string' ? JSON.parse(msg) : msg;
      parsed = parseGitMessage(msg);
    } catch {
      continue;
    }
    const baseHashes = rawPayload?.baseHashes ?? null;
    const byPid = new Map();
    for (const p of parsed)
      if (p?.pid)
        byPid.set(p.pid, p);
    const tsSec = h?.commit?.committer?.timestamp ?? h?.commit?.author?.timestamp ?? null;
    const ts = tsSec == null ? null : tsSec * 1000;
    for (const p of byPid.values()) {
      const moduleName = p.module ?? 'main';
      if (baseHashes && baseHashes[moduleName]) {
        const currentHash = moduleBaseHash(moduleName);
        if (!currentHash || currentHash !== baseHashes[moduleName]) {
          if (!skippedModules.has(moduleName)) {
            skippedModules.add(moduleName);
            console.log(`[local-change-history] Skipping replay for module "${ moduleName }" — base changed or module absent`);
          }
          continue;
        }
      }
      entries.push(new GitEntry({
        source: 'git',
        op: p.op ?? 'upd',
        repo,
        branch,
        oid: h?.oid ?? 'HEAD',
        pid: p.pid,
        module: moduleName,
        notebook: p.notebook,
        t: ts
      }));
    }
  }
  return replayGitEntries(entries);
}
)};
const _1ail6g2 = function _replay_git(isOnObservableCom,modules,replayGitCommits,relevant_git_commits)
{
  if (isOnObservableCom())
    return [];
  // doesn't work on Observablehq
  modules;
  return replayGitCommits(relevant_git_commits, { order: 'oldest-first' });
};
const _1rm7oy4 = function _21(md){return(
md`## IndexDB State Explorer`
)};
const _m77twl = function _22(Inputs,exportToZip,fs,config,getCompactISODate){return(
Inputs.button('download git zip', {
  reduce: async () => {
    const zip = await exportToZip({
      fs,
      dir: config.repo
    });
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_${ getCompactISODate() }.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
})
)};
const _1ax2z4b = function _repos(listRepos){return(
listRepos()
)};
const _1lmwwtp = function _branches(listBranches,selected_repo){return(
listBranches({ repo: selected_repo })
)};
const _1qb2kyt = function _selected_files(listFiles,selected_repo,selected_branch){return(
listFiles({
  repo: selected_repo,
  branch: selected_branch
})
)};
const _29j25n = function _26(Inputs,selected_files){return(
Inputs.table(selected_files.map(path => ({ path })))
)};
const _gdsu07 = function _selected_commits(listCommits,selected_repo,selected_branch){return(
listCommits({
  repo: selected_repo,
  branch: selected_branch
})
)};
const _1kqllm6 = function _28(Inputs,selected_commits){return(
Inputs.table(selected_commits, { format: { commit: commit => JSON.stringify(commit, null, 2) } })
)};
const _c6p1xb = function _exportFsToZip(JSZip){return(
async function exportFsToZip({fs, dir} = {}) {
  if (!fs)
    throw new Error('exportFsToZip: fs is required');
  if (!dir)
    throw new Error('exportFsToZip: dir is required');
  if (!JSZip)
    throw new Error('exportFsToZip: JSZip is not available');
  const zip = new JSZip();
  async function walk(currentPath, relPath = '') {
    const names = await fs.readdir(currentPath);
    for (const name of names) {
      if (name === '.' || name === '..')
        continue;
      const fullPath = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
      const childRelPath = relPath ? relPath + '/' + name : name;
      const stat = await fs.stat(fullPath);
      if (stat.type === 'file') {
        const data = await fs.readFile(fullPath);
        zip.file(childRelPath, data);
      } else if (stat.type === 'dir') {
        await walk(fullPath, childRelPath);
      }
    }
  }
  await walk(dir, '');
  return zip.generateAsync({ type: 'blob' });
}
)};
const _z3yxk8 = function _30(md){return(
md`### Git utils`
)};
const _4q2hvf = function _known_dirs(fs){return(
fs && new Set()
)};
const _7uwj8h = function _ensure_dir(known_dirs,fs){return(
async function ensure_dir({dir}) {
  if (known_dirs.has(dir))
    return;
  if (!dir || dir === '/')
    return;
  const lastSlash = dir.lastIndexOf('/');
  const parent = lastSlash > 0 ? dir.slice(0, lastSlash) : '/';
  if (parent && parent !== dir) {
    await ensure_dir({ dir: parent });
  }
  try {
    await fs.mkdir(dir);
  } catch (err) {
    if (!(err && err.message === 'EEXIST')) {
      throw err;
    }
  }
  known_dirs.add(dir);
}
)};
const _1ccskir = function _known_repos(fs){return(
fs && new Set()
)};
const _uyuv0r = function _ensure_repo(known_repos,ensure_dir,git,fs)
{
  return async ({repo, defaultBranch = 'default'}) => {
    if (known_repos.has(repo))
      return;
    await ensure_dir({ dir: repo });
    await git.init({
      fs,
      dir: repo,
      bare: false,
      // We should switch to this but we need to set gitdir everywhere
      defaultBranch
    });
    fs.flush();
    known_repos.add(repo);
  };
};
const _1d8rexx = function _ensure_branch(ensure_repo,listBranches,git,fs){return(
async ({repo, branch, create = true} = {}) => {
  if (!repo)
    throw new Error('ensure_branch: repo is required');
  if (!branch)
    throw new Error('ensure_branch: branch is required');
  await ensure_repo({
    repo,
    defaultBranch: branch
  });
  const branches = await listBranches({ repo });
  const hasBranch = branches.includes(branch);
  if (!hasBranch && create) {
    try {
      await git.branch({
        fs,
        dir: repo,
        ref: 'refs/heads/' + branch,
        checkout: false
      });
    } catch (err) {
      if (err.toString().includes('it already exists'))
        return true;
      throw err;
    }
    return true;
  }
  if (!hasBranch)
    return false;
  return true;
}
)};
const _nind58 = async function _git_repo_layout(config,fs)
{
  const repo = config?.repo ?? null;
  if (!repo)
    return {
      ok: false,
      reason: 'missing config.repo'
    };
  const stat = async path => {
    try {
      const s = await fs.stat(path);
      return {
        ok: true,
        type: s?.type ?? null,
        size: s?.size ?? null
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e?.message ?? e),
        code: e?.code ?? e?.name ?? null
      };
    }
  };
  const readText = async path => {
    try {
      const b = await fs.readFile(path);
      if (typeof b === 'string')
        return {
          ok: true,
          text: b
        };
      if (b instanceof Uint8Array)
        return {
          ok: true,
          text: new TextDecoder('utf-8').decode(b)
        };
      if (ArrayBuffer.isView(b))
        return {
          ok: true,
          text: new TextDecoder('utf-8').decode(b)
        };
      return {
        ok: true,
        text: String(b)
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e?.message ?? e),
        code: e?.code ?? e?.name ?? null
      };
    }
  };
  return {
    repo,
    nonbare: {
      head: await readText(`${ repo }/.git/HEAD`),
      objects: await stat(`${ repo }/.git/objects`),
      refs_heads: await stat(`${ repo }/.git/refs/heads`)
    }
  };
};
const _1vysjyo = function _setFileAndCommit(setFilesAndCommit){return(
async function setFileAndCommit({repo, branch, path, content}) {
  return await setFilesAndCommit({
    repo,
    branch,
    data: new Map([[
        path,
        content
      ]])
  });
}
)};
const _1c4d7y5 = function _setFilesAndCommit(ensure_branch,git,fs,ensure_dir){return(
async function setFilesAndCommit({repo, branch, data}) {
  await ensure_branch({
    repo,
    branch
  });
  let headOid = null;
  try {
    headOid = await git.resolveRef({
      fs,
      dir: repo,
      ref: branch
    });
  } catch {
    headOid = null;
  }
  const existsAtHead = async filepath => {
    if (!headOid)
      return false;
    try {
      await git.readObject({
        fs,
        dir: repo,
        oid: headOid,
        filepath
      });
      return true;
    } catch (err) {
      const msg = err?.message || '';
      const code = err?.code || err?.name || '';
      if (code === 'NotFoundError' || code === 'ResolveRefError' || msg.includes('ENOENT') || msg.includes('NotFoundError'))
        return false;
      return false;
    }
  };
  const summary = {
    new: [],
    upd: [],
    del: []
  };
  let hasFiles = false;
  for (const [path, content] of data) {
    hasFiles = true;
    const full_path = `${ repo }/${ path }`;
    const lastSlash = full_path.lastIndexOf('/');
    const dir = lastSlash === -1 ? repo : full_path.slice(0, lastSlash);
    await ensure_dir({ dir });
    const isUpd = await existsAtHead(path);
    (isUpd ? summary.upd : summary.new).push(full_path);
    await fs.writeFile(full_path, content);
    await git.add({
      fs,
      dir: repo,
      filepath: path
    });
  }
  if (!hasFiles)
    return;
  await git.commit({
    fs,
    dir: repo,
    author: { name: '-' },
    message: JSON.stringify(summary)
  });
}
)};
const _veyumo = function _listRepos(fs){return(
async function listRepos({root = '/', maxDepth = 4} = {}) {
  const norm = p => p === '/' ? '/' : p.replace(/\/+$/, '');
  root = norm(root);
  const repos = new Set();
  const visited = new Set();
  const q = [{
      path: root,
      depth: 0
    }];
  const safeReaddir = async p => {
    try {
      return await fs.readdir(p);
    } catch (e) {
      return null;
    }
  };
  const safeStat = async p => {
    try {
      return await fs.stat(p);
    } catch (e) {
      return null;
    }
  };
  while (q.length) {
    const {path, depth} = q.shift();
    const key = `${ depth }:${ path }`;
    if (visited.has(key))
      continue;
    visited.add(key);
    const stat = await safeStat(path);
    if (!stat || stat.type !== 'dir')
      continue;
    const names = await safeReaddir(path);
    if (!names)
      continue;
    if (names.includes('.git'))
      repos.add(path);
    if (depth >= maxDepth)
      continue;
    for (const name of names) {
      if (name === '.' || name === '..')
        continue;
      const child = path === '/' ? `/${ name }` : `${ path }/${ name }`;
      const cstat = await safeStat(child);
      if (cstat && cstat.type === 'dir')
        q.push({
          path: child,
          depth: depth + 1
        });
    }
  }
  return Array.from(repos).sort();
}
)};
const _1rusr2m = function _listBranches(ensure_repo,git,fs){return(
async function listBranches({repo} = {}) {
  if (!repo)
    throw new Error('repo is required');
  await ensure_repo({ repo });
  try {
    return await git.listBranches({
      fs,
      dir: repo
    });
  } catch (e) {
    return [];
  }
}
)};
const _1bvisll = function _listFiles(ensure_branch,git,fs){return(
async function listFiles({repo, branch, ref} = {}) {
  if (!repo)
    throw new Error('repo is required');
  if (!branch)
    throw new Error('branch is required');
  try {
    await ensure_branch({
      repo,
      branch,
      create: true
    });
    return await git.listFiles({
      fs,
      dir: repo,
      ref: ref ?? branch
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}
)};
const _xl9zth = function _listCommits(ensure_branch,git,fs){return(
async function listCommits({repo, branch, depth} = {}) {
  if (!repo)
    throw new Error('repo is required');
  if (!branch)
    throw new Error('branch is required');
  const hasBranch = await ensure_branch({
    repo,
    branch,
    create: false
  });
  if (!hasBranch)
    return [];
  return git.log({
    fs,
    dir: repo,
    ref: branch,
    depth
  });
}
)};
const _h6ylpe = function _getCommitChanges(git,fs){return(
async function getCommitChanges({repo, oid} = {}) {
  if (!repo)
    throw new Error('repo is required');
  if (!oid)
    throw new Error('oid is required');
  const {commit} = await git.readCommit({
    fs,
    dir: repo,
    oid
  });
  const parentOid = commit.parent && commit.parent[0] ? commit.parent[0] : null;
  const filesAt = async ref => {
    if (!ref)
      return new Map();
    const filepaths = await git.listFiles({
      fs,
      dir: repo,
      ref
    });
    const entries = await Promise.all(filepaths.map(async filepath => {
      const {oid: blobOid} = await git.readObject({
        fs,
        dir: repo,
        oid: ref,
        filepath
      });
      return [
        filepath,
        blobOid
      ];
    }));
    return new Map(entries);
  };
  const [currFiles, parentFiles] = await Promise.all([
    filesAt(oid),
    filesAt(parentOid)
  ]);
  const added = [];
  const modified = [];
  const removed = [];
  for (const [filepath, blobOid] of currFiles) {
    if (!parentFiles.has(filepath)) {
      added.push(filepath);
    } else if (parentFiles.get(filepath) !== blobOid) {
      modified.push(filepath);
    }
  }
  for (const filepath of parentFiles.keys()) {
    if (!currFiles.has(filepath)) {
      removed.push(filepath);
    }
  }
  return {
    oid,
    parentOid,
    added,
    modified,
    removed
  };
}
)};
const _fw7q7v = function _getCompactISODate(){return(
function getCompactISODate() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${ year }${ month }${ day }T${ hours }${ minutes }${ seconds }Z`;
}
)};
const _1aaintd = function _exportToZip(JSZip){return(
async function exportToZip({fs, dir}) {
  const zip = new JSZip();
  async function walk(currentPath, relPath = '') {
    const names = await fs.readdir(currentPath);
    for (const name of names) {
      if (name === '.' || name === '..')
        continue;
      const fullPath = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
      const childRelPath = relPath ? relPath + '/' + name : name;
      const stat = await fs.stat(fullPath);
      if (stat.type === 'file') {
        const data = await fs.readFile(fullPath);
        zip.file(childRelPath, data);
      } else if (stat.type === 'dir') {
        await walk(fullPath, childRelPath);
      }
    }
  }
  await walk(dir, '');
  return zip.generateAsync({ type: 'blob' });
}
)};
const _1q9qys8 = function _46(md){return(
md`### Provenance Utils`
)};
const _1intaie = function _tag(){return(
function tag(def, provenance) {
  if (def == null)
    return def;
  const p = provenance && typeof provenance === 'object' ? { ...provenance } : { value: provenance };
  try {
    if (typeof def === 'function' || typeof def === 'object' && def !== null) {
      Object.defineProperty(def, '__provenance', {
        value: p,
        configurable: true
      });
      return def;
    }
  } catch {
  }
  return def;
}
)};
const _ziwv9c = function _read(){return(
function read(def) {
  if (def == null)
    return null;
  try {
    return def.__provenance ?? null;
  } catch {
    return null;
  }
}
)};
const _1l4hr6l = function _49(md){return(
md`## History API Functions`
)};
const _zanj5n = function _revertVariables(history,initial_state,getVariableByPersistentId,runtime,realize){return(
async entries => {
  const out = [];
  // For each selected change, restore its variable to the state it had
  // immediately BEFORE that change. Reconstructed from the history log +
  // initial_state, since entries carry no `previous` field.
  for (const e of entries ?? []) {
    const pid = e?.pid ?? null;
    if (!pid)
      continue;
    const variable = getVariableByPersistentId(pid, runtime) || null;
    if (!variable) {
      out.push({
        pid,
        ok: false,
        reason: 'no runtime variable'
      });
      continue;
    }
    // find the prior snapshot for this pid: the last same-pid entry before `e`
    const at = history.indexOf(e);
    const upTo = at === -1 ? history.length - 1 : at - 1;
    let prev = null, firstForPid = null;
    for (let idx = 0; idx <= upTo; idx++) {
      const h = history[idx];
      if (h?.pid !== pid)
        continue;
      if (firstForPid === null)
        firstForPid = h;
      prev = h;
    }
    if (!prev) {
      // nothing earlier for this pid — either it existed before recording,
      // or this change first created it (op 'new') so reverting deletes it
      const base = initial_state instanceof Map ? initial_state.get(pid) ?? null : null;
      if (e?.op === 'new' || !base) {
        try {
          variable.delete?.();
          out.push({
            pid,
            ok: true,
            action: 'delete'
          });
        } catch (err) {
          out.push({
            pid,
            ok: false,
            action: 'delete',
            reason: String(err?.message ?? err)
          });
        }
        continue;
      }
      prev = base;
    }
    const def = (await realize([prev._definition ?? ''], runtime))[0];
    if (!def) {
      out.push({
        pid,
        ok: false,
        reason: 'could not realize previous definition'
      });
      continue;
    }
    const name = ((typeof prev._name === 'string' && prev._name.length) ? prev._name : null) ?? ((typeof variable._name === 'string' && variable._name.length) ? variable._name : null) ?? pid;
    try {
      variable.define(name, Array.isArray(prev._inputs) ? prev._inputs : [], def);
      out.push({
        pid,
        ok: true,
        action: 'define'
      });
    } catch (err) {
      out.push({
        pid,
        ok: false,
        action: 'define',
        reason: String(err?.message ?? err)
      });
    }
  }
  return out;
}
)};
const _1cvp8ui = function _rewindToTime(history,applyHistoryState){return(
function rewindToTime(time) {
  // history is sorted ascending by t; index = number of changes at or before `time`
  let index = 0;
  for (const entry of history) {
    if ((entry?.t ?? 0) <= time)
      index++;
    else
      break;
  }
  return applyHistoryState(index);
}
)};
const _playbk01 = function _applyHistoryState(modules,history,initial_state,getVariableByPersistentId,runtime,replay_pid_map,realize,tag,playback_suspend)
{
  const moduleByName = new Map();
  if (modules instanceof Map)
    for (const [m, meta] of modules)
      if (meta?.name)
        moduleByName.set(meta.name, m);
  const defaultMod = moduleByName.get('main') ?? (modules instanceof Map ? modules.keys().next().value : null) ?? null;
  // Reconstruct notebook state after the first `index` recorded changes, from the
  // history log + initial_state base snapshots. Entries carry no `previous` field,
  // so this also drives git-replayed history.
  return async function applyHistoryState(index) {
    // Suspend recording for the apply + a grace window: playback's redefines/deletes
    // fire onCodeChange asynchronously and must not be logged as fresh changes.
    playback_suspend.until = Date.now() + 4000;
    const i = Math.max(0, Math.min(index | 0, history.length));
    const byPid = new Map();
    history.forEach((h, idx) => {
      if (!h?.pid)
        return;
      let g = byPid.get(h.pid);
      if (!g)
        byPid.set(h.pid, g = { first: h, last: null });
      if (idx < i)
        g.last = h;
    });
    for (const [pid, { first, last }] of byPid) {
      const del = last ? last.op === 'del' : first.op === 'new';
      const snap = del ? null : last ?? initial_state.get(pid) ?? null;
      let v = getVariableByPersistentId(pid, runtime) ?? replay_pid_map.get(pid) ?? null;
      if (del) {
        if (v) {
          try {
            v.delete?.();
          } catch {
          }
          replay_pid_map.delete(pid);
        }
        continue;
      }
      if (!snap)
        continue;
      if (!v) {
        const mod = moduleByName.get((last ?? first)?.module ?? 'main') ?? defaultMod;
        if (!mod)
          continue;
        replay_pid_map.set(pid, v = mod.variable());
      }
      let def = null;
      try {
        def = (await realize([snap._definition ?? ''], runtime))[0] ?? null;
      } catch {
      }
      if (!def)
        continue;
      v.define(snap._name || pid, Array.isArray(snap._inputs) ? snap._inputs : [], tag(def, {
        source: 'playback',
        pid
      }));
    }
    playback_suspend.until = Date.now() + 500;
    return i;
  };
};
const _playbk05 = function _playback_suspend(){return(
{ until: 0 }
)};
const _playbk02 = function _playback(html,history,invalidation,applyHistoryState)
{
  const n = history.length;
  const form = html`<form style="display:flex;gap:.4em;align-items:center;font:13px system-ui,sans-serif;flex-wrap:wrap">
    <button type=button name=first title="start">⏮</button>
    <button type=button name=prev title="previous change">◀</button>
    <button type=button name=play title="play / pause">▶ play</button>
    <button type=button name=next title="next change">▶</button>
    <button type=button name=last title="latest">⏭</button>
    <input type=range name=range min=0 max=${ n } step=1 value=${ n } style="flex:1;min-width:120px">
    <output name=out style="font:12px monospace">${ n } / ${ n }</output>
  </form>`;
  let value = n, timer = null;
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      form.play.textContent = '▶ play';
    }
  };
  const go = async v => {
    value = Math.max(0, Math.min(n, v | 0));
    form.range.value = value;
    form.out.value = `${ value } / ${ n }`;
    form.value = value;
    await applyHistoryState(value);
    form.dispatchEvent(new Event('input', { bubbles: true }));
  };
  form.range.oninput = () => go(+form.range.value);
  form.first.onclick = () => go(0);
  form.prev.onclick = () => go(value - 1);
  form.next.onclick = () => go(value + 1);
  form.last.onclick = () => go(n);
  form.play.onclick = () => {
    if (timer)
      return stop();
    form.play.textContent = '⏸ pause';
    timer = setInterval(() => go(value >= n ? 0 : value + 1), 700);
  };
  invalidation.then(stop);
  form.value = value;
  return form;
};
const _playbk03 = (G, _) => G.input(_);
const _1rfq6xd = function _52(md){return(
md`## State`
)};
const _lh9ssh = async function _config(notebook_title,ensure_branch)
{
  const url = new URL(document.baseURI);
  const config = {
    repo: '/' + notebook_title,
    branch: (url.origin + url.pathname).replace(/[.:/]/g, '_')
  };
  await ensure_branch(config);
  return config;
};
const _qu2y2k = function _historyUtils(){return(
{
  snapshotVariable(v) {
    if (!v)
      return null;
    const name = typeof v._name === 'string' && v._name.length ? v._name : null;
    const inputsRaw = Array.isArray(v._inputs) ? v._inputs : [];
    const inputs = inputsRaw.map(i => typeof i === 'string' ? i : i?._name).filter(x => x != null);
    const def = v._definition;
    const _definition = typeof def === 'function' ? def.toString() : def == null ? '' : String(def);
    return {
      _name: name,
      _inputs: inputs,
      _definition
    };
  },
  insertByTime(arr, entry) {
    const t = entry?.t ?? 0;
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      const mt = arr[mid]?.t ?? 0;
      if (mt <= t)
        lo = mid + 1;
      else
        hi = mid;
    }
    arr.splice(lo, 0, entry);
    return lo;
  }
}
)};
const _84fm9q = function _change_listener(runtime,$0,persistentId,historyUtils,$1,read,onCodeChange,identity,modules,$2,Event,invalidation,playback_suspend)
{
  // scan the runtime for things that were loaded before we attached the hook
  if (!this) {
    const t = Date.now();
    [...runtime._variables].forEach(variable => {
      $0.value.set(persistentId(variable), historyUtils.snapshotVariable(variable));
      $1.value.set(variable._module, t);
    });
  }
  const inferProvenance = (v, previous) => {
    const currDef = v?._definition ?? null;
    const prevDef = previous?.variable?._definition ?? previous?._definition ?? null;
    return read(currDef) ?? read(prevDef) ?? null;
  };
  const stop = onCodeChange(({variable, previous, t}) => {
    // playback drives defines/deletes; suppress recording while it runs
    if (playback_suspend && Date.now() < playback_suspend.until)
      return;
    let v = variable || previous.variable;
    // lazyImport
    // Suprised the do not referentially match
    if (v._definition.toString() === identity.toString())
      return;
    if (typeof v?._name == 'string' && v._name.startsWith('dynamic '))
      return;
    if (typeof previous?._name == 'string' && previous._name.startsWith('dynamic '))
      return;
    const pid = persistentId(v);
    const module = v._module;
    const moduleName = modules.get(module)?.name || 'unknown';
    const prov = inferProvenance(variable, previous);
    const source = prov?.source ?? 'runtime';
    // playback replays existing history; never record it as a fresh change
    if (source === 'playback')
      return;
    if (variable && !previous) {
      // new variable
      // record it as a base state
      $0.value.set(pid, historyUtils.snapshotVariable(variable));
      if ((!$1.value.get(variable._module) || t < $1.value.get(variable._module) + 1000) && source == 'runtime') {
        // its a new module loading
        $1.value.set(module, t);
        return;
      }
    }
    if (variable) {
      // its a user defined variable
      historyUtils.insertByTime($2.value, {
        t,
        op: previous ? 'upd' : 'new',
        source,
        pid,
        module: moduleName,
        provenance: prov,
        ...historyUtils.snapshotVariable(variable)
      });
    } else {
      historyUtils.insertByTime($2.value, {
        t,
        op: 'del',
        source,
        pid,
        module: moduleName,
        provenance: prov,
        _name: previous._name
      });
    }
    $2.dispatchEvent(new Event('input'));
  });
  invalidation.then(stop);
  return 'initialized';
};
const _1gmcocx = function _56(Inputs,history){return(
Inputs.table(history, {
  sort: 't',
  reverse: true
})
)};
const _ztvqq8 = function _57(md){return(
md`## Commit History`
)};
const _1klmxot = function _commit_watermarks(){return(
new Map()
)};
const _1llozp3 = function _commitRuntimeHistorySince(commit_watermarks,commit_changes){return(
async function commitRuntimeHistorySince({repo, branch, history, watermarkKey = `${ repo }:${ branch }`} = {}) {
  const prev = commit_watermarks.get(watermarkKey) ?? 0;
  const entries = Array.isArray(history) ? history : [];
  const allowedOps = new Set([
    'new',
    'upd',
    'del'
  ]);
  const pending = entries.filter(e => (e?.t ?? 0) > prev).filter(e => e?.source !== 'git').filter(e => allowedOps.has(e?.op)).sort((a, b) => (a?.t ?? 0) - (b?.t ?? 0));
  let maxT = prev;
  const results = [];
  for (const change of pending) {
    try {
      const r = await commit_changes({
        repo,
        branch,
        change
      });
      results.push(r);
      if ((change?.t ?? 0) > maxT)
        maxT = change.t;
    } catch (err) {
      const failure = {
        ok: false,
        error: String(err?.message ?? err),
        change: {
          t: change?.t ?? null,
          op: change?.op ?? null,
          pid: change?.pid ?? null,
          module: change?.module ?? null,
          source: change?.source ?? null,
          _name: change?._name ?? null
        }
      };
      results.push(failure);
      return {
        ok: false,
        watermarkKey,
        previous: prev,
        current: prev,
        attempted: pending.length,
        committed: results.filter(d => d?.ok).length,
        results
      };
    }
  }
  commit_watermarks.set(watermarkKey, maxT);
  return {
    ok: true,
    watermarkKey,
    previous: prev,
    current: maxT,
    attempted: pending.length,
    committed: results.filter(d => d?.ok).length,
    results
  };
}
)};
const _9hnu6u = function _commit_changes(ensure_branch,git,fs,moduleBaseHash)
{
  return async ({repo, branch, change} = {}) => {
    if (!repo)
      throw new Error('commit_changes_direct: repo is required');
    if (!branch)
      throw new Error('commit_changes_direct: branch is required');
    if (!change)
      throw new Error('commit_changes_direct: change is required');
    const pid0 = change?.pid;
    if (pid0 == null)
      throw new Error('commit_changes_direct: change.pid is required');
    const pid = typeof pid0 === 'string' ? pid0 : String(pid0);
    const module_name = change?.module ?? 'main';
    let op = change?.op ?? 'upd';
    op = op === 'new' || op === 'upd' || op === 'del' ? op : 'upd';
    await ensure_branch({
      repo,
      branch
    });
    const branchRef = `refs/heads/${ branch }`;
    const resolveHeadOid = async () => {
      try {
        return await git.resolveRef({
          fs,
          dir: repo,
          ref: branchRef
        });
      } catch {
        return null;
      }
    };
    const readCommitTreeOid = async commitOid => {
      if (!commitOid)
        return null;
      const {commit} = await git.readCommit({
        fs,
        dir: repo,
        oid: commitOid
      });
      return commit?.tree ?? null;
    };
    const readTreeCached = async (treeOid, cache) => {
      if (!treeOid)
        return [];
      if (cache.has(treeOid))
        return cache.get(treeOid);
      const {tree} = await git.readTree({
        fs,
        dir: repo,
        oid: treeOid
      });
      cache.set(treeOid, tree);
      return tree;
    };
    const existsAtTree = async (rootTreeOid, filepath, treeCache) => {
      if (!rootTreeOid)
        return false;
      const parts = String(filepath).split('/').filter(Boolean);
      let treeOid = rootTreeOid;
      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        const entries = await readTreeCached(treeOid, treeCache);
        const ent = entries.find(e => e.path === seg);
        if (!ent)
          return false;
        if (i === parts.length - 1)
          return !!ent.oid;
        if (ent.type !== 'tree')
          return false;
        treeOid = ent.oid;
      }
      return false;
    };
    const Node = () => ({
      files: new Map(),
      dirs: new Map()
    });
    const addUpdate = (node, segments, update) => {
      if (!segments.length)
        return;
      const [head, ...rest] = segments;
      if (!head)
        return;
      if (!rest.length) {
        node.files.set(head, update);
        return;
      }
      let child = node.dirs.get(head);
      if (!child)
        node.dirs.set(head, child = Node());
      addUpdate(child, rest, update);
    };
    const applyDir = async (treeOid, node, treeCache) => {
      const entries = new Map();
      if (treeOid) {
        const tree = await readTreeCached(treeOid, treeCache);
        for (const e of tree)
          entries.set(e.path, { ...e });
      }
      for (const [name, up] of node.files) {
        if (up?.op === 'del') {
          entries.delete(name);
        } else if (up?.op === 'put') {
          entries.set(name, {
            mode: up.mode ?? '100644',
            path: name,
            oid: up.oid,
            type: 'blob'
          });
        } else {
          throw new Error(`commit_changes_direct: unknown file update op for ${ name }`);
        }
      }
      for (const [name, childNode] of node.dirs) {
        const existing = entries.get(name);
        const childTreeOid = existing && existing.type === 'tree' ? existing.oid : null;
        const newChildOid = await applyDir(childTreeOid, childNode, treeCache);
        if (!newChildOid)
          entries.delete(name);
        else
          entries.set(name, {
            mode: '040000',
            path: name,
            oid: newChildOid,
            type: 'tree'
          });
      }
      if (entries.size === 0)
        return null;
      const tree = Array.from(entries.values()).map(e => ({
        mode: e.mode,
        path: e.path,
        oid: e.oid,
        type: e.type
      })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      return git.writeTree({
        fs,
        dir: repo,
        tree
      });
    };
    const headOid = await resolveHeadOid();
    const headTreeOid = await readCommitTreeOid(headOid);
    const base = `${ module_name }/${ pid }`;
    const codePath = `${ base }.js`;
    const metaPath = `${ base }.json`;
    const fullCodePath = `${ repo }/${ codePath }`;
    const fullMetaPath = `${ repo }/${ metaPath }`;
    const root = Node();
    if (op === 'del') {
      addUpdate(root, codePath.split('/').filter(Boolean), { op: 'del' });
      addUpdate(root, metaPath.split('/').filter(Boolean), { op: 'del' });
    } else {
      const enc = new TextEncoder();
      const content = String(change?._definition ?? '');
      const metadata = JSON.stringify({
        name: change?._name ?? null,
        inputs: Array.isArray(change?._inputs) ? change._inputs : []
      });
      const [codeBlobOid, metaBlobOid] = await Promise.all([
        git.writeBlob({
          fs,
          dir: repo,
          blob: enc.encode(content)
        }),
        git.writeBlob({
          fs,
          dir: repo,
          blob: enc.encode(metadata)
        })
      ]);
      addUpdate(root, codePath.split('/').filter(Boolean), {
        op: 'put',
        oid: codeBlobOid,
        mode: '100644'
      });
      addUpdate(root, metaPath.split('/').filter(Boolean), {
        op: 'put',
        oid: metaBlobOid,
        mode: '100644'
      });
    }
    const treeCache = new Map();
    let newRootTreeOid = await applyDir(headTreeOid, root, treeCache);
    if (!newRootTreeOid)
      newRootTreeOid = await git.writeTree({
        fs,
        dir: repo,
        tree: []
      });
    const existedCode = await existsAtTree(headTreeOid, codePath, treeCache);
    const existedMeta = await existsAtTree(headTreeOid, metaPath, treeCache);
    const existedAny = existedCode || existedMeta;
    const summary = {
      new: [],
      upd: [],
      del: []
    };
    if (op === 'del') {
      if (existedCode)
        summary.del.push(fullCodePath);
      if (existedMeta)
        summary.del.push(fullMetaPath);
    } else {
      (existedAny ? summary.upd : summary.new).push(fullCodePath, fullMetaPath);
    }
    // Add base hash for the affected module
    const baseHash = moduleBaseHash(module_name);
    if (baseHash) {
      summary.baseHashes = { [module_name]: baseHash };
    }
    const now = Date.now();
    const author = {
      name: '-',
      email: '-',
      timestamp: Math.floor(now / 1000),
      timezoneOffset: new Date().getTimezoneOffset()
    };
    const commit = {
      tree: newRootTreeOid,
      parent: headOid ? [headOid] : [],
      author,
      committer: author,
      message: JSON.stringify(summary)
    };
    const newCommitOid = await git.writeCommit({
      fs,
      dir: repo,
      commit
    });
    await git.writeRef({
      fs,
      dir: repo,
      ref: branchRef,
      value: newCommitOid,
      force: true
    });
    return {
      ok: true,
      op,
      pid,
      module: module_name,
      headOid,
      newCommitOid,
      ref: branchRef,
      summary
    };
  };
};
const _18szhzl = function _commit_history(commitRuntimeHistorySince,config,history){return(
commitRuntimeHistorySince({
  ...config,
  history
})
)};
const _ir0qsi = function _62(md){return(
md`## Utils`
)};
const _1j8ga5m = async function _identity(lookupVariable,historyModule){return(
(await lookupVariable('lookupVariable', historyModule))._definition
)};
const _1lfjhgx = function _modules(moduleMap){return(
moduleMap()
)};
const _lo216j = function _timeline(history)
{
  const first = history.at(0)?.t ?? 0;
  const last = history.at(-1)?.t ?? 0;
  const factor = Math.max(last - first, 1) / 1024;
  return Array.from({ length: 1024 }).map((_, i) => Math.floor(first + i * factor));
};
const _qkqqrc = function _moduleBaseHash()
{
  const hash = s => {
    s = String(s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++)
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return '_' + (h >>> 0).toString(36);
  };
  return function moduleBaseHash(moduleName) {
    const script = document.getElementById(moduleName);
    if (!script)
      return null;
    return hash(script.textContent);
  };
};
const _20mogr = function _history(Inputs){return(
Inputs.input([])
)};
const _bmiya2 = (G, _) => G.input(_);
const _yf3xsc = function _fs(Inputs,FS){return(
Inputs.button('wipe filesystem', {
  reduce: () => new FS('lopecode_history', { wipe: true }).promises,
  value: new FS('lopecode_history', { wipe: false }).promises
})
)};
const _1dt24ln = (G, _) => G.input(_);
const _fxp8k8 = function _selected_repo(Inputs,repos,config){return(
Inputs.select(repos, {
  label: 'select repo',
  value: config.repo
})
)};
const _9lv1oo = (G, _) => G.input(_);
const _1ybzqjb = function _selected_branch(Inputs,branches,selected_repo,config){return(
Inputs.select(branches, {
  label: 'select branch',
  value: selected_repo == config.repo ? config.branch : undefined
})
)};
const _1u33aug = (G, _) => G.input(_);
const _1lp66j8 = function _initial_state(Inputs){return(
Inputs.input(new Map())
)};
const _8pswzc = (G, _) => G.input(_);
const _1kbsmg2 = function _module_load_time(Inputs){return(
Inputs.input(new Map())
)};
const _1g6l5w7 = (G, _) => G.input(_);
const _1tpet0t = function _historyModule(thisModule){return(
thisModule()
)};
const _1ryokzy = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/lightning-fs-4-6-0", async () => runtime.module((await import("/@tomlarkworthy/lightning-fs-4-6-0.js?v=4")).default));  
  main.define("module @tomlarkworthy/isomorphic-git-1-30-1", async () => runtime.module((await import("/@tomlarkworthy/isomorphic-git-1-30-1.js?v=4")).default));  
  main.define("module @tomlarkworthy/jszip-3-10-1", async () => runtime.module((await import("/@tomlarkworthy/jszip-3-10-1.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  $def("_1f8tza", null, ["md"], _1f8tza);  
  $def("_jueqgn", "viewof temporal", ["Inputs"], _jueqgn);  
  $def("_d0qi2e", "temporal", ["Generators","viewof temporal"], _d0qi2e);  
  $def("_144mq5h", "viewof rewind", ["Plot","width","temporal","history","d3","timeline"], _144mq5h);  
  $def("_apj797", "rewind", ["Generators","viewof rewind"], _apj797);  
  $def("_1gj4pod", "viewof selectedChanges", ["Inputs","history","html"], _1gj4pod);  
  $def("_1a64yt8", "selectedChanges", ["Generators","viewof selectedChanges"], _1a64yt8);  
  $def("_1mf9ijy", null, ["rewind","Inputs","rewindToTime","md"], _1mf9ijy);  
  $def("_wosvzm", null, ["selectedChanges","Inputs","revertVariables","md"], _wosvzm);
  $def("_playbk02", "viewof playback", ["html","history","invalidation","applyHistoryState"], _playbk02);
  $def("_playbk03", "playback", ["Generators","viewof playback"], _playbk03);
  $def("_14zrzgj", null, ["md"], _14zrzgj);  
  $def("_816qai", null, ["md"], _816qai);  
  $def("_j5krmo", null, ["md"], _j5krmo);  
  $def("_i8mm9n", null, ["md"], _i8mm9n);  
  $def("_2tivts", null, ["md"], _2tivts);  
  $def("_el289t", "git_commits", ["listCommits","config"], _el289t);  
  $def("_9rw7im", "relevant_git_commits", ["git_commits"], _9rw7im);  
  $def("_zgm5j8", "notebookCreationTime", ["git_commits"], _zgm5j8);  
  $def("_1j8x1tu", "parseGitMessage", [], _1j8x1tu);  
  $def("_1r7lx5s", "GitEntry", ["ensure_repo","git","fs"], _1r7lx5s);  
  $def("_yngfrp", "replay_pid_map", [], _yngfrp);  
  $def("_19c2k49", "replayGitEntries", ["modules","getVariableByPersistentId","runtime","replay_pid_map","GitEntry","realize","tag"], _19c2k49);  
  $def("_7hpmkx", "replayGitCommits", ["config","parseGitMessage","moduleBaseHash","GitEntry","replayGitEntries"], _7hpmkx);  
  $def("_1ail6g2", "replay_git", ["isOnObservableCom","modules","replayGitCommits","relevant_git_commits"], _1ail6g2);  
  $def("_1rm7oy4", null, ["md"], _1rm7oy4);  
  $def("_m77twl", null, ["Inputs","exportToZip","fs","config","getCompactISODate"], _m77twl);  
  $def("_1ax2z4b", "repos", ["listRepos"], _1ax2z4b);  
  $def("_1lmwwtp", "branches", ["listBranches","selected_repo"], _1lmwwtp);  
  $def("_1qb2kyt", "selected_files", ["listFiles","selected_repo","selected_branch"], _1qb2kyt);  
  $def("_29j25n", null, ["Inputs","selected_files"], _29j25n);  
  $def("_gdsu07", "selected_commits", ["listCommits","selected_repo","selected_branch"], _gdsu07);  
  $def("_1kqllm6", null, ["Inputs","selected_commits"], _1kqllm6);  
  $def("_c6p1xb", "exportFsToZip", ["JSZip"], _c6p1xb);  
  $def("_z3yxk8", null, ["md"], _z3yxk8);  
  $def("_4q2hvf", "known_dirs", ["fs"], _4q2hvf);  
  $def("_7uwj8h", "ensure_dir", ["known_dirs","fs"], _7uwj8h);  
  $def("_1ccskir", "known_repos", ["fs"], _1ccskir);  
  $def("_uyuv0r", "ensure_repo", ["known_repos","ensure_dir","git","fs"], _uyuv0r);  
  $def("_1d8rexx", "ensure_branch", ["ensure_repo","listBranches","git","fs"], _1d8rexx);  
  $def("_nind58", "git_repo_layout", ["config","fs"], _nind58);  
  $def("_1vysjyo", "setFileAndCommit", ["setFilesAndCommit"], _1vysjyo);  
  $def("_1c4d7y5", "setFilesAndCommit", ["ensure_branch","git","fs","ensure_dir"], _1c4d7y5);  
  $def("_veyumo", "listRepos", ["fs"], _veyumo);  
  $def("_1rusr2m", "listBranches", ["ensure_repo","git","fs"], _1rusr2m);  
  $def("_1bvisll", "listFiles", ["ensure_branch","git","fs"], _1bvisll);  
  $def("_xl9zth", "listCommits", ["ensure_branch","git","fs"], _xl9zth);  
  $def("_h6ylpe", "getCommitChanges", ["git","fs"], _h6ylpe);  
  $def("_fw7q7v", "getCompactISODate", [], _fw7q7v);  
  $def("_1aaintd", "exportToZip", ["JSZip"], _1aaintd);  
  $def("_1q9qys8", null, ["md"], _1q9qys8);  
  $def("_1intaie", "tag", [], _1intaie);  
  $def("_ziwv9c", "read", [], _ziwv9c);  
  $def("_1l4hr6l", null, ["md"], _1l4hr6l);  
  $def("_zanj5n", "revertVariables", ["history","initial_state","getVariableByPersistentId","runtime","realize"], _zanj5n);
  $def("_1cvp8ui", "rewindToTime", ["history","applyHistoryState"], _1cvp8ui);
  $def("_playbk01", "applyHistoryState", ["modules","history","initial_state","getVariableByPersistentId","runtime","replay_pid_map","realize","tag","playback_suspend"], _playbk01);
  $def("_playbk05", "playback_suspend", [], _playbk05);
  $def("_1rfq6xd", null, ["md"], _1rfq6xd);  
  $def("_lh9ssh", "config", ["notebook_title","ensure_branch"], _lh9ssh);  
  $def("_qu2y2k", "historyUtils", [], _qu2y2k);  
  $def("_84fm9q", "change_listener", ["runtime","viewof initial_state","persistentId","historyUtils","viewof module_load_time","read","onCodeChange","identity","modules","viewof history","Event","invalidation","playback_suspend"], _84fm9q);
  $def("_1gmcocx", null, ["Inputs","history"], _1gmcocx);  
  $def("_ztvqq8", null, ["md"], _ztvqq8);  
  $def("_1klmxot", "commit_watermarks", [], _1klmxot);  
  $def("_1llozp3", "commitRuntimeHistorySince", ["commit_watermarks","commit_changes"], _1llozp3);  
  $def("_9hnu6u", "commit_changes", ["ensure_branch","git","fs","moduleBaseHash"], _9hnu6u);  
  $def("_18szhzl", "commit_history", ["commitRuntimeHistorySince","config","history"], _18szhzl);  
  $def("_ir0qsi", null, ["md"], _ir0qsi);  
  $def("_1j8ga5m", "identity", ["lookupVariable","historyModule"], _1j8ga5m);  
  $def("_1lfjhgx", "modules", ["moduleMap"], _1lfjhgx);  
  $def("_lo216j", "timeline", ["history"], _lo216j);  
  $def("_qkqqrc", "moduleBaseHash", [], _qkqqrc);  
  $def("_20mogr", "viewof history", ["Inputs"], _20mogr);  
  $def("_bmiya2", "history", ["Generators","viewof history"], _bmiya2);  
  $def("_yf3xsc", "viewof fs", ["Inputs","FS"], _yf3xsc);  
  $def("_1dt24ln", "fs", ["Generators","viewof fs"], _1dt24ln);  
  $def("_fxp8k8", "viewof selected_repo", ["Inputs","repos","config"], _fxp8k8);  
  $def("_9lv1oo", "selected_repo", ["Generators","viewof selected_repo"], _9lv1oo);  
  $def("_1ybzqjb", "viewof selected_branch", ["Inputs","branches","selected_repo","config"], _1ybzqjb);  
  $def("_1u33aug", "selected_branch", ["Generators","viewof selected_branch"], _1u33aug);  
  $def("_1lp66j8", "viewof initial_state", ["Inputs"], _1lp66j8);  
  $def("_8pswzc", "initial_state", ["Generators","viewof initial_state"], _8pswzc);  
  $def("_1kbsmg2", "viewof module_load_time", ["Inputs"], _1kbsmg2);  
  $def("_1g6l5w7", "module_load_time", ["Generators","viewof module_load_time"], _1g6l5w7);  
  $def("_1tpet0t", "viewof historyModule", ["thisModule"], _1tpet0t);  
  $def("_1ryokzy", "historyModule", ["Generators","viewof historyModule"], _1ryokzy);  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("persistentId", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("persistentId", _));  
  main.define("getVariableByPersistentId", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getVariableByPersistentId", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));  
  main.define("FS", ["module @tomlarkworthy/lightning-fs-4-6-0", "@variable"], (_, v) => v.import("FS", _));  
  main.define("git", ["module @tomlarkworthy/isomorphic-git-1-30-1", "@variable"], (_, v) => v.import("git", _));  
  main.define("http", ["module @tomlarkworthy/isomorphic-git-1-30-1", "@variable"], (_, v) => v.import("http", _));  
  main.define("JSZip", ["module @tomlarkworthy/jszip-3-10-1", "@variable"], (_, v) => v.import("JSZip", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("notebook_title", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("notebook_title", _));
  return main;
}