/**
 * Core bidirectional lens abstraction.
 *
 * A lens from source S to view A is a pair (get, put). It is "very
 * well-behaved" when it satisfies three laws:
 *
 *   GetPut:  put(get(s), s)      = s          (putting back what you got changes nothing)
 *   PutGet:  get(put(a, s))      = a          (you get out what you put in)
 *   PutPut:  put(a2, put(a1, s)) = put(a2, s) (the last put wins)
 *
 * These laws are what "provably invertible" means here: every edit made
 * through the view can be pushed back into the source without loss, and
 * round-trips are exact. The laws are checked by property-based tests
 * (fast-check) in test/laws.ts.
 */

export interface Lens<S, A> {
  readonly get: (s: S) => A;
  readonly put: (a: A, s: S) => S;
}

export type Eq<T> = (x: T, y: T) => boolean;

export const lens = <S, A>(
  get: (s: S) => A,
  put: (a: A, s: S) => S,
): Lens<S, A> => ({ get, put });

/** Lens composition. If both lenses are lawful, the composite is lawful. */
export function compose<S, A, B>(outer: Lens<S, A>, inner: Lens<A, B>): Lens<S, B> {
  return {
    get: (s) => inner.get(outer.get(s)),
    put: (b, s) => outer.put(inner.put(b, outer.get(s)), s),
  };
}

/**
 * An isomorphism: a lens whose put ignores the old source entirely.
 * Laws: from(to(s)) = s and to(from(a)) = a.
 */
export interface Iso<S, A> {
  readonly to: (s: S) => A;
  readonly from: (a: A) => S;
}

export const isoToLens = <S, A>(i: Iso<S, A>): Lens<S, A> =>
  lens(i.to, (a, _s) => i.from(a));

/**
 * Law predicates, parameterised by equality on S and A.
 * Feed these to a property-based tester with arbitraries for S and A
 * drawn from the lens's intended domain.
 */
export const laws = {
  getPut:
    <S, A>(l: Lens<S, A>, eqS: Eq<S>) =>
    (s: S): boolean =>
      eqS(l.put(l.get(s), s), s),

  putGet:
    <S, A>(l: Lens<S, A>, eqA: Eq<A>) =>
    (a: A, s: S): boolean =>
      eqA(l.get(l.put(a, s)), a),

  putPut:
    <S, A>(l: Lens<S, A>, eqS: Eq<S>) =>
    (a1: A, a2: A, s: S): boolean =>
      eqS(l.put(a2, l.put(a1, s)), l.put(a2, s)),
};

export const isoLaws = {
  roundTripS:
    <S, A>(i: Iso<S, A>, eqS: Eq<S>) =>
    (s: S): boolean =>
      eqS(i.from(i.to(s)), s),
  roundTripA:
    <S, A>(i: Iso<S, A>, eqA: Eq<A>) =>
    (a: A): boolean =>
      eqA(i.to(i.from(a)), a),
};
