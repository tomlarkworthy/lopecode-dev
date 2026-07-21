const _16r1e17 = function _1(md){return(
md`# \`trackParent\` and \`preserveFocus\`

Reverse lost focus when DOM nodes are switched around.

\`\`\`js
import {trackParent, preserveFocus} from '@tomlarkworthy/track-parent'
\`\`\``
)};
const _1opxkkq = function _2(md){return(
md`## \`trackParent(node, callback)\`

Watch a node for DOM parent changes`
)};
const _d8xfk7 = function _trackParent(MutationObserver){return(
function trackParent(node, callback) {
  let docObserver, parentObserver;

  function observeParent(parent) {
    // Notify with the current parent
    callback(parent);
    console.log("current parent", node);

    // Watch if the node is removed from this parent
    parentObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const removed of m.removedNodes) {
          if (removed === node) {
            console.log("no parent", node);
            callback(undefined); // Notify that there's no parent now
            parentObserver.disconnect();
            watchDocumentUntilAttached();
            return;
          }
        }
      }
    });

    parentObserver.observe(parent, { childList: true });
  }

  function watchDocumentUntilAttached() {
    docObserver = new MutationObserver(() => {
      if (node.parentNode) {
        docObserver.disconnect();
        observeParent(node.parentNode);
      }
    });
    docObserver.observe(document, { childList: true, subtree: true });
  }

  if (node.parentNode) {
    observeParent(node.parentNode);
  } else {
    watchDocumentUntilAttached();
  }

  // Return a disposer
  return () => {
    if (parentObserver) parentObserver.disconnect();
    if (docObserver) docObserver.disconnect();
  };
}
)};
const _q8d10q = function _4(md){return(
md`## \`trackParentChain(node, onAttach, onDetach)\``
)};
const _jtrbcs = function _trackParentChain(MutationObserver){return(
function trackParentChain(node, onAttach, onDetach) {
  let ancestorObservers = [];
  let docObserver = null;

  function startAncestorObservers() {
    if (ancestorObservers.length > 0) return;
    const ancestors = () => {
      const ancestors = [];
      let cur = node;
      while (cur && cur !== document && cur !== document.documentElement) {
        ancestors.push(cur);
        cur = cur.parentNode;
      }

      return ancestors;
    };

    // For each ancestor A, observe A's parent for "childList" removals of A
    ancestorObservers = ancestors().map((ancestor) => {
      const parent = ancestor.parentNode;
      // If no parent, can't observe
      if (!parent) return null;

      const obs = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const removed of mut.removedNodes) {
            if (removed === ancestor) {
              // An ancestor was removed => node is effectively detached
              stopAncestorObservers();
              initialize();
            }
          }
        }
      });

      obs.observe(parent, { childList: true, subtree: false });
      return obs;
    });
  }

  // 2. Stop watching ancestors
  function stopAncestorObservers() {
    ancestorObservers.forEach((obs) => obs && obs.disconnect());
    ancestorObservers = [];
  }

  // 3. Watch document with subtree:true to detect node reattachment
  function startDocObserver() {
    if (docObserver) return; // already watching
    docObserver = new MutationObserver(() => {
      console.log("doc observer", node.isConnected);
      if (node.isConnected) {
        // Node just reattached
        docObserver.disconnect();
        docObserver = null;
        initialize();
      }
    });
    docObserver.observe(document, { childList: true, subtree: true });
  }

  // 4. Stop doc observer
  function stopDocObserver() {
    if (docObserver) {
      docObserver.disconnect();
      docObserver = null;
    }
  }

  // 5. Initialization
  function initialize() {
    if (node.isConnected) {
      onAttach();
      startAncestorObservers();
    } else {
      startDocObserver();
    }
  }
  initialize();

  // 6. Return cleanup
  return function dispose() {
    stopAncestorObservers();
    stopDocObserver();
  };
}
)};
const _147yq6m = function _6(md){return(
md`### Tests
tick randomize to move the text area about, and see if it can keep focus`
)};
const _1vetxyg = function _random(Inputs){return(
Inputs.toggle({
  label: "randomize"
})
)};
const _1gqgw1z = (G, _) => G.input(_);
const _1w309t6 = function _domNode($0){return(
$0
)};
const _13lq2z4 = function _refresh_a(Inputs){return(
Inputs.button("a")
)};
const _1m5nvg1 = (G, _) => G.input(_);
const _155c35l = function _refresh_b(Inputs){return(
Inputs.button("b")
)};
const _5csvvc = (G, _) => G.input(_);
const _1xi848s = function _11(Inputs,domNode){return(
Inputs.button("dettach", { reduce: () => domNode.remove() })
)};
const _gmk80 = function _text(Inputs){return(
Inputs.text()
)};
const _wz6bsb = (G, _) => G.input(_);
const _p35nk0 = function _a(refresh_a,html,$0){return(
refresh_a && html`<div id="a">${$0}`
)};
const _10h1263 = function _b(refresh_b,html,$0){return(
refresh_b && html`<div id="b">${$0}`
)};
const _19d8odt = function* _reparent_randomly(random)
{
  if (random) {
    while (true) {
      const pick = Math.floor(Math.random() * 3);
      document.querySelectorAll("button")[pick].click();
      yield new Promise((r) => setTimeout(r, 3000));
    }
  }
};
const _rjvg0v = function _16(md){return(
md`## \`preserveFocus(node)\``
)};
const _oadhi0 = function _preserveFocus(trackParentChain){return(
(node) => {
  let lastFocused = null;

  function onFocus(e) {
    if (node.contains(e.target)) {
      lastFocused = e.target;
    } else {
      lastFocused = null;
    }
  }
  function onPointerDown(e) {
    if (!node.contains(e.target)) {
      lastFocused = null;
    }
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("focus", onFocus, true);

  const stopWatchingConnection = trackParentChain(
    node,
    () => {
      if (lastFocused && node.contains(lastFocused)) {
        //console.log("restore focus");
        lastFocused.focus();
      } else {
        // console.log("skip focus", node.contains(lastFocused), lastFocused);
      }
    },
    () => {}
  );

  // Dispose
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("focus", onFocus, true);
    stopWatchingConnection();
  };
}
)};
const _8x4wt = function _18(invalidation,preserveFocus,domNode){return(
invalidation.then(preserveFocus(domNode))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_16r1e17", null, ["md"], _16r1e17);  
  $def("_1opxkkq", null, ["md"], _1opxkkq);  
  $def("_d8xfk7", "trackParent", ["MutationObserver"], _d8xfk7);  
  $def("_q8d10q", null, ["md"], _q8d10q);  
  $def("_jtrbcs", "trackParentChain", ["MutationObserver"], _jtrbcs);  
  $def("_147yq6m", null, ["md"], _147yq6m);  
  $def("_1vetxyg", "viewof random", ["Inputs"], _1vetxyg);  
  $def("_1gqgw1z", "random", ["Generators","viewof random"], _1gqgw1z);  
  $def("_1w309t6", "domNode", ["viewof text"], _1w309t6);  
  $def("_13lq2z4", "viewof refresh_a", ["Inputs"], _13lq2z4);  
  $def("_1m5nvg1", "refresh_a", ["Generators","viewof refresh_a"], _1m5nvg1);  
  $def("_155c35l", "viewof refresh_b", ["Inputs"], _155c35l);  
  $def("_5csvvc", "refresh_b", ["Generators","viewof refresh_b"], _5csvvc);  
  $def("_1xi848s", null, ["Inputs","domNode"], _1xi848s);  
  $def("_gmk80", "viewof text", ["Inputs"], _gmk80);  
  $def("_wz6bsb", "text", ["Generators","viewof text"], _wz6bsb);  
  $def("_p35nk0", "a", ["refresh_a","html","viewof text"], _p35nk0);  
  $def("_10h1263", "b", ["refresh_b","html","viewof text"], _10h1263);  
  $def("_19d8odt", "reparent_randomly", ["random"], _19d8odt);  
  $def("_rjvg0v", null, ["md"], _rjvg0v);  
  $def("_oadhi0", "preserveFocus", ["trackParentChain"], _oadhi0);  
  $def("_8x4wt", null, ["invalidation","preserveFocus","domNode"], _8x4wt);
  return main;
}