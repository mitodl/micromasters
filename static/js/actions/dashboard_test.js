// @flow
import { assert } from "chai"

import {
  requestDashboard,
  receiveDashboardSuccess,
  receiveDashboardFailure,
  clearDashboard,
  updateCourseStatus,
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,
  UPDATE_COURSE_STATUS
} from "./dashboard"
import { assertWithUsernameActionHelper } from "./test_util"

describe("dashboard actions", () => {
  it("should have properly created withUsername creators", () => {
    [
      [requestDashboard, REQUEST_DASHBOARD],
      [receiveDashboardSuccess, RECEIVE_DASHBOARD_SUCCESS],
      [receiveDashboardFailure, RECEIVE_DASHBOARD_FAILURE],
      [clearDashboard, CLEAR_DASHBOARD]
    ].forEach(assertWithUsernameActionHelper)
  })

  it("updateCourseStatus has courseId and status in its payload", () => {
    assert.deepEqual(updateCourseStatus("username", "course_id", "status"), {
      meta:    "username",
      type:    UPDATE_COURSE_STATUS,
      payload: {
        courseId: "course_id",
        status:   "status"
      }
    })
  })
})
