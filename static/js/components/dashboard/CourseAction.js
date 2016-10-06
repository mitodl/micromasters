/* global SETTINGS: false */
// @flow
import React from 'react';
import moment from 'moment';
import Button from 'react-mdl/lib/Button';

import type { Course, CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_OFFERED,
  DASHBOARD_FORMAT,
  FA_PENDING_STATUSES,
  FA_STATUS_SKIPPED
} from '../../constants';
import { formatPrice } from '../../util/util';

export default class CourseAction extends React.Component {
  props: {
    checkout: Function,
    course: Course,
    coursePrice: CoursePrice,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator?: () => void,
    now: moment$Moment,
  };

  getCoursePrice(): string {
    const { coursePrice } = this.props;
    return formatPrice(coursePrice.price);
  }

  isCurrentlyEnrollable(enrollmentStartDate: ?Object): boolean {
    const { now } = this.props;
    return enrollmentStartDate !== null &&
      enrollmentStartDate !== undefined &&
      enrollmentStartDate.isSameOrBefore(now, 'day');
  }

  needsPriceCalculation(): boolean {
    const { financialAid, hasFinancialAid } = this.props;
    return hasFinancialAid &&
      !financialAid.has_user_applied &&
      financialAid.application_status !== FA_STATUS_SKIPPED;
  }

  hasPendingFinancialAid(): boolean {
    const { financialAid, hasFinancialAid } = this.props;
    return hasFinancialAid && FA_PENDING_STATUSES.includes(financialAid.application_status);
  }

  renderEnrollButton(run: CourseRun): React$Element<*> {
    const {
      checkout,
      openFinancialAidCalculator
    } = this.props;
    let text = '';
    let needsPriceCalculation = this.needsPriceCalculation();
    let buttonProps = {};

    if (needsPriceCalculation) {
      text = 'Calculate Cost';
    } else {
      text = `Pay Now - ${this.getCoursePrice()}`;
    }

    if (this.hasPendingFinancialAid()) {
      buttonProps.disabled = true;
    } else {
      if (needsPriceCalculation) {
        buttonProps.onClick = openFinancialAidCalculator;
      } else {
        buttonProps.onClick = () => {
          checkout(run.course_id);
        };
      }
    }

    return (
      <Button className="dashboard-button" {...buttonProps}>
        {text}
      </Button>
    );
  }

  renderPayLaterLink(): React$Element<*> {
    return (
      <a href="#">Enroll and pay later</a>
    );
  }

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    let action = "", description = "";

    switch (firstRun.status) {
    case STATUS_PASSED:
      action = <i className="material-icons">done</i>;
      break;
    case STATUS_CAN_UPGRADE: {
      let formattedUpgradeDate = moment(firstRun.course_upgrade_deadline).format(DASHBOARD_FORMAT);
      action = this.renderEnrollButton(firstRun);
      description = `Payment due: ${formattedUpgradeDate}`;
      break;
    }
    case STATUS_OFFERED: {
      let enrollmentStartDate = firstRun.enrollment_start_date ? moment(firstRun.enrollment_start_date) : null;
      if (this.isCurrentlyEnrollable(enrollmentStartDate)) {
        action = this.renderEnrollButton(firstRun);
        description = this.renderPayLaterLink();
      } else {
        if (enrollmentStartDate) {
          let formattedEnrollDate = enrollmentStartDate.format(DASHBOARD_FORMAT);
          description = `Enrollment begins ${formattedEnrollDate}`;
        } else if (firstRun.fuzzy_enrollment_start_date) {
          description = `Enrollment begins ${firstRun.fuzzy_enrollment_start_date}`;
        }
      }
      break;
    }
    case STATUS_NOT_PASSED:
    case STATUS_CURRENTLY_ENROLLED:
      // do nothing;
      break;
    }

    return <div className="course-action">
      <span className="course-action-action">{action}</span>
      <span className="course-action-description">{description}</span>
    </div>;
  }
}
