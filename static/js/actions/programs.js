// @flow
/* global SETTINGS: false */
import type { Dispatch } from "redux"
import { createAction } from "redux-actions"

import { TOAST_SUCCESS, TOAST_FAILURE } from "../constants"
import { fetchDashboard } from "./dashboard"
import {
  setToastMessage,
  setEnrollProgramDialogVisibility
} from "../actions/ui"
import type { Dispatcher } from "../flow/reduxTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import * as api from "../lib/api"
import { actions } from "../lib/redux_rest"

export const SET_CURRENT_PROGRAM_ENROLLMENT = "SET_CURRENT_PROGRAM_ENROLLMENT"
export const setCurrentProgramEnrollment = createAction(
  SET_CURRENT_PROGRAM_ENROLLMENT
)

export const REQUEST_GET_PROGRAM_ENROLLMENTS = "REQUEST_GET_PROGRAM_ENROLLMENTS"
export const requestGetProgramEnrollments = createAction(
  REQUEST_GET_PROGRAM_ENROLLMENTS
)

export const RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS =
  "RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS"
export const receiveGetProgramEnrollmentsSuccess = createAction(
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
)

export const RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE =
  "RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE"
export const receiveGetProgramEnrollmentsFailure = createAction(
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE
)

export function fetchProgramEnrollments(): Dispatcher<void> {
  return (dispatch: Dispatch) => {
    dispatch(requestGetProgramEnrollments())
    return api.getPrograms().then(
      enrollments => {
        dispatch(receiveGetProgramEnrollmentsSuccess(enrollments))
      },
      error => {
        dispatch(receiveGetProgramEnrollmentsFailure(error))
        // the exception is assumed handled and will not be propagated
      }
    )
  }
}

export const REQUEST_ADD_PROGRAM_ENROLLMENT = "REQUEST_ADD_PROGRAM_ENROLLMENT"
export const requestAddProgramEnrollment = createAction(
  REQUEST_ADD_PROGRAM_ENROLLMENT
)

export const RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS =
  "RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS"
export const receiveAddProgramEnrollmentSuccess = createAction(
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS
)

export const RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE =
  "RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE"
export const receiveAddProgramEnrollmentFailure = createAction(
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE
)

export const addProgramEnrollment = (
  programId: number
): Dispatcher<?AvailableProgram> => {
  return (dispatch: Dispatch) => {
    dispatch(requestAddProgramEnrollment(programId))
    return api.addProgramEnrollment(programId).then(
      enrollment => {
        dispatch(receiveAddProgramEnrollmentSuccess(enrollment))
        dispatch(
          setToastMessage({
            message: `You are now enrolled in the ${enrollment.title} MicroMasters`,
            icon:    TOAST_SUCCESS
          })
        )
        dispatch(setEnrollProgramDialogVisibility(false))
        dispatch(fetchDashboard(SETTINGS.user.username))
        dispatch(actions.prices.get(SETTINGS.user.username))
      },
      error => {
        dispatch(receiveAddProgramEnrollmentFailure(error))
        dispatch(
          setToastMessage({
            message: "There was an error during enrollment",
            icon:    TOAST_FAILURE
          })
        )
        return Promise.reject(error)
      }
    )
  }
}

export const CLEAR_ENROLLMENTS = "CLEAR_ENROLLMENTS"
export const clearEnrollments = createAction(CLEAR_ENROLLMENTS)
