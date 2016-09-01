// @flow
import type { Dispatch } from 'redux';
import type { Dispatcher } from '../flow/reduxTypes';
import type { EmailSendResponse } from '../flow/emailTypes';
import * as api from '../util/api';

export const actionCreatorGenerator = (type: string) => (
  (args: any) => args === undefined ? { type: type } : { type: type, payload: args }
);

export const START_EMAIL_EDIT = 'START_EMAIL_EDIT';
export const startEmailEdit = actionCreatorGenerator(START_EMAIL_EDIT);

export const UPDATE_EMAIL_EDIT = 'UPDATE_EMAIL_EDIT';
export const updateEmailEdit = actionCreatorGenerator(UPDATE_EMAIL_EDIT);

export const CLEAR_EMAIL_EDIT = 'CLEAR_EMAIL_EDIT';
export const clearEmailEdit = actionCreatorGenerator(CLEAR_EMAIL_EDIT);

export const UPDATE_EMAIL_VALIDATION = 'UPDATE_EMAIL_VALIDATION';
export const updateEmailValidation = actionCreatorGenerator(UPDATE_EMAIL_VALIDATION);

export const INITIATE_SEND_EMAIL = 'INITIATE_SEND_EMAIL';
export const initiateSendEmail = actionCreatorGenerator(INITIATE_SEND_EMAIL);

export const SEND_EMAIL_SUCCESS = 'SEND_EMAIL_SUCCESS';
export const sendEmailSuccess = actionCreatorGenerator(SEND_EMAIL_SUCCESS);

export const SEND_EMAIL_FAILURE = 'SEND_EMAIL_FAILURE';
export const sendEmailFailure = actionCreatorGenerator(SEND_EMAIL_FAILURE);

export function sendSearchResultMail(
  subject: string,
  body: string,
  searchRequest: Object
): Dispatcher<EmailSendResponse> {
  return (dispatch: Dispatch) => {
    dispatch(initiateSendEmail());
    return api.sendSearchResultMail(subject, body, searchRequest).
      then(response => {
        dispatch(sendEmailSuccess());
        return Promise.resolve(response);
      }).catch(error => {
        dispatch(sendEmailFailure(error));
      });
  };
}
