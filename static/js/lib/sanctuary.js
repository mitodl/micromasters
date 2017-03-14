// @flow
import R from 'ramda';
import { create, env } from 'sanctuary';

export const S = create({ checkTypes: false, env: env });

/*
 * returns Just(items) if all items are Just, else Nothing
 */
export const allJust = R.curry((items: S.Maybe[]) => (
  R.all(S.isJust)(items) ? S.Just(items) : S.Nothing()
));

/*
 * converts a Maybe<String> to a string
 */
export const mstr = S.maybe("", String);

/*
 * returns Nothing if the input is undefined|null,
 * else passes the input through a provided function
 * (the third argument to R.ifElse)
 */
export const ifNil = R.ifElse(R.isNil, () => S.Nothing());

/*
 * wraps a function in a guard, which will return Nothing
 * if any of the arguments are null || undefined,
 * and otherwise will return Just(fn(...args))
 * 
 * Similar to S.toMaybe
 */
export const guard = (func: Function) => (...args: any) => {
  if (R.any(R.isNil, args)) {
    return S.Nothing();
  } else {
    return S.Just(func(...args));
  }
};
