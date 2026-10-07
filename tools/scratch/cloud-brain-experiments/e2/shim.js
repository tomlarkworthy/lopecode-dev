globalThis.requestAnimationFrame = (f) => { queueMicrotask(() => f(Date.now())); return 0; };
