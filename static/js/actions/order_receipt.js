// @flow
// Order receipt actions - PAYMENTS DISCONTINUED IN 2021
// This module is a stub to maintain compatibility

export const SET_TIMEOUT_ACTIVE = "SET_TIMEOUT_ACTIVE_STUB"

export const setTimeoutActive = (active: boolean) => ({
  type:    SET_TIMEOUT_ACTIVE,
  payload: active
})

export const setInitialTime = (time: number) => ({
  type:    "SET_INITIAL_TIME_STUB",
  payload: time
})
