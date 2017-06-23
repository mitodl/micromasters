// @flow
import React from 'react';
import moment from 'moment';
import R from 'ramda';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { Program, Course } from '../../flow/programTypes';
import type {
  CouponPrice,
  CouponPrices,
} from '../../flow/couponTypes';
import CourseRow from './CourseRow';
import FinancialAidCalculator from '../../containers/FinancialAidCalculator';
import type { CourseRun } from '../../flow/programTypes';
import type { UIState } from '../../reducers/ui';
import {
  FA_TERMINAL_STATUSES,
  COUPON_CONTENT_TYPE_PROGRAM,
} from '../../constants';
import {
  isFreeCoupon,
} from '../../lib/coupon';
import {
  formatPrice,
} from '../../util/util';

const priceMessageClassName = "price-message";

export default class CourseListCard extends React.Component {
  props: {
    program:                         Program,
    couponPrices:                    CouponPrices,
    openFinancialAidCalculator?:     () => void,
    now?:                            Object,
    addCourseEnrollment:             (courseId: string) => Promise<*>,
    openCourseContactDialog:         (course: Course, canContactCourseTeam: boolean) => void,
    setEnrollSelectedCourseRun:      (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (bool: boolean) => void,
    setShowExpandedCourseStatus:     (n: number) => void,
    setShowGradeDetailDialog:        (b: boolean, title: string) => void,
    ui:                              UIState,
    checkout:                        (s: string) => void,
  };

  getProgramCouponPrice = (): CouponPrice => {
    const { couponPrices, program } = this.props;
    let couponPrice = couponPrices.pricesInclCouponByProgram.get(program.id);
    if (!couponPrice) {
      // This shouldn't happen since we should have waited for the API requests to finish before getting here
      throw `Unable to find program ${program.id} in list of prices`;
    }
    return couponPrice;
  };

  renderFinancialAidPriceMessage(): ?React$Element<*> {
    const { program } = this.props;
    const finAidStatus = program.financial_aid_user_info.application_status;

    if (FA_TERMINAL_STATUSES.includes(finAidStatus)) {
      const { coupon, price } = this.getProgramCouponPrice();

      if (coupon) {
        // financial aid + coupon
        return <p className={priceMessageClassName}>
          Your price is <strong>{ formatPrice(price) } USD per course,</strong> including
          both financial aid and your coupon.
          If you want to audit courses for FREE and upgrade later,
          click Enroll then choose the audit option.
        </p>;
      } else {
        return <p className={priceMessageClassName}>
          Your Personal Course Price is{" "}
          <strong>{ formatPrice(price) } USD per course.</strong> {" "}
          If you want to audit courses for FREE and upgrade later, click
          Enroll then choose the audit option.
        </p>;
      }
    } else {
      return <p className={priceMessageClassName}>
        You need to get your Personal Course Price before you can pay for courses.
        If you want to audit courses for FREE and upgrade later,
        click Enroll then choose the audit option.
      </p>;
    }
  }

  renderPriceMessage(): ?React$Element<*> {
    const { program } = this.props;
    const { coupon, price } = this.getProgramCouponPrice();

    // Special case: 100% off coupon
    if (coupon && isFreeCoupon(coupon) && coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
      return <p className={priceMessageClassName}>
        Courses in this program are free, because of your coupon.
      </p>;
    }

    if (program.financial_aid_availability) {
      return this.renderFinancialAidPriceMessage();
    }

    return <p className={priceMessageClassName}>
      Courses in this program cost <strong>{ formatPrice(price) } USD each.</strong> {" "}
      If you want to audit courses for FREE and upgrade later,
      click Enroll then choose the audit option.
    </p>;
  }

  render(): React$Element<*> {
    const {
      program,
      couponPrices,
      openFinancialAidCalculator,
      addCourseEnrollment,
      openCourseContactDialog,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
      setShowExpandedCourseStatus,
      setShowGradeDetailDialog,
      ui,
      checkout
    } = this.props;
    const now = this.props.now || moment();

    const sortedCourses = R.sortBy(R.prop('position_in_program'), program.courses);
    const courseRows = sortedCourses.map(course =>
      <CourseRow
        hasFinancialAid={program.financial_aid_availability}
        financialAid={program.financial_aid_user_info}
        course={course}
        key={course.id}
        openFinancialAidCalculator={openFinancialAidCalculator}
        couponPrices={couponPrices}
        now={now}
        addCourseEnrollment={addCourseEnrollment}
        openCourseContactDialog={openCourseContactDialog}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
        ui={ui}
        checkout={checkout}
        setShowExpandedCourseStatus={setShowExpandedCourseStatus}
        setShowGradeDetailDialog={setShowGradeDetailDialog}
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
