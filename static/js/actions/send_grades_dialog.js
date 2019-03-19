import {createAction} from "redux-actions";
import type {Dispatcher} from "../flow/reduxTypes";
import {Dispatch} from "redux";
import {sendGradesRecordMail} from "../lib/api";

export const SET_DIALOG_VISIBILITY = "SET_DIALOG_VISIBILITY"
export const setSendDialogVisibility = createAction(SET_DIALOG_VISIBILITY)


export const INITIATE_SEND_EMAIL = "INITIATE_SEND_EMAIL"
export const initiateSendEmail = createAction(INITIATE_SEND_EMAIL)

export const SEND_GRADES_EMAIL_SUCCESS = "SEND_GRADES_EMAIL_SUCCESS"
export const sendEmailSuccess = createAction(SEND_GRADES_EMAIL_SUCCESS)

export const SEND_GRADES_EMAIL_FAILURE = "SEND_GRADES_EMAIL_FAILURE"
export const sendEmailFailure = createAction(SEND_GRADES_EMAIL_FAILURE)

export function sendGradeEmail(
  sendFunctionParams: Array<*>
): Dispatcher<*> {
  return (dispatch: Dispatch) => {
    dispatch(initiateSendEmail())
    return sendGradesRecordMail(...sendFunctionParams).then(
      response => {
        dispatch(sendEmailSuccess())
        return Promise.resolve(response)
      },
      () => {
        dispatch(sendEmailFailure())
      }
    )
  }
}