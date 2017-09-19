// @flow
import type { Dispatch } from "redux"
import { createAction } from "redux-actions"

import * as api from "../lib/api"
import type { Profile } from "../flow/profileTypes"
import type { Dispatcher } from "../flow/reduxTypes"

// actions for user profile
export const REQUEST_GET_USER_PROFILE = "REQUEST_GET_USER_PROFILE"
export const requestGetUserProfile = createAction(
  REQUEST_GET_USER_PROFILE,
  username => ({ username })
)

export const RECEIVE_GET_USER_PROFILE_SUCCESS =
  "RECEIVE_GET_USER_PROFILE_SUCCESS"
export const receiveGetUserProfileSuccess = createAction(
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  (username, profile) => ({ username, profile })
)

export const RECEIVE_GET_USER_PROFILE_FAILURE =
  "RECEIVE_GET_USER_PROFILE_FAILURE"
const receiveGetUserProfileFailure = createAction(
  RECEIVE_GET_USER_PROFILE_FAILURE,
  (username, errorInfo) => ({ username, errorInfo })
)

export const CLEAR_PROFILE = "CLEAR_PROFILE"
export const clearProfile = createAction(CLEAR_PROFILE, username => ({
  username
}))

export const UPDATE_PROFILE = "UPDATE_PROFILE"
export const updateProfile = createAction(
  UPDATE_PROFILE,
  (username, profile) => ({ profile, username })
)

export const START_PROFILE_EDIT = "START_PROFILE_EDIT"
export const startProfileEdit = createAction(START_PROFILE_EDIT, username => ({
  username
}))

export const CLEAR_PROFILE_EDIT = "CLEAR_PROFILE_EDIT"
export const clearProfileEdit = createAction(CLEAR_PROFILE_EDIT, username => ({
  username
}))

export const REQUEST_PATCH_USER_PROFILE = "REQUEST_PATCH_USER_PROFILE"
export const requestPatchUserProfile = createAction(
  REQUEST_PATCH_USER_PROFILE,
  username => ({ username })
)

export const RECEIVE_PATCH_USER_PROFILE_SUCCESS =
  "RECEIVE_PATCH_USER_PROFILE_SUCCESS"
const receivePatchUserProfileSuccess = createAction(
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  (username, profile) => ({ profile, username })
)

export const RECEIVE_PATCH_USER_PROFILE_FAILURE =
  "RECEIVE_PATCH_USER_PROFILE_FAILURE"
const receivePatchUserProfileFailure = createAction(
  RECEIVE_PATCH_USER_PROFILE_FAILURE,
  (username, errorInfo) => ({ username, errorInfo })
)

export const saveProfile = (
  username: string,
  profile: Profile
): Dispatcher<void> => {
  return (dispatch: Dispatch) => {
    dispatch(requestPatchUserProfile(username))
    return api.patchUserProfile(username, profile).then(
      newProfile => {
        dispatch(receivePatchUserProfileSuccess(username, newProfile))
      },
      error => {
        dispatch(receivePatchUserProfileFailure(username, error))
        // the exception is assumed handled and will not be propagated
      }
    )
  }
}

export const UPDATE_PROFILE_VALIDATION = "UPDATE_PROFILE_VALIDATION"
export const updateProfileValidation = createAction(
  UPDATE_PROFILE_VALIDATION,
  (username, errors) => ({ errors, username })
)

export const UPDATE_VALIDATION_VISIBILITY = "UPDATE_VALIDATION_VISIBILITY"
export const updateValidationVisibility = createAction(
  UPDATE_VALIDATION_VISIBILITY,
  (username, keySet) => ({ username, keySet })
)

export function fetchUserProfile(username: string): Dispatcher<void> {
  return (dispatch: Dispatch) => {
    dispatch(requestGetUserProfile(username))
    return api.getUserProfile(username).then(
      json => {
        dispatch(receiveGetUserProfileSuccess(username, json))
      },
      error => {
        dispatch(receiveGetUserProfileFailure(username, error))
        // the exception is assumed handled and will not be propagated
      }
    )
  }
}
