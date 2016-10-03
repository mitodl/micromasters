// @flow
import moment from 'moment';

import {
  SET_DOCUMENT_SENT_DATE,
} from '../actions/documents';
import type { Action } from '../flow/reduxTypes';
import { ISO_8601_FORMAT } from '../constants';

export type DocumentsState = {
  documentSentDate: Object
};

export const INITIAL_DOCUMENTS_STATE: DocumentsState = {
  documentSentDate: {
    date: moment().format(ISO_8601_FORMAT)
  },
};

export const documents = (state: DocumentsState = INITIAL_DOCUMENTS_STATE, action: Action) => {
  switch (action.type) {
  case SET_DOCUMENT_SENT_DATE:
    return { ...state, documentSentDate: action.payload };
  default:
    return state;
  }
};
