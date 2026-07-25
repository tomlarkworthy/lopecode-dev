/**
 * observable-auth.js - Shared ObservableHQ REST auth + document lookup.
 *
 * Used by lope-push-ws.js (cell push) and lope-push-files.js (file attachment
 * upload). See knowledge/pushing-cells-to-observablehq.md for the cookie-paste
 * workflow; headless Playwright cookie extraction is unreliable.
 */

import fs from 'fs';

export const API = 'https://api.observablehq.com';

/** The I cookie is a JWT whose base64url payload carries `expiration` (epoch ms). */
export function decodeICookieExpiration(iValue) {
  try {
    const middle = iValue.split('.')[0];
    const json = Buffer.from(middle, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return typeof payload.expiration === 'number' ? payload.expiration : null;
  } catch {
    return null;
  }
}

export function cookieHeader(cookies) {
  return `T=${cookies.T}; I=${cookies.I}`;
}

/**
 * Read T/I cookies from a JSON file and validate them against /user.
 * Returns { T, I, login }.
 */
export async function loadCookiesFromFile(cookiesFile, log = () => {}) {
  const parsed = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
  if (!parsed.T || !parsed.I) {
    throw new Error(`${cookiesFile}: missing 'T' or 'I' field`);
  }
  // Surface staleness BEFORE hitting the API so the user knows which to refresh.
  const iExpiry = decodeICookieExpiration(parsed.I);
  if (iExpiry && iExpiry < Date.now()) {
    throw new Error(
      `${cookiesFile}: I cookie expired on ${new Date(iExpiry).toISOString()} ` +
      `(${Math.round((Date.now() - iExpiry) / 86400000)} day(s) ago). Refresh I from devtools.`
    );
  }
  const resp = await fetch(`${API}/user`, {
    headers: { 'Cookie': `I=${parsed.I}; T=${parsed.T}`, 'Origin': 'https://observablehq.com' },
  });
  const user = await resp.json();
  if (!user?.login) {
    const iDesc = iExpiry
      ? `I expires ${new Date(iExpiry).toISOString()} (not stale)`
      : 'I payload not decodable';
    throw new Error(
      `Cookies in ${cookiesFile} did not authenticate (user API returned ${JSON.stringify(user)}). ` +
      `${iDesc}; T may be stale — re-paste both from devtools.`
    );
  }
  log(`Authenticated as ${user.login} (cookies-file)`);
  return { T: parsed.T, I: parsed.I, login: user.login };
}

/** https://observablehq.com/@author/slug or /d/{id} -> API document specifier. */
export function extractNotebookSlug(targetUrl) {
  const url = new URL(targetUrl);
  const dMatch = url.pathname.match(/^\/d\/([a-f0-9]+)$/);
  if (dMatch) return dMatch[1];
  const slugMatch = url.pathname.match(/^\/@([^/]+)\/([^/]+)/);
  if (slugMatch) return `@${slugMatch[1]}/${slugMatch[2]}`;
  throw new Error(`Cannot parse Observable URL: ${targetUrl}`);
}

/**
 * Fetch the notebook document. Returns { id, version, nodes, files, ... }.
 * Origin header is required for cookie auth to return roles/sharing.
 */
export async function fetchNotebook(slug, cookies) {
  const resp = await fetch(`${API}/document/${slug}`, {
    headers: { 'Cookie': cookieHeader(cookies), 'Origin': 'https://observablehq.com' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch notebook: ${resp.status} ${resp.statusText}`);
  }
  const doc = await resp.json();
  if (!doc.roles?.includes('editor')) {
    throw new Error(
      `No editor role for this notebook (roles: ${JSON.stringify(doc.roles)}).\n` +
      'Ensure your login has edit access, or re-login with: node tools/lope-push-ws.js --login --headed'
    );
  }
  return doc;
}
