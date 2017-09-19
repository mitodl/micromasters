import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import configureTestStore from "redux-asserts"

import { INITIAL_STATE } from "./redux_rest_constants"
import { automaticEmailsEndpoint } from "../reducers/automatic_emails"
import { courseEnrollmentsEndpoint } from "../reducers/course_enrollments"
import rootReducer from "../reducers"

describe("redux REST", () => {
  let sandbox, store

  describe("exported reducers", () => {
    beforeEach(() => {
      sandbox = sinon.sandbox.create()
      store = configureTestStore(rootReducer)
    })

    afterEach(() => {
      sandbox.restore()
    })

    let endpoints = [automaticEmailsEndpoint, courseEnrollmentsEndpoint]

    it("should include all reducers that we expect it to", () => {
      let state = store.getState()
      endpoints.forEach(endpoint => {
        let expected = R.propOr(INITIAL_STATE, "initialState", endpoint)
        assert.deepEqual(expected, state[endpoint.name])
      })
    })
  })
})
