type Key = Key;
const a = () => (k: Key) => k;
const b = (a: (k: Key) => Key) => a(1);
