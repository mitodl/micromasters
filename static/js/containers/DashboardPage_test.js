/* global document: false, window: false */
import '../global_init';

import { assert } from 'chai';
import _ from 'lodash';

import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_FAILURE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions';
import {
  DASHBOARD_RESPONSE,
  DASHBOARD_RESPONSE_ERROR,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';

describe('DashboardPage', () => {
  let renderComponent, helper;
  let dashboardErrorActions;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    dashboardErrorActions = [
      RECEIVE_DASHBOARD_FAILURE,
      RECEIVE_GET_USER_PROFILE_SUCCESS
    ];
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('shows a spinner when dashboard get is processing', () => {
    return renderComponent('/dashboard').then(([, div]) => {
      assert.notOk(div.querySelector(".spinner"), "Found spinner but no fetch in progress");
      helper.store.dispatch({ type: REQUEST_DASHBOARD });

      assert(div.querySelector(".spinner"), "Unable to find spinner");
    });
  });

  describe('dashboard errors', () => {
    let errorString = `Sorry, we were unable to load the data necessary
      to process your request. Please reload the page.`;
    errorString = errorString.replace(/\s\s+/g, ' ');

    it('error from the backend triggers error message in dashboard', () => {
      helper.dashboardStub.returns(Promise.reject(DASHBOARD_RESPONSE_ERROR));

      return renderComponent("/dashboard", dashboardErrorActions, false).then(([, div]) => {
        let message = div.getElementsByClassName('alert-message')[0];
        assert(message.textContent.indexOf(errorString) > -1);
        assert(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.error_code) > -1);
        assert(message.textContent.indexOf("Additional info:") > -1);
        assert(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.user_message) > -1);
      });
    });

    it('the error from the backend does not need to be complete', () => {
      let response = _.cloneDeep(DASHBOARD_RESPONSE_ERROR);
      delete response.user_message;
      helper.dashboardStub.returns(Promise.reject(response));

      return renderComponent("/dashboard", dashboardErrorActions, false).then(([, div]) => {
        let message = div.getElementsByClassName('alert-message')[0];
        assert(message.textContent.indexOf(errorString) > -1);
        assert(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.error_code) > -1);
        assert.equal(message.textContent.indexOf("Additional info:"), -1);
        assert.equal(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.user_message), -1);
      });
    });

    it('the error from the backend does not need to exist at all as long as there is an http error', () => {
      helper.dashboardStub.returns(Promise.reject({}));

      return renderComponent("/dashboard", dashboardErrorActions, false).then(([, div]) => {
        let message = div.getElementsByClassName('alert-message')[0];
        assert(message.textContent.indexOf(errorString) > -1);
        assert.equal(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.error_code), -1);
        assert.equal(message.textContent.indexOf("Additional info:"), -1);
        assert.equal(message.textContent.indexOf(DASHBOARD_RESPONSE_ERROR.user_message), -1);
      });
    });

    it('a regular response does not show the error', () => {
      helper.dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));

      return renderComponent("/dashboard").then(([, div]) => {
        let message = div.getElementsByClassName('alert-message')[0];
        assert.equal(message, undefined);
      });
    });
  });
});
