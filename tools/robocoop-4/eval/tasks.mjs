// Programmatic-assertion eval fixtures. Each task seeds files, runs a prompt, then asserts
// post-state against the fs. `script` is the SCRIPTED client's canned tool-calls so the default
// no-network mode is deterministic; the real OpenRouter client ignores `script`.

import { idToPath } from '../fsmap.mjs';
import {
  fileContains,
  fileLacksIdentifier,
  parsesWithoutSyntaxError,
  fileExists,
  fileAbsent,
} from './assertions.mjs';

const MOD = '@user/mod';
const P = idToPath(MOD); // /notebook/@user/mod.js

// Await each (possibly-promise) assertion; short-circuit on first failure.
async function and(...results) {
  const resolved = await Promise.all(results);
  for (const r of resolved) if (!r.ok) return r;
  return { ok: true, detail: resolved.map((r) => r.detail).join('; ') };
}

// Substring-absence (for phrases that are not single identifiers, e.g. 'Old Title').
async function fileExcludes(fs, idOrPath, needle) {
  const r = await fileContains(fs, idOrPath, needle);
  return { ok: !r.ok, detail: r.ok ? 'unexpectedly contains ' + JSON.stringify(needle) : 'excludes ' + JSON.stringify(needle) };
}

// finishing scripted turn: a plain assistant message ends the loop.
const DONE = { content: 'Done.' };

export const tasks = [
  {
    id: 'rename-identifier',
    files: {
      [P]: 'const _0 = function _0(foo){return( foo + 1 )};\nconst _foo = function _foo(){return( 41 )};\n',
    },
    prompt: `In ${P}, rename the cell identifier foo to bar everywhere. Keep it parsing.`,
    script: [
      { tool_calls: [{ name: 'bash', arguments: { command: `sed -i 's/foo/bar/g' ${P}` } }] },
      DONE,
    ],
    assert: (fs) =>
      and(
        fileContains(fs, MOD, 'bar'),
        fileLacksIdentifier(fs, MOD, 'foo'),
        parsesWithoutSyntaxError(fs, MOD),
      ),
  },

  {
    id: 'add-markdown-cell',
    files: {
      [P]: 'const _0 = function _0(){return( 1 )};\n',
    },
    prompt: `In ${P}, append a new cell: const _title = function _title(md){return( md\`# Hello\` )};`,
    script: [
      {
        tool_calls: [
          {
            name: 'bash',
            arguments: {
              command: String.raw`cat >> ${P} <<'EOF'
const _title = function _title(md){return( md` + '`# Hello`' + String.raw` )};
EOF`,
            },
          },
        ],
      },
      DONE,
    ],
    assert: (fs) =>
      and(fileContains(fs, MOD, '_title'), fileContains(fs, MOD, '# Hello'), parsesWithoutSyntaxError(fs, MOD)),
  },

  {
    id: 'fix-syntax-error',
    files: {
      [P]: 'const _bad = function _bad(){return( [1, 2, 3 )};\n',
    },
    prompt: `${P} has a syntax error (a missing ]). Fix it so the file parses.`,
    script: [
      { tool_calls: [{ name: 'bash', arguments: { command: `sed -i 's/3 )/3] )/' ${P}` } }] },
      DONE,
    ],
    assert: (fs) => parsesWithoutSyntaxError(fs, MOD),
  },

  {
    id: 'change-numeric-literal',
    files: {
      [P]: 'const _n = function _n(){const N = 10; return( N )};\n',
    },
    prompt: `In ${P}, change the numeric literal 10 to 42.`,
    script: [
      { tool_calls: [{ name: 'bash', arguments: { command: `sed -i 's/= 10/= 42/' ${P}` } }] },
      DONE,
    ],
    assert: (fs) =>
      and(fileContains(fs, MOD, '= 42'), fileLacksIdentifier(fs, MOD, '10'), parsesWithoutSyntaxError(fs, MOD)),
  },

  {
    id: 'replace-string-literal',
    files: {
      [P]: "const _t = function _t(){return( 'Old Title' )};\n",
    },
    prompt: `In ${P}, change the title 'Old Title' to 'New Title'.`,
    script: [
      { tool_calls: [{ name: 'bash', arguments: { command: `sed -i "s/Old Title/New Title/" ${P}` } }] },
      DONE,
    ],
    assert: (fs) =>
      and(fileContains(fs, MOD, 'New Title'), fileExcludes(fs, MOD, 'Old Title'), parsesWithoutSyntaxError(fs, MOD)),
  },

  {
    id: 'delete-cell',
    files: {
      [P]: 'const _keep = function _keep(){return( 1 )};\nconst _unused = function _unused(){return( 2 )};\n',
    },
    prompt: `In ${P}, delete the _unused cell entirely.`,
    script: [
      { tool_calls: [{ name: 'bash', arguments: { command: `sed -i '/_unused/d' ${P}` } }] },
      DONE,
    ],
    assert: (fs) =>
      and(fileLacksIdentifier(fs, MOD, '_unused'), fileContains(fs, MOD, '_keep'), parsesWithoutSyntaxError(fs, MOD)),
  },

  {
    id: 'create-new-file',
    files: {
      [P]: 'const _0 = function _0(){return( 1 )};\n',
    },
    prompt: `Create a new module at ${idToPath('@user/helper')} containing const _help = function _help(){return( 7 )};`,
    script: [
      {
        tool_calls: [
          {
            name: 'bash',
            arguments: {
              command:
                `printf '%s\\n' 'const _help = function _help(){return( 7 )};' > ${idToPath('@user/helper')}`,
            },
          },
        ],
      },
      DONE,
    ],
    assert: (fs) =>
      and(
        fileExists(fs, '@user/helper'),
        fileContains(fs, '@user/helper', '_help'),
        parsesWithoutSyntaxError(fs, '@user/helper'),
      ),
  },

  {
    id: 'add-import-line',
    files: {
      [P]: 'const _0 = function _0(range){return( range(10) )};\n',
    },
    prompt: `Prepend an import to ${P}: import {range} from '@d3/array'`,
    script: [
      {
        tool_calls: [
          {
            name: 'bash',
            arguments: {
              command: `sed -i "1i import {range} from '@d3/array'" ${P}`,
            },
          },
        ],
      },
      DONE,
    ],
    assert: (fs) =>
      and(fileContains(fs, MOD, "import {range} from '@d3/array'"), parsesWithoutSyntaxError(fs, MOD)),
  },
];
