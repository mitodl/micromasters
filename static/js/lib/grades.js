// @flow
import R from "ramda"

import { S, getm } from "./sanctuary"
import { STATUS_PASSED } from "../constants"
import type { Course } from "../flow/programTypes"

// this modules has some helper functions for calculating
// and processing grades, mainly for displaying them in the dashboard

const findLargestGrade = key =>
  R.compose(R.prop(key), R.reduce(R.maxBy(R.prop(key)), { [key]: 0 }))

const filterEmpty = S.filter(R.compose(R.not, R.isEmpty))

// getLargestExamGrade :: Course -> Maybe Number
export const getLargestExamGrade = R.compose(
  S.map(percentage => percentage * 100),
  S.map(findLargestGrade("percentage_grade")),
  filterEmpty,
  getm("proctorate_exams_grades")
)

// getLargestEdXGrade :: Course -> Maybe Number
export const getLargestEdXGrade = R.compose(
  S.map(findLargestGrade("final_grade")),
  filterEmpty,
  S.map(S.filter(R.has("final_grade"))),
  getm("runs")
)

export const hasPassingExamGrade = R.compose(
  R.any(R.propEq("passed", true)),
  R.propOr([], "proctorate_exams_grades")
)

export const hasFailingExamGrade = R.compose(
  R.any(R.propEq("passed", false)),
  R.propOr([], "proctorate_exams_grades")
)

export const hasPassedCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_PASSED)),
  R.propOr([], "runs")
)

export const passedCourse = (course: Course): boolean => {
  return course.has_exam
    ? hasPassedCourseRun(course) && hasPassingExamGrade(course)
    : hasPassedCourseRun(course)
}
