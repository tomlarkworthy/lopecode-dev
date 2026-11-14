// mathjs 15.2.0 (import {math} from "@tomlarkworthy/mathjs"), the part this module uses.
// The node types are trusted: they describe mathjs objects that nothing here checks.

type ConstValue = number | string | boolean | null | undefined;

interface MathNodeMethods {
  toString(): string;
  // Returns a new node of the same class with each child replaced by f(child); the receiver is unchanged.
  map(f: (child: MathNode, path: string, parent: MathNode) => MathNode): MathNode;
}
// Each mathjs node class defines exactly one is<Class> getter (true); on the others it is undefined.
interface NotOperator { readonly isOperatorNode?: undefined }
interface NotConstant { readonly isConstantNode?: undefined }
interface NotSymbol { readonly isSymbolNode?: undefined }
interface NotParenthesis { readonly isParenthesisNode?: undefined }
interface NotFunction { readonly isFunctionNode?: undefined }

interface MOperatorNode extends MathNodeMethods, NotConstant, NotSymbol, NotParenthesis, NotFunction {
  readonly type: "OperatorNode";
  readonly isOperatorNode: true;
  readonly op: string;
  readonly fn: string;
  readonly args: readonly MathNode[];
  readonly implicit: boolean;
  readonly isPercentage: boolean;
  isBinary(): boolean;
  isUnary(): boolean;
}
interface MConstantNode extends MathNodeMethods, NotOperator, NotSymbol, NotParenthesis, NotFunction {
  readonly type: "ConstantNode";
  readonly isConstantNode: true;
  readonly value: ConstValue;
}
interface MSymbolNode extends MathNodeMethods, NotOperator, NotConstant, NotParenthesis, NotFunction {
  readonly type: "SymbolNode";
  readonly isSymbolNode: true;
  readonly name: string;
}
interface MParenthesisNode extends MathNodeMethods, NotOperator, NotConstant, NotSymbol, NotFunction {
  readonly type: "ParenthesisNode";
  readonly isParenthesisNode: true;
  readonly content: MathNode;
}
interface MFunctionNode extends MathNodeMethods, NotOperator, NotConstant, NotSymbol, NotParenthesis {
  readonly type: "FunctionNode";
  readonly isFunctionNode: true;
  readonly fn: MathNode; // a SymbolNode or AccessorNode, not a string
  readonly args: readonly MathNode[];
}
interface MOtherNode extends MathNodeMethods, NotOperator, NotConstant, NotSymbol, NotParenthesis, NotFunction {
  readonly type:
    | "AccessorNode" | "ArrayNode" | "AssignmentNode" | "BlockNode" | "ConditionalNode"
    | "FunctionAssignmentNode" | "IndexNode" | "ObjectNode" | "RangeNode" | "RelationalNode";
}
type MathNode = MOperatorNode | MConstantNode | MSymbolNode | MParenthesisNode | MFunctionNode | MOtherNode;

// A simplify rule: mathjs >= 10 accepts a "l -> r" string, an {l, r} or {s} object, or a function of the node.
type RuleFn = (node: MathNode, options?: unknown) => MathNode;
type RuleContext = { readonly [fn: string]: { readonly [prop: string]: boolean } };
type RuleObject = {
  readonly l?: string;
  readonly r?: string;
  readonly s?: string;
  readonly context?: RuleContext;
  readonly assuming?: RuleContext;
  readonly imposeContext?: RuleContext;
  readonly repeat?: boolean;
};
type Rule = string | RuleFn | RuleObject;

/** pure */ // parse, simplify and the simplify rules do not mutate their arguments (checked for simplify: GAPS.md §2)
declare const math: {
  readonly version: string;
  parse(expr: string): MathNode;
  readonly simplify: {
    (
      expr: string | MathNode,
      rules?: readonly Rule[],
      scope?: {},
      options?: { readonly exactFractions?: boolean },
    ): MathNode;
    readonly rules: readonly Rule[];
    readonly simplifyCore?: RuleFn; // mathjs 9.x; absent in 15.2.0
  };
  readonly simplifyCore: RuleFn;
  readonly simplifyConstant: RuleFn;
};

/** pure */ // new math.OperatorNode(op, fn, args, implicit, isPercentage); RULES bans `new` on a foreign class
declare function OperatorNode(
  op: string,
  fn: string,
  args: readonly MathNode[],
  implicit?: boolean,
  isPercentage?: boolean,
): MOperatorNode;

/** pure */ // new math.ConstantNode(value)
declare function ConstantNode(value: ConstValue): MConstantNode;
