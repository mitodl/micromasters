// @flow
import moment from "moment"

import type { CourseRun } from "../../../flow/programTypes"
import {
  STATUS_CURRENTLY_ENROLLED,
  STATUS_CAN_UPGRADE,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_MISSED_DEADLINE
} from "../../../constants"

export const makeRunCurrent = (run: CourseRun) => {
  run.course_start_date = moment()
    .subtract(10, "days")
    .format()
  run.enrollment_start_date = moment()
    .subtract(12, "days")
    .format()
  run.course_end_date = moment()
    .add(10, "days")
    .format()
}

export const makeRunPast = (run: CourseRun) => {
  run.course_start_date = moment()
    .subtract(30, "days")
    .format()
  run.course_end_date = moment()
    .subtract(10, "days")
    .format()
}

export const makeRunFuture = (run: CourseRun) => {
  run.course_start_date = moment()
    .add(10, "days")
    .format()
  run.course_end_date = moment()
    .add(30, "days")
    .format()
}

export const makeRunOverdue = (run: CourseRun) => {
  run.course_upgrade_deadline = moment()
    .subtract(10, "days")
    .format()
}

export const makeRunDueSoon = (run: CourseRun) => {
  run.course_upgrade_deadline = moment()
    .add(5, "days")
    .format()
}

export const makeRunEnrolled = (run: CourseRun) => {
  run.status = STATUS_CURRENTLY_ENROLLED
}

export const makeRunCanUpgrade = (run: CourseRun) => {
  run.status = STATUS_CAN_UPGRADE
}

export const makeRunPaid = (run: CourseRun) => {
  run.has_paid = true
}

export const makeRunPassed = (run: CourseRun) => {
  run.status = STATUS_PASSED
}

export const makeRunMissedDeadline = (run: CourseRun) => {
  run.status = STATUS_MISSED_DEADLINE
}

export const makeRunFailed = (run: CourseRun) => {
  run.status = STATUS_NOT_PASSED
}
