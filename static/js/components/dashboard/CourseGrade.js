// @flow
import React from 'react';

import { Course } from '../../flow/programTypes';
import { asPercent } from '../../util/util';
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
} from '../../constants';

export default class CourseGrade extends React.Component {
  props: {
    course: Course,
    now: Object,
  };

  render() {
    const { course } = this.props;
    let firstRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    let percent = null;
    let description = null;

    if (firstRun.grade !== undefined) {
      if (course.status === STATUS_PASSED || course.status === STATUS_NOT_PASSED) {
        percent = asPercent(firstRun.grade);
        description = 'Grade';
      } else if (course.status === STATUS_ENROLLED_NOT_VERIFIED || course.status === STATUS_VERIFIED_NOT_COMPLETED) {
        percent = asPercent(firstRun.grade);
        description = 'Current grade';
      }
    }

    return <div className="course-grade">
      <span className="course-grade-percent">{percent}</span>
      <span className="course-grade-description">{description}</span>
    </div>;
  }
}
