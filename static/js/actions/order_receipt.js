// @flow
import { createAction } from "redux-actions"

export const SET_TIMEOUT_ACTIVE = "SET_TIMEOUT_ACTIVE"
export const setTimeoutActive = createAction(SET_TIMEOUT_ACTIVE)

export const SET_INITIAL_TIME = "SET_INITIAL_TIME"
export const setInitialTime = createAction(SET_INITIAL_TIME)
