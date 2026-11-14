// Untrusted JSON from the outside world; seen from cells.ts as Js.
export function raw() {
  return JSON.parse('{"w": 3, "h": 1.5, "extra": true}');
}
