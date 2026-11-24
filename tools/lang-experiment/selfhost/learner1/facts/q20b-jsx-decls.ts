// the tags and each tag's props with their types, read from JSX_DECLS with lite's parser
import { parseTree } from "../../../lite/acorn/index.ts";
import { JSX_DECLS } from "../../../lite/intrinsics.ts";
const ast: any = (parseTree(JSX_DECLS, false) as any).ast.program;
const src = (n: any) => JSX_DECLS.slice(n.start, n.end);
const ifaces = new Map<string, { ext: string[]; props: string[] }>();
for (const d of ast.body) {
  if (d.type === "TSInterfaceDeclaration") ifaces.set(d.id.name, { ext: d.extends.map((e: any) => src(e.expression)), props: d.body.body.map((m: any) => `${m.key.name}${m.optional ? "?" : ""}: ${src(m.typeAnnotation.typeAnnotation)}`) });
  if (d.type === "TSTypeAliasDeclaration") console.log(`type ${d.id.name} = ${src(d.typeAnnotation)}`);
}
const all = (n: string): string[] => { const i = ifaces.get(n); return i ? [...i.ext.flatMap(all), ...i.props] : []; };
for (const m of ifaces.get("IntrinsicElements")!.props) { const [tag, t] = m.split(": "); console.log(`<${tag}> (${t}): ${all(t!).join("; ")}`); }
