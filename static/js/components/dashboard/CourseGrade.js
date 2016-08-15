// @flow
import React from 'react';

import type { Course } from '../../flow/programTypes';
import { asPercent } from '../../util/util';
import {
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
} from '../../constants';

export default class CourseGrade extends React.Component {
  props: {
    course: Course,
    now: moment$Moment,
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
      switch (course.status) {
      case STATUS_PASSED:
        percent = asPercent(firstRun.grade);
        description = 'Grade';
        break;
      case STATUS_ENROLLED_NOT_VERIFIED:
      case STATUS_VERIFIED_NOT_COMPLETED:
        percent = asPercent(firstRun.grade);
        description = 'Current grade';
        break;
      }
    }

    return <div className="course-grade">
      <span className="course-grade-percent">{percent}</span>
      <span className="course-grade-description">{description}</span>
    </div>;
  }
}
