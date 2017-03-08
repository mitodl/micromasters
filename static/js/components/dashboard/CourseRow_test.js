import React from 'react';
import { shallow, mount } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

import { makeDashboard, makeCourse } from '../../factories/dashboard';
import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import CourseDescription from './CourseDescription';
import CourseGrade from './CourseGrade';
import {
  DASHBOARD_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE,
} from '../../test_constants';
import {
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_MISSED_DEADLINE,
} from '../../constants';
import { generateCourseFromExisting } from '../../util/test_utils';
import { INITIAL_UI_STATE } from '../../reducers/ui';

describe('CourseRow', () => {
  let sandbox;
  const defaultCourseRowProps = () => ({
    hasFinancialAid: true,
    financialAid: FINANCIAL_AID_PARTIAL_RESPONSE,
    prices: new Map([[345, 456]]),
    openFinancialAidCalculator: sandbox.stub(),
    now: moment(),
    addCourseEnrollment: sandbox.stub(),
    course: null,
    openCourseContactDialog: sandbox.stub(),
    ui: INITIAL_UI_STATE
  });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderRow = (props = {}, isShallow = false) => {
    let render = isShallow ? shallow : mount;
    return render(
      <CourseRow
        {...defaultCourseRowProps()}
        {...props}
      />,
      {
        context: {
          router: {}
        },
        childContextTypes: {
          router:   React.PropTypes.object.isRequired}
      }
    );
  };

  it('forwards the appropriate props', () => {
    const { programs } = makeDashboard();
    const course = programs[0].courses[0];
    // change this so there's something to show in CourseSubRow
    course.runs[1].status = STATUS_NOT_PASSED;
    const courseRun = course.runs[0];
    const courseTitle = course.title;

    const wrapper = renderRow({
      course: course
    }, true);
    let courseRowProps = wrapper.props();
    let keys = Object.keys(courseRowProps).filter(key => (
      key !== 'children' && key !== 'className'
    ));
    let actionProps = wrapper.find(CourseAction).props();
    for (const key of keys) {
      assert.deepEqual(actionProps[key], courseRowProps[key]);
    }
    let descriptionProps = wrapper.find(CourseDescription).props();
    assert.deepEqual(descriptionProps.courseRun, courseRun);
    assert.deepEqual(descriptionProps.courseTitle, courseTitle);
    assert.deepEqual(wrapper.find(CourseGrade).props(), {
      courseRun,
    });
    let subRowProps = wrapper.find("CourseSubRow").props();
    for (const key of keys) {
      assert.deepEqual(subRowProps[key], courseRowProps[key]);
    }
  });

  describe('with failed/missed-upgrade-deadline runs', () => {
    let courseToClone = DASHBOARD_RESPONSE.programs[1].courses[0];

    it('shows two-column view when the upgrade deadline was missed', () => {
      let pastCourseRunCount = 1;
      let course = generateCourseFromExisting(courseToClone, pastCourseRunCount);
      course.runs[0].status = STATUS_MISSED_DEADLINE;

      const wrapper = renderRow({
        course: course
      });
      assert.lengthOf(wrapper.find('.course-container').children(), 2);
    });

    it('shows subrows when a course has been taken multiple times', () => {
      let courseRunCount = 3;
      let course = generateCourseFromExisting(courseToClone, courseRunCount);
      course.runs.forEach(run => {
        run.status = STATUS_NOT_PASSED;
      });

      const wrapper = renderRow({
        course: course
      });
      assert.lengthOf(
        wrapper.find('.course-container .course-sub-row'),
        courseRunCount,
        `Should have ${courseRunCount - 1} subrows for past runs & 1 subrow indicating future run status`
      );
    });

    it('shows a subrow when a course was failed with no past runs and no available future runs', () => {
      let pastCourseRunCount = 1;
      let course = generateCourseFromExisting(courseToClone, pastCourseRunCount);
      course.runs[0].status = STATUS_NOT_PASSED;

      const wrapper = renderRow({
        course: course
      });
      assert.lengthOf(wrapper.find('.course-container .course-sub-row'), 1);
    });

    it('shows a subrow when a course was failed and a future run is available', () => {
      let pastCourseRunCount = 1;
      let course = generateCourseFromExisting(courseToClone, pastCourseRunCount);
      let offeredCourseRun = _.cloneDeep(course.runs[0]);
      course.runs[0].status = STATUS_NOT_PASSED;
      offeredCourseRun.status = STATUS_OFFERED;
      course.runs.push(offeredCourseRun);

      const wrapper = renderRow({
        course: course
      });
      assert.lengthOf(wrapper.find('.course-container .course-sub-row'), 1);
    });
  });

  it('passes the correct prop value based on the course having a contact email', () => {
    for (let hasContactEmail of [true, false]) {
      let course = makeCourse();
      course.has_contact_email = hasContactEmail;

      const wrapper = shallow(
        <CourseRow
          {...defaultCourseRowProps()}
          course={course}
        />
      );
      assert.equal(wrapper.find('CourseDescription').props().hasContactEmail, hasContactEmail);
    }
  });

  it('when enroll pay later selected', () => {
    let props = defaultCourseRowProps();
    let course = makeCourse();
    props.ui.showEnrollPayLaterSuccess = course.runs[0].course_id;
    const wrapper = shallow(
      <CourseRow
        {...props}
        course={course}
      />
    );
    assert.equal(
      wrapper.find('.enroll-pay-later-heading').text(),
      "You are now auditing this course"
    );
    assert.equal(
      wrapper.find('.enroll-pay-later-txt').text(),
      "But you still need to pay to get credit."
    );
  });
});
