// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CourseGrade from './CourseGrade';

import { findCourse, findAndCloneCourse } from '../../util/test_utils';

describe('CourseGrade', () => {
  it("doesn't show anything if there are no runs", () => {
    let course = findCourse(course => course.runs.length === 0);
    const wrapper = shallow(<CourseGrade course={course}/>);
    assert.equal(wrapper.text().trim(), "");
  });

  it("shows the percent grade for a currently-enrolled course", () => {
    let course = findAndCloneCourse(course => course.runs.length > 0);
    let grade = '50';
    course.runs[0].current_grade = grade;

    const wrapper = shallow(<CourseGrade course={course}/>);
    assert.equal(wrapper.find(".course-grade .number").text(), `${grade}%`);
    assert.equal(wrapper.find(".course-grade .caption").text(), 'Current grade');
  });
});
