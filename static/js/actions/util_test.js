// @flow
import { assert } from "chai"

import { withUsername } from "./util"

describe("action creator utils", () => {
  describe("withUsername", () => {
    let TYPE = "TYPE"
    it("should return an action creator, given a type", () => {
      let creator = withUsername(TYPE)
      assert.isFunction(creator)
    })

    it("should add a username and a payload", () => {
      let creator = withUsername(TYPE)
      let action = creator("username", { my: "payload" })
      assert.deepEqual(action, {
        type:    TYPE,
        payload: { my: "payload" },
        meta:    "username"
      })
    })
  })
})
