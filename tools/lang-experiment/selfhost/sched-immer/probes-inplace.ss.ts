// Probes: a step that writes an exclusively owned state in place and returns only its effects.
type H = { readonly busy: boolean; readonly no: number; readonly listeners: readonly number[] };
type Fx = { readonly fx: "frame"; readonly hid: number; readonly no: number };
type Ev = { readonly t: "kick"; readonly hid: number } | { readonly t: "drop"; readonly hid: number };
type St = { readonly hs: Map<number, H>; readonly placer: boolean };
let ok_step_maps = () => (hs: Mut<Map<number, H>>, at: Mut<Map<string, number>>, ev: Ev): readonly Fx[] => {
  const fx = mut<Fx[]>([]);
  const kick = (hid: number) => {
    const h = hs.get(hid);
    if (h === undefined || h.busy) return;
    hs.set(hid, { ...h, busy: true });
    fx.push({ fx: "frame", hid, no: h.no });
  };
  switch (ev.t) {
    case "kick": kick(ev.hid); break;
    case "drop": hs.delete(ev.hid); at.delete(`h${ev.hid}`); break;
  }
  return freeze(fx);
};
let ok_caller_cell = (ok_step_maps) => {
  const hs = mut(new Map<number, H>([[1, { busy: false, no: 0, listeners: [] }]]));
  const at = mut(new Map<string, number>());
  const a = ok_step_maps(hs, at, { t: "kick", hid: 1 });
  const b = ok_step_maps(hs, at, { t: "kick", hid: 1 });
  return { a, b, hs: freeze(hs), at: freeze(at) };
};
let ok_step_record_top = () => (st: Mut<St>, ev: Ev): readonly Fx[] => {
  st.placer = ev.t === "kick";
  return [];
};
let bad_step_record_deep = () => (st: Mut<St>, ev: Ev): readonly Fx[] => {
  st.hs.set(ev.hid, { busy: true, no: 0, listeners: [] });
  return [];
};
let bad_step_record_field_in_place = () => (hs: Mut<Map<number, H>>, ev: Ev): readonly Fx[] => {
  const h = hs.get(ev.hid);
  if (h !== undefined) h.busy = true;
  return [];
};
let bad_return_state = () => (hs: Mut<Map<number, H>>, ev: Ev) => hs;
let bad_state_in_effect = () => (hs: Mut<Map<number, H>>, ev: Ev) => [{ fx: "keep", hs }];
let bad_closure_over_state = () => (hs: Mut<Map<number, H>>, ev: Ev) => () => hs.size;
let bad_state_into_effect_list = () => (hs: Mut<Map<number, H>>, out: Mut<Mut<Map<number, H>>[]>, ev: Ev) => { out.push(hs); };
let ok_return_record = () => (hs: Mut<Map<number, H>>, ev: Ev): H | undefined => hs.get(ev.hid);
let ok_return_view_copy = () => (hs: Mut<Map<number, H>>, ev: Ev): readonly number[] => [...hs.keys()];
let bad_return_view = () => (hs: Mut<Map<number, H>>, ev: Ev) => hs.keys();
let bad_freeze_param = () => (hs: Mut<Map<number, H>>, ev: Ev) => freeze(hs);
let bad_async_step = () => async (hs: Mut<Map<number, H>>, ev: Ev) => { await Promise.resolve(0); hs.delete(ev.hid); };
