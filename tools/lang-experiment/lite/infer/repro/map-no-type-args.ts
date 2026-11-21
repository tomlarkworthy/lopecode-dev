// Map with no type argument: the real checker crashes ("evaluating 't.k'") in the shared registry cells, and the port with it.
export const spread = () => (m: Map): unknown[] => [...m];
