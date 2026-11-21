// uses: ast
// outside: programAst, commentsAst
// Can a parse, made by an outside JavaScript cell, cross into a SoundScript cell as data?
export const firstType = (programAst: Program) => (): string => programAst.body[0]?.type ?? "none";
export const commentCount = (commentsAst: Comment[]) => (): number => commentsAst.length;
