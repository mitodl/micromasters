// @flow
import React from 'react';
import moment from 'moment';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_NOT_OFFERED,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  DASHBOARD_FORMAT,
} from '../../constants';

export default class CourseDescription extends React.Component {
  props: {
    course: Course,
    now: moment$Moment,
  };

  courseDate(label: string, date: Date): string {
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
      if (firstRun.end_date) {
        let courseEndDate = moment(firstRun.end_date);
        text = this.courseDate('Ended', courseEndDate);
      }
      break;
    case STATUS_NOT_OFFERED:
      if (firstRun.status === STATUS_NOT_PASSED && firstRun.end_date) {
       let courseEndDate = moment(firstRun.end_date);
        if (courseEndDate.isAfter(now, 'day')) {
          text = this.courseDate('Ended', courseEndDate);
        }
      } else if (!_.isNil(firstRun.fuzzy_start_date)) {
        text = `Comming ${firstRun.fuzzy_start_date}`;
      }
      break;
    case STATUS_ENROLLED_NOT_VERIFIED:
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        text = this.courseDate('Start date', courseStartDate);
      }
      break;
    case STATUS_VERIFIED_NOT_COMPLETED:
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        text = this.courseDate('Start date', courseStartDate);
      }
      break;
    }

    return text;
  }

  render() {
    const { course, now } = this.props;
    let enrolled = "";
    let firstRun: CourseRun = {};

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    return <div className="course-description">
      <span className="course-description-title">
        {course.title}
      </span> <span className="course-description-enrolled">
        {enrolled}
      </span><br />
      <span className="course-description-result">
        {this.courseDateMessage(course.status, firstRun)}
      </span>
    </div>;
  }
}
