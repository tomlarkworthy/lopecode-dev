// --- State cells ---

const _cc_config = function _cc_config(){return(
  { port: 8787, host: "127.0.0.1" }
)};

const _cc_notebook_id = function _cc_notebook_id(){return(
  location.href
)};

const _cc_status = function _cc_status(Inputs){return(
  Inputs.input("disconnected")
)};

const _cc_messages = function _cc_messages(Inputs){return(
  Inputs.input([])
)};

const _cc_watches = function _cc_watches(Inputs){return(
  Inputs.input([
    { name: "hash", module: null },
    { name: "currentModules", module: null }
  ])
)};

const _cc_module = function _cc_module(thisModule){return(
  thisModule()
)};

// --- Voice toggle cell ---

const _voiceEnabled = function _voiceEnabled(){return(
(function() {
  var span = document.createElement("span");
  span.className = "cc-voice-toggle";
  span.style.cssText = "font-size:20px;opacity:0.4;transition:opacity 0.15s;line-height:1;cursor:pointer;flex-shrink:0;user-select:none;align-self:center;";
  span.textContent = "\uD83C\uDF99\uFE0F";
  span.title = "Toggle voice mode";
  span.value = false;
  span.onclick = function() {
    span.value = !span.value;
    span.style.opacity = span.value ? "1" : "0.4";
    span.dispatchEvent(new Event("input"));
  };
  return span;
})()
)};

// --- UI cells ---

