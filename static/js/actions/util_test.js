// @flow
import { assert } from "chai"

import { withUsername } from "./util"

describe("action creator utils", () => {
  describe("withUsername", () => {
    const TYPE = "TYPE"
    it("should return an action creator, given a type", () => {
      const creator = withUsername(TYPE)
      assert.isFunction(creator)
    })

    it("should add a username and a payload", () => {
      const creator = withUsername(TYPE)
      const action = creator("username", { my: "payload" })
      assert.deepEqual(action, {
        type:    TYPE,
        payload: { my: "payload" },
        meta:    "username"
      })
    })
  })
})
