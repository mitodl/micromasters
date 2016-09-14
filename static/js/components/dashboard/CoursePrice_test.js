// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CoursePrice from './CoursePrice';
import {
  STATUS_PASSED,
  STATUS_ENROLLED,
  STATUS_VERIFIED,
  STATUS_OFFERED,
  STATUS_NOT_PASSED,
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CoursePrice', () => {
  it('shows price of course with status offered', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  it('shows price of course with status enrolled', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_ENROLLED
    ));
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  for (let status of [STATUS_PASSED, STATUS_NOT_PASSED, STATUS_VERIFIED]) {
    it(`doesn't show the price of course with status ${status}`, () => {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      assert.isNotOk(course.runs[0].price);

      const wrapper = shallow(<CoursePrice course={course}/>);
      assert.equal(wrapper.find(".course-price-display").length, 0);
    });
  }

  it('shows the tooltip for status enrolled', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_ENROLLED
    ));
    const wrapper = shallow(<CoursePrice course={course}/>);
    let tooltip = wrapper.find(".help");
    assert.equal(tooltip.length, 1);
  });

  for (let status of [STATUS_OFFERED, STATUS_VERIFIED, STATUS_NOT_PASSED, STATUS_PASSED]) {
    it(`doesn't show any tooltip for status ${status}`, () => {
      let course = findCourse(course => (
        course.runs.length > 0 &&
        course.runs[0].status === status
      ));
      const wrapper = shallow(<CoursePrice course={course}/>);
      let tooltip = wrapper.find(".help");
      assert.equal(tooltip.length, 0);
    });
  }

  it("doesn't show anything if there are no runs", () => {
    let course = findCourse(course => course.runs.length === 0);
    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.text().trim(), "");
  });
});
