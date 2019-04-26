// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import _ from "lodash"
import moment from "moment"
import urljoin from "url-join"

import type { CourseRun, Course } from "../../../flow/programTypes"
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_PAID_BUT_NOT_ENROLLED,
  EDX_LINK_BASE,
  DASHBOARD_FORMAT
} from "../../../constants"
import { renderSeparatedComponents } from "../../../util/util"
import { hasAnyStaffRole } from "../../../lib/roles"
import Progress from "./Progress"
import {
  courseStartDateMessage,
  courseCurrentlyInProgress,
  hasEnrolledInAnyRun,
  courseUpcomingOrCurrent,
  hasPaidForAnyCourseRun,
  hasPassedCourseRun,
  hasCanUpgradeCourseRun,
  hasMissedDeadlineCourseRun
} from "./util"
import { hasPassingExamGrade } from "../../../lib/grades"

// ProgressMessage is ONLY displayed for users who are already enrolled

const courseHasStarted = (courseRun: CourseRun): boolean =>
  moment(courseRun.course_start_date).isBefore(moment())

const addKeys = R.addIndex(R.map)((el, idx) => (
  <span key={`element${idx}`}>{el}</span>
))

const courseMessage = (courseRun: CourseRun) => {
  if (courseHasStarted(courseRun) && !courseCurrentlyInProgress(courseRun)) {
    return null
  }
  return courseHasStarted(courseRun)
    ? "Course in progress"
    : courseStartDateMessage(courseRun)
}

export const staffCourseInfo = (courseRun: CourseRun, course: Course) => {
  if (
    !hasEnrolledInAnyRun(course) &&
    courseRun.status !== STATUS_PAID_BUT_NOT_ENROLLED
  ) {
    return null
  }
  if (courseUpcomingOrCurrent(courseRun)) {
    if (hasPaidForAnyCourseRun(course)) {
      return "Paid"
    }
    if (courseRun.status === STATUS_CAN_UPGRADE) {
      if (courseCurrentlyInProgress(courseRun)) {
        return `Auditing (Upgrade deadline ${moment(
          courseRun.course_upgrade_deadline
        ).format(DASHBOARD_FORMAT)})`
      }
      return "Auditing"
    }
    if (courseRun.status === STATUS_MISSED_DEADLINE) {
      return "Missed payment deadline"
    }
    if (courseRun.status === STATUS_PAID_BUT_NOT_ENROLLED) {
      return "Paid but not enrolled"
    }
  } else {
    if (hasPassedCourseRun(course)) {
      if (course.has_exam && course.can_schedule_exam) {
        return "Passed edX course. Authorized to schedule exam."
      } else if (course.has_exam && !hasPassingExamGrade(course)) {
        return "Passed edX course, did not pass exam"
      }
      return "Passed"
    } else if (hasCanUpgradeCourseRun(course)) {
      return "Audited, passed, did not pay"
    } else if (hasMissedDeadlineCourseRun(course)) {
      return "Audited, missed payment deadline"
    }
    if (courseRun.status === STATUS_NOT_PASSED) {
      if (hasPaidForAnyCourseRun(course)) {
        return "Paid, did not pass"
      } else {
        return "Audited, did not pass"
      }
    }
  }
}

export default class ProgressMessage extends React.Component {
  props: {
    course: Course,
    courseRun: CourseRun,
    openCourseContactDialog: () => void,
    showStaffView: boolean
  }

  isCurrentOrPastEnrolled = (courseRun: CourseRun): boolean => {
    if (
      [STATUS_CURRENTLY_ENROLLED, STATUS_PASSED, STATUS_NOT_PASSED].includes(
        courseRun.status
      )
    ) {
      return true
    } else {
      if (
        [STATUS_CAN_UPGRADE, STATUS_MISSED_DEADLINE].includes(courseRun.status)
      ) {
        const now = moment()
        return (
          !_.isNil(courseRun.course_start_date) &&
          moment(courseRun.course_start_date).isBefore(now)
        )
      } else {
        return false
      }
    }
  }

  renderViewCourseEdxLink = (): React$Element<*> | null => {
    const { courseRun } = this.props
    if (!courseRun.course_id) {
      return null
    }

    const url = this.isCurrentOrPastEnrolled(courseRun)
      ? urljoin(EDX_LINK_BASE, courseRun.course_id)
      : courseRun.enrollment_url

    return url && !hasAnyStaffRole(SETTINGS.roles) ? (
      <a
        key={"view-edx-link"}
        className={"view-edx-link"}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on edX
      </a>
    ) : null
  }

  renderCourseContactLink = (): React$Element<*> | null => {
    const { course, openCourseContactDialog } = this.props
    return course.has_contact_email && !hasAnyStaffRole(SETTINGS.roles) ? (
      <a
        key={"contact-link"}
        className={"contact-link"}
        onClick={openCourseContactDialog}
      >
        Contact Course Team
      </a>
    ) : null
  }

  renderCourseLinks = (): React$Element<*> | null => {
    const { courseRun } = this.props

    const courseLinks = R.reject(R.isNil, [
      this.renderViewCourseEdxLink(courseRun),
      this.renderCourseContactLink()
    ])

    return courseLinks.length > 0 ? (
      <div className="course-links">
        {renderSeparatedComponents(courseLinks, " | ")}
      </div>
    ) : null
  }

  render() {
    const { showStaffView, courseRun, course } = this.props

    return (
      <div className="course-progress-message cols">
        <div className="details first-col">
          {renderSeparatedComponents(
            addKeys(
              R.reject(R.isNil, [
                courseMessage(courseRun),
                this.renderCourseLinks(),
                showStaffView ? staffCourseInfo(courseRun, course) : null
              ])
            ),
            " - "
          )}
        </div>
        <Progress courseRun={courseRun} className="second-col" />
      </div>
    )
  }
}
