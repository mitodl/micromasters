// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import ProgressWidget from './ProgressWidget';
import type {
  Course,
  Program
} from '../flow/programTypes';
import {
  DASHBOARD_RESPONSE,
  STATUS_PASSED
} from '../constants';

export function findProgram(courseSelector: (course: Course, program: Program) => boolean): Course {
  for (let program of DASHBOARD_RESPONSE) {
    for (let course of program.courses) {
      if (courseSelector(course, program)) {
        return program;
      }
    }
  }
  throw "Unable to find program with given query";
}

describe('ProgressWidget', () => {
  it('progress widget display', () => {
    let program = findProgram(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_PASSED
    ));
    const wrapper = shallow(<ProgressWidget program={program}/>);
    const totalCourses = program.courses.length;
    const passedCourses = program.courses.filter(
      course => course.runs.length > 0 && course.runs[0].status === STATUS_PASSED
    );
    const totalPassedCourses = passedCourses.length;

    assert.equal(wrapper.find(".progress-title").children().text(), "Progress");
    assert.equal(wrapper.find(".text-course-complete").children().text(), "Courses complete");
    assert.equal(
      wrapper.find(".circular-progress-widget-txt").text(),
      `${totalPassedCourses}/${totalCourses}`
    );
    assert.equal(
      wrapper.find(".heading-paragraph").text(),
      "On completion, you can apply for the Masters Degree Program"
    );
    assert.isTrue(wrapper.find(".progress-button").hasClass('disabled'), 'Button is disable');
  });
});
