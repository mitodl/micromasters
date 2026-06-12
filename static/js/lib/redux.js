// @flow
import type { Dispatch } from "redux"
import R from "ramda"

import type {
  ActionCreator,
  AsyncActionHelper,
  AsyncActionCreator
} from "../flow/reduxTypes"

/**
 * takes an actionCreator and dispatch and returns a function that
 * dispatches the action created by that actionCreator to the store
 */
export function createActionHelper(
  dispatch: Dispatch,
  actionCreator: Function
): (...args: any) => void {
  return (...args) => dispatch(actionCreator(...args))
}

/*
 * returns an array of simple (synchronous) action helpers when passed the
 * dispatch function and an array of synchronous action creators
 */
export type ActionHelpers = { [k: string]: (...args: any) => void }
export type ActionManifest = Array<[string, ActionCreator]>
export function createSimpleActionHelpers(
  dispatch: Dispatch,
  actionList: ActionManifest
): ActionHelpers {
  return R.fromPairs(
    actionList.map(([name, actionCreator]) => [
      name,
      createActionHelper(dispatch, actionCreator)
    ])
  )
}

/*
 * returns an array of async action helpers from async action creators (those
 * that return a function taking dispatch as an argument)
 */
export type AsyncActionHelpers = { [k: string]: AsyncActionHelper }
export type AsyncActionManifest = Array<[string, AsyncActionCreator<any>]>
export function createAsyncActionHelpers(
  dispatch: Dispatch,
  actionList: AsyncActionManifest
): AsyncActionHelpers {
  return R.fromPairs(
    actionList.map(([name, actionCreator]) => [
      name,
      createActionHelper(dispatch, actionCreator)
    ])
  )
}
