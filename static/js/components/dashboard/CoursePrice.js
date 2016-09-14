// @flow
import React from 'react';
import _ from 'lodash';

import type {
  Course,
  CourseRun
} from '../../flow/programTypes';
import {
  STATUS_ENROLLED,
  STATUS_OFFERED,
} from '../../constants';
import { formatPrice } from '../../util/util';
import { courseListToolTip } from './util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course
  };

  coursePrice(firstRun: CourseRun): string {
    let courseHasPrice = (
      !_.isNil(firstRun.price) &&
      (firstRun.status === STATUS_OFFERED || firstRun.status === STATUS_ENROLLED)
    );

    if (courseHasPrice) {
      return formatPrice(firstRun.price);
    }

    return '';
  }

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};
    let priceDisplay;
    let tooltipDisplay;

    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }
    const price = this.coursePrice(firstRun);

    if (price) {
      priceDisplay = <span className="course-price-display">{price}</span>;
    }

    if (firstRun.status === STATUS_ENROLLED) {
      tooltipDisplay = courseListToolTip(
        "You need to enroll in the Verified Course to get MicroMasters credit.",
        'course-detail',
      );
    }

    return (
      <div className="course-price">
        {priceDisplay} {tooltipDisplay}
      </div>
    );
  }
}
