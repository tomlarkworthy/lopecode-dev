const _1bqkaa9 = function _cc_chat(cc_ws,cc_messages,Event,$0,cc_activity,md,Node,cc_status)
{
    var statusColors = {
        connected: '#22c55e',
        connecting: '#f59e0b',
        pairing: '#f59e0b',
        disconnected: '#ef4444'
    };
    function renderConnect() {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center;padding:16px;';
        var tokenInput = document.createElement('input');
        tokenInput.type = 'text';
        tokenInput.placeholder = 'LOPE-XXXX';
        tokenInput.style.cssText = 'font-family:var(--monospace, monospace);font-size:16px;padding:8px 12px;border:2px solid var(--theme-foreground-faint);border-radius:6px;width:140px;text-transform:uppercase;letter-spacing:2px;background:var(--theme-background-a);color:var(--theme-foreground);';
        var connectBtn = document.createElement('button');
        connectBtn.textContent = 'Connect';
        connectBtn.style.cssText = 'padding:8px 20px;background:var(--theme-foreground);color:var(--theme-background-a);border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;';
        connectBtn.onclick = function () {
            var token = tokenInput.value.trim();
            if (token)
                cc_ws.connect(token);
        };
        tokenInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter')
                connectBtn.click();
        });
        row.append(tokenInput, connectBtn);
        var guide = document.createElement('details');
        guide.style.cssText = 'padding:0 16px 16px;font-size:13px;color:var(--theme-foreground);';
        guide.innerHTML = '<summary style="cursor:pointer;font-weight:600;font-size:14px;">Setup guide</summary>' + '<ol style="margin:8px 0 0;padding-left:20px;line-height:1.8;">' + '<li>Install <a href="https://bun.sh" target="_blank">Bun</a> if needed, then:<br>' + '<code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">bun install -g @lopecode/channel</code><br>' + '<code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">claude mcp add lopecode bunx @lopecode/channel</code></li>' + '<li>Start Claude Code:<br><code style="background:var(--theme-background-alt);padding:2px 6px;border-radius:3px;font-size:12px;">claude --dangerously-load-development-channels server:lopecode</code></li>' + '<li>Ask Claude for a pairing token, then paste it above</li>' + '</ol>';
        var container = document.createElement('div');
        container.append(row, guide);
        return container;
    }
    function renderChat() {
        var messagesDiv = document.createElement('div');
        messagesDiv.className = 'cc-messages';
        messagesDiv.style.cssText = 'flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;';
        var pendingAttachments = [];
        var attachmentsDiv = document.createElement('div');
        attachmentsDiv.className = 'cc-attachments';
        attachmentsDiv.style.cssText = 'display:none;padding:4px 12px;gap:6px;flex-wrap:wrap;border-top:1px solid var(--theme-foreground-faint);';
        function updateAttachmentsUI() {
            attachmentsDiv.innerHTML = '';
            if (pendingAttachments.length === 0) {
                attachmentsDiv.style.display = 'none';
                return;
            }
            attachmentsDiv.style.display = 'flex';
            for (var i = 0; i < pendingAttachments.length; i++) {
                (function (idx) {
                    var att = pendingAttachments[idx];
                    var thumb = document.createElement('div');
                    thumb.style.cssText = 'position:relative;display:inline-block;';
                    var img = document.createElement('img');
                    img.src = att.dataUrl;
                    img.style.cssText = 'height:48px;border-radius:6px;border:1px solid var(--theme-foreground-faint);';
                    var removeBtn = document.createElement('button');
                    removeBtn.textContent = '\xD7';
                    removeBtn.style.cssText = 'position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;border:none;background:#ef4444;color:white;font-size:11px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;';
                    removeBtn.onclick = function () {
                        pendingAttachments.splice(idx, 1);
                        updateAttachmentsUI();
                    };
                    thumb.append(img, removeBtn);
                    attachmentsDiv.appendChild(thumb);
                }(i));
            }
        }
        var textarea = document.createElement('textarea');
        textarea.className = 'cc-input';
        textarea.placeholder = 'Message Claude... (paste screenshots here)';
        textarea.rows = 2;
        textarea.style.cssText = 'width:100%;box-sizing:border-box;resize:none;border:1px solid var(--theme-foreground-faint);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:14px;outline:none;background:var(--theme-background-a);color:var(--theme-foreground);';
        textarea.addEventListener('paste', function (e) {
            var items = e.clipboardData && e.clipboardData.items;
            if (!items)
                return;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image/') === 0) {
                    e.preventDefault();
                    var file = items[i].getAsFile();
                    if (!file)
                        continue;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        pendingAttachments.push({
                            dataUrl: ev.target.result,
                            name: 'screenshot-' + Date.now() + '.png',
                            type: file.type
                        });
                        updateAttachmentsUI();
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        });
        var sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send';
        sendBtn.style.cssText = 'padding:8px 16px;background:var(--theme-foreground);color:var(--theme-background-a);border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;margin-left:auto;';
        function sendMessage() {
            var text = textarea.value.trim();
            if (!text && pendingAttachments.length === 0 || !cc_ws.ws)
                return;
            var attachments = pendingAttachments.slice();
            var msgContent = text || (attachments.length > 0 ? '(screenshot)' : '');
            var msgs = cc_messages.value.concat([{
                    role: 'user',
                    content: msgContent,
                    attachments: attachments.length > 0 ? attachments : undefined,
                    timestamp: Date.now()
                }]);
            cc_messages.value = msgs;
            cc_messages.dispatchEvent(new Event('input'));
            var payload = {
                type: 'message',
                content: text || ''
            };
            if (attachments.length > 0) {
                payload.attachments = attachments.map(function (a) {
                    return {
                        dataUrl: a.dataUrl,
                        name: a.name,
                        type: a.type
                    };
                });
            }
            cc_ws.ws.send(JSON.stringify(payload));
            textarea.value = '';
            pendingAttachments = [];
            updateAttachmentsUI();
        }
        sendBtn.onclick = sendMessage;
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        var inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;gap:8px;padding:12px;align-items:flex-end;border-top:1px solid var(--theme-foreground-faint);';
        inputRow.append(textarea, $0, sendBtn);
        // Activity status bar — shows latest Claude activity
        var activityBar = document.createElement('div');
        activityBar.className = 'cc-activity-bar';
        activityBar.style.cssText = 'padding:4px 12px;font-size:11px;font-family:var(--monospace, monospace);color:var(--theme-foreground-muted, #888);background:var(--theme-background-alt, #f8f8f8);border-bottom:1px solid var(--theme-foreground-faint, #eee);min-height:20px;display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;';
        activityBar.title = 'Click to expand activity log';
        var activityIcon = document.createElement('span');
        activityIcon.textContent = '\u23F3';
        // hourglass
        activityIcon.style.cssText = 'flex-shrink:0;';
        var activityText = document.createElement('span');
        activityText.style.cssText = 'overflow:hidden;text-overflow:ellipsis;flex:1;';
        activityText.textContent = 'Waiting for activity\u2026';
        activityBar.append(activityIcon, activityText);
        // Expandable activity log
        var activityLog = document.createElement('div');
        activityLog.className = 'cc-activity-log';
        activityLog.style.cssText = 'display:none;max-height:120px;overflow-y:auto;padding:4px 12px;font-size:11px;font-family:var(--monospace, monospace);color:var(--theme-foreground-muted, #888);background:var(--theme-background-alt, #f8f8f8);border-bottom:1px solid var(--theme-foreground-faint, #eee);line-height:1.6;';
        activityBar.addEventListener('click', function () {
            activityLog.style.display = activityLog.style.display === 'none' ? 'block' : 'none';
        });
        function updateActivity() {
            var items = cc_activity.value;
            if (items.length === 0)
                return;
            var latest = items[items.length - 1];
            // Update icon based on activity type
            if (latest.tool_name === 'thinking') {
                activityIcon.textContent = '\uD83E\uDDE0';    // brain
            } else if (latest.tool_name === 'text') {
                activityIcon.textContent = '\uD83D\uDCAC';    // speech bubble
            } else {
                activityIcon.textContent = '\uD83D\uDD27';    // wrench
            }
            activityText.textContent = latest.content;
            // Update the log
            activityLog.innerHTML = '';
            for (var a = 0; a < items.length; a++) {
                var logLine = document.createElement('div');
                var ts = new Date(items[a].timestamp);
                var timeStr = ts.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                logLine.textContent = timeStr + ' ' + items[a].content;
                logLine.style.opacity = String(0.5 + 0.5 * (a / items.length));
                activityLog.appendChild(logLine);
            }
            activityLog.scrollTop = activityLog.scrollHeight;
        }
        var container = document.createElement('div');
        container.className = 'cc-chat-view';
        container.style.cssText = 'display:flex;flex-direction:column;height:100%;';
        container.append(activityBar, activityLog, messagesDiv, attachmentsDiv, inputRow);
        function updateMessages() {
            messagesDiv.innerHTML = '';
            var msgs = cc_messages.value;
            var i = 0;
            while (i < msgs.length) {
                var msg = msgs[i];
                if (msg.role === 'tool') {
                    // Skip tool messages in chat — they're shown in the activity bar
                    i++;
                    continue;
                }
                if (msg.role === 'side') {
                    // Side-comment: Claude's CLI text, shown as subtle italic bubble
                    var sideBubble = document.createElement('div');
                    sideBubble.className = 'cc-msg cc-msg-side';
                    sideBubble.style.cssText = 'max-width:85%;padding:8px 14px;border-radius:10px;font-size:13px;line-height:1.5;align-self:flex-start;background:transparent;color:var(--theme-foreground-muted, #888);font-style:italic;border-left:2px solid var(--theme-foreground-faint, #ccc);margin:3px 0;';
                    sideBubble.textContent = msg.content;
                    messagesDiv.appendChild(sideBubble);
                    i++;
                    continue;
                }
                var bubble = document.createElement('div');
                bubble.className = 'cc-msg cc-msg-' + msg.role;
                var isUser = msg.role === 'user';
                bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;' + (isUser ? 'align-self:flex-end;background:var(--theme-foreground);color:var(--theme-background-a);border-bottom-right-radius:4px;' : 'align-self:flex-start;background:var(--theme-background-b);color:var(--theme-foreground);border-bottom-left-radius:4px;');
                if (isUser) {
                    bubble.textContent = msg.content;
                    if (msg.attachments && msg.attachments.length > 0) {
                        var attRow = document.createElement('div');
                        attRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;';
                        for (var k = 0; k < msg.attachments.length; k++) {
                            var attImg = document.createElement('img');
                            attImg.src = msg.attachments[k].dataUrl;
                            attImg.style.cssText = 'max-height:80px;border-radius:4px;border:1px solid rgba(255,255,255,0.3);';
                            attRow.appendChild(attImg);
                        }
                        bubble.appendChild(attRow);
                    }
                } else {
                    try {
                        var rendered = md([msg.content]);
                        if (rendered instanceof Node) {
                            bubble.appendChild(rendered);
                        } else {
                            bubble.textContent = msg.content;
                        }
                    } catch (e) {
                        bubble.textContent = msg.content;
                    }
                }
                messagesDiv.appendChild(bubble);
                i++;
            }
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        updateMessages();
        updateActivity();
        container._updateMessages = updateMessages;
        container._updateActivity = updateActivity;
        return container;
    }
    var isConnected = cc_status.value === 'connected';
    var wrapper = document.createElement('div');
    wrapper.className = 'cc-chat';
    wrapper.style.cssText = 'border:1px solid var(--theme-foreground-faint);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--theme-background-a);font-family:inherit;' + (isConnected ? 'height:400px;' : '');
    var statusBar = document.createElement('div');
    statusBar.className = 'cc-status-bar';
    statusBar.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--theme-foreground-faint);font-size:12px;color:var(--theme-foreground-faint);background:var(--theme-background-b);';
    var statusDot = document.createElement('span');
    statusDot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;';
    var statusText = document.createElement('span');
    statusText.className = 'cc-status-text';
    statusBar.append(statusDot, statusText);
    var body = document.createElement('div');
    body.className = 'cc-body';
    body.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;';
    wrapper.append(statusBar, body);
    var chatView = null;
    function render() {
        var status = cc_status.value || 'disconnected';
        var connected = status === 'connected';
        statusDot.style.background = statusColors[status] || '#ef4444';
        statusText.textContent = connected ? 'Connected to Claude Code' : status === 'connecting' || status === 'pairing' ? 'Connecting...' : 'Not connected';
        wrapper.style.height = connected ? '400px' : '';
        body.innerHTML = '';
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
    var lastActivityCount = cc_activity.value.length;
    var pollInterval = setInterval(function () {
        if (cc_status.value !== lastStatus) {
            lastStatus = cc_status.value;
            render();
        }
        if (cc_messages.value.length !== lastMsgCount) {
            lastMsgCount = cc_messages.value.length;
            if (chatView && chatView._updateMessages)
                chatView._updateMessages();
        }
        if (cc_activity.value.length !== lastActivityCount) {
            lastActivityCount = cc_activity.value.length;
            if (chatView && chatView._updateActivity)
                chatView._updateActivity();
        }
    }, 200);
    var originalRemove = wrapper.remove.bind(wrapper);
    wrapper.remove = function () {
        clearInterval(pollInterval);
        originalRemove();
    };
    return wrapper;
};
const _18kodgt = function _cc_watch_table(Inputs,cc_watches){return(
Inputs.table(cc_watches, {
    columns: [
        'name',
        'module',
        'value',
        'updated'
    ],
    header: {
        name: 'Variable',
        module: 'Module',
        value: 'Value',
        updated: 'Updated'
    },
    width: {
        name: 120,
        module: 140,
        value: 300,
        updated: 80
    }
})
)};
const _htme50 = function _cc_config(){return(
{
    port: 8787,
    host: '127.0.0.1'
}
)};
const _3ktj0x = function _cc_notebook_id(location){return(
location.href
)};
const _1kt3w30 = function _cc_status(Inputs){return(
Inputs.input('disconnected')
)};
const _3d7rcd = function _cc_activity(Inputs){return(
Inputs.input([])
)};
const _vs7fhb = function _cc_messages(Inputs){return(
Inputs.input([])
)};
const _5395h = function _cc_find_module(currentModules){return(
function () {
    var FRAMEWORK_MODULES = new Set([
        'bootloader',
        'builtin',
        '@tomlarkworthy/lopepage',
        '@tomlarkworthy/claude-code-pairing',
        '@tomlarkworthy/module-selection'
    ]);
    return function findModule(runtime, moduleName) {
        if (moduleName) {
            for (var entry of currentModules) {
                if (entry[1].name === moduleName) return entry[0];
            }
            return null;
        }
        for (var entry of currentModules) {
            if (!FRAMEWORK_MODULES.has(entry[1].name)) return entry[0];
        }
        return null;
    };
}()
)};
const _1cw0xck = function _cc_serialize_value(summarizeJS){return(
function serializeValue(value, maxLen) {
    maxLen = maxLen || 500;
    try {
        return String(summarizeJS(value)).slice(0, maxLen);
    } catch (e) {
        return String(value).slice(0, maxLen);
    }
}
)};
const _aaoorg = function _cc_watchers(cc_find_module,cc_module,lookupVariable,cc_serialize_value,$0,Event,observe,invalidation){return(
function () {
    var watchers = new Map();
    var sendFn = null;
    function setSend(fn) {
        sendFn = fn;
    }
    function watchVariable(runtime, name, moduleName) {
        var key = (moduleName || 'main') + ':' + name;
        if (watchers.has(key))
            return {
                ok: true,
                result: {
                    already_watching: true,
                    key: key
                }
            };
        var targetModule = moduleName ? cc_find_module(runtime, moduleName) : cc_module;
        if (!targetModule)
            return Promise.resolve({
                ok: false,
                error: 'Module not found: ' + (moduleName || 'default')
            });
        return lookupVariable(name, targetModule).then(function (targetVar) {
            if (!targetVar)
                return {
                    ok: false,
                    error: 'Variable not found: ' + name
                };
            var resolvedModule = targetVar._module && targetVar._module._name || 'main';
            var debounceTimer = null;
            var latestValue = undefined;
            var latestError = undefined;
            function flush() {
                debounceTimer = null;
                var serialized = latestError ? 'Error: ' + (latestError.message || String(latestError)) : cc_serialize_value(latestValue, 2000);
                var now = new Date().toLocaleTimeString();
                var watches = $0.value.slice();
                var found = false;
                for (var i = 0; i < watches.length; i++) {
                    if (watches[i].name === name && (watches[i].module === resolvedModule || watches[i].module == null)) {
                        watches[i] = {
                            name: name,
                            module: resolvedModule,
                            value: serialized.slice(0, 200),
                            updated: now
                        };
                        found = true;
                        break;
                    }
                }
                if (!found)
                    watches.push({
                        name: name,
                        module: resolvedModule,
                        value: serialized.slice(0, 200),
                        updated: now
                    });
                $0.value = watches;
                $0.dispatchEvent(new Event('input'));
                if (sendFn) {
                    var msg = {
                        type: 'variable-update',
                        name: name,
                        module: resolvedModule
                    };
                    if (latestError) {
                        msg.error = latestError.message || String(latestError);
                    } else {
                        msg.value = serialized;
                    }
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
                fulfilled: function (value) {
                    scheduleUpdate(value, null);
                },
                rejected: function (error) {
                    scheduleUpdate(null, error);
                }
            }, { invalidation: invalidation });
            watchers.set(key, {
                dispose: function () {
                    if (debounceTimer)
                        clearTimeout(debounceTimer);
                    cancel();
                    var watches = $0.value.filter(function (w) {
                        return !(w.name === name && w.module === resolvedModule);
                    });
                    $0.value = watches;
                    $0.dispatchEvent(new Event('input'));
                    watchers.delete(key);
                }
            });
            return {
                ok: true,
                result: {
                    watching: true,
                    key: key
                }
            };
        });
    }
    function unwatchVariable(name, moduleName) {
        var key = (moduleName || 'main') + ':' + name;
        var watcher = watchers.get(key);
        if (!watcher)
            return {
                ok: false,
                error: 'Not watching: ' + key
            };
        watcher.dispose();
        return {
            ok: true,
            result: {
                unwatched: true,
                key: key
            }
        };
    }
    function unwatchAll() {
        var keys = Array.from(watchers.keys());
        for (var i = 0; i < keys.length; i++) {
            watchers.get(keys[i]).dispose();
        }
        return {
            ok: true,
            result: {
                unwatched_all: true,
                count: keys.length
            }
        };
    }
    return {
        watchVariable: watchVariable,
        unwatchVariable: unwatchVariable,
        unwatchAll: unwatchAll,
        setSend: setSend
    };
}()
)};
const _wsgvw8 = function _cc_handle_get_variable(cc_find_module,lookupVariable,cc_serialize_value){return(
function handleGetVariable(cmd, runtime) {
    var name = cmd.params.name;
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'default')
        };
    return lookupVariable(name, targetModule).then(function (v) {
        if (!v)
            return {
                ok: false,
                error: 'Variable not found: ' + name
            };
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
const _os9fet = function _cc_handle_define_variable(cc_find_module,realize,cc_watchers){return(
function handleDefineVariable(cmd, runtime) {
    var name = cmd.params.name;
    var definition = cmd.params.definition;
    var inputs = cmd.params.inputs || [];
    var moduleName = cmd.params.module;
    var mod = cc_find_module(runtime, moduleName);
    if (!mod)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'default')
        };
    var ojs_observer = window.__ojs_observer || null;
    return realize([definition], runtime).then(function (results) {
        var fn = results[0];
        if (typeof fn !== 'function')
            return {
                ok: false,
                error: 'Definition must evaluate to a function'
            };
        var existingVar = mod._scope.get(name);
        if (existingVar) {
            existingVar.define(name, inputs, fn);
        } else {
            mod.variable(ojs_observer ? ojs_observer(name) : {}).define(name, inputs, fn);
        }
        cc_watchers.watchVariable(runtime, name, moduleName || null);
        return {
            ok: true,
            result: {
                success: true,
                name: name,
                module: moduleName || 'default'
            }
        };
    }).catch(function (e) {
        return {
            ok: false,
            error: 'define failed: ' + e.message
        };
    });
}
)};
const _1gvixop = function _cc_handle_define_cell(cc_find_module,compile,realize,cc_watchers){return(
function handleDefineCell(cmd, runtime) {
    var source = cmd.params.source;
    var moduleName = cmd.params.module;
    var mod = cc_find_module(runtime, moduleName);
    if (!mod)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'default')
        };
    var ojs_observer = window.__ojs_observer || null;
    try {
        var compiled = compile(source);
        if (!compiled || compiled.length === 0)
            return {
                ok: false,
                error: 'Compilation returned no definitions'
            };
        var definitions = [];
        for (var ci = 0; ci < compiled.length; ci++) {
            definitions.push(compiled[ci]._definition);
        }
        return realize(definitions, runtime).then(function (fns) {
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
                if (cellName && !cellName.startsWith('module ')) {
                    cc_watchers.watchVariable(runtime, cellName, moduleName || null);
                }
            }
            return {
                ok: true,
                result: {
                    success: true,
                    defined: defined,
                    module: moduleName || 'default'
                }
            };
        }).catch(function (e) {
            return {
                ok: false,
                error: 'define-cell realize failed: ' + e.message
            };
        });
    } catch (e) {
        return {
            ok: false,
            error: 'define-cell compile failed: ' + e.message
        };
    }
}
)};
const _1xkaywh = function _cc_handle_delete_variable(cc_find_module,lookupVariable){return(
function handleDeleteVariable(cmd, runtime) {
    var name = cmd.params.name;
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'main')
        };
    return lookupVariable(name, targetModule).then(function (v) {
        if (!v)
            return {
                ok: false,
                error: 'Variable not found: ' + name + ' in module ' + (moduleName || 'main')
            };
        v.delete();
        return {
            ok: true,
            result: {
                success: true,
                name: name,
                module: targetModule._name || 'main'
            }
        };
    });
}
)};
const _1c0824h = function _cc_handle_list_variables(cc_find_module){return(
function handleListVariables(cmd, runtime) {
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'default')
        };
    var variables = [];
    for (var entry of targetModule._scope) {
        var v = entry[1];
        variables.push({
            name: entry[0],
            module: v._module && v._module._name || 'main',
            hasValue: v._value !== undefined,
            hasError: v._error !== undefined,
            reachable: v._reachable
        });
    }
    variables.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });
    return {
        ok: true,
        result: variables
    };
}
)};
const _15uwot5 = function _cc_handle_list_cells(cc_find_module){return(
function handleListCells(cmd, runtime) {
    var moduleName = cmd.params.module;
    var targetModule = cc_find_module(runtime, moduleName);
    if (!targetModule)
        return {
            ok: false,
            error: 'Module not found: ' + (moduleName || 'default')
        };
    var cells = [];
    for (var entry of targetModule._scope) {
        var v = entry[1];
        var defStr = '';
        try {
            defStr = String(v._definition).slice(0, 2000);
        } catch (e) {
        }
        cells.push({
            name: entry[0],
            inputs: (v._inputs || []).map(function (inp) {
                return inp._name || '?';
            }),
            definition: defStr,
            hasValue: v._value !== undefined,
            hasError: v._error !== undefined,
            error: v._error ? v._error.message || String(v._error) : undefined
        });
    }
    cells.sort(function (a, b) {
        return a.name.localeCompare(b.name);
    });
    return {
        ok: true,
        result: cells
    };
}
)};
const _ivi416 = function _cc_handle_run_tests()
{
    return function handleRunTests(cmd, runtime) {
        var filter = cmd.params.filter;
        var timeout = cmd.params.timeout || 30000;
        return new Promise(function (outerResolve) {
            // Find actual runtime with _computeNow
            var actualRuntime = null;
            for (var v of runtime._variables) {
                if (v._module && v._module._runtime && v._module._runtime._computeNow) {
                    actualRuntime = v._module._runtime;
                    break;
                }
            }
            if (!actualRuntime) {
                outerResolve({
                    ok: false,
                    error: 'Could not find actual runtime'
                });
                return;
            }
            var moduleNames = new Map();
            for (var v2 of runtime._variables) {
                if (v2._module && !moduleNames.has(v2._module)) {
                    var modName = v2._module._name || (v2._name && v2._name.startsWith('module ') ? v2._name : null);
                    if (modName)
                        moduleNames.set(v2._module, modName);
                }
            }
            var testVars = [];
            for (var variable of runtime._variables) {
                var name = variable._name;
                if (typeof name === 'string' && name.startsWith('test_')) {
                    if (filter) {
                        var moduleName = moduleNames.get(variable._module) || '';
                        if (!name.includes(filter) && !moduleName.includes(filter))
                            continue;
                    }
                    testVars.push(variable);
                }
            }
            if (testVars.length === 0) {
                outerResolve({
                    ok: false,
                    error: 'No test variables found'
                });
                return;
            }
            var results = new Map();
            var pendingPromises = [];
            for (var vi = 0; vi < testVars.length; vi++) {
                (function (v3) {
                    var tName = v3._name;
                    var tModuleName = moduleNames.get(v3._module) || 'main';
                    var fullName = tModuleName + '#' + tName;
                    var p = new Promise(function (resolve) {
                        var timeoutId = setTimeout(function () {
                            results.set(fullName, {
                                state: 'timeout',
                                name: tName,
                                module: tModuleName
                            });
                            resolve();
                        }, timeout);
                        if (v3._value !== undefined) {
                            clearTimeout(timeoutId);
                            results.set(fullName, {
                                state: 'passed',
                                name: tName,
                                module: tModuleName,
                                value: String(v3._value).slice(0, 200)
                            });
                            resolve();
                            return;
                        }
                        if (v3._error !== undefined) {
                            clearTimeout(timeoutId);
                            results.set(fullName, {
                                state: 'failed',
                                name: tName,
                                module: tModuleName,
                                error: v3._error && v3._error.message || String(v3._error)
                            });
                            resolve();
                            return;
                        }
                        if (!v3._reachable) {
                            v3._reachable = true;
                            actualRuntime._dirty.add(v3);
                        }
                        var oldObserver = v3._observer;
                        v3._observer = {
                            fulfilled: function (value) {
                                clearTimeout(timeoutId);
                                results.set(fullName, {
                                    state: 'passed',
                                    name: tName,
                                    module: tModuleName,
                                    value: value === undefined ? 'undefined' : String(value).slice(0, 200)
                                });
                                resolve();
                                if (oldObserver && oldObserver.fulfilled)
                                    oldObserver.fulfilled(value);
                            },
                            rejected: function (error) {
                                clearTimeout(timeoutId);
                                results.set(fullName, {
                                    state: 'failed',
                                    name: tName,
                                    module: tModuleName,
                                    error: error && error.message || String(error)
                                });
                                resolve();
                                if (oldObserver && oldObserver.rejected)
                                    oldObserver.rejected(error);
                            },
                            pending: function () {
                                if (oldObserver && oldObserver.pending)
                                    oldObserver.pending();
                            }
                        };
                    });
                    pendingPromises.push(p);
                }(testVars[vi]));
            }
            actualRuntime._computeNow();
            Promise.race([
                Promise.all(pendingPromises),
                new Promise(function (r) {
                    setTimeout(r, timeout + 5000);
                })
            ]).then(function () {
                var tests = Array.from(results.values());
                var passed = tests.filter(function (t) {
                    return t.state === 'passed';
                }).length;
                var failed = tests.filter(function (t) {
                    return t.state === 'failed';
                }).length;
                var timeoutCount = tests.filter(function (t) {
                    return t.state === 'timeout';
                }).length;
                outerResolve({
                    ok: true,
                    result: {
                        tests: tests,
                        summary: {
                            total: tests.length,
                            passed: passed,
                            failed: failed,
                            timeout: timeoutCount
                        }
                    }
                });
            });
        });
    };
};
const _ekri0k = function _cc_handle_create_module(createModule){return(
function handleCreateModule(cmd, runtime) {
    var moduleName = cmd.params.name;
    if (!moduleName)
        return {
            ok: false,
            error: 'Module name is required'
        };
    try {
        createModule(moduleName, runtime);
        return {
            ok: true,
            result: {
                success: true,
                name: moduleName
            }
        };
    } catch (e) {
        return {
            ok: false,
            error: e.message
        };
    }
}
)};
const _vky6eh = function _cc_handle_delete_module(deleteModule){return(
function handleDeleteModule(cmd, runtime) {
    var moduleName = cmd.params.name;
    if (!moduleName)
        return {
            ok: false,
            error: 'Module name is required'
        };
    try {
        deleteModule(moduleName, runtime);
        return {
            ok: true,
            result: {
                success: true,
                name: moduleName
            }
        };
    } catch (e) {
        return {
            ok: false,
            error: e.message
        };
    }
}
)};
const _17zi194 = function _cc_handle_eval(cc_serialize_value){return(
function handleEval(cmd, runtime) {
    var code = cmd.params.code;
    try {
        var result = eval(code);
        return {
            ok: true,
            result: cc_serialize_value(result)
        };
    } catch (e) {
        return {
            ok: false,
            error: e.message
        };
    }
}
)};
const _ncjpde = function _cc_handle_fork(exportToHTML,runtime){return(
function handleFork(cmd, runtimeArg) {
    if (typeof exportToHTML !== 'function') {
        return {
            ok: false,
            error: 'exportToHTML not available. Does this notebook include @tomlarkworthy/exporter-2?'
        };
    }
    var saveInPlace = cmd.params && cmd.params._save_in_place;
    return Promise.resolve(exportToHTML({ mains: runtime.mains })).then(function (result) {
        var html = typeof result === 'string' ? result : result.source;
        if (!html || typeof html !== 'string') {
            return {
                ok: false,
                error: 'Export returned no HTML source'
            };
        }
        if (saveInPlace) {
            // Export mode: return HTML for channel to write to disk
            return { ok: true, result: { html: html } };
        }
        // Fork mode: open in new tab with current URL params
        var blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        var hash = location.hash || '';
        window.open(blobUrl + hash, '_blank');
        setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 60000);
        return {
            ok: true,
            result: { opened: true, hash: hash }
        };
    }).catch(function (e) {
        return {
            ok: false,
            error: 'Fork failed: ' + e.message
        };
    });
}
)};
const _pw9yec = function _cc_handle_watch(cc_watchers){return(
function handleWatch(cmd, runtime) {
    return cc_watchers.watchVariable(runtime, cmd.params.name, cmd.params.module);
}
)};
const _1it7xms = function _cc_handle_unwatch(cc_watchers){return(
function handleUnwatch(cmd, runtime) {
    return cc_watchers.unwatchVariable(cmd.params.name, cmd.params.module);
}
)};
const _1mcq9bb = function _cc_command_handlers(cc_handle_get_variable,cc_handle_define_variable,cc_handle_define_cell,cc_handle_delete_variable,cc_handle_list_variables,cc_handle_list_cells,cc_handle_run_tests,cc_handle_create_module,cc_handle_delete_module,cc_handle_eval,cc_handle_fork,cc_handle_watch,cc_handle_unwatch){return(
function handleCommand(cmd) {
    var runtime = window.__ojs_runtime;
    if (!runtime)
        return {
            ok: false,
            error: 'Runtime not found'
        };
    var handlers = {
        'get-variable': cc_handle_get_variable,
        'define-variable': cc_handle_define_variable,
        'define-cell': cc_handle_define_cell,
        'delete-variable': cc_handle_delete_variable,
        'list-variables': cc_handle_list_variables,
        'list-cells': cc_handle_list_cells,
        'run-tests': cc_handle_run_tests,
        'create-module': cc_handle_create_module,
        'delete-module': cc_handle_delete_module,
        'eval': cc_handle_eval,
        'fork': cc_handle_fork,
        'watch': cc_handle_watch,
        'unwatch': cc_handle_unwatch,
        'unwatch-all': function () {
            return cc_handle_unwatch.__watchers_ref ? cc_handle_unwatch.__watchers_ref.unwatchAll() : {
                ok: false,
                error: 'unwatchAll not available'
            };
        }
    };
    var handler = handlers[cmd.action];
    if (!handler)
        return {
            ok: false,
            error: 'Unknown action: ' + cmd.action
        };
    return handler(cmd, runtime);
}
)};
const _1d9lqd1 = function _cc_ws(cc_config,sessionStorage,cc_status,Event,cc_notebook_id,cc_watchers,location,$0,cc_messages,cc_activity,cc_command_handlers,invalidation)
{
    return function () {
        var port = cc_config.port, host = cc_config.host;
        var ws = null;
        var paired = false;
        function connect(token) {
            if (ws) {
                ws.close();
                ws = null;
            }
            if (token) {
                try {
                    sessionStorage.setItem('lopecode_cc_token', token);
                } catch (e) {
                }
            }
            var connectPort = port;
            if (token) {
                var parts = token.match(/^LOPE-(\d+)-[A-Z0-9]+$/);
                if (parts)
                    connectPort = parseInt(parts[1], 10);
            }
            cc_status.value = 'connecting';
            cc_status.dispatchEvent(new Event('input'));
            ws = new WebSocket('ws://' + host + ':' + connectPort + '/ws');
            ws.onopen = function () {
                if (token) {
                    cc_status.value = 'pairing';
                    cc_status.dispatchEvent(new Event('input'));
                    ws.send(JSON.stringify({
                        type: 'pair',
                        token: token,
                        url: cc_notebook_id,
                        title: document.title || 'Untitled'
                    }));
                }
            };
            ws.onmessage = function (event) {
                var msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                switch (msg.type) {
                case 'paired':
                    paired = true;
                    cc_status.value = 'connected';
                    cc_status.dispatchEvent(new Event('input'));
                    // Provide send callback to watchers
                    cc_watchers.setSend(function (m) {
                        if (paired && ws)
                            ws.send(JSON.stringify(m));
                    });
                    var modules = [];
                    var rt = window.__ojs_runtime;
                    if (rt) {
                        var seen = new Set();
                        for (var v of rt._variables) {
                            var name = v._module && v._module._name;
                            if (name && !seen.has(name)) {
                                seen.add(name);
                                modules.push(name);
                            }
                        }
                    }
                    ws.send(JSON.stringify({
                        type: 'notebook-info',
                        url: cc_notebook_id,
                        title: document.title,
                        modules: modules,
                        hash: location.hash
                    }));
                    // Set up watches from cc_watches
                    var rt2 = window.__ojs_runtime;
                    if (rt2) {
                        var initialWatches = $0.value || [];
                        for (var i = 0; i < initialWatches.length; i++) {
                            cc_watchers.watchVariable(rt2, initialWatches[i].name, initialWatches[i].module);
                        }
                    }
                    break;
                case 'pair-failed':
                    paired = false;
                    cc_status.value = 'disconnected';
                    cc_status.dispatchEvent(new Event('input'));
                    break;
                case 'reply':
                    var msgs = cc_messages.value.concat([{
                            role: 'assistant',
                            content: msg.markdown,
                            timestamp: Date.now()
                        }]);
                    cc_messages.value = msgs;
                    cc_messages.dispatchEvent(new Event('input'));
                    break;
                case 'tool-activity':
                    // Update the activity status bar (not the chat messages)
                    var activityEntry = {
                        tool_name: msg.tool_name,
                        content: msg.summary,
                        timestamp: msg.timestamp || Date.now()
                    };
                    cc_activity.value = cc_activity.value.concat([activityEntry]).slice(-20);
                    cc_activity.dispatchEvent(new Event('input'));
                    break;
                case 'command':
                    Promise.resolve(cc_command_handlers(msg)).then(function (result) {
                        ws.send(JSON.stringify({
                            type: 'command-result',
                            id: msg.id,
                            ok: result.ok,
                            result: result.result,
                            error: result.error
                        }));
                    }).catch(function (e) {
                        ws.send(JSON.stringify({
                            type: 'command-result',
                            id: msg.id,
                            ok: false,
                            error: e.message
                        }));
                    });
                    break;
                case 'assistant-text':
                    // Side-comment: Claude's CLI text output from session log
                    var sideMsg = cc_messages.value.concat([{
                            role: 'side',
                            content: msg.text,
                            timestamp: msg.timestamp || Date.now()
                        }]);
                    cc_messages.value = sideMsg;
                    cc_messages.dispatchEvent(new Event('input'));
                    break;
                }
            };
            ws.onclose = function () {
                paired = false;
                cc_watchers.setSend(null);
                cc_status.value = 'disconnected';
                cc_status.dispatchEvent(new Event('input'));
                ws = null;
            };
            ws.onerror = function () {
            };
        }
        // Auto-connect: check hash param first, then sessionStorage fallback
        (function autoConnect() {
            var token = null;
            var hash = location.hash || '';
            var match = hash.match(/[&?]cc=(LOPE-[A-Z0-9-]+)/);
            if (match) {
                token = match[1];
            }
            if (!token) {
                try {
                    token = sessionStorage.getItem('lopecode_cc_token');
                } catch (e) {
                }
            }
            if (token) {
                setTimeout(function () {
                    connect(token);
                }, 500);
            }
        }());
        invalidation.then(function () {
            cc_watchers.setSend(null);
            if (ws) {
                ws.close();
                ws = null;
            }
        });
        return {
            connect: connect,
            get paired() {
                return paired;
            },
            get ws() {
                return ws;
            }
        };
    }();
};
const _d9cyj2 = function _cc_change_forwarder(cc_ws,history,invalidation){return(
function () {
    var highWaterMark = 0;
    var initializing = true;
    var interval = setInterval(function () {
        if (!cc_ws.paired || !cc_ws.ws)
            return;
        if (!history || !Array.isArray(history))
            return;
        var total = history.length;
        if (initializing) {
            highWaterMark = total;
            initializing = false;
            return;
        }
        if (total <= highWaterMark)
            return;
        var newEntries = history.slice(highWaterMark).map(function (e) {
            return {
                t: e.t,
                op: e.op,
                module: e.module,
                _name: e._name,
                _inputs: e._inputs,
                _definition: typeof e._definition === 'function' ? e._definition.toString().slice(0, 500) : String(e._definition || '').slice(0, 500)
            };
        });
        highWaterMark = total;
        cc_ws.ws.send(JSON.stringify({
            type: 'cell-change',
            changes: newEntries
        }));
    }, 1000);
    invalidation.then(function () {
        clearInterval(interval);
    });
    return 'change forwarder active';
}()
)};
const _56tjlo = function _cc_voice(voiceEnabled,KeyboardEvent,SpeechSynthesisUtterance,invalidation)
{
    return function () {
        if (!voiceEnabled)
            return 'voice: disabled';
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        var recognition = null;
        var synth = window.speechSynthesis;
        var active = true;
        var muteUntil = 0;
        var lastUnmuteTime = 0;
        var lastSpokenCount = 0;
        var pendingUtterances = 0;
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
            if (!SR || recognition)
                return;
            var rec = new SR();
            recognition = rec;
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';
            rec.onresult = function (e) {
                var textarea = getTextarea();
                if (!textarea || isMuted()) {
                    if (textarea)
                        textarea.value = '';
                    return;
                }
                var transcript = '';
                var isFinal = false;
                for (var i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                    if (e.results[i].isFinal)
                        isFinal = true;
                }
                if (isFinal && Date.now() - lastUnmuteTime < 2000) {
                    textarea.value = '';
                    return;
                }
                textarea.value = transcript;
                if (isFinal && transcript.trim()) {
                    textarea.value = '\uD83C\uDFA4 ' + transcript.trim();
                    textarea.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter',
                        bubbles: true
                    }));
                    textarea.value = '';
                }
            };
            rec.onend = function () {
                if (rec !== recognition)
                    return;
                recognition = null;
                if (active)
                    setTimeout(function () {
                        if (active)
                            startRecognition();
                    }, 100);
            };
            rec.onerror = function (e) {
                if (e.error === 'not-allowed') {
                    active = false;
                }
            };
            try {
                rec.start();
            } catch (e) {
                recognition = null;
            }
        }
        function speakText(text) {
            pendingUtterances++;
            muteUntil = Date.now() + 600000;
            var textarea = getTextarea();
            if (textarea)
                textarea.value = '';
            var utter = new SpeechSynthesisUtterance(text);
            utter.rate = 1.1;
            utter.onend = function () {
                pendingUtterances--;
                if (pendingUtterances <= 0) {
                    pendingUtterances = 0;
                    muteUntil = Date.now() + 2000;
                    lastUnmuteTime = Date.now() + 2000;
                }
                var textarea = getTextarea();
                if (textarea)
                    textarea.value = '';
            };
            utter.onerror = function () {
                pendingUtterances--;
                if (pendingUtterances <= 0) {
                    pendingUtterances = 0;
                    muteUntil = Date.now() + 2000;
                    lastUnmuteTime = Date.now() + 2000;
                }
            };
            synth.speak(utter);
        }
        function stopAll() {
            active = false;
            pendingUtterances = 0;
            muteUntil = 0;
            if (recognition) {
                try {
                    recognition.abort();
                } catch (e) {
                }
                recognition = null;
            }
            synth.cancel();
        }
        // Initialize: count existing messages so we don't speak old ones
        var messagesDiv = getMessagesDiv();
        lastSpokenCount = messagesDiv ? messagesDiv.querySelectorAll('.cc-msg-assistant').length : 0;
        startRecognition();
        var pollId = setInterval(function () {
            if (!active)
                return;
            var messagesDiv = getMessagesDiv();
            if (!messagesDiv)
                return;
            var bubbles = messagesDiv.querySelectorAll('.cc-msg-assistant');
            if (bubbles.length > lastSpokenCount) {
                for (var i = lastSpokenCount; i < bubbles.length; i++) {
                    speakText(bubbles[i].textContent.replace(/\n{2,}/g, '. '));
                }
                lastSpokenCount = bubbles.length;
            }
        }, 500);
        invalidation.then(function () {
            stopAll();
            clearInterval(pollId);
        });
        return 'voice active';
    }();
};
const _jynll5 = function _cc_watches(Inputs){return(
Inputs.input([
    {
        name: 'hash',
        module: null
    },
    {
        name: 'currentModules',
        module: null
    },
    {
        name: 'history',
        module: null
    }
])
)};
const _tt702v = function _cc_module(thisModule){return(
thisModule()
)};
const _1tgi7r0 = function _voiceEnabled(Event){return(
function () {
    var span = document.createElement('span');
    span.className = 'cc-voice-toggle';
    span.style.cssText = 'font-size:20px;opacity:0.4;transition:opacity 0.15s;line-height:1;cursor:pointer;flex-shrink:0;user-select:none;align-self:center;';
    span.textContent = '\uD83C\uDF99️';
    span.title = 'Toggle voice mode';
    span.value = false;
    span.onclick = function () {
        span.value = !span.value;
        span.style.opacity = span.value ? '1' : '0.4';
        span.dispatchEvent(new Event('input'));
    };
    return span;
}()
)};
const _1r8zuiv = (_, v) => v.import("currentModules", _);
const _ocdbin = function identity(x) {
  return x;
};
const _15u7kly = function identity(x) {
  return x;
};
const _zliudz = (_, v) => v.import("viewof history", _);
const _1oqy2z3 = (_, v) => v.import("viewof runtime_variables", _);
const _19ebgtz = (_, v) => v.import("hash", _);
const _b5syxl = function identity(x) {
  return x;
};

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
  $def("_1bqkaa9", "cc_chat", ["cc_ws","cc_messages","Event","viewof voiceEnabled","cc_activity","md","Node","cc_status"], _1bqkaa9);  
  $def("_18kodgt", "cc_watch_table", ["Inputs","cc_watches"], _18kodgt);  
  $def("_htme50", "cc_config", [], _htme50);  
  $def("_3ktj0x", "cc_notebook_id", ["location"], _3ktj0x);  
  $def("_1kt3w30", "cc_status", ["Inputs"], _1kt3w30);  
  $def("_3d7rcd", "cc_activity", ["Inputs"], _3d7rcd);  
  $def("_vs7fhb", "cc_messages", ["Inputs"], _vs7fhb);  
  $def("_5395h", "cc_find_module", ["currentModules"], _5395h);  
  $def("_1cw0xck", "cc_serialize_value", ["summarizeJS"], _1cw0xck);  
  $def("_aaoorg", "cc_watchers", ["cc_find_module","cc_module","lookupVariable","cc_serialize_value","viewof cc_watches","Event","observe","invalidation"], _aaoorg);  
  $def("_wsgvw8", "cc_handle_get_variable", ["cc_find_module","lookupVariable","cc_serialize_value"], _wsgvw8);  
  $def("_os9fet", "cc_handle_define_variable", ["cc_find_module","realize","cc_watchers"], _os9fet);  
  $def("_1gvixop", "cc_handle_define_cell", ["cc_find_module","compile","realize","cc_watchers"], _1gvixop);  
  $def("_1xkaywh", "cc_handle_delete_variable", ["cc_find_module","lookupVariable"], _1xkaywh);  
  $def("_1c0824h", "cc_handle_list_variables", ["cc_find_module"], _1c0824h);  
  $def("_15uwot5", "cc_handle_list_cells", ["cc_find_module"], _15uwot5);  
  $def("_ivi416", "cc_handle_run_tests", [], _ivi416);  
  $def("_ekri0k", "cc_handle_create_module", ["createModule"], _ekri0k);  
  $def("_vky6eh", "cc_handle_delete_module", ["deleteModule"], _vky6eh);  
  $def("_17zi194", "cc_handle_eval", ["cc_serialize_value"], _17zi194);  
  $def("_ncjpde", "cc_handle_fork", ["exportToHTML","runtime"], _ncjpde);  
  $def("_pw9yec", "cc_handle_watch", ["cc_watchers"], _pw9yec);  
  $def("_1it7xms", "cc_handle_unwatch", ["cc_watchers"], _1it7xms);  
  $def("_1mcq9bb", "cc_command_handlers", ["cc_handle_get_variable","cc_handle_define_variable","cc_handle_define_cell","cc_handle_delete_variable","cc_handle_list_variables","cc_handle_list_cells","cc_handle_run_tests","cc_handle_create_module","cc_handle_delete_module","cc_handle_eval","cc_handle_fork","cc_handle_watch","cc_handle_unwatch"], _1mcq9bb);  
  $def("_1d9lqd1", "cc_ws", ["cc_config","sessionStorage","cc_status","Event","cc_notebook_id","cc_watchers","location","viewof cc_watches","cc_messages","cc_activity","cc_command_handlers","invalidation"], _1d9lqd1);  
  $def("_d9cyj2", "cc_change_forwarder", ["cc_ws","history","invalidation"], _d9cyj2);  
  $def("_56tjlo", "cc_voice", ["voiceEnabled","KeyboardEvent","SpeechSynthesisUtterance","invalidation"], _56tjlo);  
  $def("_jynll5", "viewof cc_watches", ["Inputs"], _jynll5);  
  main.variable(observer("cc_watches")).define("cc_watches", ["Generators", "viewof cc_watches"], (G, _) => G.input(_));  
  $def("_tt702v", "viewof cc_module", ["thisModule"], _tt702v);  
  main.variable(observer("cc_module")).define("cc_module", ["Generators", "viewof cc_module"], (G, _) => G.input(_));  
  $def("_1tgi7r0", "viewof voiceEnabled", ["Event"], _1tgi7r0);  
  main.variable(observer("voiceEnabled")).define("voiceEnabled", ["Generators", "viewof voiceEnabled"], (G, _) => G.input(_));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));  
  main.define("exportToHTML", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exportToHTML", _));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));  
  main.define("viewof history", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("viewof history", _));  
  main.define("history", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("history", _));  
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
