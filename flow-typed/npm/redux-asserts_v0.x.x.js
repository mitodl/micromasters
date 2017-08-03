import type { Action, Dispatch, Reducer } from 'redux'

declare module 'redux-asserts' {
  declare type State = any;
  declare type StateFunc = ((state: State) => State);

  declare type TestStore = {
    dispatch: Dispatch,
    getState: () => State,
    subscribe: (listener: () => void) => () => void,
    replaceReducer: (reducer: Reducer<any, any>) => void,
    createListenForActions: (stateFunc?: StateFunc) => ((actions: Array<string>, () => void) => Promise<State>),
    createDispatchThen: (stateFunc?: StateFunc) => (
      (action: Action, expectedActions: Array<string>) => Promise<State>
    )
  }
  declare export default function configureTestStore(reducerFunc?: (state: State) => State): TestStore;
}
