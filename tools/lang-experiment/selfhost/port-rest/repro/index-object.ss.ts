// boundary.ts copy: a property of an object of foreign shape, by name
export const get = () => (v: object, n: string): unknown => v[n];
