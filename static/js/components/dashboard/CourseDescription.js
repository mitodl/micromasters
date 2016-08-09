// @flow
import React from 'react';
import moment from 'moment';
import IconButton from 'react-mdl/lib/IconButton';

import { Course, CourseRun } from '../../flow/programTypes';
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
    now: Object,
  };

  render() {
    const { course, now } = this.props;
    let text = "", enrolled = "";
    let firstRun: CourseRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    if (course.status === STATUS_PASSED) {
      text = "Complete!";
    } else if (course.status === STATUS_ENROLLED_NOT_VERIFIED) {
      text = <span>
        You need to upgrade to the Verified course to get MicroMasters credit
        <IconButton name="help" colored/>
      </span>;
      enrolled = "(enrolled)";
    } else if (course.status === STATUS_NOT_OFFERED) {
      if (firstRun.status === STATUS_NOT_PASSED) {
        text = 'You failed this course';
      }
    } else if (course.status === STATUS_VERIFIED_NOT_COMPLETED) {
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        if (courseStartDate.isAfter(now, 'day')) {
          let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);
          text = `Begins ${formattedDate}`;
        }
      }
    }

    return <div className="course-description">
      <span className="course-description-title">
        {course.title}
      </span> <span className="course-description-enrolled">
        {enrolled}
      </span><br />
      <span className="course-description-result">
        {text}
      </span>
    </div>;
  }
}
