// @flow
import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_NOT_OFFERED,
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

  courseDateMessage(courseStatus: string, firstRun: CourseRun): string {
    if (!firstRun) {
      return '';
    }

    let text = "";

    switch (courseStatus) {
    case STATUS_PASSED:
      if (firstRun.course_end_date) {
        let courseEndDate = moment(firstRun.course_end_date);
        text = this.courseDate('Ended', courseEndDate);
      }
      break;
    case STATUS_NOT_OFFERED:
      if (firstRun.status === STATUS_NOT_PASSED && firstRun.course_end_date) {
        let courseEndDate = moment(firstRun.course_end_date);
        text = this.courseDate('Ended', courseEndDate);
      } else if (!_.isNil(firstRun.fuzzy_start_date)) {
        text = `Coming ${firstRun.fuzzy_start_date}`;
      }
      break;
    case STATUS_ENROLLED:
    case STATUS_VERIFIED:
    case STATUS_OFFERED:
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        text = this.courseDate('Start date', courseStartDate);
      }
      break;
    }

    return text;
  }

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
        {this.courseDateMessage(course.status, firstRun)}
      </span>
    </div>;
  }
}
