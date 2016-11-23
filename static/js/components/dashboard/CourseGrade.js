/* global SETTINGS: false */
// @flow
import React from 'react';
import _ from 'lodash';

import type { CourseRun } from '../../flow/programTypes';
import { formatGrade } from './util';
import { EDX_LINK_BASE } from '../../constants';

export default class CourseGrade extends React.Component {
  props: {
    courseRun: CourseRun
  };

  renderCourseProgressLink = (courseRun: CourseRun, grade: number|string|null): React$Element<*>|null => (
    <a href={`${EDX_LINK_BASE}${courseRun.course_id}/progress`} target="_blank">
      {formatGrade(grade)}
    </a>
  );

  render() {
    const { courseRun } = this.props;

    let grade, caption;
    if (!_.isNil(courseRun.final_grade)) {
      grade = courseRun.final_grade;
      caption = 'Final grade';
    } else if (!_.isNil(courseRun.current_grade)) {
      grade = courseRun.current_grade;
      caption = 'Course Progress';
    }

    if (grade && caption) {
      return <div className="course-grade">
        <div className="number">{this.renderCourseProgressLink(courseRun, grade)}</div>
        <div className="caption">{caption}</div>
      </div>;
    } else {
      return null;
    }
  }
}
