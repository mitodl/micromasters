/* global SETTINGS: false */
// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import _ from "lodash"
import moment from "moment"

import type { CourseRun } from "../../flow/programTypes"
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_OFFERED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  DASHBOARD_FORMAT,
  EDX_LINK_BASE
} from "../../constants"
import { renderSeparatedComponents } from "../../util/util"
import { ifValidDate } from "../../util/date"
import { hasAnyStaffRole } from "../../lib/roles"

export default class CourseDescription extends React.Component {
  props: {
    courseRun: CourseRun,
    courseTitle: ?string,
    hasContactEmail: boolean,
    openCourseContactDialog: () => void
  }

  renderCourseDateMessage(label: string, dateString: string): string {
    let date = moment(dateString)
    return ifValidDate(
      "",
      date => `${label}: ${date.format(DASHBOARD_FORMAT)}`,
      date
    )
  }

  renderStartDateMessage(
    run: CourseRun,
    shouldStartInFuture: boolean
  ): string | null {
    if (run.course_start_date) {
      return this.renderCourseDateMessage("Start date", run.course_start_date)
    } else if (run.fuzzy_start_date && shouldStartInFuture) {
      return `Coming ${run.fuzzy_start_date}`
    } else {
      return null
    }
  }

  renderDetailContents(run: CourseRun) {
    let dateMessage, additionalDetail
    let additionalClass = ""

    if (run && !_.isEmpty(run)) {
      switch (run.status) {
      case STATUS_PASSED:
      case STATUS_NOT_PASSED:
        dateMessage = this.renderCourseDateMessage(
          "Ended",
          run.course_end_date || ""
        )
        break
      case STATUS_CAN_UPGRADE:
      case STATUS_MISSED_DEADLINE:
      case STATUS_CURRENTLY_ENROLLED:
        dateMessage = this.renderStartDateMessage(run, false)
        break
      case STATUS_WILL_ATTEND:
      case STATUS_OFFERED:
      case STATUS_PENDING_ENROLLMENT:
        dateMessage = this.renderStartDateMessage(run, true)
        break
      }

      if (
        run.status === STATUS_CAN_UPGRADE ||
        run.status === STATUS_MISSED_DEADLINE
      ) {
        additionalDetail = "Auditing"
      }
      if (
        run.status === STATUS_CURRENTLY_ENROLLED ||
        run.status === STATUS_PASSED ||
        run.status === STATUS_NOT_PASSED
      ) {
        additionalDetail = "Paid"
      }
    } else {
      dateMessage = "No future courses are currently scheduled."
      additionalClass = "no-runs"
    }

    return [
      <span className={`course-details ${additionalClass}`} key="1">
        {dateMessage}
      </span>,
      <span className="status" key="2">
        {additionalDetail}
      </span>
    ]
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
        let now = moment()
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
    if (!courseRun || !courseRun.course_id) {
      return null
    }

    let url
    if (this.isCurrentOrPastEnrolled(courseRun)) {
      url = `${EDX_LINK_BASE}${courseRun.course_id}`
    } else {
      url = courseRun.enrollment_url
    }

    return url && !hasAnyStaffRole(SETTINGS.roles) ? (
      <a
        key={"view-edx-link"}
        className={"view-edx-link"}
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on edX
      </a>
    ) : null
  }

  renderCourseContactLink = (): React$Element<*> | null => {
    const { hasContactEmail, openCourseContactDialog } = this.props
    return hasContactEmail ? (
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

    let courseLinks = R.reject(R.isNil, [
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
    const { courseRun, courseTitle } = this.props

    return (
      <div className="course-description">
        <div className="course-title">
          <span>{courseTitle}</span>
        </div>
        <div className="details">{this.renderDetailContents(courseRun)}</div>
        {this.renderCourseLinks()}
      </div>
    )
  }
}
