// Reusable programmatic assertion primitives. All fs access routes through fsmap/listModuleFiles.
// just-bash InMemoryFs.readFile is ASYNC, so these primitives are async; getAllPaths is sync.

import { idToPath, listModuleFiles } from '../fsmap.mjs';

async function readModule(fs, idOrPath) {
  const path = idOrPath.startsWith('/') ? idOrPath : idToPath(idOrPath);
  return await fs.readFile(path); // rejects if absent
}

export function fileExists(fs, idOrPath) {
  const path = idOrPath.startsWith('/') ? idOrPath : idToPath(idOrPath);
  const present = listModuleFiles(fs).includes(path);
  return { ok: present, detail: present ? 'exists ' + path : 'missing ' + path };
}

export function fileAbsent(fs, idOrPath) {
  const path = idOrPath.startsWith('/') ? idOrPath : idToPath(idOrPath);
  const present = listModuleFiles(fs).includes(path);
  return { ok: !present, detail: present ? 'unexpectedly present ' + path : 'absent ' + path };
}

export async function fileContains(fs, idOrPath, needle) {
  let src;
  try { src = await readModule(fs, idOrPath); } catch (e) { return { ok: false, detail: 'read failed: ' + e.message }; }
  const ok = src.includes(needle);
  return { ok, detail: ok ? 'contains ' + JSON.stringify(needle) : 'missing ' + JSON.stringify(needle) };
}

// Identifier-aware absence: word-boundary match so `foo` does not match `food`.
export async function fileLacksIdentifier(fs, idOrPath, ident) {
  let src;
  try { src = await readModule(fs, idOrPath); } catch (e) { return { ok: false, detail: 'read failed: ' + e.message }; }
  const re = new RegExp('\\b' + ident.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  const hit = re.test(src);
  return { ok: !hit, detail: hit ? 'identifier still present: ' + ident : 'identifier absent: ' + ident };
}

// Parse check: strip top-level import/export, then new Function (handles Observable cell sources).
export async function parsesWithoutSyntaxError(fs, idOrPath) {
  let src;
  try { src = await readModule(fs, idOrPath); } catch (e) { return { ok: false, detail: 'read failed: ' + e.message }; }
  const stripped = src.replace(/^\s*import\b.*$/gm, '').replace(/^\s*export\s+/gm, '');
  try {
    new Function(stripped);
    return { ok: true, detail: 'parses without syntax error' };
  } catch (e) {
    return { ok: false, detail: 'syntax error: ' + e.message };
  }
}
