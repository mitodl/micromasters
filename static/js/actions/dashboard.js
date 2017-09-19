// @flow
import type { Dispatch } from "redux"

import * as api from "../lib/api"
import type { Dispatcher } from "../flow/reduxTypes"
import { withUsername } from "./util"

export const UPDATE_COURSE_STATUS = "UPDATE_COURSE_STATUS"
export const updateCourseStatus = withUsername(
  UPDATE_COURSE_STATUS,
  (_, courseId, status) => ({
    courseId,
    status
  })
)

// dashboard list actions
export const REQUEST_DASHBOARD = "REQUEST_DASHBOARD"
export const requestDashboard = withUsername(REQUEST_DASHBOARD)

export const RECEIVE_DASHBOARD_SUCCESS = "RECEIVE_DASHBOARD_SUCCESS"
export const receiveDashboardSuccess = withUsername(RECEIVE_DASHBOARD_SUCCESS)

export const RECEIVE_DASHBOARD_FAILURE = "RECEIVE_DASHBOARD_FAILURE"
export const receiveDashboardFailure = withUsername(RECEIVE_DASHBOARD_FAILURE)

export const CLEAR_DASHBOARD = "CLEAR_DASHBOARD"
export const clearDashboard = withUsername(CLEAR_DASHBOARD)

export function fetchDashboard(
  username: string,
  noSpinner: boolean = false
): Dispatcher<void> {
  return (dispatch: Dispatch) => {
    dispatch(requestDashboard(username, noSpinner))
    return api.getDashboard(username).then(
      dashboard => {
        dispatch(receiveDashboardSuccess(username, dashboard))
      },
      error => {
        dispatch(receiveDashboardFailure(username, error))
        // the exception is assumed handled and will not be propagated
      }
    )
  }
}
