// @flow
import { assert } from "chai"
import { discussionErrors, CHANNEL_NAME_ERROR } from "./discussions"

describe("Discussion validation functions", () => {
  it("should return that two fields are required", () => {
    assert.deepEqual(discussionErrors({}), {
      name:  "Channel name is required",
      title: "Channel title is required"
    })
  })

  for (const invalidName of ["_b", "b", "1", "11", "a".repeat(22)]) {
    it(`should return an error for invalid channel name: ${invalidName}`, () => {
      assert.deepEqual(
        discussionErrors({
          name:               invalidName,
          title:              "valid",
          public_description: "valid"
        }),
        {
          name: CHANNEL_NAME_ERROR
        }
      )
    })
  }

  for (const validName of [
    "12_",
    "15_45",
    "12_bb",
    "bb_bb",
    "bb_15",
    "bbb_",
    "bbb",
    "ab5",
    "111",
    "a".repeat(21)
  ]) {
    it(`should not return an error for valid channel name: ${validName}`, () => {
      assert.deepEqual(
        discussionErrors({
          name:               validName,
          title:              "valid",
          public_description: "valid"
        }),
        {}
      )
    })
  }
})
