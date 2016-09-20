// @flow
import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED,
  STATUS_VERIFIED,
  STATUS_OFFERED,
  DASHBOARD_FORMAT,
} from '../../constants';

export default class CourseDescription extends React.Component {
  props: {
    course: Course
  };

  courseDate(label: string, date: moment$Moment): string {
    let formattedDate = date.format(DASHBOARD_FORMAT);
    return `${label}: ${formattedDate}`;
  }

  courseDateMessage = (firstRun: CourseRun): any => {
    switch (firstRun.status) {
    case STATUS_PASSED:
      if (firstRun.course_end_date) {
        let courseEndDate = moment(firstRun.course_end_date);
        return this.courseDate('Ended', courseEndDate);
      }
      break;
    case STATUS_NOT_PASSED:
      if (firstRun.course_end_date) {
        let courseEndDate = moment(firstRun.course_end_date);
        return this.courseDate('Ended', courseEndDate);
      } else if (!_.isNil(firstRun.fuzzy_start_date)) {
        return `Coming ${firstRun.fuzzy_start_date}`;
      }
      break;
    case STATUS_ENROLLED:
    case STATUS_VERIFIED:
    case STATUS_OFFERED:
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        return this.courseDate('Start date', courseStartDate);
      }
      break;
    default:
      // no runs in this course
      return <span className="no-runs">Coming soon...</span>;
    }

    return '';
  };

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    return <div className="course-description">
      <span className="course-description-title">
        {course.title}
      </span> <br />
      <span className="course-description-result">
        {this.courseDateMessage(firstRun)}
      </span>
    </div>;
  }
}
