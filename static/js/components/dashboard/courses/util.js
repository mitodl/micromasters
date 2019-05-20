// @flow
import moment from "moment-timezone"
import R from "ramda"

import type { CourseRun } from "../../../flow/programTypes"
import {
  STATUS_OFFERED,
  STATUS_PASSED,
  STATUS_MISSED_DEADLINE,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  DASHBOARD_FORMAT,
  STATUS_PAID_BUT_NOT_ENROLLED
} from "../../../constants"
import { S } from "../../../lib/sanctuary"

export const courseStartDateMessage = (courseRun: CourseRun) => {
  if (R.isNil(courseRun.course_start_date)) {
    return ""
  }

  const startDate = moment(courseRun.course_start_date)
  const daysUntilStart = startDate.diff(moment(), "days")
  if (daysUntilStart === 0) {
    return "Course starts today"
  } else if (daysUntilStart < 0) {
    return `Course started ${startDate.format(DASHBOARD_FORMAT)}`
  } else if (daysUntilStart < 10) {
    return `Course starts in ${daysUntilStart} days`
  } else {
    return `Course starts ${startDate.format(DASHBOARD_FORMAT)}`
  }
}

export const notNilorEmpty = (date: ?string) =>
  R.not(R.isNil(date) || R.isEmpty(date))

export const hasPearsonExam = R.propEq("has_exam", true)

export const userIsEnrolled = R.compose(
  R.contains(R.__, [
    STATUS_PASSED,
    STATUS_NOT_PASSED,
    STATUS_CAN_UPGRADE,
    STATUS_CURRENTLY_ENROLLED,
    STATUS_WILL_ATTEND,
    STATUS_MISSED_DEADLINE
  ]),
  R.prop("status")
)

export const hasEnrolledInAnyRun = R.compose(
  R.any(userIsEnrolled),
  R.prop("runs")
)

export const courseCurrentlyInProgress = (courseRun: CourseRun) => {
  const startDate = moment(courseRun.course_start_date)
  const now = moment()
  const endDateNotPass = courseRun.course_end_date
    ? now.isBefore(moment(courseRun.course_end_date))
    : true
  return now.isAfter(startDate) && endDateNotPass
}

export const courseUpcomingOrCurrent = (courseRun: CourseRun) =>
  courseRun.course_end_date
    ? moment().isBefore(moment(courseRun.course_end_date)) ||
      courseRun.status === STATUS_CURRENTLY_ENROLLED
    : true

export const hasPaidForAnyCourseRun = R.compose(
  R.any(R.propEq("has_paid", true)),
  R.prop("runs")
)

export const isPassedOrMissedDeadline = R.compose(
  R.contains(R.__, [STATUS_PASSED, STATUS_MISSED_DEADLINE]),
  R.prop("status")
)

export const hasCurrentlyEnrolledCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_CURRENTLY_ENROLLED)),
  R.prop("runs")
)

export const hasCanUpgradeCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_CAN_UPGRADE)),
  R.prop("runs")
)

export const hasMissedDeadlineCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_MISSED_DEADLINE)),
  R.prop("runs")
)

export const hasFailedCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_NOT_PASSED)),
  R.prop("runs")
)

export const hasPassedCourseRun = R.compose(
  R.any(R.propEq("status", STATUS_PASSED)),
  R.prop("runs")
)

// returns Maybe(run), where run is a future enrollable course run
export const futureEnrollableRun = R.compose(
  S.toMaybe,
  R.nth(0),
  R.filter(
    R.propSatisfies(
      R.contains(R.__, [STATUS_OFFERED, STATUS_PAID_BUT_NOT_ENROLLED]),
      "status"
    )
  ),
  R.propOr([], "runs")
)

// checks if a run is enrollable
export const isEnrollableRun = (run: CourseRun): boolean =>
  !R.isEmpty(run.course_id) &&
  notNilorEmpty(run.enrollment_start_date) &&
  moment(run.enrollment_start_date).isSameOrBefore(moment(), "day") &&
  (run.status === STATUS_OFFERED || run.status === STATUS_PAID_BUT_NOT_ENROLLED)

export const isOfferedInUncertainFuture = (run: CourseRun): boolean =>
  R.isNil(run.course_start_date) &&
  notNilorEmpty(run.fuzzy_start_date) &&
  (run.status === STATUS_OFFERED || run.status === STATUS_PAID_BUT_NOT_ENROLLED)
