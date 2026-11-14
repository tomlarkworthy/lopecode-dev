// Records: missing and extra fields against an annotation, unknown properties, optional fields.
type P = { readonly x: number; readonly y: number; readonly label?: string };
export let bad_missing = (): P => ({ x: 1 });
export let bad_extra = (): P => ({ x: 1, y: 2, z: 3 });
export let bad_field_type = (): P => ({ x: 1, y: "2" });
export let p = (): P => ({ x: 1, y: 2 });
export let bad_unknown_prop = (p) => p.z;
export let bad_optional_use = (p) => p.label.length;
export let ok_optional = (p) => (p.label ?? "none").length + p.x;
