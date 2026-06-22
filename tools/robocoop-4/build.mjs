#!/usr/bin/env node
// One-command reproducible build of the robocoop-4 notebook artifact.
//   node tools/robocoop-4/build.mjs
// Stages:
//   1. assemble-html.mjs  — copy justbash base, rename bash bundle attachment, strip dead justbash
//                           modules, patch bootconf (title/mains/hash).
//   2. sync-module        — insert/update every rc4-owned module + the reused helpers it edits.
//   3. repoint            — justbash-filesync (kept for jbApply/jbFileSync) still imports the OLD bash
//                           trio ids, which stage 1 stripped; rewrite those import() URLs to the bundled
//                           robocoop-4-bash* so module-map's load pass doesn't 404 against Observable.
//   4. mirror             — copy the artifact into the lopecode published repo.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TARGET = join(ROOT, 'lopebooks', 'notebooks', '@tomlarkworthy_robocoop-4.html');
const MIRROR = join(ROOT, 'lopecode', 'notebooks', '@tomlarkworthy_robocoop-4.html');

// rc4-owned + reused-and-edited modules to (re)sync into the artifact.
const MODULES = [
  'robocoop-4-bash', 'robocoop-4-bash-session', 'robocoop-4-bash-terminal',
  'robocoop-4-core', 'robocoop-4-tools', 'robocoop-4-engine', 'robocoop-4-hostbridge',
  'robocoop-4', 'robocoop-4-tests',
  'justbash-filesync',   // reused: jbApply + jbFileSync realtime engine
  'command-palette',     // reused: repointed to reactive currentModules so live modules are findable
  'inputs-reference',    // bundled docs for in-workspace API lookup
];

console.log('[1/4] assemble base');
execFileSync('node', [join(HERE, 'assemble-html.mjs')], { stdio: 'inherit' });

console.log('[2/4] sync modules');
for (const m of MODULES) {
  const src = join(ROOT, 'modules', '@tomlarkworthy', m + '.js');
  execFileSync('bun', [join(ROOT, 'tools', 'channel', 'sync-module.ts'),
    '--module', '@tomlarkworthy/' + m, '--source', src, '--target', TARGET, '--insert-ok'],
    { stdio: ['ignore', 'ignore', 'inherit'] });
}

console.log('[3/4] repoint justbash-filesync trio imports -> robocoop-4-bash*');
let html = readFileSync(TARGET, 'utf8');
const repoint = [
  ['/@tomlarkworthy/just-bash.js', '/@tomlarkworthy/robocoop-4-bash.js'],
  ['/@tomlarkworthy/justbash-session.js', '/@tomlarkworthy/robocoop-4-bash-session.js'],
  ['/@tomlarkworthy/justbash-terminal.js', '/@tomlarkworthy/robocoop-4-bash-terminal.js'],
];
for (const [from, to] of repoint) {
  const re = new RegExp('import\\("' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?v=\\d+)?"\\)', 'g');
  const before = html;
  html = html.replace(re, (_m, v) => 'import("' + to + (v || '') + '")');
  if (html !== before) console.log('  repointed ' + from + ' -> ' + to);
}
writeFileSync(TARGET, html);

console.log('[4/4] mirror to lopecode');
copyFileSync(TARGET, MIRROR);
console.log('Done. Artifact: ' + TARGET);
