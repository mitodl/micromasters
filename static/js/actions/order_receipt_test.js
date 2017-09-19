// @flow
import {
  setTimeoutActive,
  setInitialTime,
  SET_TIMEOUT_ACTIVE,
  SET_INITIAL_TIME
} from "./order_receipt"
import { assertCreatedActionHelper } from "./test_util"

describe("generated order receipt action helpers", () => {
  it("should create all action creators", () => {
    [
      [setTimeoutActive, SET_TIMEOUT_ACTIVE],
      [setInitialTime, SET_INITIAL_TIME]
    ].forEach(assertCreatedActionHelper)
  })
})
