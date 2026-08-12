// Loaded after bootstrap, before cli.js. Force-imports every shim so the
// synchronous require() registry is fully populated regardless of which
// specifiers cli.js reaches only dynamically.
import "./events.mjs";
import "./buffer.mjs";
import "./process.mjs";
import "./path.mjs";
import "./fs.mjs";
import "./fs-promises.mjs";
import "./os.mjs";
import "./crypto.mjs";
import "./util.mjs";
import "./url.mjs";
import "./stream.mjs";
import "./net.mjs";
import "./tls.mjs";
import "./http.mjs";
import "./https.mjs";
import "./zlib.mjs";
import "./readline.mjs";
import "./tty.mjs";
import "./timers-promises.mjs";
import "./stream-consumers.mjs";
import "./async_hooks.mjs";
import "./child_process.mjs";
import "./module.mjs";
import "./extras.mjs";
console.log("[preload] all shims registered");
