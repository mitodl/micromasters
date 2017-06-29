/* global SETTINGS: false */
import { assert } from 'chai';

import IntegrationTestHelper from '../util/integration_test_helper';
import { REQUEST_DASHBOARD } from '../actions/dashboard';
import { STATUS_OFFERED } from '../constants';
import * as actions from '../actions';
import * as util from '../util/util';
import {
  CYBERSOURCE_CHECKOUT_RESPONSE,
  EDX_CHECKOUT_RESPONSE,
} from '../test_constants';
import { DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS } from './test_util';
import { findCourse } from '../util/test_utils';

describe('OrderSummaryPage', () => {
  let renderComponent, helper,run, url;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    run = course.runs[0];
    url = `/order_summary/?course_key=${encodeURIComponent(run.course_id)}`;
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('shows a spinner when dashboard get is processing', () => {
    return renderComponent(url, DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS).then(([, div]) => {

      assert.notOk(div.querySelector(".loader"), "Found spinner but no fetch in progress");
      helper.store.dispatch({type: REQUEST_DASHBOARD, payload: false, meta: SETTINGS.user.username});

      assert(div.querySelector(".loader"), "Unable to find spinner");
    });
  });

  describe("checkout", () => {
    it('redirects to edX when the checkout API tells us to', () => {
      let promise = Promise.resolve(EDX_CHECKOUT_RESPONSE);
      let checkoutStub = helper.sandbox.stub(actions, 'checkout').returns(() => promise);

      return renderComponent(url, DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS).then(([wrapper]) => {
        wrapper.find('SpinnerButton').props().onClick();

        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], [run.course_id]);

        return promise.then(() => {
          assert.equal(window.location.toString(), EDX_CHECKOUT_RESPONSE.url);
        });
      });
    });

    it('constructs a form to be sent to Cybersource and submits it', () => {
      let promise = Promise.resolve(CYBERSOURCE_CHECKOUT_RESPONSE);
      let checkoutStub = helper.sandbox.stub(actions, 'checkout').returns(() => promise);
      let submitStub = helper.sandbox.stub();
      let fakeForm = document.createElement("form");
      fakeForm.setAttribute("class", "fake-form");
      fakeForm.submit = submitStub;
      let createFormStub = helper.sandbox.stub(util, 'createForm').returns(fakeForm);

      return renderComponent(url, DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS).then(([wrapper]) => {
        wrapper.find('SpinnerButton').props().onClick();

        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], [run.course_id]);

        return promise.then(() => {
          const {url, payload} = CYBERSOURCE_CHECKOUT_RESPONSE;
          assert.equal(createFormStub.callCount, 1);
          assert.deepEqual(createFormStub.args[0], [url, payload]);

          assert(document.body.querySelector(".fake-form"), 'fake form not found in body');
          assert.equal(submitStub.callCount, 1);
          assert.deepEqual(submitStub.args[0], []);
        });
      });
    });
  });
});
