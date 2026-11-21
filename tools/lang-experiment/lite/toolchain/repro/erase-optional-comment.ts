// erase.ts finds an optional parameter's ? with indexOf, so a ? inside a comment before it is cut instead:
// erase gives "const f = (x /*  */ ?) => x;", which does not parse. The tc port reads the first token after the name.
const f = (x /* ? */ ?: number) => x;
