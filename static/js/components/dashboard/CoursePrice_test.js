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
  STATUS_NOT_OFFERED
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CoursePrice', () => {
  it('shows price of course with status offered-not-enrolled', () => {
    let course = findCourse(course => course.status === STATUS_OFFERED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  it('shows price of course with status enrolled-not-verified', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}  />);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  for (let status of [STATUS_PASSED, STATUS_NOT_OFFERED, STATUS_VERIFIED]) {
    it(`doesn't show the price of course with status ${status}`, () => {
      let course = findCourse(course => course.status === status);
      assert.isNotOk(course.runs[0].price);

      const wrapper = shallow(<CoursePrice course={course} />);
      assert.equal(wrapper.find(".course-price-display").length, 0);
    });
  }

  it('tooltip display for status enrolled-not-verified', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED);
    const wrapper = shallow(<CoursePrice course={course} />);
    let tooltip = wrapper.find(".help");
    assert.equal(tooltip.length, 1);
  });

});
