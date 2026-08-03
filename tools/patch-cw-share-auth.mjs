// Splice the `viewof session` definition back into the cw-share-auth module block.
// export_module/export_notebook drop it because deleting+redefining the cell left the
// exporter's ordered-cell registry stale. Deterministic fix, verified by booting the file.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html';
const html = readFileSync(FILE, 'utf8');

// The exporter emits a trailing space after the id attribute; match the header loosely.
const header = /<script id="@tomlarkworthy\/cw-share-auth"\s*\n\s*type="text\/plain"\s*\n\s*data-mime="application\/javascript"\s*\n>\n/;
const m0 = header.exec(html);
if (!m0) throw new Error('module block not found');
const bodyStart = m0.index + m0[0].length;
const bodyEnd = html.indexOf("\n</script>", bodyStart);
if (bodyEnd < 0) throw new Error('module block end not found');
let body = html.slice(bodyStart, bodyEnd);

// Guard on the $def *registration*, not any mention — "viewof session" also appears in
// the `session` extractor's dependency list.
if (/\$def\("[^"]+", "viewof session"/.test(body)) {
  console.log('already present — nothing to do');
  process.exit(0);
}

const DEPS = ['htl', 'exchangeForAwsCredentials', 'parseShareLink', 'srpLogin', 'tokenStore', 'refreshLogin', 'defaultShareLink'];
const PID = '_vsess01';

const fn = `const ${PID} = function _session(${DEPS.join(',')}){
  const el = htl.html\`<div style="font:13px/1.5 system-ui,sans-serif;display:grid;gap:8px;max-width:560px">\`;
  const linkI = htl.html\`<input type=url style="width:100%;padding:5px" placeholder="https://cloudwatch.amazonaws.com/dashboard.html?dashboard=…&context=…">\`;
  const userI = htl.html\`<input type=email autocomplete=username style="width:100%;padding:5px" placeholder="you@example.com">\`;
  const passI = htl.html\`<input type=password autocomplete=current-password style="width:100%;padding:5px" placeholder="password">\`;
  const rememberI = htl.html\`<input type=checkbox checked>\`;
  const go = htl.html\`<button style="padding:6px 14px">Sign in</button>\`;
  const out = htl.html\`<button style="padding:6px 14px">Sign out</button>\`;
  const status = htl.html\`<div style="min-height:1.5em;color:#666"></div>\`;

  const row = (label, input) => htl.html\`<label style="display:grid;gap:2px"><span style="color:#666">\${label}</span>\${input}</label>\`;
  el.append(
    row('Share link', linkI), row('Email', userI), row('Password', passI),
    htl.html\`<label style="display:flex;gap:6px;align-items:center">\${rememberI}<span>Stay signed in on this machine (stores an encrypted refresh token)</span></label>\`,
    htl.html\`<div style="display:flex;gap:8px">\${go}\${out}</div>\`,
    status
  );

  const say = (msg, colour) => { status.textContent = msg; status.style.color = colour || '#666'; };
  const publish = (v) => { el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };

  const finish = async (cfg, authResult, username) => {
    const creds = await exchangeForAwsCredentials(cfg, authResult.IdToken);
    publish({ cfg, username, credentials: creds, idToken: authResult.IdToken });
    say('Signed in as ' + username + ' — credentials valid until ' + creds.expiresAt.toLocaleTimeString(), '#080');
  };

  const signIn = async () => {
    go.disabled = true;
    try {
      say('Parsing share link…');
      const cfg = parseShareLink(linkI.value);
      if (cfg.mode !== 'UsrPwSingle') say('Note: share mode is ' + cfg.mode + ', not UsrPwSingle', '#a60');
      say('Authenticating (SRP)…');
      const res = await srpLogin(cfg, userI.value, passI.value);
      if (res.ChallengeName) {
        say('Cognito returned challenge ' + res.ChallengeName + ' — not yet handled', '#a60');
        return;
      }
      const auth = res.AuthenticationResult;
      if (rememberI.checked && auth.RefreshToken) await tokenStore.save(cfg, userI.value, auth.RefreshToken);
      passI.value = '';
      say('Exchanging for AWS credentials…');
      await finish(cfg, auth, userI.value);
    } catch (e) {
      say(e.name + ': ' + e.message, '#c00');
      publish(null);
    } finally { go.disabled = false; }
  };

  const resume = async () => {
    let cfg;
    try { cfg = parseShareLink(linkI.value); } catch (e) { return; }
    const saved = await tokenStore.load(cfg);
    if (!saved) return;
    try {
      say('Resuming session for ' + saved.username + '…');
      userI.value = saved.username;
      const res = await refreshLogin(cfg, saved.refreshToken);
      await finish(cfg, res.AuthenticationResult, saved.username);
    } catch (e) {
      tokenStore.clear(cfg);
      say('Stored session expired — sign in again (' + e.name + ')', '#a60');
    }
  };

  go.onclick = signIn;
  passI.onkeydown = (e) => { if (e.key === 'Enter') signIn(); };
  out.onclick = () => {
    try { tokenStore.clear(parseShareLink(linkI.value)); } catch (e) {}
    passI.value = '';
    publish(null);
    say('Signed out');
  };

  el.value = null;
  linkI.value = defaultShareLink;
  resume();
  return el;
};
`;

// 1. insert the function const just before `export default function define(`
const anchor = 'export default function define(runtime, observer) {';
if (!body.includes(anchor)) throw new Error('define() anchor not found');
body = body.replace(anchor, fn + '\n' + anchor);

// 2. insert the $def line immediately before the `session` extractor registration
const sessionDef = body.match(/^\s*\$def\("[^"]+", "session",.*$/m);
if (!sessionDef) throw new Error('session $def not found');
const defLine = `  $def("${PID}", "viewof session", ${JSON.stringify(DEPS)}, ${PID});  \n`;
body = body.replace(sessionDef[0], defLine + sessionDef[0]);

writeFileSync(FILE, html.slice(0, bodyStart) + body + html.slice(bodyEnd));
console.log('patched: added viewof session (' + DEPS.length + ' deps)');
