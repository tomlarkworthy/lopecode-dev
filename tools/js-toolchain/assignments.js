// Ported from notebook-kit src/javascript/assignments.ts
import {defaultGlobals} from "./globals.js";
import {syntaxError} from "./syntaxError.js";
import {ancestor} from "./walk.js";

export function checkAssignments(node, {input, locals, references, globals = defaultGlobals}) {
  function isLocal({name}, parents) {
    for (const p of parents) if (locals.get(p)?.has(name)) return true;
    return false;
  }

  function checkConst(node, parents) {
    switch (node.type) {
      case "Identifier":
        if (isLocal(node, parents)) break;
        if (references.includes(node))
          throw syntaxError(`Assignment to external variable '${node.name}'`, node, input);
        if (globals.has(node.name))
          throw syntaxError(`Assignment to global '${node.name}'`, node, input);
        break;
      case "ArrayPattern":
        for (const e of node.elements) if (e) checkConst(e, parents);
        break;
      case "ObjectPattern":
        for (const p of node.properties) checkConst(p.type === "Property" ? p.value : p, parents);
        break;
      case "RestElement":
        checkConst(node.argument, parents);
        break;
    }
  }

  function checkConstArgument({argument}, parents) {
    checkConst(argument, parents);
  }

  function checkConstLeft({left}, parents) {
    checkConst(left, parents);
  }

  ancestor(node, {
    AssignmentExpression: checkConstLeft,
    AssignmentPattern: checkConstLeft,
    UpdateExpression: checkConstArgument,
    ForOfStatement: checkConstLeft,
    ForInStatement: checkConstLeft
  });
}
