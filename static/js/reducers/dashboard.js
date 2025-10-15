// @flow
import _ from "lodash"
import R from "ramda"

import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,
  UPDATE_COURSE_STATUS
} from "../actions/dashboard"
import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import type { DashboardsState, DashboardState } from "../flow/dashboardTypes"
import type { Action } from "../flow/reduxTypes"
import { updateStateByUsername } from "./util"

export const INITIAL_DASHBOARD_STATE: DashboardState = {
  programs:                  [],
  isEdxDataFresh:            true,
  noSpinner:                 false,
  invalidBackendCredentials: []
}

const INITIAL_DASHBOARDS_STATE: DashboardsState = {}
/* eslint-disable no-unused-vars */
export const dashboard = (
  state: DashboardsState = INITIAL_DASHBOARDS_STATE,
  action: Action<any, string>
) => {
  const { meta: username } = action
  switch (action.type) {
  case REQUEST_DASHBOARD: // eslint-disable-line no-case-declarations
    if (action.payload === true) {
      return updateStateByUsername(
        state,
        username,
        _.merge({}, state[username] || {}, {
          fetchStatus: FETCH_PROCESSING,
          noSpinner:   true
        })
      )
    } else {
      const newBaseState = R.dissoc(username, state)
      return updateStateByUsername(
        newBaseState,
        username,
        _.merge({}, INITIAL_DASHBOARD_STATE, {
          fetchStatus: FETCH_PROCESSING
        })
      )
    }
  case RECEIVE_DASHBOARD_SUCCESS:
    return updateStateByUsername(state, username, {
      fetchStatus:    FETCH_SUCCESS,
      programs:       action.payload.programs,
      isEdxDataFresh: action.payload.is_edx_data_fresh,
      invalidBackendCredentials:
          action.payload.invalid_backend_credentials || [],
      noSpinner: false
    })
  case RECEIVE_DASHBOARD_FAILURE:
    return updateStateByUsername(state, username, {
      fetchStatus: FETCH_FAILURE,
      errorInfo:   action.payload
    })
  case UPDATE_COURSE_STATUS: {
    const { courseId, status } = action.payload
    const programs = _.cloneDeep(state[username].programs)
    for (const program of programs) {
      for (const course of program.courses) {
        for (const courseRun of course.runs) {
          if (courseRun.course_id === courseId) {
            courseRun.status = status
          }
        }
      }
    }
    return updateStateByUsername(state, username, { programs })
  }
  case CLEAR_DASHBOARD:
    return updateStateByUsername(
      R.dissoc(username, state),
      username,
      INITIAL_DASHBOARD_STATE
    )
  default:
    return state
  }
}
