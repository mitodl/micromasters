import {
  SET_DIALOG_VISIBILITY
} from "../actions/send_grades_dialog"
import {FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS} from "../actions";
import {SEND_GRADES_EMAIL_FAILURE, SEND_GRADES_EMAIL_SUCCESS, INITIATE_SEND_EMAIL} from "../actions/send_grades_dialog";

export type SendDialogState = {
  sendDialogVisibility: boolean,
  sentSuccess: boolean,
}

export const INITIAL_SEND_STATE = {
  sendDialogVisibility: false,
  sentSuccess: false,
}

export const sendDialog = (
  state: SendDialogState = INITIAL_SEND_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, sendDialogVisibility: action.payload }
  case INITIATE_SEND_EMAIL:
    return { ...state, fetchStatus: FETCH_PROCESSING }
  case SEND_GRADES_EMAIL_SUCCESS:
    return { ...state, fetchStatus: FETCH_SUCCESS }
  case SEND_GRADES_EMAIL_FAILURE:
    return { ...state, fetchStatus: FETCH_FAILURE }
  default:
    return state
  }
}
