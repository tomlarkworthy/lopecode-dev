const _brdn5l = async function _1(md,FileAttachment,width){return(
md`# Convert cell computation to a Promise with cell *flowQueue*


~~~js
import {flowQueue} from '@tomlarkworthy/flow-queue'
~~~

${ await FileAttachment('flowQuery@1.svg').image({ style: 'width:640px; max-width:100%' }) }

A flow queue releases values one-at-a-time onto a Dataflow graph, and collects a response before releasing the next. A *flowQueue* wraps Dataflow with a *promise*. It allows you to *unroll* a function body across dataflow cells, which is sometimes better for code layout and explanation. 

The following video demonstrates its use during development of a webhook. Note a number of cells update as data passes through the system. 

<video controls="controls" width="${ Math.min(width, 640) }" height="400" loop name="Video Name">
  <source src="https://storage.googleapis.com/publicartifacts/blogimages/notebookwebhook.mov">
</video>

In other words, __*flowQueue* provides dataflow programming with a functional interface__. Consider the following

~~~js
async doWork(arg) {
  const r1 = await step1(arg)
  const r2 = await step2(r1);
  return r2;
}
~~~

Using a *flowQueue* you can spread the asynchronous steps into different cells. To spread *doWork* across cells we first create a *flowQueue*, whose messages are *doWork*'s args.

~~~js
viewof head = flowQueue()
~~~

The refactored version of *doWork* will forward its *arg* to the *flowQueue* and returns the promise. (note: viewof)
~~~js
doWork = (arg) => viewof head.send(arg)
~~~

Now we unroll the body of *doWork* across several cells. Cell *r1* calls function *step1* and makes a dataflow dependency to *head* of the *flowQueue*. So when *head* updates, *r1* will too.
~~~js
r1 = step1(head)
~~~

The next step *r2* depends on the previous step.
~~~js
r2 = step2(r1)
~~~

To return a result, we call *resolve* to the *flowQueue*. This will resolve the *send* promise earlier, and allow the next  to run. (note: viewof)
~~~js
{
  viewof head.resolve(r2)
}
~~~

### Optimizations

The *flowQueue* will unblock immediately when *resolve* is passed a *promise*.


### Errors

Every *send* should lead to a call to *resolve*. If you call *resolve* an extra time it will throw an Error. If *resolve* is not called within *timeout_ms* (1000ms) the promise will reject.

### Deduplication

For IO-heavy flows, pass \`dedupe: true\` to coalesce queued tasks whose args deep-equal an already-queued task — all callers receive the same resolved value. Only pending tasks are merged; once a task is in-flight on the dataflow graph, subsequent *sends* always enqueue a fresh entry.

\`\`\`js
viewof head = flowQueue({ dedupe: true })
\`\`\`

`
)};
const _to45e7 = function _2(md){return(
md`## Changelog

2026-05-12 Feature: \`dedupe: true\` coalesces queued tasks with deep-equal args.
2022-05-16 API: resolve changed to *resolve*, as it ends up looking like a promise anyway
2022-04-13 Bugfix: queue was not recovering after timeout properly.`
)};
const _gvn0bc = function _flowQueue(htl,Event,_)
{
    return ({name, timeout_ms = 1000, dedupe = false} = {}) => {
        let runningResolvers = undefined;
        let runningTimer;
        const q = [];
        // entries: { task, resolvers: [{resolve, reject}, ...] }
        const ui = htl.html`<code>${ name }()</code>`;
        const run = () => {
            const entry = q.shift();
            runningResolvers = entry.resolvers;
            runningTimer = setTimeout(() => ui.reject(new Error(`Timeout (maybe increase timeout_ms?) ${ name || '' }`)), timeout_ms);
            ui.value = entry.task;
            ui.dispatchEvent(new Event('input', { bubbles: true }));
        };
        ui.send = task => new Promise((resolve, reject) => {
            const queued = dedupe && q.find(e => _.isEqual(e.task, task));
            if (queued) {
                queued.resolvers.push({
                    resolve,
                    reject
                });
                return;
            }
            q.push({
                task,
                resolvers: [{
                        resolve,
                        reject
                    }]
            });
            if (runningResolvers === undefined)
                run();
        });
        ui.reject = async err => {
            if (!runningResolvers)
                throw new Error(`No task executing! ${ name || '' }`);
            clearTimeout(runningTimer);
            const resolvers = runningResolvers;
            runningResolvers = undefined;
            if (q.length > 0)
                run();
            for (const r of resolvers)
                r.reject(err);
        };
        ui.resolve = async value => {
            if (!runningResolvers)
                throw new Error(`No task executing! ${ name || '' }`);
            clearTimeout(runningTimer);
            const resolvers = runningResolvers;
            runningResolvers = undefined;
            if (q.length > 0)
                run();
            try {
                value = await value;
                for (const r of resolvers)
                    r.resolve(value);
            } catch (err) {
                for (const r of resolvers)
                    r.reject(err);
            }
        };
        ui.respond = ui.resolve;
        // old name
        return ui;
    };
};
const _1heyr0d = function _4(md){return(
md`## Uses

- Functional adapter, for interfacing with functional interfaces.
- Testing, as you can write clear expected starting and ending criteria on a dataflow subgraph.`
)};
const _mst1it = function _sqrt(flowQueue){return(
flowQueue({ title: "sqrt" })
)};
const _1aloau2 = (G, _) => G.input(_);
const _7s1qq7 = function _6($0,sqrt){return(
$0.resolve(Math.sqrt(sqrt))
)};
const _3iwba4 = async function _testing(flowQueue) {
    flowQueue;
    const [{Runtime}, {default: define}] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js'),
        import(`https://api.observablehq.com/@tomlarkworthy/testing.js?v=3`)
    ]);
    const module = new Runtime().module(define);
    return Object.fromEntries(await Promise.all([
        'expect',
        'createSuite'
    ].map(n => module.value(n).then(v => [
        n,
        v
    ]))));
};
const _j8s3j1 = function _suite(testing){return(
testing.createSuite({ name: 'Unit Tests' })
)};
const _1heh2ju = (G, _) => G.input(_);
const _ew1d4y = function _9(suite,flowQueue,testing){return(
suite.test('resolve after send resolves', async () => {
    const q = flowQueue();
    const prom = q.send('send val');
    testing.expect(q.value).toBe('send val');
    q.resolve('resolve val');
    const response = await prom;
    testing.expect(response).toBe('resolve val');
})
)};
const _1ju8ima = function _maybeReply(flowQueue){return(
flowQueue({ timeout_ms: 100 })
)};
const _c792zo = (G, _) => G.input(_);
const _67gtdw = function _maybeReplyReplier(maybeReply,$0)
{
    if (maybeReply === 'reply')
        $0.resolve('reply');
};
const _ihy4ge = function _12(suite,$0,testing){return(
suite.test('Unreplied queues recover after timeout_ms', async done => {
    try {
        await $0.send('no reply');
    } catch (err) {
        const result = await $0.send('reply');
        testing.expect(result).toEqual('reply');
        done();
    }
})
)};
const _129nczn = function _13(suite,flowQueue,testing){return(
suite.test('resolve with promise', async () => {
    const q = flowQueue();
    const prom = q.send();
    q.resolve(new Promise(resolve => resolve('resolve val')));
    const response = await prom;
    testing.expect(response).toBe('resolve val');
})
)};
const _ywclto = function _14(suite,flowQueue,testing){return(
suite.test('resolve without send throws', async () => {
    const q = flowQueue();
    await testing.expect(q.resolve()).rejects.toEqual(Error('No task executing! '));
})
)};
const _dz53ar = function _15(suite,flowQueue,testing){return(
suite.test('missing resolve rejects with timout', async () => {
    const q = flowQueue({ timeout_ms: 1 });
    await testing.expect(q.send()).rejects.toEqual(Error('Timeout (maybe increase timeout_ms?) '));
})
)};
const _g1eo6h = function _16(suite,$0,testing)
{
    return suite.test('works in a real notebook', async () => {
        // Here we call a flowQueue that resides in the cells underneath, and collect the result.
        const result = $0.send(4);
        await testing.expect(result).resolves.toBe(2);
    });
};
const _1fs0h4q = function _17(suite,flowQueue,testing)
{
    return suite.test('dedupe coalesces queued tasks with deep-equal args', async () => {
        const q = flowQueue({ dedupe: true });
        const p1 = q.send({ url: '/a' });
        // runs immediately
        const p2 = q.send({ url: '/b' });
        // queued
        const p3 = q.send({ url: '/b' });
        // deep-equal to p2 — coalesced onto its entry
        q.resolve('A');
        // settles p1, starts {url:"/b"}
        q.resolve('B');
        // settles p2 AND p3 from the one shared entry
        testing.expect(await p1).toBe('A');
        testing.expect(await p2).toBe('B');
        testing.expect(await p3).toBe('B');
        // No more queued tasks — a third resolve must reject
        await testing.expect(q.resolve('X')).rejects.toEqual(Error('No task executing! '));
    });
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["flowQuery@1.svg"].map((name) => {
    const module_name = "@tomlarkworthy/flow-queue";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_brdn5l", null, ["md","FileAttachment","width"], _brdn5l);  
  $def("_to45e7", null, ["md"], _to45e7);  
  $def("_gvn0bc", "flowQueue", ["htl","Event","_"], _gvn0bc);  
  $def("_1heyr0d", null, ["md"], _1heyr0d);  
  $def("_mst1it", "viewof sqrt", ["flowQueue"], _mst1it);  
  $def("_1aloau2", "sqrt", ["Generators","viewof sqrt"], _1aloau2);  
  $def("_7s1qq7", null, ["viewof sqrt","sqrt"], _7s1qq7);  
  $def("_3iwba4", "testing", ["flowQueue"], _3iwba4);  
  $def("_j8s3j1", "viewof suite", ["testing"], _j8s3j1);  
  $def("_1heh2ju", "suite", ["Generators","viewof suite"], _1heh2ju);  
  $def("_ew1d4y", null, ["suite","flowQueue","testing"], _ew1d4y);  
  $def("_1ju8ima", "viewof maybeReply", ["flowQueue"], _1ju8ima);  
  $def("_c792zo", "maybeReply", ["Generators","viewof maybeReply"], _c792zo);  
  $def("_67gtdw", "maybeReplyReplier", ["maybeReply","viewof maybeReply"], _67gtdw);  
  $def("_ihy4ge", null, ["suite","viewof maybeReply","testing"], _ihy4ge);  
  $def("_129nczn", null, ["suite","flowQueue","testing"], _129nczn);  
  $def("_ywclto", null, ["suite","flowQueue","testing"], _ywclto);  
  $def("_dz53ar", null, ["suite","flowQueue","testing"], _dz53ar);  
  $def("_g1eo6h", null, ["suite","viewof sqrt","testing"], _g1eo6h);  
  $def("_1fs0h4q", null, ["suite","flowQueue","testing"], _1fs0h4q);
  return main;
}