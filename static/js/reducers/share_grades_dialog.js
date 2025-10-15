// @flow
import {
  SET_COPY_SUCCESS,
  SET_DIALOG_VISIBILITY,
  SET_RECORD_SHARE_LINK
} from "../actions/share_grades_dialog"
import type { Action } from "../flow/reduxTypes"

export type ShareDialogState = {
  shareDialogVisibility: boolean,
  copySuccess: boolean,
  recordShareLink: string
}

export const INITIAL_SHARE_STATE = {
  shareDialogVisibility: false,
  copySuccess:           false,
  recordShareLink:       ""
}

export const shareDialog = (
  state: ShareDialogState = INITIAL_SHARE_STATE,
  action: Action<ShareDialogState>
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, shareDialogVisibility: action.payload }
  case SET_COPY_SUCCESS:
    return { ...state, copySuccess: action.payload }
  case SET_RECORD_SHARE_LINK:
    return { ...state, recordShareLink: action.payload }
  default:
    return state
  }
}
