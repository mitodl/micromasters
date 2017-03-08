// @flow
import React from 'react';
import moment from 'moment';
import R from 'ramda';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { Program, Course } from '../../flow/programTypes';
import type {
  CalculatedPrices,
  Coupon,
} from '../../flow/couponTypes';
import CourseRow from './CourseRow';
import FinancialAidCalculator from '../../containers/FinancialAidCalculator';
import type { CoursePrice } from '../../flow/dashboardTypes';
import type { CourseRun } from '../../flow/programTypes';
import {
  FA_TERMINAL_STATUSES,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
} from '../../constants';
import {
  makeAmountMessage,
  makeCouponReason,
  isFreeCoupon,
} from '../../lib/coupon';
import { pickExistingProps, sortedCourseRuns } from '../../util/util';

const priceMessageClassName = "price-message";

export default class CourseListCard extends React.Component {
  props: {
    coupon?:                      Coupon,
    program:                      Program,
    coursePrice:                  CoursePrice,
    prices:                       CalculatedPrices,
    openFinancialAidCalculator?:  () => void,
    now?:                         Object,
    addCourseEnrollment:          (courseId: string) => Promise<*>,
    openCourseContactDialog:      (course: Course, canContactCourseTeam: boolean) => void,
    setEnrollSelectedCourseRun:   (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (bool: boolean) => void,
  };

  renderFinancialAidPriceMessage(): ?React$Element<*> {
    const {
      program,
      coupon,
      prices,
    } = this.props;
    const finAidStatus = program.financial_aid_user_info.application_status;

    if (FA_TERMINAL_STATUSES.includes(finAidStatus)) {
      let price;
      for (const courseRun of sortedCourseRuns(program)) {
        price = prices.get(courseRun.id);
        if (price) {
          break;
        }
      }

      if (!price) {
        return null;
      }
      if (coupon && coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
        // financial aid + coupon
        return <p className={priceMessageClassName}>
          Your price is <strong>${ price.toString() } USD per course,</strong> including
          both financial aid and your coupon.
          If you want to audit courses for FREE and upgrade later,
          click Enroll Now then choose the audit option.
        </p>;
      } else {
        return <p className={priceMessageClassName}>
          Your Personal Course Price is{" "}
          <strong>${ price.toString() } USD per course.</strong> {" "}
          If you want to audit courses for FREE and upgrade later, click
          Enroll Now then choose the audit option.
        </p>;
      }
    } else {
      return <p className={priceMessageClassName}>
        You need to get your Personal Course Price before you can pay for courses.
        If you want to audit courses for FREE and upgrade later,
        click Enroll Now then choose the audit option.
      </p>;
    }
  }

  renderCouponPriceMessage(): React$Element<*> {
    const { coupon } = this.props;
    if (!coupon) {
      throw "missing coupon"; // this should never happen, it's just to make flow happy
    }

    const isDiscount = (
      coupon.amount_type === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT ||
      coupon.amount_type === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT
    );
    let message;
    if (isDiscount) {
      message = <span>
        You will get {makeAmountMessage(coupon)} off the cost for each course in this program
      </span>;
    } else {
      message = <span>
        All courses are set to the discounted price of {makeAmountMessage(coupon)}
      </span>;
    }
    return <p className={priceMessageClassName}>
      {message}{makeCouponReason(coupon)}.
      If you want to audit courses for FREE and upgrade later,
      click Enroll Now then choose the audit option.
    </p>;
  }

  renderPriceMessage(): ?React$Element<*> {
    const {
      program,
      coupon,
      prices,
    } = this.props;

    // Special case: 100% off coupon
    if (coupon &&
        isFreeCoupon(coupon) &&
        coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM
    ) {
      return <p className={priceMessageClassName}>
        Courses in this program are free, because of your coupon.
      </p>;
    }

    if (program.financial_aid_availability) {
      return this.renderFinancialAidPriceMessage();
    }

    // no financial aid
    if (coupon && coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
      return this.renderCouponPriceMessage();
    }

    let price;
    for (const courseRun of sortedCourseRuns(program)) {
      price = prices.get(courseRun.id);
      if (price) {
        break;
      }
    }
    if (!price) {
      return null;
    }

    return <p className={priceMessageClassName}>
      Courses in this program cost <strong>${ price.toString() } USD each.</strong> {" "}
      If you want to audit courses for FREE and upgrade later,
      click Enroll Now then choose the audit option.
    </p>;
  }

  render(): React$Element<*> {
    const {
      program,
      prices,
      openFinancialAidCalculator,
      addCourseEnrollment,
      openCourseContactDialog,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
    } = this.props;
    const now = this.props.now || moment();

    const courseRowOptionalProps = pickExistingProps(['coupon'], this.props);

    const sortedCourses = R.sortBy(R.prop('position_in_program'), program.courses);
    const courseRows = sortedCourses.map(course =>
      <CourseRow
        hasFinancialAid={program.financial_aid_availability}
        financialAid={program.financial_aid_user_info}
        course={course}
        key={course.id}
        openFinancialAidCalculator={openFinancialAidCalculator}
        prices={prices}
        now={now}
        addCourseEnrollment={addCourseEnrollment}
        openCourseContactDialog={openCourseContactDialog}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
        {...courseRowOptionalProps}
      />
    );

    return <Card shadow={0} className="course-list">
      <FinancialAidCalculator />
      <CardTitle>Required Courses</CardTitle>
      { this.renderPriceMessage() }
      { courseRows }
    </Card>;
  }
}
