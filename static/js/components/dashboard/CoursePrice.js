// @flow
import React from 'react';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import IconButton from 'react-mdl/lib/IconButton';

import type { Course } from '../../flow/programTypes';
import {
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CoursePrice extends React.Component {
  props: {
    course: Course
  };

  renderTooltip(course: Course): React$Element<*>|void {
    let text = "";
    let tooltip;

    if (course.status === STATUS_ENROLLED_NOT_VERIFIED) {
      text = "You need to enroll in the Verified Course to get MicroMasters credit.";
    }

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
      {price} {this.renderTooltip(course)}
    </div>;
  }
}
