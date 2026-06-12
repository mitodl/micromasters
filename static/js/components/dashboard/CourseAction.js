/* global SETTINGS: false */
// @flow
import React from "react"
import PropTypes from "prop-types"
import Button from "@material-ui/core/Button"
import R from "ramda"

import SpinnerButton from "../SpinnerButton"
import type { Coupon } from "../../flow/couponTypes"
import type { CourseRun } from "../../flow/programTypes"
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_PENDING_ENROLLMENT,
  COURSE_ACTION_PAY,
  COURSE_ACTION_ENROLL,
  COURSE_ACTION_REENROLL,
  COURSE_ACTION_CALCULATE_PRICE
} from "../../constants"
import { isEnrollableRun } from "./courses/util"

export default class CourseAction extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    courseRun: CourseRun,
    now: moment$Moment,
    addCourseEnrollment: (courseId: string) => Promise<*>,
    setEnrollSelectedCourseRun: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (b: boolean) => void,
    setCalculatePriceDialogVisibility: (b: boolean) => void,
    coupon: ?Coupon,
    actionType: string
  }

  statusDescriptionClasses = {
    [STATUS_PASSED]:     "passed",
    [STATUS_NOT_PASSED]: "not-passed"
  }

  handleEnrollButtonClick(run: CourseRun): void {
    const {
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility
    } = this.props

    setEnrollSelectedCourseRun(run)
    setEnrollCourseDialogVisibility(true)
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

  // eslint-disable-next-line no-unused-vars
  renderPayButton(run: CourseRun): React$Element<*> {
    // Upgrades are no longer available
    return (
      <div className="course-action">
        <button
          className="mdl-button dashboard-button pay-button"
          key="1"
          disabled={true}
        >
          Upgrade Unavailable
        </button>
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
    } else if (
      actionType === COURSE_ACTION_PAY ||
      actionType === COURSE_ACTION_CALCULATE_PRICE
    ) {
      return this.renderPayButton(courseRun)
    }
    return null
  }
}
