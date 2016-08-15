// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import {
  DASHBOARD_RESPONSE,
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED_NOT_ENROLLED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_NOT_OFFERED,
  ALL_COURSE_STATUSES,
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CourseGrade', () => {
  const now = moment();

  it('shows a grade for a passed or failed course if grade is present', () => {
    let course = findCourse(course => course.status === STATUS_PASSED);
    const wrapper = shallow(<CourseDescription course={course} now={now}/>);
    assert(course.title.length > 0);
    assert.equal(wrapper.find(".material-icon").text(), 'done');
  });

  it('shows nothing if no grade is present, no matter what the course status is', () => {

  });

  it('shows current grade for a verified or enrolled course', () => {

  });

  it('shows nothing for not offered or offered but not enrolled courses', () => {

  });
});
