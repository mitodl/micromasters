/* global SETTINGS: false */
// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import moment from 'moment';
import urljoin from 'url-join';

import { Course } from '../../flow/programTypes';
import {
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
  DASHBOARD_FORMAT,
} from '../../constants';

export default class CourseAction extends React.Component {
  props: {
    course: Course,
    now: Object,
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
    case STATUS_ENROLLED_NOT_VERIFIED: {
      let courseUpgradeUrl = urljoin(SETTINGS.edx_base_url, '/course_modes/choose/', firstRun.course_id);
      action = <span>
        <Button
          className="mm-button-action dashboard-button"
          href={courseUpgradeUrl}
          target="_blank">
          Upgrade
        </Button>
        <span className="sr-only"> for {firstRun.title}</span>
      </span>;
      break;
    }
    case STATUS_OFFERED_NOT_ENROLLED: {
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

      let linkProps;
      if (!disabled) {
        let courseInfoUrl = urljoin(SETTINGS.edx_base_url, '/courses/', firstRun.course_id, 'about');
        linkProps = {
          target: "_blank",
          href: courseInfoUrl,
        };
      }
      action = <span>
        <Button
          className="mm-button-action dashboard-button"
          disabled={disabled}
          {...linkProps}
        >
          Enroll
        </Button>
        <span className="sr-only"> in {firstRun.title}</span>
      </span>;
      break;
    }
    }

    return <div className="course-action">
      <span className="course-action-action">{action}</span>
      <span className="course-action-description">{description}</span>
    </div>;
  }
}
