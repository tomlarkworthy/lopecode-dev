const _1mgefud = function _1(md){return(
md`# Howto Import a React Application (Chonky Example)

I wanted to use a cool UI I saw in the React ecosystem in Observable. It was not obvious how to get it working so here are my notes. [Chonky](https://chonky.io/) does not have an ES6 module build or anything so you have to pack it from a consuming app. This is not so complicated once you know how.

An issue with the react ecosystem is dependancies (e.g. [material-ui/issue](https://github.com/mui-org/material-ui/issues/1486#issuecomment-141821034)) often use _nodejs_-isms which cannot be handled in the browser. Developers are expected to webpack as the last step to turn a fully assembled application into something that can be read by the browser. Unfortunately this means we cannot directly read various _react_ components within Observable. Here is how you perform the bundling steps locally though, which you can then import into a notebook.

#### This imports a whole application, to import just a component for assembly clientside see https://observablehq.com/@tomlarkworthy/howto-import-react-component


#### Create client react project
~~~
npx create-react-app filebrowser
~~~

#### Downgrade React in package.json

This was necessary because Chonky only worked with react 16 at the time.
~~~
    "react": "^16.13",
    "react-dom": "^16.13",
~~~

Re-init packages
~~~
    rm -fR node_modules
~~~

#### Depend on Chonky
~~~
npm install --save chonky-icon-fontawesome, chonky
~~~

#### Update App.js
~~~js
import { FullFileBrowser } from 'chonky';
function App() {
  const files = [
    { id: 'lht', name: 'Projects', isDir: true },
    {
      id: 'mcd',
      name: 'chonky-sphere-v2.png',
      thumbnailUrl: 'https://chonky.io/chonky-sphere-v2.png',
    },
  ]
  const folderChain = [{ id: 'xcv', name: 'Demo', isDir: true }]
  return (
    <div style={{ height: 300 }}>
      <FullFileBrowser files={files} folderChain={folderChain} />
    </div>
  )

}
export default App;
~~~


#### Update index.js

~~~js
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { setChonkyDefaults } from 'chonky';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import App from './App';

setChonkyDefaults({ iconComponent: ChonkyIconFA });

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
~~~

#### Test it works locally
~~~
npm run start
~~~

#### Bundle for upload to Observablehq
~~~
npm run build
~~~

This will create some interesting files:-
- build/index.html
- build/static/js/...

Note the _runtime-main_ is inlined into the index.html

If you study this we just need a 
~~~html
  <div id="root"\>
~~~

plus the js code to boot the application. So in observable create a DIV with id:-
`
)};
const _1l2kfst = function _root(html){return(
html`<div id="root"></div>`
)};
const _12n3e42 = function _3(md){return(
md`Then for loading the scripts we can inject script tags into the head. Of course we have to upload the js files into FileAttachments first`
)};
const _7gx6wy = async function _4(root,FileAttachment)
{
  root; // Ensure our DIV is materialized before loading scripts
  var loader = document.createElement("script");
  loader.src = await FileAttachment("runtime-main.b53eba1f.js").url();
  document.head.appendChild(loader);

  var chunk = document.createElement("script");
  chunk.src = await FileAttachment("2.d04965b1.chunk.js").url();
  document.head.appendChild(chunk);

  var main = document.createElement("script");
  main.src = await FileAttachment("main.cf9a6b73.chunk.js").url();
  document.head.appendChild(main);
};
const _vj66yh = function _5(md){return(
md`## Boom!

#### Next steps

We can compress the 3 scripts to one using https://www.labnol.org/code/bundle-react-app-single-file-200514 which makes it slightly easier iterating. Or even smoother map your local filesystem to a [cloud bucket](https://observablehq.com/@endpointservices/storage) for zero clicks.
`
)};
const _1eimjue = function _6(){return(
window.ReactDOM
)};
const _pvf7uj = function _8(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["runtime-main.b53eba1f.js","main.cf9a6b73.chunk.js","2.d04965b1.chunk.js"].map((name) => {
    const module_name = "@tomlarkworthy/howto-import-react-application";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1mgefud", null, ["md"], _1mgefud);  
  $def("_1l2kfst", "root", ["html"], _1l2kfst);  
  $def("_12n3e42", null, ["md"], _12n3e42);  
  $def("_7gx6wy", null, ["root","FileAttachment"], _7gx6wy);  
  $def("_vj66yh", null, ["md"], _vj66yh);  
  $def("_1eimjue", null, [], _1eimjue);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_pvf7uj", null, ["footer"], _pvf7uj);
  return main;
}