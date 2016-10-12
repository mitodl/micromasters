// @flow
import React from 'react';
import _ from 'lodash';

import type { Course } from '../../flow/programTypes';

export default class CourseGrade extends React.Component {
  props: {
    course: Course
  };

  render() {
    const { course } = this.props;

    let firstRun, grade, caption;
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
      if (!_.isNil(firstRun.final_grade)) {
        grade = firstRun.final_grade;
        caption = 'Final grade';
      } else if (!_.isNil(firstRun.current_grade)) {
        grade = firstRun.current_grade;
        caption = 'Current grade';
      }
    }

    if (grade && caption) {
      return <div className="course-grade">
        <div className="number">{grade}%</div>
        <div className="caption">{caption}</div>
      </div>;
    } else {
      return null;
    }
  }
}
