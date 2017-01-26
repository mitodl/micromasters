/* global document: false, window: false */
import '../global_init';

import { assert } from 'chai';
import moment from 'moment';
import ReactDOM from 'react-dom';

import { makeCoupon } from '../factories/dashboard';
import IntegrationTestHelper from '../util/integration_test_helper';
import {
  REQUEST_DASHBOARD,
  UPDATE_COURSE_STATUS,
  CLEAR_COURSE_PRICES,
  CLEAR_DASHBOARD,
} from '../actions';
import * as actions from '../actions';
import { CLEAR_COUPONS } from '../actions/coupons';
import {
  SET_TOAST_MESSAGE,
  CLEAR_UI,
  SET_COUPON_NOTIFICATION_VISIBILITY,
  setToastMessage,
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
import {
  makeAvailablePrograms,
  makeCoursePrices,
  makeDashboard,
} from '../factories/dashboard';
import * as libCoupon  from '../lib/coupon';
import {
  REQUEST_ATTACH_COUPON,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  RECEIVE_ATTACH_COUPON_FAILURE,
  SET_RECENTLY_ATTACHED_COUPON,
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
} from '../actions/coupons';
import { findCourseRun } from '../util/util';
import {
  COUPON,
  DASHBOARD_RESPONSE,
} from '../test_constants';
import {
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

    describe('toast loop', () => {
      it("doesn't have a toast message loop on success", () => {
        let course = findCourse(course =>
          course.runs.length > 0 &&
          course.runs[0].status === STATUS_CURRENTLY_ENROLLED
        );
        let run = course.runs[0];
        let encodedKey = encodeURIComponent(run.course_id);
        const customMessage = {
          "message": "Custom toast message was not replaced"
        };
        helper.store.dispatch(setToastMessage(customMessage));
        return renderComponent(
          `/dashboard?status=receipt&course_key=${encodedKey}`,
          DASHBOARD_SUCCESS_ACTIONS
        ).then(() => {
          assert.deepEqual(helper.store.getState().ui.toastMessage, customMessage);
        });
      });

      it("doesn't have a toast message loop on failure", () => {
        const customMessage = {
          "message": "Custom toast message was not replaced"
        };
        helper.store.dispatch(setToastMessage(customMessage));
        return renderComponent('/dashboard?status=cancel', DASHBOARD_SUCCESS_ACTIONS).then(() => {
          assert.deepEqual(helper.store.getState().ui.toastMessage, customMessage);
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

    it("doesn't error if the course run couldn't be found", () => {
      return renderComponent(
        `/dashboard?status=receipt&course_key=missing`,
        DASHBOARD_SUCCESS_ACTIONS
      );
    });

    it('renders a price', () => {
      let calculatePricesStub = helper.sandbox.stub(libCoupon, 'calculatePrices');
      let dashboard = makeDashboard();
      let availablePrograms = makeAvailablePrograms(dashboard);
      let coursePrices = makeCoursePrices(dashboard);

      // set enrollment information so run comes up as offered in dashboard
      let program = dashboard[0];
      let run = program.courses[0].runs[0];
      run.enrollment_start_date = '2016-01-01';

      helper.dashboardStub.returns(Promise.resolve(dashboard));
      helper.programsGetStub.returns(Promise.resolve(availablePrograms));
      helper.coursePricesStub.returns(Promise.resolve(coursePrices));
      let calculatedPrices = new Map([[run.id, 123]]);
      calculatePricesStub.returns(calculatedPrices);

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        assert.include(wrapper.text(), `Pay Now $123`);

        assert.isTrue(calculatePricesStub.calledWith(dashboard, coursePrices, []));
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
        CLEAR_COUPONS,
      ], () => {
        ReactDOM.unmountComponentAtNode(div);
      });
    });
  });

  describe('handles redeeming coupons', () => {
    const COUPON_SUCCESS_ACTIONS = DASHBOARD_SUCCESS_ACTIONS.concat([
      REQUEST_ATTACH_COUPON,
      RECEIVE_ATTACH_COUPON_SUCCESS,
      SET_RECENTLY_ATTACHED_COUPON,
      SET_COUPON_NOTIFICATION_VISIBILITY,
      REQUEST_FETCH_COUPONS,
      RECEIVE_FETCH_COUPONS_SUCCESS,
    ]);
    const COUPON_FAILURE_ACTIONS = DASHBOARD_SUCCESS_ACTIONS.concat([
      REQUEST_ATTACH_COUPON,
      RECEIVE_ATTACH_COUPON_FAILURE,
      SET_TOAST_MESSAGE,
    ]);

    it('with a successful fetch', () => {
      helper.couponsStub.returns(Promise.resolve([COUPON]));

      return renderComponent(
        '/dashboard?coupon=success-coupon',
        COUPON_SUCCESS_ACTIONS
      ).then(() => {
        const state = helper.store.getState();
        assert.deepEqual(state.coupons.recentlyAttachedCoupon, COUPON);
        assert.isTrue(state.ui.couponNotificationVisibility);
        assert.deepEqual(state.coupons.coupons, [COUPON]);
      });
    });

    it('with a failed fetch', () => {
      helper.attachCouponStub.returns(Promise.reject());

      return renderComponent(
        '/dashboard?coupon=failure-coupon',
        COUPON_FAILURE_ACTIONS
      ).then(() => {
        const state = helper.store.getState();
        assert.isNull(state.coupons.recentlyAttachedCoupon);
        assert.isFalse(state.ui.couponNotificationVisibility);
        assert.deepEqual(state.ui.toastMessage, {
          title: "Coupon failed",
          message: "This coupon code is invalid or does not exist.",
          icon: TOAST_FAILURE
        });
      });
    });

    it('without a race condition', () => {  // eslint-disable-line mocha/no-skipped-tests
      let program = DASHBOARD_RESPONSE[1];
      let coupon1 = makeCoupon(program);
      let coupon2 = makeCoupon(program);
      coupon2.coupon_code = 'second-coupon';
      const slowPromise = new Promise(resolve => {
        setTimeout(() => {
          resolve([coupon1]);
        }, 200);
      });

      // Make sure we wait for the first call to complete before resolving the second promise
      helper.couponsStub.onCall(0).returns(slowPromise);
      helper.couponsStub.onCall(1).returns(Promise.resolve([coupon2]));

      return renderComponent(
        '/dashboard?coupon=success-coupon',
        COUPON_SUCCESS_ACTIONS
      ).then(() => {
        const state = helper.store.getState();
        assert.deepEqual(state.coupons.recentlyAttachedCoupon, COUPON);
        // must be the second call result
        assert.deepEqual(state.coupons.coupons, [coupon2]);
        assert.isTrue(state.ui.couponNotificationVisibility);
        assert.equal(helper.couponsStub.callCount, 2);
      });
    });
  });
});
