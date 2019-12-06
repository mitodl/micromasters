// @flow
import Dialog from "@material-ui/core/Dialog"
import React from "react"
import R from "ramda"
import Icon from "@material-ui/core/Icon"
import moment from "moment"

import type {
  Course,
  CourseRun,
  ProctoredExamResult
} from "../../../flow/programTypes"
import { formatGrade } from "../util"
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CURRENTLY_ENROLLED,
  DASHBOARD_FORMAT
} from "../../../constants"
import type { GradeType } from "../../../containers/DashboardPage"
import { EDX_GRADE } from "../../../containers/DashboardPage"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"

const scaleExamGrade = percentageGrade => percentageGrade * 100

const rowGrade = (
  grade: number,
  isBestGrade: boolean
): string | React$Element<*> => {
  if (!R.isNil(grade)) {
    if (isBestGrade) {
      return (
        <div className="best-grade">
          {formatGrade(grade)}
          <Icon name="check" />
        </div>
      )
    }
    return formatGrade(grade)
  }
  return ""
}

const failed = () => <div className="status failed">Not passed</div>

const passed = () => <div className="status passed">Passed</div>

const runStatus = (courseRun: CourseRun): React$Element<*> => {
  if (courseRun.status === STATUS_NOT_PASSED) {
    return failed()
  }
  if (courseRun.status === STATUS_PASSED) {
    return passed()
  }
  if (courseRun.status === STATUS_CURRENTLY_ENROLLED) {
    return courseRun.has_paid ? (
      <div className="status paid">In Progress (paid)</div>
    ) : (
      <div className="status audited">Auditing</div>
    )
  }
  return courseRun.has_paid ? (
    <div className="status paid">Paid</div>
  ) : (
    <div className="status audited">Audited</div>
  )
}

const examStatus = (grade: ProctoredExamResult): React$Element<*> =>
  grade.passed ? passed() : failed()

const renderRunRow = (
  [courseRun: CourseRun, isBestGrade: boolean],
  idx: number
) => (
  <div className="course-run-row" key={idx}>
    <div className="title">{courseRun.year_season}</div>
    <div className="grade-status">
      <div>{runStatus(courseRun)}</div>
      <div className="grade">
        {rowGrade(courseRun.final_grade, isBestGrade)}
      </div>
    </div>
  </div>
)

const renderExamRow = (
  [grade: ProctoredExamResult, isBestGrade: boolean],
  idx: number
) => (
  <div className="course-run-row" key={idx}>
    <div className="title">
      {`Pearson test - ${moment(grade.exam_date).format(DASHBOARD_FORMAT)}`}
    </div>
    <div className="grade-status">
      <div>{examStatus(grade)}</div>
      <div className="grade">
        {rowGrade(scaleExamGrade(grade.percentage_grade), isBestGrade)}
      </div>
    </div>
  </div>
)

const labelBestEdxGrade = (
  runs: Array<CourseRun>
): Array<[CourseRun, boolean]> => {
  const bestGrade = runs.reduce(
    (acc, run) =>
      run.final_grade && run.final_grade > acc ? run.final_grade : acc,
    0
  )

  return runs.map(run => [
    run,
    !R.isNil(run.final_grade) &&
      run.final_grade !== 0 &&
      run.final_grade === bestGrade
  ])
}

const labelBestExamGrade = (
  exams: Array<ProctoredExamResult>
): Array<[ProctoredExamResult, boolean]> => {
  const bestGrade = exams.reduce(
    (acc, exam) => (exam.percentage_grade > acc ? exam.percentage_grade : acc),
    0
  )

  return exams.map(exam => [
    exam,
    exam.passed && exam.percentage_grade === bestGrade
  ])
}

const renderRunRows = R.compose(
  R.addIndex(R.map)(renderRunRow),
  labelBestEdxGrade
)

const renderExamRows = R.compose(
  R.addIndex(R.map)(renderExamRow),
  labelBestExamGrade
)

const dialogTitle = (course: Course, gradeType: GradeType): string =>
  `${course.title} - ${
    gradeType === EDX_GRADE ? "Completed edX Course Runs" : "Completed Exams"
  }`

type GradeDetailPopupProps = {
  course: Course,
  setShowGradeDetailDialog: (b: boolean, type: GradeType, t: string) => void,
  dialogVisibility: boolean,
  gradeType: GradeType
}

const GradeDetailPopup = (props: GradeDetailPopupProps) => {
  const {
    course,
    setShowGradeDetailDialog,
    dialogVisibility,
    gradeType
  } = props

  return (
    <Dialog
      classes={{ paper: "dialog grade-detail-popup" }}
      open={dialogVisibility}
      onClose={() => setShowGradeDetailDialog(false, gradeType, course.title)}
    >
      <DialogTitle className="grade-dialog-title">
        {dialogTitle(course, gradeType)}
      </DialogTitle>
      <DialogContent>
        {gradeType === EDX_GRADE
          ? renderRunRows(course.runs)
          : renderExamRows(course.proctorate_exams_grades)}
        <div className="explanation">
          Only your best passing grade counts toward your final grade
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GradeDetailPopup
