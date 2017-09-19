// @flow
import configureTestStore from "redux-asserts"
import { assert } from "chai"

import rootReducer from "../reducers"
import {
  TOGGLE_EMAIL_PATCH_IN_FLIGHT,
  toggleEmailPatchInFlight
} from "../actions/automatic_emails"

describe("automatic email reducer", () => {
  let store, dispatchThen

  beforeEach(() => {
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.automaticEmails)
  })

  it("should let you add email IDs to the in-flight list", () => {
    return dispatchThen(toggleEmailPatchInFlight(2), [
      TOGGLE_EMAIL_PATCH_IN_FLIGHT
    ]).then(state => {
      assert(state.emailsInFlight.has(2))
    })
  })

  it("should let you toggle an email ID which is already added", () => {
    store.dispatch(toggleEmailPatchInFlight(2))
    return dispatchThen(toggleEmailPatchInFlight(2), [
      TOGGLE_EMAIL_PATCH_IN_FLIGHT
    ]).then(state => {
      assert(!state.emailsInFlight.has(2))
    })
  })
})
