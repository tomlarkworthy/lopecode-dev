// uses: ast
// outside: acornParse, acornParser, tsPlugin
// parse.ts parse, with acorn as an outside (JavaScript) cell, as it would be in the notebook
export type AcornParse = (src: string, opts: { jsx: boolean }) => { program: Program; comments: Comment[] };
export const parseVia = (acornParse: AcornParse) => (src: string): Program => acornParse(src, { jsx: false }).program;
// parse.ts TS = acorn.Parser.extend(tsPlugin()): reduced probe, acorn and the plugin as outside cells
export type ParserClass = { extend: (plugin: unknown) => ParserClass };
export const TS = (acornParser: ParserClass, tsPlugin: () => unknown) => acornParser.extend(tsPlugin());
