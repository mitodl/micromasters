// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseDescription from './CourseDescription';
import { findCourse } from '../../util/test_utils';
import {
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_OFFERED,
  ALL_COURSE_STATUSES,
} from '../../constants';

describe('CourseDescription', () => {
  it('shows the course title', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      const wrapper = shallow(<CourseDescription course={course}/>);

      assert(course.title.length > 0);
      assert.equal(wrapper.find(".course-description-title").text(), course.title);
    }
  });

  for (let status of ALL_COURSE_STATUSES) {
    it('shows the view on edX link if appropriate', () => {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      const wrapper = shallow(<CourseDescription course={course}/>);
      switch (status) {
      case STATUS_PASSED:
      case STATUS_NOT_PASSED:
      case STATUS_CAN_UPGRADE:
      case STATUS_CURRENTLY_ENROLLED:
        assert.equal(wrapper.find(".link-view-on-edx").text(), '- View on edX');
        break;
      default:
        assert.equal(wrapper.find(".link-view-on-edx").length, 0);
      }
    });
  }

  it(`does show date with status passed`, () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PASSED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
  });

  it(`does show date with status not-passed`, () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_NOT_PASSED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Ended: ${formattedDate}`);
  });

  it(`does not show anything when there are no runs for a course`, () => {
    let course = findCourse(course => (
      course.runs.length === 0
    ));
    const wrapper = shallow(<CourseDescription course={course} />);

    assert.equal(wrapper.find(".course-description-result").text(), 'Coming soon...');
  });

  it(`does show date with status verified`, () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });

  it(`does show date with status enrolled`, () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });

  it(`does show date with status offered`, () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(wrapper.find(".course-description-result").text(), `Start date: ${formattedDate}`);
  });
});
