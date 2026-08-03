// Ported from notebook-kit src/javascript/syntaxError.ts
import {getLineInfo} from "acorn";

export function syntaxError(message, node, input) {
  const {line, column} = getLineInfo(input, node.start);
  return new SyntaxError(`${message} (${line}:${column})`);
}
