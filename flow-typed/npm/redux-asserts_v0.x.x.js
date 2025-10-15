import type { Action, Dispatch, Reducer } from 'redux'

declare module 'redux-asserts' {
  declare type State = any;
  declare type StateFunc = ((state: State) => State);

  declare export type ListenForActionsFunc = (actions: Array<string>, () => void) => Promise<State>;
  declare export type DispatchThenFunc = (action: Action, expectedActions: Array<string>) => Promise<State>

  declare export type TestStore = {
    dispatch: Dispatch,
    getState: () => State,
    subscribe: (listener: () => void) => () => void,
    replaceReducer: (reducer: Reducer<any, any>) => void,
    createListenForActions: (stateFunc?: StateFunc) => ListenForActionsFunc,
    createDispatchThen: (stateFunc?: StateFunc) => DispatchThenFunc
  }
  declare export default function configureTestStore(reducerFunc?: (state: State) => State): TestStore;
}
