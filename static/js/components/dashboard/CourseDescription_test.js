// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import _ from 'lodash';

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
  let getElements = (renderedComponent) => {
    let title = renderedComponent.find(".course-title");
    let titleLink = title.find("a");
    let details = renderedComponent.find(".details");
    return {
      titleText: title.text(),
      titleLink: titleLink,
      detailsText: details.text()
    };
  };

  it('shows the course title', () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      const wrapper = shallow(<CourseDescription course={course}/>);
      let elements = getElements(wrapper);

      assert.include(elements.titleText, course.title);
    }
  });

  it('shows a link to view the course on edX if a user has ever enrolled', () => {
    let edxLinkingStatuses = _.filter(ALL_COURSE_STATUSES, (s) => (s !== STATUS_OFFERED));
    for (let status of edxLinkingStatuses) {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      const wrapper = shallow(<CourseDescription course={course}/>);
      let elements = getElements(wrapper);

      assert.isAbove(elements.titleLink.length, 0);
      assert.equal(elements.titleLink.text(), 'View on edX');
      assert.isAbove(elements.titleLink.props().href.length, 0);
    }
  });

  it('does show date with status passed', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PASSED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.include(elements.detailsText, `Ended: ${formattedDate}`);
  });

  it('does show date with status not-passed', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_NOT_PASSED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);
    let firstRun = course.runs[0];
    let courseEndDate = moment(firstRun.course_end_date);
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT);

    assert.equal(elements.detailsText, `Ended: ${formattedDate}`);
  });

  it('does not show anything when there are no runs for a course', () => {
    let course = findCourse(course => course.runs.length === 0);
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);

    assert.equal(elements.detailsText, 'No future courses are currently scheduled.');
  });

  it('does show date with status verified', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(elements.detailsText, `Start date: ${formattedDate}`);
  });

  it('does show date with status enrolled', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.include(elements.detailsText, `Start date: ${formattedDate}`);
  });

  it('does show date with status offered', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);
    let firstRun = course.runs[0];
    let courseStartDate = moment(firstRun.course_start_date);
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);

    assert.equal(elements.detailsText, `Start date: ${formattedDate}`);
  });

  it('shows a message when the user is auditing the course', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    const wrapper = shallow(<CourseDescription course={course} />);
    let elements = getElements(wrapper);

    assert.include(elements.detailsText, 'You are Auditing this Course');
  });
});
