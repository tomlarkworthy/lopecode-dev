const _1ujqe0h = function _1(md){return(
md`# atproto login`
)};
const _sx6x0d = function _loginWidgetView(loginWidget){return(
loginWidget()
)};
const _5tv5gg = function _3(md){return(
md`Reusable atproto login widget. \`session\` stays **pending** until the user is logged in (so cells that depend on it act as a login gate). After login, resolves to:

\`\`\`js
{ did, handle, pds, accessJwt, refreshJwt, authType }
\`\`\`

Two auth paths share the same output shape:

- **OAuth** *(default)* — handle → PAR + PKCE + DPoP via the user's PDS, callback bridged through \`lopecode.com/oauth/relay/<state>\`. Tokens stored locally; DPoP key is non-extractable in IndexedDB.
- **App password** — handle + app password → \`com.atproto.server.createSession\`. Works offline of \`lopecode.com\`.

Helpers:

- \`xrpc(session, path, init)\` — authenticated fetch (Bearer or DPoP, picked from \`session.authType\`) with refresh-on-401.`
)};
const _1rwo1qo = function _loginWidget(currentSession,storage,$0,dpopKeyStore,startOAuth,resolvePds)
{
    // Compact, popover-based login surface.
    //   - signed-out rest:  32px [● sign in ▾] button → click opens popover form
    //   - signed-in  rest:  32px [● @handle ▾] chip   → click opens identity card
    // Builder, not a singleton: each call returns a fresh root, so multiple
    // consumers (atproto-login panel, at-write fallback, etc.) can all show
    // their own widget. Reactive hooks: currentSession + mutable currentSession,
    // storage, dpopKeyStore, startOAuth, resolvePds.
    return () => {
        const root = document.createElement('div');
        root.style.cssText = 'position:relative;display:inline-block;font:14px Inter Tight,system-ui,sans-serif';
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const rest = document.createElement('button');
        rest.type = 'button';
        function paintRest(open) {
            if (currentSession) {
                const handle = currentSession.handle || currentSession.did;
                rest.innerHTML = `
          <span style="color:#2e7d32;font-size:8px">●</span>
          <span style="color:#1a1814">@${ esc(handle) }</span>
          <span style="color:#9b8f76;font-size:9px">${ open ? '\u25B4' : '\u25BE' }</span>`;
                rest.style.cssText = `
          display:inline-flex;align-items:center;gap:8px;
          height:32px;padding:0 10px;
          background:${ open ? '#eaddc6' : '#f5efe5' };
          border:1px solid ${ open ? '#1a1814' : '#d8cdb4' };
          font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#1a1814;
          cursor:pointer;`;
            } else {
                rest.innerHTML = `
          <span style="color:${ open ? '#f0c4b4' : '#c54f2b' }">●</span>
          <span>sign in</span>
          <span style="color:${ open ? '#f5efe5' : '#9b8f76' };opacity:.6">${ open ? '\u25B4' : '\u25BE' }</span>`;
                rest.style.cssText = `
          display:inline-flex;align-items:center;gap:8px;
          height:32px;padding:0 12px;
          background:${ open ? '#1a1814' : '#f5efe5' };
          color:${ open ? '#f5efe5' : '#1a1814' };
          border:1px solid ${ open ? '#1a1814' : '#d8cdb4' };
          font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;
          letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;`;
            }
        }
        paintRest(false);
        root.append(rest);
        let pop = null;
        const closePop = () => {
            if (pop) {
                pop.remove();
                pop = null;
                paintRest(false);
                document.removeEventListener('mousedown', onDocDown, true);
            }
        };
        const onDocDown = e => {
            if (pop && !root.contains(e.target))
                closePop();
        };
        function buildSignedInPopover() {
            const wrap = document.createElement('div');
            wrap.style.cssText = `
        position:absolute;top:100%;left:0;margin-top:6px;width:280px;
        background:#f5efe5;border:1px solid #1a1814;
        box-shadow:0 8px 0 rgba(26,24,20,0.06);
        font-family:Inter Tight,system-ui,sans-serif;color:#1a1814;
        z-index:50;`;
            const handle = currentSession.handle || currentSession.did;
            const did = currentSession.did || '';
            const method = currentSession.authType === 'oauth' ? 'oauth \xB7 pkce' : 'app password';
            wrap.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 10px;background:#eaddc6;border-bottom:1px solid #d8cdb4;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#3a342b">
          <span style="color:#c54f2b">●</span>
          <span>signed in · atproto</span>
          <span style="margin-left:auto;color:#2e7d32;letter-spacing:0.04em;text-transform:uppercase;font-size:9px">ok</span>
          <span data-act="x" style="color:#9b8f76;margin-left:8px;cursor:pointer;padding:0 4px">×</span>
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:10px">
          <div>
            <div style="font-family:'Source Serif 4',Georgia,serif;font-size:17px;font-weight:600;line-height:1.1;letter-spacing:-0.01em">@${ esc(handle) }</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#7a6f5e;word-break:break-all">${ esc(did) }</div>
          </div>
          <div style="background:#eaddc6;border:1px solid #d8cdb4;padding:6px 8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#7a6f5e;line-height:1.7">
            <div><span style="color:#9b8f76">method</span> ${ esc(method) }</div>
            <div><span style="color:#9b8f76">scope </span>bundle:read · :write · :delete</div>
          </div>
          <button data-act="logout" type="button" style="width:100%;padding:7px 10px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;background:transparent;color:#c54f2b;border:1px solid #c54f2b;cursor:pointer">sign out</button>
        </div>`;
            wrap.querySelector('[data-act=x]').addEventListener('click', closePop);
            wrap.querySelector('[data-act=logout]').addEventListener('click', async () => {
                const wasOAuth = currentSession?.authType === 'oauth';
                const dpopKeyId = currentSession?.dpopKeyId;
                storage.clear();
                $0.value = null;
                if (wasOAuth && dpopKeyId) {
                    await dpopKeyStore.delete(dpopKeyId).catch(() => {
                    });
                }
                closePop();
            });
            return wrap;
        }
        function buildSignedOutPopover() {
            const wrap = document.createElement('div');
            wrap.style.cssText = `
        position:absolute;top:100%;left:0;margin-top:6px;width:340px;
        background:#f5efe5;border:1px solid #1a1814;
        box-shadow:0 8px 0 rgba(26,24,20,0.06);
        font-family:Inter Tight,system-ui,sans-serif;color:#1a1814;
        z-index:50;`;
            const labelStyle = 'font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:#7a6f5e;margin-bottom:4px;display:block';
            const inputStyle = 'width:100%;padding:8px 10px;border:1px solid #d8cdb4;background:#f5efe5;font:13px \'JetBrains Mono\',ui-monospace,monospace;color:#1a1814;box-sizing:border-box';
            wrap.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 10px;background:#eaddc6;border-bottom:1px solid #d8cdb4;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#3a342b">
          <span style="color:#c54f2b">●</span>
          <span>sign in · atproto</span>
          <span data-status style="margin-left:auto;color:#7a6f5e;letter-spacing:0.04em;text-transform:uppercase;font-size:9px">idle</span>
          <span data-act="x" style="color:#9b8f76;margin-left:8px;cursor:pointer;padding:0 4px">×</span>
        </div>
        <form data-form style="padding:12px;display:flex;flex-direction:column;gap:10px">
          <label>
            <span style="${ labelStyle }">handle</span>
            <input name="handle" placeholder="alice.bsky.social" autocomplete="username" required style="${ inputStyle }">
          </label>
          <label>
            <span style="${ labelStyle }">app password <span style="color:#9b8f76;text-transform:none;letter-spacing:0">(optional, for app-pw login)</span></span>
            <input name="appPassword" type="password" placeholder="xxxx-xxxx-xxxx-xxxx" autocomplete="current-password" style="${ inputStyle }">
          </label>
          <div data-msg style="display:none;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;line-height:1.6;border:1px solid #d8cdb4;border-left:3px solid #c54f2b;background:#f5efe5;padding:6px 8px;color:#3a342b"></div>
          <div style="display:flex;gap:8px">
            <button data-act="oauth" type="button" style="flex:1;padding:8px 12px;font-family:Inter Tight,sans-serif;font-size:13px;font-weight:500;background:#1a1814;color:#f5efe5;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between"><span>Continue with OAuth</span><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;opacity:.7">↵</span></button>
            <button data-act="apppw" type="submit" style="padding:8px 12px;font-family:Inter Tight,sans-serif;font-size:13px;background:transparent;color:#3a342b;border:1px solid #d8cdb4;cursor:pointer">App password</button>
          </div>
          <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#9b8f76;line-height:1.6">resolves <span style="color:#3a342b">@handle</span> → DID, then bounces to your PDS. <a href="https://bsky.app/settings/app-passwords" target="_blank" style="color:#1f4fb0">create app password ↗</a></div>
        </form>`;
            const form = wrap.querySelector('[data-form]');
            const statusEl = wrap.querySelector('[data-status]');
            const msgEl = wrap.querySelector('[data-msg]');
            const oauthBtn = wrap.querySelector('[data-act=oauth]');
            const apppwBtn = wrap.querySelector('[data-act=apppw]');
            const setStatus = (label, tone) => {
                statusEl.textContent = label;
                statusEl.style.color = tone === 'err' ? '#c54f2b' : tone === 'work' ? '#3a342b' : tone === 'ok' ? '#2e7d32' : '#7a6f5e';
            };
            const showMsg = (text, tone) => {
                msgEl.style.display = 'block';
                msgEl.style.borderLeftColor = tone === 'err' ? '#c54f2b' : '#7a6f5e';
                msgEl.textContent = text;
            };
            wrap.querySelector('[data-act=x]').addEventListener('click', closePop);
            oauthBtn.addEventListener('click', () => {
                const handle = form.handle.value.trim();
                if (!handle) {
                    showMsg('Enter your handle first.', 'err');
                    form.handle.focus();
                    return;
                }
                const popup = window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1');
                if (!popup) {
                    showMsg('Popup blocked. Allow popups and try again.', 'err');
                    return;
                }
                setStatus('redirecting', 'work');
                oauthBtn.disabled = true;
                apppwBtn.disabled = true;
                (async () => {
                    try {
                        const session = await startOAuth(handle, { popup });
                        storage.save(session);
                        $0.value = session;
                    } catch (err) {
                        showMsg(`OAuth failed: ${ err.message }`, 'err');
                        setStatus('rejected', 'err');
                        oauthBtn.disabled = false;
                        apppwBtn.disabled = false;
                    }
                })();
            });
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const handle = form.handle.value.trim();
                const password = form.appPassword.value.trim();
                if (!password) {
                    showMsg('Enter an app password, or use OAuth instead.', 'err');
                    return;
                }
                setStatus('verifying', 'work');
                oauthBtn.disabled = true;
                apppwBtn.disabled = true;
                try {
                    const {pds} = await resolvePds(handle);
                    const r = await fetch(`${ pds }/xrpc/com.atproto.server.createSession`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            identifier: handle,
                            password
                        })
                    });
                    if (!r.ok)
                        throw new Error(`createSession ${ r.status }: ${ await r.text() }`);
                    const data = await r.json();
                    const session = {
                        did: data.did,
                        handle: data.handle,
                        pds,
                        accessJwt: data.accessJwt,
                        refreshJwt: data.refreshJwt,
                        authType: 'app-password'
                    };
                    storage.save(session);
                    form.appPassword.value = '';
                    $0.value = session;
                } catch (err) {
                    showMsg(`Login failed: ${ err.message }`, 'err');
                    setStatus('rejected', 'err');
                    oauthBtn.disabled = false;
                    apppwBtn.disabled = false;
                }
            });
            return wrap;
        }
        rest.addEventListener('click', () => {
            if (pop) {
                closePop();
                return;
            }
            pop = currentSession ? buildSignedInPopover() : buildSignedOutPopover();
            root.append(pop);
            paintRest(true);
            setTimeout(() => document.addEventListener('mousedown', onDocDown, true), 0);
        });
        return root;
    };
};
const _154siwy = function _session(currentSession){return(
currentSession || new Promise(() => {
})
)};
const _y11tdh = function _currentSession(storage){return(
storage.load()
)};
const _1ct4sk5 = (M, _) => new M(_);
const _1pujvzk = _ => _.generator;
const _1rr72v2 = function _7(md){return(
md`---
## Requesting additional scopes

The default OAuth scope grants \`com.lopecode.bundle\` writes and blob uploads — enough to publish a lopebook, nothing else. Other lexicons (Bluesky posts, standard.site documents, …) are gated behind \`ensureScopes(scopes, opts?)\` so the user grants them only on the gesture that needs them, not at sign-in.

\`\`\`js
import {ensureScopes} from "@tomlarkworthy/at-login"

button.addEventListener("click", async () => {
  // The popup MUST be opened synchronously in the click handler so the
  // browser counts it as a user gesture and doesn't block it.
  const popup = window.open("about:blank", "atproto-oauth", "width=480,height=720,popup=1");
  await ensureScopes(["repo:app.bsky.feed.post"], {popup});
  // \`currentSession.scopes\` now includes the new scope; proceed with the action.
});
\`\`\`

- If the requested scopes are already in the session, this resolves to the existing session without opening a popup.
- App-password sessions have unrestricted repo access by construction, so this is a no-op for them — call sites can be auth-method-agnostic.
- The requested scopes must be declared in the client metadata at \`lopecode.com/oauth/client.json\`; otherwise the OAuth server returns \`invalid_scope\`.`
)};
const _h9oife = function _8(currentSession,htl,Inputs,ensureScopes)
{
    const BSKY = 'repo:app.bsky.feed.post';
    const granted = !!(currentSession && (currentSession.scopes || []).includes(BSKY));
    const isAppPw = currentSession?.authType === 'app-password';
    const initialMsg = !currentSession ? '\xB7 sign in first (see widget above)' : granted ? '\u2713 Bluesky scope already in this session' : isAppPw ? '\xB7 app-password sessions have unrestricted access \u2014 no-op' : '\xB7 not granted yet \u2014 click to request';
    const status = htl.html`<pre style="margin:0;padding:6px 8px;font:11px 'JetBrains Mono',ui-monospace,monospace;color:#7a6f5e;background:#eaddc6;border:1px solid #d8cdb4;white-space:pre-wrap">${ initialMsg }</pre>`;
    const btn = Inputs.button(granted ? '\u2713 have Bluesky scope' : 'Request Bluesky scope');
    // Inputs.button wraps a real <button> inside a <form>. Bind the click on
    // the inner button directly so window.open counts as a user gesture (the
    // form's "input" event fires after, too late for popup-blocker bypass).
    const innerBtn = btn.querySelector('button');
    if (innerBtn) {
        innerBtn.addEventListener('click', async () => {
            if (!currentSession) {
                status.textContent = '\u2717 not signed in';
                return;
            }
            const popup = window.open('about:blank', 'atproto-oauth', 'width=480,height=720,popup=1');
            if (!popup) {
                status.textContent = '\u2717 popup blocked';
                return;
            }
            status.textContent = 'requesting\u2026';
            try {
                const fresh = await ensureScopes([BSKY], { popup });
                status.textContent = '\u2713 scopes now: ' + JSON.stringify(fresh.scopes);
            } catch (err) {
                status.textContent = '\u2717 ' + err.message;
                try {
                    popup.close();
                } catch {
                }
            }
        });
    }
    return htl.html`<div style="display:flex;flex-direction:column;gap:8px;max-width:520px">${ btn }${ status }</div>`;
};
const _12tjl53 = function _xrpc(dpopKeyStore,storage,dpopFetch,URLSearchParams,OAUTH)
{
    return async (session, path, init = {}) => {
        if (!session)
            throw new Error('xrpc: not logged in');
        const url = `${ session.pds }/xrpc/${ path }`;
        if (session.authType === 'oauth') {
            const stored = await dpopKeyStore.get(session.dpopKeyId);
            if (!stored) {
                storage.clear();
                throw new Error('DPoP key missing \u2014 please log in again');
            }
            const keyPair = stored.privateKey ? stored : stored.keyPair || stored;
            const callResource = async () => {
                const r = await dpopFetch(keyPair, url, init, {
                    initialNonce: session.dpopNonce,
                    accessToken: session.accessJwt
                });
                if (r.nonce) {
                    session.dpopNonce = r.nonce;
                    storage.save(session);
                }
                return r;
            };
            let {res} = await callResource();
            if (res.ok)
                return res;
            // 401 with token-expiry signal → refresh, then replay the call once.
            const peek = await res.clone().json().catch(() => null);
            const tokenExpired = res.status === 401 && (peek?.error === 'invalid_token' || peek?.error === 'ExpiredToken');
            if (!tokenExpired)
                return res;
            const refreshBody = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: session.refreshJwt,
                client_id: OAUTH.CLIENT_ID
            });
            const rf = await dpopFetch(keyPair, session.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: refreshBody
            }, { initialNonce: session.dpopNonce });
            if (!rf.res.ok) {
                storage.clear();
                await dpopKeyStore.delete(session.dpopKeyId);
                throw new Error('OAuth session expired \u2014 please log in again');
            }
            const tokens = await rf.res.json();
            session.accessJwt = tokens.access_token;
            if (tokens.refresh_token)
                session.refreshJwt = tokens.refresh_token;
            session.expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
            session.dpopNonce = rf.nonce || session.dpopNonce;
            storage.save(session);
            ({res} = await callResource());
            return res;
        }
        // app-password / Bearer path
        const callOnce = jwt => fetch(url, {
            ...init,
            headers: {
                ...init.headers || {},
                authorization: `Bearer ${ jwt }`
            }
        });
        let r = await callOnce(session.accessJwt);
        if (r.ok)
            return r;
        const body = await r.clone().json().catch(() => null);
        if (body?.error !== 'ExpiredToken')
            return r;
        const rr = await fetch(`${ session.pds }/xrpc/com.atproto.server.refreshSession`, {
            method: 'POST',
            headers: { authorization: `Bearer ${ session.refreshJwt }` }
        });
        if (!rr.ok) {
            storage.clear();
            throw new Error('session expired; please log in again');
        }
        const refreshed = await rr.json();
        session.accessJwt = refreshed.accessJwt;
        session.refreshJwt = refreshed.refreshJwt;
        storage.save(session);
        return callOnce(session.accessJwt);
    };
};
const _1kwp0ps = function _startOAuth(resolvePds,discoverAuthServer,dpopKeyStore,pkce,base64url,OAUTH,URLSearchParams,dpopFetch)
{
    return async (handle, opts = {}) => {
        if (!handle)
            throw new Error('Handle required for OAuth login');
        const cleanHandle = String(handle).trim().replace(/^@/, '');
        let popup = opts.popup;
        const closePopup = () => {
            try {
                if (popup && !popup.closed)
                    popup.close();
            } catch {
            }
        };
        let dpopKeyId;
        try {
            const {did, pds} = await resolvePds(cleanHandle);
            const meta = await discoverAuthServer(pds);
            const created = await dpopKeyStore.create();
            dpopKeyId = created.id;
            const keyPair = created.keyPair;
            const {verifier, challenge} = await pkce();
            // 24 random bytes → 32-char base64url state. Fits the relay regex
            // ([A-Za-z0-9_-]{16,128}) and gives 192 bits of entropy.
            const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
            const scope = String(opts.scope || OAUTH.SCOPE).trim();
            const parBody = new URLSearchParams({
                response_type: 'code',
                client_id: OAUTH.CLIENT_ID,
                redirect_uri: OAUTH.REDIRECT_URI,
                scope,
                state,
                code_challenge: challenge,
                code_challenge_method: 'S256',
                login_hint: cleanHandle
            });
            const par = await dpopFetch(keyPair, meta.pushed_authorization_request_endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: parBody
            });
            if (!par.res.ok)
                throw new Error(`PAR failed (${ par.res.status }): ${ await par.res.text() }`);
            const {request_uri} = await par.res.json();
            let nonce = par.nonce;
            const authUrl = `${ meta.authorization_endpoint }?${ new URLSearchParams({
                client_id: OAUTH.CLIENT_ID,
                request_uri
            }) }`;
            if (popup) {
                popup.location.href = authUrl;
            } else {
                popup = window.open(authUrl, 'atproto-oauth', 'width=480,height=720,popup=1');
                if (!popup)
                    throw new Error('Popup blocked. Allow popups for this page and try again.');
            }
            // Poll the server-side relay keyed by `state`. We can't observe the
            // popup directly: COOP severance from the auth server makes
            // `popup.closed` unreliable, and Chrome's storage partitioning
            // blocks BroadcastChannel between an iframe-of-lopecode.com inside
            // a file:// notebook and the top-level lopecode.com popup. The relay
            // (Worker-backed cache, delete-on-read, 5min TTL) is the path that
            // works regardless of origin or partition.
            const relayUrl = `${ OAUTH.CALLBACK_ORIGIN }/oauth/relay/${ encodeURIComponent(state) }`;
            const TIMEOUT_MS = 5 * 60 * 1000;
            const POLL_MS = 1500;
            const deadline = Date.now() + TIMEOUT_MS;
            let params;
            while (true) {
                if (Date.now() > deadline)
                    throw new Error('OAuth timed out after 5 minutes \u2014 close the popup and try again');
                const res = await fetch(relayUrl, {
                    method: 'GET',
                    credentials: 'omit',
                    cache: 'no-store'
                });
                if (res.status === 200) {
                    params = await res.json();
                    break;
                }
                if (res.status !== 404) {
                    throw new Error(`OAuth relay error: ${ res.status } ${ await res.text() }`);
                }
                await new Promise(r => setTimeout(r, POLL_MS));
            }
            if (params.error)
                throw new Error(`${ params.error }: ${ params.error_description || '' }`.trim());
            if (!params.code)
                throw new Error('Auth server returned no code');
            if (params.state !== state)
                throw new Error('OAuth state mismatch');
            if (params.iss && params.iss !== meta.issuer)
                throw new Error('OAuth issuer mismatch');
            closePopup();
            const tokenBody = new URLSearchParams({
                grant_type: 'authorization_code',
                code: params.code,
                code_verifier: verifier,
                client_id: OAUTH.CLIENT_ID,
                redirect_uri: OAUTH.REDIRECT_URI
            });
            const tok = await dpopFetch(keyPair, meta.token_endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenBody
            }, { initialNonce: nonce });
            if (!tok.res.ok)
                throw new Error(`Token exchange failed (${ tok.res.status }): ${ await tok.res.text() }`);
            const tokens = await tok.res.json();
            // Granted scopes: prefer what the auth server echoes back (some servers
            // narrow), falling back to what we requested.
            const grantedScopes = String(tokens.scope || scope).split(/\s+/).filter(Boolean);
            return {
                did: tokens.sub || did,
                handle: cleanHandle,
                pds,
                accessJwt: tokens.access_token,
                refreshJwt: tokens.refresh_token,
                authType: 'oauth',
                scopes: grantedScopes,
                dpopKeyId,
                dpopNonce: tok.nonce || null,
                issuedAt: Date.now(),
                expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
                authIssuer: meta.issuer,
                tokenEndpoint: meta.token_endpoint
            };
        } catch (err) {
            closePopup();
            if (dpopKeyId)
                await dpopKeyStore.delete(dpopKeyId).catch(() => {
                });
            throw err;
        }
    };
};
const _1f7wrv0 = function _ensureScopes(currentSession,startOAuth,storage,$0)
{
    return async (requestedScopes, opts = {}) => {
        // Idempotent OAuth scope upgrade. Pass the scopes the caller needs; if
        // the current session already has them this resolves immediately to the
        // existing session. Otherwise, re-runs the OAuth flow with the union of
        // current and requested scopes, replaces the stored session, and resolves
        // to the new session.
        //
        // Must be called from a user gesture (click handler) because it ultimately
        // opens a popup — browsers block popups opened from non-gesture async
        // contexts. Pass `opts.popup` if you pre-opened one synchronously.
        //
        // App-password sessions have blanket repo access — no per-scope concept —
        // so this returns the existing session unchanged so callers can use the
        // same code path regardless of auth method.
        if (!currentSession) {
            throw new Error('ensureScopes: not signed in');
        }
        if (currentSession.authType !== 'oauth') {
            return currentSession;
        }
        const required = Array.isArray(requestedScopes) ? requestedScopes : [requestedScopes];
        const have = new Set(currentSession.scopes || []);
        const missing = required.filter(s => !have.has(s));
        if (missing.length === 0) {
            return currentSession;
        }
        const unioned = [...new Set([
                ...have,
                ...missing
            ])].join(' ');
        const fresh = await startOAuth(currentSession.handle, {
            ...opts,
            scope: unioned
        });
        storage.save(fresh);
        $0.value = fresh;
        return fresh;
    };
};
const _1btf4wd = function _discoverAuthServer()
{
    return async pds => {
        const prRes = await fetch(`${ pds }/.well-known/oauth-protected-resource`);
        if (!prRes.ok)
            throw new Error(`oauth-protected-resource: ${ prRes.status }`);
        const pr = await prRes.json();
        const authServer = pr.authorization_servers?.[0];
        if (!authServer)
            throw new Error('PDS lists no authorization_servers');
        const asRes = await fetch(`${ authServer }/.well-known/oauth-authorization-server`);
        if (!asRes.ok)
            throw new Error(`oauth-authorization-server: ${ asRes.status }`);
        const meta = await asRes.json();
        // Spot-check the metadata covers what we depend on.
        const required = [
            'issuer',
            'authorization_endpoint',
            'token_endpoint',
            'pushed_authorization_request_endpoint'
        ];
        for (const k of required)
            if (!meta[k])
                throw new Error(`auth server metadata missing ${ k }`);
        return meta;
    };
};
const _wk6fyi = function _dpopFetch(makeDPoP)
{
    return async (keyPair, url, init = {}, {initialNonce, accessToken} = {}) => {
        const method = (init.method || 'GET').toUpperCase();
        const send = async nonce => {
            const proof = await makeDPoP(keyPair, method, url, {
                nonce,
                accessToken
            });
            return fetch(url, {
                ...init,
                headers: {
                    ...init.headers || {},
                    DPoP: proof,
                    ...accessToken ? { authorization: `DPoP ${ accessToken }` } : {}
                }
            });
        };
        let res = await send(initialNonce);
        let nextNonce = res.headers.get('DPoP-Nonce') || initialNonce || null;
        // Retry once with server-issued nonce if the first attempt was rejected
        // for that reason. Status can be 400 (auth server) or 401 (resource).
        if (!res.ok && (res.status === 400 || res.status === 401)) {
            const headerNonce = res.headers.get('DPoP-Nonce');
            if (headerNonce) {
                const body = await res.clone().json().catch(() => null);
                if (body && (body.error === 'use_dpop_nonce' || body.error === 'invalid_dpop_proof')) {
                    res = await send(headerNonce);
                    nextNonce = res.headers.get('DPoP-Nonce') || headerNonce;
                }
            }
        }
        return {
            res,
            nonce: nextNonce
        };
    };
};
const _64ycfy = function _dpopKeyStore(indexedDB)
{
    return {
        _DB_NAME: 'atproto.oauth',
        _DB_VERSION: 1,
        _STORE: 'dpop_keys',
        async _open() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(this._DB_NAME, this._DB_VERSION);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this._STORE)) {
                        db.createObjectStore(this._STORE);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },
        async create() {
            const keyPair = await crypto.subtle.generateKey({
                name: 'ECDSA',
                namedCurve: 'P-256'
            }, false, // private key is non-extractable
            [
                'sign',
                'verify'
            ]);
            const id = crypto.randomUUID();
            const db = await this._open();
            await new Promise((res, rej) => {
                const tx = db.transaction(this._STORE, 'readwrite');
                tx.objectStore(this._STORE).put(keyPair, id);
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
            });
            return {
                id,
                keyPair
            };
        },
        async get(id) {
            const db = await this._open();
            return new Promise((res, rej) => {
                const tx = db.transaction(this._STORE, 'readonly');
                const req = tx.objectStore(this._STORE).get(id);
                req.onsuccess = () => res(req.result || null);
                req.onerror = () => rej(req.error);
            });
        },
        async delete(id) {
            const db = await this._open();
            return new Promise((res, rej) => {
                const tx = db.transaction(this._STORE, 'readwrite');
                tx.objectStore(this._STORE).delete(id);
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
            });
        }
    };
};
const _9jsx0c = function _makeDPoP(base64url)
{
    return async (keyPair, htm, htu, {nonce, accessToken} = {}) => {
        const url = new URL(htu);
        const htuClean = `${ url.origin }${ url.pathname }`;
        const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const header = {
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: {
                kty: publicJwk.kty,
                crv: publicJwk.crv,
                x: publicJwk.x,
                y: publicJwk.y
            }
        };
        const payload = {
            jti: base64url(crypto.getRandomValues(new Uint8Array(16))),
            htm: htm.toUpperCase(),
            htu: htuClean,
            iat: Math.floor(Date.now() / 1000)
        };
        if (nonce)
            payload.nonce = nonce;
        if (accessToken) {
            payload.ath = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken)));
        }
        const enc = o => base64url(new TextEncoder().encode(JSON.stringify(o)));
        const signingInput = `${ enc(header) }.${ enc(payload) }`;
        // WebCrypto returns ECDSA sigs in IEEE P1363 (raw r||s) — the format
        // JWS expects. No DER unwrap needed.
        const sig = await crypto.subtle.sign({
            name: 'ECDSA',
            hash: 'SHA-256'
        }, keyPair.privateKey, new TextEncoder().encode(signingInput));
        return `${ signingInput }.${ base64url(sig) }`;
    };
};
const _1294fc7 = function _pkce(base64url){return(
async () => {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return {
        verifier,
        challenge
    };
}
)};
const _xhwjxa = function _base64url(){return(
input => {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : new TextEncoder().encode(String(input));
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
)};
const _1gzy5x4 = function _OAUTH(){return(
{
    CLIENT_ID: 'https://lopecode.com/oauth/client.json',
    REDIRECT_URI: 'https://lopecode.com/oauth/callback',
    SCOPE: 'atproto repo:com.lopecode.bundle repo:com.lopecode.bundle.version blob:*/*',
    CALLBACK_ORIGIN: 'https://lopecode.com'
}
)};
const _1ham9hq = function _SESSION_KEY(){return(
'atproto.session.v1'
)};
const _1ezww3k = function _storage(safeStorage,SESSION_KEY)
{
    return {
        // safeStorage is the renamed import from @mbostock/safe-local-storage —
        // bare `localStorage` would collide with the JS global and throw in
        // sandboxed iframes. Falls back to in-memory Storage when the real one
        // is unavailable, so a sandboxed at-read consumer importing this module
        // doesn't crash on first read.
        load() {
            try {
                const raw = safeStorage.getItem(SESSION_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    // Backfill scopes[] for OAuth sessions saved before this field
                    // existed. We assume the session was granted exactly what the
                    // module currently configures by default — true for any session
                    // signed in after the previous deploy.
                    if (parsed && parsed.authType === 'oauth' && !Array.isArray(parsed.scopes)) {
                        parsed.scopes = 'atproto repo:com.lopecode.bundle repo:com.lopecode.bundle.version blob:*/*'.split(/\s+/).filter(Boolean);
                    }
                    return parsed;
                }
            } catch {
            }
            // One-time migration from v0's `lopejack.session` so existing users
            // don't have to re-enter their app password.
            try {
                const legacy = safeStorage.getItem('lopejack.session');
                if (legacy) {
                    const parsed = JSON.parse(legacy);
                    const upgraded = {
                        ...parsed,
                        authType: 'app-password'
                    };
                    safeStorage.setItem(SESSION_KEY, JSON.stringify(upgraded));
                    // One-shot migration: drop the legacy key so a later
                    // clear() actually persists across reloads instead of
                    // having load() re-migrate the session back from the
                    // legacy slot every time.
                    safeStorage.removeItem('lopejack.session');
                    return upgraded;
                }
            } catch {
            }
            return null;
        },
        save(session) {
            safeStorage.setItem(SESSION_KEY, JSON.stringify(session));
        },
        clear() {
            safeStorage.removeItem(SESSION_KEY);
            // Also wipe the v0 legacy key, otherwise load()'s migration path
            // re-persists the session on next load and undoes the sign-out.
            safeStorage.removeItem('lopejack.session');
        }
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @mbostock/safe-local-storage", async () => runtime.module((await import("/@mbostock/safe-local-storage.js?v=4")).default));  
  main.define("module @tomlarkworthy/atproto", async () => runtime.module((await import("/@tomlarkworthy/atproto.js?v=4")).default));  
  $def("_1ujqe0h", null, ["md"], _1ujqe0h);  
  $def("_sx6x0d", "loginWidgetView", ["loginWidget"], _sx6x0d);  
  $def("_5tv5gg", null, ["md"], _5tv5gg);  
  $def("_1rwo1qo", "loginWidget", ["currentSession","storage","mutable currentSession","dpopKeyStore","startOAuth","resolvePds"], _1rwo1qo);  
  $def("_154siwy", "session", ["currentSession"], _154siwy);  
  $def("_y11tdh", "initial currentSession", ["storage"], _y11tdh);  
  $def("_1ct4sk5", "mutable currentSession", ["Mutable","initial currentSession"], _1ct4sk5);  
  $def("_1pujvzk", "currentSession", ["mutable currentSession"], _1pujvzk);  
  $def("_1rr72v2", null, ["md"], _1rr72v2);  
  $def("_h9oife", null, ["currentSession","htl","Inputs","ensureScopes"], _h9oife);  
  $def("_12tjl53", "xrpc", ["dpopKeyStore","storage","dpopFetch","URLSearchParams","OAUTH"], _12tjl53);  
  $def("_1kwp0ps", "startOAuth", ["resolvePds","discoverAuthServer","dpopKeyStore","pkce","base64url","OAUTH","URLSearchParams","dpopFetch"], _1kwp0ps);  
  $def("_1f7wrv0", "ensureScopes", ["currentSession","startOAuth","storage","mutable currentSession"], _1f7wrv0);  
  $def("_1btf4wd", "discoverAuthServer", [], _1btf4wd);  
  $def("_wk6fyi", "dpopFetch", ["makeDPoP"], _wk6fyi);  
  $def("_64ycfy", "dpopKeyStore", ["indexedDB"], _64ycfy);  
  $def("_9jsx0c", "makeDPoP", ["base64url"], _9jsx0c);  
  $def("_1294fc7", "pkce", ["base64url"], _1294fc7);  
  $def("_xhwjxa", "base64url", [], _xhwjxa);  
  $def("_1gzy5x4", "OAUTH", [], _1gzy5x4);  
  $def("_1ham9hq", "SESSION_KEY", [], _1ham9hq);  
  $def("_1ezww3k", "storage", ["safeStorage","SESSION_KEY"], _1ezww3k);  
  main.define("safeStorage", ["module @mbostock/safe-local-storage", "@variable"], (_, v) => v.import("localStorage", "safeStorage", _));  
  main.define("resolvePds", ["module @tomlarkworthy/atproto", "@variable"], (_, v) => v.import("resolvePds", _));
  return main;
}