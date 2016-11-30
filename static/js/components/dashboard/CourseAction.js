/* global SETTINGS: false */
// @flow
import React from 'react';
import moment from 'moment';
import Button from 'react-mdl/lib/Button';
import Spinner from 'react-mdl/lib/Spinner';
import R from 'ramda';
import _ from 'lodash';

import type { CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_OFFERED,
  STATUS_PENDING_ENROLLMENT,
  DASHBOARD_FORMAT,
  FA_PENDING_STATUSES,
  FA_STATUS_SKIPPED
} from '../../constants';
import { isCurrentlyEnrollable } from './util';
import { formatPrice } from '../../util/util';
import { ifValidDate } from '../../util/date';

export default class CourseAction extends React.Component {
  props: {
    checkout: Function,
    courseRun: CourseRun,
    coursePrice: CoursePrice,
    now: moment$Moment,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator?: () => void,
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
      text = `Pay Now ${this.getCoursePrice()}`;
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

    if (run.status === STATUS_PENDING_ENROLLMENT) {
      buttonProps.disabled = true;

      text = <div className="spinner-container">
        <Spinner singleColor />
      </div>;
    }

    return (
      <Button className="dashboard-button" key="1" {...buttonProps}>
        {text}
      </Button>
    );
  }

  renderDescription = R.curry(
    (className: string, runStatus: ?string, text: ?string): React$Element<*>|null => {
      let classDefinition = className;
      if (runStatus && this.statusDescriptionClasses[runStatus]) {
        classDefinition = `${classDefinition} ${this.statusDescriptionClasses[runStatus]}`;
      }
      return text && text.length > 0 ? <div className={classDefinition} key="2">{text}</div> : null;
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
      <button
        className="mm-minor-action enroll-pay-later"
        onClick={e => this.handleAddCourseEnrollment(e, run)} key="2"
      >
        Enroll and pay later
      </button>
    );
  }

  renderContents(run: CourseRun) {
    const { now } = this.props;

    let action, description;

    switch (run.status) {
    case STATUS_PASSED:
      description = this.renderStatusDescription(run.status, 'Passed');
      break;
    case STATUS_NOT_PASSED:
      description = this.renderStatusDescription(run.status, 'Failed');
      break;
    case STATUS_CURRENTLY_ENROLLED: {
      description = this.renderBoxedDescription('In Progress');
      break;
    }
    case STATUS_WILL_ATTEND: {
      let startDate = moment(run.course_start_date).startOf('day');
      let nowDate = moment(now).startOf('day');
      let text = ifValidDate('', date => `Course starts in ${date.diff(nowDate, 'days')} days`, startDate);
      description = this.renderBoxedDescription(text);
      break;
    }
    case STATUS_CAN_UPGRADE: {
      let date = moment(run.course_upgrade_deadline);
      action = this.renderEnrollButton(run);
      let text = ifValidDate('', date => `Payment due: ${date.format(DASHBOARD_FORMAT)}`, date);
      description = this.renderTextDescription(text);
      break;
    }
    case STATUS_OFFERED: {
      let enrollmentStartDate = run.enrollment_start_date ? moment(run.enrollment_start_date) : null;
      if (isCurrentlyEnrollable(enrollmentStartDate, now)) {
        action = this.renderEnrollButton(run);
        description = this.renderPayLaterLink(run);
      } else {
        let text;
        if (enrollmentStartDate) {
          text = ifValidDate('', date => `Enrollment begins ${date.format(DASHBOARD_FORMAT)}`, enrollmentStartDate);
        } else if (run.fuzzy_enrollment_start_date) {
          text = `Enrollment begins ${run.fuzzy_enrollment_start_date}`;
        } else {
          text = 'Enrollment information unavailable';
        }
        description = this.renderTextDescription(text);
      }
      break;
    }
    case STATUS_MISSED_DEADLINE:
      description = this.renderTextDescription(
        'You missed the payment deadline and will not receive MicroMasters credit for this course.'
      );
      break;
    case STATUS_PENDING_ENROLLMENT:
      action = this.renderEnrollButton(run);
      description = this.renderTextDescription('Processing...');
      break;
    }

    return _.compact([action, description]);
  }

  render() {
    const { courseRun } = this.props;

    return <div className="course-action">
      { this.renderContents(courseRun) }
    </div>;
  }
}
