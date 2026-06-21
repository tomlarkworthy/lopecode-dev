// Pure path<->moduleId codec + system-path filter. The single chokepoint every grader routes through.

export const NOTEBOOK_PREFIX = '/notebook/';

export function idToPath(id) {
  return NOTEBOOK_PREFIX + id + '.js';
}

export function pathToId(path) {
  if (!path.startsWith(NOTEBOOK_PREFIX) || !path.endsWith('.js')) return null;
  return path.slice(NOTEBOOK_PREFIX.length, -'.js'.length);
}

// getAllPaths() leaks ~24+ system nodes (/bin,/usr,/dev,/proc); filter to /notebook .js files.
export function listModuleFiles(fs) {
  const all = typeof fs.getAllPaths === 'function' ? fs.getAllPaths() : [];
  return all.filter((p) => p.startsWith(NOTEBOOK_PREFIX) && p.endsWith('.js'));
}
