// The runtime picks its scheduler when it loads. A timer set in one request is dropped when that
// request ends, which leaves runtime._computing pending forever. A microtask is not tied to a request.
globalThis.requestAnimationFrame = (f) => { queueMicrotask(() => f(Date.now())); return 0; };
