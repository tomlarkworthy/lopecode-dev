// Node-only adapter: one Bash + one InMemoryFs, threading cwd/env via result.env/result.env.PWD.
// just-bash exec is STATELESS except the fs, so cd/export do NOT persist — we thread them ourselves.

import { Bash } from '../justbash-build/node_modules/just-bash/dist/bundle/index.js';

export function createNodeSession(fs, { cwd = '/notebook', env = {} } = {}) {
  let curCwd = cwd;
  let curEnv = { ...env, PWD: cwd };
  const bash = new Bash({ fs });

  async function runCommand(command) {
    const r = await bash.exec(command, { cwd: curCwd, env: curEnv });
    if (r?.env) {
      curEnv = r.env;
      if (r.env.PWD) curCwd = r.env.PWD;
    }
    return { stdout: r?.stdout ?? '', stderr: r?.stderr ?? '', exitCode: r?.exitCode ?? 0 };
  }

  return { runCommand, get cwd() { return curCwd; }, get env() { return curEnv; } };
}
