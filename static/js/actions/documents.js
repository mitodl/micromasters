// @flow
/* global SETTINGS: false */
import { createAction } from "redux-actions"
import type { Dispatch } from "redux"

import { fetchDashboard } from "./dashboard"
import * as api from "../lib/api"
import type { Dispatcher } from "../flow/reduxTypes"
import { actions } from "../lib/redux_rest"

export const SET_DOCUMENT_SENT_DATE = "SET_DOCUMENT_SENT_DATE"
export const setDocumentSentDate = createAction(SET_DOCUMENT_SENT_DATE)

export const REQUEST_UPDATE_DOCUMENT_SENT_DATE =
  "REQUEST_UPDATE_DOCUMENT_SENT_DATE"
export const requestUpdateDocumentSentDate = createAction(
  REQUEST_UPDATE_DOCUMENT_SENT_DATE
)

export const RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS =
  "RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS"
export const receiveUpdateDocumentSentDateSuccess = createAction(
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS
)

export const RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE =
  "RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE"
export const receiveUpdateDocumentSentDateFailure = createAction(
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE
)

export const updateDocumentSentDate = (
  financialAidId: number,
  dateSent: string
): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestUpdateDocumentSentDate())
    return api.updateDocumentSentDate(financialAidId, dateSent).then(
      () => {
        dispatch(receiveUpdateDocumentSentDateSuccess())
        dispatch(fetchDashboard(SETTINGS.user.username))
        dispatch(actions.prices.get(SETTINGS.user.username))
        return Promise.resolve()
      },
      () => {
        dispatch(receiveUpdateDocumentSentDateFailure())
        return Promise.reject()
      }
    )
  }
}
