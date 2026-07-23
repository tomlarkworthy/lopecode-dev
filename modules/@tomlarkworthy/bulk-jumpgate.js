const _1vjebub = function _1(md,isOnObservableCom,forkAnchor){return(
md`# Bulk Export Observable 1.0 Notebooks to Local Files

Local-firstify Observable 1.0 Notebooks in bulk using the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access).

${ isOnObservableCom() ? md`⚠️ Doesn't work on Observable.com due to sandbox, use the linked non-iframed self-${ forkAnchor({}, 'fork') } instead` : '' }`
)};
const _18c3m4y = function _directoryHandle(Inputs,filesystem,isOnObservableCom){return(
Inputs.button('target directory', {
    value: null,
    reduce: async () => {
        try {
            return await filesystem.showDirectoryPicker({
                mode: 'readwrite',
                _preferPolyfill: isOnObservableCom()
            });
        } catch (e) {
            console.error(e);
            return e;
        }
    }
})
)};
const _1c3l6x7 = (G, _) => G.input(_);
const _1bbvbgb = function _export_spec_text(Inputs,stored_spec,default_spec){return(
Inputs.textarea({
    rows: 50,
    value: JSON.stringify(stored_spec || default_spec, null, 2)
})
)};
const _1arhsa = (G, _) => G.input(_);
const _mvcled = function _4(directoryHandle,Inputs,bulk_export,export_spec){return(
!directoryHandle ? 'Select a directory first' : Inputs.button('Start export', {
    reduce: () => {
        bulk_export(directoryHandle, export_spec);
    }
})
)};
const _1u1ojs6 = function _log(Inputs){return(
new Inputs.textarea({
    label: 'log',
    disabled: true,
    rows: 20
})
)};
const _jj0zeo = (G, _) => G.input(_);
const _1of7c6e = function _6(md){return(
md`### How to get your notebooks

If you own many notebooks an efficient way is to scrape the Observable website. The notebooks page https://observablehq.com/@tomlarkworthy?tab=notebooks shows 30 per page in recently modification order.

If you open the Javascript console you can append append the current page of results with 

\`\`\`js
const notebooks = new Set(); // execute once

// Execute for each page
[...document.querySelectorAll("a[title]")].map(h => h.href).filter(url => !url.includes("&page")).forEach(url => notebooks.add(url))
\`\`\`

When you have the notebooks you need, click "Copy Object" on the notebook variable.

`
)};
const _1a9r6un = function _7(md){return(
md`### My Notebooks`
)};
const _1f023lk = function _notebooks(){return(
new Set([
    '@tomlarkworthy/1-million-row-parquet-challenge',
    '@tomlarkworthy/2d-spatial-wormhole-warp',
    '@tomlarkworthy/a',
    '@tomlarkworthy/access-aws',
    '@tomlarkworthy/access-runtime-2',
    '@tomlarkworthy/acorn-8-11-3',
    '@tomlarkworthy/adapting-dataviz',
    '@tomlarkworthy/address',
    '@tomlarkworthy/agency-wisdom-from-monty-hall',
    '@tomlarkworthy/agentic-planner',
    '@tomlarkworthy/agropatterns',
    '@tomlarkworthy/ai-hackathon-no-functions',
    '@tomlarkworthy/ai-hackathon-tar',
    '@tomlarkworthy/ai-hackathon-v1-examples',
    '@tomlarkworthy/ai-tdd-template',
    '@tomlarkworthy/animated-kirigami',
    '@tomlarkworthy/animated-sequence-diagrams',
    '@tomlarkworthy/animation',
    '@tomlarkworthy/api-hosting-with-express',
    '@tomlarkworthy/aqi_no_loop_breaking',
    '@tomlarkworthy/argon2',
    '@tomlarkworthy/async-lambda-sqs-eventbridge-benchmark',
    '@tomlarkworthy/atlas',
    '@tomlarkworthy/audio-inputs',
    '@tomlarkworthy/aws',
    '@tomlarkworthy/aws-serverless-password',
    '@tomlarkworthy/aws4fetch',
    '@tomlarkworthy/b',
    '@tomlarkworthy/bitcoin-energy',
    '@tomlarkworthy/blm-us-wealth',
    '@tomlarkworthy/blog-dont-aggregate-your-metrics',
    '@tomlarkworthy/blog-firestores-technical-advantages',
    '@tomlarkworthy/blog-first-post',
    '@tomlarkworthy/blog-how-cloud-run-changes-cloud-architecture',
    '@tomlarkworthy/blog-index-html',
    '@tomlarkworthy/blog-market-for-lemons',
    '@tomlarkworthy/blog-netlify-deployment-manager',
    '@tomlarkworthy/blog-sidebar',
    '@tomlarkworthy/blog-simple-article-template',
    '@tomlarkworthy/blog-template',
    '@tomlarkworthy/blog-theme',
    '@tomlarkworthy/blogify',
    '@tomlarkworthy/blueswireless-2022-06-14',
    '@tomlarkworthy/bluetooth',
    '@tomlarkworthy/bootloader',
    '@tomlarkworthy/browser-fs-access',
    '@tomlarkworthy/bug-unresolved-error-cells',
    '@tomlarkworthy/building-a-team-chore-app',
    '@tomlarkworthy/bulma',
    '@tomlarkworthy/catch-all',
    '@tomlarkworthy/cell-editor',
    '@tomlarkworthy/cell-map',
    '@tomlarkworthy/cells',
    '@tomlarkworthy/cells-to-clipboard',
    '@tomlarkworthy/change-history',
    '@tomlarkworthy/chat-application',
    '@tomlarkworthy/chatgpt-notebook-feedback',
    '@tomlarkworthy/chatgpt-notebook-generator-test-1',
    '@tomlarkworthy/circular-barcode-simulator',
    '@tomlarkworthy/cloudevents-explorer',
    '@tomlarkworthy/codemirror-6',
    '@tomlarkworthy/codemirror-6-22-2-view',
    '@tomlarkworthy/codemirror-6-v2',
    '@tomlarkworthy/coffeescript-demo',
    '@tomlarkworthy/colorpicker',
    '@tomlarkworthy/colossal-cave-chatgpt-challange',
    '@tomlarkworthy/community-help',
    '@tomlarkworthy/complex-software-with-chatgpt',
    '@tomlarkworthy/content-editable-text',
    '@tomlarkworthy/context-menu',
    '@tomlarkworthy/copy-code',
    '@tomlarkworthy/creating-long-lasting-content',
    '@tomlarkworthy/csv-column-chooser',
    '@tomlarkworthy/custom-bulma',
    '@tomlarkworthy/dashboards-over-whatsapp',
    '@tomlarkworthy/dataeditor',
    '@tomlarkworthy/dataflow',
    '@tomlarkworthy/dataflow-template',
    '@tomlarkworthy/dataflow-templating',
    '@tomlarkworthy/debugger',
    '@tomlarkworthy/dependancy',
    '@tomlarkworthy/dijkstra',
    '@tomlarkworthy/distiller',
    '@tomlarkworthy/dom-view',
    '@tomlarkworthy/duckdb-1-27-0',
    '@tomlarkworthy/duckdb-scratch',
    '@tomlarkworthy/dynamic-controls-example',
    '@tomlarkworthy/e1',
    '@tomlarkworthy/echo-server',
    '@tomlarkworthy/echo-server-fast',
    '@tomlarkworthy/editable-exports',
    '@tomlarkworthy/editable-md',
    '@tomlarkworthy/editor',
    '@tomlarkworthy/editor-2',
    '@tomlarkworthy/editor-3',
    '@tomlarkworthy/editor-4',
    '@tomlarkworthy/editor-5',
    '@tomlarkworthy/ego-graph',
    '@tomlarkworthy/es-module-shims',
    '@tomlarkworthy/escodegen',
    '@tomlarkworthy/export-to-html-example',
    '@tomlarkworthy/exporter',
    '@tomlarkworthy/exporter-3',
    '@tomlarkworthy/expression-fuzzer',
    '@tomlarkworthy/fairy-dog-calendar',
    '@tomlarkworthy/fast-1d-circular-barcode-matching',
    '@tomlarkworthy/fast-barcode-scanner',
    '@tomlarkworthy/fetchp',
    '@tomlarkworthy/fetchp-tests',
    '@tomlarkworthy/file-system-api',
    '@tomlarkworthy/fileattachments',
    '@tomlarkworthy/fileinput',
    '@tomlarkworthy/firebase',
    '@tomlarkworthy/firebase-admin',
    '@tomlarkworthy/firebase-analytics',
    '@tomlarkworthy/firebase-app',
    '@tomlarkworthy/firebase-app-check',
    '@tomlarkworthy/firebase-auth',
    '@tomlarkworthy/firebase-database',
    '@tomlarkworthy/firebase-firestore',
    '@tomlarkworthy/firebase-firestore-lite',
    '@tomlarkworthy/firebase-functions',
    '@tomlarkworthy/firebase-modular-sdk',
    '@tomlarkworthy/firebase-performance',
    '@tomlarkworthy/firebase-remote-config',
    '@tomlarkworthy/firebase-server-prototype-1',
    '@tomlarkworthy/firebase-server-prototype-2',
    '@tomlarkworthy/firebase-server-test-clients',
    '@tomlarkworthy/firebase-storage',
    '@tomlarkworthy/firebase-to-duckdb',
    '@tomlarkworthy/firestore-messaging',
    '@tomlarkworthy/flow-queue',
    '@tomlarkworthy/footer',
    '@tomlarkworthy/forking-agent',
    '@tomlarkworthy/fsm',
    '@tomlarkworthy/gapi',
    '@tomlarkworthy/generator-bug',
    '@tomlarkworthy/gepa',
    '@tomlarkworthy/github-backups',
    '@tomlarkworthy/glpk-canonicalization',
    '@tomlarkworthy/golden-layout-2-6-0',
    '@tomlarkworthy/google-trends',
    '@tomlarkworthy/google-vs-trick',
    '@tomlarkworthy/grid',
    '@tomlarkworthy/hackable-firebase-realtime-database-server-prototype-2-backup',
    '@tomlarkworthy/hackable-realtime-database-title-graphic',
    '@tomlarkworthy/hacker-favourites-analysis',
    '@tomlarkworthy/highlight',
    '@tomlarkworthy/howto-import-react-application',
    '@tomlarkworthy/howto-import-react-component',
    '@tomlarkworthy/howto-monitoring',
    '@tomlarkworthy/ilda-laser-show-player',
    '@tomlarkworthy/ilda-virtual-laser-test-pattern',
    '@tomlarkworthy/imgchooser',
    '@tomlarkworthy/import-notebook',
    '@tomlarkworthy/infinite-kirigami-the-endless-wall',
    '@tomlarkworthy/ink',
    '@tomlarkworthy/inspector',
    '@tomlarkworthy/isomorphic-git-1-30-1',
    '@tomlarkworthy/jamstack',
    '@tomlarkworthy/jest-expect-standalone',
    '@tomlarkworthy/joyfull-trash',
    '@tomlarkworthy/json-merge-patch',
    '@tomlarkworthy/jsqrcode',
    '@tomlarkworthy/jszip-3-10-1',
    '@tomlarkworthy/juice',
    '@tomlarkworthy/juice-and-charts',
    '@tomlarkworthy/jumpgate',
    '@tomlarkworthy/kirigami-turret',
    '@tomlarkworthy/lambda-architecture',
    '@tomlarkworthy/lazer-cut-plant-pot',
    '@tomlarkworthy/lazer-cut-shell-joints',
    '@tomlarkworthy/lazer-cutting-notebook',
    '@tomlarkworthy/lazer-light',
    '@tomlarkworthy/lazer-simulator',
    '@tomlarkworthy/leakybucket',
    '@tomlarkworthy/lightning-fs-4-6-0',
    '@tomlarkworthy/linear-app-technical-deep-dive',
    '@tomlarkworthy/linkpreview',
    '@tomlarkworthy/liquid',
    '@tomlarkworthy/lite-youtube-embed',
    '@tomlarkworthy/literateobject',
    '@tomlarkworthy/livecoding-2022-06-07',
    '@tomlarkworthy/local-llm-with-llamafile',
    '@tomlarkworthy/local-state',
    '@tomlarkworthy/local-storage-view',
    '@tomlarkworthy/logo',
    '@tomlarkworthy/lopecode-substrate-2026',
    '@tomlarkworthy/lopecode-tour',
    '@tomlarkworthy/lopecode-vision',
    '@tomlarkworthy/lopecode-webpage-template',
    '@tomlarkworthy/lopepage',
    '@tomlarkworthy/lopepage-urls',
    '@tomlarkworthy/loremipsum',
    '@tomlarkworthy/make-a-game-part-viib-filter-sidequest',
    '@tomlarkworthy/manager-app',
    '@tomlarkworthy/manipulate',
    '@tomlarkworthy/manual-backup-all',
    '@tomlarkworthy/markdowninput',
    '@tomlarkworthy/matrix-background',
    '@tomlarkworthy/memo',
    '@tomlarkworthy/merge-dataflow',
    '@tomlarkworthy/metaprogramming',
    '@tomlarkworthy/micro-kernel-design',
    '@tomlarkworthy/minecraft-servers',
    '@tomlarkworthy/minecraft-servers-be',
    '@tomlarkworthy/minicell',
    '@tomlarkworthy/mip',
    '@tomlarkworthy/modern-screenshot',
    '@tomlarkworthy/module-map',
    '@tomlarkworthy/module-selection',
    '@tomlarkworthy/moldable-index',
    '@tomlarkworthy/moldable-webpage',
    '@tomlarkworthy/moltbook',
    '@tomlarkworthy/most-favorited-hacker-news-youtube-videos',
    '@tomlarkworthy/mps3-vendor-examples',
    '@tomlarkworthy/multi-tenancy-puppeteer',
    '@tomlarkworthy/multiplayer-cursors',
    '@tomlarkworthy/mutable-form-input',
    '@tomlarkworthy/my-lopebooks',
    '@tomlarkworthy/n-door-monty-hall',
    '@tomlarkworthy/native-file-system-adapter',
    '@tomlarkworthy/native-inputs',
    '@tomlarkworthy/ndd',
    '@tomlarkworthy/neato',
    '@tomlarkworthy/notebook-backups',
    '@tomlarkworthy/notebook-deploy-to-s3',
    '@tomlarkworthy/notebook-kit',
    '@tomlarkworthy/notebook-kit-examples',
    '@tomlarkworthy/notebook-rag',
    '@tomlarkworthy/notebook-semantics',
    '@tomlarkworthy/notebook-snapshot',
    '@tomlarkworthy/notebook-to-netlify',
    '@tomlarkworthy/notebook-visualizer',
    '@tomlarkworthy/notebooks-2022-01',
    '@tomlarkworthy/notebooks-2022-02',
    '@tomlarkworthy/notebooks-2022-03',
    '@tomlarkworthy/notebooks-2022-04',
    '@tomlarkworthy/notebooks-2022-05',
    '@tomlarkworthy/notebooks2021',
    '@tomlarkworthy/notes',
    '@tomlarkworthy/nunjucks',
    '@tomlarkworthy/oauth',
    '@tomlarkworthy/oauth-examples',
    '@tomlarkworthy/oauth-xero',
    '@tomlarkworthy/observable-notes',
    '@tomlarkworthy/observable-runtime',
    '@tomlarkworthy/observable-runtime-v6',
    '@tomlarkworthy/observable-tour',
    '@tomlarkworthy/observablejs-toolchain',
    '@tomlarkworthy/observables-now-temporal-spacing-is-60-frames-per-second',
    '@tomlarkworthy/offline',
    '@tomlarkworthy/open-ai-embeddings',
    '@tomlarkworthy/openai-realtime-api',
    '@tomlarkworthy/openai-responses-api',
    '@tomlarkworthy/parametric-kirigami-the-castle-wall',
    '@tomlarkworthy/paste-codegen',
    '@tomlarkworthy/pause-and-play-book',
    '@tomlarkworthy/pause-and-play-shop',
    '@tomlarkworthy/performance-investigation',
    '@tomlarkworthy/perspective-transform',
    '@tomlarkworthy/phiresky-sqlite-query',
    '@tomlarkworthy/playing-with-redis',
    '@tomlarkworthy/productionization',
    '@tomlarkworthy/prosemirror',
    '@tomlarkworthy/radial-explosion',
    '@tomlarkworthy/rag-extension',
    '@tomlarkworthy/random-place-on-youtube',
    '@tomlarkworthy/randomid',
    '@tomlarkworthy/rate-estimation',
    '@tomlarkworthy/rate-estimation-min',
    '@tomlarkworthy/reactive-reflective-testing',
    '@tomlarkworthy/reconcile',
    '@tomlarkworthy/reconcile-nanomorph',
    '@tomlarkworthy/reddit-research-assistant',
    '@tomlarkworthy/redirect-debugging',
    '@tomlarkworthy/redis',
    '@tomlarkworthy/redis-backend-1',
    '@tomlarkworthy/remote-cell-value',
    '@tomlarkworthy/repo1',
    '@tomlarkworthy/repository-dispatch',
    '@tomlarkworthy/repository-dispatch-min',
    '@tomlarkworthy/retro-title-graphic',
    '@tomlarkworthy/reversible-attachment',
    '@tomlarkworthy/robocoop',
    '@tomlarkworthy/robocoop-2',
    '@tomlarkworthy/robocoop-2-example',
    '@tomlarkworthy/robocoop-2024-10-17',
    '@tomlarkworthy/robocoop-3',
    '@tomlarkworthy/robocoop-blank-slate',
    '@tomlarkworthy/robocoop-eval',
    '@tomlarkworthy/robocoop-gallery',
    '@tomlarkworthy/robocoop-skills',
    '@tomlarkworthy/robocoop-tdd',
    '@tomlarkworthy/rss-atom-feed',
    '@tomlarkworthy/rss-feed',
    '@tomlarkworthy/rtdb-protocol',
    '@tomlarkworthy/runtime-decompiler',
    '@tomlarkworthy/runtime-sdk',
    '@tomlarkworthy/runtime-variable-editor',
    '@tomlarkworthy/saas-tutorial',
    '@tomlarkworthy/scrape-notebook-history',
    '@tomlarkworthy/sequencer',
    '@tomlarkworthy/serialize-javascript-7-0-2',
    '@tomlarkworthy/serverless-cell-latency-monitor',
    '@tomlarkworthy/shareview',
    '@tomlarkworthy/sign-a-pdf',
    '@tomlarkworthy/simple-prompt',
    '@tomlarkworthy/simplest-cms',
    '@tomlarkworthy/single-stroke-font',
    '@tomlarkworthy/sound-cloud-reactive-audio-visualizer',
    '@tomlarkworthy/spectral-layout',
    '@tomlarkworthy/sql-enhanced-youtube',
    '@tomlarkworthy/sql-enhanced-youtube-backend',
    '@tomlarkworthy/status-code-tests',
    '@tomlarkworthy/sticky-footer-in-list',
    '@tomlarkworthy/sticky-view',
    '@tomlarkworthy/stockage-cdn-proxy-du-fichier-de-reference-insee-bdm-idbank',
    '@tomlarkworthy/story-tube-help-the-sad-king',
    '@tomlarkworthy/stream-operators',
    '@tomlarkworthy/stripe',
    '@tomlarkworthy/subdomain-certification',
    '@tomlarkworthy/substack-signup-form',
    '@tomlarkworthy/summarizejs',
    '@tomlarkworthy/suncalc-server',
    '@tomlarkworthy/supabase',
    '@tomlarkworthy/supabase-reliability',
    '@tomlarkworthy/svg-boinger',
    '@tomlarkworthy/svg-to-gif',
    '@tomlarkworthy/svg-twist',
    '@tomlarkworthy/switch-dataflow',
    '@tomlarkworthy/synchronizing-external-state-into-bigquery-efficiently',
    '@tomlarkworthy/syncingcontrols',
    '@tomlarkworthy/tabbed-pane-view',
    '@tomlarkworthy/tarot',
    '@tomlarkworthy/tarot-backend',
    '@tomlarkworthy/testblog',
    '@tomlarkworthy/tester',
    '@tomlarkworthy/testing',
    '@tomlarkworthy/testing-example',
    '@tomlarkworthy/the-lopecode-tour-1',
    '@tomlarkworthy/tiktok',
    '@tomlarkworthy/tiny-notebook',
    '@tomlarkworthy/tldraw-example',
    '@tomlarkworthy/tom-larkworthy',
    '@tomlarkworthy/tweetstorm',
    '@tomlarkworthy/twitch-webhook',
    '@tomlarkworthy/twitter-trending-notebook-bot-dataset-2022',
    '@tomlarkworthy/ui-development',
    '@tomlarkworthy/ui-guidelines',
    '@tomlarkworthy/unaggregating-cloudwatch-metrics',
    '@tomlarkworthy/unrolling-a-deploy-command',
    '@tomlarkworthy/url-query-field-view',
    '@tomlarkworthy/userspace-editor',
    '@tomlarkworthy/utils',
    '@tomlarkworthy/vertical-sliders',
    '@tomlarkworthy/view',
    '@tomlarkworthy/view-examples',
    '@tomlarkworthy/viewroutine',
    '@tomlarkworthy/visualizer',
    '@tomlarkworthy/vr-hackerspace',
    '@tomlarkworthy/wasi-shim-experiments',
    '@tomlarkworthy/wave-function-collapse',
    '@tomlarkworthy/wax-bead-crafts',
    '@tomlarkworthy/webcode-livecoding-reactivity-demo',
    '@tomlarkworthy/webdesign',
    '@tomlarkworthy/webxr-dom-overlay',
    '@tomlarkworthy/whisper-input',
    '@tomlarkworthy/wiki',
    '@tomlarkworthy/wms-leaflet-gca-dev',
    '@tomlarkworthy/womens-suffrage',
    '@tomlarkworthy/wonder',
    '@tomlarkworthy/wormhole',
    '@tomlarkworthy/wormhole2',
    '@tomlarkworthy/x-ray-slurper',
    '@tomlarkworthy/xstate',
    '@tomlarkworthy/xstate-examples',
    '@tomlarkworthy/youtube-upload',
    '@tomlarkworthy?tab=notebooks',
    '@tomlarkworthy?tab=recents',
    'd/0147e2f83cad9f4f',
    'd/01b5ca48feb1db82',
    'd/01cbd47e2031b06d',
    'd/025ff03d865684e9',
    'd/03d1bf2e19c985bc',
    'd/04dad9fef4bdbf78',
    'd/068d5883e3b95625',
    'd/07984c151a15305c',
    'd/0a03f7035073f8a3',
    'd/0bd3e9d02bf32698',
    'd/0cfc303bee434d0a',
    'd/0d712d32819eee4c',
    'd/0fe2010ae356e6a0',
    'd/126c7605e0e65eb0',
    'd/137396387698fab9',
    'd/152aa2a44fd7f9cb',
    'd/1576b93c61531a19',
    'd/16187f66cc8bd5a5',
    'd/16261f0485b10b07',
    'd/171e83999c03ffae',
    'd/17918aff9d7a55ac',
    'd/1b6492e3d56db2e6',
    'd/1c1ae65128238bc5',
    'd/1dc97de1c43bc493',
    'd/1ec7e3f612d70414',
    'd/1f3329951555c7f1',
    'd/2320fab09283ad21',
    'd/252197f9d8bb2d7f',
    'd/2690a7e4ca9c878d',
    'd/26e21ba328992aae',
    'd/2873571b15b84b2c',
    'd/2c4b1ae7e1ffbd94',
    'd/2de6eaad22f8fdf9',
    'd/2df49729bb26e18d',
    'd/2f024c470fcde7b5',
    'd/310285cb7e84e21f',
    'd/32a38ebbb21ec073',
    'd/32e023b22aa9ff8d',
    'd/32e33923db857a45',
    'd/33f56ff7fc426da0',
    'd/35261d31eb7148b4',
    'd/378a340f19507683',
    'd/390b21f34f0c2882',
    'd/397ad7c5e572c9d1',
    'd/3a51f9bfe59fc076',
    'd/3b1dc53e56873be8',
    'd/3c9c1a12c5442093',
    'd/3ea0eb95a792444a',
    'd/3ec13d6fd7e5d082',
    'd/3ee3e38985429ad6',
    'd/3f62e88eeeac7418',
    'd/3ffe2033b861c06d',
    'd/402b20f986c44cf0',
    'd/433338dff632f5a9',
    'd/45b42c96aa9d7a05',
    'd/4771cda6e0c1faca',
    'd/49543d46cbb3c428',
    'd/49720f5bbf24da3a',
    'd/49b1dd226a242821',
    'd/4d2454dc8f0f442d',
    'd/4dd450d8a6e9c490',
    'd/4e60af4b55b620f1',
    'd/4f9c918925e44685',
    'd/4fe1d59fbc5644b8',
    'd/50857b98f55745c3',
    'd/514ae110f9c800aa',
    'd/51b11c4ffde4abaa',
    'd/546c36e727089329',
    'd/5479500f47317e52',
    'd/5608488fc3f8a7cf',
    'd/56315133960a2175',
    'd/5692a473974ec02e',
    'd/56d971a3dc0b42c4',
    'd/5708a390bbc55a9b',
    'd/571bf7ae1262750e',
    'd/573498e681a6c3ec',
    'd/59fad01c55cb58a0',
    'd/5c545f9bb22a85ac',
    'd/5c9a6c2c6e7ae936',
    'd/5cc90faa3b651500',
    'd/61e757c787b19ba5',
    'd/6224acd7ddce07b1',
    'd/62ecbc80ae1a4825',
    'd/635db53a8cf8bbdb',
    'd/65a6a49592c1e92e',
    'd/67faf3745ced6a6c',
    'd/6a9cafad13816f19',
    'd/6db728d43d53a89f',
    'd/6f1bffd7be0752e5',
    'd/6fa113121904872d',
    'd/6ff8cd8fdf01d8eb',
    'd/728ea253b00abcda',
    'd/7731a62983a5de20',
    'd/7748588c3be19bbb',
    'd/7a05fad9bb8b6efd',
    'd/7ae3bf57bacfde91',
    'd/7b9b1e7e237b19d1',
    'd/7ed3789c792da954',
    'd/7f57acf1d6b5ab56',
    'd/811e0a13ef36e6ce',
    'd/8571aa583512f2a4',
    'd/85abb51748e1d1cb',
    'd/85dbe3fb251135a3',
    'd/86aa5f9cb1e3ef31',
    'd/88337fee594fe0b6',
    'd/889bfbe3fdab9dec',
    'd/8a1ca79e6b18857c',
    'd/8a9363381a7a5265',
    'd/8b20c47ffa3e3122',
    'd/8b2c75e8a466d1a2',
    'd/8ba1ce5daa61cc5b',
    'd/90154ec319fd9cdd',
    'd/912f5152f26b9088',
    'd/925962b80fd0ee3e',
    'd/94342383e5349374',
    'd/94e870f8044ad01a',
    'd/9568798fb0fbd44c',
    'd/968dba38c371b88d',
    'd/96b6dfdcea93701e',
    'd/99142b2e889059ae',
    'd/9a5d3e1fbcf9a987',
    'd/9b1d8b930dd8dec5',
    'd/9c19e3f070767898',
    'd/9c57a944d864b69f',
    'd/9f9391544e84839e',
    'd/a0aab298f7605de5',
    'd/a0d5dac39ca73e2e',
    'd/a0ddcdd6f117c381',
    'd/a24ab794bf7c6668',
    'd/a331aaaba2ed2ede',
    'd/a95022c51b8e85d9',
    'd/a9efd6519d13098e',
    'd/aab2684a3fca560c',
    'd/ac21b35bbfc6f70c',
    'd/ae9a1ab60441b8ab',
    'd/b3675601fb3d10df',
    'd/b497b79c94d3fbd1',
    'd/b56836af972c2269',
    'd/b5f36c7f116fd782',
    'd/b7fec71640a6497d',
    'd/b9264ab851af4f14',
    'd/bae10d75e77246c5',
    'd/baf4ed83a6eb8c26',
    'd/bb403da7a50f75fa',
    'd/bc2455e46c3adaba',
    'd/bdff5071d36da1c9',
    'd/be9bb4e5730903ef',
    'd/beb0c4b8fb70adc8',
    'd/c0a7f2510dfb76fe',
    'd/c4c916e2ef396483',
    'd/c5e2bf64adecdf46',
    'd/c61faea06f2e00c0',
    'd/c90802097aa9842b',
    'd/cef0a81af7d7549d',
    'd/d0458bce28f88624',
    'd/d472ec3b674d028b',
    'd/d47f26bdf0bc33c0',
    'd/d53e8625c4ca7c0a',
    'd/d5572dd42b477cd9',
    'd/d6818c2c7f169187',
    'd/d93957fcf7d6025a',
    'd/dad0770443998e3b',
    'd/dca56d65b53309ff',
    'd/de70dc2d050f5418',
    'd/df82a934d9f2a59f',
    'd/e02d090ea2a71fda',
    'd/e03434f9859d5216',
    'd/e05c47a5095a85b2',
    'd/e2a1c3587fee7aa9',
    'd/e627aaaaa9857257',
    'd/e6ffeabfd47a55f6',
    'd/e8237b40dca127a5',
    'd/e96a0cad38555f43',
    'd/eae9fb5d8998e426',
    'd/ebec922a70b5cae1',
    'd/ecf787b2cbb134a4',
    'd/ed0f1dcee5434a99',
    'd/ed185511f355bbd7',
    'd/ef7ccf2e0ed653d1',
    'd/f0d2912039f81d62',
    'd/f1a258c298e54e4d',
    'd/f409f681d87aef40',
    'd/f41b469f08f72eec',
    'd/f4a50786b4c2c24b',
    'd/f5a8c6ba0ea0fa69',
    'd/f689961a22c14ea2',
    'd/fbab829d5bcdd7e2',
    'd/fc269352ce678fc9',
    'd/fc62748ad3c632e6',
    'd/fcf22f590074cc03',
    'd/fe68a3e8b6227da9'
])
)};
const _vbe94u = function _notebooks_array(notebooks){return(
JSON.stringify([...notebooks].map(n => n.replaceAll('https://observablehq.com/', '')).sort())
)};
const _12szrre = function _candidate_spec(Inputs,notebooks){return(
Inputs.textarea({
    label: 'Candidate spec',
    value: JSON.stringify({
        additionalMains: ['@tomlarkworthy/lopepage'],
        notebooks: [...notebooks].map(n => ({ name: n }))
    }, null, 2),
    rows: 20,
    disabled: true
})
)};
const _1auavgr = function _11(md){return(
md`## Bulk Export`
)};
const _saem5z = async function _stored_spec(directoryHandle)
{
    try {
        const fileHandle = await directoryHandle.getFileHandle('export_spec.json');
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (e) {
        if (e.name === 'NotFoundError')
            return undefined;
        else
            throw e;
    }
};
const _v4dbdv = function _default_spec(){return(
{
    additionalMains: ['@tomlarkworthy/lopepage'],
    notebooks: [
        { name: '@tomlarkworthy/lopecode-tour' },
        { name: '@tomlarkworthy/lopepage' },
        { name: '@tomlarkworthy/exporter' }
    ]
}
)};
const _df2912 = function _export_spec(export_spec_text){return(
JSON.parse(export_spec_text)
)};
const _ksbiyl = function _save_file(){return(
async (directoryHandle, filename, content) => {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}
)};
const _11i30v4 = function _logLine($0){return(
string => $0.value = $0.value + string + '\n'
)};
const _19hi77t = function _bulk_export($0,logLine,save_file,$1){return(
async (directoryHandle, export_spec) => {
    $0.value = '';
    logLine('Saving export_spec.json\n');
    await save_file(directoryHandle, 'export_spec.json', JSON.stringify(export_spec));
    for (const entry of export_spec.notebooks) {
        const sources = Array.isArray(entry.sources) && entry.sources.length > 0 ? entry.sources : [entry.name];
        const filename = entry.filename || sources[0].replaceAll('/', '_') + '.html';
        logLine('Exporting ' + filename);
        try {
            const result = await $1.send({
                sources,
                filename
            });
            await save_file(directoryHandle, filename, result.source);
        } catch (e) {
            console.error(e);
            logLine('Error exporting ' + filename);
        }
    }
    logLine('Export complete.');
}
)};
const _4i01c0 = function _main_defines(export_spec) {
    return Promise.all(export_spec.additionalMains.map(async main => {
        main = main.trim().replace('https://observablehq.com/', '');
        return [
            main,
            (await import(`https://api.observablehq.com/${ main }.js?v=4&resolutions=0000000000000000`)).default
        ];
    }));
};
const _1nal4ub = function _19(md){return(
md`## Single Export task

Exports a single notebook. Creates a runtime, `
)};
const _7qas3k = function _exportTask(flowQueue){return(
flowQueue({
    name: 'exportTask',
    timeout_ms: 120000
})
)};
const _1l7yayf = (G, _) => G.input(_);
const _vif85g = function _21(exportTask){return(
exportTask
)};
const _1s847dr = async function _source_define(exportTask, $0) {
    exportTask;
    try {
        return await Promise.all(exportTask.sources.map(async name => [
            name,
            (await import(`https://api.observablehq.com/${ name }.js?v=4&resolutions=0000000000000000`)).default
        ]));
    } catch (e) {
        $0.reject(e);
        throw e;
    }
};
const _5jffio = function _embedded_runtime(exportTask,Library,Runtime,invalidation)
{
    exportTask;
    // Fresh runtime every time
    const library = new Library();
    const runtime = new Runtime(library);
    invalidation.then(() => runtime.dispose());
    return runtime;
};
const _fkqljs = function _source_module(source_define,embedded_runtime){return(
source_define.map(([name, define]) => [
    name,
    embedded_runtime.module(define)
])
)};
const _z83z54 = function _additional_mains(main_defines,embedded_runtime){return(
main_defines.map(([name, define]) => [
    name,
    embedded_runtime.module(define)
])
)};
const _1j2bxxb = function _export_state(exportTask){return(
{
    title: exportTask.sources[0],
    hash: `#view=S100(${ exportTask.sources[0] },@tomlarkworthy/module-selection)`,
    theme: 'parchment',
    prerender: true
}
)};
const _1quwq5k = function _export_out(exportToHTML,embedded_runtime,additional_mains,source_module,export_state,$0){return(
exportToHTML({
    runtime: embedded_runtime,
    mains: new Map([
        ...additional_mains,
        ...source_module
    ]),
    options: {
        ...export_state,
        debug: true,
        headless: true,
        output: out => $0.value = out
    }
})
)};
const _1uq2lig = function _output(){return(
[]
)};
const _1bm14tj = (M, _) => new M(_);
const _1xnufay = _ => _.generator;
const _8kail2 = function _29(Inputs,export_out){return(
Inputs.table(export_out.report, {
    sort: 'size',
    reverse: true
})
)};
const _1vixea8 = function _resolve($0,exportTask,export_out)
{
    $0.resolve({
        sources: exportTask.sources,
        filename: exportTask.filename,
        ...export_out
    });
    return export_out;
};
const _q8prh9 = function _31(md){return(
md`## Imports`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/flow-queue", async () => runtime.module((await import("/@tomlarkworthy/flow-queue.js?v=4")).default));  
  main.define("module @tomlarkworthy/native-file-system-adapter", async () => runtime.module((await import("/@tomlarkworthy/native-file-system-adapter.js?v=4")).default));  
  main.define("module @tomlarkworthy/observable-runtime", async () => runtime.module((await import("/@tomlarkworthy/observable-runtime.js?v=4")).default));  
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  $def("_1vjebub", null, ["md","isOnObservableCom","forkAnchor"], _1vjebub);  
  $def("_18c3m4y", "viewof directoryHandle", ["Inputs","filesystem","isOnObservableCom"], _18c3m4y);  
  $def("_1c3l6x7", "directoryHandle", ["Generators","viewof directoryHandle"], _1c3l6x7);  
  $def("_1bbvbgb", "viewof export_spec_text", ["Inputs","stored_spec","default_spec"], _1bbvbgb);  
  $def("_1arhsa", "export_spec_text", ["Generators","viewof export_spec_text"], _1arhsa);  
  $def("_mvcled", null, ["directoryHandle","Inputs","bulk_export","export_spec"], _mvcled);  
  $def("_1u1ojs6", "viewof log", ["Inputs"], _1u1ojs6);  
  $def("_jj0zeo", "log", ["Generators","viewof log"], _jj0zeo);  
  $def("_1of7c6e", null, ["md"], _1of7c6e);  
  $def("_1a9r6un", null, ["md"], _1a9r6un);  
  $def("_1f023lk", "notebooks", [], _1f023lk);  
  $def("_vbe94u", "notebooks_array", ["notebooks"], _vbe94u);  
  $def("_12szrre", "candidate_spec", ["Inputs","notebooks"], _12szrre);  
  $def("_1auavgr", null, ["md"], _1auavgr);  
  $def("_saem5z", "stored_spec", ["directoryHandle"], _saem5z);  
  $def("_v4dbdv", "default_spec", [], _v4dbdv);  
  $def("_df2912", "export_spec", ["export_spec_text"], _df2912);  
  $def("_ksbiyl", "save_file", [], _ksbiyl);  
  $def("_11i30v4", "logLine", ["viewof log"], _11i30v4);  
  $def("_19hi77t", "bulk_export", ["viewof log","logLine","save_file","viewof exportTask"], _19hi77t);  
  $def("_4i01c0", "main_defines", ["export_spec"], _4i01c0);  
  $def("_1nal4ub", null, ["md"], _1nal4ub);  
  $def("_7qas3k", "viewof exportTask", ["flowQueue"], _7qas3k);  
  $def("_1l7yayf", "exportTask", ["Generators","viewof exportTask"], _1l7yayf);  
  $def("_vif85g", null, ["exportTask"], _vif85g);  
  $def("_1s847dr", "source_define", ["exportTask","viewof exportTask"], _1s847dr);  
  $def("_5jffio", "embedded_runtime", ["exportTask","Library","Runtime","invalidation"], _5jffio);  
  $def("_fkqljs", "source_module", ["source_define","embedded_runtime"], _fkqljs);  
  $def("_z83z54", "additional_mains", ["main_defines","embedded_runtime"], _z83z54);  
  $def("_1j2bxxb", "export_state", ["exportTask"], _1j2bxxb);  
  $def("_1quwq5k", "export_out", ["exportToHTML","embedded_runtime","additional_mains","source_module","export_state","mutable output"], _1quwq5k);  
  $def("_1uq2lig", "initial output", [], _1uq2lig);  
  $def("_1bm14tj", "mutable output", ["Mutable","initial output"], _1bm14tj);  
  $def("_1xnufay", "output", ["mutable output"], _1xnufay);  
  $def("_8kail2", null, ["Inputs","export_out"], _8kail2);  
  $def("_1vixea8", "resolve", ["viewof exportTask","exportTask","export_out"], _1vixea8);  
  $def("_q8prh9", null, ["md"], _q8prh9);  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("flowQueue", ["module @tomlarkworthy/flow-queue", "@variable"], (_, v) => v.import("flowQueue", _));  
  main.define("filesystem", ["module @tomlarkworthy/native-file-system-adapter", "@variable"], (_, v) => v.import("filesystem", _));  
  main.define("Runtime", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Runtime", _));  
  main.define("Inspector", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("Library", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("Library", _));  
  main.define("RuntimeError", ["module @tomlarkworthy/observable-runtime", "@variable"], (_, v) => v.import("RuntimeError", _));  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportToHTML", _));  
  main.define("exporter", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exporter", _));  
  main.define("forkAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("forkAnchor", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));
  return main;
}