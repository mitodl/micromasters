/* global SETTINGS: false */
// @flow
import React from "react"
import PropTypes from "prop-types"
import Button from "react-mdl/lib/Button"
import R from "ramda"

import SpinnerButton from "../SpinnerButton"
import type { Coupon } from "../../flow/couponTypes"
import type { CourseRun, FinancialAidUserInfo } from "../../flow/programTypes"
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_PENDING_ENROLLMENT,
  FA_PENDING_STATUSES,
  FA_TERMINAL_STATUSES,
  COURSE_ACTION_PAY,
  COURSE_ACTION_ENROLL,
  COURSE_ACTION_REENROLL
} from "../../constants"
import { isFreeCoupon } from "../../lib/coupon"
import { isEnrollableRun } from "./courses/util"

export default class CourseAction extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    courseRun: CourseRun,
    now: moment$Moment,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => Promise<*>,
    setEnrollSelectedCourseRun: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (b: boolean) => void,
    coupon: ?Coupon,
    actionType: string,
    checkout: (s: string) => void
  }

  statusDescriptionClasses = {
    [STATUS_PASSED]:     "passed",
    [STATUS_NOT_PASSED]: "not-passed"
  }

  needsPriceCalculation(): boolean {
    const { financialAid, hasFinancialAid } = this.props
    return (
      hasFinancialAid &&
      !FA_TERMINAL_STATUSES.includes(financialAid.application_status)
    )
  }

  hasPendingFinancialAid(): boolean {
    const { financialAid, hasFinancialAid } = this.props
    return (
      hasFinancialAid &&
      FA_PENDING_STATUSES.includes(financialAid.application_status)
    )
  }

  redirectToOrderSummary(run: CourseRun): void {
    const { hasFinancialAid, checkout } = this.props
    if (hasFinancialAid) {
      const url = `/order_summary/?course_key=${encodeURIComponent(
        run.course_id
      )}`
      this.context.router.push(url)
    } else {
      return checkout(run.course_id)
    }
  }

  handleEnrollButtonClick(run: CourseRun): void {
    const {
      coupon,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility
    } = this.props

    setEnrollSelectedCourseRun(run)

    if (coupon && isFreeCoupon(coupon)) {
      this.redirectToOrderSummary(run)
    } else {
      setEnrollCourseDialogVisibility(true)
    }
  }

  renderEnrollButton(run: CourseRun, actionType: string): React$Element<*> {
    return (
      <div className="course-action">
        <SpinnerButton
          className="dashboard-button enroll-button"
          disabled={R.not(isEnrollableRun(run))}
          component={Button}
          spinning={run.status === STATUS_PENDING_ENROLLMENT}
          onClick={() => this.handleEnrollButtonClick(run)}
        >
          {actionType === COURSE_ACTION_REENROLL ? "Re-Enroll" : "Enroll"}
        </SpinnerButton>
      </div>
    )
  }

  renderPayButton(run: CourseRun): React$Element<*> {
    let props
    if (this.needsPriceCalculation()) {
      props = { disabled: true }
    } else {
      props = { onClick: () => this.redirectToOrderSummary(run) }
    }
    return (
      <div className="course-action">
        <Button className="dashboard-button pay-button" key="1" {...props}>
          Pay Now
        </Button>
      </div>
    )
  }

  render() {
    const { courseRun, actionType } = this.props

    if (
      actionType === COURSE_ACTION_ENROLL ||
      actionType === COURSE_ACTION_REENROLL
    ) {
      return this.renderEnrollButton(courseRun, actionType)
    } else if (actionType === COURSE_ACTION_PAY) {
      return this.renderPayButton(courseRun)
    }
    return null
  }
}
