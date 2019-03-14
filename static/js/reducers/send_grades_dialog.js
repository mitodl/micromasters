import {
  SET_DIALOG_VISIBILITY
} from "../actions/send_grades_dialog"

export type SendDialogState = {
  sendDialogVisibility: boolean,
}

export const INITIAL_SEND_STATE = {
  sendDialogVisibility: false,
}

export const sendDialog = (
  state: SendDialogState = INITIAL_SEND_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, sendDialogVisibility: action.payload }
  default:
    return state
  }
}
