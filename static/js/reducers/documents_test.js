// @flow
/* global SETTINGS: false */
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import { ISO_8601_FORMAT } from '../constants';
import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from '../actions';
import {
  setDocumentSentDate,
  REQUEST_UPDATE_DOCUMENT_SENT_DATE,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS,
  RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE,
  updateDocumentSentDate,
} from '../actions/documents';
import * as actions from '../actions';
import type { DocumentsState } from '../reducers/documents';
import rootReducer from '../reducers';
import * as api from '../util/api';
import type { Action } from '../flow/reduxTypes';

describe('documents reducers', () => {
  let sandbox, store, dispatchThen;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.documents);
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

  describe('UI', () => {
    it('should let you set the document date', () => {
      let todayFormat = moment().format(ISO_8601_FORMAT);
      assertReducerResultState(setDocumentSentDate, documents => documents.documentSentDate, todayFormat);
    });
  });

  describe('API functions', () => {
    let updateDocumentSentDateStub, fetchCoursePricesStub, fetchDashboardStub;

    beforeEach(() => {
      updateDocumentSentDateStub = sandbox.stub(api, 'updateDocumentSentDate');
      fetchCoursePricesStub = sandbox.stub(actions, 'fetchCoursePrices');
      fetchCoursePricesStub.returns({type: "fake"});
      fetchDashboardStub = sandbox.stub(actions, 'fetchDashboard');
      fetchDashboardStub.returns({type: "fake"});
    });

    it('should let you update the date documents were sent', () => {
      updateDocumentSentDateStub.returns(Promise.resolve());
      let programId = 12;
      let sentDate = '2012-12-12';
      return dispatchThen(updateDocumentSentDate(programId, sentDate), [
        REQUEST_UPDATE_DOCUMENT_SENT_DATE,
        RECEIVE_UPDATE_DOCUMENT_SENT_DATE_SUCCESS,
      ]).then(state => {
        assert.ok(updateDocumentSentDateStub.calledWith(programId, sentDate));
        assert.deepEqual(state.fetchStatus, FETCH_SUCCESS);
        assert.ok(fetchCoursePricesStub.calledWith());
        assert.ok(fetchDashboardStub.calledWith());
      });
    });

    it('should fail to update documents sent', () => {
      updateDocumentSentDateStub.returns(Promise.reject());
      let programId = 12;
      let sentDate = '2012-12-12';
      return dispatchThen(updateDocumentSentDate(programId, sentDate), [
        REQUEST_UPDATE_DOCUMENT_SENT_DATE,
        RECEIVE_UPDATE_DOCUMENT_SENT_DATE_FAILURE,
      ]).then(state => {
        assert.ok(updateDocumentSentDateStub.calledWith(programId, sentDate));
        assert.deepEqual(state.fetchStatus, FETCH_FAILURE);
        assert.notOk(fetchCoursePricesStub.calledWith());
        assert.notOk(fetchDashboardStub.calledWith());
      });
    });
  });
});
