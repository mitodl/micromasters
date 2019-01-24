import { SET_DIALOG_VISIBILITY } from "../actions/share_grades_dialog"

export type ShareDialogState = {
  dialogVisibility: boolean
}

export const INITIAL_SHARE_STATE = {
  dialogVisibility: false
}

export const shareDialog = (
  state: ShareDialogState = INITIAL_SHARE_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, dialogVisibility: action.payload }
  default:
    return state
  }
}
