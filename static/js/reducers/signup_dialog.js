import { SET_DIALOG_VISIBILITY } from "../actions/signup_dialog"

export type SignupState = {
  dialogVisibility: boolean
}

export const INITIAL_SIGNUP_STATE = {
  dialogVisibility: false
}

export const signupDialog = (
  state: SignupState = INITIAL_SIGNUP_STATE,
  action
) => {
  switch (action.type) {
  case SET_DIALOG_VISIBILITY:
    return { ...state, dialogVisibility: action.payload }
  default:
    return state
  }
}
