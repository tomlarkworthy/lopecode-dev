// CI for @tomlarkworthy/svg-lens — lawful bidirectional lenses aimed at the cell's own source.
//
// The notebook's own test_* cells ARE the property suite (seeded PRNG, deterministic). This file
// loads the real cells headlessly and asserts every test_* cell fulfills, so the lens laws are
// re-proven on every CI run — no copy of the lens code lives here.
//
// Part 2 needs Bun (importNotebookModule). Under plain node only the bundle invariant runs.
//   bun test tests/notebooks/svg-lens.test.js
//   node --experimental-vm-modules --test tests/notebooks/svg-lens.test.js   # invariants only

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const NB = 'lopebooks/notebooks/@tomlarkworthy_svg-lens.html';
const MODULE = 'modules/@tomlarkworthy/svg-lens.js';

const TEST_CELLS = [
  // attribute microsyntax
  'test_viewBoxLens_laws',
  'test_pointsLens_laws',
  'test_transformLens_laws',
  'test_translateLens_laws',
  'test_pathLens_laws',
  'test_attr_laws',
  'test_child_laws',
  'test_compose_nodeViewBox_laws',
  'test_invert_involution',
  'test_exact_roundtrips',
  'test_putput_skip_rule_corner',
  'test_applyPoint_screen_roundtrip',
  // the cell's own source as the lens source
  'test_literalLens_laws',
  'test_attrTextLens_laws',
  'test_cellSourceLens_laws',
  'test_source_residue_preserved',
  // structural editing
  'test_childrenLens_laws',
  'test_structural_commands',
  'test_point_commands',
  'test_nearestSegment',
  'test_rebasePath',
  'test_path_subdivision_exact',
  'test_opsLens_laws',
  'test_transform_gizmo',
  // creation
  'test_shape_creation',
  'test_pen_path',
  'test_z_order',
  'test_topmost_selection',
];

// Needs a real DOM, so it reports ⏭ under the headless runtime and ✅ in the notebook.
const DOM_TEST_CELLS = ['test_morph_projection'];

describe('@tomlarkworthy/svg-lens bundle invariants', () => {
  const s = readFileSync(NB, 'utf8');
  it('embeds the module and boots it under the lopepage-2 frame', () => {
    assert.ok(s.includes('id="@tomlarkworthy/svg-lens"'), 'module <script> block missing');
    assert.ok(s.includes('id="@tomlarkworthy/lopepage-2"'), 'lopepage-2 frame block missing');
    const mains = s.match(/"mains":\s*\[[^\]]*\]/g)?.find((m) => m.includes('svg-lens'));
    assert.ok(mains, 'svg-lens not in any bootconf mains → boots blank');
    assert.ok(mains.includes('lopepage-2'), 'bootconf mains not framed with lopepage-2');
  });
  it('carries the modules the source lens needs', () => {
    for (const dep of ['acorn-8-11-3', 'runtime-sdk', 'tests', 'editable-md']) {
      assert.ok(s.includes(`id="@tomlarkworthy/${dep}"`), `${dep} block missing`);
    }
  });
  it('module source declares every test cell', () => {
    const src = readFileSync(MODULE, 'utf8');
    for (const name of [...TEST_CELLS, ...DOM_TEST_CELLS]) assert.ok(src.includes(`"${name}"`), `${name} not defined`);
  });
});

