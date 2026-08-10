// Where does the scan's missing 10ms go? Time the dispatch timeline from the
// main thread: Worker.prototype.postMessage is looked up at call time, so it
// intercepts a pool whose workers are private, and `this` there is the worker
// instance -- which is the only handle from which to wrap its onmessage.
//
// send() ids come from one global counter, so a frame's chunks are a run of
// consecutive ids. That groups the log into frames exactly, with no clustering
// heuristic and no marker cell.
(() => {
  const W = window.Worker.prototype;
  if (window.__dispatchProbe) return "already installed";
  const log = [];
  const wid = new Map();
  const origPost = W.postMessage;
  W.postMessage = function (msg, transfer) {
    let i = wid.get(this);
    if (i === undefined) {
      i = wid.size;
      wid.set(this, i);
      const orig = this.onmessage;
      this.onmessage = (e) => {
        log.push({ t: performance.now(), k: "recv", w: i, id: e.data && e.data.id, ms: e.data && e.data.ms });
        return orig && orig.call(this, e);
      };
    }
    // t is taken AFTER the pack (the caller packs, then calls us), so
    // recv->post gaps below are turnaround INCLUDING pack cost.
    log.push({ t: performance.now(), k: "post", w: i, id: msg && msg.id, n: msg && msg.ys ? msg.ys.length : 0 });
    return origPost.call(this, msg, transfer);
  };
  window.__dispatchProbe = {
    log,
    stop() { W.postMessage = origPost; delete window.__dispatchProbe; return log.length; }
  };
  return "installed";
})()