const _cc_chat = function _cc_chat(cc_messages, cc_status, cc_ws, md, htl, Inputs, viewof_voiceEnabled){return(
(function() {
  var statusColors = {
    connected: "#22c55e",
    connecting: "#f59e0b",
    pairing: "#f59e0b",
    disconnected: "#ef4444"
  };

  function renderConnect() {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;justify-content:center;align-items:center;padding:16px;";

    var tokenInput = document.createElement("input");
    tokenInput.type = "text";
    tokenInput.placeholder = "LOPE-XXXX";
    tokenInput.style.cssText = "font-family:var(--monospace, monospace);font-size:16px;padding:8px 12px;border:2px solid var(--theme-foreground-faint);border-radius:6px;width:140px;text-transform:uppercase;letter-spacing:2px;background:var(--theme-background-a);color:var(--theme-foreground);";

    var connectBtn = document.createElement("button");
    connectBtn.textContent = "Connect";
    connectBtn.style.cssText = "padding:8px 20px;background:var(--theme-foreground);color:var(--theme-background-a);border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;";
    connectBtn.onclick = function() {
      var token = tokenInput.value.trim();
      if (token) cc_ws.connect(token);
    };
    tokenInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") connectBtn.click();
    });

    row.append(tokenInput, connectBtn);

    var guide = document.createElement("details");
    guide.style.cssText = "padding:0 16px 16px;font-size:13px;color:var(--theme-foreground);";
    guide.innerHTML = '<summary style="cursor:pointer;font-weight:600;font-size:14px;">Setup guide</summary>' +
      '<ol style="margin:8px 0 0;padding-left:20px;line-height:1.8;">' +
      '<li>Install <a href="https://bun.sh" target="_blank">Bun</a> if needed, then:<br>' +
      '<code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">bun install -g @lopecode/channel</code><br>' +
      '<code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">claude mcp add lopecode bunx @lopecode/channel</code></li>' +
      '<li>Start Claude Code:<br><code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">claude --dangerously-load-development-channels server:lopecode</code></li>' +
      '<li>Ask Claude for a pairing token, then paste it above</li>' +
      '</ol>';

    var container = document.createElement("div");
    container.append(row, guide);
    return container;
  }

  function renderChat() {
    var messagesDiv = document.createElement("div");
    messagesDiv.className = "cc-messages";
    messagesDiv.style.cssText = "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;";

    var textarea = document.createElement("textarea");
    textarea.className = "cc-input";
    textarea.placeholder = "Message Claude...";
    textarea.rows = 2;
    textarea.style.cssText = "width:100%;box-sizing:border-box;resize:none;border:1px solid var(--theme-foreground-faint);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:14px;outline:none;background:var(--theme-background-a);color:var(--theme-foreground);";

    var sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.cssText = "padding:8px 16px;background:var(--theme-foreground);color:var(--theme-background-a);border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;margin-left:auto;";

    function sendMessage() {
      var text = textarea.value.trim();
      if (!text || !cc_ws.ws) return;
      var msgs = cc_messages.value.concat([{ role: "user", content: text, timestamp: Date.now() }]);
      cc_messages.value = msgs;
      cc_messages.dispatchEvent(new Event("input"));
      cc_ws.ws.send(JSON.stringify({ type: "message", content: text }));
      textarea.value = "";
    }

    sendBtn.onclick = sendMessage;
    textarea.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    var inputRow = document.createElement("div");
    inputRow.style.cssText = "display:flex;gap:8px;padding:12px;align-items:flex-end;border-top:1px solid var(--theme-foreground-faint);";
    inputRow.append(textarea, viewof_voiceEnabled, sendBtn);

    var container = document.createElement("div");
    container.className = "cc-chat-view";
    container.style.cssText = "display:flex;flex-direction:column;height:100%;";
    container.append(messagesDiv, inputRow);

    function updateMessages() {
      messagesDiv.innerHTML = "";
      var msgs = cc_messages.value;
      var i = 0;
      while (i < msgs.length) {
        var msg = msgs[i];

        // Group consecutive tool messages into a collapsible block
        if (msg.role === "tool") {
          var toolGroup = [];
          while (i < msgs.length && msgs[i].role === "tool") {
            toolGroup.push(msgs[i]);
            i++;
          }
          var details = document.createElement("details");
          details.style.cssText = "max-width:90%;align-self:flex-start;font-size:12px;opacity:0.85;margin:2px 0;";
          var summary = document.createElement("summary");
          summary.style.cssText = "cursor:pointer;padding:4px 10px;border-radius:8px;" +
            "background:var(--theme-background-alt, #f0f0f0);color:var(--theme-foreground, #333);" +
            "font-family:var(--monospace, monospace);border-left:2px solid var(--theme-foreground-faint, #ccc);list-style:inside;font-size:12px;";
          summary.textContent = toolGroup.length === 1
            ? "\u{1F527} " + toolGroup[0].content
            : "\u{1F527} " + toolGroup.length + " tool calls \u2014 " + toolGroup[toolGroup.length - 1].content;
          details.appendChild(summary);
          var list = document.createElement("div");
          list.style.cssText = "padding:4px 10px 4px 20px;font-family:var(--monospace, monospace);color:var(--theme-foreground, #333);line-height:1.6;font-size:11px;";
          for (var j = 0; j < toolGroup.length; j++) {
            var line = document.createElement("div");
            line.textContent = toolGroup[j].content;
            list.appendChild(line);
          }
          details.appendChild(list);
          messagesDiv.appendChild(details);
          continue;
        }

        var bubble = document.createElement("div");
        bubble.className = "cc-msg cc-msg-" + msg.role;
        var isUser = msg.role === "user";
        bubble.style.cssText = "max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;" +
          (isUser
            ? "align-self:flex-end;background:var(--theme-foreground);color:var(--theme-background-a);border-bottom-right-radius:4px;"
            : "align-self:flex-start;background:var(--theme-background-b);color:var(--theme-foreground);border-bottom-left-radius:4px;");

        if (isUser) {
          bubble.textContent = msg.content;
        } else {
          try {
            var rendered = md([msg.content]);
            if (rendered instanceof Node) { bubble.appendChild(rendered); }
            else { bubble.textContent = msg.content; }
          } catch(e) { bubble.textContent = msg.content; }
        }
        messagesDiv.appendChild(bubble);
        i++;
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    updateMessages();
    container._updateMessages = updateMessages;
    return container;
  }

  var isConnected = (cc_status.value === "connected");

  var wrapper = document.createElement("div");
  wrapper.className = "cc-chat";
  wrapper.style.cssText = "border:1px solid var(--theme-foreground-faint);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--theme-background-a);font-family:inherit;" +
    (isConnected ? "height:400px;" : "");

  var statusBar = document.createElement("div");
  statusBar.className = "cc-status-bar";
  statusBar.style.cssText = "display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--theme-foreground-faint);font-size:12px;color:var(--theme-foreground-faint);background:var(--theme-background-b);";

  var statusDot = document.createElement("span");
  statusDot.style.cssText = "width:8px;height:8px;border-radius:50%;display:inline-block;";

  var statusText = document.createElement("span");
  statusText.className = "cc-status-text";

  statusBar.append(statusDot, statusText);

  var body = document.createElement("div");
  body.className = "cc-body";
  body.style.cssText = "flex:1;overflow:hidden;display:flex;flex-direction:column;";

  wrapper.append(statusBar, body);

  var chatView = null;

  function render() {
    var status = cc_status.value || "disconnected";
    var connected = (status === "connected");
    statusDot.style.background = statusColors[status] || "#ef4444";
    statusText.textContent = connected ? "Connected to Claude Code"
      : (status === "connecting" || status === "pairing") ? "Connecting..."
      : "Not connected";

    wrapper.style.height = connected ? "400px" : "";

    body.innerHTML = "";
    if (connected) {
      chatView = renderChat();
      body.appendChild(chatView);
    } else {
      chatView = null;
      body.appendChild(renderConnect());
    }
  }

  render();

  var lastStatus = cc_status.value;
  var lastMsgCount = cc_messages.value.length;
  var pollInterval = setInterval(function() {
    if (cc_status.value !== lastStatus) { lastStatus = cc_status.value; render(); }
    if (cc_messages.value.length !== lastMsgCount) {
      lastMsgCount = cc_messages.value.length;
      if (chatView && chatView._updateMessages) chatView._updateMessages();
    }
  }, 200);

  var originalRemove = wrapper.remove.bind(wrapper);
  wrapper.remove = function() { clearInterval(pollInterval); originalRemove(); };

  return wrapper;
})()
)};

const _cc_watch_table = function _cc_watch_table(cc_watches, Inputs){return(
  Inputs.table(cc_watches, {
    columns: ["name", "module", "value", "updated"],
    header: { name: "Variable", module: "Module", value: "Value", updated: "Updated" },
    width: { name: 120, module: 140, value: 300, updated: 80 }
  })
)};

