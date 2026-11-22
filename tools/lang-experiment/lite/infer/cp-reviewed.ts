// The reviewed differences of completion since its position is read on a Lezer tree (cp-lezer.ts, 2026-11-22): a
// class of position where the frozen complete.ts (a character scan and regular expressions over the text before the
// cursor) and the cells give different answers, each looked at and the cells' answer kept. cp-diff.ts and
// complete-diff.ts count a difference in one of these classes as REVIEWED, not DIFFERENT. The predicates read the
// answers and the text before the cursor; they classify test output and are not used by completion.
type Res = { mode: string; options: unknown[] };
const CLASSES: { name: string; is: (before: string, tsx: boolean, fileTsx: boolean, old: Res, now: Res) => boolean }[] = [
  // known bug 2 of complete.ts: paramListAt counted the ">" of "=>" in an earlier parameter (`start: () => World, s‸`)
  // as a closing bracket, so the cell's own parameter list read as a name position. The cells offer the parameters.
  { name: "arrow in an earlier parameter", is: (b, _t, _f, o, n) => o.mode === "name" && n.mode === "param" && b.slice(b.indexOf("(")).includes("=>") },
  // tagAt read `<readonly ` in a type argument (`State<readonly A‸`) as a JSX tag "readonly" and offered nothing; the
  // cells read the type argument (a type in the cell's head, a name probe in its body).
  { name: "type argument read as a JSX tag", is: (b, t, _f, o, n) => t && o.mode === "none" && o.options.length === 0 && n.mode !== "none" && b.includes("<readonly ") },
  // cp-diff's rerun of a TSX cell's JSX positions with tsx off: the TypeScript grammar misreads the JSX (as a
  // comparison, a cast or a regular expression) and the cells answer "none" where complete.ts answered "name". Neither
  // answer means anything there and both offer nothing (member positions of such a cell also give no options on either
  // side). Not a position an editor reaches: a TSX cell is parsed as TSX.
  { name: "TSX text read with tsx off", is: (_b, t, f, o, n) => !t && f && o.mode === "name" && n.mode === "none" && o.options.length === 0 && n.options.length === 0 },
];
export function reviewedClass(cell: string, off: number, tsx: boolean, fileTsx: boolean, oldJson: string, newJson: string): string | null {
  if (oldJson.startsWith("threw") || newJson.startsWith("threw")) return null;
  const o = JSON.parse(oldJson) as Res & { from: number }, n = JSON.parse(newJson) as Res & { from: number };
  const before = cell.slice(0, o.from);
  return CLASSES.find((c) => c.is(before, tsx, fileTsx, o, n))?.name ?? null;
}