if (typeof Bun === 'undefined') {
  describe('@tomlarkworthy/svg-lens lens laws (skipped — run with `bun test`)', () => {
    it.skip('requires Bun (importNotebookModule)', () => {});
  });
} else {
  const { importNotebookModule } = await import('../../tools/notebook-import.ts');
  // acorn lives in tools/node_modules (see tools/package.json), so resolve it from there
  const acorn = await import('../../tools/node_modules/acorn/dist/acorn.mjs');

  describe('lens laws — in-notebook property tests, real cells, headless', () => {
    let m;
    before(async () => { m = await importNotebookModule(MODULE, { overrides: { acorn } }); });

    for (const name of TEST_CELLS) {
      it(name, async () => {
        const v = await m.value(name);
        assert.match(String(v), /^✅/, `${name} did not report success: ${v}`);
      });
    }

    for (const name of DOM_TEST_CELLS) {
      it(`${name} (DOM-gated)`, async () => {
        const v = await m.value(name);
        assert.match(String(v), /^[✅⏭]/, `${name} failed: ${v}`);
      });
    }

    // The renderer's reach: a structural edit must survive the trip back into a cell definition.
    it('insertElement through literalLens keeps the cell parseable and the residue intact', async () => {
      const [literalLens, insertElement] = await Promise.all([m.value('literalLens'), m.value('insertElement')]);
      const cell =
        'function _demo(svgLens, svg) {\n' +
        '  // outside the literal\n' +
        '  return (svgLens(svg`<svg viewBox="0 0 10 10">\n' +
        '  <!-- keep me -->\n' +
        '  <rect x="1"/>\n' +
        '</svg>`));\n' +
        '}';
      const L = literalLens('svgLens');
      const out = L.put(insertElement(L.get(cell), [0], null, '<circle r="3"/>'), cell);
      assert.ok(out.includes('<circle r="3"/>'), 'element not inserted');
      assert.ok(out.includes('<rect x="1"/>'), 'sibling lost');
      assert.ok(out.includes('<!-- keep me -->'), 'comment residue lost');
      assert.ok(out.includes('// outside the literal'), 'JS residue lost');
      assert.doesNotThrow(() => acorn.parseExpressionAt(out, 0, { ecmaVersion: 'latest' }));
      assert.equal(typeof eval('(' + out + ')'), 'function');
    });

    // A gap can hold comments; a new child must inherit only the indentation, or every insert
    // reproduces the comment above the first child.
    it('inserting does not duplicate the residue in a gap', async () => {
      const insertElement = await m.value('insertElement');
      const doc = '<svg>\n  <!-- keep me once -->\n  <rect x="1"/>\n</svg>';
      let out = doc;
      for (const mk of ['<circle r="1"/>', '<circle r="2"/>', '<circle r="3"/>'])
        out = insertElement(out, [0], null, mk);
      assert.equal((out.match(/<!--/g) || []).length, 1, `comment duplicated:\n${out}`);
      assert.ok(/\n  <circle r="3"\/>/.test(out), `lost the indentation:\n${out}`);
      // and inserting first, above the commented child, still leaves exactly one comment
      const front = insertElement(doc, [0], 0, '<circle r="9"/>');
      assert.equal((front.match(/<!--/g) || []).length, 1, `comment duplicated at the front:\n${front}`);
    });

    it('childrenLens refuses a child that is not exactly one element', async () => {
      const childrenLens = await m.value('childrenLens');
      const doc = '<svg><rect x="1"/></svg>';
      const l = childrenLens([0]);
      assert.throws(() => l.put(['  <rect x="1"/>'], doc), /exactly one element/);
      assert.throws(() => l.put(['<a/><b/>'], doc), /exactly one element/);
      assert.throws(() => l.put(['text'], doc), /exactly one element/);
    });

    it('skip rule: unchanged view preserves non-canonical source strings', async () => {
      const viewBoxLens = await m.value('viewBoxLens');
      const s = ' 0,0  100\t100 ';
      assert.equal(viewBoxLens.put(viewBoxLens.get(s), s), s);
    });

    // The write a drag performs: only the focused attribute inside the literal changes.
    it('cellAttrLens rewrites one attribute and nothing else', async () => {
      const cellAttrLens = await m.value('cellAttrLens');
      const cell =
        'function _demo(svgLens, svg) {\n' +
        '  // a comment outside the literal\n' +
        '  return (svgLens(svg`<svg viewBox="0 0 10 10">\n' +
        '  <!-- keep me -->\n' +
        '  <g transform="rotate(45)"><rect x="1"/></g>\n' +
        '</svg>`));\n' +
        '}';
      const l = cellAttrLens('svgLens', 1, 'transform', 'matrix(1 0 0 1 0 0)');
      assert.equal(l.get(cell), 'rotate(45)');
      const out = l.put('matrix(1 0 0 1 5 5)', cell);
      assert.ok(out.includes('<!-- keep me -->'), 'comment residue lost');
      assert.ok(out.includes('// a comment outside the literal'), 'JS residue lost');
      assert.ok(out.includes('transform="matrix(1 0 0 1 5 5)"'), 'transform not written');
      assert.ok(out.includes('viewBox="0 0 10 10"'), 'untouched attribute rewritten');
      assert.ok(out.includes('<rect x="1"/>'), 'sibling element rewritten');
      // GetPut: putting back the same matrix leaves the readable form alone
      assert.equal(l.put(l.get(out), out), out);
    });

    it('the rewritten cell source is still parseable JavaScript', async () => {
      const cellAttrLens = await m.value('cellAttrLens');
      const cell = 'function _demo(svgLens, svg) {return (svgLens(svg`<svg viewBox="0 0 4 4"><rect x="1"/></svg>`));}';
      const out = cellAttrLens('svgLens', 1, 'transform', 'matrix(1 0 0 1 0 0)').put('matrix(2 0 0 2 0 0)', cell);
      assert.doesNotThrow(() => acorn.parseExpressionAt(out, 0, { ecmaVersion: 'latest' }));
      assert.equal(typeof eval('(' + out + ')'), 'function');
    });

    it('refuses text that would break out of the template literal', async () => {
      const literalLens = await m.value('literalLens');
      const cell = 'function _demo(svgLens, svg) {return (svgLens(svg`<svg/>`));}';
      const l = literalLens('svgLens');
      assert.throws(() => l.put('<svg/>`; evil()', cell), /would not survive/);
      assert.throws(() => l.put('<svg a="${x}"/>', cell), /would not survive/);
    });

    it('rejects literals with interpolations as outside the domain', async () => {
      const literalSpan = await m.value('literalSpan');
      const cell = 'function _demo(svgLens, svg, w) {return (svgLens(svg`<svg width="${w}"/>`));}';
      assert.throws(() => literalSpan(cell, 'svgLens'), /interpolations/);
    });
  });
}
