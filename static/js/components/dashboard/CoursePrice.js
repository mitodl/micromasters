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
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course
  };

  renderTooltip(text: string): React$Element<*>|void {
    let tooltip;

    if (text) {
      tooltip = (
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

    return tooltip;
  }

  courseTooltipText(courseStatus: string): string {
    let text = "";

    if (courseStatus === STATUS_ENROLLED_NOT_VERIFIED) {
      text = "You need to enroll in the Verified Course to get MicroMasters credit.";
    }

    return text;
  }

  coursePrice(firstRun: CourseRun, courseStatus: string): string {
    let price = "";
    let courseHasPrice = (
      !_.isNil(firstRun.price) &&
      (courseStatus === STATUS_OFFERED_NOT_ENROLLED || courseStatus === STATUS_ENROLLED_NOT_VERIFIED)
    );

    if (courseHasPrice) {
      price = formatPrice(firstRun.price);
    }

    return price;
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
