/* global SETTINGS: false */
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';
import Button from 'react-mdl/lib/Button';

import SpinnerButton from '../SpinnerButton';
import CourseAction from './CourseAction';
import {
  FINANCIAL_AID_PARTIAL_RESPONSE,
} from '../../test_constants';
import {
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_PENDING_ENROLLMENT,
  COURSE_ACTION_PAY,
  COURSE_ACTION_ENROLL,
  COURSE_ACTION_REENROLL,
} from '../../constants';
import {
  findCourse,
  alterFirstRun,
  findAndCloneCourse
} from '../../util/test_utils';
import { makeCourse } from '../../factories/dashboard';

describe('CourseAction', () => {
  const now = moment();
  let sandbox;
  let addCourseEnrollmentStub;
  let setEnrollSelectedCourseRunStub;
  let setEnrollCourseDialogVisibilityStub;
  let openFinancialAidCalculatorStub;
  let routerPushStub;
  let checkoutStub;
  let course;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    addCourseEnrollmentStub = sandbox.stub();
    setEnrollSelectedCourseRunStub = sandbox.stub();
    setEnrollCourseDialogVisibilityStub = sandbox.stub();
    openFinancialAidCalculatorStub = sandbox.stub();
    routerPushStub = sandbox.stub();
    checkoutStub = sandbox.spy();
    course = makeCourse(0);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const assertCourseRunSelected = (courseRun) => {
    sinon.assert.calledWith(setEnrollSelectedCourseRunStub, courseRun);
  };

  const assertCourseEnrollDialogOpened = () => {
    sinon.assert.calledWith(setEnrollCourseDialogVisibilityStub, true);
  };

  let renderCourseAction = (props = {}) => {
    return shallow(
      <CourseAction
        hasFinancialAid={false}
        financialAid={{}}
        addCourseEnrollment={addCourseEnrollmentStub}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRunStub}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibilityStub}
        now={now}
        courseRun={course.runs[0]}
        checkout={checkoutStub}
        openFinancialAidCalculator={openFinancialAidCalculatorStub}
        {...props}
      />
    , {context: { router: { push: routerPushStub}}});
  };

  describe('course enrollment', () => {
    it('says Enroll for COURSE_ACTION_ENROLL', () => {
      let wrapper = renderCourseAction({ actionType: COURSE_ACTION_ENROLL });
      assert.equal(wrapper.find(SpinnerButton).props().children, 'Enroll');
    });

    it('should handle a basic enrollment', () => {
      let wrapper = renderCourseAction({ actionType: COURSE_ACTION_ENROLL });
      wrapper.find(SpinnerButton).simulate('click');
      assertCourseRunSelected(course.runs[0]);
      assertCourseEnrollDialogOpened();
    });

    it('says Re-Enroll for COURSE_ACTION_REENROLL', () => {
      let wrapper = renderCourseAction({ actionType: COURSE_ACTION_REENROLL });
      assert.equal(wrapper.find(SpinnerButton).props().children, 'Re-Enroll');
    });
  });

  describe('course payment', () => {
    it('says Pay for COURSE_ACTION_PAY', () => {
      let wrapper = renderCourseAction({ actionType: COURSE_ACTION_PAY });
      assert.equal(wrapper.find(Button).props().children, 'Pay Now');
    });
  });

  it('shows a pending disabled button if the user has status pending-enrollment', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PENDING_ENROLLMENT
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun, actionType: COURSE_ACTION_ENROLL
    });
    let buttonProps = wrapper.find("SpinnerButton").props();
    assert.isTrue(buttonProps.spinning);
  });

  describe('with financial aid', () => {
    let course;

    beforeEach(() => {
      course = findAndCloneCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_OFFERED
      ));
    });

    it('allow user to click Enroll Now even without a calculated course price', () => {
      let firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
      });

      const wrapper = renderCourseAction({
        courseRun: firstRun,
        financialAid: {
          ...FINANCIAL_AID_PARTIAL_RESPONSE,
          has_user_applied: false
        },
        hasFinancialAid: true,
        actionType: COURSE_ACTION_ENROLL,
      });
      let button = wrapper.find(SpinnerButton);
      assert.isUndefined(button.props().disabled);
      assert.equal(button.props().children, 'Enroll');
    });

    it('indicates that a user must calculate the course price to upgrade to paid', () => {
      let course = findAndCloneCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CAN_UPGRADE
      ));
      let firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
      });

      const wrapper = renderCourseAction({
        courseRun: firstRun,
        financialAid: {
          ...FINANCIAL_AID_PARTIAL_RESPONSE,
          has_user_applied: false
        },
        hasFinancialAid: true,
        actionType: COURSE_ACTION_PAY,
      });

      let button = wrapper.find(Button);
      assert.isTrue(button.props().disabled);
      assert.equal(button.props().children, 'Pay Now');
    });

    it('pay button redirects to checkout', () => {
      let firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
        status: STATUS_CAN_UPGRADE
      });
      const wrapper = renderCourseAction({
        courseRun: firstRun,
        hasFinancialAid: false,
        actionType: COURSE_ACTION_PAY,
      });
      const payButton = wrapper.find('.pay-button');
      payButton.simulate('click');
      assert.equal(
        checkoutStub.calledWith(firstRun.course_id),
        true
      );
    });
  });
});
