/**
 * notebook-blocks.ts — the one locator for a notebook's top-level `<script id=…>`
 * blocks.
 *
 * Every tool that edits or audits a notebook needs the same answer to "where does
 * block X start and end". Four tools each grew their own regex for it and three of
 * them were wrong in the same way (see `blockSpans`): on one notebook a regex scan
 * found 122 openers against 107 real blocks, and a block-removal script built on it
 * cut 3,477 bytes out of an unrelated block. This module is the shared, correct
 * implementation — import it rather than writing another scanner.
 */
import { writeFileSync } from "node:fs";

export type Span = { id: string; start: number; end: number };
export type Block = { id: string; attrs: string; start: number; end: number; content: string };

/**
 * Top-level `<script id=…>` spans.
 *
 * `@tomlarkworthy/exporter-3` writes notebooks, so its own source contains literal
 * script openers — 10 of them in `lopecode-newsletter-002` (`bootconf.json`,
 * `networking_script`, `streaming_sentinel`, `${ id }`, …) plus a second
 * `<!-- Bootloader -->`. A regex or an `indexOf`/`lastIndexOf` finds those phantoms
 * and writes *inside* exporter-3's block, which parses as a syntax error and takes
 * every consumer of the module down with it.
 *
 * Scanning is safe because a block that emits script tags has to escape its own
 * closer (an unescaped `</script>` would have ended the block in the HTML parser),
 * so the first `</script>` after an opener really is that block's end. Stepping to
 * it skips the phantoms.
 */
export function blockSpans(html: string): Span[] {
  const spans: Span[] = [];
  const CLOSE = "</script>";
  let i = 0;
  for (;;) {
    const at = html.indexOf("<script", i);
    if (at === -1) return spans;
    const gt = html.indexOf(">", at);
    if (gt === -1) return spans;
    const close = html.indexOf(CLOSE, gt);
    const end = close === -1 ? html.length : close + CLOSE.length;
    const m = /^<script\s+id="([^"]+)"/.exec(html.slice(at, gt + 1));
    if (m) spans.push({ id: m[1], start: at, end });
    i = end;
  }
}

/** The first top-level block with this id, or null. */
export function findSpan(html: string, id: string): Span | null {
  return blockSpans(html).find((s) => s.id === id) ?? null;
}

/** The whole `<script …>…</script>` text of a block. */
export function rawBlock(html: string, id: string): string | null {
  const span = findSpan(html, id);
  return span ? html.slice(span.start, span.end) : null;
}

/** A block's inner text, with the single leading and trailing newline the exporter
 *  writes stripped — the on-disk form of a checked-out module working copy. */
export function blockContent(html: string, id: string): string | null {
  const span = findSpan(html, id);
  return span ? contentOfSpan(html, span) : null;
}

function contentOfSpan(html: string, span: Span): string {
  const block = html.slice(span.start, span.end);
  const body = block.slice(block.indexOf(">") + 1, block.lastIndexOf("</script>"));
  return body.replace(/^\n/, "").replace(/\n$/, "");
}

/** Every top-level block, with the opener's attribute text after the id. */
export function blocks(html: string): Block[] {
  return blockSpans(html).map((span) => {
    const block = html.slice(span.start, span.end);
    const gt = block.indexOf(">");
    const opener = block.slice(0, gt + 1);
    const attrs = /^<script\s+id="[^"]*"([^>]*)>/.exec(opener)?.[1] ?? "";
    return { id: span.id, attrs, start: span.start, end: span.end, content: contentOfSpan(html, span) };
  });
}

/** True if `at` falls inside some block's source rather than the document body. */
export function insideABlock(html: string, at: number): boolean {
  return blockSpans(html).some((s) => at > s.start && at < s.end);
}

/** Write guard for the whole phantom class.
 *
 * Must be differential: several modules legitimately carry `<script id="…">` in their
 * own source (claude-code-pairing has one at +74586, exporter-3 has ten), so "contains
 * an opener" is the normal state and only an *increase* is the bug. The incoming block
 * may carry its own, so the expectation is prev + whatever it brings. Checked before
 * the write, so a detected splice never reaches disk.
 */
export function nestedOpeners(html: string): number {
  let n = 0;
  for (const s of blockSpans(html)) {
    n += (html.slice(s.start + 1, s.end).match(/<script id="/g) ?? []).length;
  }
  return n;
}

/**
 * Structural, not count-based. A first version compared nested-opener counts with a
 * budget for whatever the incoming block carried — and markdown-wiki's doc attachments
 * carry openers of their own, so a genuine splice hid inside the allowance and cost
 * `maintaining-…md` its place in the DOM. What actually matters is that no block which
 * was top-level stops being top-level: that is exactly "something swallowed it", and it
 * is what the browser's parser will do too.
 *
 * `allowRemoved` names ids a caller is deliberately deleting (rm-block); everything
 * else vanishing is still a swallow.
 */
export function guardedWrite(
  path: string, prev: string, next: string, incoming: string, what: string,
  allowRemoved: string[] = []
): void {
  const permitted = new Set(allowRemoved);
  const was = new Set(blockSpans(prev).map((s) => s.id));
  const now = new Set(blockSpans(next).map((s) => s.id));
  const lost = [...was].filter((id) => !now.has(id) && !permitted.has(id));
  if (lost.length) {
    throw new Error(
      `${what} would swallow ${lost.length} top-level block(s) in ${path}: ` +
      `${lost.slice(0, 5).join(", ")}. Refusing to write — see blockSpans.`
    );
  }
  if (nestedOpeners(next) > nestedOpeners(prev) + (incoming.match(/<script id="/g) ?? []).length) {
    throw new Error(`${what} would nest a block inside another in ${path}. Refusing to write.`);
  }
  writeFileSync(path, next);
}
