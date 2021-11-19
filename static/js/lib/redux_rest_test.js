import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"
import configureTestStore from "redux-asserts"

import { INITIAL_STATE } from "./redux_rest_constants"
import { automaticEmailsEndpoint } from "../reducers/automatic_emails"
import { courseEnrollmentsEndpoint } from "../reducers/course_enrollments"
import rootReducer from "../reducers"
import { examEnrollmentEndpoint } from "../reducers/exam_enrollment"

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

    const endpoints = [
      automaticEmailsEndpoint,
      courseEnrollmentsEndpoint,
      examEnrollmentEndpoint
    ]

    it("should include all reducers that we expect it to", () => {
      const state = store.getState()
      endpoints.forEach(endpoint => {
        const expected = R.propOr(INITIAL_STATE, "initialState", endpoint)
        assert.deepEqual(expected, state[endpoint.name])
      })
    })
  })
})
