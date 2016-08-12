/* global document: false, window: false */
import '../global_init';

import { assert } from 'chai';

import IntegrationTestHelper from '../util/integration_test_helper';
import { REQUEST_DASHBOARD } from '../actions';

describe('DashboardPage', () => {
  let renderComponent, helper;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
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

  it('has all the cards we expect', () => {
    return renderComponent('/dashboard').then(([, div]) => {
      assert(div.querySelector(".dashboard-user-card"), "Unable to find user card");
      assert(div.querySelector(".course-list"), "Unable to find course listing card");
      assert(div.querySelector(".progress-widget"), "Unable to find progress card");
    });
  });
});
