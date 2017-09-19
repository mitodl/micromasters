// @flow
/* global SETTINGS: false */
import React from "react"
import urljoin from "url-join"
import R from "ramda"

import { formatGrade } from "../util"
import type { CourseRun } from "../../../flow/programTypes"
import { EDX_LINK_BASE } from "../../../constants"

const progressHref = courseId => urljoin(EDX_LINK_BASE, courseId, "progress")

type ProgressType = {
  courseRun: CourseRun,
  className: string
}

// flow disagrees with me here
const formatPercentage = (currentGrade: any): string => `${currentGrade}%`

const Progress = ({ courseRun, className }: ProgressType) =>
  !R.isNil(courseRun.current_grade) ? (
    <div className={`course-progress-display ${className}`}>
      <div className="number">
        <a
          href={progressHref(courseRun.course_id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatGrade(courseRun.current_grade)}
        </a>
      </div>
      <div className="course-progress">
        <div
          className="course-progress-bar"
          style={{ width: formatPercentage(courseRun.current_grade) }}
        />
      </div>
    </div>
  ) : null

export default Progress
