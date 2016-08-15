// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import type { Course, Program } from '../../flow/programTypes';

import CourseDescription from './CourseDescription';
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
  const now = moment();

  it('shows the course title', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => course.status === status);
      const wrapper = shallow(<CourseDescription course={course} now={now}/>);
      assert(course.title.length > 0);
      assert.equal(wrapper.find(".course-description-title").text(), course.title);
    }
  });

  it('shows (enrolled) only for enrolled courses', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let enrolledCourse = findCourse(course => course.status === status);
      const wrapper = shallow(<CourseDescription course={enrolledCourse} now={now} />);
      let text = wrapper.find(".course-description-enrolled").text();
      if (status === STATUS_ENROLLED_NOT_VERIFIED) {
        assert.equal(text, "(enrolled)");
      } else {
        assert.equal(text, "");
      }
    }
  });

  it('shows failure text for failed courses', () => {
    let failedCourse = findCourse(course => (
      course.status === STATUS_NOT_OFFERED &&
      course.runs[0].status === STATUS_NOT_PASSED
    ));
    const wrapper = shallow(<CourseDescription course={failedCourse} now={now} />);
    assert.equal(wrapper.find(".course-description-result").text(), "You failed this course");
  });

  it('shows upgrade instructions for enrolled but not verified courses', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED_NOT_VERIFIED);
    const wrapper = shallow(<CourseDescription course={course} now={now} />);
    assert.equal(
      wrapper.find(".course-description-result").text(),
      "You need to upgrade to the Verified course to get MicroMasters credit<IconButton />"
    );
  });

  it('shows Complete for passed courses', () => {
    let course = findCourse(course => course.status === STATUS_PASSED);
    const wrapper = shallow(<CourseDescription course={course} now={now} />);
    assert.equal(wrapper.find(".course-description-result").text(), "Complete!");
  });

  it('shows nothing for offered courses', () => {
    let course = findCourse(course => course.status === STATUS_OFFERED_NOT_ENROLLED);
    const wrapper = shallow(<CourseDescription course={course} now={now}/>);
    assert.equal(wrapper.find(".course-description-result").text(), "");
  });

  it('shows Begins ... for verified courses when course start date is in future', () => {
    let course = findCourse(course => course.status === STATUS_VERIFIED_NOT_COMPLETED);
    let courseStart = moment(course.runs[0].course_start_date);
    let yesterday = moment(courseStart).add(-1, 'days');
    const wrapper = shallow(<CourseDescription course={course} now={yesterday}/>);
    let formattedDate = courseStart.format(DASHBOARD_FORMAT);
    assert.equal(wrapper.find(".course-description-result").text(), `Begins ${formattedDate}`);
  });

  it('shows nothing for verified courses when course start date is today or passed', () => {
    let course = findCourse(course => course.status === STATUS_VERIFIED_NOT_COMPLETED);
    let courseStart = moment(course.runs[0].course_start_date);
    let tomorrow = moment(courseStart).add(1, 'days');

    // course starts today
    let wrapper = shallow(<CourseDescription course={course} now={courseStart}/>);
    assert.equal(wrapper.find(".course-description-result").text(), "");

    // course started yesterday
    wrapper = shallow(<CourseDescription course={course} now={tomorrow} />);
    assert.equal(wrapper.find(".course-description-result").text(), "");
  });
});
