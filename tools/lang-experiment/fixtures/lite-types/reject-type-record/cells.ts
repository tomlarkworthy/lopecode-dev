// Records: missing and extra fields against an annotation, unknown properties, optional fields.
type P = { readonly x: number; readonly y: number; readonly label?: string };
let bad_missing = (): P => ({ x: 1 });
let bad_extra = (): P => ({ x: 1, y: 2, z: 3 });
let bad_field_type = (): P => ({ x: 1, y: "2" });
let p = (): P => ({ x: 1, y: 2 });
let bad_unknown_prop = (p) => p.z;
let bad_optional_use = (p) => p.label.length;
let ok_optional = (p) => (p.label ?? "none").length + p.x;
