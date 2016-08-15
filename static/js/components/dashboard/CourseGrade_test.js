// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import _ from 'lodash';

import CourseGrade from './CourseGrade';
import {
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  ALL_COURSE_STATUSES,
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CourseGrade', () => {
  const now = moment();

  it('shows a grade for a passed course if grade is present', () => {
    let course = findCourse(course => course.status === STATUS_PASSED);
    assert(course.runs[0].grade.length > 0);
    const wrapper = shallow(<CourseGrade course={course} now={now}/>);
    assert.equal(wrapper.find(".course-grade-percent").text(), "88%");
    assert.equal(wrapper.find(".course-grade-description").text(), "Grade");
  });

  it('shows nothing if no grade is present, no matter what the course status is', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => course.status === status);
      course = _.cloneDeep(course);
      if (course.runs.length > 0) {
        course.runs[0].grade = undefined;
      }

      const wrapper = shallow(<CourseGrade course={course} now={now}/>);
      assert.equal(wrapper.find(".course-grade-percent").text(), "");
      assert.equal(wrapper.find(".course-grade-description").text(), "");
    }
  });

  it('shows current grade for a verified or enrolled course', () => {
    for (let status of [STATUS_ENROLLED_NOT_VERIFIED, STATUS_VERIFIED_NOT_COMPLETED]) {
      let course = findCourse(course => course.status === status && course.runs.length > 0);
      course = _.cloneDeep(course);
      course.runs[0].grade = 0.4567;
      const wrapper = shallow(<CourseGrade course={course} now={now}/>);
      assert.equal(wrapper.find(".course-grade-percent").text(), "46%");
      assert.equal(wrapper.find(".course-grade-description").text(), "Current grade");
    }
  });
});
