// @flow
// actions for the signup dialog on the home and program pages
import { createAction } from "redux-actions"

export const SET_DIALOG_VISIBILITY = "SET_DIALOG_VISIBILITY"
export const setShareDialogVisibility = createAction(SET_DIALOG_VISIBILITY)

export const SET_COPY_SUCCESS = "SET_COPY_SUCCESS"
export const setCopySuccess = createAction(SET_COPY_SUCCESS)

export const SET_RECORD_SHARE_LINK = "SET_RECORD_SHARE_LINK"
export const setRecordShareLink = createAction(SET_RECORD_SHARE_LINK)