// --- Utility cells ---

const _cc_find_module = function _cc_find_module(){return(
(function() {
  var FRAMEWORK_MODULES = new Set([
    "bootloader", "builtin",
    "@tomlarkworthy/lopepage",
    "@tomlarkworthy/claude-code-pairing",
    "@tomlarkworthy/module-selection"
  ]);

  return function findModule(runtime, moduleName) {
    var mains = runtime.mains;
    if (mains && mains instanceof Map) {
      if (moduleName) {
        return mains.get(moduleName) || null;
      }
      for (var entry of mains) {
        if (!FRAMEWORK_MODULES.has(entry[0])) return entry[1];
      }
    }
    return null;
  };
})()
)};

const _cc_serialize_value = function _cc_serialize_value(summarizeJS){return(
  function serializeValue(value, maxLen) {
    maxLen = maxLen || 500;
    try { return String(summarizeJS(value)).slice(0, maxLen); }
    catch(e) { return String(value).slice(0, maxLen); }
  }
)};

// --- Watcher cell ---

const _cc_watchers = function _cc_watchers(observe, lookupVariable, cc_serialize_value, cc_find_module, viewof_cc_watches, cc_module, invalidation){return(
(function() {
  var watchers = new Map();
  var sendFn = null;

  function setSend(fn) {
    sendFn = fn;
  }

  function watchVariable(runtime, name, moduleName) {
    var key = (moduleName || "main") + ":" + name;
    if (watchers.has(key)) return { ok: true, result: { already_watching: true, key: key } };

    var targetModule = moduleName ? cc_find_module(runtime, moduleName) : cc_module;
    if (!targetModule) return Promise.resolve({ ok: false, error: "Module not found: " + (moduleName || "default") });

    return lookupVariable(name, targetModule).then(function(targetVar) {
      if (!targetVar) return { ok: false, error: "Variable not found: " + name };

      var resolvedModule = (targetVar._module && targetVar._module._name) || "main";
      var debounceTimer = null;
      var latestValue = undefined;
      var latestError = undefined;

      function flush() {
        debounceTimer = null;
        var serialized = latestError
          ? ("Error: " + (latestError.message || String(latestError)))
          : cc_serialize_value(latestValue, 2000);
        var now = new Date().toLocaleTimeString();

        var watches = viewof_cc_watches.value.slice();
        var found = false;
        for (var i = 0; i < watches.length; i++) {
          if (watches[i].name === name && (watches[i].module === resolvedModule || watches[i].module == null)) {
            watches[i] = { name: name, module: resolvedModule, value: serialized.slice(0, 200), updated: now };
            found = true;
            break;
          }
        }
        if (!found) watches.push({ name: name, module: resolvedModule, value: serialized.slice(0, 200), updated: now });
        viewof_cc_watches.value = watches;
        viewof_cc_watches.dispatchEvent(new Event("input"));

        if (sendFn) {
          var msg = { type: "variable-update", name: name, module: resolvedModule };
          if (latestError) { msg.error = latestError.message || String(latestError); }
          else { msg.value = serialized; }
          sendFn(msg);
        }
      }

      function scheduleUpdate(value, error) {
        latestValue = value;
        latestError = error;
        if (!debounceTimer) {
          flush();
        } else {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(flush, 1000);
      }

      var cancel = observe(targetVar, {
        fulfilled: function(value) { scheduleUpdate(value, null); },
        rejected: function(error) { scheduleUpdate(null, error); }
      }, { invalidation: invalidation });

      watchers.set(key, {
        dispose: function() {
          if (debounceTimer) clearTimeout(debounceTimer);
          cancel();
          var watches = viewof_cc_watches.value.filter(function(w) {
            return !(w.name === name && w.module === resolvedModule);
          });
          viewof_cc_watches.value = watches;
          viewof_cc_watches.dispatchEvent(new Event("input"));
          watchers.delete(key);
        }
      });

      return { ok: true, result: { watching: true, key: key } };
    });
  }

  function unwatchVariable(name, moduleName) {
    var key = (moduleName || "main") + ":" + name;
    var watcher = watchers.get(key);
    if (!watcher) return { ok: false, error: "Not watching: " + key };
    watcher.dispose();
    return { ok: true, result: { unwatched: true, key: key } };
  }

  function unwatchAll() {
    var keys = Array.from(watchers.keys());
    for (var i = 0; i < keys.length; i++) {
      watchers.get(keys[i]).dispose();
    }
    return { ok: true, result: { unwatched_all: true, count: keys.length } };
  }

  return { watchVariable: watchVariable, unwatchVariable: unwatchVariable, unwatchAll: unwatchAll, setSend: setSend };
})()
)};

// --- Handler cells ---

const _cc_handle_get_variable = function _cc_handle_get_variable(lookupVariable, cc_find_module, cc_serialize_value){return(
  function handleGetVariable(cmd, runtime) {
    var name = cmd.params.name;
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "default") };
    return lookupVariable(name, targetModule).then(function(v) {
      if (!v) return { ok: false, error: "Variable not found: " + name };
      return {
        ok: true,
        result: {
          name: v._name,
          hasValue: v._value !== undefined,
          hasError: v._error !== undefined,
          value: cc_serialize_value(v._value),
          error: v._error ? v._error.message : undefined,
          reachable: v._reachable
        }
      };
    });
  }
)};

