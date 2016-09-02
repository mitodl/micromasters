// @flow
import React from 'react';
import _ from 'lodash';

import type { Course } from '../../flow/programTypes';
import {
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course,
  };

  render() {
    const { course } = this.props;
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
      {price}
    </div>;
  }
}
