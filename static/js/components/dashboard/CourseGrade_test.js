// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import _ from 'lodash';

import { EDX_LINK_BASE } from '../../constants';
import CourseGrade from './CourseGrade';

import { findAndCloneCourse } from '../../util/test_utils';

describe('CourseGrade', () => {
  let gradeTypes = {
    current_grade: "Course Progress",
    final_grade: "Final grade"
  };

  _.forEach(gradeTypes, function(expectedLabel: string, gradeKey: string) {
    it(`shows the ${expectedLabel} for a course`, () => {
      let course = findAndCloneCourse(course => course.runs.length > 0);
      let grade = '50';
      let progressUrl = `${EDX_LINK_BASE}${course.runs[0].course_id}/progress`;
      course.runs[0][gradeKey] = grade;

      const wrapper = shallow(<CourseGrade courseRun={course.runs[0]} />);
      let gradeView = wrapper.find(".course-grade .number").childAt(0);
      assert.equal(gradeView.props().href, progressUrl);
      assert.equal(gradeView.props().target, "_blank");
      assert.equal(gradeView.text(), `${grade}%`);
      assert.equal(wrapper.find(".course-grade .caption").text(), expectedLabel);
    });
  });
});
