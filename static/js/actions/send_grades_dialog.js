import { createAction } from "redux-actions"
import type { Dispatcher } from "../flow/reduxTypes"
import { Dispatch } from "redux"
import { sendGradesRecordMail } from "../lib/api"

export const SET_DIALOG_VISIBILITY = "SET_DIALOG_VISIBILITY"
export const setSendDialogVisibility = createAction(SET_DIALOG_VISIBILITY)

export const SEND_GRADES_EMAIL_SUCCESS = "SEND_GRADES_EMAIL_SUCCESS"
export const sendEmailSuccess = createAction(SEND_GRADES_EMAIL_SUCCESS)

export const SEND_GRADES_EMAIL_FAILURE = "SEND_GRADES_EMAIL_FAILURE"
export const sendEmailFailure = createAction(SEND_GRADES_EMAIL_FAILURE)

export const SET_SELECTED_SCHOOL = "SET_SELECTED_SCHOOL"
export const setSelectedSchool = createAction(SET_SELECTED_SCHOOL)

export function sendGradeEmail(sendFunctionParams: Array<*>): Dispatcher<*> {
  return (dispatch: Dispatch) => {
    return sendGradesRecordMail(...sendFunctionParams).then(
      response => {
        dispatch(sendEmailSuccess(true))
        return Promise.resolve(response)
      },
      () => {
        dispatch(sendEmailFailure(false))
        return Promise.reject()
      }
    )
  }
}
