// @flow
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import { POST } from "../constants"

export const courseEnrollmentsEndpoint = {
  name:                "courseEnrollments",
  checkNoSpinner:      false,
  namespaceOnUsername: false,
  verbs:               [POST],
  postUrl:             "/api/v0/course_enrollments/",
  fetchFunc:           fetchJSONWithCSRF,
  postOptions:         (courseId: number) => ({
    method: POST,
    body:   JSON.stringify({ course_id: courseId })
  })
}
