// @flow
import {
  updateValidationVisibility,
  UPDATE_VALIDATION_VISIBILITY
} from "./profile"
import { assert } from "chai"

describe("generated profile action helpers", () => {
  it("should take a username and a keySet", () => {
    const action = updateValidationVisibility("my user", ["a", "key", "set"])
    assert.deepEqual(action, {
      type:    UPDATE_VALIDATION_VISIBILITY,
      payload: {
        username: "my user",
        keySet:   ["a", "key", "set"]
      }
    })
  })
})
