// @flow
import { assert } from "chai"

const payloads = [
  null,
  "foo",
  12,
  ["a", "b", "c"],
  { foo: "bar", baz: [1, 2, 3] }
]

type ActionHelperManifest = [Function, string]
export const assertCreatedActionHelper = (
  [actionHelper, actionType]: ActionHelperManifest
) => {
  assert.deepEqual(actionHelper(), { type: actionType })
  payloads.forEach(payload => {
    assert.deepEqual(actionHelper(payload), {
      type:    actionType,
      payload: payload
    })
  })
}

export const assertWithUsernameActionHelper = (
  [actionHelper, actionType]: ActionHelperManifest
) => {
  payloads.forEach(payload => {
    assert.deepEqual(actionHelper("username", payload), {
      type:    actionType,
      meta:    "username",
      payload: payload
    })
  })
}
