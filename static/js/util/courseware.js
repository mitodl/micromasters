// @flow
import urljoin from "url-join"

import { COURSEWARE_BACKEND_BASE_URLS } from "../constants"
import type { CourseRun } from "../flow/programTypes"

export const coursewareBaseUrl = (backend: string) =>
  COURSEWARE_BACKEND_BASE_URLS[backend]

export const courseRunUrl = (courseRun: CourseRun) =>
  urljoin(coursewareBaseUrl(courseRun.courseware_backend), courseRun.course_id)
