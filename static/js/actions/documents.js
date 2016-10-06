// @flow
import { createAction } from 'redux-actions';
import type { Dispatch } from 'redux';

import {
  fetchDashboard,
  fetchCoursePrices,
} from './';
import * as api from '../util/api';
import type { Dispatcher } from '../flow/reduxTypes';

export const SET_DOCUMENT_SENT_DATE = 'SET_DOCUMENT_SENT_DATE';
export const setDocumentSentDate = createAction(SET_DOCUMENT_SENT_DATE);

export const REQUEST_UPDATE_DOCUMENT_SENT_DATE = 'REQUEST_UPDATE_DOCUMENT_SENT_DATE';
export const requestUpdateDocumentSentDate = createAction(REQUEST_UPDATE_DOCUMENT_SENT_DATE);

export const RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS = 'RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS';
export const receiveUpdateDocumentSentDateSuccess = createAction(RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS);

export const RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE = 'RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE';
export const receiveUpdateDocumentSentDateFailure = createAction(RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE);

export const updateDocumentSentDate = (financialAidId: number, dateSent: string): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestUpdateDocumentSentDate());
    return api.updateDocumentSentDate(financialAidId, dateSent).then(
      () => {
        dispatch(receiveUpdateDocumentSentDateSuccess());
        dispatch(fetchDashboard());
        dispatch(fetchCoursePrices());
        return Promise.resolve();
      },
      () => {
        dispatch(receiveUpdateDocumentSentDateFailure());
        return Promise.reject();
      }
    );
  };
};
