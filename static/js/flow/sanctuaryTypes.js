// @flow

export type Left<L> = {
  value: L,
  isLeft: true,
  isRight: false,
};

export type Right<R> = {
  value: R,
  isLeft: false,
  isRight: true,
};

export type Either<L, R> = Left<L> | Right<R>
