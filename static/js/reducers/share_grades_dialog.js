import {
  SET_COPY_SUCCESS,
  SET_DIALOG_VISIBILITY
} from "../actions/share_grades_dialog"

export type ShareDialogState = {
  shareDialogVisibility: boolean,
  copySuccess: boolean
}

export const INITIAL_SHARE_STATE = {
  shareDialogVisibility: false,
  copySuccess:           false
}

export const shareDialog = (
  state: ShareDialogState = INITIAL_SHARE_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, shareDialogVisibility: action.payload }
  case SET_COPY_SUCCESS:
    return { ...state, copySuccess: action.payload }
  default:
    return state
  }
}
