// @flow
import configureTestStore from 'redux-asserts';

import IntegrationTestHelper from '../util/integration_test_helper';
import { FETCH_SUCCESS, FETCH_FAILURE } from '../actions';
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendEmail,
  setAutomaticEmailType,
  START_EMAIL_EDIT,
  UPDATE_EMAIL_EDIT,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  INITIATE_SEND_EMAIL,
  SEND_EMAIL_SUCCESS,
  SEND_EMAIL_FAILURE,
  AUTOMATIC_EMAIL_TYPE,
} from '../actions/email';
import { INITIAL_ALL_EMAILS_STATE, INITIAL_EMAIL_STATE } from './email';
import {
  SEARCH_EMAIL_TYPE,
  EMAIL_CAMPAIGN,
  ONE_TIME_EMAIL
} from '../components/email/constants';
import type { EmailSendResponse } from '../flow/emailTypes';
import rootReducer from '../reducers';
import { assert } from 'chai';
import sinon from 'sinon';
import R from 'ramda';

describe('email reducers', () => {
  let sandbox,
    store,
    dispatchThen,
    emailType = SEARCH_EMAIL_TYPE;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.email);
  });

  afterEach(() => {
    sandbox.restore();
  });

  let initialExpectedEmailState = INITIAL_EMAIL_STATE;

  it('should let you start editing an email', () => {
    return dispatchThen(startEmailEdit(emailType), [START_EMAIL_EDIT]).then(state => {
      assert.deepEqual(state[emailType], {
        ...initialExpectedEmailState,
        supportsAutomaticEmails: undefined,
      });
    });
  });

  it('should let you update an email edit in progress', () => {
    store.dispatch(startEmailEdit(emailType));
    let updatedInputs = R.clone(initialExpectedEmailState.inputs);
    updatedInputs.body = 'The body of my email';
    return dispatchThen(
      updateEmailEdit({type: emailType, inputs: updatedInputs}),
      [UPDATE_EMAIL_EDIT]
    ).then(state => {
      assert.deepEqual(state[emailType], {
        ...initialExpectedEmailState,
        supportsAutomaticEmails: undefined,
        inputs: updatedInputs,
      });
    });
  });

  it('should let you clear an existing email edit', () => {
    return assert.eventually.deepEqual(
      dispatchThen(clearEmailEdit(emailType), [CLEAR_EMAIL_EDIT]),
      {
        ...INITIAL_ALL_EMAILS_STATE,
        [emailType]: INITIAL_EMAIL_STATE
      },
    );
  });

  it('should let you update email validation', () => {
    store.dispatch(startEmailEdit(emailType));
    let errors = { subject: "NO SUBJECT" };
    return dispatchThen(
      updateEmailValidation({type: emailType, errors: errors}),
      [UPDATE_EMAIL_VALIDATION]
    ).then(state => {
      assert.deepEqual(state[emailType].validationErrors, errors);
    });
  });

  for (let type of [EMAIL_CAMPAIGN, ONE_TIME_EMAIL]) {
    it(`should let you set the email composition type: ${type}`, () => {
      store.dispatch(startEmailEdit(emailType));
      return dispatchThen(
        setAutomaticEmailType({type: emailType, automaticEmailType: type}),
        [AUTOMATIC_EMAIL_TYPE]
      ).then((state) => {
        assert.equal(state[emailType].automaticEmailType, type);
      });
    });
  }
});

describe('email reducers for the sendMail action', () => {
  let helper,
    emailType,
    MAIL_SUCCESS_RESPONSE: EmailSendResponse = { errorStatusCode: 200 },
    searchRequest = { size: 50 };
  let sendEmailArguments = ['subject', 'body', searchRequest];

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    emailType = SEARCH_EMAIL_TYPE;
    helper.store.dispatch(startEmailEdit(emailType));
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('should go through expected state changes when the send function succeeds', () => {
    helper.sendSearchResultMail.returns(Promise.resolve(MAIL_SUCCESS_RESPONSE));

    return helper.dispatchThen(
      sendEmail(
        emailType,
        helper.sendSearchResultMail,
        sendEmailArguments
      ),
      [INITIATE_SEND_EMAIL, SEND_EMAIL_SUCCESS]
    ).then(state => {
      assert.equal(state.email[emailType].fetchStatus, FETCH_SUCCESS);
      assert.equal(helper.sendSearchResultMail.callCount, 1);
      assert.deepEqual(helper.sendSearchResultMail.args[0], ['subject', 'body', searchRequest]);
    });
  });

  it('should go through expected state changes when the send function fails', () => {
    helper.sendSearchResultMail.returns(Promise.reject());

    return helper.dispatchThen(
      sendEmail(
        emailType,
        helper.sendSearchResultMail,
        sendEmailArguments
      ),
      [INITIATE_SEND_EMAIL, SEND_EMAIL_FAILURE]
    ).then(state => {
      assert.equal(state.email[emailType].fetchStatus, FETCH_FAILURE);
    });
  });
});
