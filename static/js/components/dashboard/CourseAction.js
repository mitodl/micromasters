/* global SETTINGS: false */
// @flow
import React from 'react';
import moment from 'moment';
import Button from 'react-mdl/lib/Button';
import R from 'ramda';
import _ from 'lodash';

import SpinnerButton from '../SpinnerButton';
import type { Coupon, CalculatedPrices } from '../../flow/couponTypes';
import type { CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_OFFERED,
  STATUS_PENDING_ENROLLMENT,
  STATUS_PAID_BUT_NOT_ENROLLED,
  DASHBOARD_FORMAT,
  FA_PENDING_STATUSES,
  FA_STATUS_SKIPPED,
} from '../../constants';
import { isCurrentlyEnrollable } from './util';
import { formatPrice } from '../../util/util';
import { ifValidDate } from '../../util/date';
import { isFreeCoupon } from '../../lib/coupon';

export default class CourseAction extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    courseRun: CourseRun,
    now: moment$Moment,
    prices: CalculatedPrices,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => void,
    setEnrollSelectedCourseRun: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (b: boolean) => void,
    coupon?: Coupon,
  };

  statusDescriptionClasses = {
    [STATUS_PASSED]: 'passed',
    [STATUS_NOT_PASSED]: 'not-passed'
  };

  getCoursePrice(): string {
    const { prices, courseRun } = this.props;
    let price = prices.get(courseRun.id);
    return formatPrice(price);
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

  redirectToOrderSummary(run: CourseRun): void {
    const url = `/order_summary/?course_key=${encodeURIComponent(run.course_id)}`;
    this.context.router.push(url);
  }

  handleEnrollButtonClick(run: CourseRun): void {
    const {
      coupon,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
    } = this.props;

    setEnrollSelectedCourseRun(run);

    if (coupon && isFreeCoupon(coupon)) {
      this.redirectToOrderSummary(run);
    } else {
      setEnrollCourseDialogVisibility(true);
    }
  }

  renderEnrollButton(run: CourseRun): React$Element<*> {
    let buttonProps = {};

    if (this.hasPendingFinancialAid()) {
      buttonProps.disabled = true;
    }

    return (
      <SpinnerButton
        className="dashboard-button enroll-button"
        key="1"
        component={Button}
        spinning={run.status === STATUS_PENDING_ENROLLMENT}
        onClick={() => this.handleEnrollButtonClick(run)}
        {...buttonProps}
      >
        Enroll Now
      </SpinnerButton>
    );
  }

  renderPayButton(run: CourseRun): React$Element<*> {
    let props;
    if (this.needsPriceCalculation()) {
      props = {disabled: true};
    } else {
      props = {onClick: () => this.redirectToOrderSummary(run)};
    }
    return (
      <Button
        className="dashboard-button pay-button"
        key="1"
        {...props}
      >
        Pay Now
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

  handleAddCourseEnrollment = (run: CourseRun): void => {
    const { addCourseEnrollment } = this.props;
    addCourseEnrollment(run.course_id);
  };

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
      action = this.renderPayButton(run);
      const date = moment(run.course_upgrade_deadline);
      const text = ifValidDate('', date => `Payment due: ${date.format(DASHBOARD_FORMAT)}`, date);
      description = this.renderTextDescription(text);
      break;
    }
    case STATUS_OFFERED: {
      let enrollmentStartDate = run.enrollment_start_date ? moment(run.enrollment_start_date) : null;
      if (isCurrentlyEnrollable(enrollmentStartDate, now)) {
        action = this.renderEnrollButton(run);
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
    case STATUS_PAID_BUT_NOT_ENROLLED: {
      const contactText = 'Contact us for help.';
      const contactHref = `mailto:${SETTINGS.support_email}`;
      const descriptionText = 'Something went wrong. You paid for this course but are not enrolled.';
      description = (
        <div className='description' key='2'>
          {descriptionText} <a href={contactHref}>{contactText}</a>
        </div>
      );
      break;
    }}

    return _.compact([action, description]);
  }

  render() {
    const { courseRun } = this.props;

    return <div className="course-action">
      { this.renderContents(courseRun) }
    </div>;
  }
}
