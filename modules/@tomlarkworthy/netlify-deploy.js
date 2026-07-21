const _1klxalg = async function _1(html,md,FileAttachment){return(
html`<div class="content">${md`
# Static Site Generator (Netlify)

Deploy an high performance static site from a notebook. Using Observable as the administrative front end to Netlify hosting has a few nice properties.

- Static file hosting for incredible performance.
- Option to create your build tooling and content programatically. 
- All hosted in the browser so no tools to install.
- Out of the box support for Markdown, Latex, SVG and raw HTML. Add your own!
- Partial deployments, only files that change are sent to Netlify. Its fast to deploy.
- Intelligent cacheing, CDN cache is purged on deploy, so no more uncertainty waiting around for the live version to update.
- URL based content definition, deploy files from external sources too.

To use, call _deployStaticFile_ in a content notebook.

~~~js
    import {deployStaticFile, queryDependants} from '@tomlarkworthy/netlify-deploy'
~~~

Instantiate against the *api_id* of your Netlify project (mislabelled app_id here), the URL of the content you wish to deploy, and the path on the website that you want.

~~~js
    deployStaticFile({
      app_id: 'b6a918d2-9cda-4fde-b2ec-add91b22ea02', // Find in Netlify site settings
      source: preview.href,                           // Address to find the content 
      target: "/blogs/jamstack.html",                 // Path suffix on domain
      tags: ["blog"],                                 // Used for organization
      dependsOnTags: ["global"]                       // Content inter-depedencies
    })
~~~

The function will return a HTML form that triggers a deploy:

![](${await FileAttachment("image@5.png").url()})

For a minimal example have a look at [@tdlgkjfhdljovtttqrzu/netlify-test](https://observablehq.com/@tdlgkjfhdljovtttqrzu/netlify-test)

I write my personal blog using this tool. Some examples

- An article template I fork for blog posts https://observablehq.com/@tomlarkworthy/blog-simple-article-template
- Setting up a common page theme: https://observablehq.com/@tomlarkworthy/blog-theme
- Creating a top level index.html of the last 20 articles: https://observablehq.com/@tomlarkworthy/blog-index-html
- Adding an RSS feed: https://observablehq.com/@tomlarkworthy/rss-feed

The blog is hosted on [tomlarkworthy.endpointservices.net](https://tomlarkworthy.endpointservices.net/). On my blog, the footer of each page links the [Observablehq.com](https://observablehq.com) source code.

`}`
)};
const _1hv2jvx = function _2(html,md){return(
html`<div class="content">${md`
### One-off Setup
Login to Endpoint Services and Authorize it with Netlify
`}`
)};
const _bpvxyp = async function _authorizer($0,html,session,firebase,params,nextNonce,client_id)
{
  // Ensure user is logged in
  if (!($0).value.uid) return html`${$0}`;
  if (session.access_token) {
    async function unauthorize() {
      await firebase.firestore()
        .doc(`/services/netlify-proxy/sessions/${($0).value.uid}`)
        .delete();
    }
    return html`<div>
                ${$0}
                <a class="button"
                   href="https://app.netlify.com/authorize"
                   onclick=${unauthorize}>Unauthorize with Netlify</a>`
  } else if (params.access_token) {
    if (session.nonce === params.state.nonce) {
      await firebase.firestore()
        .doc(`/services/netlify-proxy/sessions/${($0).value.uid}`)
        .set({
          access_token: params.access_token,
          token_type: params.token_type
        }, {merge: true});
      return html`Authorized`;
    } else {
      return html`<a class="button" href="https://observablehq.com/@endpointservices/netlify">Mismatched nonce reload</a>`;
    }
  } else {
    if (nextNonce !== session.nonce) {
      await firebase.firestore()
        .doc(`/services/netlify-proxy/sessions/${($0).value.uid}`)
        .set({
          nonce: nextNonce
        }, {merge: true});
    }
    
    async function authorize(evt) {
      const url = 'https://app.netlify.com/authorize?' +
            'client_id=' + client_id +
            '&response_type=token' +
            '&redirect_uri=https://observablehq.com/@endpointservices/netlify' +
            '&state=' + encodeURIComponent(JSON.stringify(session));
      evt.target.href = url;
    }

    return html`<div>
      ${$0}
      <a class="button"
         href="https://app.netlify.com/authorize"
         onclick=${authorize}>authorize with Netlify</a>
    </div>`
  }
  
};
const _ekh6hw = function _4(html,md){return(
html`<div class="content">${md`
## Static Site Generator library functions
`}`
)};
const _191ofuz = function _5(signature,deployStaticFile){return(
signature(deployStaticFile, {
  description: 'Deploys a file to a path on a Netlify hosted domain.',
  open: true
})
)};
const _oox0mu = function _deployStaticFile(deployStaticFiles){return(
async function deployStaticFile({
    app_id,             // Netlify api_id (typod to app_id)
    target,             // Path on domain to deploy this file to
    source,             // URL where to fecth file contents.
    tags = [],          // Search tags for content queries
    dependsOnTags = [], // Describe depedencies between content
    ...metadata         // Additional user fields to be saved in CMS
  } = {}) {
  return deployStaticFiles({
    app_id,
    files: [{
      app_id,
      target,
      source,
      tags,
      dependsOnTags,
      ...metadata
    }]
  })
}
)};
const _rcjscl = function _7(signature,deployStaticFiles){return(
signature(deployStaticFiles, {
  description: 'Deploys several files on Netlify hosted domain.',
  open: true
})
)};
const _jgi9hf = function _deployStaticFiles(spinners,html,$0,session,nextNonce,firebase,client_id,location,promiseRecursive,message,updateDigest,createDeploy,deployments,uploadContent,md,Inputs){return(
async function deployStaticFiles({
    app_id,             // Netlify api_id (typod to app_id)
    immediate = false,    // auto-deploy (no button click)
    files = [
      //target,             // Path on domain to deploy this file to
      //source,             // URL where to fecth file contents.
      //tags = [],          // Search tags for content queries
      //dependsOnTags = [], // Describe depedencies between content
      //...metadata         // Additional user fields to be saved in CMS
    ]
  } = {}) {
  const id = files[0].target;
  if (spinners[id]) return html`${spinners[id]}`;
  
  // Ensure user is logged in
  if (!($0).value.uid) return html`${$0}`;
  
  // If there is no session data
  if (!session.access_token) {  
    "deployStaticFiles: no access token"
    if (nextNonce !== session.nonce) {
      await firebase.firestore()
        .doc(`/services/netlify-proxy/sessions/${($0).value.uid}`)
        .set({
          nonce: nextNonce
        }, {merge: true});
    }
    
    async function authorize(evt) {
      const url = 'https://app.netlify.com/authorize?' +
            'client_id=' + client_id +
            '&response_type=token' +
            '&redirect_uri=https://observablehq.com/@endpointservices/netlify' +
            '&state=' + encodeURIComponent(JSON.stringify(session));
      evt.target.href = url;
    }
    
    return html`
          <a class="button"
           href="https://app.netlify.com/authorize"
           onclick=${authorize}>authorize with Netlify</a>
    `;
  }
  // have access token
  const subdomain = location.host.split(".")[0];
  
  
  async function digestFileAndDeploySite(evt) {
    const unitsPromise = files.map(async file => {
      const unit = ({
        ...file,
        source: file.source,
        tags: file.tags || [],
        dependsOnTags: file.dependsOnTags || [],
        app_id,
        target: file.target,
        type: "file",
        safeTarget: encodeURIComponent(file.target),
      });

      const unitURI = `/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units/${unit.safeTarget}`;

      console.log("deployStaticFile: fetching previous deploy");
      const existing = (await firebase.firestore().doc(unitURI).get()).data()


      if (existing && existing.creationDate === undefined) {
        console.log("deployStaticFile: backfilling creationDate");
        await firebase.firestore()
          .doc(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units/${unit.safeTarget}`)
          .set({creationDate: firebase.firebase_.firestore.FieldValue.serverTimestamp()}, {merge: true})
      }

      console.log("deployStaticFile: syncing paramaters");
      await firebase.firestore()
        .doc(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units/${unit.safeTarget}`)
        .set({
          ...(!existing && {
            creationDate: firebase.firebase_.firestore.FieldValue.serverTimestamp()
          }),
          ...unit
        }, {merge: true})

      return unit;
    });

    var units = await promiseRecursive(unitsPromise);

    var tags = units.reduce(
      (list, unit) => list.concat(unit.tags)
      ,[]
    )


    const cache = {};
    
    message(id, "Deploying...\nQuerying dependents");
    
    // For now we do one round of dependencies
    const dependees = tags.length > 0 ? (await firebase.firestore()
                      .collection(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units`)
                      .where("type", "==", "file")
                      .where("dependsOnTags", "array-contains-any", [...new Set(tags || [])])
                      .limit(100)
                      .get()).docs.map(d => d.data())
                      : [];
    
    const updates = dependees.concat(units).map(unit => updateDigest({
      app_id, subdomain
    }, unit, cache));
    
    message(id, `${updates.length} files to update`)
    await Promise.all(updates);
    
    
    message(id, `Retreiving existing ${dependees.length} files metadata`)
    const existingFiles = (await firebase.firestore()
                      .collection(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units`)
                      .where("type", "==", "file")
                      .get()).docs.map(d => d.data());
    
    // console.log(existingFiles, cache)
    message(id, `Creating deploy with Netlify`)
    const deploy_json = await createDeploy(app_id, existingFiles);
    const requiredDigests = deploy_json.required;
    deployments[id] = deploy_json.ssl_url;
    message(id, `Syncing required files ${requiredDigests}`)
    const uploads = requiredDigests.map(digest => {
      if (!cache[digest]) {
        console.error(`Netlify has requested digest ${digest} which was not part of our sync`);
        // So lets find it
        let record;
        firebase.firestore()
          .collection(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units`)
          .where("digest", "==", digest)
          .get()
          .then(snap => {
            record = snap.docs[0].data()
            return fetch(record.source);
          }).then(response => response.text())
          .then(content => {
            return uploadContent(deploy_json.id, record.target, content);
          })
      } else {
        return uploadContent(deploy_json.id, cache[digest].target, cache[digest].content);
      }
    });
                        
    try {
      await Promise.all(uploads);
      message(id, null);
    } catch (err) {
      message(id, err.message);
    }
  }
  if (immediate && (!deployments[id])) {
    deployments[id] = 'inprogress'
    digestFileAndDeploySite()
  } else if (deployments[id] === 'inprogress') {
    return md`Deployment in progress`
  } else {
    return html`
      ${Inputs.table(files)}
    ${deployments[id] ?
      html`<p>Deployed to <a target="_blank" href=${deployments[id] + files[0].target}>${deployments[id] +  files[0].target}</a>`
      : null}
    <button class="button" onclick=${digestFileAndDeploySite}>deploy</button>
    `
  }
}
)};
const _1vl11iv = function _9(signature,queryDependants){return(
signature(queryDependants, {
  description: 'Query dependants searches for all content with specific tags, useful for content grouping, sitemaps RSS feeds etc.',
  open: true
})
)};
const _1d4hnpt = function _queryDependants(location,listen,firebase){return(
function queryDependants({
    app_id,
    dependsOnTags,
    limit = 100
  } = {}) {
  const subdomain = location.host.split(".")[0]
  return listen(firebase.firestore().collection(
    `/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units`)
        .where("type", "==", "file")
        .where("tags", "array-contains-any", [...new Set(dependsOnTags)])
        .orderBy("creationDate", "desc")
        .limit(limit)
    );  
}
)};
const _10h8sjx = async function _11(html,md,FileAttachment){return(
html`<div class=content>${
md`### Setup up your Netlify


Create a Netfliy site (without git)
![](${await FileAttachment("image.png").url()})

Drag and empty folder, this creates a new site.

![](${await FileAttachment("image@2.png").url()})

Make a note of its API ID

![](${await FileAttachment("image@3.png").url()})

`}`
)};
const _qlrxnj = function _12(html,md){return(
html`<div class="content">${
md`## Supporting state
`}`
)};
const _1t4d0ee = function _message($0){return(
function message(id, message) {
  $0.value = ({
    ...$0.value,
    id: message
  })
}
)};
const _easkp0 = function _spinners(){return(
{

}
)};
const _1xkhm8g = (M, _) => new M(_);
const _1xtfd7l = _ => _.generator;
const _1g7t0se = function _deployments(){return(
{

}
)};
const _1h53w44 = (M, _) => new M(_);
const _dlfeex = _ => _.generator;
const _1s780as = function _params(URLSearchParams,location)
{
  const params = Object.fromEntries(new URLSearchParams(location.hash.substring(1)).entries())
  params.state = params.state ? JSON.parse(decodeURIComponent(params.state)): null;
  return params;
};
const _9z484u = function _session($0,listen,firebase){return(
($0).value.uid ? listen(firebase.firestore().doc(`/services/netlify-proxy/sessions/${($0).value.uid}`), {
  defaultValue: {}
}): {}
)};
const _1mhr7aa = function _nextNonce(){return(
Math.random()
)};
const _mwwmqr = function _updateDigest(hashes,firebase){return(
async function updateDigest({
    subdomain, app_id
  } = {}, unit, cache) {
  const response = await fetch(unit.source)
  if (response.status >= 400) throw new Error(`Cannot remote resource: ${unit.source}`)
  const content = await response.text();
  const digest = await new hashes.SHA1().hex(content);
  await firebase.firestore()
    .doc(`/services/netlify-proxy/subdomains/${subdomain}/apps/${app_id}/units/${unit.safeTarget}`)
    .set({digest}, {merge:true})
  console.log(`${unit.target} has digest: ${digest}, content: ${content.substring(20)}`)
  cache[digest] = {
    content: content,
    target: unit.target,
    digest: digest,
  };
}
)};
const _1mh70ug = function _createDeploy(fetchp,session){return(
async function createDeploy(app_id, files) {

  const deploy_response = await fetchp(`https://api.netlify.com/api/v1/sites/${app_id}/deploys`, {
    method: "POST",
    body: JSON.stringify({
      "files": files.reduce(
        (acc, file) => ({ ...acc, [file.target]: file.digest }),
        {}
      )
    }),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    }
  });
  if (deploy_response.status !== 200)
    throw new Error(`${deploy_response.status}): ${deploy_response.text()}`);
  const deploy = await deploy_response.json();
  console.log(deploy)
  return deploy;
}
)};
const _1fnjgx = function _uploadContent(fetchp,session){return(
async function uploadContent(deploy_id, target, content) {
  const netlify = "https://api.netlify.com/api/v1";
  const uploadResponse = await fetchp(`${netlify}/deploys/${deploy_id}/files/${target}`, {
    method: "PUT",
    body: new TextEncoder().encode(content),
    headers: {
      "Content-Type": "application/octet-stream",
      "Authorization": `Bearer ${session.access_token}`
    }
  })
  const text = await uploadResponse.text();
  if (uploadResponse.status >= 400) throw new Error(text)
  return text;
}
)};
const _u83tsn = function _version(){return(
9
)};
const _4zdsqi = function _hashes(require){return(
require("jshashes")
)};
const _5gf2lx = function _client_id(){return(
"nR-8fzREOHe0-6B2vGY6czBXxxpurQloK0niTCRR4PM"
)};
const _14wuh4f = function _25(html){return(
html`<div class="content"><h4> Credits</h4><p>
Preview image, <span>Photo by <a href="https://unsplash.com/@andredantan19?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Andre Tan</a> on <a href="https://unsplash.com/s/photos/static?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a></span>
`
)};
const _6hi856 = function _26(html){return(
html`<div class="content"><h4> Imports`
)};
const _y2cz1o = function _34(bulma){return(
bulma
)};
const _1brlvg = function _36(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png","image@2.png","image@3.png","image@4.png","image@5.png"].map((name) => {
    const module_name = "@tomlarkworthy/netlify-deploy";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @endpointservices/login", async () => runtime.module((await import("/@endpointservices/login.js?v=4")).default));  
  main.define("module @tomlarkworthy/serverside-cells", async () => runtime.module((await import("/@tomlarkworthy/serverside-cells.js?v=4")).default));  
  main.define("module @tomlarkworthy/bulma", async () => runtime.module((await import("/@tomlarkworthy/bulma.js?v=4")).default));  
  main.define("module @tomlarkworthy/fetchp", async () => runtime.module((await import("/@tomlarkworthy/fetchp.js?v=4")).default));  
  main.define("module @mootari/signature", async () => runtime.module((await import("/@mootari/signature.js?v=4")).default));  
  main.define("module @tomlarkworthy/utils", async () => runtime.module((await import("/@tomlarkworthy/utils.js?v=4")).default));  
  main.define("module @endpointservices/footer-with-backups", async () => runtime.module((await import("/@endpointservices/footer-with-backups.js?v=4")).default));  
  $def("_1klxalg", null, ["html","md","FileAttachment"], _1klxalg);  
  $def("_1hv2jvx", null, ["html","md"], _1hv2jvx);  
  $def("_bpvxyp", "authorizer", ["viewof user","html","session","firebase","params","nextNonce","client_id"], _bpvxyp);  
  $def("_ekh6hw", null, ["html","md"], _ekh6hw);  
  $def("_191ofuz", null, ["signature","deployStaticFile"], _191ofuz);  
  $def("_oox0mu", "deployStaticFile", ["deployStaticFiles"], _oox0mu);  
  $def("_rcjscl", null, ["signature","deployStaticFiles"], _rcjscl);  
  $def("_jgi9hf", "deployStaticFiles", ["spinners","html","viewof user","session","nextNonce","firebase","client_id","location","promiseRecursive","message","updateDigest","createDeploy","deployments","uploadContent","md","Inputs"], _jgi9hf);  
  $def("_1vl11iv", null, ["signature","queryDependants"], _1vl11iv);  
  $def("_1d4hnpt", "queryDependants", ["location","listen","firebase"], _1d4hnpt);  
  $def("_10h8sjx", null, ["html","md","FileAttachment"], _10h8sjx);  
  $def("_qlrxnj", null, ["html","md"], _qlrxnj);  
  $def("_1t4d0ee", "message", ["mutable spinners"], _1t4d0ee);  
  $def("_easkp0", "initial spinners", [], _easkp0);  
  $def("_1xkhm8g", "mutable spinners", ["Mutable","initial spinners"], _1xkhm8g);  
  $def("_1xtfd7l", "spinners", ["mutable spinners"], _1xtfd7l);  
  $def("_1g7t0se", "initial deployments", [], _1g7t0se);  
  $def("_1h53w44", "mutable deployments", ["Mutable","initial deployments"], _1h53w44);  
  $def("_dlfeex", "deployments", ["mutable deployments"], _dlfeex);  
  $def("_1s780as", "params", ["URLSearchParams","location"], _1s780as);  
  $def("_9z484u", "session", ["viewof user","listen","firebase"], _9z484u);  
  $def("_1mhr7aa", "nextNonce", [], _1mhr7aa);  
  $def("_mwwmqr", "updateDigest", ["hashes","firebase"], _mwwmqr);  
  $def("_1mh70ug", "createDeploy", ["fetchp","session"], _1mh70ug);  
  $def("_1fnjgx", "uploadContent", ["fetchp","session"], _1fnjgx);  
  $def("_u83tsn", "version", [], _u83tsn);  
  $def("_4zdsqi", "hashes", ["require"], _4zdsqi);  
  $def("_5gf2lx", "client_id", [], _5gf2lx);  
  $def("_14wuh4f", null, ["html"], _14wuh4f);  
  $def("_6hi856", null, ["html"], _6hi856);  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("viewof user", ["module @endpointservices/login", "@variable"], (_, v) => v.import("viewof user", _));  
  main.define("user", ["module @endpointservices/login", "@variable"], (_, v) => v.import("user", _));  
  main.define("firebase", ["module @endpointservices/login", "@variable"], (_, v) => v.import("firebase", _));  
  main.define("listen", ["module @endpointservices/login", "@variable"], (_, v) => v.import("listen", _));  
  main.define("deploy", ["module @tomlarkworthy/serverside-cells", "@variable"], (_, v) => v.import("deploy", _));  
  main.define("bulma", ["module @tomlarkworthy/bulma", "@variable"], (_, v) => v.import("bulma", _));  
  main.define("fetchp", ["module @tomlarkworthy/fetchp", "@variable"], (_, v) => v.import("fetchp", _));  
  main.define("signature", ["module @mootari/signature", "@variable"], (_, v) => v.import("signature", _));  
  main.define("promiseRecursive", ["module @tomlarkworthy/utils", "@variable"], (_, v) => v.import("promiseRecursive", _));  
  $def("_y2cz1o", null, ["bulma"], _y2cz1o);  
  main.define("footer", ["module @endpointservices/footer-with-backups", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1brlvg", null, ["footer"], _1brlvg);
  return main;
}