// @flow
import moment from "moment"

import {
  SET_DOCUMENT_SENT_DATE,
  REQUEST_UPDATE_DOCUMENT_SENT_DATE,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE
} from "../actions/documents"
import type { Action } from "../flow/reduxTypes"
import { ISO_8601_FORMAT } from "../constants"
import { FETCH_SUCCESS, FETCH_PROCESSING, FETCH_FAILURE } from "../actions"

export type DocumentsState = {
  fetchStatus?: string,
  documentSentDate: string
}

export const INITIAL_DOCUMENTS_STATE: DocumentsState = {
  documentSentDate: moment().format(ISO_8601_FORMAT)
}

export const documents = (
  state: DocumentsState = INITIAL_DOCUMENTS_STATE,
  action: Action<?string, null>
) => {
  switch (action.type) {
  case SET_DOCUMENT_SENT_DATE:
    return { ...state, documentSentDate: action.payload }
  case REQUEST_UPDATE_DOCUMENT_SENT_DATE:
    return { ...state, fetchStatus: FETCH_PROCESSING }
  case RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS:
    return { ...state, fetchStatus: FETCH_SUCCESS }
  case RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE:
    return { ...state, fetchStatus: FETCH_FAILURE }
  default:
    return state
  }
}
