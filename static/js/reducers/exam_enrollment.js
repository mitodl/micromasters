import { POST } from "../constants"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

export const examEnrollmentEndpoint = {
  name:                "examEnrollment",
  checkNoSpinner:      false,
  namespaceOnUsername: false,
  verbs:               [POST],
  postUrl:             "/api/v0/exam_enrollment/",
  fetchFunc:           fetchJSONWithCSRF,
  postOptions:         (examCourseId: number) => ({
    method: POST,
    body:   JSON.stringify({ exam_course_id: examCourseId })
  })
}
