// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import moment from 'moment';

import CoursePrice from './CoursePrice';
import {
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_OFFERED_NOT_ENROLLED,
  STATUS_NOT_OFFERED
} from '../../constants';

import { findCourse } from './CourseDescription_test';

describe('CoursePrice', () => {
  const now = moment();

  it('shows price of course with status offered-not-enrolled', () => {
    let course = findCourse(course => course.status === STATUS_OFFERED_NOT_ENROLLED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course} now={now} />);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  it('shows price of course with status enrolled-not-verified', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED_NOT_VERIFIED);
    assert.equal(course.runs[0].price, 50.00);

    const wrapper = shallow(<CoursePrice course={course} now={now} />);
    assert.equal(wrapper.find(".course-price-display").text(), "$50");
  });

  for (let status of [STATUS_PASSED, STATUS_NOT_OFFERED, STATUS_VERIFIED_NOT_COMPLETED]) {
    it(`doesn't show the price of course with status ${status}`, () => {
      let course = findCourse(course => course.status === status);
      assert.isNotOk(course.runs[0].price);

      const wrapper = shallow(<CoursePrice course={course} now={now} />);
      assert.equal(wrapper.find(".course-price-display").length, 0);
    });
  }
});
