// @flow
import type {
  Dispatch,
  Reducer,
  State,
} from 'redux'

export type ActionType = string

export type Action<payload, meta> = {
  type: ActionType,
  payload: payload,
  meta: meta,
}

export type Dispatcher<T> = (d: Dispatch) => Promise<T>

export type AsyncActionHelper = (...a: any) => Promise<*>

export type ActionCreator = (...a: any) => Action<*, null>

export type AsyncActionCreator<T> = (...a: any) => Dispatcher<T>

export type AssertReducerResultState<T> = (
  actionFunc: () => Action<*,*>, stateFunc: ((reducerState: State) => T), defaultValue: any
) => void

export type TestStore = {
  dispatch: Dispatch,
  getState: () => State,
  subscribe: (listener: () => void) => () => void,
  replaceReducer: (reducer: Reducer<any, any>) => void,
}