const _cc_handle_define_variable = function _cc_handle_define_variable(realize, cc_find_module, cc_watchers){return(
  function handleDefineVariable(cmd, runtime) {
    var name = cmd.params.name;
    var definition = cmd.params.definition;
    var inputs = cmd.params.inputs || [];
    var moduleName = cmd.params.module;
    var mod = cc_find_module(runtime, moduleName);
    if (!mod) return { ok: false, error: "Module not found: " + (moduleName || "default") };

    var ojs_observer = window.__ojs_observer || null;

    return realize([definition], runtime).then(function(results) {
      var fn = results[0];
      if (typeof fn !== "function") return { ok: false, error: "Definition must evaluate to a function" };

      var existingVar = mod._scope.get(name);
      if (existingVar) {
        existingVar.define(name, inputs, fn);
      } else {
        mod.variable(ojs_observer ? ojs_observer(name) : {}).define(name, inputs, fn);
      }
      cc_watchers.watchVariable(runtime, name, moduleName || null);
      return { ok: true, result: { success: true, name: name, module: moduleName || "default" } };
    }).catch(function(e) {
      return { ok: false, error: "define failed: " + e.message };
    });
  }
)};

const _cc_handle_define_cell = function _cc_handle_define_cell(compile, realize, cc_find_module, cc_watchers){return(
  function handleDefineCell(cmd, runtime) {
    var source = cmd.params.source;
    var moduleName = cmd.params.module;
    var mod = cc_find_module(runtime, moduleName);
    if (!mod) return { ok: false, error: "Module not found: " + (moduleName || "default") };

    var ojs_observer = window.__ojs_observer || null;

    try {
      var compiled = compile(source);
      if (!compiled || compiled.length === 0) return { ok: false, error: "Compilation returned no definitions" };

      var definitions = [];
      for (var ci = 0; ci < compiled.length; ci++) {
        definitions.push(compiled[ci]._definition);
      }

      return realize(definitions, runtime).then(function(fns) {
        var defined = [];
        for (var di = 0; di < compiled.length; di++) {
          var cellDef = compiled[di];
          var fn = fns[di];
          var cellName = cellDef._name;
          var cellInputs = cellDef._inputs || [];

          var existingVar = mod._scope.get(cellName);
          if (existingVar) {
            existingVar.define(cellName, cellInputs, fn);
          } else {
            mod.variable(ojs_observer ? ojs_observer(cellName) : {}).define(cellName, cellInputs, fn);
          }
          defined.push(cellName);

          if (cellName && !cellName.startsWith("module ")) {
            cc_watchers.watchVariable(runtime, cellName, moduleName || null);
          }
        }
        return { ok: true, result: { success: true, defined: defined, module: moduleName || "default" } };
      }).catch(function(e) {
        return { ok: false, error: "define-cell realize failed: " + e.message };
      });
    } catch (e) {
      return { ok: false, error: "define-cell compile failed: " + e.message };
    }
  }
)};

const _cc_handle_delete_variable = function _cc_handle_delete_variable(lookupVariable, cc_find_module){return(
  function handleDeleteVariable(cmd, runtime) {
    var name = cmd.params.name;
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "main") };
    return lookupVariable(name, targetModule).then(function(v) {
      if (!v) return { ok: false, error: "Variable not found: " + name + " in module " + (moduleName || "main") };
      v.delete();
      return { ok: true, result: { success: true, name: name, module: targetModule._name || "main" } };
    });
  }
)};

const _cc_handle_list_variables = function _cc_handle_list_variables(cc_find_module){return(
  function handleListVariables(cmd, runtime) {
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "default") };
    var variables = [];
    for (var entry of targetModule._scope) {
      var v = entry[1];
      variables.push({
        name: entry[0],
        module: (v._module && v._module._name) || "main",
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        reachable: v._reachable
      });
    }
    variables.sort(function(a, b) { return a.name.localeCompare(b.name); });
    return { ok: true, result: variables };
  }
)};

const _cc_handle_list_cells = function _cc_handle_list_cells(cc_find_module){return(
  function handleListCells(cmd, runtime) {
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "default") };
    var cells = [];
    for (var entry of targetModule._scope) {
      var v = entry[1];
      var defStr = "";
      try { defStr = String(v._definition).slice(0, 300); } catch(e) {}
      cells.push({
        name: entry[0],
        inputs: (v._inputs || []).map(function(inp) { return inp._name || "?"; }),
        definition: defStr,
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        error: v._error ? (v._error.message || String(v._error)) : undefined
      });
    }
    cells.sort(function(a, b) { return a.name.localeCompare(b.name); });
    return { ok: true, result: cells };
  }
)};

