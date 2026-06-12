// @flow
import R from "ramda"
import { create, env } from "sanctuary"

export const S = create({ checkTypes: false, env: env })

/*
 * returns Just(items) if all items are Just, else Nothing
 */
export const allJust = R.curry((items: S.Maybe[]) =>
  R.all(S.isJust)(items) ? S.Just(items) : S.Nothing
)

/*
 * converts a Maybe<String> to a string
 */
export const mstr = S.maybe("", String)

/*
 * returns Nothing if the input is undefined|null,
 * else passes the input through a provided function
 * (the third argument to R.ifElse)
 */
export const ifNil = R.ifElse(R.isNil, () => S.Nothing)

/*
 * wraps a function in a guard, which will return Nothing
 * if any of the arguments are null || undefined,
 * and otherwise will return Just(fn(...args))
 *
 * Similar to S.toMaybe
 *
 * guard :: (a -> b) -> (a -> Maybe b)
 */
export const guard = (func: Function) => (...args: any) => {
  if (R.any(R.isNil, args)) {
    return S.Nothing
  } else {
    return S.Just(func(...args))
  }
}

// getm :: String -> Object -> Maybe a
export const getm = R.curry((prop, obj) => S.toMaybe(R.prop(prop, obj)))

// parseJSON :: String -> Either Object Object
// A Right value indicates the JSON parsed successfully,
// a Left value indicates the JSON was malformed (a Left contains
// an empty object)
export const parseJSON = S.encaseEither(() => ({}), JSON.parse)

// filterE :: (Either -> Boolean) -> Either -> Either
// filterE takes a function f and an either E(v).
// if the Either is a Left, it returns it.
// if the f(v) === true, it returns, E. Else,
// if returns Left(v).
export const filterE = R.curry((predicate, either) =>
  S.either(
    S.Left,
    right => (predicate(right) ? S.Right(right) : S.Left(right)),
    either
  )
)

// reduceM :: forall a b. b -> (a -> b) -> Maybe a -> b
// this is how I think Sanctuary's `reduce` should handle a maybe
// pass a default value, a function, and a maybe
// if Nothing, return the function called with the default value
// if Just, return the function called with the value in the Just
export const reduceM = R.curry((def, fn, maybe) =>
  S.maybe_(() => fn(def), fn, maybe)
)
