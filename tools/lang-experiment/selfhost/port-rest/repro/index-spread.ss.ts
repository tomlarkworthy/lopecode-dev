// jsx/h.ts h: { ...props }
export const copy = () => (props: { readonly [k: string]: unknown }): { readonly [k: string]: unknown } => ({ ...props });
