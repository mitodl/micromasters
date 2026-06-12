// @flow
import { assert } from "chai"
import configureTestStore from "redux-asserts"
import sinon from "sinon"

import { showEnrollPayLaterSuccessMessage } from "./course_enrollments"
import { SHOW_ENROLL_PAY_LATER_SUCCESS } from "./ui"
import rootReducer from "../reducers"
import * as util from "../util/util"

describe("show and hide enroll pay later success alert", () => {
  let store, sandbox, dispatchThen

  beforeEach(() => {
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.ui)
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should set and reset enroll pay later dialog", () => {
    const waitPromise = Promise.resolve()
    const waitStub = sandbox.stub(util, "wait").returns(waitPromise)

    return dispatchThen(showEnrollPayLaterSuccessMessage("foo/bar/baz"), [
      SHOW_ENROLL_PAY_LATER_SUCCESS
    ]).then(state => {
      assert.equal(state.showEnrollPayLaterSuccess, "foo/bar/baz")

      sinon.assert.calledWith(waitStub, 9000)
      return waitPromise.then(() => {
        assert.deepEqual(store.getState().ui.showEnrollPayLaterSuccess, null)
      })
    })
  })
})
