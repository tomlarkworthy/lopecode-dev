# Representative harness diffs

## The /src byte-stability fix — commit 0c8a33a
The single change that flipped MIMO from whole-file rewrites to incremental edits:
```diff
   const applyModuleFile = async (path) => {
-    const m = /^\/notebook\/(.+)\.js$/.exec(path);
+    const m = /^\/(?:notebook|src)\/(.+)\.js$/.exec(path);
     if (!m) return null;
     const id = m[1];
     const wasNew = !moduleExists(id);
@@ -468,14 +510,19 @@ const _editTools = function _editTools(defineTool, rc4_workspace, currentModules
       if (typeof mod.default !== 'function') return { ok: false, msg: 'written, but no default export define() — not applied' };
       const r = apply(id, mod.default);
       if (!r.applied) return { ok: false, msg: 'written, but not applied: ' + (r.reason || 'unknown') };
-      if (r.changes > 0) { try { const ex = await exportModuleJS(id); await writeText(path, ex.source); } catch (e) {} }
+      // Refresh the canonical "real file" at /notebook/<id>.js (compile→decompile round-trip auto-formats it).
+      // CRITICAL: never write this back to a /src/ path — /src/ is the agent's STABLE editing cache; reformatting
+      // it would break the next edit_file's old_string match (the bug that forced whole-file rewrites). For a /src/
+      // edit the agent's bytes are left verbatim; only the canonical /notebook mirror is refreshed.
+      if (r.changes > 0) { try { const ex = await exportModuleJS(id); await writeText('/notebook/' + id + '.js', ex.source); } catch (e) {} }
       const n = r.changes || 0;
       // a brand-new module with a display cell → surface it in the shared view (B14)
       const surfaced = wasNew && /\bviewof\s|\bmd`|\bhtml`/.test(src) && surfaceInView(id);
       // force-compute the cells + auto-watch them, so a lazy runtime error (compile-clean but throws on
       // observe) is reported in THIS turn and future changes stream — the agent never writes blind.
       let status = ''; try { status = probeStatus(await probeAndWatch(id)); } catch (e) {}
-      return { ok: true, msg: 'applied live (' + n + ' cell' + (n === 1 ? '' : 's') + ' changed)' + (surfaced ? ' · opened in the shared view so the human can see it' : '') + status };
+      let structure = ''; try { structure = await structureStatus(id); } catch (e) {}
+      return { ok: true, msg: 'applied live (' + n + ' cell' + (n === 1 ? '' : 's') + ' changed)' + (surfaced ? ' · opened in the shared view so the human can see it' : '') + status + structure };
     } catch (e) {
       return { ok: false, msg: 'written, but FAILED TO COMPILE: ' + (e && e.message || e) + ' — live runtime unchanged; fix and re-edit' };
     } finally { URL.revokeObjectURL(url); }
@@ -486,13 +533,20 @@ const _editTools = function _editTools(defineTool, rc4_workspace, currentModules
     description: 'Read a file from the virtual filesystem, returned with line numbers (cat -n style). Use ' +
       'offset/limit for large files. Mirrors Claude Code\'s Read.',
     parameters: { type: 'object', additionalProperties: false, required: ['file_path'], properties: {
-      file_path: { type: 'string', description: 'Absolute path, e.g. /notebook/@user/mod.js or /content/bootconf.json.' },
+      file_path: { type: 'string', description: 'Absolute path, e.g. /src/@user/mod.js or /content/bootconf.json.' },
       offset: { type: 'number', description: '1-based line to start from (optional).' },
       limit: { type: 'number', description: 'Maximum lines to read (optional; default 2000).' },
     } },
     execute: async ({ file_path, offset, limit }) => {
       let text;
-      try { text = await readText(file_path); } catch (e) { return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) }; }
+      try { text = await readText(file_path); }
+      catch (e) {
+        // /src/<id>.js is the agent's stable editing cache — seed it lazily from the canonical module the first
+        // time it is read, so a module that exists live always has an editable /src/ copy.
+        const sm = /^\/src\/(.+)\.js$/.exec(file_path);
+        if (sm) { try { const ex = await exportModuleJS(sm[1]); await writeText(file_path, ex.source); text = ex.source; } catch (e2) {} }
+        if (text === undefined) return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) };
+      }
       const lines = text.split('\n');
       const start = Math.max(0, offset ? offset - 1 : 0);
       const end = Math.min(lines.length, start + (limit || 2000));
@@ -506,7 +560,8 @@ const _editTools = function _editTools(defineTool, rc4_workspace, currentModules
   const write_file = defineTool({
     id: 'write_file',
     description: 'Create or overwrite a file in the virtual filesystem. Mirrors Claude Code\'s Write. Writing a ' +
-      'live /notebook/<id>.js module APPLIES it and reports whether it compiled.',
+      'module file under /src/<id>.js APPLIES it to the live runtime and reports whether it compiled; your file ' +
+      'keeps your EXACT text (it is never reformatted), so you can keep editing it with edit_file.',
     parameters: { type: 'object', additionalProperties: false, required: ['file_path', 'content'], properties: {
       file_path: { type: 'string', description: 'Absolute path.' },
       content: { type: 'string', description: 'Full file contents.' },
@@ -521,8 +576,9 @@ const _editTools = function _editTools(defineTool, rc4_workspace, currentModules
   const edit_file = defineTool({
     id: 'edit_file',
     description: 'Replace an exact, literal string in a file. Mirrors Claude Code\'s Edit: old_string must appear ' +
-      'exactly once (include surrounding context) unless replace_all is true. Editing a live /notebook/<id>.js ' +
-      'module APPLIES the result and reports whether it compiled, in this same turn.',
+      'exactly once (include surrounding context) unless replace_all is true. Editing a module file under ' +
+      '/src/<id>.js APPLIES the result and reports whether it compiled, in this same turn. /src/ files keep your ' +
+      'exact bytes, so old_string from your last write/edit always matches — prefer many small edits over rewrites.',
     parameters: { type: 'object', additionalProperties: false, required: ['file_path', 'old_string', 'new_string'], properties: {
       file_path: { type: 'string', description: 'Absolute path.' },
       old_string: { type: 'string', description: 'Exact text to replace (include enough context to be unique).' },
@@ -590,6 +646,19 @@ const _hostSetup = function _hostSetup(jbFileSync, rc4_workspace, currentModules
       await sleep(200);
     }
     if (!cancelled) { try { await mirrorBlocks(rc4_workspace.fs); } catch (e) {} }
+    // Seed /src/ — the agent's STABLE editing cache. It is a copy of the canonical /notebook projection that is
+    // NEVER reformatted on apply, so edit_file old_strings keep matching (whole-file rewrites were the symptom of
+    // /notebook being re-serialised under the agent). Copy-if-absent so we never clobber an edit the agent made.
+    if (!cancelled) { try {
+      const fs = rc4_workspace.fs;
+      const all = typeof fs.getAllPaths === 'function' ? fs.getAllPaths() : [];
+      const have = new Set(all.filter((p) => /^\/src\/.+\.js$/.test(p)));
+      for (const np of all.filter((p) => /^\/notebook\/.+\.js$/.test(p))) {
+        const sp = '/src/' + np.slice('/notebook/'.length);
+        if (have.has(sp)) continue;
+        try { await fs.writeFile(sp, await fs.readFile(np)); } catch (e) {}
+      }
+    } catch (e) {} }
   })();
   // value/eval tools + Claude-Code-style file tools, registered through the plugin registry
   const tools = [...valueTools, ...editTools];
@@ -622,7 +691,7 @@ const _hostMount = function _hostMount(html, hostSetup, attachmentMirror, valueT
   const ids = [...valueTools, ...editTools].map((t) => t.id).join(', ');
   return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
     <div>● host integration active — self-edit + value inspection + eval + file tools + watches</div>
-    <div style="color:#8b949e">tools: ${ids} · /notebook = editable modules, /content = raw blocks (${attachmentMirror} attachments)</div>
+    <div style="color:#8b949e">tools: ${ids} · /src = editable modules (stable), /notebook = canonical mirror, /content = raw blocks (${attachmentMirror} attachments)</div>
     ${watchTable}
     ${hostSetup}
   </div>`;
```

## Reasoning-model token budget — commit 0c19a51
```diff
-    maxStepsPerTurn: 40
+    maxStepsPerTurn: 40,
+    // Reasoning models (e.g. xiaomi/mimo-v2.5) spend completion budget on reasoning; 8192 truncated mid-thought
+    // (finish_reason 'length') BEFORE the tool call, and the loop stops on 'length' → the build silently died
+    // after just exploring. Give enough headroom for reasoning + a full write_file tool call.
+    maxTokens: 32000
```
