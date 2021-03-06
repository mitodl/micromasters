// @flow
import React from "react"
import Grid from "@material-ui/core/Grid"
import R from "ramda"
import Icon from "@material-ui/core/Icon"
import CircularProgress from "@material-ui/core/CircularProgress"

import CourseAction from "./CourseAction"
import Grades from "./courses/Grades"
import ProgressMessage from "./courses/ProgressMessage"
import StatusMessages from "./courses/StatusMessages"
import type {
  Course,
  CourseRun,
  FinancialAidUserInfo
} from "../../flow/programTypes"
import type { UIState } from "../../reducers/ui"
import type { GradeType } from "../../containers/DashboardPage"
import type { CouponPrices, Coupon } from "../../flow/couponTypes"
import {
  STATUS_PENDING_ENROLLMENT,
  COURSE_ACTION_ENROLL
} from "../../constants"
import {
  courseStartDateMessage,
  userIsEnrolled,
  hasPaidForAnyCourseRun
} from "./courses/util"
import { isEnrollableRun } from "./courses/util"

export default class CourseRow extends React.Component {
  props: {
    course: Course,
    now: moment$Moment,
    couponPrices: CouponPrices,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    programHasElectives: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => Promise<*>,
    openCourseContactDialog: (
      course: Course,
      canContactCourseTeam: boolean
    ) => void,
    setEnrollSelectedCourseRun: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (b: boolean) => void,
    setCalculatePriceDialogVisibility: (b: boolean) => void,
    setExamEnrollmentDialogVisibility: (b: boolean) => void,
    setSelectedExamCouponCourse: (n: number) => void,
    ui: UIState,
    checkout: (s: string) => void,
    setShowExpandedCourseStatus: (n: number) => void,
    setShowGradeDetailDialog: (b: boolean, t: GradeType, title: string) => void,
    showStaffView: boolean
  }

  // $FlowFixMe: CourseRun is sometimes an empty object
  getFirstRun(): CourseRun {
    const { course } = this.props
    let firstRun = {}
    if (course.runs.length > 0) {
      firstRun = course.runs[0]
    }
    return firstRun
  }

  getCourseCoupon = (): ?Coupon => {
    const { couponPrices, course } = this.props

    const couponPrice = couponPrices.pricesInclCouponByCourse.get(course.id)
    return couponPrice ? couponPrice.coupon : undefined
  }

  courseAction = (
    run: CourseRun,
    actionType: string
  ): React$Element<*> | null => {
    const {
      now,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
      setCalculatePriceDialogVisibility,
      checkout,
      showStaffView
    } = this.props

    if (showStaffView) {
      return null
    }

    if (actionType === COURSE_ACTION_ENROLL && !isEnrollableRun(run)) {
      return null
    }
    const coupon = this.getCourseCoupon()

    return (
      <CourseAction
        courseRun={run}
        actionType={actionType}
        now={now}
        hasFinancialAid={hasFinancialAid}
        checkout={checkout}
        financialAid={financialAid}
        openFinancialAidCalculator={openFinancialAidCalculator}
        addCourseEnrollment={addCourseEnrollment}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
        setCalculatePriceDialogVisibility={setCalculatePriceDialogVisibility}
        coupon={coupon}
      />
    )
  }

  renderEnrollmentSuccess = (): React$Element<*> => {
    return (
      <Grid container className="course-sub-row enroll-pay-later-success">
        <Grid item xs={2} key="1">
          <Icon name="check" className="tick-icon" />
        </Grid>
        ,
        <Grid item xs={7} key="2">
          <p className="enroll-pay-later-heading">
            You are now auditing this course
          </p>
          <span className="enroll-pay-later-txt">
            But you still need to pay to get credit.
          </span>
        </Grid>
      </Grid>
    )
  }

  renderInProgressCourseInfo = (run: CourseRun) => {
    const {
      course,
      financialAid,
      hasFinancialAid,
      openCourseContactDialog,
      ui,
      setShowExpandedCourseStatus,
      setShowGradeDetailDialog,
      setExamEnrollmentDialogVisibility,
      setSelectedExamCouponCourse,
      showStaffView
    } = this.props

    return (
      <div className="enrolled-course-info">
        <Grades
          course={course}
          setShowGradeDetailDialog={setShowGradeDetailDialog}
          dialogVisibility={ui.dialogVisibility}
        />
        <ProgressMessage
          courseRun={run}
          course={course}
          openCourseContactDialog={R.partial(openCourseContactDialog, [
            course,
            hasPaidForAnyCourseRun(course)
          ])}
          showStaffView={showStaffView}
        />
        {showStaffView ? null : (
          <StatusMessages
            course={course}
            financialAid={financialAid}
            hasFinancialAid={hasFinancialAid}
            firstRun={run}
            courseAction={this.courseAction}
            expandedStatuses={ui.expandedCourseStatuses}
            setShowExpandedCourseStatus={setShowExpandedCourseStatus}
            setExamEnrollmentDialogVisibility={
              setExamEnrollmentDialogVisibility
            }
            setSelectedExamCouponCourse={setSelectedExamCouponCourse}
            coupon={this.getCourseCoupon()}
          />
        )}
      </div>
    )
  }

  renderEnrollableCourseInfo = (run: CourseRun) => {
    const { course, hasFinancialAid, showStaffView } = this.props

    return (
      <div className="enrollable-course-info">
        <div className="cols">
          <div className="first-col course-start-date-message">
            {courseStartDateMessage(run)}
          </div>
          <div className="second-col">
            {run.status === STATUS_PENDING_ENROLLMENT ? (
              <CircularProgress />
            ) : null}
            {run.status === STATUS_PENDING_ENROLLMENT ? "Processing..." : null}
          </div>
        </div>
        {!showStaffView ? (
          <StatusMessages
            course={course}
            courseAction={this.courseAction}
            hasFinancialAid={hasFinancialAid}
            firstRun={run}
            coupon={this.getCourseCoupon()}
          />
        ) : null}
      </div>
    )
  }
  getCourseTag = (): React$Element<*> => {
    const { course } = this.props
    const tag = course.is_elective ? "elective" : "core"
    return <div className={`elective-tag ${tag}`}>{tag}</div>
  }

  renderCourseInfo = (run: CourseRun) => {
    const { course, programHasElectives } = this.props

    return (
      <div className="course-info">
        <div className="course-title">
          {course.title}
          {programHasElectives ? this.getCourseTag() : null}
        </div>
        {R.any(userIsEnrolled, course.runs)
          ? this.renderInProgressCourseInfo(run)
          : this.renderEnrollableCourseInfo(run)}
      </div>
    )
  }

  render() {
    const { ui } = this.props

    const firstRun = this.getFirstRun()
    const showEnrollPayLaterSuccess =
      ui.showEnrollPayLaterSuccess &&
      ui.showEnrollPayLaterSuccess === firstRun.course_id

    return (
      <div className="course-container course-row">
        {showEnrollPayLaterSuccess
          ? this.renderEnrollmentSuccess()
          : this.renderCourseInfo(firstRun)}
      </div>
    )
  }
}
