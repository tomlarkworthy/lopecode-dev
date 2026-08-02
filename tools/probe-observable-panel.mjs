// editor_panel rejects with "Cannot read properties of undefined (reading 'name')" on
// observablehq.com. Which of its pieces throws — nav(cell), or reversibleAttach(combine, code_editor)?
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
await page.goto('https://observablehq.com/@tomlarkworthy/annotate', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));

console.log(await frame.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const g = (n) => ([...rt._variables].find((v) => v._name === n && v._module === home) || {})._value;
  await g('cellEditor')();
  const mod = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module !== home)._module;
  const out = [];
  const val = async (n) => { try { return await mod.value(n); } catch (e) { out.push(`${n}: REJECTED ${String(e).slice(0, 120)}`); return undefined; } };

  const reversibleAttach = await val('reversibleAttach');
  const combine = await val('combine');
  const code_editor = await val('code_editor');
  const nav = await val('nav');
  const editedCell = await val('editedCell');
  out.push(`types: reversibleAttach=${typeof reversibleAttach} combine=${typeof combine} code_editor=${code_editor && code_editor.constructor ? code_editor.constructor.name : typeof code_editor} nav=${typeof nav} editedCell=${editedCell ? 'object' : String(editedCell)}`);

  try { const r = nav && nav(editedCell); out.push('nav(editedCell) -> ' + (r && r.constructor ? r.constructor.name : String(r))); }
  catch (e) { out.push('nav THREW: ' + String(e).slice(0, 160)); }
  try { const r = reversibleAttach && reversibleAttach(combine, code_editor); out.push('reversibleAttach -> ' + (r && r.constructor ? r.constructor.name : String(r))); }
  catch (e) { out.push('reversibleAttach THREW: ' + String(e).slice(0, 200)); }

  // combine is the cell that decides which panes to show — look at it
  out.push('combine value: ' + (typeof combine === 'object' && combine ? JSON.stringify(Object.keys(combine)).slice(0, 120) : String(combine).slice(0, 120)));
  return out.join('\n');
}));
await browser.close();
