/* global document: false, window: false, SETTINGS: false */
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';
import ReactDOM from 'react-dom';
import Decimal from 'decimal.js-light';
import R from 'ramda';
import Dialog from 'material-ui/Dialog';

import {
  makeAvailablePrograms,
  makeCoupon,
  makeCoursePrices,
  makeDashboard,
  makeCourse,
  makeProgram,
} from '../factories/dashboard';
import IntegrationTestHelper from '../util/integration_test_helper';
import {
  REQUEST_DASHBOARD,
  UPDATE_COURSE_STATUS,
  CLEAR_DASHBOARD,
} from '../actions/dashboard';
import * as storeActions from '../actions';
import * as dashboardActions from '../actions/dashboard';
import { CLEAR_COUPONS } from '../actions/coupons';
import {
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_TOAST_MESSAGE,
  CLEAR_UI,
  SET_COUPON_NOTIFICATION_VISIBILITY,
  SET_PAYMENT_TEASER_DIALOG_VISIBILITY,
  SET_ENROLL_COURSE_DIALOG_VISIBILITY,
  SET_ENROLL_SELECTED_COURSE_RUN,
  setToastMessage,
  showDialog,
} from '../actions/ui';
import {
  INITIATE_SEND_EMAIL,
  START_EMAIL_EDIT,
  SEND_EMAIL_SUCCESS,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
} from '../actions/email';
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
import { EMAIL_COMPOSITION_DIALOG } from '../components/email/constants';
import {
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
} from '../actions/financial_aid';
import {
  REQUEST_ATTACH_COUPON,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  RECEIVE_ATTACH_COUPON_FAILURE,
  SET_RECENTLY_ATTACHED_COUPON,
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
} from '../actions/coupons';
import { findCourseRun, wait } from '../util/util';
import * as util from '../util/util';
import {
  COUPON,
  DASHBOARD_RESPONSE,
  ERROR_RESPONSE,
  EDX_CHECKOUT_RESPONSE,
} from '../test_constants';
import {
  FA_ALL_STATUSES,
  FA_TERMINAL_STATUSES,

  STATUS_CURRENTLY_ENROLLED,
  STATUS_PENDING_ENROLLMENT,
  STATUS_OFFERED,
  STATUS_PAID_BUT_NOT_ENROLLED,
  TOAST_FAILURE,
  TOAST_SUCCESS,
  STATUS_CAN_UPGRADE,
  GRADE_DETAIL_DIALOG,
} from '../constants';
import type { Program } from '../flow/programTypes';
import {
  findCourse,
  modifyTextField,
} from '../util/test_utils';
import {
  DASHBOARD_SUCCESS_ACTIONS,
  DASHBOARD_ERROR_ACTIONS,
} from './test_util';
import { actions } from '../lib/redux_rest';
import EmailCompositionDialog from '../components/email/EmailCompositionDialog';
import { makeRunEnrolled } from '../components/dashboard/courses/test_util';
import Grades from '../components/dashboard/courses/Grades';

