// Load corepox-components and corepox-assets in node, with no browser.
//
// The component drawings became cells on 2026-08-19 so svg-lens could edit them,
// which put two things in the way of a headless read that used to be free:
// the art cells are tagged with svg-lens's `svg`, and corepox-assets now imports
// corepox-components through an importmap path node cannot resolve. Both are
// injected here rather than in each tool, so there is one place where a headless
// run differs from the browser and it is this file.
//
// `svg` becomes linkedom's parser: the art cells are static markup, so the only
// thing the sheet-building code asks of them is getAttribute/children/
// querySelector, and a real (non-browser) DOM answers all three.
import {importNotebookModule} from "./notebook-import.ts";
import {DOMParser, parseHTML} from "linkedom";

const parser = new DOMParser();
// symbolSheet builds the sheet with document.createElement/createElementNS and
// appends it to the body, so a tool that wants the assembled sheet needs a
// document. Installed once, and only if nothing else has (Playwright tools run
// this code in a real browser and must not be shadowed).
if (typeof (globalThis as any).document === "undefined") {
  const {window, document} = parseHTML("<!doctype html><html><body></body></html>");
  (globalThis as any).window = window;
  (globalThis as any).document = document;
}
export const svgStub = (strings: TemplateStringsArray, ...vals: unknown[]) => {
  const text = String.raw({raw: strings as unknown as string[]}, ...vals);
  const doc = parser.parseFromString(text, "image/svg+xml");
  return doc.documentElement;
};

export async function loadComponents() {
  return importNotebookModule("modules/@tomlarkworthy/corepox-components.js",
                              {overrides: {svg: svgStub}});
}

/** corepox-assets with its corepox-components imports satisfied from a real load. */
export async function loadAssets() {
  const c = await loadComponents();
  const [COMPONENT_ART, SYMBOL_FOR, TILE] =
    await Promise.all([c.value("COMPONENT_ART"), c.value("SYMBOL_FOR"), c.value("ART_TILE")]);
  const a = await importNotebookModule("modules/@tomlarkworthy/corepox-assets.js",
                                       {overrides: {COMPONENT_ART, SYMBOL_FOR, TILE}});
  return {assets: a, components: c};
}
