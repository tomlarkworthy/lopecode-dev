  // ------------------------------------------ df32: an edit to a CORE cell is refused unless re-opened
  // Walk ae (2026-09-23): the core rule was satisfied five times and the agent edited a CORE cell past
  // it four times, in the same turn or the next; 8 of 20 turns went to re-attesting cells it had just
  // un-verified. The PM note said "frozen" every turn and nothing refused the write. The driver names
  // the cells the reviewer's note re-opened this turn in globalThis.__rc5MayEdit, pre-boot. With no
  // such global (smoke fixtures, older drivers, turn 1) the guard is off and the page is df31.
  const mayEdit = () => {
    try {
      const r = globalThis.__rc5MayEdit;
      return Array.isArray(r) ? r.map(x => String(x == null ? '' : x).trim()).filter(Boolean) : null;
    } catch (e) {
      return null;
    }
  };
  const reopened = (name, may) => may.indexOf(name) >= 0 || may.indexOf(String(name).replace(/^(viewof|mutable|initial) /, '')) >= 0;
  const hasVarIn = ins => (ins || []).some(i => (typeof i === 'string' ? i : i && i._name) === '@variable');
  // The live cells a write would redefine or delete, matched the way jbApply matches them (pid, then
  // name) and judged "changed" by the attestation hash (hashOf), so a refused write is exactly one
  // that would have made a CORE attestation go stale.
  const changedByWrite = (mod, cells) => {
    const live = varsOf(mod);
    const byPid = new Map(), byName = new Map();
    for (const v of live) {
      if (v.pid)
        byPid.set(v.pid, v);
      if (v._name)
        byName.set(v._name, v);
    }
    const changed = new Set(), seenPids = new Set(), seenNames = new Set();
    for (const c of cells) {
      if (!c || c.type === 'import' || c.name === '@variable')
        continue;
      if (c.name)
        seenNames.add(c.name);
      if (c.name && c.name.startsWith('module ') || hasVarIn(c.inputs))
        continue;
      const ex = c.pid && byPid.get(c.pid) || c.name && byName.get(c.name);
      if (!ex)
        continue;
      if (ex.pid)
        seenPids.add(ex.pid);
      if (hashText(String(c.definition)) !== hashOf(ex) || (ex._name || null) !== (c.name || null))
        changed.add(ex);
    }
    for (const v of live)
      if (v.pid && !seenPids.has(v.pid) && !(v._name && seenNames.has(v._name)))
        changed.add(v); // deleted
    return changed;
  };
  // null = the write may proceed; a string = the whole tool result for a refused write.
  const freezeCheck = (moduleId, cells) => {
    const may = mayEdit();
    if (!may)
      return null;
    const mod = resolveModule(moduleId);
    if (!mod)
      return null;
    const st = coreOf(moduleId);
    if (!st || st.error || !st.core.length)
      return null;
    const coreSet = new Set(st.core);
    const hit = [];
    for (const v of changedByWrite(mod, cells)) {
      const n = nameOf(v, moduleId);
      if (coreSet.has(n) && !reopened(n, may) && hit.indexOf(n) < 0)
        hit.push(n);
    }
    if (!hit.length)
      return null;
    return 'REFUSED: this edit changes CORE cell(s) ' + hit.sort().join(', ') + ', which the reviewer\'s note did not re-open (May edit: ' + (may.join(', ') || 'none') + ').\n' + 'A verified cell is frozen. Edit only cells outside the core, or report why this one must change and stop — ' + 'the reviewer re-opens it by naming it on the note\'s `May edit:` line. (df32)';
  };
  const frozenLine = st => {
    const may = mayEdit();
    if (!may)
      return null;
    const frozen = (st.core || []).filter(n => !reopened(n, may));
    return 'frozen: ' + (frozen.join(', ') || '(none)') + ' (an edit is refused unless the note re-opens the cell; re-opened this turn: ' + (may.join(', ') || 'none') + ')';
  };
  globalThis.__rc5FreezeCheck = freezeCheck;
