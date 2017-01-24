import React from 'react';
import { shallow, mount } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

import { makeDashboard } from '../../factories/dashboard';
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

describe('CourseRow', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderRow = (props = {}, isShallow = false) => {
    let render = isShallow ? shallow : mount;
    let prices = new Map([[345, 456]]);
    return render(
      <CourseRow
        hasFinancialAid={true}
        financialAid={FINANCIAL_AID_PARTIAL_RESPONSE}
        prices={prices}
        openFinancialAidCalculator={sandbox.stub()}
        now={moment()}
        checkout={sandbox.stub()}
        addCourseEnrollment={sandbox.stub()}
        course={null}
        {...props}
      />
    );
  };

  it('forwards the appropriate props', () => {
    const programs = makeDashboard();
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
    assert.deepEqual(wrapper.find(CourseDescription).props(), {
      courseRun,
      courseTitle,
    });
    assert.deepEqual(wrapper.find(CourseGrade).props(), {
      courseRun,
    });
    let subRowProps = wrapper.find("CourseSubRow").props();
    for (const key of keys) {
      assert.deepEqual(subRowProps[key], courseRowProps[key]);
    }
  });

  describe('with failed/missed-upgrade-deadline runs', () => {
    let courseToClone = DASHBOARD_RESPONSE[1].courses[0];

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
});
