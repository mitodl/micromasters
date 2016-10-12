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
  STATUS_WILL_ATTEND,
  DASHBOARD_FORMAT,
} from '../../constants';

const edxLinkBase = `${SETTINGS.edx_base_url}/courses/`;

export default class CourseDescription extends React.Component {
  props: {
    course: Course
  };

  needsEdxLink(run: CourseRun): boolean {
    // Any status besides 'offered' implies that the user has at some point enrolled 
    return run.status && run.status !== STATUS_OFFERED;
  }

  renderCourseDateMessage(label: string, dateString: string): React$Element<*> {
    let formattedDate = moment(dateString).format(DASHBOARD_FORMAT);
    return <span key='1'>{label}: {formattedDate}</span>;
  }

  renderDetailContents(run: CourseRun) {
    let dateMessage, additionalDetail;

    switch (run.status) {
    case STATUS_PASSED:
    case STATUS_NOT_PASSED:
      dateMessage = this.renderCourseDateMessage('Ended', run.course_end_date);
      break;
    case STATUS_CAN_UPGRADE:
    case STATUS_CURRENTLY_ENROLLED:
    case STATUS_WILL_ATTEND:
    case STATUS_OFFERED:
      if (run.course_start_date) {
        dateMessage = this.renderCourseDateMessage('Start date', run.course_start_date);
      } else if (!_.isNil(run.fuzzy_start_date)) {
        dateMessage = <span key='1'>Coming {run.fuzzy_start_date}</span>;
      }
      break;
    }

    if (run.status === STATUS_CAN_UPGRADE) {
      additionalDetail = <span key='2'>You are Auditing this Course.</span>;
    }

    return _.compact([dateMessage, additionalDetail]);
  }

  renderViewCourseLink = (courseRun: CourseRun): React$Element<*>|void => (
    <a href={`${edxLinkBase}${courseRun.course_id}`} target="_blank">
      View on edX
    </a>
  );

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};

    let detailContents;
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
      detailContents = this.renderDetailContents(firstRun);
    } else {
      detailContents = <span className="no-runs">No future courses are currently scheduled.</span>;
    }

    let title = course.title;
    if(this.needsEdxLink(firstRun)) {
      title = <span>{course.title} - {this.renderViewCourseLink(firstRun)}</span>;
    } else {
      title = <span>{course.title}</span>;
    }

    return <div className="course-description">
      <div className="course-title">
        {title}
      </div>
      <div className="details">
        {detailContents}
      </div>
    </div>;
  }
}
