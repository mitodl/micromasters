/* global SETTINGS: false */
// @flow
import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
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
    case STATUS_CAN_UPGRADE:
    case STATUS_CURRENTLY_ENROLLED:
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

  renderViewCourseLink = (courseRun: CourseRun): React$Element<*>|void => {
    let edxLink = `${SETTINGS.edx_base_url}/courses/${courseRun.course_id}`;

    switch (courseRun.status) {
    case STATUS_PASSED:
    case STATUS_NOT_PASSED:
    case STATUS_CAN_UPGRADE:
    case STATUS_CURRENTLY_ENROLLED:
      return (
        <span>
          <a href={edxLink} target="_blank" className="mm-minor-action link-view-on-edx">
            - View on edX
          </a>
        </span>
      );
    }
  }

  renderCourseTitle = (title: string): React$Element<*> => (
    <span className="course-description-title">
      {title}
    </span>
  );

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    return <div className="course-description">
      {this.renderCourseTitle(course.title)} {this.renderViewCourseLink(firstRun)}
      <br />
      <span className="course-description-result">
        {this.courseDateMessage(firstRun)}
      </span>
    </div>;
  }
}
