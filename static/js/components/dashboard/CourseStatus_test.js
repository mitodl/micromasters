// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CourseStatus from './CourseStatus';

import { findCourse } from '../../util/test_utils';

describe('CourseStatus', () => {
  it("doesn't show anything if there are no runs", () => {
    let course = findCourse(course => course.runs.length === 0);
    const wrapper = shallow(<CourseStatus course={course}/>);
    assert.equal(wrapper.text().trim(), "");
  });
});
