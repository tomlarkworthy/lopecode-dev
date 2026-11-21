// uses: ast
// lite/parse.ts kids and isFn (sampled: kids), and fields (new), on the typed AST. Probes that start with `// uses: …astlib`
// get these cells in front of them.
// lite/parse.ts: kids, TS, parse (sampled). kids is written against the typed AST: one case per node type, the
// children in the fields kids would visit (it skips loc, typeAnnotation, returnType, typeParameters, typeArguments).
export const kids = () => (n: Node): Node[] => {
  const of = (xs: (Node | null | undefined)[]): Node[] => {
    const out: Mut<Node[]> = mut([]);
    for (const x of xs) if (x) out.push(x);
    return freeze(out).toSorted((a, b) => a.start - b.start);
  };
  switch (n.type) {
    case "Identifier": case "Literal": case "ThisExpression": case "TemplateElement": case "JSXIdentifier": case "JSXText": case "JSXEmptyExpression":
    case "TSAnyKeyword": case "TSUnknownKeyword": case "TSNumberKeyword": case "TSStringKeyword": case "TSBooleanKeyword": case "TSBigIntKeyword":
    case "TSNullKeyword": case "TSUndefinedKeyword": case "TSVoidKeyword": case "TSNeverKeyword": case "TSObjectKeyword": case "TSSymbolKeyword":
      return [];
    case "TSSatisfiesExpression": return of([n.expression]);
    case "TSDeclareFunction": return of([n.id, ...n.params]);
    case "TemplateLiteral": return of([...n.expressions, ...n.quasis]);
    case "ArrayExpression": case "ArrayPattern": return of(n.elements);
    case "Property": return of([n.key, n.value]);
    case "ObjectExpression": case "ObjectPattern": return of(n.properties);
    case "ArrowFunctionExpression": case "FunctionExpression": case "FunctionDeclaration": return of([n.id, ...n.params, n.body]);
    case "UnaryExpression": case "UpdateExpression": case "SpreadElement": case "AwaitExpression": case "RestElement": case "ThrowStatement": return of([n.argument]);
    case "YieldExpression": case "ReturnStatement": return of([n.argument]);
    case "BinaryExpression": case "LogicalExpression": case "AssignmentExpression": case "AssignmentPattern": return of([n.left, n.right]);
    case "ConditionalExpression": return of([n.test, n.consequent, n.alternate]);
    case "CallExpression": case "NewExpression": return of([n.callee, ...n.arguments]);
    case "MemberExpression": return of([n.object, n.property]);
    case "ChainExpression": case "ExpressionStatement": case "TSAsExpression": case "TSNonNullExpression": case "JSXExpressionContainer": return of([n.expression]);
    case "SequenceExpression": return of(n.expressions);
    case "TSParameterProperty": return of([n.parameter]);
    case "VariableDeclarator": return of([n.id, n.init]);
    case "VariableDeclaration": return of(n.declarations);
    case "BlockStatement": case "Program": return of(n.body);
    case "IfStatement": return of([n.test, n.consequent, n.alternate]);
    case "SwitchCase": return of([n.test, ...n.consequent]);
    case "SwitchStatement": return of([n.discriminant, ...n.cases]);
    case "ForStatement": return of([n.init, n.test, n.update, n.body]);
    case "ForOfStatement": case "ForInStatement": return of([n.left, n.right, n.body]);
    case "WhileStatement": case "DoWhileStatement": return of([n.test, n.body]);
    case "BreakStatement": case "ContinueStatement": return of([n.label]);
    case "CatchClause": return of([n.param, n.body]);
    case "TryStatement": return of([n.block, n.handler, n.finalizer]);
    case "LabeledStatement": return of([n.label, n.body]);
    case "ExportNamedDeclaration": return of([n.declaration, ...n.specifiers, n.source]);
    case "ImportDeclaration": return of([...n.specifiers, n.source]);
    case "JSXAttribute": return of([n.name, n.value]);
    case "JSXOpeningElement": return of([n.name, ...n.attributes]);
    case "JSXElement": return of([n.openingElement, ...n.children]);
    case "JSXFragment": return of(n.children);
    case "TSTypeAnnotation": case "TSParenthesizedType": case "TSTypeOperator": case "TSOptionalType": case "TSRestType": return [];
    case "TSTypeParameter": return of([typeof n.name === "string" ? null : n.name, n.constraint, n.default]);
    case "TSTypeParameterDeclaration": case "TSTypeParameterInstantiation": return of(n.params);
    case "TSTypeReference": return of([n.typeName]);
    case "TSQualifiedName": return of([n.left, n.right]);
    case "TSArrayType": return of([n.elementType]);
    case "TSTupleType": return of(n.elementTypes);
    case "TSUnionType": case "TSIntersectionType": return of(n.types);
    case "TSLiteralType": return of([n.literal]);
    case "TSFunctionType": return of(n.parameters);
    case "TSTypeLiteral": return of(n.members);
    case "TSPropertySignature": return of([n.key]);
    case "TSIndexSignature": return of(n.parameters);
    case "TSMethodSignature": return of([n.key, ...n.parameters]);
    case "TSCallSignatureDeclaration": case "TSConstructSignatureDeclaration": return of(n.parameters);
    case "TSTypeAliasDeclaration": return of([n.id]);
    case "TSInterfaceDeclaration": return of([n.id, ...(n.extends ?? [])]);
    case "TSTypeQuery": return of([n.exprName]);
    case "TSIndexedAccessType": return of([n.objectType, n.indexType]);
    case "TSNamedTupleMember": return of([n.label, n.elementType]);
  }
};
// isFn as it is used: a predicate. SoundScript has no type predicates, so callers cannot narrow by it.
export const isFn = () => (n: Node | null | undefined): boolean =>
  !!n && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration");
