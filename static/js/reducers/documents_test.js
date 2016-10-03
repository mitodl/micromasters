// @flow
/* global SETTINGS: false */
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import { ISO_8601_FORMAT } from '../constants';
import {
  setDocumentSentDate,
} from '../actions/documents';
import type { DocumentsState } from '../reducers/documents';
import rootReducer from '../reducers';
import type { Action } from '../flow/reduxTypes';

describe('documents reducers', () => {
  let sandbox, store;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const assertReducerResultState = (
    action: () => Action, stateLookup: (documents: DocumentsState) => any, defaultValue: any
  ): void => {
    assert.deepEqual(defaultValue, stateLookup(store.getState().documents));
    for (let value of [true, null, false, 0, 3, 'x', {'a': 'b'}, {}, [3, 4, 5], [], '']) {
      let expected = value;
      if (value === null) {
        // redux-actions converts this to undefined
        expected = undefined;
      }
      store.dispatch(action(value));
      assert.deepEqual(expected, stateLookup(store.getState().documents));
    }
  };

  describe('Document date', () => {
    it('should let you set the document date', () => {
      let todayFormat = moment().format(ISO_8601_FORMAT);
      assertReducerResultState(setDocumentSentDate, documents => documents.documentSentDate, { date: todayFormat });
    });
  });
});
