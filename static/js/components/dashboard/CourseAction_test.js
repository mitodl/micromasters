/* global SETTINGS: false */
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';

import { FETCH_PROCESSING } from '../../actions';
import CourseAction from './CourseAction';
import {
  COURSE_PRICES_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE,
} from '../../test_constants';
import {
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_MISSED_DEADLINE,
  STATUS_PENDING_ENROLLMENT,
  FA_PENDING_STATUSES,
  FA_STATUS_SKIPPED,
  STATUS_PAID_BUT_NOT_ENROLLED,
} from '../../constants';
import {
  findCourse,
  alterFirstRun,
  findAndCloneCourse
} from '../../util/test_utils';

describe('CourseAction', () => {
  const now = moment();
  let sandbox, addCourseEnrollmentStub, checkoutStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    checkoutStub = sandbox.stub();
    addCourseEnrollmentStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let getElements = (renderedComponent) => {
    let button = renderedComponent.find(".pay-button");
    let buttonText;
    if (button.length > 0 && button.children().length > 0) {
      buttonText = button.children().text();
    }
    let description = renderedComponent.find(".description");
    let descriptionText = description.length === 1 ? description.text() : undefined;
    let link = renderedComponent.find("SpinnerButton.enroll-pay-later");
    let linkText = link.length === 1 ? link.children().text() : undefined;
    return {
      button: button,
      buttonText: buttonText,
      descriptionText: descriptionText,
      linkText: linkText
    };
  };

  let assertCheckoutButton = (button, courseId) => {
    button.simulate('click');
    assert.isAbove(checkoutStub.callCount, 0);
    assert.deepEqual(checkoutStub.args[0], [courseId]);
  };

  let renderCourseAction = (props = {}) => {
    return shallow(
      <CourseAction
        checkout={checkoutStub}
        coursePrice={COURSE_PRICES_RESPONSE[1]}
        hasFinancialAid={false}
        financialAid={{}}
        addCourseEnrollment={addCourseEnrollmentStub}
        now={now}
        courseRun={null}
        {...props}
      />
    );
  };

  it('shows passed for a passed course', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PASSED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    assert.equal(wrapper.find(".passed").text(), 'Passed');
  });

  it('shows a message for a failed course', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_NOT_PASSED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.equal(elements.descriptionText, 'Failed');
  });

  it('shows a message for a verified course', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.equal(elements.descriptionText, 'In Progress');
  });

  it('shows a message for course user paid but not enrolled', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PAID_BUT_NOT_ENROLLED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let description = wrapper.find(".description");
    let contactLink = description.find('a');

    assert.equal(
      description.text(),
      'Something went wrong. You paid for this course but are not enrolled. Contact us for help.'
    );
    assert.isAbove(contactLink.props().href.length, 0);
    assert.include(contactLink.props().href, SETTINGS.support_email);
  });

  it('shows a button to enroll and pay, and a link to enroll and pay later', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.isUndefined(elements.button.props().disabled);
    assert.include(elements.buttonText, 'Pay Now');
    assert.equal(elements.linkText, 'Enroll and pay later');
    assertCheckoutButton(elements.button, firstRun.course_id);

    wrapper.find(".enroll-pay-later").simulate('click');
    assert(addCourseEnrollmentStub.calledWith(firstRun.course_id));
  });

  it('hides an invalid date with STATUS_OFFERED', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = alterFirstRun(course, {enrollment_start_date: '1999-13-92'});
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);
    assert.isUndefined(elements.descriptionText);
  });

  it('shows an enroll button if user is not enrolled and enrollment starts today or earlier', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED &&
      course.runs[0].enrollment_start_date !== undefined
    ));
    let nowString = now.toISOString();
    let pastString = moment(now).add(-10, 'days').toISOString();

    [nowString, pastString].forEach(dateString => {
      let firstRun = alterFirstRun(course, {enrollment_start_date: dateString});
      const wrapper = renderCourseAction({
        courseRun: firstRun
      });
      let elements = getElements(wrapper);

      assert.isUndefined(elements.button.props().disabled);
      assert.include(elements.buttonText, 'Pay Now');
      assert.equal(elements.linkText, 'Enroll and pay later');
      assertCheckoutButton(elements.button, firstRun.course_id);
    });
  });

  it('shows an upgrade button if user is not verified but is enrolled', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);
    let formattedUpgradeDate = moment(firstRun.course_upgrade_deadline).format(DASHBOARD_FORMAT);

    assert.isUndefined(elements.button.props().disabled);
    assert.include(elements.buttonText, 'Pay Now');
    assert.equal(elements.descriptionText, `Payment due: ${formattedUpgradeDate}`);
    assertCheckoutButton(elements.button, firstRun.course_id);
  });

  it('hides an invalid date if user is enrolled but is not verified', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    let firstRun = alterFirstRun(course, { course_upgrade_deadline: '1999-13-92' });
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);
    assert.isUndefined(elements.descriptionText, 'Should not be any text');
  });

  it('shows a message if a user is not enrolled and the course has a future enrollment start date', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let enrollmentStartDate = moment(now).add(10, 'days').toISOString();
    let firstRun = alterFirstRun(course, {enrollment_start_date: enrollmentStartDate});
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.equal(elements.button.length, 0);
    let formattedDate = moment(firstRun.enrollment_start_date).format(DASHBOARD_FORMAT);
    assert.equal(elements.descriptionText, `Enrollment begins ${formattedDate}`);
  });

  it('shows a message if a user is not enrolled and the course has a fuzzy enrollment date', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = alterFirstRun(course, {
      fuzzy_enrollment_start_date: 'whenever',
      enrollment_start_date: null
    });
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.equal(elements.button.length, 0);
    assert.equal(elements.descriptionText, 'Enrollment begins whenever');
  });

  it('shows a message if a course run is offered with inadequate enrollment information', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = alterFirstRun(course, {
      fuzzy_enrollment_start_date: null,
      enrollment_start_date: null
    });
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.equal(elements.button.length, 0);
    assert.equal(elements.descriptionText, 'Enrollment information unavailable');
  });

  it('shows a countdown message if the user is enrolled and the course starts in the future', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_WILL_ATTEND
    ));
    let startDate = moment(now).add(10, 'days');
    let firstRun = alterFirstRun(course, {course_start_date: startDate.toISOString()});
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.include(elements.descriptionText, 'Course starts in 10 days');
  });

  it('ignores time of day when showing the number of days until a future course starts', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_WILL_ATTEND
    ));

    let currentDate = moment(now).set('hour', 12);
    let startDate = moment(currentDate).add(10, 'days');

    // Set the course to start in 10 days + 10 minutes
    startDate.add(10, 'minutes');
    let firstRun = alterFirstRun(course, {course_start_date: startDate.toISOString()});
    let wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);
    assert.include(elements.descriptionText, 'Course starts in 10 days');

    // Set the course to start in 10 days - 10 minutes
    startDate.add(-20, 'minutes');
    firstRun = alterFirstRun(course, {course_start_date: startDate.toISOString()});
    wrapper = renderCourseAction({
      courseRun: firstRun
    });
    elements = getElements(wrapper);
    assert.include(elements.descriptionText, 'Course starts in 10 days');
  });

  it('shows a message if the user has missed the upgrade deadline', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_MISSED_DEADLINE
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);

    assert.include(elements.descriptionText, 'You missed the payment deadline');
  });

  it('shows a pending disabled button if the user has status pending-enrollment', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PENDING_ENROLLMENT
    ));
    let firstRun = course.runs[0];
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });

    assert.equal(wrapper.find(".description").text(), "Processing...");
    let buttonProps = wrapper.find("SpinnerButton").props();
    assert.isTrue(buttonProps.spinning);
  });

  it('hides an invalid date if the user is enrolled and the course has yet to start', () => {
    let course = findAndCloneCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_WILL_ATTEND
    ));
    let firstRun = alterFirstRun(course, {course_start_date: "1999-13-92"});
    const wrapper = renderCourseAction({
      courseRun: firstRun
    });
    let elements = getElements(wrapper);
    assert.isUndefined(elements.descriptionText, 'Should not be any text');
  });

  describe('with financial aid', () => {
    let course;

    beforeEach(() => {
      course = findAndCloneCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_OFFERED
      ));
    });

    it('indicates that a user must calculate the course price', () => {
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
      });
      let elements = getElements(wrapper);

      assert.isUndefined(elements.button.props().disabled);
      assert.equal(elements.buttonText, 'Calculate Cost');
      assert.equal(elements.linkText, 'Enroll and pay later');
    });

    it('shows an enroll/pay button if a user has skipped financial aid', () => {
      let firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
      });

      const wrapper = renderCourseAction({
        courseRun: firstRun,
        financialAid: {
          ...FINANCIAL_AID_PARTIAL_RESPONSE,
          has_user_applied: false,
          application_status: FA_STATUS_SKIPPED,
        },
        hasFinancialAid: true,
      });
      let elements = getElements(wrapper);

      assert.isUndefined(elements.button.props().disabled);
      assert.include(elements.buttonText, 'Pay Now');
      assert.equal(elements.linkText, 'Enroll and pay later');
    });

    it('shows a disabled enroll/pay button if a user is pending approval', () => {
      let firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
      });

      FA_PENDING_STATUSES.forEach(pendingStatus => {
        const wrapper = renderCourseAction({
          courseRun: firstRun,
          financialAid: {
            ...FINANCIAL_AID_PARTIAL_RESPONSE,
            has_user_applied: true,
            application_status: pendingStatus,
          },
          hasFinancialAid: true,
        });
        let elements = getElements(wrapper);

        assert.isTrue(elements.button.props().disabled);
        // we don't show a spinner in this case, only for API loads or when waiting for Cybersource callback
        assert.isFalse(elements.button.props().spinning);
        assert.include(elements.buttonText, 'Pay Now');
        assert.equal(elements.linkText, 'Enroll and pay later');
      });
    });

    it('shows a spinner in place of the enroll button while API call is in progress', () => {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_OFFERED
      ));
      let firstRun = course.runs[0];
      const wrapper = renderCourseAction({
        courseRun: firstRun,
        courseEnrollAddStatus: FETCH_PROCESSING
      });
      let link = wrapper.find("SpinnerButton.enroll-pay-later");
      assert.isTrue(link.props().spinning);
    });

    it('shows a spinner in place of the pay button while API call is in progress', () => {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CAN_UPGRADE
      ));
      let firstRun = course.runs[0];
      const wrapper = renderCourseAction({
        courseRun: firstRun,
        checkoutStatus: FETCH_PROCESSING
      });
      let button = wrapper.find(".pay-button");
      assert.isTrue(button.props().spinning);
    });
  });
});
