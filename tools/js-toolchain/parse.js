// Ported from notebook-kit src/javascript/parse.ts
import {Parser, tokTypes} from "acorn";
import {findReferences} from "./references.js";
import {findDeclarations} from "./declarations.js";
import {findAwaits} from "./awaits.js";

export const acornOptions = {
  ecmaVersion: "latest",
  sourceType: "module"
};

export function maybeParseJavaScript(input) {
  try {
    return parseJavaScript(input);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return undefined;
  }
}

export function parseJavaScript(input) {
  let expression = maybeParseExpression(input); // first attempt to parse as expression
  if (expression?.type === "ClassExpression" && expression.id) expression = null; // named class -> program
  if (expression?.type === "FunctionExpression" && expression.id) expression = null; // named function -> program
  const body = expression ?? parseProgram(input); // otherwise parse as a program
  return {
    body,
    declarations: expression ? null : findDeclarations(body, input),
    references: findReferences(body, {input}),
    expression: !!expression,
    async: findAwaits(body).length > 0
  };
}

function parseProgram(input) {
  return Parser.parse(input, acornOptions);
}

function maybeParseExpression(input) {
  const parser = new Parser(acornOptions, input, 0); // private constructor
  parser.nextToken();
  try {
    const node = parser.parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
