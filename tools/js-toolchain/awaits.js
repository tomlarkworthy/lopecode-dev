// Ported from notebook-kit src/javascript/awaits.ts
import {recursive} from "./walk.js";

export function findAwaits(node) {
  const nodes = [];
  recursive(node, null, {
    FunctionDeclaration() {},
    FunctionExpression() {},
    ArrowFunctionExpression() {},
    ForOfStatement(node, state, callback) {
      if (node.await) nodes.push(node);
      if (node.left) callback(node.left, state);
      if (node.right) callback(node.right, state);
      if (node.body) callback(node.body, state);
    },
    AwaitExpression(node) {
      nodes.push(node);
    }
  });
  return nodes;
}
