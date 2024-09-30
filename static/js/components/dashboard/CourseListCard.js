// @flow
import React from "react"
import moment from "moment"
import R from "ramda"
import Card from "@material-ui/core/Card"

import type { Program, Course } from "../../flow/programTypes"
import type { CouponPrices } from "../../flow/couponTypes"
import CourseRow from "./CourseRow"
import FinancialAidCalculator from "../../containers/FinancialAidCalculator"
import type { CourseRun } from "../../flow/programTypes"
import type { UIState } from "../../reducers/ui"
import { programBackendName } from "../../util/util"
import type { GradeType } from "../../containers/DashboardPage"
import CardContent from "@material-ui/core/CardContent"
import {
  COURSEWARE_BACKEND_EDXORG,
  COURSEWARE_BACKEND_MITXONLINE
} from "../../constants"

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
    setExamEnrollmentDialogVisibility?: (bool: boolean) => void,
    setSelectedExamCouponCourse?: (n: number) => void,
    setShowExpandedCourseStatus?: (n: number) => void,
    setShowGradeDetailDialog: (b: boolean, t: GradeType, title: string) => void,
    ui: UIState,
    checkout?: (s: string) => void,
    showStaffView: boolean
  }

  handleCalculatePriceClick = (e: Event) => {
    const { openFinancialAidCalculator } = this.props
    if (openFinancialAidCalculator) openFinancialAidCalculator()
    e.preventDefault()
  }

  renderGradesOutOfDateMessage(): ?React$Element<*> {
    const { program } = this.props
    return (
      <div className="callout callout-warning">
        <img src="/static/images/c-warning-1.svg" alt="Warning" />
        <div>
          The following course, enrollment, and grade information is outdated.
          <br />
          Please{" "}
          <a
            href={`/login/${
              program.has_mitxonline_courses
                ? COURSEWARE_BACKEND_MITXONLINE
                : COURSEWARE_BACKEND_EDXORG
            }/`}
          >
            visit {programBackendName(program)}
          </a>{" "}
          for accurate information.
        </div>
      </div>
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
      setExamEnrollmentDialogVisibility,
      setSelectedExamCouponCourse,
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
        setExamEnrollmentDialogVisibility={setExamEnrollmentDialogVisibility}
        setSelectedExamCouponCourse={setSelectedExamCouponCourse}
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
          {showStaffView ? null : this.renderGradesOutOfDateMessage()}
          {courseRows}
        </CardContent>
      </Card>
    )
  }
}