// fields: the generic `for (const k in n)` of syntaxPass, refs, erase and cutsOf, as a typed table: each child with
// the field it is held in. New code (no counterpart in the original); kids could be fields minus the type keys.
export type Field = { key: string; node: Node };
export const fields = () => (n: Node): Field[] => {
  const f = (key: string, x: Node | null | undefined): Field[] => (x ? [{ key, node: x }] : []);
  const fs = (key: string, xs: (Node | null | undefined)[]): Field[] => xs.flatMap((x) => f(key, x));
  switch (n.type) {
    case "Identifier": return f("typeAnnotation", n.typeAnnotation);
    case "Literal": case "ThisExpression": case "TemplateElement": case "JSXIdentifier": case "JSXText": case "JSXEmptyExpression":
    case "TSAnyKeyword": case "TSUnknownKeyword": case "TSNumberKeyword": case "TSStringKeyword": case "TSBooleanKeyword": case "TSBigIntKeyword":
    case "TSNullKeyword": case "TSUndefinedKeyword": case "TSVoidKeyword": case "TSNeverKeyword": case "TSObjectKeyword": case "TSSymbolKeyword":
      return [];
    case "TemplateLiteral": return [...fs("expressions", n.expressions), ...fs("quasis", n.quasis)];
    case "ArrayExpression": return fs("elements", n.elements);
    case "ArrayPattern": return [...fs("elements", n.elements), ...f("typeAnnotation", n.typeAnnotation)];
    case "Property": return [...f("key", n.key), ...f("value", n.value)];
    case "ObjectExpression": return fs("properties", n.properties);
    case "ObjectPattern": return [...fs("properties", n.properties), ...f("typeAnnotation", n.typeAnnotation)];
    case "ArrowFunctionExpression": case "FunctionExpression": case "FunctionDeclaration":
      return [...f("id", n.id), ...f("typeParameters", n.typeParameters), ...fs("params", n.params), ...f("returnType", n.returnType), ...f("body", n.body)];
    case "UnaryExpression": case "UpdateExpression": case "SpreadElement": case "AwaitExpression": case "ThrowStatement": return f("argument", n.argument);
    case "RestElement": return [...f("argument", n.argument), ...f("typeAnnotation", n.typeAnnotation)];
    case "YieldExpression": case "ReturnStatement": return f("argument", n.argument);
    case "BinaryExpression": case "LogicalExpression": case "AssignmentExpression": case "AssignmentPattern": return [...f("left", n.left), ...f("right", n.right)];
    case "ConditionalExpression": return [...f("test", n.test), ...f("consequent", n.consequent), ...f("alternate", n.alternate)];
    case "CallExpression": case "NewExpression": return [...f("callee", n.callee), ...f("typeArguments", n.typeArguments), ...fs("arguments", n.arguments)];
    case "MemberExpression": return [...f("object", n.object), ...f("property", n.property)];
    case "ChainExpression": case "ExpressionStatement": case "TSNonNullExpression": case "JSXExpressionContainer": return f("expression", n.expression);
    case "TSAsExpression": case "TSSatisfiesExpression": return [...f("expression", n.expression), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSDeclareFunction": return [...f("id", n.id), ...fs("params", n.params), ...f("returnType", n.returnType)];
    case "SequenceExpression": return fs("expressions", n.expressions);
    case "TSParameterProperty": return f("parameter", n.parameter);
    case "VariableDeclarator": return [...f("id", n.id), ...f("init", n.init)];
    case "VariableDeclaration": return fs("declarations", n.declarations);
    case "BlockStatement": case "Program": return fs("body", n.body);
    case "IfStatement": return [...f("test", n.test), ...f("consequent", n.consequent), ...f("alternate", n.alternate)];
    case "SwitchCase": return [...f("test", n.test), ...fs("consequent", n.consequent)];
    case "SwitchStatement": return [...f("discriminant", n.discriminant), ...fs("cases", n.cases)];
    case "ForStatement": return [...f("init", n.init), ...f("test", n.test), ...f("update", n.update), ...f("body", n.body)];
    case "ForOfStatement": case "ForInStatement": return [...f("left", n.left), ...f("right", n.right), ...f("body", n.body)];
    case "WhileStatement": case "DoWhileStatement": return [...f("test", n.test), ...f("body", n.body)];
    case "BreakStatement": case "ContinueStatement": return f("label", n.label);
    case "CatchClause": return [...f("param", n.param), ...f("body", n.body)];
    case "TryStatement": return [...f("block", n.block), ...f("handler", n.handler), ...f("finalizer", n.finalizer)];
    case "LabeledStatement": return [...f("label", n.label), ...f("body", n.body)];
    case "ExportNamedDeclaration": return [...f("declaration", n.declaration), ...fs("specifiers", n.specifiers), ...f("source", n.source)];
    case "ImportDeclaration": return [...fs("specifiers", n.specifiers), ...f("source", n.source)];
    case "JSXAttribute": return [...f("name", n.name), ...f("value", n.value)];
    case "JSXOpeningElement": return [...f("name", n.name), ...fs("attributes", n.attributes)];
    case "JSXElement": return [...f("openingElement", n.openingElement), ...fs("children", n.children)];
    case "JSXFragment": return fs("children", n.children);
    case "TSTypeAnnotation": case "TSParenthesizedType": case "TSTypeOperator": case "TSOptionalType": case "TSRestType": return f("typeAnnotation", n.typeAnnotation);
    case "TSTypeParameter": return [...f("name", typeof n.name === "string" ? null : n.name), ...f("constraint", n.constraint), ...f("default", n.default)];
    case "TSTypeParameterDeclaration": case "TSTypeParameterInstantiation": return fs("params", n.params);
    case "TSTypeReference": return [...f("typeName", n.typeName), ...f("typeArguments", n.typeArguments)];
    case "TSQualifiedName": return [...f("left", n.left), ...f("right", n.right)];
    case "TSArrayType": return f("elementType", n.elementType);
    case "TSTupleType": return fs("elementTypes", n.elementTypes);
    case "TSUnionType": case "TSIntersectionType": return fs("types", n.types);
    case "TSLiteralType": return f("literal", n.literal);
    case "TSFunctionType": return [...f("typeParameters", n.typeParameters), ...fs("parameters", n.parameters), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSTypeLiteral": return fs("members", n.members);
    case "TSPropertySignature": return [...f("key", n.key), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSIndexSignature": return [...fs("parameters", n.parameters), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSMethodSignature": case "TSCallSignatureDeclaration": case "TSConstructSignatureDeclaration":
      return [...f("typeParameters", n.typeParameters), ...fs("parameters", n.parameters), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSTypeAliasDeclaration": return [...f("id", n.id), ...f("typeParameters", n.typeParameters), ...f("typeAnnotation", n.typeAnnotation)];
    case "TSInterfaceDeclaration": return [...f("id", n.id), ...f("typeParameters", n.typeParameters), ...fs("extends", n.extends ?? [])];
    case "TSTypeQuery": return f("exprName", n.exprName);
    case "TSIndexedAccessType": return [...f("objectType", n.objectType), ...f("indexType", n.indexType)];
    case "TSNamedTupleMember": return [...f("label", n.label), ...f("elementType", n.elementType)];
  }
};
