const _gzcybb = function _1(htl){return(
htl.html`<h1 style="display:none">Secrets</h1>`
)};
const _1en3hmq = function _secrets(secretStore){return(
secretStore("secrets")
)};
const _31aasz = (G, _) => G.input(_);
const _kcrkmr = function _3(md,isOnObservableCom){return(
md`

Encrypted key-value storage that lives in the notebook's own source code. Secrets are protected with AES-256-GCM.

${
  isOnObservableCom()
    ? md`⚠️ doesn't work on Observable until you [export](https://observablehq.com/@tomlarkworthy/exporter-2)`
    : ""
}
`
)};
const _dwefdz = function _4(md){return(
md`## User Guide

### Quick Start

1. **Import** into your notebook:
\`\`\`js
import {secretStore} from "@tomlarkworthy/secrets"
viewof mySecrets = secretStore("my-keys")
\`\`\`

2. **Generate a key** — click "Generate AES Key". A 256-bit AES key is created and displayed once. **Copy it to a safe place** (password manager, env var, etc.). This is the only time you'll see it.

3. **Click Continue** to enter the secret editor. Add key-value pairs and click **Save**. The encrypted data is written into the cell's own source code — it persists across page reloads and notebook exports.

4. **Returning** — paste your AES key into the unlock field. Your browser's password manager can autofill it (the input has \`autocomplete="current-password"\`).

### How It Works

- Secrets are encrypted with **AES-256-GCM** using the Web Crypto API — the gold standard for browser-side encryption.
- The encrypted ciphertext and IV are stored as a JSON literal in the cell's source code: \`secretStore("name", {cipher: "...", iv: "..."})\`
- **No server, no localStorage** — everything lives in the notebook file itself.
- We **never derive keys from passwords**. Instead, a full 256-bit key is generated properly via \`crypto.subtle.generateKey()\`. This eliminates weak-password attacks entirely.
- A fresh 12-byte IV is generated for every save, ensuring identical plaintext produces different ciphertext.

### Reactive Behavior

- **Locked**: the cell value is \`undefined\`. Downstream cells remain pending — they simply don't run.
- **Unlocked**: the cell value is a \`Map<string, string>\`. Downstream cells recompute automatically.

### Bot / Automation Access

Each secret box has a \`data-secrets\` attribute and \`.secrets\` class for programmatic access:
\`\`\`js
const box = document.querySelector('[data-secrets="my-keys"]');
box.querySelector('input').value = myKey;
box.querySelector('.secrets-unlock').click();
\`\`\`
`
)};
const _18tceen = function _5(md){return(
md`## Developer Documentation

### Module Structure

The implementation is organized into four sections:

1. **Imports** — \`runtime\` from \`@tomlarkworthy/runtime-sdk\` for self-modification
2. **Crypto Helpers** — Base64 encoding, AES key generation/import, encrypt/decrypt
3. **UI Components** — CSS styles themed with lopecode variables, SVG padlock
4. **Secret Store Builder** — The main \`secretStore(name, data?)\` function

### Self-Modification

When the user clicks Save, the cell rewrites its own source code:

1. The view element carries a unique Symbol tag (\`_secretsTag\`)
2. \`selfModify()\` searches \`runtime._variables\` for the variable whose \`_value\` has that tag
3. Once found, it reads the variable's input names and constructs a new function: \`secretStore("name", {cipher: "...", iv: "..."})\`
4. \`variable.define()\` replaces the cell definition — the Observable runtime re-evaluates it with the embedded ciphertext

### Key Design Decisions

- **No localStorage** — ciphertext lives in source code, survives export
- **No password derivation** — full AES-256 key generation avoids weak-password attacks
- **Symbol-based self-discovery** — each instance has a unique tag for finding its own variable, enabling multiple independent stores
- **viewof pattern** — locked state is \`undefined\` (pending), unlocked is \`Map<string, string>\`, giving natural reactive behavior
`
)};
const _5er114 = function _6(md){return(
md`---
## Implementation`
)};
const _xpi2ll = function _7(md){return(
md`### Secret Store Builder

The main \`secretStore(name, data?)\` function. Creates an encrypted key-value store view. Closes over \`runtime\` for self-modification on save.`
)};
const _f0cb01 = function _secretStore(runtime,_activeKeys,htl,secretsStyle,padlockSVG,Event,decryptMap,importAESKey,generateAESKey,encryptMap)
{
  const _runtime = runtime;
  return function secretStore(name, data) {
    const tag = Symbol("secrets-" + name);
    const state = {
      map: null,
      savedData: data,
      dirty: false,
      cryptoKey: _activeKeys.get(name) || null,
      unlocked: false
    };
    const root = htl.html`<div class="secrets locked" data-secrets="${name}">
      ${secretsStyle.cloneNode(true)}
      <div class="secrets-header">
        ${padlockSVG.cloneNode(true)}
        <h3>${name}</h3>
      </div>
      <div class="secrets-body"></div>
    </div>`;
    root._secretsTag = tag;
    const body = root.querySelector(".secrets-body");
    function dispatchValue() {
      root.value = state.unlocked ? state.map : undefined;
      root.dispatchEvent(new Event("input", { bubbles: true }));
    }
    async function unlock(cryptoKey) {
      state.cryptoKey = cryptoKey;
      _activeKeys.set(name, cryptoKey);
      state.map = await decryptMap(data, cryptoKey);
      state.unlocked = true;
      state.dirty = false;
      root.classList.remove("locked");
      root.classList.add("unlocked");
      renderUnlocked();
      dispatchValue();
    }
    async function selfModify(newData) {
      let viewofVar = null;
      for (const v of _runtime._variables) {
        try {
          if (v._value && v._value._secretsTag === tag) {
            viewofVar = v;
            break;
          }
        } catch (e) {}
      }
      if (!viewofVar) throw new Error("Could not find own variable");
      const inputNames = viewofVar._inputs.map((i) => i._name).filter(Boolean);
      const dataLiteral = JSON.stringify(newData);
      const newDef = Function(
        ...inputNames,
        `"use strict"; return secretStore(${JSON.stringify(
          name
        )}, ${dataLiteral})`
      );
      console.log("[secrets] Redefining cell with ciphertext");
      viewofVar.define(viewofVar._name, inputNames, newDef);
    }
    function renderLocked() {
      if (data) {
        // Auto-unlock if we have a cached key
        if (state.cryptoKey) {
          unlock(state.cryptoKey).catch(() => {
            // Key was invalid (maybe data changed), clear cache and show input
            _activeKeys.delete(name);
            state.cryptoKey = null;
            renderLocked();
          });
          return;
        }
        body.innerHTML = "";
        const row = htl.html`<div class="secrets-key-input">
          <input type="password" name="secrets-${name}" autocomplete="current-password" placeholder="Paste AES key to unlock" />
          <button class="secrets-unlock">Unlock</button>
        </div>
        <div class="secrets-error" style="display:none"></div>`;
        body.append(row);
        const input = body.querySelector("input");
        const btn = body.querySelector(".secrets-unlock");
        const errEl = body.querySelector(".secrets-error");
        async function doUnlock() {
          try {
            errEl.style.display = "none";
            const cryptoKey = await importAESKey(input.value.trim());
            await unlock(cryptoKey);
          } catch (e) {
            errEl.textContent = "Decryption failed \u2014 wrong key?";
            errEl.style.display = "block";
          }
        }
        btn.onclick = doUnlock;
        input.onkeydown = (e) => {
          if (e.key === "Enter") doUnlock();
        };
      } else {
        body.innerHTML = "";
        const gen = htl.html`<div>
          <p style="font-size:13px;color:var(--theme-foreground-muted,#aaa);margin:0 0 8px">No secrets stored yet.</p>
          <button class="secrets-generate">Generate AES Key</button>
          <div class="secrets-generated-key" style="display:none"></div>
        </div>`;
        body.append(gen);
        const btn = gen.querySelector(".secrets-generate");
        const keyDisplay = gen.querySelector(".secrets-generated-key");
        btn.onclick = async () => {
          const base64Key = await generateAESKey();
          state.cryptoKey = await importAESKey(base64Key);
          _activeKeys.set(name, state.cryptoKey);
          state.map = new Map();
          state.unlocked = true;
          state.dirty = true;
          keyDisplay.textContent = base64Key;
          keyDisplay.style.display = "block";
          btn.style.display = "none";
          const copyBtn = htl.html`<button style="margin-top:4px">Copy key to clipboard</button>`;
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(base64Key);
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = "Copy key to clipboard";
            }, 1500);
          };
          keyDisplay.after(copyBtn);
          const continueBtn = htl.html`<button style="margin-top:4px;margin-left:8px">Continue</button>`;
          continueBtn.onclick = () => {
            root.classList.remove("locked");
            root.classList.add("unlocked");
            renderUnlocked();
            dispatchValue();
          };
          copyBtn.after(continueBtn);
        };
      }
    }
    function renderUnlocked() {
      body.innerHTML = "";
      const table = htl.html`<table class="secrets-table">
        <thead><tr><th>Key</th><th>Value</th><th></th></tr></thead>
        <tbody></tbody>
      </table>`;
      const tbody = table.querySelector("tbody");
      function renderRows() {
        tbody.innerHTML = "";
        for (const [k, v] of state.map) {
          const masked = { is: true };
          const valCell = htl.html`<td class="secrets-value masked" title="Click to reveal">••••••••</td>`;
          valCell.onclick = () => {
            if (masked.is) {
              valCell.textContent = v;
              valCell.classList.remove("masked");
            } else {
              valCell.textContent =
                "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
              valCell.classList.add("masked");
            }
            masked.is = !masked.is;
          };
          const copyBtn = htl.html`<button title="Copy value" style="padding:2px 6px;font-size:11px">📋</button>`;
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(v);
            copyBtn.textContent = "\u2713";
            setTimeout(() => {
              copyBtn.textContent = "\uD83D\uDCCB";
            }, 1000);
          };
          const delBtn = htl.html`<button title="Delete" style="padding:2px 6px;font-size:11px;color:#f44">✕</button>`;
          delBtn.onclick = () => {
            state.map.delete(k);
            state.dirty = true;
            renderRows();
            updateSaveButton();
            dispatchValue();
          };
          const row = htl.html`<tr>
            <td>${k}</td>
            ${valCell}
            <td>${copyBtn} ${delBtn}</td>
          </tr>`;
          tbody.append(row);
        }
      }
      renderRows();
      const addRow = htl.html`<div class="secrets-add">
        <input placeholder="key" />
        <input placeholder="value" type="password" />
        <button>Add</button>
      </div>`;
      const [keyIn, valIn] = addRow.querySelectorAll("input");
      addRow.querySelector("button").onclick = () => {
        const k = keyIn.value.trim();
        const v = valIn.value;
        if (!k) return;
        state.map.set(k, v);
        state.dirty = true;
        keyIn.value = "";
        valIn.value = "";
        renderRows();
        updateSaveButton();
        dispatchValue();
      };
      const saveBtn = htl.html`<button class="secrets-save" style="display:none;border-color:var(--theme-accent,#4fc3f7);color:var(--theme-accent,#4fc3f7)">Save</button>`;
      saveBtn.onclick = async () => {
        try {
          saveBtn.textContent = "Saving...";
          const newData = await encryptMap(state.map, state.cryptoKey);
          console.log("[secrets] Encrypted, now self-modifying...", newData);
          await selfModify(newData);
          console.log("[secrets] Self-modification complete");
        } catch (e) {
          console.error("[secrets] save failed:", e);
          saveBtn.textContent = "Save failed!";
          setTimeout(() => {
            saveBtn.textContent = "Save";
          }, 2000);
        }
      };
      function updateSaveButton() {
        saveBtn.style.display = state.dirty ? "" : "none";
      }
      const actions = htl.html`<div class="secrets-actions">${saveBtn}</div>`;
      body.append(table, addRow, actions);
      updateSaveButton();
    }
    root.value = undefined;
    renderLocked();
    return root;
  };
};
const _eubyjh = function __activeKeys(){return(
new Map()
)};
const _15frkor = function _10(md){return(
md`### Crypto Helpers

Base64 encoding/decoding and AES-256-GCM key management. All crypto operations use the Web Crypto API (\`crypto.subtle\`).`
)};
const _1br6tx0 = function _fromBase64(){return(
str => Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer
)};
const _9vas5s = function _generateAESKey(toBase64){return(
async () => {
    const key = await crypto.subtle.generateKey({
        name: 'AES-GCM',
        length: 256
    }, true, [
        'encrypt',
        'decrypt'
    ]);
    const raw = await crypto.subtle.exportKey('raw', key);
    return toBase64(raw);
}
)};
const _foxpa8 = function _importAESKey(fromBase64){return(
async base64Key => {
    const raw = fromBase64(base64Key);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt'
    ]);
}
)};
const _5501vw = function _encryptMap(toBase64){return(
async (map, cryptoKey) => {
    const plaintext = new TextEncoder().encode(JSON.stringify(Object.fromEntries(map)));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv
    }, cryptoKey, plaintext);
    return {
        cipher: toBase64(ciphertext),
        iv: toBase64(iv)
    };
}
)};
const _ghnqjf = function _decryptMap(fromBase64){return(
async (data, cryptoKey) => {
    const ciphertext = fromBase64(data.cipher);
    const iv = fromBase64(data.iv);
    const plaintext = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv
    }, cryptoKey, ciphertext);
    return new Map(Object.entries(JSON.parse(new TextDecoder().decode(plaintext))));
}
)};
const _1gppt15 = function _toBase64(){return(
buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)))
)};
const _14hyb6m = function _17(md){return(
md`### UI Components

Themed styles using lopecode CSS variables and an SVG padlock with lock/unlock animation.`
)};
const _oeq75b = function _padlockSVG(htl){return(
htl.svg`<svg class="secrets-padlock" viewBox="0 0 32 32">
  <defs>
    <filter id="lock-glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#lock-glow)">
    <path class="lock-shackle" d="M10 14 V10 A6 6 0 0 1 22 10 V14" />
    <rect class="lock-body" x="7" y="14" width="18" height="14" rx="2" />
    <rect class="lock-keyhole" x="14.5" y="19" width="3" height="5" rx="1.5" fill="var(--theme-background, #0d0d1a)" />
  </g>
</svg>`
)};
const _1lbwzj = function _secretsStyle(md){return(
md`<style>
.secrets {
  font-family: var(--sans-serif, system-ui);
  color: var(--theme-foreground, #e0e0e0);
  background: var(--theme-background-alt, #1a1a2e);
  border: 1px solid var(--theme-foreground-faint, #333);
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}
.secrets-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.secrets-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--theme-foreground-muted, #aaa);
}
.secrets-padlock {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}
.secrets-padlock .lock-body {
  fill: var(--theme-foreground-muted, #888);
  transition: fill 0.4s ease;
}
.secrets-padlock .lock-shackle {
  stroke: var(--theme-foreground-muted, #888);
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke 0.4s ease, transform 0.4s ease;
  transform-origin: 20px 10px;
}
.secrets.unlocked .lock-body {
  fill: var(--theme-accent, #4fc3f7);
}
.secrets.unlocked .lock-shackle {
  stroke: var(--theme-accent, #4fc3f7);
  transform: rotate(-25deg) translateY(-3px);
}
.secrets.locked .secrets-padlock .lock-body {
  animation: secrets-body-pulse 3s ease-in-out infinite;
}
.secrets.locked .secrets-padlock .lock-shackle {
  animation: secrets-shackle-pulse 3s ease-in-out infinite;
}
@keyframes secrets-body-pulse {
  0%, 100% { fill: var(--theme-foreground-faint, #555); }
  50% { fill: var(--theme-foreground-muted, #888); }
}
@keyframes secrets-shackle-pulse {
  0%, 100% { stroke: var(--theme-foreground-faint, #555); }
  50% { stroke: var(--theme-foreground-muted, #888); }
}
.secrets-key-input {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.secrets-key-input input {
  flex: 1;
  font-family: var(--monospace, monospace);
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid var(--theme-foreground-faint, #444);
  border-radius: 4px;
  background: var(--theme-background, #0d0d1a);
  color: var(--theme-foreground, #e0e0e0);
}
.secrets button {
  font-size: 12px;
  padding: 6px 12px;
  border: 1px solid var(--theme-foreground-faint, #444);
  border-radius: 4px;
  background: var(--theme-background, #0d0d1a);
  color: var(--theme-foreground, #ccc);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.secrets button:hover {
  background: var(--theme-foreground-faintest, #222);
  border-color: var(--theme-accent, #4fc3f7);
}
.secrets-generated-key {
  font-family: var(--monospace, monospace);
  font-size: 11px;
  padding: 8px;
  background: var(--theme-background, #0d0d1a);
  border: 1px dashed var(--theme-accent, #4fc3f7);
  border-radius: 4px;
  word-break: break-all;
  margin: 8px 0;
  color: var(--theme-accent, #4fc3f7);
}
.secrets-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}
.secrets-table th {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--theme-foreground-faint, #333);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--theme-foreground-muted, #aaa);
}
.secrets-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--theme-foreground-faintest, #222);
  font-family: var(--monospace, monospace);
  font-size: 12px;
}
.secrets-table .secrets-value {
  cursor: pointer;
  user-select: none;
}
.secrets-table .secrets-value.masked {
  color: var(--theme-foreground-faint, #555);
  letter-spacing: 2px;
}
.secrets-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.secrets-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}
.secrets-add input {
  font-family: var(--monospace, monospace);
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--theme-foreground-faint, #444);
  border-radius: 4px;
  background: var(--theme-background, #0d0d1a);
  color: var(--theme-foreground, #e0e0e0);
  width: 120px;
}
.secrets-error {
  color: #f44;
  font-size: 12px;
  margin-top: 4px;
}
</style>`
)};
const _1btkyw9 = function _20(md){return(
md`### Imports

Runtime SDK provides access to \`runtime._variables\` for self-modification.`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_gzcybb", null, ["htl"], _gzcybb);  
  $def("_1en3hmq", "viewof secrets", ["secretStore"], _1en3hmq);  
  $def("_31aasz", "secrets", ["Generators","viewof secrets"], _31aasz);  
  $def("_kcrkmr", null, ["md","isOnObservableCom"], _kcrkmr);  
  $def("_dwefdz", null, ["md"], _dwefdz);  
  $def("_18tceen", null, ["md"], _18tceen);  
  $def("_5er114", null, ["md"], _5er114);  
  $def("_xpi2ll", null, ["md"], _xpi2ll);  
  $def("_f0cb01", "secretStore", ["runtime","_activeKeys","htl","secretsStyle","padlockSVG","Event","decryptMap","importAESKey","generateAESKey","encryptMap"], _f0cb01);  
  $def("_eubyjh", "_activeKeys", [], _eubyjh);  
  $def("_15frkor", null, ["md"], _15frkor);  
  $def("_1br6tx0", "fromBase64", [], _1br6tx0);  
  $def("_9vas5s", "generateAESKey", ["toBase64"], _9vas5s);  
  $def("_foxpa8", "importAESKey", ["fromBase64"], _foxpa8);  
  $def("_5501vw", "encryptMap", ["toBase64"], _5501vw);  
  $def("_ghnqjf", "decryptMap", ["fromBase64"], _ghnqjf);  
  $def("_1gppt15", "toBase64", [], _1gppt15);  
  $def("_14hyb6m", null, ["md"], _14hyb6m);  
  $def("_oeq75b", "padlockSVG", ["htl"], _oeq75b);  
  $def("_1lbwzj", "secretsStyle", ["md"], _1lbwzj);  
  $def("_1btkyw9", null, ["md"], _1btkyw9);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));
  return main;
}