const _213tc3 = function _1(md){return(
md`# Automatically Backup [Observable](observablehq.com) notebooks to Github

Take control of your data and relax. Backup your public and team [Observable](https://observablehq.com) notebooks to a Github repository *automatically when published*.
By using a combination of [on version hook](https://observablehq.com/@endpointservices/onversion) which executes after a notebook is published, and [repository dispatch](https://observablehq.com/@tomlarkworthy/repository-dispatch) which starts a Github Action workflow, we can automatically export and unpack notebook source code to a Github repository every change.

The setup is a two step process.
1. In the notebooks, import and call \`enableGithubBackups({ owner, repo })\`
2. In the Github repository, setup an Action Workflow that downloads the \`notebook.tar.gz\` and unpacks it.

[Observable notebook exports](https://observablehq.com/@observablehq/downloading-and-embedding-notebooks) are ES6 modules with a HTML runner. You can easily run your notebooks without a dependency on Observable servers, or include the code in a build process. Take a look for yourself at our Github backups [here](https://github.com/endpointservices/observable-notebooks).

### Changes
- 2024-03-23 Removed v1 API sniffing by request of Observablehq staff, but it still works`
)};
const _1bebb2r = function _2(md){return(
md`## Import the Github backup notebook.


~~~js
import {enableGithubBackups, backupNowButton} from \`@tomlarkworthy/github-backups\`
~~~`
)};
const _137un7k = async function _3(FileAttachment,md){return(
md`## Call \`enableGithubBackups({ owner, repo })\`

In an Observable notebook call \`enableGithubBackups({ owner, repo })\` with the target Github repository for backups. For example,

~~~js 
enableGithubBackups({
  owner: "endpointservices",                   // Target Github username/organization
  repo: "observable-notebooks",                // Target Github repo
  allow: ['tomlarkworthy', 'endpointservices'] // [optional] Allowed source observablehq logins
})
~~~

This will open a webcode endpoint UI. Store a Github [access token](https://github.com/settings/tokens/new) in a secret named \`github_token\`, and bind it to the endpoint, as shown below. If you add an API key you can backup non-public team notebooks.

${await FileAttachment("image@1.png").image({style: 'max-width: 640px'})}

⚠️ You notebook must be public *or* you must provide an API key for the backup process to read the source.
`
)};
const _1b1nz2s = function _4(md){return(
md`### Implementation`
)};
const _ceocth = function _enableGithubBackups(onVersion,dispatchProxyName,urlFromId,createDispatchProxy){return(
function enableGithubBackups({ owner, repo, debugProxy, allow } = {}) {
  // Create onVersion hook, which simply forwards to the dispatchProxyEndpoint
  onVersion(async ({ id, version } = {}) => {
    // To check if this was called send a request to a honeypot
    fetch(
      `https://webcode.run/observablehq.com/@endpointservices/realtime-request-log` +
        `/version-${id}@${version}`
    );

    // Endpoints don't work in the thumbnail process, as they cannot figure out their top level slugs
    // However, as we have the id and version passed in we can derive it.
    let dispatchURL = `https://webcode.run/observablehq.com/d/${id};${dispatchProxyName(
      { owner, repo, event_type: "new_notebook_version" }
    )}`;
    // Now we forward this information to the dispatch function
    fetch(dispatchURL, {
      method: "POST",
      body: JSON.stringify({ url: await urlFromId(id), id, version })
    });
  });

  const dispatchBackup = createDispatchProxy({
    owner,
    repo,
    event_type: "new_notebook_version",
    client_payload: null,
    debug: debugProxy,
    beforeDispatch: async ({ client_payload } = {}, ctx) => {
      // Mixin the apiKey so Github can access private code exports
      client_payload.api_key = ctx.secrets.api_key;
    }
  });

  return dispatchBackup;
}
)};
const _kc0eet = function _6(md){return(
md`### Backup now button

It's useful, especially when setting up, to manually trigger the backup. Use the \`backupNowButton()\` function to trigger the Github workflow.`
)};
const _qz5e38 = function _backupNowButton(Inputs,html){return(
() =>
  Inputs.button("backup now", {
    reduce: async () => {
      const notebookURL = html`<a href="?">`.href
        .replace("https://", "")
        .replace("?", "");

      const dispatchName = Object.keys(window.deployments).find((n) =>
        n.endsWith("_new_notebook_version")
      );
      fetch(`https://webcode.run/${notebookURL};${dispatchName}`, {
        method: "POST",
        body: JSON.stringify({
          url: "https://" + notebookURL
        })
      });
    }
  })
)};
const _124ofm2 = function _8(md){return(
md`### Backup all your public Notebooks

Once setup, the backup endpoint can backup *any* notebook. This is used by [manual-backup-all](https://observablehq.com/@tomlarkworthy/manual-backup-all) to scrape the Observable website and backup all discovered notebooks.

`
)};
const _1lm5qor = function _9(md){return(
md`### What *enableGithubBackups* does

*enableGithubBackups* setups up an endpoint that receives \`onVersion\` hook that triggers backup repository workflow stored in Github. The endpoint sends the Github repository workflow an event_type of type \`new_notebook_version\` along with a client payload JSON containing the notebook \`id\` and \`version\` and authenticated with the \`github_token\` credentials.

Note the actual backup is performed by a Github Action.

`
)};
const _1h45zf0 = function _10(md){return(
md`## Setup \`.github/workflows/backup.yml\`

In a Github repository for backups, create a workflow for performing the backups. The following example comes from [endpointservices/observable-notebooks/.github/workflows/backup.yml](https://github.com/endpointservices/observable-notebooks/blob/main/.github/workflows/backup.yml). Note you can send all notebooks to the same repository as they are prefixed by Observable login and slug.

\`\`\`bash
name: backups
on:
  repository_dispatch:
    types: [new_notebook_version]
    
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: backup
        run: |
          set -euo pipefail  
          # The URL is the notebook source, e.g. https://observablehq.com/@tomlarkworthy/github-backups 
          URL="\${{github.event.client_payload.url}}"
          # We convert this to @tomlarkworthy/github-backups by striping the prefix
          path="\${URL/https:\\/\\/observablehq.com\\//}"
          
          echo 'url:  \${{github.event.client_payload.url}}'
          echo "path: \${path}"
          # NOTE: api_key parameter not printed for security reasons, but it may be present
          # Download tar from Observable directly (do not echo, may contain API key)
          curl "https://api.observablehq.com/\${path}.tgz?v=3&api_key=\${{github.event.client_payload.api_key}}" > notebook.tgz
          
          # Turn on echo of commands now
          set -x

          rm -rf "\${path}"
          mkdir -p "\${path}"
          tar -xf notebook.tgz -C "\${path}"
          git config --global user.name 'backup-to-github'
          git config --global user.email 'robot@webcode.run'
          git add "\${path}"
          git pull
          if ! git diff-index --quiet HEAD; then
            git commit -m 'Backup \${{github.event.client_payload.url}}   
            url:     \${{github.event.client_payload.url}}
            title:   \${{github.event.client_payload.title}}
            author:  \${{github.event.client_payload.author}}
            id:      \${{github.event.client_payload.id}}
            '
            git push
          fi
\`\`\`
`
)};
const _1wngbbc = function _11(md){return(
md`You can see if your workflow is triggering in the action sections of your repository in Github.`
)};
const _62b9y0 = function _12(md){return(
md`## Daily backup job

Because the \`onVersion\` hook is best effort, a [daily job](https://observablehq.com/@endpointservices/backups-failsafe) will also call the backup workflow to ensure backups converge to the latest.`
)};
const _r0e8fj = function _13(md){return(
md`## Example

The following cell backs up *this* notebook for real! [Here](https://github.com/endpointservices/observable-notebooks/blob/main/%40tomlarkworthy/github-backups/index.html) it is in Github (and the Action Workflow file is in that repository too). Of course, if you are not *tomlarkworthy* you cannot login the the endpoint below, and there is no way to access my personal *github_token* but it is there, enabling the integration.`
)};
const _gd2yjt = function _14(enableGithubBackups){return(
enableGithubBackups({
  owner: "endpointservices",
  repo: "observable-notebooks",
  allow: ["tomlarkworthy", "endpointservices"],
  debugProxy: true // Places breakpoint inside dispatch proxy (final step before Github)
})
)};
const _jvi49u = function _15(backupNowButton){return(
backupNowButton()
)};
const _1rr8xak = function _16(md){return(
md`### Info

endpoint expects a request with the body of the form 

~~~
{
    "url": "https://observablehq.com/@tomlarkworthy/github-backups",
    "id": "..." // used to drive the download URL (https://api.observablehq.com/@tomlarkworthy/github-backups@642.tgz?v=3)
    "api_key": "..." // optional
}
~~~`
)};
const _1bnkaup = function _17(md){return(
md`### Utils`
)};
const _1mx1a03 = function _urlFromId(fetchp){return(
async (id) => {
  const response = await (
    await fetchp(`https://api.observablehq.com/document/${id}/head?v=4`)
  ).json();
  if (response.slug) {
    return `https://observablehq.com/@tomlarkworthy/${response.slug}`;
  }
  return `https://observablehq.com/d/${id}`;
}
)};
const _1pf953 = function _19(urlFromId){return(
urlFromId("d023d6fa23f3afd0")
)};
const _f2anlm = function _20(md){return(
md`## Dependencies`
)};
const _72ykgx = function _trusted_domain(){return(
["api.observablehq.com"]
)};
const _1eo5pmd = function _26(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png","image@1.png"].map((name) => {
    const module_name = "@tomlarkworthy/github-backups";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @endpointservices/onversion", async () => runtime.module((await import("/@endpointservices/onversion.js?v=4")).default));  
  main.define("module @tomlarkworthy/repository-dispatch-min", async () => runtime.module((await import("/@tomlarkworthy/repository-dispatch-min.js?v=4")).default));  
  main.define("module @endpointservices/footer", async () => runtime.module((await import("/@endpointservices/footer.js?v=4")).default));  
  main.define("module 4", async () => runtime.module((await import("/4.js?v=4")).default));  
  $def("_213tc3", null, ["md"], _213tc3);  
  $def("_1bebb2r", null, ["md"], _1bebb2r);  
  $def("_137un7k", null, ["FileAttachment","md"], _137un7k);  
  $def("_1b1nz2s", null, ["md"], _1b1nz2s);  
  $def("_ceocth", "enableGithubBackups", ["onVersion","dispatchProxyName","urlFromId","createDispatchProxy"], _ceocth);  
  $def("_kc0eet", null, ["md"], _kc0eet);  
  $def("_qz5e38", "backupNowButton", ["Inputs","html"], _qz5e38);  
  $def("_124ofm2", null, ["md"], _124ofm2);  
  $def("_1lm5qor", null, ["md"], _1lm5qor);  
  $def("_1h45zf0", null, ["md"], _1h45zf0);  
  $def("_1wngbbc", null, ["md"], _1wngbbc);  
  $def("_62b9y0", null, ["md"], _62b9y0);  
  $def("_r0e8fj", null, ["md"], _r0e8fj);  
  $def("_gd2yjt", null, ["enableGithubBackups"], _gd2yjt);  
  $def("_jvi49u", null, ["backupNowButton"], _jvi49u);  
  $def("_1rr8xak", null, ["md"], _1rr8xak);  
  $def("_1bnkaup", null, ["md"], _1bnkaup);  
  $def("_1mx1a03", "urlFromId", ["fetchp"], _1mx1a03);  
  $def("_1pf953", null, ["urlFromId"], _1pf953);  
  $def("_f2anlm", null, ["md"], _f2anlm);  
  $def("_72ykgx", "trusted_domain", [], _72ykgx);  
  main.define("onVersion", ["module @endpointservices/onversion", "@variable"], (_, v) => v.import("onVersion", _));  
  main.define("createDispatchProxy", ["module @tomlarkworthy/repository-dispatch-min", "@variable"], (_, v) => v.import("createDispatchProxy", _));  
  main.define("dispatchProxyName", ["module @tomlarkworthy/repository-dispatch-min", "@variable"], (_, v) => v.import("dispatchProxyName", _));  
  main.define("footer", ["module @endpointservices/footer", "@variable"], (_, v) => v.import("footer", _));  
  main.define("fetchp", ["module 4", "@variable"], (_, v) => v.import("fetchp", _));  
  $def("_1eo5pmd", null, ["footer"], _1eo5pmd);
  return main;
}