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
import * as api from '../lib/api';
import type { AssertReducerResultState } from '../flow/reduxTypes';
import { createAssertReducerResultState } from '../util/test_utils';

describe('documents reducers', () => {
  let sandbox, store, dispatchThen, assertReducerResultState: AssertReducerResultState<DocumentsState>;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.documents);
    assertReducerResultState = createAssertReducerResultState(store, state => state.documents);
  });

  afterEach(() => {
    sandbox.restore();
  });

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