const _cc_handle_run_tests = function _cc_handle_run_tests(cc_find_module){return(
  function handleRunTests(cmd, runtime) {
    var filter = cmd.params.filter;
    var timeout = cmd.params.timeout || 30000;

    return new Promise(function(outerResolve) {
      // Find actual runtime with _computeNow
      var actualRuntime = null;
      for (var v of runtime._variables) {
        if (v._module && v._module._runtime && v._module._runtime._computeNow) {
          actualRuntime = v._module._runtime;
          break;
        }
      }
      if (!actualRuntime) { outerResolve({ ok: false, error: "Could not find actual runtime" }); return; }

      var moduleNames = new Map();
      for (var v2 of runtime._variables) {
        if (v2._module && !moduleNames.has(v2._module)) {
          var modName = v2._module._name || (v2._name && v2._name.startsWith("module ") ? v2._name : null);
          if (modName) moduleNames.set(v2._module, modName);
        }
      }

      var testVars = [];
      for (var variable of runtime._variables) {
        var name = variable._name;
        if (typeof name === "string" && name.startsWith("test_")) {
          if (filter) {
            var moduleName = moduleNames.get(variable._module) || "";
            if (!name.includes(filter) && !moduleName.includes(filter)) continue;
          }
          testVars.push(variable);
        }
      }

      if (testVars.length === 0) { outerResolve({ ok: false, error: "No test variables found" }); return; }

      var results = new Map();
      var pendingPromises = [];

      for (var vi = 0; vi < testVars.length; vi++) {
        (function(v3) {
          var tName = v3._name;
          var tModuleName = moduleNames.get(v3._module) || "main";
          var fullName = tModuleName + "#" + tName;

          var p = new Promise(function(resolve) {
            var timeoutId = setTimeout(function() {
              results.set(fullName, { state: "timeout", name: tName, module: tModuleName });
              resolve();
            }, timeout);

            if (v3._value !== undefined) {
              clearTimeout(timeoutId);
              results.set(fullName, { state: "passed", name: tName, module: tModuleName, value: String(v3._value).slice(0, 200) });
              resolve(); return;
            }
            if (v3._error !== undefined) {
              clearTimeout(timeoutId);
              results.set(fullName, { state: "failed", name: tName, module: tModuleName, error: (v3._error && v3._error.message) || String(v3._error) });
              resolve(); return;
            }

            if (!v3._reachable) { v3._reachable = true; actualRuntime._dirty.add(v3); }

            var oldObserver = v3._observer;
            v3._observer = {
              fulfilled: function(value) {
                clearTimeout(timeoutId);
                results.set(fullName, { state: "passed", name: tName, module: tModuleName, value: value === undefined ? "undefined" : String(value).slice(0, 200) });
                resolve();
                if (oldObserver && oldObserver.fulfilled) oldObserver.fulfilled(value);
              },
              rejected: function(error) {
                clearTimeout(timeoutId);
                results.set(fullName, { state: "failed", name: tName, module: tModuleName, error: (error && error.message) || String(error) });
                resolve();
                if (oldObserver && oldObserver.rejected) oldObserver.rejected(error);
              },
              pending: function() { if (oldObserver && oldObserver.pending) oldObserver.pending(); }
            };
          });
          pendingPromises.push(p);
        })(testVars[vi]);
      }

      actualRuntime._computeNow();

      Promise.race([
        Promise.all(pendingPromises),
        new Promise(function(r) { setTimeout(r, timeout + 5000); })
      ]).then(function() {
        var tests = Array.from(results.values());
        var passed = tests.filter(function(t) { return t.state === "passed"; }).length;
        var failed = tests.filter(function(t) { return t.state === "failed"; }).length;
        var timeoutCount = tests.filter(function(t) { return t.state === "timeout"; }).length;
        outerResolve({ ok: true, result: { tests: tests, summary: { total: tests.length, passed: passed, failed: failed, timeout: timeoutCount } } });
      });
    });
  }
)};

