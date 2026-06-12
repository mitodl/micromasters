// @flow
import { assert } from "chai"
import configureTestStore from "redux-asserts"
import sinon from "sinon"
import IntegrationTestHelper from "../util/integration_test_helper"

import * as api from "../lib/api"
import rootReducer from "../reducers"
import {
  requestGetProgramEnrollments,
  receiveGetProgramEnrollmentsSuccess,
  receiveGetProgramEnrollmentsFailure,
  requestAddProgramEnrollment,
  receiveAddProgramEnrollmentSuccess,
  receiveAddProgramEnrollmentFailure,
  clearEnrollments,
  setCurrentProgramEnrollment,
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
  SET_CURRENT_PROGRAM_ENROLLMENT,
  unEnrollProgramEnrollments
} from "./programs"
import {
  SET_UNENROLL_API_INFLIGHT_STATE,
  SET_PROGRAMS_TO_UNENROLL,
  SET_TOAST_MESSAGE
} from "./ui"
import { assertCreatedActionHelper } from "./test_util"

describe("program enrollment actions", () => {
  it("should create all action creators", () => {
    [
      [requestGetProgramEnrollments, REQUEST_GET_PROGRAM_ENROLLMENTS],
      [
        receiveGetProgramEnrollmentsSuccess,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
      ],
      [
        receiveGetProgramEnrollmentsFailure,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE
      ],
      [requestAddProgramEnrollment, REQUEST_ADD_PROGRAM_ENROLLMENT],
      [
        receiveAddProgramEnrollmentSuccess,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS
      ],
      [
        receiveAddProgramEnrollmentFailure,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE
      ],
      [clearEnrollments, CLEAR_ENROLLMENTS],
      [setCurrentProgramEnrollment, SET_CURRENT_PROGRAM_ENROLLMENT]
    ].forEach(assertCreatedActionHelper)
  })
})

describe("unEnrollProgramEnrollments", () => {
  let store, sandbox, dispatchThen, helper, unEnrollProgramEnrollmentsStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen()
    sandbox = sinon.sandbox.create()
    unEnrollProgramEnrollmentsStub = helper.sandbox.stub(
      api,
      "unEnrollProgramEnrollments"
    )
  })

  afterEach(() => {
    sandbox.restore()
    helper.cleanup()
  })

  it("should set inflight", () => {
    unEnrollProgramEnrollmentsStub.returns(
      Promise.resolve([
        {
          title: "Program 1",
          id:    1
        },
        {
          title: "Program 2",
          id:    2
        }
      ])
    )
    return dispatchThen(unEnrollProgramEnrollments([1, 2]), [
      SET_UNENROLL_API_INFLIGHT_STATE,
      SET_PROGRAMS_TO_UNENROLL,
      SET_TOAST_MESSAGE,
      REQUEST_GET_PROGRAM_ENROLLMENTS
    ]).then(async () => {
      assert.equal(store.getState().ui.programsToUnEnrollInFlight, true)
    })
  })
})
