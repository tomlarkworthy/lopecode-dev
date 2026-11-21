// A typed AST: the acorn + acorn-typescript node shapes the sampled checker code reads, as one union narrowed by
// `type`. Field sets are acorn's (measured over the checker's own parse); only fields some port reads are listed.
// `loc` is left out (the ports use start/end). Probe files that start with `// uses: ast` are checked with this
// file in front of them (run.ts).
export type Span = { start: number; end: number };
export type Identifier = { type: "Identifier"; start: number; end: number; name: string; optional?: boolean; typeAnnotation?: TSTypeAnnotation | null };
export type RegexInfo = { pattern: string; flags: string };
export type Literal = { type: "Literal"; start: number; end: number; value: string | number | boolean | null; raw: string; regex?: RegexInfo };
export type TemplateElement = { type: "TemplateElement"; start: number; end: number; value: { raw: string; cooked: string | null }; tail: boolean };
export type TemplateLiteral = { type: "TemplateLiteral"; start: number; end: number; expressions: Node[]; quasis: TemplateElement[] };
export type ThisExpression = { type: "ThisExpression"; start: number; end: number };
export type ArrayExpression = { type: "ArrayExpression"; start: number; end: number; elements: (Node | null)[] };
export type Property = { type: "Property"; start: number; end: number; key: Node; value: Node; computed: boolean; shorthand: boolean; method: boolean; kind: string };
export type ObjectExpression = { type: "ObjectExpression"; start: number; end: number; properties: Node[] };
export type FunctionNode = {
  type: "ArrowFunctionExpression" | "FunctionExpression" | "FunctionDeclaration"; start: number; end: number;
  id: Identifier | null; params: Node[]; body: Node; async: boolean; generator: boolean; expression: boolean;
  returnType?: TSTypeAnnotation | null; typeParameters?: TSTypeParameterDeclaration | null;
};
export type UnaryExpression = { type: "UnaryExpression"; start: number; end: number; operator: string; prefix: boolean; argument: Node };
export type UpdateExpression = { type: "UpdateExpression"; start: number; end: number; operator: string; prefix: boolean; argument: Node };
export type BinaryExpression = { type: "BinaryExpression"; start: number; end: number; operator: string; left: Node; right: Node };
export type LogicalExpression = { type: "LogicalExpression"; start: number; end: number; operator: string; left: Node; right: Node };
export type AssignmentExpression = { type: "AssignmentExpression"; start: number; end: number; operator: string; left: Node; right: Node };
export type ConditionalExpression = { type: "ConditionalExpression"; start: number; end: number; test: Node; consequent: Node; alternate: Node };
export type CallExpression = { type: "CallExpression"; start: number; end: number; callee: Node; arguments: Node[]; optional: boolean; typeArguments?: TSTypeParameterInstantiation | null };
export type NewExpression = { type: "NewExpression"; start: number; end: number; callee: Node; arguments: Node[]; typeArguments?: TSTypeParameterInstantiation | null };
export type MemberExpression = { type: "MemberExpression"; start: number; end: number; object: Node; property: Node; computed: boolean; optional: boolean };
export type ChainExpression = { type: "ChainExpression"; start: number; end: number; expression: Node };
export type SequenceExpression = { type: "SequenceExpression"; start: number; end: number; expressions: Node[] };
export type SpreadElement = { type: "SpreadElement"; start: number; end: number; argument: Node };
export type AwaitExpression = { type: "AwaitExpression"; start: number; end: number; argument: Node };
export type YieldExpression = { type: "YieldExpression"; start: number; end: number; argument: Node | null; delegate: boolean };
export type TSAsExpression = { type: "TSAsExpression"; start: number; end: number; expression: Node; typeAnnotation: Node };
export type TSNonNullExpression = { type: "TSNonNullExpression"; start: number; end: number; expression: Node };
export type ObjectPattern = { type: "ObjectPattern"; start: number; end: number; properties: Node[]; typeAnnotation?: TSTypeAnnotation | null };
export type ArrayPattern = { type: "ArrayPattern"; start: number; end: number; elements: (Node | null)[]; typeAnnotation?: TSTypeAnnotation | null };
export type RestElement = { type: "RestElement"; start: number; end: number; argument: Node; typeAnnotation?: TSTypeAnnotation | null };
export type AssignmentPattern = { type: "AssignmentPattern"; start: number; end: number; left: Node; right: Node };
export type TSParameterProperty = { type: "TSParameterProperty"; start: number; end: number; parameter: Node };
export type VariableDeclarator = { type: "VariableDeclarator"; start: number; end: number; id: Node; init: Node | null };
export type VariableDeclaration = { type: "VariableDeclaration"; start: number; end: number; kind: string; declarations: VariableDeclarator[] };
export type ExpressionStatement = { type: "ExpressionStatement"; start: number; end: number; expression: Node };
export type BlockStatement = { type: "BlockStatement"; start: number; end: number; body: Node[] };
export type ReturnStatement = { type: "ReturnStatement"; start: number; end: number; argument: Node | null };
export type IfStatement = { type: "IfStatement"; start: number; end: number; test: Node; consequent: Node; alternate: Node | null };
export type SwitchCase = { type: "SwitchCase"; start: number; end: number; test: Node | null; consequent: Node[] };
export type SwitchStatement = { type: "SwitchStatement"; start: number; end: number; discriminant: Node; cases: SwitchCase[] };
export type ForStatement = { type: "ForStatement"; start: number; end: number; init: Node | null; test: Node | null; update: Node | null; body: Node };
export type ForOfStatement = { type: "ForOfStatement" | "ForInStatement"; start: number; end: number; left: Node; right: Node; body: Node; await?: boolean };
export type WhileStatement = { type: "WhileStatement" | "DoWhileStatement"; start: number; end: number; test: Node; body: Node };
export type BreakStatement = { type: "BreakStatement" | "ContinueStatement"; start: number; end: number; label: Identifier | null };
export type ThrowStatement = { type: "ThrowStatement"; start: number; end: number; argument: Node };
export type CatchClause = { type: "CatchClause"; start: number; end: number; param: Node | null; body: BlockStatement };
export type TryStatement = { type: "TryStatement"; start: number; end: number; block: BlockStatement; handler: CatchClause | null; finalizer: BlockStatement | null };
export type LabeledStatement = { type: "LabeledStatement"; start: number; end: number; label: Identifier; body: Node };
export type ExportNamedDeclaration = { type: "ExportNamedDeclaration"; start: number; end: number; declaration: Node | null; specifiers: Node[]; source: Literal | null };
export type ImportDeclaration = { type: "ImportDeclaration"; start: number; end: number; specifiers: Node[]; source: Literal; importKind?: string };
export type Program = { type: "Program"; start: number; end: number; body: Node[] };
export type JSXIdentifier = { type: "JSXIdentifier"; start: number; end: number; name: string };
export type JSXAttribute = { type: "JSXAttribute"; start: number; end: number; name: Node; value: Node | null };
export type JSXOpeningElement = { type: "JSXOpeningElement"; start: number; end: number; name: Node; attributes: Node[]; selfClosing: boolean };
export type JSXElement = { type: "JSXElement"; start: number; end: number; openingElement: JSXOpeningElement; children: Node[] };
export type JSXFragment = { type: "JSXFragment"; start: number; end: number; children: Node[] };
export type JSXExpressionContainer = { type: "JSXExpressionContainer"; start: number; end: number; expression: Node };
export type JSXEmptyExpression = { type: "JSXEmptyExpression"; start: number; end: number };
export type TSSatisfiesExpression = { type: "TSSatisfiesExpression"; start: number; end: number; expression: Node; typeAnnotation: Node };
export type TSDeclareFunction = { type: "TSDeclareFunction"; start: number; end: number; id: Identifier | null; params: Node[]; returnType?: TSTypeAnnotation | null };
export type JSXText = { type: "JSXText"; start: number; end: number; value: string };
// type syntax
export type TSTypeAnnotation = { type: "TSTypeAnnotation"; start: number; end: number; typeAnnotation: Node };
export type TSTypeParameter = { type: "TSTypeParameter"; start: number; end: number; name: string | Identifier; constraint: Node | null; default: Node | null };
export type TSTypeParameterDeclaration = { type: "TSTypeParameterDeclaration"; start: number; end: number; params: TSTypeParameter[] };
export type TSTypeParameterInstantiation = { type: "TSTypeParameterInstantiation"; start: number; end: number; params: Node[] };
export type TSKeyword = {
  type: "TSAnyKeyword" | "TSUnknownKeyword" | "TSNumberKeyword" | "TSStringKeyword" | "TSBooleanKeyword" | "TSBigIntKeyword" | "TSNullKeyword" |
    "TSUndefinedKeyword" | "TSVoidKeyword" | "TSNeverKeyword" | "TSObjectKeyword" | "TSSymbolKeyword";
  start: number; end: number;
};
export type TSTypeReference = { type: "TSTypeReference"; start: number; end: number; typeName: Node; typeArguments?: TSTypeParameterInstantiation | null };
export type TSQualifiedName = { type: "TSQualifiedName"; start: number; end: number; left: Node; right: Identifier };
export type TSArrayType = { type: "TSArrayType"; start: number; end: number; elementType: Node };
export type TSTupleType = { type: "TSTupleType"; start: number; end: number; elementTypes: Node[] };
export type TSUnionType = { type: "TSUnionType" | "TSIntersectionType"; start: number; end: number; types: Node[] };
export type TSParenthesizedType = { type: "TSParenthesizedType"; start: number; end: number; typeAnnotation: Node };
export type TSTypeOperator = { type: "TSTypeOperator"; start: number; end: number; operator: string; typeAnnotation: Node };
export type TSLiteralType = { type: "TSLiteralType"; start: number; end: number; literal: Node };
export type TSFunctionType = { type: "TSFunctionType"; start: number; end: number; typeParameters?: TSTypeParameterDeclaration | null; parameters: Node[]; typeAnnotation: TSTypeAnnotation | null };
export type TSTypeLiteral = { type: "TSTypeLiteral"; start: number; end: number; members: Node[] };
export type TSPropertySignature = { type: "TSPropertySignature"; start: number; end: number; key: Node; computed: boolean; optional?: boolean; readonly?: boolean; typeAnnotation?: TSTypeAnnotation | null };
export type TSIndexSignature = { type: "TSIndexSignature"; start: number; end: number; parameters: Node[]; typeAnnotation?: TSTypeAnnotation | null };
export type TSMethodSignature = { type: "TSMethodSignature"; start: number; end: number; key: Node; computed: boolean; optional?: boolean; parameters: Node[]; typeAnnotation?: TSTypeAnnotation | null; typeParameters?: TSTypeParameterDeclaration | null };
export type TSCallSignature = { type: "TSCallSignatureDeclaration" | "TSConstructSignatureDeclaration"; start: number; end: number; parameters: Node[]; typeAnnotation?: TSTypeAnnotation | null; typeParameters?: TSTypeParameterDeclaration | null };
export type TSTypeAliasDeclaration = { type: "TSTypeAliasDeclaration"; start: number; end: number; id: Identifier; typeParameters?: TSTypeParameterDeclaration | null; typeAnnotation: Node };
export type TSInterfaceDeclaration = { type: "TSInterfaceDeclaration"; start: number; end: number; id: Identifier; typeParameters?: TSTypeParameterDeclaration | null; body: { type: "TSInterfaceBody"; start: number; end: number; body: Node[] }; extends?: Node[] };
export type TSTypeQuery = { type: "TSTypeQuery"; start: number; end: number; exprName: Node };
export type TSIndexedAccessType = { type: "TSIndexedAccessType"; start: number; end: number; objectType: Node; indexType: Node };
export type TSOptionalType = { type: "TSOptionalType" | "TSRestType"; start: number; end: number; typeAnnotation: Node };
export type TSNamedTupleMember = { type: "TSNamedTupleMember"; start: number; end: number; label: Identifier; elementType: Node; optional: boolean };
export type Node =
  | Identifier | Literal | TemplateLiteral | TemplateElement | ThisExpression | ArrayExpression | Property | ObjectExpression | FunctionNode
  | UnaryExpression | UpdateExpression | BinaryExpression | LogicalExpression | AssignmentExpression | ConditionalExpression
  | CallExpression | NewExpression | MemberExpression | ChainExpression | SequenceExpression | SpreadElement | AwaitExpression | YieldExpression
  | TSAsExpression | TSNonNullExpression | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern | TSParameterProperty
  | VariableDeclarator | VariableDeclaration | ExpressionStatement | BlockStatement | ReturnStatement | IfStatement | SwitchCase | SwitchStatement
  | ForStatement | ForOfStatement | WhileStatement | BreakStatement | ThrowStatement | CatchClause | TryStatement | LabeledStatement
  | ExportNamedDeclaration | ImportDeclaration | Program
  | JSXIdentifier | JSXAttribute | JSXOpeningElement | JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXEmptyExpression
  | TSSatisfiesExpression | TSDeclareFunction
  | TSTypeAnnotation | TSTypeParameter | TSTypeParameterDeclaration | TSTypeParameterInstantiation | TSKeyword | TSTypeReference | TSQualifiedName
  | TSArrayType | TSTupleType | TSUnionType | TSParenthesizedType | TSTypeOperator | TSLiteralType | TSFunctionType | TSTypeLiteral
  | TSPropertySignature | TSIndexSignature | TSMethodSignature | TSCallSignature | TSTypeAliasDeclaration | TSInterfaceDeclaration
  | TSTypeQuery | TSIndexedAccessType | TSOptionalType | TSNamedTupleMember;
export type Comment = { block: boolean; text: string; start: number; end: number };
// parse.ts Parsed, with its two functions as fields of a record
export type Parsed = { program: Program; comments: Comment[]; src: string; leading: (n: Node) => Comment[]; line: (pos: number) => number };
