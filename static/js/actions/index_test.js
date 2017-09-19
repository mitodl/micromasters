// @flow
import { assert } from "chai"

import {
  requestCheckout,
  receiveCheckoutSuccess,
  receiveCheckoutFailure,
  REQUEST_CHECKOUT,
  RECEIVE_CHECKOUT_SUCCESS,
  RECEIVE_CHECKOUT_FAILURE
} from "./"
import { ERROR_RESPONSE } from "../constants"

describe("generated index action helpers", () => {
  it("requestCheckout passes a course id", () => {
    assert.deepEqual(requestCheckout("course_id"), {
      type:    REQUEST_CHECKOUT,
      payload: { courseId: "course_id" }
    })
  })

  it("receiveCheckoutSuccess passes a url and payload", () => {
    assert.deepEqual(receiveCheckoutSuccess("url", { pay: "load" }), {
      type:    RECEIVE_CHECKOUT_SUCCESS,
      payload: {
        payload: { pay: "load" },
        url:     "url"
      }
    })
  })

  it("receiveCheckoutFailure passes errorInfo", () => {
    assert.deepEqual(receiveCheckoutFailure(ERROR_RESPONSE), {
      type:    RECEIVE_CHECKOUT_FAILURE,
      payload: {
        errorInfo: ERROR_RESPONSE
      }
    })
  })
})
