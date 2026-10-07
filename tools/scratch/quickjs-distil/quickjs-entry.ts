// The QuickJS library the guard carries: one self-contained ES module. The WebAssembly is passed in.
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import baseVariant from "@jitl/quickjs-wasmfile-release-sync";
export const load = (wasmModule: WebAssembly.Module) => newQuickJSWASMModuleFromVariant(newVariant(baseVariant as any, { wasmModule }));
