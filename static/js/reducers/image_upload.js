// @flow
import {
  START_PHOTO_EDIT,
  CLEAR_PHOTO_EDIT,
  UPDATE_PHOTO_EDIT,
  SET_PHOTO_ERROR,
  REQUEST_PATCH_USER_PHOTO,
  RECEIVE_PATCH_USER_PHOTO_FAILURE,
  RECEIVE_PATCH_USER_PHOTO_SUCCESS
} from "../actions/image_upload"
import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import type { Action } from "../flow/reduxTypes"

export const INITIAL_IMAGE_UPLOAD_STATE = {
  edit:        null,
  error:       null,
  photo:       null,
  patchStatus: null
}

export type ImageUploadState = {
  edit: ?Blob,
  error: ?string,
  photo: ?File,
  patchStatus: ?string
}

export const imageUpload = (
  state: ImageUploadState = INITIAL_IMAGE_UPLOAD_STATE,
  action: Action<any, null>
) => {
  switch (action.type) {
  case START_PHOTO_EDIT: {
    if (state.patchStatus === FETCH_PROCESSING) {
      return state
    } else {
      return {
        ...state,
        photo: action.payload,
        edit:  null,
        error: null
      }
    }
  }
  case CLEAR_PHOTO_EDIT:
    return state.patchStatus === FETCH_PROCESSING
      ? state
      : INITIAL_IMAGE_UPLOAD_STATE
  case UPDATE_PHOTO_EDIT:
    return { ...state, edit: action.payload }
  case SET_PHOTO_ERROR:
    return { ...state, error: action.payload }
  case REQUEST_PATCH_USER_PHOTO:
    return { ...state, patchStatus: FETCH_PROCESSING }
  case RECEIVE_PATCH_USER_PHOTO_SUCCESS:
    return { ...state, patchStatus: FETCH_SUCCESS }
  case RECEIVE_PATCH_USER_PHOTO_FAILURE:
    return { ...state, patchStatus: FETCH_FAILURE }
  default:
    return state
  }
}
