// @flow
import sinon from "sinon"
import ga from "react-ga"
import { assert } from "chai"

import { sendGAEvent, sendFormFieldEvent } from "./google_analytics"

describe("Google Analytics", () => {
  let event, sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    event = sandbox.stub(ga, "event")
  })

  afterEach(() => sandbox.restore())

  describe("sendGAEvent", () => {
    it("should send an event to GA properly", () => {
      sendGAEvent("category", "action", "label", 1)
      assert(
        event.calledWith({
          category: "category",
          action:   "action",
          label:    "label",
          value:    1
        }),
        "should be called with the right values"
      )
    })

    it("should not include `value` if it is undefined", () => {
      sendGAEvent("category", "action", "label")
      assert(
        event.calledWith({
          category: "category",
          action:   "action",
          label:    "label"
        }),
        "there should not be a value for 'value'"
      )
    })
  })

  describe("sendFormFieldEvent", () => {
    it("should properly format the keySet and send to GA", () => {
      const keySet = ["some", "keys", "wow"]
      sendFormFieldEvent(keySet)
      assert.ok(
        event.calledWith({
          category: "profile-form-field",
          action:   "completed-some-keys-wow",
          label:    "jane"
        })
      )
    })
  })
})
