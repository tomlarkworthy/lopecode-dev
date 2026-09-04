// Re-seed for a resumed turn: the fresh page needs the agent's own end state — scratch files and
// the modules it wrote — but not the notebook's stock modules. Disk files persist on the host.
// "The agent's modules" is decided against the bundle's own module ids, not a path prefix: arm k
// (2026-09-03) lost 4/5 modules because the agents wrote /src/@tomlarkworthy/<name>.js (every
// example they see is under that prefix) and the old /src/@user/ filter dropped them as core.
export function warmSeeds(seeds, snap, stockModuleIds) {
  const out = { ...seeds };
  for (const [path, text] of Object.entries(snap.files || {})) {
    if (typeof text !== "string") continue;
    if (path.startsWith("/notebook/")) continue;
    if (path.startsWith("/src/")) {
      const id = path.slice(5).replace(/\.js$/, "");
      // Only @scope/name modules can be the agent's. The snapshot also lists the runtime's own
      // `builtin` and hashed Observable imports (`d/<hash>@<v>`); re-seeding `builtin` as a module
      // broke rc5_host on every continuation of arm l (2026-09-03 22:20, "rc5_host.mount unavailable").
      if (!/^@[^/]+\/[^/]+$/.test(id)) continue;
      if (stockModuleIds && stockModuleIds.has(id)) continue;
    }
    out[path] = text;
  }
  return out;
}
// Module ids embedded in the eval bundle: <script type="text/plain" id="@x/y" data-mime="application/javascript">.
export function stockModuleIdsOf(notebookHtml) {
  const ids = new Set();
  const tag = /<script\b([^>]*)>/g;
  let m;
  while ((m = tag.exec(notebookHtml))) {
    const attrs = m[1];
    if (!/\btype="text\/plain"/.test(attrs) || !/\bdata-mime="application\/javascript"/.test(attrs)) continue;
    const id = /\bid="([^"]+)"/.exec(attrs);
    if (id && id[1].split("/").length === 2) ids.add(id[1]);
  }
  return ids;
}
