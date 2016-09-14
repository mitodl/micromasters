// @flow
import React from 'react';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import IconButton from 'react-mdl/lib/IconButton';

import type {
  Course,
  CourseRun
} from '../../flow/programTypes';
import {
  STATUS_ENROLLED,
  STATUS_OFFERED,
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course
  };

  renderTooltip(text: string): React$Element<*>|void {
    return (
      <div>
        <span className="tooltip-link"
          data-tip
          data-for='course-detail'>
          <IconButton name="help" className="help"/>
        </span>
        <ReactTooltip id="course-detail" effect="solid"
          event="click" globalEventOff="click" className="tooltip">
          {text}
        </ReactTooltip>
      </div>
    );
  }

  courseTooltipText(courseStatus: string): string {
    if (courseStatus === STATUS_ENROLLED) {
      return "You need to enroll in the Verified Course to get MicroMasters credit.";
    }
    return '';
  }

  coursePrice(firstRun: CourseRun, courseStatus: string): string {
    let courseHasPrice = (
      !_.isNil(firstRun.price) &&
      (courseStatus === STATUS_OFFERED || courseStatus === STATUS_ENROLLED)
    );

    if (courseHasPrice) {
      return formatPrice(firstRun.price);
    }

    return '';
  }

  render() {
    const { course } = this.props;
    let firstRun = {};
    let priceDisplay;
    let tooltipDisplay;
    const text = this.courseTooltipText(course.status);

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }
    const price = this.coursePrice(firstRun, course.status);

    if (price) {
      priceDisplay = <span className="course-price-display">{price}</span>;
    }

    if (text) {
      tooltipDisplay = this.renderTooltip(text);
    }

    return (
      <div className="course-price">
        {priceDisplay} {tooltipDisplay}
      </div>
    );
  }
}
