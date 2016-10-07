/* global SETTINGS: false */
// @flow
import React from 'react';
import moment from 'moment';
import Button from 'react-mdl/lib/Button';
import R from 'ramda';

import _ from 'lodash';

import type { Course, CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
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
    addCourseEnrollment: (courseId: string) => void
  };

  statusDescriptionClasses = {
    [STATUS_PASSED]: 'passed',
    [STATUS_NOT_PASSED]: 'not-passed'
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
      <Button className="dashboard-button" key="1" {...buttonProps}>
        {text}
      </Button>
    );
  }

  renderDescription = R.curry(
    (className: string, runStatus: ?string, text: string): React$Element<*>|null => {
      let classDefinition = className;
      if (runStatus && this.statusDescriptionClasses[runStatus]) {
        classDefinition = `${classDefinition} ${this.statusDescriptionClasses[runStatus]}`;
      }
      return text.length > 0 ? <div className={classDefinition} key="2">{text}</div> : null;
    }
  );

  renderTextDescription = this.renderDescription('description', null);

  renderBoxedDescription = this.renderDescription('boxed description', null);

  renderStatusDescription = this.renderDescription('boxed description');

  handleAddCourseEnrollment = (event: Event, run: CourseRun): void => {
    const { addCourseEnrollment } = this.props;
    event.preventDefault();
    addCourseEnrollment(run.course_id);
  };

  renderPayLaterLink(run: CourseRun): React$Element<*> {
    return (
      <a href="#" onClick={e => this.handleAddCourseEnrollment(e, run)}>Enroll and pay later</a>
    );
  }

  renderContents(run: CourseRun) {
    const { now } = this.props;

    let action, description;

    switch (run.status) {
    case STATUS_PASSED:
      description = this.renderStatusDescription(run.status, 'Passed');
      break;
    case STATUS_CURRENTLY_ENROLLED: {
      description = this.renderBoxedDescription('In Progress');
      break;
    }
    case STATUS_WILL_ATTEND: {
      let startDate = moment(run.course_start_date);
      let daysUntilStart = startDate.diff(now, 'days');
      description = this.renderBoxedDescription(`Course starts in ${daysUntilStart} days`);
      break;
    }
    case STATUS_CAN_UPGRADE: {
      let formattedUpgradeDate = moment(run.course_upgrade_deadline).format(DASHBOARD_FORMAT);
      action = this.renderEnrollButton(run);
      description = this.renderTextDescription(`Payment due: ${formattedUpgradeDate}`);
      break;
    }
    case STATUS_OFFERED: {
      let enrollmentStartDate = run.enrollment_start_date ? moment(run.enrollment_start_date) : null;
      if (this.isCurrentlyEnrollable(enrollmentStartDate)) {
        action = this.renderEnrollButton(run);
        description = this.renderPayLaterLink(run);
      } else {
        if (enrollmentStartDate) {
          let formattedEnrollDate = enrollmentStartDate.format(DASHBOARD_FORMAT);
          description = this.renderTextDescription(`Enrollment begins ${formattedEnrollDate}`);
        } else if (run.fuzzy_enrollment_start_date) {
          description = this.renderTextDescription(`Enrollment begins ${run.fuzzy_enrollment_start_date}`);
        }
      }
      break;
    }
    case STATUS_NOT_PASSED:
      // do nothing;
      break;
    }

    return _.compact([action, description]);
  }

  render() {
    const { course } = this.props;
    let firstRun: CourseRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }

    return <div className="course-action">
      { this.renderContents(firstRun) }
    </div>;
  }
}
