// Fixed 2026-11-21: <input disabled />, a bare attribute, came through as Other (JSXAttribute.value was declared AstNode).
export const box = () => <input disabled />;
