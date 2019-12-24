// @flow
import React from "react"
import R from "ramda"
import Icon from "@material-ui/core/Icon"

import type { Course } from "../../../flow/programTypes"
import { formatGrade } from "../util"
import { S, reduceM, getm } from "../../../lib/sanctuary"
import { classify } from "../../../util/util"
import {
  getLargestExamGrade,
  getLargestEdXGrade,
  passedCourse
} from "../../../lib/grades"
import { hasPearsonExam } from "./util"
import GradeDetailPopup from "./GradeDetailPopup"
import type { DialogVisibilityState } from "../../../reducers/ui"
import { GRADE_DETAIL_DIALOG } from "../../../constants"
import type { GradeType } from "../../../containers/DashboardPage"
import { EXAM_GRADE, EDX_GRADE } from "../../../containers/DashboardPage"

export const gradeDetailPopupKey = (
  gradeType: GradeType,
  courseTitle: string
) => `${GRADE_DETAIL_DIALOG}${gradeType}${courseTitle}`

const renderGrade = R.curry((caption, grade) => (
  <div className={`grade-display ${classify(caption)}`}>
    <div className="number" key={`${caption}number`}>
      {grade}
    </div>
    <div className="caption" key={`${caption}caption`}>
      {caption}
    </div>
  </div>
))

const renderExamGrade = R.ifElse(
  hasPearsonExam,
  R.compose(
    reduceM("--", renderGrade("Exam Grade")),
    S.map(formatGrade),
    getLargestExamGrade
  ),
  R.always(null)
)

const renderEdXGrade = R.compose(
  reduceM("--", renderGrade("edX Grade")),
  S.map(formatGrade),
  getLargestEdXGrade
)

const renderFinalGrade = R.ifElse(
  hasPearsonExam,
  R.compose(
    reduceM("--", renderGrade("Final Grade")),
    S.map(formatGrade),
    S.filter(R.complement(R.equals(""))),
    getm("overall_grade")
  ),
  R.always(null)
)

const renderPassed = (course: Course) => {
  if (passedCourse(course)) {
    return (
      <div className="passed-course">
        <div className="check-mark-surround">
          <Icon>done</Icon>
        </div>
        Passed
      </div>
    )
  } else {
    return null
  }
}

type CourseGradeProps = {
  course: Course,
  setShowGradeDetailDialog: (b: boolean, g: GradeType, t: string) => void,
  dialogVisibility: DialogVisibilityState
}

const Grades = (props: CourseGradeProps) => {
  const { course, setShowGradeDetailDialog, dialogVisibility } = props

  return (
    <div className="course-grades">
      <GradeDetailPopup
        course={course}
        setShowGradeDetailDialog={setShowGradeDetailDialog}
        dialogVisibility={
          dialogVisibility[gradeDetailPopupKey(EDX_GRADE, course.title)] ===
          true
        }
        gradeType={EDX_GRADE}
      />
      <GradeDetailPopup
        course={course}
        setShowGradeDetailDialog={setShowGradeDetailDialog}
        dialogVisibility={
          dialogVisibility[gradeDetailPopupKey(EXAM_GRADE, course.title)] ===
          true
        }
        gradeType={EXAM_GRADE}
      />
      <div className="grades">
        <div
          className="open-popup"
          onClick={() =>
            setShowGradeDetailDialog(true, EDX_GRADE, course.title)
          }
        >
          {renderEdXGrade(course)}
        </div>
        <div
          className="open-popup"
          onClick={() =>
            setShowGradeDetailDialog(true, EXAM_GRADE, course.title)
          }
        >
          {renderExamGrade(course)}
        </div>
        {renderFinalGrade(course)}
      </div>
      {renderPassed(course)}
    </div>
  )
}

export default Grades
