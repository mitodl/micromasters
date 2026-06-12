// @flow
import { assert } from "chai"
import sinon from "sinon"

import {
  createActionHelper,
  createSimpleActionHelpers,
  createAsyncActionHelpers
} from "./redux"

describe("redux helpers", () => {
  const MY_ACTION = "MY_ACTION"
  const dispatch = sinon.spy()
  const actionCreator = arg => ({
    type:    MY_ACTION,
    payload: arg,
    meta:    null
  })

  describe("createActionHelper", () => {
    let helper
    beforeEach(() => {
      helper = createActionHelper(dispatch, actionCreator)
    })

    it("should return a function", () => {
      assert.isFunction(helper)
    })

    it("should return a function that calls dispatch", () => {
      helper(null)
      assert(dispatch.called)
    })

    it("should return a function that passes arguments to dispatch", () => {
      helper(3)
      assert(
        dispatch.calledWith({
          type:    MY_ACTION,
          payload: 3,
          meta:    null
        })
      )
    })
  })

  describe("createSimpleActionHelpers", () => {
    const actionList = [["actionCreator", actionCreator]]

    let actions
    beforeEach(() => {
      actions = createSimpleActionHelpers(dispatch, actionList)
    })

    it("should return an object containing functions", () => {
      assert.isObject(actions)
      const actionCreator = actions.actionCreator
      assert.isFunction(actionCreator)
    })

    it("the functions returned should call dispatch with arguments", () => {
      const actionCreator = actions.actionCreator
      actionCreator(3)
      assert(
        dispatch.calledWith({
          type:    MY_ACTION,
          payload: 3,
          meta:    null
        })
      )
    })
  })

  describe("createAsyncActionHelpers", () => {
    const MY_ASYNC_ACTION = "MY_ASYNC_ACTION"
    const asyncActionCreator = arg => dispatch =>
      dispatch({
        type:    MY_ASYNC_ACTION,
        payload: arg
      })
    const actionList = [["asyncActionCreator", asyncActionCreator]]

    const dispatchSpy = sinon.stub().returns(Promise.resolve())
    const asyncDispatch = createdActionFunc => {
      if (typeof createdActionFunc === "function") {
        return createdActionFunc(dispatchSpy)
      }
    }

    let actions
    beforeEach(() => {
      actions = createAsyncActionHelpers(asyncDispatch, actionList)
    })

    it("should return an object containing functions", () => {
      assert.isObject(actions)
      const { asyncActionCreator } = actions
      assert.isFunction(asyncActionCreator)
    })

    it("should return an object full of asyncActionCreators", () => {
      const { asyncActionCreator } = actions
      const dispatched = asyncActionCreator(2)
      assert.isFulfilled(dispatched)
      assert(
        dispatchSpy.calledWith({
          type:    MY_ASYNC_ACTION,
          payload: 2
        })
      )
    })
  })
})
