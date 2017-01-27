import React from 'react';
import { shallow, mount } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

import CourseSubRow from './CourseSubRow';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE,
} from '../../test_constants';
import {
  DASHBOARD_MONTH_FORMAT,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_OFFERED,
} from '../../constants';

describe('CourseSubRow', () => {
  let sandbox, courseRun, now, openFinancialAidCalculator, addCourseEnrollment;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    now = moment();
    openFinancialAidCalculator = sandbox.stub();
    addCourseEnrollment = sandbox.stub();
    courseRun = _.cloneDeep(DASHBOARD_RESPONSE[1].courses[0]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderSubRow = (props = {}, isShallow = true) => {
    let render = isShallow ? shallow : mount;
    return render(
      <CourseSubRow
        hasFinancialAid={true}
        financialAid={FINANCIAL_AID_PARTIAL_RESPONSE}
        coursePrice={COURSE_PRICES_RESPONSE[0]}
        openFinancialAidCalculator={openFinancialAidCalculator}
        now={now}
        addCourseEnrollment={addCourseEnrollment}
        key={1}
        {...props}
      />,
      {
        context: {
          router: {}
        },
        childContextTypes: {
          router:   React.PropTypes.object.isRequired
        }
      }
    );
  };

  it('indicates that no future runs are available when a null course run was provided', () => {
    const wrapper = renderSubRow({
      courseRun: null
    });
    assert.include(wrapper.html(), 'No future courses are currently scheduled.');
  });

  it('shows information about a future course if the given course run has an "offered" status', () => {
    courseRun.status = STATUS_OFFERED;
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    let subRowHTML = wrapper.html();
    assert.include(subRowHTML, 'You can re-take this course!');
  });

  it('indicates open enrollment and presents an enrollment button if the course run is offered and current', () => {
    Object.assign(courseRun, {
      status: STATUS_OFFERED,
      enrollment_start_date: moment().add(-1, 'days'),
      enrollment_end_date: moment().add(1, 'days')
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    }, false);
    assert.include(wrapper.find(".course-description").html(), "Enrollment open");
    assert.equal(wrapper.find(".course-grade").text().trim(), "");
    let actionCell = wrapper.find(".course-action");
    assert.equal(actionCell.find("button.pay-button").text(), "Calculate Cost");
    assert.equal(actionCell.find("button.enroll-pay-later").text(), "Enroll and pay later");
  });

  it('indicates future enrollment and if a future course run is offered', () => {
    Object.assign(courseRun, {
      status: STATUS_OFFERED,
      enrollment_start_date: moment().add(1, 'days'),
      enrollment_end_date: moment().add(3, 'days')
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.include(wrapper.find(".course-description").html(), "Enrollment starts:");
  });

  it('shows fuzzy start date for offered course run if start date is missing', () => {
    let fuzzyStartDate = 'Spring 2016';
    Object.assign(courseRun, {
      status: STATUS_OFFERED,
      course_start_date: null,
      fuzzy_start_date: fuzzyStartDate
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.equal(
      wrapper.find(".course-description .detail").first().text(),
      `Next course starts: ${fuzzyStartDate}`
    );
  });

  it('omits course start date for offered course run if start date and fuzzy start date are missing', () => {
    Object.assign(courseRun, {
      status: STATUS_OFFERED,
      course_start_date: null,
      fuzzy_start_date: null
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.notInclude(wrapper.find(".course-description").text(), "Next course starts:");
  });

  it('shows failed course information if the course run was failed', () => {
    Object.assign(courseRun, {
      status: STATUS_NOT_PASSED,
      final_grade: 50
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.equal(wrapper.find(".course-grade").text(), "50%");
    assert.equal(wrapper.find(".course-action").text(), "Failed");
  });

  it('should course information if a course was passed', () => {
    let courseRun = {
      ...courseRun,
      status: STATUS_PASSED,
      final_grade: 100
    };
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.equal(wrapper.find(".course-grade").text(), "100%");
    assert.equal(wrapper.find(".course-action").text(), "Passed");
  });


  it('shows a course date range for a failed course run', () => {
    Object.assign(courseRun, {
      status: STATUS_NOT_PASSED,
      course_start_date: moment().add(-3, 'months'),
      course_end_date: moment().add(-1, 'months')
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    let formattedStart = courseRun.course_start_date.format(DASHBOARD_MONTH_FORMAT);
    let formattedEnd = courseRun.course_end_date.format(DASHBOARD_MONTH_FORMAT);
    assert.equal(wrapper.find(".course-description").text(), `${formattedStart} - ${formattedEnd}`);
  });

  it('shows a course end date for a failed course run', () => {
    Object.assign(courseRun, {
      status: STATUS_NOT_PASSED,
      course_start_date: null,
      course_end_date: now
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    let formattedEnd = courseRun.course_end_date.format(DASHBOARD_MONTH_FORMAT);
    assert.equal(wrapper.find(".course-description").text(), formattedEnd);
  });

  it('shows a fuzzy date for a failed course run', () => {
    Object.assign(courseRun, {
      status: STATUS_NOT_PASSED,
      course_start_date: null,
      course_end_date: null,
      fuzzy_start_date: 'Spring 2016'
    });
    const wrapper = renderSubRow({
      courseRun: courseRun,
    });
    assert.equal(wrapper.find(".course-description").text(), courseRun.fuzzy_start_date);
  });
});
