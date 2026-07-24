export const meta = {
  name: 'svg-lens-cell-census',
  description: 'Inventory every svg-lens cell (user job + implementation) then rank overlaps by LOC',
  phases: [
    { title: 'Inventory', detail: 'fan out over cell batches; each agent inventories ~18 cells from cells.json' },
    { title: 'Overlap', detail: 'one synthesis agent cross-references the user column and ranks dedupe candidates by LOC' },
  ],
}

const CELLS = 'tools/svglens-wip/cells.json'   // [{i,name,pid,deps,loc,cc,source}]
const N = 341
const BATCH = 18
const ranges = []
for (let s = 0; s < N; s += BATCH) ranges.push([s, Math.min(N, s + BATCH)])
log(`${N} cells in ${ranges.length} batches of ${BATCH}`)

const ROW_SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          i: { type: 'number' },
          name: { type: 'string' },
          loc: { type: 'number', description: 'copy the cell\'s loc field from cells.json' },
          user: { type: 'string', description: 'user-facing job in <=12 words, or "—" if purely internal' },
          how: { type: 'string', description: 'implementation approach in <=22 words: key APIs/mechanism' },
          kind: { type: 'string', enum: ['header', 'prose', 'test', 'code', 'state'] },
        },
        required: ['i', 'name', 'loc', 'user', 'how', 'kind'],
      },
    },
  },
  required: ['rows'],
}

const invPrompt = (a, b) => `You are inventorying cells of the @tomlarkworthy/svg-lens notebook — a bidirectional SVG editor (drag a shape, its SVG source rewrites; edit source, the drawing updates) written as an interactive academic paper. Everything is built on lawful lenses and a one-write-path "delta" framework; tools/commands/affordances are registries.

Read the file ${CELLS} — a JSON array of {i,name,pid,deps,loc,cc,source} for every cell. Inventory ONLY the cells whose \`i\` is in [${a}, ${b}) (that is i >= ${a} and i < ${b}). For each such cell, from its \`source\`, produce:
- user: what a USER of the editor gets from this cell, in <=12 words. Use "—" if it is purely internal infrastructure (a lens, a parser, a helper, a value-extractor, a test).
- how: the implementation approach in <=22 words — the key API(s)/mechanism (e.g. "Generators.observe on lens-put + Inputs.table", "acorn byte-offset slice", "prosemirror schema"). For a one-liner value cell say "viewof value" or the trivial body.
- kind: header (a section heading / md ## or ###), prose (explanatory md), test (test_*), state (a mutable/store/buffer like putLog), or code (everything else).

Be precise and terse; base every answer on the actual source, not the name. Return one row per cell in your range, ${b - a} rows.`

const inventory = (await parallel(ranges.map(([a, b]) => () =>
  agent(invPrompt(a, b), { label: `inv:${a}-${b}`, phase: 'Inventory', schema: ROW_SCHEMA })
))).filter(Boolean).flatMap(r => r.rows)

log(`inventoried ${inventory.length} rows`)
const withLoc = inventory   // agents copied loc from cells.json

const OVERLAP_SCHEMA = {
  type: 'object',
  properties: {
    clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          job: { type: 'string', description: 'the shared user-facing job or duplicated mechanism' },
          cells: { type: 'array', items: { type: 'string' } },
          totalLoc: { type: 'number' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          kind: { type: 'string', enum: ['ui-consistency', 'code-duplication', 'both'] },
          recommendation: { type: 'string', description: 'how to collapse to one; <=30 words' },
        },
        required: ['job', 'cells', 'totalLoc', 'severity', 'kind', 'recommendation'],
      },
    },
  },
  required: ['clusters'],
}

const synthPrompt = `These are inventory rows for every cell of the svg-lens SVG editor (fields: name, user job, how, loc, kind):

${JSON.stringify(withLoc)}

Find every OVERLAP: a set of two or more cells that (a) do the same user-facing job — two surfaces the user could use to achieve one thing (e.g. two panels that both set the fill), or (b) duplicate the same implementation mechanism (e.g. several cells all maintaining the same event log; two parsers of the same thing; repeated widget-building).

For each overlap cluster return: job (the shared purpose), cells (the names), totalLoc (sum of their loc), severity (high/medium/low — how much a user is confused or how much code would collapse), kind (ui-consistency | code-duplication | both), recommendation (how to collapse to one surface/one write path/one cell, <=30 words).

Rules: ignore trivial value-extractor cells (loc<=1) and section headers. Do not invent overlaps — every cluster must be a real duplication a reader could confirm from the two cells. A known true positive to include: inspector + fieldPanel both set fill/stroke through different write paths. Rank clusters by totalLoc descending.`

const overlaps = await agent(synthPrompt, { label: 'overlap-synthesis', phase: 'Overlap', schema: OVERLAP_SCHEMA, effort: 'high' })

return { inventory: withLoc, overlaps: overlaps ? overlaps.clusters : [] }
