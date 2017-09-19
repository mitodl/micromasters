// @flow
import type { Dispatch } from "redux"
import { createAction } from "redux-actions"

import type { Dispatcher } from "../flow/reduxTypes"
import type { EmailSendResponse } from "../flow/emailTypes"

export const START_EMAIL_EDIT = "START_EMAIL_EDIT"
export const startEmailEdit = createAction(START_EMAIL_EDIT)

export const UPDATE_EMAIL_EDIT = "UPDATE_EMAIL_EDIT"
export const updateEmailEdit = createAction(UPDATE_EMAIL_EDIT)

export const CLEAR_EMAIL_EDIT = "CLEAR_EMAIL_EDIT"
export const clearEmailEdit = createAction(CLEAR_EMAIL_EDIT)

export const UPDATE_EMAIL_VALIDATION = "UPDATE_EMAIL_VALIDATION"
export const updateEmailValidation = createAction(UPDATE_EMAIL_VALIDATION)

export const INITIATE_SEND_EMAIL = "INITIATE_SEND_EMAIL"
export const initiateSendEmail = createAction(INITIATE_SEND_EMAIL)

export const SEND_EMAIL_SUCCESS = "SEND_EMAIL_SUCCESS"
export const sendEmailSuccess = createAction(SEND_EMAIL_SUCCESS)

export const SEND_EMAIL_FAILURE = "SEND_EMAIL_FAILURE"
export const sendEmailFailure = createAction(SEND_EMAIL_FAILURE)

export function sendEmail(
  emailType: string,
  sendFunction: () => Promise<EmailSendResponse>,
  sendFunctionParams: Array<*>
): Dispatcher<?EmailSendResponse> {
  return (dispatch: Dispatch) => {
    dispatch(initiateSendEmail(emailType))
    return sendFunction(...sendFunctionParams).then(
      response => {
        dispatch(sendEmailSuccess(emailType))
        return Promise.resolve(response)
      },
      error => {
        dispatch(sendEmailFailure({ type: emailType, error: error }))
      }
    )
  }
}
