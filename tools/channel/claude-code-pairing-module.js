/**
 * @tomlarkworthy/claude-code-pairing — Observable module
 *
 * Two-way communication channel between Lopecode notebooks and Claude Code.
 * Paste this into a <script type="text/plain" id="@tomlarkworthy/claude-code-pairing">
 * in any lopecode notebook HTML, and add "@tomlarkworthy/claude-code-pairing" to bootconf.json mains.
 */

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

const _cc_ws = function _cc_ws(cc_config, cc_notebook_id, cc_status, cc_messages, viewof_cc_watches, summarizeJS, observe, realize, createModule, deleteModule, lookupVariable, cc_module, runtime, invalidation){return(
(function() {
  var port = cc_config.port, host = cc_config.host;
  var ws = null;
  var paired = false;
  // Cache the observer factory (used by lopepage to render cells)
  var ojs_observer = window.__ojs_observer || null;

  function serializeValue(value, maxLen) {
    maxLen = maxLen || 500;
    try { return String(summarizeJS(value)).slice(0, maxLen); }
    catch(e) { return String(value).slice(0, maxLen); }
  }

  // Framework modules that should not be the default target for define_variable
  var FRAMEWORK_MODULES = new Set([
    "bootloader", "builtin",
    "@tomlarkworthy/lopepage",
    "@tomlarkworthy/claude-code-pairing",
    "@tomlarkworthy/module-selection"
  ]);

  function findModule(runtime, moduleName) {
    // Use runtime.mains (Map<name, Module>) — the actual module refs used by the runtime
    var mains = runtime.mains;
    if (mains && mains instanceof Map) {
      if (moduleName) {
        return mains.get(moduleName) || null;
      }
      // No name specified — return the first non-framework main
      for (var entry of mains) {
        if (!FRAMEWORK_MODULES.has(entry[0])) return entry[1];
      }
    }
    return null;
  }

  function findActualRuntime(runtime) {
    for (var v of runtime._variables) {
      if (v._module && v._module._runtime && v._module._runtime._computeNow)
        return v._module._runtime;
    }
    return null;
  }

  function handleCommand(cmd) {
    var runtime = window.__ojs_runtime;
    if (!runtime) return { ok: false, error: "Runtime not found" };

    switch (cmd.action) {
      case "get-variable": {
        var name = cmd.params.name;
        var moduleName = cmd.params.module;
        var targetModule = findModule(runtime, moduleName);
        if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "default") };
        return lookupVariable(name, targetModule).then(function(v) {
          if (!v) return { ok: false, error: "Variable not found: " + name };
          return {
            ok: true,
            result: {
              name: v._name,
              hasValue: v._value !== undefined,
              hasError: v._error !== undefined,
              value: serializeValue(v._value),
              error: v._error ? v._error.message : undefined,
              reachable: v._reachable
            }
          };
        });
      }

      case "define-variable": {
        var name = cmd.params.name;
        var definition = cmd.params.definition;
        var inputs = cmd.params.inputs || [];
        var moduleName = cmd.params.module;
        var mod = findModule(runtime, moduleName);
        if (!mod) return { ok: false, error: "Module not found: " + (moduleName || "default") };

        return realize([definition], runtime).then(function(results) {
          var fn = results[0];
          if (typeof fn !== "function") return { ok: false, error: "Definition must evaluate to a function" };

          // Use module._scope to check for existing variable
          var existingVar = mod._scope.get(name);
          if (existingVar) {
            existingVar.define(name, inputs, fn);
          } else {
            mod.variable(ojs_observer ? ojs_observer(name) : {}).define(name, inputs, fn);
          }
          // Auto-watch the defined variable so the result arrives reactively
          watchVariable(runtime, name, moduleName || null);
          return { ok: true, result: { success: true, name: name, module: moduleName || "default" } };
        }).catch(function(e) {
          return { ok: false, error: "define failed: " + e.message };
        });
      }

      case "delete-variable": {
        var name = cmd.params.name;
        var moduleName = cmd.params.module;
        var targetModule = findModule(runtime, moduleName);
        if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "main") };
        return lookupVariable(name, targetModule).then(function(v) {
          if (!v) return { ok: false, error: "Variable not found: " + name + " in module " + (moduleName || "main") };
          v.delete();
          return { ok: true, result: { success: true, name: name, module: targetModule._name || "main" } };
        });
      }

      case "list-variables": {
        var moduleName = cmd.params.module;
        var targetModule = findModule(runtime, moduleName);
        if (!targetModule) return { ok: false, error: "Module not found: " + (moduleName || "default") };
        // Use module._scope instead of scanning runtime._variables
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

      case "run-tests": {
        var filter = cmd.params.filter;
        var timeout = cmd.params.timeout || 30000;
        return runTests(runtime, filter, timeout);
      }

      case "create-module": {
        var moduleName = cmd.params.name;
        if (!moduleName) return { ok: false, error: "Module name is required" };
        try {
          createModule(moduleName, runtime);
          return { ok: true, result: { success: true, name: moduleName } };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case "delete-module": {
        var moduleName = cmd.params.name;
        if (!moduleName) return { ok: false, error: "Module name is required" };
        try {
          deleteModule(moduleName, runtime);
          return { ok: true, result: { success: true, name: moduleName } };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case "eval": {
        var code = cmd.params.code;
        try {
          var result = eval(code);
          return { ok: true, result: serializeValue(result) };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case "fork": {
        return handleFork(runtime);
      }

      case "watch": {
        return watchVariable(runtime, cmd.params.name, cmd.params.module);
      }

      case "unwatch": {
        return unwatchVariable(cmd.params.name, cmd.params.module);
      }

      case "unwatch-all": {
        return unwatchAll();
      }

      default:
        return { ok: false, error: "Unknown action: " + cmd.action };
    }
  }

  function runTests(runtime, filterStr, testTimeout) {
    return new Promise(function(outerResolve) {
      var actualRuntime = findActualRuntime(runtime);
      if (!actualRuntime) { outerResolve({ ok: false, error: "Could not find actual runtime" }); return; }

      var moduleNames = new Map();
      for (var v of runtime._variables) {
        if (v._module && !moduleNames.has(v._module)) {
          var modName = v._module._name || (v._name && v._name.startsWith("module ") ? v._name : null);
          if (modName) moduleNames.set(v._module, modName);
        }
      }

      var testVars = [];
      for (var variable of runtime._variables) {
        var name = variable._name;
        if (typeof name === "string" && name.startsWith("test_")) {
          if (filterStr) {
            var moduleName = moduleNames.get(variable._module) || "";
            if (!name.includes(filterStr) && !moduleName.includes(filterStr)) continue;
          }
          testVars.push(variable);
        }
      }

      if (testVars.length === 0) { outerResolve({ ok: false, error: "No test variables found" }); return; }

      var results = new Map();
      var pendingPromises = [];

      for (var vi = 0; vi < testVars.length; vi++) {
        (function(v) {
          var name = v._name;
          var moduleName = moduleNames.get(v._module) || "main";
          var fullName = moduleName + "#" + name;

          var p = new Promise(function(resolve) {
            var timeoutId = setTimeout(function() {
              results.set(fullName, { state: "timeout", name: name, module: moduleName });
              resolve();
            }, testTimeout);

            if (v._value !== undefined) {
              clearTimeout(timeoutId);
              results.set(fullName, { state: "passed", name: name, module: moduleName, value: String(v._value).slice(0, 200) });
              resolve(); return;
            }
            if (v._error !== undefined) {
              clearTimeout(timeoutId);
              results.set(fullName, { state: "failed", name: name, module: moduleName, error: (v._error && v._error.message) || String(v._error) });
              resolve(); return;
            }

            if (!v._reachable) { v._reachable = true; actualRuntime._dirty.add(v); }

            var oldObserver = v._observer;
            v._observer = {
              fulfilled: function(value) {
                clearTimeout(timeoutId);
                results.set(fullName, { state: "passed", name: name, module: moduleName, value: value === undefined ? "undefined" : String(value).slice(0, 200) });
                resolve();
                if (oldObserver && oldObserver.fulfilled) oldObserver.fulfilled(value);
              },
              rejected: function(error) {
                clearTimeout(timeoutId);
                results.set(fullName, { state: "failed", name: name, module: moduleName, error: (error && error.message) || String(error) });
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
        new Promise(function(r) { setTimeout(r, testTimeout + 5000); })
      ]).then(function() {
        var tests = Array.from(results.values());
        var passed = tests.filter(function(t) { return t.state === "passed"; }).length;
        var failed = tests.filter(function(t) { return t.state === "failed"; }).length;
        var timeoutCount = tests.filter(function(t) { return t.state === "timeout"; }).length;
        outerResolve({ ok: true, result: { tests: tests, summary: { total: tests.length, passed: passed, failed: failed, timeout: timeoutCount } } });
      });
    });
  }

  // --- Variable watching ---
  var watchers = new Map(); // key: "module:name" -> { dispose: function }

  function watchVariable(runtime, name, moduleName) {
    var key = (moduleName || "main") + ":" + name;
    if (watchers.has(key)) return { ok: true, result: { already_watching: true, key: key } };

    // Use findModule for named modules, cc_module (thisModule) for unqualified lookups
    var targetModule = moduleName ? findModule(runtime, moduleName) : cc_module;
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
        : serializeValue(latestValue, 2000);
      var now = new Date().toLocaleTimeString();

      // Update cc_watches table
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

      // Send over WebSocket if connected
      if (!paired || !ws) return;
      var msg = { type: "variable-update", name: name, module: resolvedModule };
      if (latestError) { msg.error = latestError.message || String(latestError); }
      else { msg.value = serialized; }
      ws.send(JSON.stringify(msg));
    }

    function scheduleUpdate(value, error) {
      latestValue = value;
      latestError = error;
      if (!debounceTimer) {
        // First update fires immediately
        flush();
      } else {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(flush, 1000);
    }

    // Use runtime-sdk observe() for clean subscription
    var cancel = observe(targetVar, {
      fulfilled: function(value) { scheduleUpdate(value, null); },
      rejected: function(error) { scheduleUpdate(null, error); }
    }, { invalidation: invalidation });

    watchers.set(key, {
      dispose: function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        cancel();
        // Remove from watches table
        var watches = viewof_cc_watches.value.filter(function(w) {
          return !(w.name === name && w.module === resolvedModule);
        });
        viewof_cc_watches.value = watches;
        viewof_cc_watches.dispatchEvent(new Event("input"));
        watchers.delete(key);
      }
    });

    return { ok: true, result: { watching: true, key: key } };
    }); // close lookupVariable.then
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

  function handleFork(runtime) {
    return new Promise(function(resolve) {
      for (var v of runtime._variables) {
        if ((v._name === "_exportToHTML" || v._name === "exportToHTML") && typeof v._value === "function") {
          try {
            Promise.resolve(v._value()).then(function(html) {
              resolve({ ok: true, result: { html: html } });
            }).catch(function(e) {
              resolve({ ok: false, error: "Export failed: " + e.message });
            });
            return;
          } catch (e) {
            resolve({ ok: false, error: "Export failed: " + e.message });
            return;
          }
        }
      }
      resolve({ ok: false, error: "_exportToHTML not found. Does this notebook include @tomlarkworthy/exporter-2?" });
    });
  }

  function connect(token) {
    if (ws) { ws.close(); ws = null; }

    // Persist token for reconnection across reloads
    if (token) {
      try { sessionStorage.setItem("lopecode_cc_token", token); } catch(e) {}
    }

    // Parse port from token format LOPE-PORT-XXXX
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
          var modules = [];
          var runtime = window.__ojs_runtime;
          if (runtime) {
            var seen = new Set();
            for (var v of runtime._variables) {
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

          // Set up watches from cc_watches (initialized with defaults via dependency resolution)
          var runtime2 = window.__ojs_runtime;
          if (runtime2) {
            var initialWatches = viewof_cc_watches.value || [];
            for (var i = 0; i < initialWatches.length; i++) {
              watchVariable(runtime2, initialWatches[i].name, initialWatches[i].module);
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

        case "command":
          Promise.resolve(handleCommand(msg)).then(function(result) {
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
      cc_status.value = "disconnected";
      cc_status.dispatchEvent(new Event("input"));
      ws = null;
    };

    ws.onerror = function() {};
  }

  // Auto-connect: check hash param first, then sessionStorage fallback
  (function autoConnect() {
    var token = null;

    // 1. Check &cc=TOKEN in hash
    var hash = location.hash || "";
    var match = hash.match(/[&?]cc=(LOPE-[A-Z0-9-]+)/);
    if (match) {
      token = match[1];
    }

    // 2. Fallback to sessionStorage (survives reloads even if hash is mangled)
    if (!token) {
      try { token = sessionStorage.getItem("lopecode_cc_token"); } catch(e) {}
    }

    if (token) {
      // Small delay to let the WebSocket server be ready
      setTimeout(function() { connect(token); }, 500);
    }
  })();

  invalidation.then(function() {
    if (ws) { ws.close(); ws = null; }
  });

  return { connect: connect, get paired() { return paired; }, get ws() { return ws; } };
})()
)};

const _cc_watch_table = function _cc_watch_table(cc_watches, Inputs){return(
  Inputs.table(cc_watches, {
    columns: ["name", "module", "value", "updated"],
    header: { name: "Variable", module: "Module", value: "Value", updated: "Updated" },
    width: { name: 120, module: 140, value: 300, updated: 80 }
  })
)};

const _cc_change_forwarder = function _cc_change_forwarder(cc_ws, invalidation){return(
(function() {
  var highWaterMark = 0;
  var initializing = true;

  var interval = setInterval(function() {
    if (!cc_ws.paired || !cc_ws.ws) return;
    var runtime = window.__ojs_runtime;
    if (!runtime) return;

    for (var v of runtime._variables) {
      if (v._name === "history" && v._value && Array.isArray(v._value)) {
        var history = v._value;
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
        break;
      }
    }
  }, 1000);

  invalidation.then(function() { clearInterval(interval); });
  return "change forwarder active";
})()
)};

const _cc_chat = function _cc_chat(cc_messages, cc_status, cc_ws, md, htl, Inputs){return(
(function() {
  var statusColors = {
    connected: "#22c55e",
    connecting: "#f59e0b",
    pairing: "#f59e0b",
    disconnected: "#ef4444"
  };

  function renderSetup() {
    var tokenInput = document.createElement("input");
    tokenInput.type = "text";
    tokenInput.placeholder = "LOPE-XXXX";
    tokenInput.style.cssText = "font-family:monospace;font-size:16px;padding:8px 12px;border:2px solid #d1d5db;border-radius:6px;width:140px;text-transform:uppercase;letter-spacing:2px;";

    var connectBtn = document.createElement("button");
    connectBtn.textContent = "Connect";
    connectBtn.style.cssText = "padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;";
    connectBtn.onclick = function() {
      var token = tokenInput.value.trim();
      if (token) cc_ws.connect(token);
    };

    tokenInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") connectBtn.click();
    });

    var container = document.createElement("div");
    container.className = "cc-setup";
    container.innerHTML = '<div style="padding:24px;max-width:400px;margin:0 auto;text-align:center;">' +
      '<div style="font-size:24px;margin-bottom:8px;">Claude Channel</div>' +
      '<p style="color:#6b7280;margin-bottom:20px;font-size:14px;">Connect to Claude Code to chat with Claude from this notebook.</p>' +
      '<div style="text-align:left;background:#f3f4f6;padding:16px;border-radius:8px;margin-bottom:20px;font-size:13px;">' +
      '<div style="font-weight:600;margin-bottom:8px;">Setup:</div>' +
      '<ol style="margin:0;padding-left:20px;line-height:1.8;">' +
      '<li>Install <a href="https://bun.sh" target="_blank">Bun</a> if needed, then:<br>' +
      '<code style="background:#e5e7eb;padding:2px 6px;border-radius:3px;font-size:12px;">bun install -g @lopecode/channel</code><br>' +
      '<code style="background:#e5e7eb;padding:2px 6px;border-radius:3px;font-size:12px;">claude mcp add lopecode bunx @lopecode/channel</code></li>' +
      '<li>Start Claude Code:<br><code style="background:#e5e7eb;padding:2px 6px;border-radius:3px;font-size:12px;">claude --channels server:lopecode</code></li>' +
      '<li>Ask Claude to connect, or paste a pairing token below</li>' +
      '</ol></div>' +
      '<div style="display:flex;gap:8px;justify-content:center;align-items:center;" class="cc-token-row"></div>' +
      '</div>';
    container.querySelector(".cc-token-row").append(tokenInput, connectBtn);
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
    textarea.style.cssText = "width:100%;box-sizing:border-box;resize:none;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-family:inherit;font-size:14px;outline:none;";

    var sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.cssText = "padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;margin-left:auto;";

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
    inputRow.style.cssText = "display:flex;gap:8px;padding:12px;align-items:flex-end;border-top:1px solid #e5e7eb;";
    inputRow.append(textarea, sendBtn);

    var container = document.createElement("div");
    container.className = "cc-chat-view";
    container.style.cssText = "display:flex;flex-direction:column;height:100%;";
    container.append(messagesDiv, inputRow);

    function updateMessages() {
      messagesDiv.innerHTML = "";
      for (var i = 0; i < cc_messages.value.length; i++) {
        var msg = cc_messages.value[i];
        var bubble = document.createElement("div");
        bubble.className = "cc-msg cc-msg-" + msg.role;
        var isUser = msg.role === "user";
        bubble.style.cssText = "max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;" +
          (isUser
            ? "align-self:flex-end;background:#2563eb;color:white;border-bottom-right-radius:4px;"
            : "align-self:flex-start;background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px;");

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
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    updateMessages();
    container._updateMessages = updateMessages;
    return container;
  }

  var wrapper = document.createElement("div");
  wrapper.className = "cc-chat";
  wrapper.style.cssText = "border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;height:400px;display:flex;flex-direction:column;background:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

  var statusBar = document.createElement("div");
  statusBar.className = "cc-status-bar";
  statusBar.style.cssText = "display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;background:#fafafa;";

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
    statusDot.style.background = statusColors[status] || "#ef4444";
    statusText.textContent = status === "connected" ? "Connected to Claude Code"
      : (status === "connecting" || status === "pairing") ? "Connecting..."
      : "Not connected";

    body.innerHTML = "";
    if (status === "connected") {
      chatView = renderChat();
      body.appendChild(chatView);
    } else {
      chatView = null;
      body.appendChild(renderSetup());
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


export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const module_name = "@tomlarkworthy/claude-code-pairing";

  // Visual cells first (controls render order)
  $def("_cc_chat", "cc_chat", ["cc_messages","cc_status","cc_ws","md","htl","Inputs"], _cc_chat);
  $def("_cc_watch_table", "cc_watch_table", ["cc_watches","Inputs"], _cc_watch_table);

  // Internal cells
  $def("_cc_config", "cc_config", [], _cc_config);
  $def("_cc_notebook_id", "cc_notebook_id", [], _cc_notebook_id);
  $def("_cc_status", "cc_status", ["Inputs"], _cc_status);
  $def("_cc_messages", "cc_messages", ["Inputs"], _cc_messages);
  $def("_cc_watches", "viewof cc_watches", ["Inputs"], _cc_watches);
  main.variable().define("cc_watches", ["Generators", "viewof cc_watches"], (G, v) => G.input(v));
  $def("_cc_module", "viewof cc_module", ["thisModule"], _cc_module);
  main.variable().define("cc_module", ["Generators", "viewof cc_module"], (G, v) => G.input(v));
  $def("_cc_ws", "cc_ws", ["cc_config","cc_notebook_id","cc_status","cc_messages","viewof cc_watches","summarizeJS","observe","realize","createModule","deleteModule","lookupVariable","cc_module","runtime","invalidation"], _cc_ws);
  $def("_cc_change_forwarder", "cc_change_forwarder", ["cc_ws","invalidation"], _cc_change_forwarder);

  // Imports
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));
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
