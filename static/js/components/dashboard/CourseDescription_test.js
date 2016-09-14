// @flow
import React from 'react';
import _ from 'lodash';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import type {
  Course,
  Program
} from '../../flow/programTypes';

import CourseDescription from './CourseDescription';
import {
  DASHBOARD_RESPONSE,
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED,
  STATUS_VERIFIED,
  STATUS_OFFERED,
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
  let createCourseRun = (status: string) => {
    return Object.assign({
      "position": 1,
      "title": "title",
      "course_id": "course-v1:odl+GIO101+FALL14",
      "status": status,
      "id": 1,
      "fuzzy_start_date": "Fall 2017",
      "course_start_date": '2016-01-09T10:20:10Z',
      "course_end_date": '2016-03-01T10:20:10Z'
    });
  };

  it('shows the course title', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => course.status === status);
      const wrapper = shallow(<CourseDescription course={course}/>);

      assert(course.title.length > 0);
      assert.equal(wrapper.find(".course-description-title").text(), course.title);
    }
  });

  it(`does show date with status passed`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_PASSED));
    course.runs = [ createCourseRun(STATUS_PASSED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
  });

  it(`does show date with status not-offered and firstRun status not-passed`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_NOT_OFFERED));
    course.runs = [ createCourseRun(STATUS_NOT_PASSED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
  });

  it(`does show date with status not-offered and firstRun status not-offered`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_NOT_OFFERED));
    course.runs = [ createCourseRun(STATUS_NOT_OFFERED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];

    assert.equal(wrapper.find(".course-description-result").text(), `Coming ${firstRun.fuzzy_start_date}`);
  });

  it(`does show date with status verified-not-completed`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_VERIFIED));
    course.runs = [ createCourseRun(STATUS_VERIFIED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });

  it(`does show date with status enrolled-not-verified`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_ENROLLED));
    course.runs = [ createCourseRun(STATUS_ENROLLED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });

  it(`does show date with status offered-not-enrolled`, () => {
    let course = _.cloneDeep(findCourse(course => course.status === STATUS_OFFERED));
    course.runs = [ createCourseRun(STATUS_OFFERED) ];
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });
});
