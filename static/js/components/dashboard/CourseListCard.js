// @flow
import React from "react"
import moment from "moment"
import R from "ramda"
import Card from "@material-ui/core/Card"

import type { Program, Course } from "../../flow/programTypes"
import type { CouponPrice, CouponPrices } from "../../flow/couponTypes"
import CourseRow from "./CourseRow"
import FinancialAidCalculator from "../../containers/FinancialAidCalculator"
import type { CourseRun } from "../../flow/programTypes"
import type { UIState } from "../../reducers/ui"
import {
  FA_TERMINAL_STATUSES,
  FA_PENDING_STATUSES,
  COUPON_CONTENT_TYPE_PROGRAM
} from "../../constants"
import { isFreeCoupon } from "../../lib/coupon"
import { formatPrice } from "../../util/util"
import type { GradeType } from "../../containers/DashboardPage"
import CardContent from "@material-ui/core/CardContent"

const priceMessageClassName = "price-message"

export default class CourseListCard extends React.Component {
  props: {
    program: Program,
    couponPrices?: CouponPrices,
    openFinancialAidCalculator?: () => void,
    now?: Object,
    addCourseEnrollment?: (courseId: string) => Promise<*>,
    openCourseContactDialog: (
      course: Course,
      canContactCourseTeam: boolean
    ) => void,
    setEnrollSelectedCourseRun?: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility?: (bool: boolean) => void,
    setCalculatePriceDialogVisibility?: (bool: boolean) => void,
    setShowExpandedCourseStatus?: (n: number) => void,
    setShowGradeDetailDialog: (b: boolean, t: GradeType, title: string) => void,
    ui: UIState,
    checkout?: (s: string) => void,
    showStaffView: boolean
  }

  getProgramCouponPrice = (): CouponPrice => {
    const { couponPrices, program } = this.props
    if (!couponPrices) {
      // shouldn't happen, we should not be here unless we already checked this
      throw new Error("No coupon prices available")
    }
    const couponPrice = couponPrices.pricesInclCouponByProgram.get(program.id)
    if (!couponPrice) {
      // This shouldn't happen since we should have waited for the API requests to finish before getting here
      throw new Error(`Unable to find program ${program.id} in list of prices`)
    }
    return couponPrice
  }

  handleCalculatePriceClick = (e: Event) => {
    const { openFinancialAidCalculator } = this.props
    if (openFinancialAidCalculator) openFinancialAidCalculator()
    e.preventDefault()
  }

  renderCalculatePriceLink(): ?React$Element<*> {
    const calculateLink = (
      <a
        href="#"
        className="calculate-link"
        onClick={this.handleCalculatePriceClick}
      >
        calculate your course price
      </a>
    )
    return (
      <p className={priceMessageClassName}>
        *You need to {calculateLink} before you can pay for courses. Or you can
        audit courses for free by clicking Enroll.
      </p>
    )
  }

  renderFinancialAidPriceMessage(): ?React$Element<*> {
    const { program } = this.props
    const finAidStatus = program.financial_aid_user_info.application_status

    if (FA_TERMINAL_STATUSES.includes(finAidStatus)) {
      const { coupon, price } = this.getProgramCouponPrice()

      if (coupon) {
        // financial aid + coupon
        return (
          <p className={priceMessageClassName}>
            Your price is <strong>{formatPrice(price)} USD per course,</strong>{" "}
            including both financial aid and your coupon. If you want to audit
            courses for FREE and upgrade later, click Enroll then choose the
            audit option.
          </p>
        )
      } else {
        return (
          <p className={priceMessageClassName}>
            Your Personal Course Price is{" "}
            <strong>{formatPrice(price)} USD per course.</strong> If you want to
            audit courses for FREE and upgrade later, click Enroll then choose
            the audit option.
          </p>
        )
      }
    } else if (FA_PENDING_STATUSES.includes(finAidStatus)) {
      return (
        <p className={priceMessageClassName}>
          *Your personal course price is pending, and needs to be approved
          before you can pay for courses. Or you can audit courses for free by
          clicking Enroll.
        </p>
      )
    } else {
      return this.renderCalculatePriceLink()
    }
  }

  renderPriceMessage(): ?React$Element<*> {
    const { program } = this.props
    const { coupon } = this.getProgramCouponPrice()

    // Special case: 100% off coupon
    if (
      coupon &&
      isFreeCoupon(coupon) &&
      coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM
    ) {
      return (
        <p className={priceMessageClassName}>
          Courses in this program are free, because of your coupon.
        </p>
      )
    }

    if (program.financial_aid_availability) {
      return this.renderFinancialAidPriceMessage()
    }

    return (
      <p className={priceMessageClassName}>
        To get credit for the courses in this program, you must pay for a
        verified certificate from edx.org. If you want to audit courses for FREE
        and upgrade later, click Enroll then choose the audit option.
      </p>
    )
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
      setCalculatePriceDialogVisibility,
      setShowExpandedCourseStatus,
      setShowGradeDetailDialog,
      ui,
      checkout,
      showStaffView
    } = this.props
    const now = this.props.now || moment()
    const hasElectives =
      program.number_courses_required < program.courses.length
    const sortedCourses = R.sortBy(
      R.prop("position_in_program"),
      program.courses
    )
    const courseRows = sortedCourses.map(course => (
      <CourseRow
        hasFinancialAid={program.financial_aid_availability}
        financialAid={program.financial_aid_user_info}
        course={course}
        key={course.id}
        openFinancialAidCalculator={openFinancialAidCalculator}
        couponPrices={couponPrices}
        now={now}
        programHasElectives={hasElectives}
        addCourseEnrollment={addCourseEnrollment}
        openCourseContactDialog={openCourseContactDialog}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
        setCalculatePriceDialogVisibility={setCalculatePriceDialogVisibility}
        ui={ui}
        checkout={checkout}
        setShowExpandedCourseStatus={setShowExpandedCourseStatus}
        setShowGradeDetailDialog={setShowGradeDetailDialog}
        showStaffView={showStaffView}
      />
    ))

    return (
      <Card shadow={0} className="card course-list">
        <CardContent className="course-list-content">
          <FinancialAidCalculator />
          <h2>
            {showStaffView ? `Courses - ${program.title}` : "Required Courses"}
          </h2>
          {showStaffView ? null : this.renderPriceMessage()}
          {courseRows}
        </CardContent>
      </Card>
    )
  }
}
