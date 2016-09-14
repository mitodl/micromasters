/* global SETTINGS: false */
// @flow
import React from 'react';
import moment from 'moment';
import Button from 'react-mdl/lib/Button';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_PASSED,
  STATUS_ENROLLED,
  STATUS_OFFERED,
  DASHBOARD_FORMAT,
} from '../../constants';

export default class CourseAction extends React.Component {
  props: {
    checkout: Function,
    course: Course,
    now: moment$Moment,
  };

  makeEnrollButton = (text: string, run: CourseRun, disabled: boolean) => {
    const { checkout } = this.props;
    let buttonProps = {};

    if (!disabled) {
      buttonProps.onClick = () => {
        checkout(run.course_id);
      };
    } else {
      buttonProps.disabled = true;
    }

    return (
      <span>
        <Button className="dashboard-button" {...buttonProps}>
          {text}
        </Button>
        <span className="sr-only"> in {run.title}</span>
      </span>
    );
  };

  render() {
    const { course, now } = this.props;
    let firstRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    let action = "", description = "";

    switch (course.status) {
    case STATUS_PASSED:
      action = <i className="material-icons">done</i>;
      break;
    case STATUS_ENROLLED: {
      action = this.makeEnrollButton("Upgrade", firstRun, false);
      break;
    }
    case STATUS_OFFERED: {
      let disabled = false;
      if (!firstRun.enrollment_start_date && firstRun.fuzzy_enrollment_start_date) {
        disabled = true;
        description = `Enrollment begins ${firstRun.fuzzy_enrollment_start_date}`;
      } else if (firstRun.enrollment_start_date) {
        let enrollmentStartDate = moment(firstRun.enrollment_start_date);
        if (enrollmentStartDate.isAfter(now, 'day')) {
          disabled = true;
          let formattedDate = enrollmentStartDate.format(DASHBOARD_FORMAT);
          description = `Enrollment begins ${formattedDate}`;
        }
      }

      action = this.makeEnrollButton("Enroll", firstRun, disabled);
      break;
    }
    }

    return <div className="course-action">
      <span className="course-action-action">{action}</span>
      <span className="course-action-description">{description}</span>
    </div>;
  }
}
