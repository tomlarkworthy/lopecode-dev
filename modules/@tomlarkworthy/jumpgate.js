const _19jpp5s = async function _1(md,FileAttachment){return(
md`<div>
  <h1 style="display: none">Jumpgate</h1>
  ${ await FileAttachment('image (7) (1).png').image({ width: 640 }) }
</div>`
)};
const _w9awxb = function _2(md){return(
md`Jumpgate takes an ordinary notebook from Observable, mixes it with extra tooling (the frame), and exports it to a single [Lopecode](https://github.com/tomlarkworthy/lopecode) file, which you can optionally push to Github, preview or download as an offline-first file.

We use this approach to mixin userspace tooling implemented notebook tooling, like an editor and a notebook explorer. The resultant file is enriched, including the ability to self-edit and reserialize itself, but now without an internet connection and openable as a \`file://\` domain.

This notebook be automated via url parameters (see [my lopebooks](https://observablehq.com/@tomlarkworthy/my-lopebooks)).

[Youtube intro video](https://www.youtube.com/watch?v=1UQMFp0wz-Q)`
)};
const _8jyick = function _3(md){return(
md`### Changes
- 2025-05-17 Fixed bug that was not exploiting the cache properly, or switching branches cleanly.`
)};
const _14r4pa4 = function _4(md){return(
md`## Source Configuration`
)};
const _1a1yoio = function _source(Inputs,urlQueryFieldView){return(
Inputs.bind(Inputs.text({
    label: 'source',
    width: '100%'
}), urlQueryFieldView('source', { defaultValue: 'https://observablehq.com/@tomlarkworthy/jumpgate' }))
)};
const _12f4ijd = (G, _) => G.input(_);
const _1w3sni4 = function _frame(Inputs,localStorageView){return(
Inputs.bind(Inputs.text({
    label: 'frame',
    width: '100%'
}), localStorageView('frame', { defaultValue: 'https://observablehq.com/@tomlarkworthy/lopepage' }))
)};
const _1g7hrpv = (G, _) => G.input(_);
const _qvbk64 = function _7(md){return(
md`We set the [export_state.json](https://observablehq.com/@tomlarkworthy/exporter#exportState) configuration file so that subsequent exports keep settings, and open with the main notebook first with the module selection.`
)};
const _1lfc19w = function _export_state_text(Inputs,urlQueryFieldView,sources){return(
Inputs.bind(Inputs.textarea({
    label: 'export options',
    rows: 8
}), urlQueryFieldView('export_state', {
    defaultValue: JSON.stringify({
        title: sources[0],
        hash: `#view=${ encodeURI(`R100(S70(${ sources[0] }),S30(@tomlarkworthy/module-selection))`) }`
    }, null, 2)
}))
)};
const _engyrs = (G, _) => G.input(_);
const _178u8to = function _load_source(Inputs,urlQueryFieldView){return(
Inputs.bind(Inputs.toggle({ label: 'load source' }), urlQueryFieldView('load_source', {
    defaultValue: false,
    decode: JSON.parse
}))
)};
const _ykbht6 = (G, _) => G.input(_);
const _1fgy6js = function _10(md){return(
md`**The following lines error until you instruct the notebook to call the Observable API by ticking the box above.**`
)};
const _ldom2f = function _11(Inputs,exported){return(
Inputs.textarea({
    label: 'export',
    value: exported.source,
    width: '100%',
    disabled: true,
    rows: 20
})
)};
const _kwl5xd = function _12(Inputs,exported){return(
Inputs.button('preview', {
    reduce: () => {
        const url = URL.createObjectURL(new Blob([exported.source], { type: 'text/html' }));
        window.open(url, '_blank');
    }
})
)};
const _1snc6r3 = function _13(Inputs,exported,source_notebook,getCompactISODate){return(
Inputs.button('download', {
    reduce: () => {
        const url = URL.createObjectURL(new Blob([exported.source], { type: 'text/html' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ source_notebook }_${ getCompactISODate() }.html`;
        a.click();
        URL.revokeObjectURL(url);
    }
})
)};
const _w0znvy = function _14(Inputs,exported){return(
Inputs.table(exported.report, {
    sort: 'size',
    reverse: true
})
)};
const _1jy8l5r = function _15(md){return(
md`## Target Repository

Here is configuration of the target git repository. You will need to add a personal access token to give the notebook the authority to write to branches.`
)};
const _w1askb = function _target_git(Inputs,urlQueryFieldView){return(
Inputs.bind(Inputs.text({
    label: 'git URL',
    width: '100%'
}), urlQueryFieldView('git_url', { defaultValue: 'https://github.com/tomlarkworthy/lopebooks' }))
)};
const _1gmip1a = (G, _) => G.input(_);
const _187ibxa = function _github_token(Inputs,localStorageView){return(
Inputs.bind(Inputs.password({ label: 'Github token (saved to local storage)' }), localStorageView('jumpgate_github_token'))
)};
const _wh0905 = (G, _) => G.input(_);
const _agtdk9 = function _corsProxy(Inputs){return(
Inputs.text({
    label: 'cors proxy',
    value: 'https://isomorphic.endpointservices.workers.dev'
})
)};
const _2frb2l = (G, _) => G.input(_);
const _z5q97j = function _wipe_filesystem(Inputs){return(
Inputs.toggle({
    label: 'wipe filesystem',
    value: false
})
)};
const _pqaxud = (G, _) => G.input(_);
const _6lcbnz = function _commit(Inputs,urlQueryFieldView){return(
Inputs.bind(Inputs.toggle({ label: 'commit' }), urlQueryFieldView('commit', {
    defaultValue: false,
    decode: JSON.parse
}))
)};
const _fuzaxx = (G, _) => G.input(_);
const _5nsj1i = function _21(md){return(
md`**The following line will error until you instruct the notebook to perform git operations by ticking \`commit\`** the checkbox above. The git checkout state is persisted to IndexDB using lightning-fs and isomorphic-git, if the notebook gets stuck, you might find checking "wipe filesystem" helps reset the state.
`
)};
const _1izyjlg = function _22(htl,push_git,target_git,ref){return(
htl.html`${ push_git && '' }
<a href="${ target_git }/compare/${ ref }" target="_blank">Create Github Pull Request</a>`
)};
const _br44vv = function _23(md){return(
md`---`
)};
const _qlgzz6 = function _24(md){return(
md`# Implementation`
)};
const _17ywyn9 = function _25(md){return(
md`isomorphic-git [docs](https://isomorphic-git.org/docs/en/alphabetic)`
)};
const _a0gduk = function _26(md){return(
md`## Source to filesystem`
)};
const _15d19xj = function _frame_notebook(frame){return(
frame.trim().replace('https://observablehq.com/', '')
)};
const _i6scjf = function _sources(source){return(
source.split(',').map(s => s.trim().replace('https://observablehq.com/', '')).filter(Boolean)
)};
const _1g71l5j = function _notebook_filename(sources){return(
sources[0].replace('/', '_') + '.html'
)};
const _i3c3vr = function _embedded_runtime(Library,Runtime,invalidation)
{
    const library = new Library();
    const runtime = new Runtime(library);
    invalidation.then(() => runtime.dispose());
    return runtime;
};
const _1tujgle = async function _frame_define(load_source, frame_notebook) {
    if (!load_source)
        throw 'Load source not ticked';
    return (await import(`https://api.observablehq.com/${ frame_notebook }.js?v=4&resolutions=0000000000000000`)).default;
};
const _60o1g4 = function _source_defines(load_source, sources) {
    if (!load_source)
        throw 'Load source not ticked';
    document.querySelectorAll('script[type="text/plain"]').forEach(el => el.remove());
    return Promise.all(sources.map(async name => {
        return (await import(`https://api.observablehq.com/${ name }.js?v=4&resolutions=0000000000000000`)).default;
    }));
};
const _1ve8cy5 = function _embedded_frame(embedded_runtime,frame_define){return(
embedded_runtime.module(frame_define)
)};
const _baupsx = function _embedded_sources(embedded_frame,source_defines,embedded_runtime){return(
embedded_frame && source_defines.map(d => embedded_runtime.module(d))
)};
const _12rszvc = function _output(){return(
undefined
)};
const _1bm14tj = (M, _) => new M(_);
const _1xnufay = _ => _.generator;
const _sfc2xb = async function _modules(embedded_frame,embedded_sources,moduleMap,embedded_runtime)
{
    embedded_frame;
    embedded_sources;
    return await moduleMap(embedded_runtime);
};
const _1fsy3d9 = function _module_selections(modules){return(
[...modules.values()].filter(info => info.name == '@tomlarkworthy/module-selection')
)};
const _1e2cmv6 = function _export_state(export_state_text){return(
JSON.parse(export_state_text)
)};
const _11r6j98 = function _exported(exportToHTML,embedded_runtime,frame_notebook,embedded_frame,sources,embedded_sources,export_state,$0){return(
exportToHTML({
    runtime: embedded_runtime,
    mains: new Map([
        [
            frame_notebook,
            embedded_frame
        ],
        ...sources.map((name, i) => [
            name,
            embedded_sources[i]
        ])
    ]),
    options: {
        ...export_state,
        debug: false,
        headless: true,
        output: out => $0.value = out
    }
})
)};
const _ua31bq = function _tasks(tomlarkworthy_exporter_task)
{
    tomlarkworthy_exporter_task;
};
const _1u2jo5f = function _dir(target_git){return(
'/' + target_git.replace('https://', '').replaceAll('/', '_').replaceAll('.', '_')
)};
const _qm6e7d = function _filesystem(FS,wipe_filesystem){return(
new FS('jumpgate', { wipe: wipe_filesystem }).promises
)};
const _ohwnz0 = async function _update_main_branch(commit,filesystem,dir,git,http,corsProxy,target_git)
{
    if (!commit)
        throw 'skipped';
    try {
        await filesystem.lstat(dir);
        await git.fetch({
            fs: filesystem,
            filesystem,
            http,
            dir,
            corsProxy: corsProxy,
            url: target_git,
            ref: 'main',
            remoteRef: 'main',
            singleBranch: true
        });
    } catch (err) {
        return git.clone({
            fs: filesystem,
            filesystem,
            http,
            dir,
            corsProxy: corsProxy,
            url: target_git,
            ref: 'main',
            //noCheckout: true,
            singleBranch: true
        });
    }
};
const _1sf4i9c = function _ref(dir,wipe_filesystem,notebook_filename,getCompactISODate)
{
    dir;
    wipe_filesystem;
    return notebook_filename + '_' + getCompactISODate();
};
const _dk6uv0 = async function _branch_to_ref(update_main_branch,git,filesystem,dir,ref)
{
    update_main_branch;
    return await git.branch({
        fs: filesystem,
        object: 'origin/main',
        dir,
        ref,
        checkout: true
    });
};
const _1w68hiu = async function _create_directory(branch_to_ref,filesystem,dir)
{
    branch_to_ref;
    try {
        return await filesystem.mkdir(`${ dir }/notebooks`);    //EEXIST if opening this page again, FS persists to IndexedDB!
    } catch (err) {
        if (err.message === 'EEXIST') {
            return;
        } else {
            throw err;
        }
    }
};
const _s7pd0u = async function _write_notebook(create_directory,filesystem,dir,notebook_filename,exported)
{
    create_directory;
    return await filesystem.writeFile(`${ dir }/notebooks/${ notebook_filename }`, exported.source);
};
const _1x8zwm = async function _filepaths(write_notebook,filesystem)
{
    write_notebook;
    const paths = [];
    async function walk(d) {
        for (const name of await filesystem.readdir(d)) {
            const p = d === '/' ? `/${ name }` : `${ d }/${ name }`;
            const stat = await filesystem.stat(p);
            if (stat.type === 'dir') {
                await walk(p);
            } else {
                paths.push(p);
            }
        }
    }
    await walk('/');
    return paths;
};
const _4q586c = function _written_file(write_notebook,filesystem,dir,notebook_filename)
{
    write_notebook;
    return filesystem.readFile(`${ dir }/notebooks/${ notebook_filename }`, { encoding: 'utf8' });
};
const _qf23vh = function _add_git(written_file,git,filesystem,dir)
{
    written_file;
    return git.add({
        fs: filesystem,
        dir,
        filepath: '.'    //`notebooks/${notebook_filename}`
    });
};
const _1vqr559 = function _commit_git(commit,add_git,git,filesystem,dir,ref)
{
    if (!commit)
        throw 'skipped';
    add_git;
    return git.commit({
        fs: filesystem,
        dir,
        author: {
            name: 'Jumpgate',
            email: 'jumpgate@lopecode.com'
        },
        message: `Jumpgate for ${ ref }`
    });
};
const _13btzr9 = function _push_git(commit_git,git,filesystem,http,dir,ref,corsProxy,github_token)
{
    commit_git;
    return git.push({
        fs: filesystem,
        force: true,
        http,
        dir,
        remote: 'origin',
        ref,
        corsProxy: corsProxy,
        remoteRef: ref,
        onAuth: () => ({ username: github_token })
    });
};
const _zq4y0c = function _53(exporter){return(
exporter()
)};
const _6n5n9w = function _54(md){return(
md`## Imports`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image (7) (1).png"].map((name) => {
    const module_name = "@tomlarkworthy/jumpgate";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/observable-runtime", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/lightning-fs-4-6-0", async () => runtime.module((await import("/@tomlarkworthy/lightning-fs-4-6-0.js?v=4")).default));  
  main.define("module @tomlarkworthy/isomorphic-git-1-30-1", async () => runtime.module((await import("/@tomlarkworthy/isomorphic-git-1-30-1.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage", async () => runtime.module((await import("/@tomlarkworthy/lopepage.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/url-query-field-view", async () => runtime.module((await import("/@tomlarkworthy/url-query-field-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  $def("_19jpp5s", null, ["md","FileAttachment"], _19jpp5s);  
  $def("_w9awxb", null, ["md"], _w9awxb);  
  $def("_8jyick", null, ["md"], _8jyick);  
  $def("_14r4pa4", null, ["md"], _14r4pa4);  
  $def("_1a1yoio", "viewof source", ["Inputs","urlQueryFieldView"], _1a1yoio);  
  $def("_12f4ijd", "source", ["Generators","viewof source"], _12f4ijd);  
  $def("_1w3sni4", "viewof frame", ["Inputs","localStorageView"], _1w3sni4);  
  $def("_1g7hrpv", "frame", ["Generators","viewof frame"], _1g7hrpv);  
  $def("_qvbk64", null, ["md"], _qvbk64);  
  $def("_1lfc19w", "viewof export_state_text", ["Inputs","urlQueryFieldView","sources"], _1lfc19w);  
  $def("_engyrs", "export_state_text", ["Generators","viewof export_state_text"], _engyrs);  
  $def("_178u8to", "viewof load_source", ["Inputs","urlQueryFieldView"], _178u8to);  
  $def("_ykbht6", "load_source", ["Generators","viewof load_source"], _ykbht6);  
  $def("_1fgy6js", null, ["md"], _1fgy6js);  
  $def("_ldom2f", null, ["Inputs","exported"], _ldom2f);  
  $def("_kwl5xd", null, ["Inputs","exported"], _kwl5xd);  
  $def("_1snc6r3", null, ["Inputs","exported","source_notebook","getCompactISODate"], _1snc6r3);  
  $def("_w0znvy", null, ["Inputs","exported"], _w0znvy);  
  $def("_1jy8l5r", null, ["md"], _1jy8l5r);  
  $def("_w1askb", "viewof target_git", ["Inputs","urlQueryFieldView"], _w1askb);  
  $def("_1gmip1a", "target_git", ["Generators","viewof target_git"], _1gmip1a);  
  $def("_187ibxa", "viewof github_token", ["Inputs","localStorageView"], _187ibxa);  
  $def("_wh0905", "github_token", ["Generators","viewof github_token"], _wh0905);  
  $def("_agtdk9", "viewof corsProxy", ["Inputs"], _agtdk9);  
  $def("_2frb2l", "corsProxy", ["Generators","viewof corsProxy"], _2frb2l);  
  $def("_z5q97j", "viewof wipe_filesystem", ["Inputs"], _z5q97j);  
  $def("_pqaxud", "wipe_filesystem", ["Generators","viewof wipe_filesystem"], _pqaxud);  
  $def("_6lcbnz", "viewof commit", ["Inputs","urlQueryFieldView"], _6lcbnz);  
  $def("_fuzaxx", "commit", ["Generators","viewof commit"], _fuzaxx);  
  $def("_5nsj1i", null, ["md"], _5nsj1i);  
  $def("_1izyjlg", null, ["htl","push_git","target_git","ref"], _1izyjlg);  
  $def("_br44vv", null, ["md"], _br44vv);  
  $def("_qlgzz6", null, ["md"], _qlgzz6);  
  $def("_17ywyn9", null, ["md"], _17ywyn9);  
  $def("_a0gduk", null, ["md"], _a0gduk);  
  $def("_15d19xj", "frame_notebook", ["frame"], _15d19xj);  
  $def("_i6scjf", "sources", ["source"], _i6scjf);  
  $def("_1g71l5j", "notebook_filename", ["sources"], _1g71l5j);  
  $def("_i3c3vr", "embedded_runtime", ["Library","Runtime","invalidation"], _i3c3vr);  
  $def("_1tujgle", "frame_define", ["load_source","frame_notebook"], _1tujgle);  
  $def("_60o1g4", "source_defines", ["load_source","sources"], _60o1g4);  
  $def("_1ve8cy5", "embedded_frame", ["embedded_runtime","frame_define"], _1ve8cy5);  
  $def("_baupsx", "embedded_sources", ["embedded_frame","source_defines","embedded_runtime"], _baupsx);  
  $def("_12rszvc", "initial output", [], _12rszvc);  
  $def("_1bm14tj", "mutable output", ["Mutable","initial output"], _1bm14tj);  
  $def("_1xnufay", "output", ["mutable output"], _1xnufay);  
  $def("_sfc2xb", "modules", ["embedded_frame","embedded_sources","moduleMap","embedded_runtime"], _sfc2xb);  
  $def("_1fsy3d9", "module_selections", ["modules"], _1fsy3d9);  
  $def("_1e2cmv6", "export_state", ["export_state_text"], _1e2cmv6);  
  $def("_11r6j98", "exported", ["exportToHTML","embedded_runtime","frame_notebook","embedded_frame","sources","embedded_sources","export_state","mutable output"], _11r6j98);  
  $def("_ua31bq", "tasks", ["tomlarkworthy_exporter_task"], _ua31bq);  
  $def("_1u2jo5f", "dir", ["target_git"], _1u2jo5f);  
  $def("_qm6e7d", "filesystem", ["FS","wipe_filesystem"], _qm6e7d);  
  $def("_ohwnz0", "update_main_branch", ["commit","filesystem","dir","git","http","corsProxy","target_git"], _ohwnz0);  
  $def("_1sf4i9c", "ref", ["dir","wipe_filesystem","notebook_filename","getCompactISODate"], _1sf4i9c);  
  $def("_dk6uv0", "branch_to_ref", ["update_main_branch","git","filesystem","dir","ref"], _dk6uv0);  
  $def("_1w68hiu", "create_directory", ["branch_to_ref","filesystem","dir"], _1w68hiu);  
  $def("_s7pd0u", "write_notebook", ["create_directory","filesystem","dir","notebook_filename","exported"], _s7pd0u);  
  $def("_1x8zwm", "filepaths", ["write_notebook","filesystem"], _1x8zwm);  
  $def("_4q586c", "written_file", ["write_notebook","filesystem","dir","notebook_filename"], _4q586c);  
  $def("_qf23vh", "add_git", ["written_file","git","filesystem","dir"], _qf23vh);  
  $def("_1vqr559", "commit_git", ["commit","add_git","git","filesystem","dir","ref"], _1vqr559);  
  $def("_13btzr9", "push_git", ["commit_git","git","filesystem","http","dir","ref","corsProxy","github_token"], _13btzr9);  
  $def("_zq4y0c", null, ["exporter"], _zq4y0c);  
  $def("_6n5n9w", null, ["md"], _6n5n9w);  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("Inspector", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("Library", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Library", _));  
  main.define("RuntimeError", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("RuntimeError", _));  
  main.define("getFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("removeFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("removeFileAttachment", _));  
  main.define("attachments", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("attachments", _));  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportToHTML", _));  
  main.define("tomlarkworthy_exporter_task", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("tomlarkworthy_exporter_task", _));  
  main.define("getCompactISODate", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("getCompactISODate", _));  
  main.define("FS", ["module @tomlarkworthy/lightning-fs-4-6-0", "@variable"], (_, v) => v.import("FS", _));  
  main.define("git", ["module @tomlarkworthy/isomorphic-git-1-30-1", "@variable"], (_, v) => v.import("git", _));  
  main.define("http", ["module @tomlarkworthy/isomorphic-git-1-30-1", "@variable"], (_, v) => v.import("http", _));  
  main.define("page", ["module @tomlarkworthy/lopepage", "@variable"], (_, v) => v.import("page", _));  
  main.define("background_jobs", ["module @tomlarkworthy/lopepage", "@variable"], (_, v) => v.import("background_jobs", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("urlQueryFieldView", ["module @tomlarkworthy/url-query-field-view", "@variable"], (_, v) => v.import("urlQueryFieldView", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}