const _cc_handle_create_module = function _cc_handle_create_module(createModule){return(
  function handleCreateModule(cmd, runtime) {
    var moduleName = cmd.params.name;
    if (!moduleName) return { ok: false, error: "Module name is required" };
    try {
      createModule(moduleName, runtime);
      return { ok: true, result: { success: true, name: moduleName } };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
)};

const _cc_handle_delete_module = function _cc_handle_delete_module(deleteModule){return(
  function handleDeleteModule(cmd, runtime) {
    var moduleName = cmd.params.name;
    if (!moduleName) return { ok: false, error: "Module name is required" };
    try {
      deleteModule(moduleName, runtime);
      return { ok: true, result: { success: true, name: moduleName } };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
)};

const _cc_handle_eval = function _cc_handle_eval(cc_serialize_value){return(
  function handleEval(cmd, runtime) {
    var code = cmd.params.code;
    try {
      var result = eval(code);
      return { ok: true, result: cc_serialize_value(result) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
)};

const _cc_handle_fork = function _cc_handle_fork(exportToHTML, runtime){return(
  function handleFork(cmd, runtimeArg) {
    if (typeof exportToHTML !== "function") {
      return { ok: false, error: "exportToHTML not available. Does this notebook include @tomlarkworthy/exporter-2?" };
    }
    return Promise.resolve(exportToHTML({ mains: runtime.mains })).then(function(result) {
      var html = typeof result === "string" ? result : result.source;
      if (!html || typeof html !== "string") {
        return { ok: false, error: "Export returned no HTML source" };
      }
      return { ok: true, result: { html: html } };
    }).catch(function(e) {
      return { ok: false, error: "Export failed: " + e.message };
    });
  }
)};

const _cc_handle_watch = function _cc_handle_watch(cc_watchers){return(
  function handleWatch(cmd, runtime) {
    return cc_watchers.watchVariable(runtime, cmd.params.name, cmd.params.module);
  }
)};

const _cc_handle_unwatch = function _cc_handle_unwatch(cc_watchers){return(
  function handleUnwatch(cmd, runtime) {
    return cc_watchers.unwatchVariable(cmd.params.name, cmd.params.module);
  }
)};

// --- Dispatch cell ---

const _cc_command_handlers = function _cc_command_handlers(cc_handle_get_variable, cc_handle_define_variable, cc_handle_define_cell, cc_handle_delete_variable, cc_handle_list_variables, cc_handle_list_cells, cc_handle_run_tests, cc_handle_create_module, cc_handle_delete_module, cc_handle_eval, cc_handle_fork, cc_handle_watch, cc_handle_unwatch){return(
  function handleCommand(cmd) {
    var runtime = window.__ojs_runtime;
    if (!runtime) return { ok: false, error: "Runtime not found" };

    var handlers = {
      "get-variable": cc_handle_get_variable,
      "define-variable": cc_handle_define_variable,
      "define-cell": cc_handle_define_cell,
      "delete-variable": cc_handle_delete_variable,
      "list-variables": cc_handle_list_variables,
      "list-cells": cc_handle_list_cells,
      "run-tests": cc_handle_run_tests,
      "create-module": cc_handle_create_module,
      "delete-module": cc_handle_delete_module,
      "eval": cc_handle_eval,
      "fork": cc_handle_fork,
      "watch": cc_handle_watch,
      "unwatch": cc_handle_unwatch,
      "unwatch-all": function() { return cc_handle_unwatch.__watchers_ref ? cc_handle_unwatch.__watchers_ref.unwatchAll() : { ok: false, error: "unwatchAll not available" }; }
    };

    var handler = handlers[cmd.action];
    if (!handler) return { ok: false, error: "Unknown action: " + cmd.action };
    return handler(cmd, runtime);
  }
)};

// --- Connection cell ---

const _cc_ws = function _cc_ws(cc_config, cc_notebook_id, cc_status, cc_messages, cc_command_handlers, cc_watchers, viewof_cc_watches, cc_module, runtime, invalidation){return(
(function() {
  var port = cc_config.port, host = cc_config.host;
  var ws = null;
  var paired = false;

  function connect(token) {
    if (ws) { ws.close(); ws = null; }

    if (token) {
      try { sessionStorage.setItem("lopecode_cc_token", token); } catch(e) {}
    }

    var connectPort = port;
    if (token) {
      var parts = token.match(/^LOPE-(\d+)-[A-Z0-9]+$/);
      if (parts) connectPort = parseInt(parts[1], 10);
    }

    cc_status.value = "connecting";
    cc_status.dispatchEvent(new Event("input"));

    ws = new WebSocket("ws://" + host + ":" + connectPort + "/ws");

    ws.onopen = function() {
      if (token) {
        cc_status.value = "pairing";
        cc_status.dispatchEvent(new Event("input"));
        ws.send(JSON.stringify({
          type: "pair",
          token: token,
          url: cc_notebook_id,
          title: document.title || "Untitled"
        }));
      }
    };

    ws.onmessage = function(event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch(e) { return; }

      switch (msg.type) {
        case "paired":
          paired = true;
          cc_status.value = "connected";
          cc_status.dispatchEvent(new Event("input"));

          // Provide send callback to watchers
          cc_watchers.setSend(function(m) {
            if (paired && ws) ws.send(JSON.stringify(m));
          });

          var modules = [];
          var rt = window.__ojs_runtime;
          if (rt) {
            var seen = new Set();
            for (var v of rt._variables) {
              var name = v._module && v._module._name;
              if (name && !seen.has(name)) { seen.add(name); modules.push(name); }
            }
          }
          ws.send(JSON.stringify({
            type: "notebook-info",
            url: cc_notebook_id,
            title: document.title,
            modules: modules,
            hash: location.hash
          }));

          // Set up watches from cc_watches
          var rt2 = window.__ojs_runtime;
          if (rt2) {
            var initialWatches = viewof_cc_watches.value || [];
            for (var i = 0; i < initialWatches.length; i++) {
              cc_watchers.watchVariable(rt2, initialWatches[i].name, initialWatches[i].module);
            }
          }
          break;

        case "pair-failed":
          paired = false;
          cc_status.value = "disconnected";
          cc_status.dispatchEvent(new Event("input"));
          break;

        case "reply":
          var msgs = cc_messages.value.concat([{
            role: "assistant",
            content: msg.markdown,
            timestamp: Date.now()
          }]);
          cc_messages.value = msgs;
          cc_messages.dispatchEvent(new Event("input"));
          break;

        case "tool-activity":
          var msgs2 = cc_messages.value.concat([{
            role: "tool",
            tool_name: msg.tool_name,
            content: msg.summary,
            timestamp: msg.timestamp || Date.now()
          }]);
          cc_messages.value = msgs2;
          cc_messages.dispatchEvent(new Event("input"));
          break;

        case "command":
          Promise.resolve(cc_command_handlers(msg)).then(function(result) {
            ws.send(JSON.stringify({
              type: "command-result",
              id: msg.id,
              ok: result.ok,
              result: result.result,
              error: result.error
            }));
          }).catch(function(e) {
            ws.send(JSON.stringify({
              type: "command-result",
              id: msg.id,
              ok: false,
              error: e.message
            }));
          });
          break;
      }
    };

    ws.onclose = function() {
      paired = false;
      cc_watchers.setSend(null);
      cc_status.value = "disconnected";
      cc_status.dispatchEvent(new Event("input"));
      ws = null;
    };

    ws.onerror = function() {};
  }

  // Auto-connect: check hash param first, then sessionStorage fallback
  (function autoConnect() {
    var token = null;

    var hash = location.hash || "";
    var match = hash.match(/[&?]cc=(LOPE-[A-Z0-9-]+)/);
    if (match) {
      token = match[1];
    }

    if (!token) {
      try { token = sessionStorage.getItem("lopecode_cc_token"); } catch(e) {}
    }

    if (token) {
      setTimeout(function() { connect(token); }, 500);
    }
  })();

  invalidation.then(function() {
    cc_watchers.setSend(null);
    if (ws) { ws.close(); ws = null; }
  });

  return { connect: connect, get paired() { return paired; }, get ws() { return ws; } };
})()
)};

// --- Other cells ---

const _cc_change_forwarder = function _cc_change_forwarder(cc_ws, history, invalidation){return(
(function() {
  var highWaterMark = 0;
  var initializing = true;

  var interval = setInterval(function() {
    if (!cc_ws.paired || !cc_ws.ws) return;
    if (!history || !Array.isArray(history)) return;

    var total = history.length;

    if (initializing) { highWaterMark = total; initializing = false; return; }
    if (total <= highWaterMark) return;

    var newEntries = history.slice(highWaterMark).map(function(e) {
      return {
        t: e.t, op: e.op, module: e.module, _name: e._name,
        _inputs: e._inputs,
        _definition: typeof e._definition === "function"
          ? e._definition.toString().slice(0, 500)
          : String(e._definition || "").slice(0, 500)
      };
    });
    highWaterMark = total;
    cc_ws.ws.send(JSON.stringify({ type: "cell-change", changes: newEntries }));
  }, 1000);

  invalidation.then(function() { clearInterval(interval); });
  return "change forwarder active";
})()
)};

const _3tvbri = (G, v) => G.input(v);

const _cc_voice = function _cc_voice(voiceEnabled, invalidation){return(
(function() {
  if (!voiceEnabled) return "voice: disabled";

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var synth = window.speechSynthesis;
  var active = true;
  var muteUntil = 0;
  var lastUnmuteTime = 0;
  var lastSpokenCount = 0;

  function isMuted() {
    return Date.now() < muteUntil;
  }
  function getTextarea() {
    var chatEl = document.querySelector('.cc-chat');
    return chatEl ? chatEl.querySelector('.cc-input') : null;
  }
  function getMessagesDiv() {
    var chatEl = document.querySelector('.cc-chat');
    return chatEl ? chatEl.querySelector('.cc-messages') : null;
  }
  function startRecognition() {
    if (!SR || recognition) return;
    var rec = new SR();
    recognition = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = function(e) {
      var textarea = getTextarea();
      if (!textarea || isMuted()) {
        if (textarea) textarea.value = '';
        return;
      }
      var transcript = '';
      var isFinal = false;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
        if (e.results[i].isFinal) isFinal = true;
      }
      if (isFinal && Date.now() - lastUnmuteTime < 2000) {
        textarea.value = '';
        return;
      }
      textarea.value = transcript;
      if (isFinal && transcript.trim()) {
        textarea.value = '\uD83C\uDFA4 ' + transcript.trim();
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        textarea.value = '';
      }
    };
    rec.onend = function() {
      if (rec !== recognition) return;
      recognition = null;
      if (active) setTimeout(function() { if (active) startRecognition(); }, 100);
    };
    rec.onerror = function(e) {
      if (e.error === 'not-allowed') {
        active = false;
      }
    };
    try { rec.start(); } catch(e) { recognition = null; }
  }
  function speakText(text) {
    muteUntil = Date.now() + 600000;
    var textarea = getTextarea();
    if (textarea) textarea.value = '';
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.1;
    utter.onend = function() {
      muteUntil = Date.now() + 2000;
      lastUnmuteTime = Date.now() + 2000;
      var textarea = getTextarea();
      if (textarea) textarea.value = '';
    };
    utter.onerror = function() {
      muteUntil = Date.now() + 2000;
      lastUnmuteTime = Date.now() + 2000;
    };
    synth.speak(utter);
  }
  function stopAll() {
    active = false;
    if (recognition) {
      try { recognition.abort(); } catch(e) {}
      recognition = null;
    }
    synth.cancel();
  }

  // Initialize: count existing messages so we don't speak old ones
  var messagesDiv = getMessagesDiv();
  lastSpokenCount = messagesDiv ? messagesDiv.querySelectorAll('.cc-msg-assistant').length : 0;
  startRecognition();

  var pollId = setInterval(function() {
    if (!active) return;
    var messagesDiv = getMessagesDiv();
    if (!messagesDiv) return;
    var bubbles = messagesDiv.querySelectorAll('.cc-msg-assistant');
    if (bubbles.length > lastSpokenCount) {
      for (var i = lastSpokenCount; i < bubbles.length; i++) {
        speakText(bubbles[i].textContent.replace(/\n{2,}/g, '. '));
      }
      lastSpokenCount = bubbles.length;
    }
  }, 500);

  invalidation.then(function() {
    stopAll();
    clearInterval(pollId);
  });

  return "voice active";
})()
)};

// --- Module definition ---

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/claude-code-pairing";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  // Visual cells first (controls render order in lopepage)
  $def("_cc_chat", "cc_chat", ["cc_messages","cc_status","cc_ws","md","htl","Inputs","viewof voiceEnabled"], _cc_chat);
  $def("_cc_watch_table", "cc_watch_table", ["cc_watches","Inputs"], _cc_watch_table);

  // Internal state cells (no observer — hidden)
  main.variable().define("cc_config", [], _cc_config);
  main.variable().define("cc_notebook_id", [], _cc_notebook_id);
  main.variable().define("cc_status", ["Inputs"], _cc_status);
  main.variable().define("cc_messages", ["Inputs"], _cc_messages);
  $def("_cc_watches", "viewof cc_watches", ["Inputs"], _cc_watches);
  main.variable().define("cc_watches", ["Generators", "viewof cc_watches"], (G, _) => G.input(_));
  $def("_cc_module", "viewof cc_module", ["thisModule"], _cc_module);
  main.variable().define("cc_module", ["Generators", "viewof cc_module"], (G, _) => G.input(_));

  // Voice toggle (viewof is visual, value is hidden)
  $def("_voiceEnabled", "viewof voiceEnabled", [], _voiceEnabled);
  main.variable().define("voiceEnabled", ["Generators", "viewof voiceEnabled"], (G, _) => G.input(_));

  // Utility cells (hidden)
  main.variable().define("cc_find_module", [], _cc_find_module);
  main.variable().define("cc_serialize_value", ["summarizeJS"], _cc_serialize_value);

  // Watcher cell (hidden)
  main.variable().define("cc_watchers", ["observe","lookupVariable","cc_serialize_value","cc_find_module","viewof cc_watches","cc_module","invalidation"], _cc_watchers);

  // Handler cells (all hidden)
  main.variable().define("cc_handle_get_variable", ["lookupVariable","cc_find_module","cc_serialize_value"], _cc_handle_get_variable);
  main.variable().define("cc_handle_define_variable", ["realize","cc_find_module","cc_watchers"], _cc_handle_define_variable);
  main.variable().define("cc_handle_define_cell", ["compile","realize","cc_find_module","cc_watchers"], _cc_handle_define_cell);
  main.variable().define("cc_handle_delete_variable", ["lookupVariable","cc_find_module"], _cc_handle_delete_variable);
  main.variable().define("cc_handle_list_variables", ["cc_find_module"], _cc_handle_list_variables);
  main.variable().define("cc_handle_list_cells", ["cc_find_module"], _cc_handle_list_cells);
  main.variable().define("cc_handle_run_tests", ["cc_find_module"], _cc_handle_run_tests);
  main.variable().define("cc_handle_create_module", ["createModule"], _cc_handle_create_module);
  main.variable().define("cc_handle_delete_module", ["deleteModule"], _cc_handle_delete_module);
  main.variable().define("cc_handle_eval", ["cc_serialize_value"], _cc_handle_eval);
  main.variable().define("cc_handle_fork", ["exportToHTML","runtime"], _cc_handle_fork);
  main.variable().define("cc_handle_watch", ["cc_watchers"], _cc_handle_watch);
  main.variable().define("cc_handle_unwatch", ["cc_watchers"], _cc_handle_unwatch);

  // Dispatch cell (hidden)
  main.variable().define("cc_command_handlers", ["cc_handle_get_variable","cc_handle_define_variable","cc_handle_define_cell","cc_handle_delete_variable","cc_handle_list_variables","cc_handle_list_cells","cc_handle_run_tests","cc_handle_create_module","cc_handle_delete_module","cc_handle_eval","cc_handle_fork","cc_handle_watch","cc_handle_unwatch"], _cc_command_handlers);

  // Connection cell (hidden)
  main.variable().define("cc_ws", ["cc_config","cc_notebook_id","cc_status","cc_messages","cc_command_handlers","cc_watchers","viewof cc_watches","cc_module","runtime","invalidation"], _cc_ws);

  // Other cells (hidden)
  main.variable().define("cc_change_forwarder", ["cc_ws","history","invalidation"], _cc_change_forwarder);
  main.variable().define("cc_voice", ["voiceEnabled","invalidation"], _cc_voice);

  // Imports
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exportToHTML", _));
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));
  main.define("viewof history", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("viewof history", _));
  $def("_3tvbri", "history", ["Generators","viewof history"], _3tvbri);
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("viewof runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("viewof runtime_variables", _));
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));
  main.define("module @tomlarkworthy/summarizejs", async () => runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));

  return main;
}
