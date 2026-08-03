// Ported from notebook-kit src/javascript/references.ts
// Based on https://github.com/ForbesLindesay/acorn-globals (copyright 2014 Forbes Lindesay).
import {checkAssignments} from "./assignments.js";
import {defaultGlobals} from "./globals.js";
import {checkExports} from "./imports.js";
import {ancestor} from "./walk.js";

function isScope(node) {
  return (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "Program"
  );
}

function isBlockScope(node) {
  return (
    node.type === "BlockStatement" ||
    node.type === "SwitchStatement" ||
    node.type === "ForInStatement" ||
    node.type === "ForOfStatement" ||
    node.type === "ForStatement" ||
    isScope(node)
  );
}

export function findReferences(
  node,
  {
    input,
    globals = defaultGlobals,
    filterReference = (identifier) => !globals.has(identifier.name),
    filterDeclaration = () => true
  } = {}
) {
  const locals = new Map();
  const references = [];

  function hasLocal(node, name) {
    return locals.get(node)?.has(name) ?? false;
  }

  function declareLocal(node, id) {
    if (!filterDeclaration(id)) return;
    const l = locals.get(node);
    if (l) l.add(id.name);
    else locals.set(node, new Set([id.name]));
  }

  function declareClass(node) {
    if (node.id) declareLocal(node, node.id);
  }

  function declareFunction(node) {
    node.params.forEach((param) => declarePattern(param, node));
    if (node.id) declareLocal(node, node.id);
    if (node.type !== "ArrowFunctionExpression") declareLocal(node, {name: "arguments"});
  }

  function declareCatchClause(node) {
    if (node.param) declarePattern(node.param, node);
  }

  function declarePattern(node, parent) {
    switch (node.type) {
      case "Identifier":
        declareLocal(parent, node);
        break;
      case "ObjectPattern":
        node.properties.forEach((node) =>
          declarePattern(node.type === "Property" ? node.value : node, parent)
        );
        break;
      case "ArrayPattern":
        node.elements.forEach((node) => node && declarePattern(node, parent));
        break;
      case "RestElement":
        declarePattern(node.argument, parent);
        break;
      case "AssignmentPattern":
        declarePattern(node.left, parent);
        break;
    }
  }

  ancestor(node, {
    VariableDeclaration(node, _state, parents) {
      let parent = null;
      for (let i = parents.length - 1; i >= 0 && parent === null; --i) {
        if (node.kind === "var" ? isScope(parents[i]) : isBlockScope(parents[i])) {
          parent = parents[i];
        }
      }
      node.declarations.forEach((declaration) => declarePattern(declaration.id, parent));
    },
    FunctionDeclaration(node, _state, parents) {
      let parent = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      if (node.id) declareLocal(parent, node.id);
      declareFunction(node);
    },
    FunctionExpression: declareFunction,
    ArrowFunctionExpression: declareFunction,
    ClassDeclaration(node, _state, parents) {
      let parent = null;
      for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      if (node.id) declareLocal(parent, node.id);
    },
    ClassExpression: declareClass,
    CatchClause: declareCatchClause,
    ImportDeclaration(node, _state, [root]) {
      node.specifiers.forEach((specifier) => declareLocal(root, specifier.local));
    }
  });

  function identifier(node, _state, parents) {
    const name = node.name;
    if (name === "undefined") return;
    for (let i = parents.length - 2; i >= 0; --i) {
      if (hasLocal(parents[i], name)) {
        return;
      }
    }
    if (filterReference(node)) {
      references.push(node);
    }
  }

  ancestor(node, {
    Pattern(node, _state, parents) {
      if (node.type === "Identifier") {
        identifier(node, _state, parents);
      }
    },
    Identifier: identifier
  });

  if (input !== undefined) {
    checkAssignments(node, {locals, references, globals, input});
    checkExports(node, {input});
  }

  return references;
}
