const _1a387ew = function _anonymous(md) {return (md`# p5.js Sandbox

Edit the \`sketch\` cell below — mutations to the \`state\` object persist across code edits **and** page reloads (via localStorage). Use **Reset state** to wipe.`);};
const _1q65bw4 = function _storageKey() {return ('p5-sandbox-state');};
const _unz1p = function _unzip(Response,DecompressionStream){return(async (attachment) => await new Response((await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))).blob());};
const _1blpaft = async function _p5(unzip,FileAttachment) {
    const text = await (await unzip(FileAttachment("p5.min.js.gz"))).text();
    const prevDefine = window.define;
    try {
        window.define = undefined;
        new Function(text).call(window);
    } finally {
        window.define = prevDefine;
    }
    return window.p5;
};
const _183mvqc = function _state(localStorage,storageKey) {return ((() => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw)
            return JSON.parse(raw);
    } catch (e) {
        console.warn('[p5-sandbox] restore failed:', e);
    }
    return {};
})());};
const _1fzmu1t = function* _persist(Promises,localStorage,storageKey,state) {
    while (true) {
        yield Promises.delay(500);
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (e) {
        }
    }
};
const _1kqh2y = function _resetBtn(htl,localStorage,storageKey,location) {
    const btn = htl.html`<button style="padding:6px 12px;cursor:pointer">Reset state & reload</button>`;
    btn.onclick = () => {
        try {
            localStorage.removeItem(storageKey);
        } catch {
        }
        location.reload();
    };
    btn.value = 0;
    return btn;
};
const _l4ixph = function _sketch(htl,state,p5,invalidation) {
    const container = htl.html`<div style="min-height:420px"></div>`;
    const s = state;
    if (s.trail === undefined)
        s.trail = [];
    if (s.t === undefined)
        s.t = 0;
    const inst = new p5(p => {
        p.setup = () => {
            p.createCanvas(400, 400);
        };
        p.draw = () => {
            p.background(20, 20, 30);
            s.t += 1;
            s.trail.push({
                x: 200 + Math.sin(s.t / 30) * 120,
                y: 200 + Math.cos(s.t / 47) * 120
            });
            if (s.trail.length > 200)
                s.trail.shift();
            p.noFill();
            p.stroke(180, 220, 255);
            p.beginShape();
            for (const pt of s.trail)
                p.vertex(pt.x, pt.y);
            p.endShape();
            p.fill(255, 140, 90);
            p.noStroke();
            const head = s.trail[s.trail.length - 1];
            if (head)
                p.circle(head.x, head.y, 10);
        };
    }, container);
    invalidation.then(() => inst.remove());
    return container;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["p5.min.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/p5-sandbox";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_1a387ew", null, ["md"], _1a387ew);
  $def("_1q65bw4", "storageKey", [], _1q65bw4);
  $def("_unz1p", "unzip", ["Response","DecompressionStream"], _unz1p);
  $def("_1blpaft", "p5", ["unzip","FileAttachment"], _1blpaft);
  $def("_183mvqc", "initial state", ["localStorage","storageKey"], _183mvqc);  
  main.variable(observer("mutable state")).define("mutable state", ["Mutable", "initial state"], (M, _) => new M(_));  
  main.variable(observer("state")).define("state", ["mutable state"], _ => _.generator);  
  $def("_1fzmu1t", "persist", ["Promises","localStorage","storageKey","state"], _1fzmu1t);  
  $def("_1kqh2y", "viewof resetBtn", ["htl","localStorage","storageKey","location"], _1kqh2y);  
  main.variable(observer("resetBtn")).define("resetBtn", ["Generators", "viewof resetBtn"], (G, _) => G.input(_));  
  $def("_l4ixph", "sketch", ["htl","state","p5","invalidation"], _l4ixph);
  return main;
}