// @flow
import { createAction } from "redux-actions"
import type { Dispatch } from "redux"

import type { Dispatcher } from "../flow/reduxTypes"
import { updateProfileImage } from "../lib/api"

export const START_PHOTO_EDIT = "START_PHOTO_EDIT"
export const startPhotoEdit = createAction(START_PHOTO_EDIT)

export const CLEAR_PHOTO_EDIT = "CLEAR_PHOTO_EDIT"
export const clearPhotoEdit = createAction(CLEAR_PHOTO_EDIT)

export const UPDATE_PHOTO_EDIT = "UPDATE_PHOTO_EDIT"
export const updatePhotoEdit = createAction(UPDATE_PHOTO_EDIT)

export const SET_PHOTO_ERROR = "SET_PHOTO_ERROR"
export const setPhotoError = createAction(SET_PHOTO_ERROR)

export const REQUEST_PATCH_USER_PHOTO = "REQUEST_PATCH_USER_PHOTO"
export const requestPatchUserPhoto = createAction(REQUEST_PATCH_USER_PHOTO)

export const RECEIVE_PATCH_USER_PHOTO_FAILURE =
  "RECEIVE_PATCH_USER_PHOTO_FAILURE"
export const receivePatchUserPhotoFailure = createAction(
  RECEIVE_PATCH_USER_PHOTO_FAILURE
)

export const RECEIVE_PATCH_USER_PHOTO_SUCCESS =
  "RECEIVE_PATCH_USER_PHOTO_SUCCESS"
export const receivePatchUserPhotoSuccess = createAction(
  RECEIVE_PATCH_USER_PHOTO_SUCCESS
)

export function updateUserPhoto(
  username: string,
  image: Blob,
  name: string
): Dispatcher<string | void> {
  return (dispatch: Dispatch) => {
    dispatch(requestPatchUserPhoto(username))
    return updateProfileImage(username, image, name).then(
      () => {
        dispatch(receivePatchUserPhotoSuccess())
      },
      error => {
        dispatch(receivePatchUserPhotoFailure(error))
      }
    )
  }
}
