// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CoursePrice from './CoursePrice';
import {
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_OFFERED_NOT_ENROLLED
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CoursePrice', () => {
  it('shows price of course with status offered-not-enrolled', () => {
    let course = findCourse(course => course.status === STATUS_OFFERED_NOT_ENROLLED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
    assert.equal(wrapper.find(".course-enrollment-description").text(), "Enrollment open");
  });

  it('shows price of course with status enrolled-not-verified', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED_NOT_VERIFIED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
    assert.isNaN(wrapper.find(".course-enrollment-description"));
  });

  it('shows price of course with status passed', () => {
    let course = findCourse(course => course.status === STATUS_PASSED);
    assert.isNotOk(course.runs[0].price);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.isNaN(wrapper.find(".course-price-display"));
    assert.isNaN(wrapper.find(".course-enrollment-description"));
  });

  it('shows price of course with status verified-not-completed', () => {
    let course = findCourse(course => course.status === STATUS_VERIFIED_NOT_COMPLETED);
    assert.isNotOk(course.runs[0].price);

    const wrapper = shallow(<CoursePrice course={course}/>);
    assert.isNaN(wrapper.find(".course-price-display"));
    assert.isNaN(wrapper.find(".course-enrollment-description"));
  });
});
