// @flow
import {
  startPhotoEdit,
  START_PHOTO_EDIT,
  clearPhotoEdit,
  CLEAR_PHOTO_EDIT,
  updatePhotoEdit,
  UPDATE_PHOTO_EDIT,
  setPhotoError,
  SET_PHOTO_ERROR,
  requestPatchUserPhoto,
  REQUEST_PATCH_USER_PHOTO,
  receivePatchUserPhotoFailure,
  RECEIVE_PATCH_USER_PHOTO_FAILURE,
  receivePatchUserPhotoSuccess,
  RECEIVE_PATCH_USER_PHOTO_SUCCESS
} from "./image_upload"
import { assertCreatedActionHelper } from "./test_util"

describe("generated image upload action helpers", () => {
  it("should create all action creators", () => {
    [
      [startPhotoEdit, START_PHOTO_EDIT],
      [clearPhotoEdit, CLEAR_PHOTO_EDIT],
      [updatePhotoEdit, UPDATE_PHOTO_EDIT],
      [setPhotoError, SET_PHOTO_ERROR],
      [requestPatchUserPhoto, REQUEST_PATCH_USER_PHOTO],
      [receivePatchUserPhotoFailure, RECEIVE_PATCH_USER_PHOTO_FAILURE],
      [receivePatchUserPhotoSuccess, RECEIVE_PATCH_USER_PHOTO_SUCCESS]
    ].forEach(assertCreatedActionHelper)
  })
})