describe('DashboardPage', () => {
  let renderComponent, helper, listenForActions;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    listenForActions = helper.listenForActions.bind(helper);
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('shows a spinner when dashboard get is processing', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([, div]) => {
      assert.notOk(div.querySelector(".loader"), "Found spinner but no fetch in progress");
      helper.store.dispatch({
        type: REQUEST_DASHBOARD,
        payload: false,
        meta: SETTINGS.user.username
      });

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

  it('should show a <Grades /> component, and open the dialog when clicked', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      wrapper.find(Grades).find('.grades').simulate('click');
      let state = helper.store.getState().ui;
      let key = `${GRADE_DETAIL_DIALOG}${DASHBOARD_RESPONSE.programs[0].courses[0].title}`;
      assert.isTrue(state.dialogVisibility[key]);
    });
  });

  it('should close the <Grades /> dialog if you click outside', () => {
    let key = `${GRADE_DETAIL_DIALOG}${DASHBOARD_RESPONSE.programs[0].courses[0].title}`;
    helper.store.dispatch(showDialog(key));
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      wrapper.find(Grades).find(Dialog).props().onRequestClose();
      let state = helper.store.getState().ui;
      assert.isFalse(state.dialogVisibility[key]);
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
          helper.store.getState().dashboard[SETTINGS.user.username].programs,
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

    describe('course pricing', () => {
      let dashboard, availablePrograms, coursePrices;
      let run, program: Program, course;

      beforeEach(() => {
        dashboard = makeDashboard();
        program = dashboard.programs[0];
        course = program.courses[0];
        run = course.runs[0];
        run.enrollment_start_date = '2016-01-01';
        availablePrograms = makeAvailablePrograms(dashboard);
        coursePrices = makeCoursePrices(dashboard);
        helper.dashboardStub.returns(Promise.resolve(dashboard));
        helper.programsGetStub.returns(Promise.resolve(availablePrograms));
        helper.coursePricesStub.returns(Promise.resolve(coursePrices));
      });

      describe('100% program coupon', () => {
        let coupon;
        let expectedActions = DASHBOARD_SUCCESS_ACTIONS.concat([
          REQUEST_SKIP_FINANCIAL_AID,
          RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
        ]);

        beforeEach(() => {
          coupon = makeCoupon(program);
          coupon.amount_type = 'percent-discount';
          coupon.amount = Decimal('1');
          helper.couponsStub.returns(Promise.resolve([coupon]));
          program.financial_aid_user_info = {
            has_user_applied: false
          };
        });

        describe('should issue a request to skip if there is a 100% coupon for the program', () => {
          for (let status of FA_ALL_STATUSES) {
            it(`only if status is ${status}`, () => {
              program.financial_aid_user_info.application_status = status;
              let expectedSkip = !FA_TERMINAL_STATUSES.includes(status);
              let actions = expectedSkip ? expectedActions : DASHBOARD_SUCCESS_ACTIONS;
              return renderComponent('/dashboard', actions).then(() => {
                let aid = helper.store.getState().financialAid;
                if (expectedSkip) {
                  assert.equal(aid.fetchSkipStatus, storeActions.FETCH_SUCCESS);
                  sinon.assert.calledWith(helper.skipFinancialAidStub, program.id);
                } else {
                  assert.isUndefined(aid.fetchSkipStatus);
                }
              });
            });
          }
        });

        it('should hide the financial aid card if there is a 100% coupon for the program', () => {
          return renderComponent('/dashboard', expectedActions).then(([wrapper]) => {
            assert.equal(wrapper.find(".financial-aid-card").length, 0);
          });
        });

        it('should not care about coupons for other programs', () => {
          let otherProgram = dashboard.programs[1];
          coupon.object_id = otherProgram.id;
          coupon.program_id = otherProgram.id;

          return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
            sinon.assert.notCalled(helper.skipFinancialAidStub);
            assert.equal(wrapper.find(".financial-aid-card").length, 1);
          });
        });
      });
    });

    describe('fake timer tests', function() {
      let waitStub, waitResolve, waitPromise;
      beforeEach(() => {
        waitPromise = new Promise(resolve => {
          waitResolve = resolve;
        });
        waitStub = helper.sandbox.stub(util, 'wait').returns(waitPromise);
      });

      it('refetches the dashboard after 3 seconds if 2 minutes has not passed', () => {
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
          let fetchDashboardStub = helper.sandbox.stub(dashboardActions, 'fetchDashboard').returns(() => ({
            type: 'fake'
          }));
          assert.equal(fetchDashboardStub.callCount, 0);

          sinon.assert.calledWith(waitStub, 3000);
          waitResolve();
          return waitPromise.then(() => {
            sinon.assert.calledWith(fetchDashboardStub, SETTINGS.user.username, true);
          });
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
          sinon.assert.calledWith(waitStub, 3000);
          waitResolve();
          return waitPromise.then(() => {
            assert.deepEqual(helper.store.getState().ui.toastMessage, {
              message: `Order was not processed`,
              icon: TOAST_FAILURE
            });
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
        actions.prices.clearType,
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
      let program = DASHBOARD_RESPONSE.programs[1];
      let coupon1 = makeCoupon(program);
      let coupon2 = makeCoupon(program);
      coupon2.coupon_code = 'second-coupon';
      const slowPromise = wait(200).then(() => [coupon1]);

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
        sinon.assert.calledTwice(helper.couponsStub);
      });
    });
  });

  describe('course contact UI behavior', () => {
    let dashboardResponse;
    const faExpectedStateList = [
      { hasFA: true, expectedMessage: "This is a premium feature for learners who have paid for the course." },
      { hasFA: false, expectedMessage: "This is a premium feature for verified learners." }
    ];
    const CONTACT_LINK_SELECTOR = '.contact-link';
    const EMAIL_DIALOG_ACTIONS = [
      START_EMAIL_EDIT,
      SHOW_DIALOG
    ];
    const PAYMENT_DIALOG_ACTIONS = [
      SET_PAYMENT_TEASER_DIALOG_VISIBILITY
    ];

    beforeEach(() => {
      // Limit the dashboard response to 1 program
      dashboardResponse = {"programs": [R.clone(DASHBOARD_RESPONSE.programs[0])]};
    });

    it('shows the email composition dialog when a user has permission to contact a course team', () => {
      let course = makeCourse();
      course.has_contact_email = true;
      course.runs[0].has_paid = true;
      makeRunEnrolled(course.runs[0]);
      dashboardResponse.programs[0].courses = [course];
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse));

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        let contactLink = wrapper.find(CONTACT_LINK_SELECTOR).at(0);

        return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
          contactLink.simulate('click');
        }).then((state) => {
          assert.isFalse(state.ui.paymentTeaserDialogVisibility);
          assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);

          modifyTextField(document.querySelector('.email-subject'), 'subject');
          // it is difficult to programmatically edit the draft-js field
          wrapper.find(EmailCompositionDialog)
            .props()
            .updateEmailFieldEdit('body', {target: {value: 'body' }});

          return listenForActions([
            UPDATE_EMAIL_VALIDATION,
            INITIATE_SEND_EMAIL,
            SEND_EMAIL_SUCCESS,
            CLEAR_EMAIL_EDIT,
            HIDE_DIALOG,
          ], () => {
            document.querySelector('.email-composition-dialog .save-button').click();
          }).then(state => {
            assert.isFalse(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);
            assert.isTrue(helper.sendCourseTeamMail.calledWith('subject', 'body', course.id));
          });
        });
      });
    });

    for (let faExpectedObj of faExpectedStateList) {
      it(`shows the payment teaser dialog when a user lacks permission
        to contact a course team with financial aid status: ${faExpectedObj.hasFA}`, () => {
        let course = makeCourse();
        course.has_contact_email = true;
        // Set all course runs to unpaid
        course.runs = R.chain(R.set(R.lensProp('has_paid'), false), course.runs);
        makeRunEnrolled(course.runs[0]);
        dashboardResponse.programs[0].courses = [course];
        dashboardResponse.programs[0].financial_aid_availability = faExpectedObj.hasFA;
        if (faExpectedObj.hasFA) {
          dashboardResponse.programs[0].financial_aid_user_info = {
            max_possible_cost: 100,
            min_possible_cost: 50,
            has_user_applied: false,
          };
        }
        helper.dashboardStub.returns(Promise.resolve(dashboardResponse));

        return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
          let contactLink = wrapper.find(CONTACT_LINK_SELECTOR).at(0);

          return listenForActions(PAYMENT_DIALOG_ACTIONS, () => {
            contactLink.simulate('click');
          }).then((state) => {
            assert.equal(
              document.querySelector('.inner-content > p').textContent,
              faExpectedObj.expectedMessage
            );
            assert.isTrue(state.ui.paymentTeaserDialogVisibility);
            assert.isFalse(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);
          });
        });
      });
    }
  });

  describe('course enrollment dialog', () => {
    let dashboardResponse;
    const ENROLL_BUTTON_SELECTOR = '.course-list .enroll-button';
    const COURSE_ENROLL_DIALOG_ACTIONS = [
      SET_ENROLL_COURSE_DIALOG_VISIBILITY,
      SET_ENROLL_SELECTED_COURSE_RUN,
    ];

    beforeEach(() => {
      // Limit the dashboard response to 1 program
      dashboardResponse = {"programs": [R.clone(DASHBOARD_RESPONSE.programs[0])]};
    });

    it('renders correctly', () => {
      let course = makeCourse();
      course.runs[0].enrollment_start_date = moment().subtract(2, 'days');
      dashboardResponse.programs[0].courses = [course];
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse));

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        let enrollButton = wrapper.find(ENROLL_BUTTON_SELECTOR).at(0);

        return listenForActions(COURSE_ENROLL_DIALOG_ACTIONS, () => {
          enrollButton.simulate('click');
        }).then((state) => {
          assert.isTrue(state.ui.enrollCourseDialogVisibility);
          assert.deepEqual(state.ui.enrollSelectedCourseRun, course.runs[0]);
        });
      });
    });
  });

  describe('edx cache refresh error message', () => {
    let dashboardResponse;
    const ERROR_MESSAGE_SELECTOR = '.alert-message-inline';

    beforeEach(() => {
      dashboardResponse = R.clone(DASHBOARD_RESPONSE);
    });

    it('if the edx is fresh there is no error box', () => {
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse));
      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 0);
      });
    });

    it('if the edx is not fresh there is the error box', () => {
      dashboardResponse.is_edx_data_fresh = false;
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse));
      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 1);
      });
    });

    it('if the dashboard does not load there is no error box for edx cache', () => {
      helper.dashboardStub.returns(Promise.reject(ERROR_RESPONSE));
      return renderComponent("/dashboard", DASHBOARD_ERROR_ACTIONS).then(([wrapper]) => {
        assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 0);
      });
    });
  });

  describe("checkout for non financial aid courses", () => {
    it('redirects to edX when the checkout API tells us to', () => {
      let program = makeProgram();
      let promise = Promise.resolve(EDX_CHECKOUT_RESPONSE);
      let checkoutStub = helper.sandbox.stub(storeActions, 'checkout').returns(() => promise);

      program.financial_aid_availability = false;
      program.description = "Not passed program",
      program.courses[0].runs = [{
        ...program.courses[0].runs[0],
        course_start_date: "2016-09-22T11:48:27Z",
        fuzzy_start_date: "Fall 2016",
        position: 1,
        has_paid: false,
        status: STATUS_CAN_UPGRADE,
        course_end_date: moment().add(1, 'months'),
        course_upgrade_deadline: moment().add(1, 'months'),
        final_grade: 75
      }];

      let dashboardResponse = {"programs": [ program ]};
      let coursePrices = makeCoursePrices(dashboardResponse);
      let availablePrograms = makeAvailablePrograms(dashboardResponse);
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse));
      helper.programsGetStub.returns(Promise.resolve(availablePrograms));
      helper.coursePricesStub.returns(Promise.resolve(coursePrices));

      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        wrapper.find('.pay-button').props().onClick();

        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], [ program.courses[0].runs[0].course_id]);

        return promise.then(() => {
          assert.equal(window.location.toString(), EDX_CHECKOUT_RESPONSE.url);
        });
      });
    });
  });
});
