// Values from outside the module. Imports from other modules first, then the world, then libraries.

/** effect */ // import {tests} from "@tomlarkworthy/tests": walks the runtime reflectively
declare const tests: () => unknown;
/** effect */ // import {runtime} from "@tomlarkworthy/runtime-sdk": the live Observable runtime
declare const runtime: unknown;
/** effect */ // import {variables} from "@tomlarkworthy/runtime-sdk": a view over runtime._variables
declare const variables: (runtime: unknown) => unknown;

/** effect */ // window.location: a live object; href changes on navigation
declare const location: { readonly href: string };

/** pure */ // new URL(href), reduced to the two fields linkTo reads; throws on an invalid URL like new URL
declare function parseUrl(href: string): { readonly hash: string; readonly href: string };
