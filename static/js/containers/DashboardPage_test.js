/* global document: false, window: false */
import '../global_init';

import { assert } from 'chai';
import moment from 'moment';
import ReactDOM from 'react-dom';

import CourseAction from '../components/dashboard/CourseAction';
import IntegrationTestHelper from '../util/integration_test_helper';
import {
  REQUEST_DASHBOARD,
  UPDATE_COURSE_STATUS,
  CLEAR_COURSE_PRICES,
  CLEAR_DASHBOARD,
} from '../actions';
import * as actions from '../actions';
import {
  SET_TOAST_MESSAGE,
  CLEAR_UI,
} from '../actions/ui';
import {
  SET_TIMEOUT_ACTIVE,
  setInitialTime,
} from '../actions/order_receipt';
import {
  CLEAR_PROFILE,
} from '../actions/profile';
import {
  CLEAR_ENROLLMENTS,
} from '../actions/programs';
import { findCourseRun } from '../util/util';
import * as util from '../util/util';
import {
  CYBERSOURCE_CHECKOUT_RESPONSE,
  EDX_CHECKOUT_RESPONSE,
  TOAST_FAILURE,
  TOAST_SUCCESS,

  STATUS_CURRENTLY_ENROLLED,
  STATUS_PENDING_ENROLLMENT,
  STATUS_OFFERED,
  STATUS_PAID_BUT_NOT_ENROLLED,
} from '../constants';
import { findCourse } from '../util/test_utils';
import { DASHBOARD_SUCCESS_ACTIONS } from './test_util';

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
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([, div]) => {
      assert.notOk(div.querySelector(".loader"), "Found spinner but no fetch in progress");
      helper.store.dispatch({ type: REQUEST_DASHBOARD, payload: { noSpinner: false } });

      assert(div.querySelector(".loader"), "Unable to find spinner");
    });
  });

  it('has all the cards we expect', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      assert.lengthOf(wrapper.find(".dashboard-user-card"), 1);
      assert.lengthOf(wrapper.find(".course-list"), 1);
      assert.lengthOf(wrapper.find(".progress-widget"), 1);
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

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
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

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
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

  describe('order receipt and cancellation pages', () => {
    const SUCCESS_WITH_TOAST_ACTIONS = DASHBOARD_SUCCESS_ACTIONS.concat([SET_TOAST_MESSAGE]);
    const SUCCESS_WITH_TIMEOUT_ACTIONS = DASHBOARD_SUCCESS_ACTIONS.concat([
      SET_TIMEOUT_ACTIVE,
      UPDATE_COURSE_STATUS,
    ]);

    it('shows the order status toast when the query param is set for a cancellation', () => {
      return renderComponent('/dashboard?status=cancel', SUCCESS_WITH_TOAST_ACTIONS).then(() => {
        assert.deepEqual(helper.store.getState().ui.toastMessage, {
          message: "Order was cancelled",
          icon: TOAST_FAILURE
        });
      });
    });

    it('shows the order status toast when the query param is set for a success', () => {
      let course = findCourse(course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
      );
      let run = course.runs[0];
      let encodedKey = encodeURIComponent(run.course_id);
      return renderComponent(
        `/dashboard?status=receipt&course_key=${encodedKey}`,
        SUCCESS_WITH_TOAST_ACTIONS
      ).then(() => {
        assert.deepEqual(helper.store.getState().ui.toastMessage, {
          title: "Order Complete!",
          message: `You are now enrolled in ${course.title}`,
          icon: TOAST_SUCCESS
        });
      });
    });

    it('shows the toast when the query param is set for a success but user is not enrolled', () => {
      let course = findCourse(course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_PAID_BUT_NOT_ENROLLED
      );
      let run = course.runs[0];
      let encodedKey = encodeURIComponent(run.course_id);
      return renderComponent(
        `/dashboard?status=receipt&course_key=${encodedKey}`,
        SUCCESS_WITH_TOAST_ACTIONS
      ).then(() => {
        assert.deepEqual(helper.store.getState().ui.toastMessage, {
          title: "Course Enrollment",
          message: `Something went wrong. You paid for this course '${course.title}' but are not enrolled.`,
          icon: TOAST_FAILURE
        });
      });
    });

    it('sets the course run to have a pending status', () => {
      let course = findCourse(course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_OFFERED
      );
      let run = course.runs[0];
      let encodedKey = encodeURIComponent(run.course_id);
      return renderComponent(
        `/dashboard?status=receipt&course_key=${encodedKey}`,
        SUCCESS_WITH_TIMEOUT_ACTIONS
      ).then(() => {
        let [ courseRun ] = findCourseRun(
          helper.store.getState().dashboard.programs,
          _run => _run.course_id === run.course_id
        );
        assert.equal(run.course_id, courseRun.course_id);
        assert.equal(courseRun.status, STATUS_PENDING_ENROLLMENT);
      });
    });

    describe('fake timer tests', function() {
      let clock;
      beforeEach(() => {
        clock = helper.sandbox.useFakeTimers(moment('2016-09-01').valueOf());
      });

      it('refetches the dashboard after 3 seconds if 30 seconds has not passed', () => {
        let course = findCourse(course =>
          course.runs.length > 0 &&
          course.runs[0].status === STATUS_OFFERED
        );
        let run = course.runs[0];
        let encodedKey = encodeURIComponent(run.course_id);
        return renderComponent(
          `/dashboard?status=receipt&course_key=${encodedKey}`,
          SUCCESS_WITH_TIMEOUT_ACTIONS
        ).then(() => {
          let fetchDashboardStub = helper.sandbox.stub(actions, 'fetchDashboard').returns(() => ({
            type: 'fake'
          }));
          clock.tick(3501);
          assert(fetchDashboardStub.calledWith(true), 'expected fetchDashboard called');
        });
      });

      it('shows an error message if more than 30 seconds have passed', () => {
        let course = findCourse(course =>
          course.runs.length > 0 &&
          course.runs[0].status === STATUS_OFFERED
        );
        let run = course.runs[0];
        let encodedKey = encodeURIComponent(run.course_id);
        return renderComponent(
          `/dashboard?status=receipt&course_key=${encodedKey}`,
          SUCCESS_WITH_TIMEOUT_ACTIONS
        ).then(() => {
          let past = moment().add(-125, 'seconds').toISOString();
          helper.store.dispatch(setInitialTime(past));
          clock.tick(3500);
          assert.deepEqual(helper.store.getState().ui.toastMessage, {
            message: `Order was not processed`,
            icon: TOAST_FAILURE
          });
        });
      });
    });
  });

  it('dispatches actions to clean up after unmounting', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([, div]) => {
      return helper.listenForActions([
        CLEAR_PROFILE,
        CLEAR_UI,
        CLEAR_ENROLLMENTS,
        CLEAR_DASHBOARD,
        CLEAR_COURSE_PRICES,
      ], () => {
        ReactDOM.unmountComponentAtNode(div);
      });
    });
  });
});
