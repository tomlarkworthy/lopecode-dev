// D5: an exported class is reported as "ExportNamedDeclaration at module level", the export wrapper, not the class;
// the unexported class in the second file of this pair is reported for comparison.
export class Scope { n = 0; }
export const ok1 = () => 1;
