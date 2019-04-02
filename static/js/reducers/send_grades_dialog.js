import {
  SET_DIALOG_VISIBILITY,
  SET_SELECTED_SCHOOL
} from "../actions/send_grades_dialog"
import {
  SEND_GRADES_EMAIL_SUCCESS,
  SEND_GRADES_EMAIL_FAILURE
} from "../actions/send_grades_dialog"

export type SendDialogState = {
  sendDialogVisibility: boolean,
  sentSuccess: boolean,
  selectedSchool: ?number
}

export const INITIAL_SEND_STATE = {
  sendDialogVisibility: false,
  sentSuccess:          false,
  selectedSchool:       null
}

export const sendDialog = (
  state: SendDialogState = INITIAL_SEND_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, sendDialogVisibility: action.payload }
  case SET_SELECTED_SCHOOL:
    return { ...state, selectedSchool: action.payload }
  case SEND_GRADES_EMAIL_SUCCESS:
    return { ...state, sentSuccess: action.payload }
  case SEND_GRADES_EMAIL_FAILURE:
    return { ...state, sentSuccess: action.payload }
  default:
    return state
  }
}
