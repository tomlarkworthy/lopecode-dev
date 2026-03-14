/**
 * lope-loader-register.js - Registers the custom loader hooks
 *
 * Usage: node --import ./lope-loader-register.js lope-node-runner.js <dir>
 *
 * The modules directory is passed via LOPE_MODULES_DIR env var,
 * which the runner sets before any module imports happen.
 * Since loader hooks run in a separate thread, we use a lazy
 * approach: the resolve hook reads LOPE_MODULES_DIR at call time.
 */

import { register } from "node:module";

register("./lope-loader.js", import.meta.url, {
  data: {
    // Will be set by the runner before module loads happen.
    // The loader reads process.env.LOPE_MODULES_DIR as fallback.
    modulesDir: process.env.LOPE_MODULES_DIR || null,
  },
});
