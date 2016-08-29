// @flow
import type { Dispatch } from 'redux';

export type Action = {
  type: string;
  payload: any
};

export type Dispatcher<T> = (d: Dispatch) => Promise<T>;

export type AsyncActionHelper = (...a: any) => Promise<*>;

export type ActionCreator = (...a: any) => Action;

export type AsyncActionCreator<T> = (...a: any) => Dispatcher<T>;
