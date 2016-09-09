// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import type {
  Course,
  CourseRun,
  Program
} from '../../flow/programTypes';

import CourseDescription from './CourseDescription';
import {
  DASHBOARD_RESPONSE,
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_NOT_OFFERED,
  ALL_COURSE_STATUSES,
} from '../../constants';


export function findCourse(courseSelector: (course: Course, program: Program) => boolean): Course {
  for (let program of DASHBOARD_RESPONSE) {
    for (let course of program.courses) {
      if (courseSelector(course, program)) {
        return course;
      }
    }
  }
  throw "Unable to find course";
}

describe('CourseDescription', () => {
  const statuses = [
    STATUS_PASSED,
    STATUS_NOT_OFFERED,
    STATUS_VERIFIED_NOT_COMPLETED,
    STATUS_ENROLLED_NOT_VERIFIED
  ];

  it('shows the course title', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => course.status === status);
      const wrapper = shallow(<CourseDescription course={course}/>);
      assert(course.title.length > 0);
      assert.equal(wrapper.find(".course-description-title").text(), course.title);
    }
  });

  for (let status of statuses) {
    it(`does show date with status ${status}`, () => {
      let course = findCourse(course => course.status === status);
      const wrapper = shallow(<CourseDescription course={course} />);
      let firstRun: CourseRun = {};

      if (course.runs.length > 0) {
        firstRun = course.runs[0];
      }

      switch (course.status) {
      case STATUS_PASSED:
        if (firstRun.course_end_date) {
          let courseEndDate = moment(firstRun.course_end_date);
          let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);
          assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
        }
        break;
      case STATUS_NOT_OFFERED:
        if (firstRun.status === STATUS_NOT_PASSED && firstRun.course_end_date) {
          let courseEndDate = moment(firstRun.course_end_date);
          let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);
          assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
        } else if (course.status === STATUS_NOT_OFFERED && firstRun && firstRun.status !== STATUS_NOT_PASSED) {
          assert.equal(wrapper.find(".course-description-result").text(), `Coming ${firstRun.fuzzy_start_date}`);
        }
        break;
      case STATUS_ENROLLED_NOT_VERIFIED:
      case STATUS_VERIFIED_NOT_COMPLETED:
        if (firstRun.course_start_date) {
          let courseStartDate = moment(firstRun.course_start_date);
          let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);
          assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
        }
        break;
      }
    });
  }
});
