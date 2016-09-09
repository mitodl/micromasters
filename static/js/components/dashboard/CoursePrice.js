// @flow
import React from 'react';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import IconButton from 'react-mdl/lib/IconButton';
import moment from 'moment';

import type { Course, CourseRun } from '../../flow/programTypes';
import {
  STATUS_NOT_OFFERED,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_OFFERED_NOT_ENROLLED,
  DASHBOARD_FORMAT,
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course,
    now: moment$Moment,
  };

  renderTooltip(course: Course, now: moment$Moment, firstRun: CourseRun): React$Element<*>|void {
    let text = "";
    let tooltip;

    switch (course.status) {
    case STATUS_PASSED:
      text = "Complete!";
      break;
    case STATUS_ENROLLED_NOT_VERIFIED:
      text = "You need to upgrade to the Verified course to get MicroMasters credit";
      break;
    case STATUS_NOT_OFFERED:
      if (firstRun.status === STATUS_NOT_PASSED) {
        text = 'You failed this course';
      }
      break;
    case STATUS_VERIFIED_NOT_COMPLETED:
      if (firstRun.course_start_date) {
        let courseStartDate = moment(firstRun.course_start_date);
        if (courseStartDate.isAfter(now, 'day')) {
          let formattedDate = courseStartDate.format(DASHBOARD_FORMAT);
          text = `Begins ${formattedDate}`;
        }
      }
      break;
    }

    if (text) {
      tooltip = (
        <div>
          <span className="tooltip-link"
            data-tip
            data-for='course-detail'>
            <IconButton name="help" className="help"/>
          </span>
          <ReactTooltip id="course-detail" effect="solid" event="click" globalEventOff="click">
            {text}
          </ReactTooltip>
        </div>
      );
    }

    return tooltip;
  }

  render() {
    const { course, now } = this.props;
    let firstRun = {};
    let price = null;

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
      if (course.status === STATUS_OFFERED_NOT_ENROLLED || course.status === STATUS_ENROLLED_NOT_VERIFIED) {
        if (!_.isNil(firstRun.price)) {
          price = <span className="course-price-display">{formatPrice(firstRun.price)}</span>;
        }
      }
    }

    return <div className="course-price">
      {price} {this.renderTooltip(course, now, firstRun)}
    </div>;
  }
}
