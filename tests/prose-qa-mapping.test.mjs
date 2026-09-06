// Mapping and anchor tests for tools/prose-qa/pangram-score.ts, no API calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractParagraphs, documentOf, mapWindows, quoteFor, emitCells, creditsFor } from "../tools/prose-qa/pangram-score.ts";

const SRC = `
const _p1 = function _anonymous(md,aside) {return (md\`## A heading

First paragraph with **bold
across lines** and a \${aside('hole')} in the middle, then a [link](http://x) and *emph*.
Second line of the same paragraph.

> quoted line
\`);};
const _p2 = function _named(md) {return (md\`Plain paragraph \\\`with code\\\` and a dollar \\$ sign.\`);};
const _p3 = function _nomd(htl) {return (htl.html\`<b>not prose</b>\`);};
export default function define(runtime, observer) {
  $def("_p1", null, ["md","aside"], _p1);
  $def("_p2", "named", ["md"], _p2);
  $def("_p3", null, ["htl"], _p3);
}
`;

test("extracts md paragraphs with pid, name, and hole cuts", () => {
  const paras = extractParagraphs(SRC);
  assert.deepEqual(paras.map((p) => [p.pid, p.cell, p.idx]), [["_p1", null, 0], ["_p1", null, 1], ["_p1", null, 2], ["_p2", "named", 0]]);
  assert.equal(paras[0].text, "A heading");
  assert.match(paras[1].text, /^First paragraph with bold\nacross lines and a  in the middle, then a link and emph\.\nSecond line/);
  assert.equal(paras[1].cuts.length, 1);
  assert.equal(paras[2].text, "quoted line");
  assert.equal(paras[3].text, "Plain paragraph with code and a dollar $ sign.");
  const doc = documentOf(paras);
  for (const p of paras) assert.equal(doc.slice(p.start, p.end), p.text);
});

test("windows map to paragraphs by overlap, best score wins", () => {
  const paras = extractParagraphs(SRC);
  const p1 = paras[1];
  const windows = [
    { label: "Human Written", ai_assistance_score: 0.1, confidence: "High", start_index: 0, end_index: p1.start - 1 },
    { label: "AI-Generated", ai_assistance_score: 0.93, confidence: "High", start_index: p1.start + 5, end_index: p1.start + 40 },
    { label: "AI-Assisted", ai_assistance_score: 0.6, confidence: "Low", start_index: p1.start + 40, end_index: p1.end + 3 },
  ];
  const s = mapWindows(paras, windows);
  assert.equal(s[0].score, 0.1);
  assert.equal(s[1].score, 0.93);
  assert.equal(s[1].label, "AI-Generated");
  assert.equal(s[1].windows, 2);
  assert.equal(s[2].score, 0.6);
  assert.equal(s[3].label, "unscored");
});

test("quote never crosses a hole or a line break and is found in the paragraph", () => {
  const paras = extractParagraphs(SRC);
  for (const p of paras) {
    const q = quoteFor(p);
    assert.ok(q.exact.length > 0);
    assert.ok(!q.exact.includes("\n"));
    const at = p.text.indexOf(q.exact);
    assert.notEqual(at, -1);
    for (const c of p.cuts) assert.ok(c <= at || c >= at + q.exact.length, `cut ${c} inside quote [${at},${at + q.exact.length})`);
    assert.ok(p.text.slice(Math.max(0, at - q.prefix.length), at) === q.prefix);
  }
  assert.equal(quoteFor(paras[1]).exact, "in the middle, then a link and emph.");
});

test("emitted cells are annotation() records plus md notes", () => {
  const paras = extractParagraphs(SRC);
  const scored = mapWindows(paras, [{ label: "AI-Generated", ai_assistance_score: 0.9, confidence: "High", start_index: paras[1].start, end_index: paras[1].end }]);
  const src = emitCells(scored.filter((p) => p.score >= 0.7), "@x/y", "2026-09-06");
  assert.match(src, /^annotation_prose_p1_1 = annotation\(\{/);
  assert.match(src, /"pid": "_p1"/);
  assert.match(src, /"module": "@x\/y"/);
  assert.match(src, /annotation_prose_p1_1_note = md`\*\*Pangram 4\*\*: AI-Generated \(score 0\.90, High confidence\), 2026-09-06\./);
  assert.ok(!src.includes('"cell"'), "anonymous cell must not get a cell key");
});

test("credits round up per 100 words", () => {
  assert.equal(creditsFor(99), 1);
  assert.equal(creditsFor(101), 2);
  assert.equal(creditsFor(2705), 28);
});
