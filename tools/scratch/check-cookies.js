import { chromium } from 'playwright';
import path from 'path';
const profile = path.join(process.env.HOME, '.claude/lope-push-browser-profile');
const browser = await chromium.launchPersistentContext(profile, { headless: true });
const cookies = await browser.cookies();
const T = cookies.find(c => c.name === 'T' && c.domain.includes('observablehq'));
const I = cookies.find(c => c.name === 'I' && c.domain.includes('observablehq'));
console.log('T:', T ? { value: T.value.slice(0, 20) + '...', expires: new Date(T.expires * 1000).toISOString() } : 'MISSING');
console.log('I:', I ? { value: I.value.slice(0, 20) + '...', expires: new Date(I.expires * 1000).toISOString() } : 'MISSING');

// Test API call
if (T && I) {
  const resp = await fetch('https://api.observablehq.com/user', {
    headers: { Cookie: `T=${T.value}; I=${I.value}` }
  });
  const text = await resp.text();
  console.log('User API:', resp.status, text.slice(0, 200));

  // Try document API with roles
  const docResp = await fetch('https://api.observablehq.com/document/@tomlarkworthy/blank-notebook', {
    headers: { Cookie: `T=${T.value}; I=${I.value}` }
  });
  const doc = await docResp.json();
  console.log('Doc roles:', doc.roles);
  console.log('Doc sharing:', doc.sharing);
}

// Also show the dev-browser profile for comparison
const devProfile = path.join(process.env.HOME, '.claude/plugins/cache/dev-browser-marketplace/dev-browser/66682fb0513a/skills/dev-browser/.browser-data');
try {
  const devBrowser = await chromium.launchPersistentContext(devProfile, { headless: true });
  const devCookies = await devBrowser.cookies();
  const devT = devCookies.find(c => c.name === 'T' && c.domain.includes('observablehq'));
  const devI = devCookies.find(c => c.name === 'I' && c.domain.includes('observablehq'));
  console.log('\n--- Dev browser profile ---');
  console.log('T:', devT ? devT.value.slice(0, 20) + '...' : 'MISSING');
  console.log('I:', devI ? devI.value.slice(0, 20) + '...' : 'MISSING');
  await devBrowser.close();
} catch(e) {
  console.log('Dev browser profile not accessible:', e.message);
}

await browser.close();
