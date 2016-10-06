/* global document: false, window: false */
import '../global_init';

import { assert } from 'chai';

import CourseAction from '../components/dashboard/CourseAction';
import IntegrationTestHelper from '../util/integration_test_helper';
import { REQUEST_DASHBOARD } from '../actions';
import * as actions from '../actions';
import { SET_TOAST_MESSAGE } from '../actions/ui';
import * as util from '../util/util';
import {
  CYBERSOURCE_CHECKOUT_RESPONSE,
  EDX_CHECKOUT_RESPONSE,
  TOAST_FAILURE,
  TOAST_SUCCESS,
} from '../constants';
import { findCourse } from '../util/test_utils';

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
    return renderComponent('/dashboard').then(([wrapper]) => {
      assert.equal(wrapper.find(".dashboard-user-card").length, 1);
      assert.equal(wrapper.find(".course-list").length, 1);
      assert.equal(wrapper.find(".progress-widget").length, 1);
    });
  });

  describe("checkout", () => {
    let savedWindowLocation;
    beforeEach(() => {
      savedWindowLocation = null;
      Object.defineProperty(window, "location", {
        set: value => {
          savedWindowLocation = value;
        }
      });
    });

    it('redirects to edX when the checkout API tells us to', () => {
      let promise = Promise.resolve(EDX_CHECKOUT_RESPONSE);
      let checkoutStub = helper.sandbox.stub(actions, 'checkout').returns(() => promise);

      return renderComponent('/dashboard').then(([wrapper]) => {
        wrapper.find(CourseAction).first().props().checkout('course_id');

        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], ['course_id']);

        return promise.then(() => {
          assert.equal(savedWindowLocation, EDX_CHECKOUT_RESPONSE.url);
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

      return renderComponent('/dashboard').then(([wrapper]) => {
        wrapper.find(CourseAction).first().props().checkout('course_id');

        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], ['course_id']);

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

  it('shows the order status toast when the query param is set for a cancellation', () => {
    return renderComponent('/dashboard?status=cancel', [SET_TOAST_MESSAGE]).then(() => {
      assert.deepEqual(helper.store.getState().ui.toastMessage, {
        message: "Order was cancelled",
        icon: TOAST_FAILURE
      });
    });
  });

  it('shows the order status toast when the query param is set for a success', () => {
    let course = findCourse(course => course.runs.length > 0);
    let run = course.runs[0];
    let encodedKey = encodeURIComponent(run.course_id);
    return renderComponent(`/dashboard?status=receipt&course_key=${encodedKey}`, [SET_TOAST_MESSAGE]).then(() => {
      assert.deepEqual(helper.store.getState().ui.toastMessage, {
        title: "Order Complete!",
        message: `You are now enrolled in ${course.title}`,
        icon: TOAST_SUCCESS
      });
    });
  });
});
