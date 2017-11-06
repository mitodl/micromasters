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
  COURSE_CARD_FORMAT
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
    return `Course started ${startDate.format(COURSE_CARD_FORMAT)}`
  } else if (daysUntilStart < 10) {
    return `Course starts in ${daysUntilStart} days`
  } else {
    return `Course starts ${startDate.format(COURSE_CARD_FORMAT)}`
  }
}

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
  const endDate = moment(courseRun.course_end_date)
  const now = moment()
  return now.isAfter(startDate) && now.isBefore(endDate)
}

export const courseUpcomingOrCurrent = (courseRun: CourseRun) =>
  moment().isBefore(moment(courseRun.course_end_date))

export const hasPaidForAnyCourseRun = R.compose(
  R.any(R.propEq("has_paid", true)),
  R.prop("runs")
)

export const isPassedOrMissedDeadline = R.compose(
  R.contains(R.__, [STATUS_PASSED, STATUS_MISSED_DEADLINE]),
  R.prop("status")
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
  S.filter(R.propEq("status", STATUS_OFFERED)),
  S.toMaybe,
  R.nth(1),
  R.propOr([], "runs")
)

// checks if a run is enrollable
export const isEnrollableRun = (run: CourseRun): boolean =>
  !R.isEmpty(run.course_id) &&
  !R.isNil(run.enrollment_start_date) &&
  !R.isEmpty(run.enrollment_start_date) &&
  moment(run.enrollment_start_date).isSameOrBefore(moment(), "day") &&
  run.status === STATUS_OFFERED
