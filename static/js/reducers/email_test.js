// @flow
import configureTestStore from 'redux-asserts';

import { FETCH_SUCCESS, FETCH_FAILURE } from '../actions';
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendSearchResultMail,
  START_EMAIL_EDIT,
  UPDATE_EMAIL_EDIT,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  INITIATE_SEND_EMAIL,
  SEND_EMAIL_SUCCESS,
  SEND_EMAIL_FAILURE,
} from '../actions/email';
import { NEW_EMAIL_EDIT, INITIAL_EMAIL_STATE } from './email';
import { EmailSendResponse } from '../flow/emailTypes';
import * as api from '../util/api';
import rootReducer from '../reducers';
import { assert } from 'chai';
import sinon from 'sinon';
import R from 'ramda';

describe('email reducers', () => {
  let sandbox, store, dispatchThen;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.email);
  });

  afterEach(() => {
    sandbox.restore();
  });

  let query = { query: "Hi, I'm a query!" };

  let initialExpectation = { ...INITIAL_EMAIL_STATE, email: { ...NEW_EMAIL_EDIT, query: query } };

  it('should let you start editing an email', () => {
    return dispatchThen(startEmailEdit(query), [START_EMAIL_EDIT]).then(state => {
      assert.deepEqual(initialExpectation, state);
    });
  });

  it('should let you update an email edit in progress', () => {
    store.dispatch(startEmailEdit(query));
    let update = R.clone(initialExpectation.email);
    update.body = 'The body of my email';
    return dispatchThen(updateEmailEdit(update), [UPDATE_EMAIL_EDIT]).then(state => {
      assert.deepEqual(state, { ...initialExpectation, email: update });
    });
  });

  it('should let you clear an existing email edit', () => {
    return assert.eventually.deepEqual(
      dispatchThen(clearEmailEdit(), [CLEAR_EMAIL_EDIT]),
      INITIAL_EMAIL_STATE,
    );
  });

  it('should let you update email validation', () => {
    store.dispatch(startEmailEdit(query));
    let errors = { subject: "NO SUBJECT" };
    return dispatchThen(updateEmailValidation(errors), [UPDATE_EMAIL_VALIDATION]).then(state => {
      assert.deepEqual(state.validationErrors, errors);
    });
  });

  describe('for send actions', () => {
    let sendSearchResultMailStub;
    let MAIL_SUCCESS_RESPONSE: EmailSendResponse = { errorStatusCode: 200 },
      searchRequest = { size: 50 };

    beforeEach(() => {
      sendSearchResultMailStub = sandbox.stub(api, 'sendSearchResultMail');
    });

    it('should go through expected state changes when sendSearchResultMail succeeds', () => {
      sendSearchResultMailStub.returns(Promise.resolve(MAIL_SUCCESS_RESPONSE));

      return dispatchThen(
        sendSearchResultMail('subject', 'body', searchRequest),
        [INITIATE_SEND_EMAIL, SEND_EMAIL_SUCCESS]
      ).then(emailState => {
        assert.equal(emailState.fetchStatus, FETCH_SUCCESS);
        assert.equal(sendSearchResultMailStub.callCount, 1);
        assert.deepEqual(sendSearchResultMailStub.args[0], ['subject', 'body', searchRequest]);
      });
    });

    it('should go through expected state changes when sendSearchResultMail fails', () => {
      sendSearchResultMailStub.returns(Promise.reject());

      return dispatchThen(
        sendSearchResultMail('subject', 'body', searchRequest),
        [INITIATE_SEND_EMAIL, SEND_EMAIL_FAILURE]
      ).then(emailState => {
        assert.equal(emailState.fetchStatus, FETCH_FAILURE);
      });
    });
  });
});
